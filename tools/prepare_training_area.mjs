// Prepare wow.export's garrisonyard and the four adjoining Command Center
// groups from Stormwind's WMO. Keep original geometry and texture pixels.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, textureCompress } from '@gltf-transform/functions';
import sharp from 'sharp';

const source = path.resolve(process.argv[2] ?? path.join(os.homedir(), 'wow.export/places/stormwind-command-center-source.glb'));
const faction = process.argv[3] ?? 'alliance';
if (faction !== 'alliance' && faction !== 'horde') throw new Error('Choose alliance or horde.');
const city = faction === 'alliance' ? 'stormwind' : 'orgrimmar';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const original = await fs.readFile(source);
const originalJSON = JSON.parse(original.subarray(20, 20 + original.readUInt32LE(12)).toString());
const doc = await io.readBinary(original);
doc.getRoot().getAsset().generator = originalJSON.asset.generator;
await doc.transform(dedup(), prune({ keepAttributes: true }), textureCompress({ encoder: sharp, targetFormat: 'webp', lossless: true }));
const scene = doc.getRoot().getDefaultScene();
scene.setName(faction === 'alliance' ? 'Stormwind Command Center training grounds' : 'Orgrimmar Valley of Honor training grounds');
scene.setExtras({ ...scene.getExtras(), trainingArea: true, focusMesh: faction === 'alliance' ? 'garrisonyard' : 'ArenaExt',
  defaultAnchor: faction === 'alliance' ? [-46, -0.937859, -279.85] : [-366, 70.567185, -648],
  defaultRotation: faction === 'alliance' ? 0 : 1 });
const bytes = await io.writeBinary(doc);
const name = `places/${city}-training-${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}.glb`;
await fs.mkdir('public/wow/places', { recursive: true });
await fs.writeFile(path.join('public/wow', name), bytes);
const manifestPath = 'public/wow/manifest.json';
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
manifest.models[`yard:${faction}`] = name;
if (faction === 'alliance') manifest.models.yard = name;
manifest.revision = '';
manifest.revision = createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0, 16);
await fs.writeFile(manifestPath, JSON.stringify(manifest));
console.log(JSON.stringify({ file: name, MiB: +(bytes.length / 2 ** 20).toFixed(2), revision: manifest.revision }));
