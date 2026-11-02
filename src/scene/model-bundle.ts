import type { ModelFile } from './custom-model';

/** Decode a map prepared by tools/map_bundle.mjs. The Blob slices share its data. */
export async function unpackMapBundle(data: Blob): Promise<ModelFile[]> {
  const header = await data.slice(0, 12).arrayBuffer();
  if (header.byteLength !== 12 || new TextDecoder().decode(header.slice(0, 8)) !== 'FPYMAP01') {
    throw new Error('Invalid map archive.');
  }
  const length = new DataView(header).getUint32(8, true);
  if (length > data.size - 12) throw new Error('Incomplete map archive.');
  const entries: { name: string; offset: number; length: number }[] = JSON.parse(await data.slice(12, 12 + length).text());
  const start = 12 + length;
  return entries.map((entry) => {
    if (!Number.isSafeInteger(entry.offset) || !Number.isSafeInteger(entry.length) || entry.offset < 0 || entry.length < 0 || start + entry.offset + entry.length > data.size) {
      throw new Error('Incomplete map file.');
    }
    return { name: entry.name, data: data.slice(start + entry.offset, start + entry.offset + entry.length) };
  });
}
