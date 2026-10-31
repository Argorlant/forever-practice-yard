// Patches src/ui/talent-layout.json with the talent trees Wowhead's WoW Forever
// calculator shows for the classes the live hotfix of 30 October 2026 changed
// (Druid, Mage and Paladin rebuilt; Hunter moved Pathfinding; Priest renamed
// Binding Heal), until the sims publish theirs. The data in
// research/wowhead/<class>_trees.json (position, ranks, prerequisite, icon and
// the text of every rank) was read from wowhead.com/forever/talent-calc and its
// tooltips. A talent keeps the key the specs know it by; a renamed one gets a
// new key, listed below. Run after tools/talent_layout.mjs.
//
// Usage: node tools/wowhead_trees.mjs
import fs from 'node:fs';

const CLASSES = ['druid', 'mage', 'paladin', 'hunter', 'priest'];
const camel = (s) => s.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean)
  .map((w, i) => (i ? w[0].toUpperCase() : w[0].toLowerCase()) + w.slice(1)).join('');

/** Rank texts as one text with {n} holes for the numbers that change between ranks. */
function template(ranks) {
  const split = ranks.map((r) => r.split(/(\d+(?:\.\d+)?)/));
  const same = split.every((p) => p.length === split[0].length && p.every((x, i) => i % 2 === 1 || x === split[0][i]));
  if (!same) return { text: '{0}', ranks: ranks.map((r) => [r]) };
  const holes = [];
  const text = split[0].map((x, i) => {
    if (i % 2 === 0) return x;
    if (split.every((p) => p[i] === x)) return x;
    holes.push(i);
    return `{${holes.length - 1}}`;
  }).join('');
  return { text, ranks: split.map((p) => holes.map((i) => Number(p[i]))) };
}

const layout = JSON.parse(fs.readFileSync('src/ui/talent-layout.json', 'utf8'));
const icons = new Set();
for (const cls of CLASSES) {
  const data = JSON.parse(fs.readFileSync(`research/wowhead/${cls}_trees.json`, 'utf8'));
  const old = layout[cls];
  const byName = new Map(old.flatMap((tree) => tree.talents).map((t) => [t.name.toLowerCase(), t]));
  layout[cls] = data.map((tree, i) => ({
    ...old[i],
    talents: tree.talents.map((t) => {
      const prev = byName.get(t.name.toLowerCase());
      const req = t.req ? tree.talents.find((x) => x.name === t.req) : null;
      const icon = prev?.icon ?? t.icon;
      icons.add(icon);
      return { key: prev?.key ?? camel(t.name), name: t.name, row: t.row, col: t.col, max: t.max, icon, req: req ? [req.row, req.col] : null, ...template(t.ranks) };
    }),
  }));
  console.log(`${cls}: ${layout[cls].map((t) => `${t.name} ${t.talents.length}`).join(', ')}`);
}
fs.writeFileSync('src/ui/talent-layout.json', JSON.stringify(layout));

// New icons, from Wowhead's icon CDN like tools/wow_icons.mjs.
for (const name of icons) {
  const file = `public/icons/${name}.jpg`;
  if (fs.existsSync(file)) continue;
  const res = await fetch(`https://wow.zamimg.com/images/wow/icons/large/${name}.jpg`);
  if (!res.ok) { console.log(`missing icon ${name}`); continue; }
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  console.log(`icon ${name}`);
}
