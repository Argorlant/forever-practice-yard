// Downloads the WoW ability icons listed in src/ui/wow-icons.json from
// Wowhead's icon CDN into public/icons/. The names come from Wowhead's WoW
// Forever tooltips (nether.wowhead.com/forever/tooltip/spell/<id>).
// Icons are © Blizzard Entertainment; the site credits them as a fan tool.
//
// Usage: node tools/wow_icons.mjs
import fs from 'node:fs';

const map = JSON.parse(fs.readFileSync('src/ui/wow-icons.json', 'utf8'));
fs.mkdirSync('public/icons', { recursive: true });
let bytes = 0;
for (const name of new Set(Object.values(map))) {
  const file = `public/icons/${name}.jpg`;
  if (fs.existsSync(file)) continue;
  const res = await fetch(`https://wow.zamimg.com/images/wow/icons/large/${name}.jpg`);
  if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) throw new Error(`${name}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buf);
  bytes += buf.length;
  process.stdout.write('.');
}
console.log(`\n${new Set(Object.values(map)).size} icons in public/icons (${(bytes / 1024).toFixed(0)} KB downloaded now)`);
