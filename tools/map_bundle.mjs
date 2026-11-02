import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import sharp from 'sharp';

// Follow the same OBJ/MTL and placement references as loadMapSource. A static
// map needs its dependencies, not every unrelated export in those directories.
export async function prepareMapBundle(source, output, files) {
  const known = new Map(files.map((name) => [name.replaceAll('\\', '/').toLowerCase(), name]));
  const used = new Map();
  const resolve = (from, to) => path.posix.normalize(path.posix.join(path.posix.dirname(from), to.replaceAll('\\', '/'))).toLowerCase();
  async function use(name) {
    name = known.get(name.toLowerCase());
    if (!name) return null;
    if (!used.has(name)) used.set(name, await fs.readFile(path.join(source, name)));
    return used.get(name);
  }
  async function text(name) { return (await use(name))?.toString('utf8') ?? ''; }
  const csv = (content) => {
    const [head, ...lines] = content.split(/\r?\n/).filter(Boolean);
    return head ? lines.map((line) => Object.fromEntries(line.split(';').map((v, i) => [head.split(';')[i], v]))) : [];
  };
  async function model(name) {
    if (!await use(name)) return;
    const mtl = name.replace(/\.obj$/i, '.mtl');
    await use(name.replace(/\.obj$/i, '.json'));
    for (const line of (await text(mtl)).split(/\r?\n/)) {
      const match = line.trim().match(/^map_Kd\s+(.+)$/);
      if (match) await use(resolve(mtl, match[1]));
    }
  }
  for (const tile of files.filter((name) => /(^|\/)adt_\d+_\d+\.obj$/i.test(name))) {
    await use(tile);
    await use(tile.replace(/\.obj$/i, '.mtl'));
    const terrain = tile.replace(/adt_(\d+_\d+)\.obj$/i, 'tex_$1.png');
    const image = await use(terrain);
    if (image) {
      const size = await sharp(image).metadata();
      if (size.width > 2048 || size.height > 2048) {
        // This is the same size and JPEG quality the map loader already uses,
        // prepared before download instead of downloading an 8K PNG first.
        used.set(known.get(terrain.toLowerCase()), await sharp(image).resize({ width: 2048, height: 2048, fit: 'inside' }).jpeg({ quality: 88 }).toBuffer());
      }
    }
    for (const row of csv(await text(tile.replace(/\.obj$/i, '_ModelPlacementInformation.csv')))) {
      if (!/^(m2|wmo)$/i.test(row.Type ?? '')) continue;
      const file = resolve(tile, row.ModelFile);
      const actual = known.get(file);
      if (!actual) continue;
      if (row.Type.toLowerCase() === 'wmo' && (await fs.stat(path.join(source, actual))).size > 40e6) continue;
      await model(file);
      if (row.Type.toLowerCase() === 'wmo') {
        const placement = file.replace(/\.obj$/i, '_ModelPlacementInformation.csv');
        for (const prop of csv(await text(placement))) await model(resolve(file, prop.ModelFile));
      }
    }
  }
  let offset = 0;
  const entries = [...used].map(([name, bytes]) => {
    const entry = { name, offset, length: bytes.length };
    offset += bytes.length;
    return entry;
  });
  const index = Buffer.from(JSON.stringify(entries));
  const header = Buffer.alloc(12);
  header.write('FPYMAP01');
  header.writeUInt32LE(index.length, 8);
  const archive = gzipSync(Buffer.concat([header, index, ...used.values()]));
  const name = `_resources/${createHash('sha256').update(archive).digest('hex')}.map.gz`;
  await fs.mkdir(path.join(output, '_resources'), { recursive: true });
  await fs.writeFile(path.join(output, name), archive);
  return { name, files: entries.map((e) => e.name), bytes: archive.length, unpackedBytes: offset };
}
