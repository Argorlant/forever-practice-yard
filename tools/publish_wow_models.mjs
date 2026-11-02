// Prepare the owner's wow.export selection for static hosting, without changing
// the original exports. Identical animation buffers and textures share one URL.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { NodeIO } from '@gltf-transform/core';
import { dedup } from '@gltf-transform/functions';
import { prepareMapBundle } from './map_bundle.mjs';

const mapsOnly = process.argv.includes('--maps-only');
const source = path.resolve(process.argv.slice(2).find((arg) => arg !== '--maps-only') ?? path.join(os.homedir(), 'wow.export'));
const output = path.resolve('public/wow');
const io = new NodeIO();
const selection = JSON.parse(await fs.readFile(path.join(source, 'yard-models.json'), 'utf8'));
const manifest = mapsOnly ? JSON.parse(await fs.readFile(path.join(output, 'manifest.json'), 'utf8'))
  : { models: { ...selection }, dependencies: {}, maps: {}, archives: {}, gzip: [], revision: '' };
manifest.archives ??= {};
const written = new Set();
let originalBytes = 0;
let publishedBytes = 0;

async function write(name, bytes) {
  if (written.has(name)) return;
  const target = path.resolve(output, name);
  if (!target.startsWith(output + path.sep)) throw new Error(`Invalid output path: ${name}`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
  written.add(name);
  publishedBytes += bytes.length;
}

async function resource(bytes, extension) {
  const hash = createHash('sha256').update(bytes).digest('hex');
  const name = `_resources/${hash}${extension}`;
  await write(name, bytes);
  return name;
}

for (const file of mapsOnly ? [] : [...new Set(Object.values(selection).filter((v) => v.endsWith('.glb')))]) {
  const bytes = await fs.readFile(path.join(source, file));
  originalBytes += bytes.length;
  const original = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  const doc = await io.readBinary(bytes);
  await doc.transform(dedup());
  const { json, resources } = await io.writeJSON(doc);
  // The runtime recognizes wow.export's animation names and attachment frame.
  json.asset.generator = original.asset.generator;
  const deps = [];
  for (const image of json.images ?? []) {
    const uri = await resource(resources[image.uri], path.extname(image.uri));
    image.uri = uri;
    deps.push(uri);
  }
  // Keep one shared animation payload per rig, separate from its equipment.
  const animationViews = new Set();
  for (const animation of json.animations ?? []) {
    for (const sampler of animation.samplers) {
      for (const index of [sampler.input, sampler.output]) {
        const accessor = json.accessors[index];
        if (accessor.bufferView !== undefined) animationViews.add(accessor.bufferView);
      }
    }
  }
  const oldBuffers = json.buffers;
  json.buffers = [];
  for (const animation of [false, true]) {
    const chunks = [];
    let length = 0;
    for (const [index, view] of (json.bufferViews ?? []).entries()) {
      if (animationViews.has(index) !== animation) continue;
      const old = resources[oldBuffers[view.buffer].uri];
      const chunk = old.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
      const padding = (4 - length % 4) % 4;
      if (padding) chunks.push(Buffer.alloc(padding));
      length += padding;
      view.buffer = json.buffers.length;
      view.byteOffset = length;
      chunks.push(chunk);
      length += chunk.length;
    }
    if (!chunks.length) continue;
    const uri = await resource(Buffer.concat(chunks), '.bin');
    json.buffers.push({ uri, byteLength: length });
    deps.push(uri);
  }
  const name = file.replace(/\.glb$/i, '.gltf');
  const compact = Buffer.from(JSON.stringify(json));
  await write(`${name}.gz`, gzipSync(compact));
  manifest.gzip.push(name);
  manifest.dependencies[name] = [...new Set(deps)];
  for (const key of Object.keys(manifest.models)) {
    if (manifest.models[key] === file) manifest.models[key] = name;
  }
  if (manifest.gzip.length % 25 === 0) console.log(`Prepared ${manifest.gzip.length} models`);
}

async function walk(dir) {
  const files = [];
  for (const entry of await fs.readdir(path.join(source, dir), { withFileTypes: true })) {
    const name = `${dir}/${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(name));
    else if (/\.(obj|mtl|csv|json|png|jpe?g|webp)$/i.test(name)) files.push(name);
  }
  return files;
}

for (const map of [...new Set(Object.values(selection).filter((v) => v.startsWith('map:')))]) {
  const files = [...new Set((await Promise.all(map.slice(4).split(',').map(walk))).flat())];
  manifest.maps[map] = files;
  const bundle = await prepareMapBundle(source, output, files);
  manifest.archives[map] = bundle.name;
  publishedBytes += bundle.bytes;
  for (const name of mapsOnly ? [] : files) {
    const bytes = await fs.readFile(path.join(source, name));
    originalBytes += bytes.length;
    await write(name, bytes);
  }
}
manifest.revision = '';
manifest.revision = createHash('sha256').update(JSON.stringify(manifest)).digest('hex').slice(0, 16);
await write('manifest.json', Buffer.from(JSON.stringify(manifest)));
console.log(JSON.stringify({ models: manifest.gzip.length, files: written.size,
  originalMiB: +(originalBytes / 2 ** 20).toFixed(1), publishedMiB: +(publishedBytes / 2 ** 20).toFixed(1),
  revision: manifest.revision }));
