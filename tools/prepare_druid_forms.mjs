// Prepare the four original wow.export GLBs and their six race-specific keys.
// sources.json records the exact CreatureDisplayInfo rows from the local client.
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

const input = path.resolve(process.argv[2] ?? 'node_modules/.cache/wow-export/druid-forms');
const output = path.resolve(process.argv[3] ?? path.join(os.homedir(), 'wow.export'));
const sources = JSON.parse(await fs.readFile(path.join(input, 'sources.json'), 'utf8'));
const selectionPath = path.join(output, 'yard-models.json');
const selection = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const race of ['tauren', 'skyborne']) {
  for (const form of ['cat', 'bear']) {
    const source = sources.find((s) => s.race === race && s.form === form);
    if (!source) throw new Error(`Missing source for ${race} ${form}`);
    const raw = await fs.readFile(path.join(input, `${race}-${form}-source.glb`));
    const json = JSON.parse(raw.subarray(20, 20 + raw.readUInt32LE(12)).toString());
    if (!json.animations?.length || !json.images?.length) throw new Error('Export animations and textures first.');
    const doc = await io.readBinary(raw);
    doc.getRoot().getAsset().generator = json.asset.generator;
    const scene = doc.getRoot().getDefaultScene();
    scene.setName(`${race === 'tauren' ? 'Tauren' : 'Skyborne'} ${form === 'cat' ? 'Cat' : 'Bear'} Form`);
    scene.setExtras({ race, form, build: source.build, displayID: source.displayID,
      fileDataID: source.fileDataID, textures: source.textures, displayScale: source.scale });
    // Display scale is separate from the raw M2 geometry in the game tables.
    const root = doc.createNode('CreatureDisplayScale').setScale([source.scale, source.scale, source.scale]);
    for (const node of scene.listChildren()) { scene.removeChild(node); root.addChild(node); }
    scene.addChild(root);
    await doc.transform(dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', lossless: true }));
    const bytes = await io.writeBinary(doc);
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const file = `druid-forms/${race}-${form}-${hash}.glb`;
    await fs.mkdir(path.join(output, 'druid-forms'), { recursive: true });
    await fs.writeFile(path.join(output, file), bytes);
    // Keep a complete source export in the owner's export directory, too.
    await fs.writeFile(path.join(output, 'druid-forms', `${race}-${form}-source.glb`), raw);
    for (const key of race === 'skyborne' ? ['highorder', 'windshaper'] : [race]) {
      selection[`form-${form}@${key}`] = file;
    }
    console.log(JSON.stringify({ file, MiB: +(bytes.length / 2 ** 20).toFixed(2), animations: json.animations.length }));
  }
}
await fs.writeFile(path.join(output, 'druid-forms', 'sources.json'), JSON.stringify(sources, null, 2) + '\n');
await fs.copyFile(selectionPath, `${selectionPath}.before-druid-forms`, constants.COPYFILE_EXCL)
  .catch((error) => { if (error.code !== 'EEXIST') throw error; });
await fs.writeFile(selectionPath, JSON.stringify(selection, null, 1) + '\n');
