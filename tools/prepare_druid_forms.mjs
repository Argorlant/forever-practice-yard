// Prepare the client's druid forms: legacy SD, and HD for Skyborne where SD is unavailable.
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

const input = path.resolve(process.argv[2] ?? 'node_modules/.cache/wow-export/druid-all-forms');
const output = path.resolve(process.argv[3] ?? path.join(os.homedir(), 'wow.export'));
const sources = JSON.parse(await fs.readFile(path.join(input, 'sources.json'), 'utf8'));
const selectionPath = path.join(output, 'yard-models.json');
const selection = JSON.parse(await fs.readFile(selectionPath, 'utf8'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
for (const source of sources) {
    const { race, form, definition } = source;
    if (!['sd', 'hd'].includes(definition)) throw new Error('Each source must identify SD or HD.');
    const raw = await fs.readFile(path.join(input, `${race}-${form}-source.glb`));
    const json = JSON.parse(raw.subarray(20, 20 + raw.readUInt32LE(12)).toString());
    if (!json.animations?.length || !json.images?.length) throw new Error('Export animations and textures first.');
    const doc = await io.readBinary(raw);
    doc.getRoot().getAsset().generator = json.asset.generator;
    // wow.export's glTF writer omits M2 render flags. Restore cutout leaves,
    // fur and additive eyes from each mesh's first original texture unit.
    const meshes = doc.getRoot().listMeshes();
    if (source.meshMaterials?.length !== meshes.length) throw new Error(`Missing render flags for ${race} ${form}`);
    meshes.forEach((mesh, index) => {
      const flags = source.meshMaterials[index];
      for (const primitive of mesh.listPrimitives()) {
        const original = primitive.getMaterial();
        if (!original || !flags) continue;
        const material = original.clone();
        const mode = flags.blendingMode;
        material.setAlphaMode(mode === 1 ? 'MASK' : mode > 1 ? 'BLEND' : 'OPAQUE');
        material.setAlphaCutoff(0.5).setDoubleSided(!!(flags.flags & 4));
        material.setExtras({ ...material.getExtras(), wowBlendMode: mode });
        primitive.setMaterial(material);
      }
    });
    const scene = doc.getRoot().getDefaultScene();
    scene.setName(`${race} ${form} ${definition.toUpperCase()} Form`);
    scene.setExtras({ race, form, definition, build: source.build, displayID: source.displayID,
      fileDataID: source.fileDataID, textures: source.textures, displayScale: source.scale });
    // Display scale is separate from the raw M2 geometry in the game tables.
    const root = doc.createNode('CreatureDisplayScale').setScale([source.scale, source.scale, source.scale]);
    for (const node of scene.listChildren()) { scene.removeChild(node); root.addChild(node); }
    scene.addChild(root);
    await doc.transform(dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', lossless: true }));
    const bytes = await io.writeBinary(doc);
    const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 16);
    const file = `druid-forms/${race}-${form}-${definition}-${hash}.glb`;
    await fs.mkdir(path.join(output, 'druid-forms'), { recursive: true });
    await fs.writeFile(path.join(output, file), bytes);
    // Keep a complete source export in the owner's export directory, too.
    await fs.writeFile(path.join(output, 'druid-forms', `${race}-${form}-source.glb`), raw);
    const races = race === 'skyborne' ? ['highorder', 'windshaper']
      : race === 'shared' ? (form === 'travel' ? ['nightelf', 'tauren'] : ['nightelf', 'tauren', 'highorder', 'windshaper']) : [race];
    for (const key of races) {
      selection[`form-${form}@${key}`] = file;
      if (form === 'bear') selection[`form-dire-bear@${key}`] = file;
    }
    console.log(JSON.stringify({ file, MiB: +(bytes.length / 2 ** 20).toFixed(2), animations: json.animations.length }));
}
// Legacy unqualified keys stay compatible, now pointing to Night Elf SD.
for (const kind of ['cat', 'bear', 'moonkin', 'travel', 'aquatic', 'tree', 'dire-bear']) {
  if (!selection[`form-${kind}@nightelf`]) throw new Error(`Missing Night Elf ${kind}`);
  for (const race of ['tauren', 'highorder', 'windshaper']) {
    if (!selection[`form-${kind}@${race}`]) throw new Error(`Missing ${race} ${kind}`);
  }
  selection[`form-${kind}`] = selection[`form-${kind}@nightelf`];
}
await fs.writeFile(path.join(output, 'druid-forms', 'sources.json'), JSON.stringify(sources, null, 2) + '\n');
await fs.copyFile(selectionPath, `${selectionPath}.before-sd-druid-forms`, constants.COPYFILE_EXCL)
  .catch((error) => { if (error.code !== 'EEXIST') throw error; });
await fs.writeFile(selectionPath, JSON.stringify(selection, null, 1) + '\n');
