// Builds src/ui/talent-layout.json: every class's three talent trees as the
// sims draw them (gunba's ui/core/talents/trees/<class>.json, the order the
// talent strings use), with each talent's row, column, ranks, icon and text,
// plus the tree's tab icon and background (downloaded to public/talent-bg/).
// The talent icons are fetched by tools/wow_icons.mjs.
//
// Usage: node tools/talent_layout.mjs
import fs from 'node:fs';

const GS = 'https://raw.githubusercontent.com/gunba/wow-forever-sim/9c05fc890b2c78e95c15605895134ebeb689b857/ui/core/talents/trees';
const CLASSES = ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock', 'druid'];
/** The talent frame's tab icon for each tree (Classic). */
const TAB_ICONS = {
  warrior: ['ability_warrior_savageblow', 'ability_warrior_innerrage', 'inv_shield_06'],
  paladin: ['spell_holy_holybolt', 'spell_holy_devotionaura', 'spell_holy_auraoflight'],
  hunter: ['ability_hunter_beasttaming', 'ability_marksmanship', 'ability_hunter_swiftstrike'],
  rogue: ['ability_rogue_eviscerate', 'ability_backstab', 'ability_stealth'],
  priest: ['spell_holy_wordfortitude', 'spell_holy_guardianspirit', 'spell_shadow_shadowwordpain'],
  shaman: ['spell_nature_lightning', 'spell_nature_lightningshield', 'spell_nature_magicimmunity'],
  mage: ['spell_holy_magicalsentry', 'spell_fire_firebolt02', 'spell_frost_frostbolt02'],
  warlock: ['spell_shadow_deathcoil', 'spell_shadow_metamorphosis', 'spell_shadow_rainoffire'],
  druid: ['spell_nature_starfall', 'ability_racial_bearform', 'spell_nature_healingtouch'],
};

/** Icons gunba's trees leave out (talents new in Forever), from our research sheets (Wowhead Forever tooltips). */
function researchIcons(cls) {
  const file = `research/${cls}_forever.json`;
  if (!fs.existsSync(file)) return {};
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const found = {};
  for (const [k, v] of Object.entries(j.icons ?? {})) if (k.startsWith('talent_') && typeof v === 'string') found[k.slice(7)] = v;
  for (const tree of Object.values(j.talents ?? {})) {
    if (!Array.isArray(tree)) continue;
    for (const t of tree) if (t?.fieldName && typeof t.icon === 'string' && !found[t.fieldName]) found[t.fieldName] = t.icon;
  }
  return found;
}

const out = {};
const missing = [];
fs.mkdirSync('public/talent-bg', { recursive: true });
for (const cls of CLASSES) {
  const res = await fetch(`${GS}/${cls}.json`);
  if (!res.ok) throw new Error(`${cls}: ${res.status}`);
  const trees = await res.json();
  const extra = researchIcons(cls);
  out[cls] = [];
  for (const [i, tree] of trees.entries()) {
    const bg = /backgrounds\/classic\/(\d+)\.jpg/.exec(tree.backgroundUrl ?? '')?.[1] ?? null;
    if (bg && !fs.existsSync(`public/talent-bg/${bg}.jpg`)) {
      const img = await fetch(tree.backgroundUrl);
      if (!img.ok) throw new Error(`${cls} background: ${img.status}`);
      fs.writeFileSync(`public/talent-bg/${bg}.jpg`, Buffer.from(await img.arrayBuffer()));
    }
    out[cls].push({
      name: tree.name,
      icon: TAB_ICONS[cls][i],
      bg,
      talents: tree.talents.map((t) => ({
        key: t.fieldName,
        name: t.name,
        row: t.location.rowIdx,
        col: t.location.colIdx,
        max: t.maxPoints,
        icon: t.icon || extra[t.fieldName] || (missing.push(`${cls}.${t.fieldName}`), null),
        req: t.prereqLocation ? [t.prereqLocation.rowIdx, t.prereqLocation.colIdx] : null,
        text: t.description ?? '',
        ranks: t.ranks ?? [],
      })),
    });
  }
  process.stdout.write(`${cls} `);
}
fs.writeFileSync('src/ui/talent-layout.json', JSON.stringify(out));
console.log(`\nsrc/ui/talent-layout.json: ${CLASSES.length} classes${missing.length ? `; no icon for ${missing.join(', ')}` : ''}`);
