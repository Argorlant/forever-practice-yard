// Generates src/specs/gear.gen.json and research/wowsims_gear.md: the character sheet of each WoWSims Forever gear
// set the site's builds use, worked out from its item database, its class and race base stats and its set bonuses.
// A sheet is what the character panel would show unbuffed: no talents, raid buffs or consumables, which the yard adds
// on top. Procs and on-use effects of items and sets are not on a sheet.
//
// Usage: node tools/gear_sheets.mjs
import fs from 'node:fs';

const COMMIT = '7c3453f5ad4576193235e2db05e1eec5bf0b1316';
const RAW = `https://raw.githubusercontent.com/wowsims/forever/${COMMIT}/`;
const SPECS = 'ui/specs/';

const STAT = { str: 0, agi: 1, sta: 2, int: 3, sp: 5, arcane: 6, fire: 7, frost: 8, holy: 9, nature: 10, shadow: 11, spi: 13, ap: 14, rap: 15, fap: 16,
  hit: 17, crit: 18, haste: 19, exp: 21, def: 22, block: 23, bv: 24, dodge: 25, parry: 26, armor: 27, bonusArmor: 28, mp5: 31 };
// sim/core/base_stats_auto_gen.go: rating per percent.
const RATING = { hit: 10, crit: 14, haste: 10, exp: 10, dodge: 12, parry: 15, block: 5 };

// sim/core/base_stats.go and the class files: base stats at 60, attack power per Strength and Agility, crit per Agility
// and Intellect, base crit, base mana and base dodge.
const CLASSES = {
  warrior: { hp: 1689, agi: 80, str: 120, int: 30, spi: 45, sta: 110, ap: 160, strAp: 2, agiCrit: 0.05 },
  paladin: { hp: 1381, agi: 65, str: 105, int: 70, spi: 75, sta: 100, ap: 160, strAp: 2, agiCrit: 0.0506, intCrit: 0.0167, crit: 0.7, spellCrit: 3.5, mana: 1512, dodge: 0.7 },
  hunter: { hp: 1467, agi: 125, str: 55, int: 65, spi: 70, sta: 90, ap: 100, rap: 110, strAp: 1, agiAp: 1, agiRap: 2, agiCrit: 0.0189, intCrit: 0.0165, spellCrit: 3.6, mana: 1720 },
  rogue: { hp: 1523, agi: 130, str: 80, int: 35, spi: 50, sta: 75, ap: 100, strAp: 1, agiAp: 1, agiCrit: 0.0345 },
  priest: { hp: 1397, agi: 40, str: 35, int: 120, spi: 125, sta: 50, ap: -10, strAp: 1, agiCrit: 0.05, intCrit: 0.0168, crit: 3, spellCrit: 0.8, mana: 1376, dodge: 3 },
  shaman: { hp: 1280, agi: 55, str: 85, int: 90, spi: 100, sta: 95, ap: 100, strAp: 2, agiCrit: 0.0508, intCrit: 0.0169, crit: 1.7, spellCrit: 2.3, mana: 1520, dodge: 1.7 },
  mage: { hp: 1370, agi: 35, str: 30, int: 125, spi: 120, sta: 45, ap: -10, strAp: 1, agiCrit: 0.0514, intCrit: 0.0168, crit: 3.2, spellCrit: 0.2, mana: 1213 },
  warlock: { hp: 1414, agi: 50, str: 45, int: 110, spi: 115, sta: 65, ap: -10, strAp: 1, agiCrit: 0.05, intCrit: 0.0165, crit: 2, spellCrit: 1.7, mana: 1373 },
  druid: { hp: 1483, agi: 60, str: 65, int: 100, spi: 110, sta: 70, ap: -20, strAp: 2, agiCrit: 0.05, intCrit: 0.0167, crit: 0.9, spellCrit: 1.8, mana: 1244 },
};
const RACES = {
  human: { crit: 1, spellCrit: 1, spiritMult: 1.1 },
  orc: { agi: -3, str: 3, int: -3, spi: 3, sta: 2 },
  dwarf: { agi: -4, str: 2, int: -1, spi: -1, sta: 3, hit: 1 },
  nightelf: { agi: 5, str: -3, sta: -1, dodge: 1 },
  undead: { agi: -2, str: -1, int: -2, spi: 5, sta: 1 },
  tauren: { agi: -5, str: 5, int: -5, spi: 2, sta: 2, healthMult: 1.05 },
  troll: { agi: 2, str: 1, int: -4, spi: 1, sta: 1 },
  windshaper: { agi: 1, str: -1, int: 1, sta: -1 },
};
// Rogues and hunters get Agility's dodge twice over (sim/core/base_stats.go).
const dodgePerAgi = (c, cls) => (cls === 'rogue' || cls === 'hunter' ? 2 : 1) * c.agiCrit;

// sim/common/forever/items_sets.go: the set bonuses that are plain stats, by pieces worn.
const SET_BONUS = {
  'Beaststalker Armor': [[3, { ap: 30, rap: 30 }], [6, { mp5: 8 }]],
  "Magister's Regalia": [[3, { sp: 18 }], [6, { mp5: 8 }]],
  "Sorcerer's Regalia": [[3, { mp5: 8 }], [6, { sp: 23 }]],
  'Dreadmist Raiment': [[3, { sp: 18 }], [6, { mp5: 8 }]],
  'Soulforge Armor': [[3, { mp5: 8 }], [6, { sp: 23 }]],
  'Lightforge Armor': [[3, { sp: 18 }], [6, { mp5: 8 }]],
  'The Elements': [[3, { sp: 18 }], [6, { mp5: 8 }]],
  'The Five Thunders': [[3, { mp5: 8 }], [6, { sp: 23 }]],
  'Darkmantle Armor': [[6, { ap: 40, rap: 40 }]],
  'Battlegear of Heroism': [[6, { str: 20 }]],
};
const WEAPON = { 1: 'axe', 2: 'dagger', 3: 'fist', 4: 'mace', 6: 'polearm', 8: 'staff', 9: 'sword' };
const RANGED = { 1: 'bow', 2: 'crossbow', 3: 'gun' };

// Each sheet the builds use: WoWSims Forever's own gear for that build, and the race that build sets. Where it sets none,
// the race of its page; the Rogue and Mage pages set none either, so those sheets assume Human.
const SHEETS = [
  ['warrior-fury', 'warrior', 'orc', 'warrior/dps/gear_sets/prebis_fury.gear.json'],
  ['warrior-arms', 'warrior', 'orc', 'warrior/dps/gear_sets/prebis_arms.gear.json'],
  ['warrior-prot', 'warrior', 'orc', 'warrior/protection/gear_sets/prebis.gear.json', { tank: true }],
  ['rogue-combat', 'rogue', 'human', 'rogue/dps/gear_sets/p1_slowmh.gear.json'],
  ['rogue-backstab', 'rogue', 'human', 'rogue/dps/gear_sets/p1_bscombat.gear.json'],
  ['rogue-mutilate', 'rogue', 'human', 'rogue/dps/gear_sets/p1_muti.gear.json'],
  ['rogue-sub-backstab', 'rogue', 'human', 'rogue/dps/gear_sets/p1_bssub.gear.json'],
  ['hunter-ranged', 'hunter', 'orc', 'hunter/dps/gear_sets/p1.gear.siml', { hunter: true }],
  ['hunter-melee', 'hunter', 'orc', 'hunter/dps/gear_sets/p1_melee.gear.siml', { hunter: true }],
  ['mage', 'mage', 'human', 'mage/dps/gear_sets/p1Arcane.gear.json', { health: true }],
  ['warlock-affliction', 'warlock', 'human', 'warlock/dps/gear_sets/preraid.gear.json', { health: true }],
  ['warlock-wrack', 'warlock', 'orc', 'warlock/dps/gear_sets/preraid.gear.json', { health: true }],
  ['warlock-destruction', 'warlock', 'human', 'warlock/dps/gear_sets/preraid.gear.json', { health: true }],
  ['priest-shadow', 'priest', 'human', 'priest/dps/builds/testing.build.json', { health: true }],
  ['priest-smite', 'priest', 'undead', 'priest/dps/builds/smite_testing.build.json', { health: true }],
  ['paladin-ret', 'paladin', 'human', 'paladin/retribution/gear_sets/default.gear.siml'],
  ['paladin-shock', 'paladin', 'human', 'paladin/retribution/gear_sets/holy_shock.gear.siml'],
  ['paladin-prot', 'paladin', 'human', 'paladin/protection/gear_sets/default.gear.siml', { tank: true }],
  ['shaman-elemental', 'shaman', 'windshaper', 'shaman/elemental/builds/testing.build.json', { health: true }],
  // It opens with a Manual Crowd Pummeler and swaps to this two-hander for the fight.
  ['shaman-enhancement', 'shaman', 'windshaper', 'shaman/enhancement/builds/testing.build.json', { health: true, mainHand: 'Stormcarver' }],
  ['druid-balance', 'druid', 'nightelf', 'druid/balance/gear_sets/prebis.gear.json'],
  ['druid-cat', 'druid', 'tauren', 'druid/feralcat/gear_sets/pre_raid.gear.json', { form: 'cat' }],
  ['druid-bear', 'druid', 'tauren', 'druid/feralbear/gear_sets/default.gear.json', { form: 'bear', tank: true }],
];

const get = async (path) => {
  const r = await fetch(RAW + path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.text();
};
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const round1 = (n) => Math.round(n * 10) / 10;

const db = JSON.parse(await get('assets/database/db.json'));
const ITEM = new Map(db.items.map((i) => [i.id, i]));
const ITEM_NAMED = new Map();
for (const i of db.items) if (!ITEM_NAMED.has(norm(i.name))) ITEM_NAMED.set(norm(i.name), i);
const ENCHANT = new Map(db.enchants.map((e) => [e.effectId, e]));
const SUFFIX = new Map(db.randomSuffixes.map((s) => [s.id, s]));
const SUFFIX_NAMED = new Map(db.randomSuffixes.map((s) => [norm(s.name), s]));

const SIML_NAMES = JSON.parse(await get('sim/siml/names.json'));

// A .gear.siml names items and enchants: "chest  beaststalkers_tunic + chest_greater_stats".
function parseSiml(text) {
  const items = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.trim().match(/^(head|neck|shoulder|back|chest|wrist|hands|waist|legs|feet|finger1|finger2|trinket1|trinket2|main_hand|off_hand|ranged)\s+(.*)$/);
    if (!m) continue;
    const [what, enchantName] = m[2].split('+').map((s) => s.trim());
    const [name, ...suffix] = what.split(/\s+/);
    // Most names are the item's own; a few differ from the item database, so its names table comes first.
    const named = SIML_NAMES.items[name];
    const item = (named ? ITEM.get(named.id ?? named) : null) ?? ITEM_NAMED.get(norm(name));
    if (!item) throw new Error(`No item ${name}`);
    const rec = { id: item.id };
    if (suffix.length) {
      const s = SUFFIX_NAMED.get(norm(suffix.join(' ')));
      if (!s) throw new Error(`No suffix ${suffix}`);
      rec.randomSuffix = s.id;
    }
    if (enchantName) {
      const e = SIML_NAMES.enchants[enchantName];
      if (!e) throw new Error(`No enchant ${enchantName}`);
      rec.enchant = e.effectId;
    }
    items.push(rec);
  }
  return items;
}

async function gearOf(path) {
  const text = await get(SPECS + path);
  if (path.endsWith('.siml')) return parseSiml(text);
  const data = JSON.parse(text);
  return (data.player?.equipment ?? data).items;
}

function weaponOf(item, override) {
  const so = item.scalingOptions['0'];
  return { name: item.name, type: override ?? WEAPON[item.weaponType], ...(item.handType === 4 ? { twoHand: true } : {}), min: so.weaponDamageMin, max: so.weaponDamageMax, speed: item.weaponSpeed };
}

function compute(id, cls, raceId, gear, opts) {
  const c = CLASSES[cls];
  const r = RACES[raceId];
  const total = {};
  const add = (k, v) => { total[k] = (total[k] ?? 0) + v; };
  const sets = {};
  const names = [];
  const worn = gear.filter((g) => g?.id).map((g) => ({ ...g, item: ITEM.get(g.id) }));
  const missing = worn.find((g) => !g.item);
  if (missing) throw new Error(`${id}: no item ${missing.id}`);
  // What it fights with: another weapon in the bag replaces the one it opens with.
  const swap = opts.mainHand ? ITEM_NAMED.get(norm(opts.mainHand)) : null;
  const melee = worn.filter((g) => g.item.handType && g.item.weaponSpeed && WEAPON[g.item.weaponType]);
  if (swap) melee[0].item = swap;
  for (const { item, enchant, randomSuffix } of worn) {
    const so = item.scalingOptions['0'];
    for (const [k, v] of Object.entries(so.stats ?? {})) add(Number(k), v);
    const suffix = SUFFIX.get(randomSuffix);
    if (suffix) suffix.stats.forEach((v, i) => { if (v) add(i, (so.randPropPoints * v) / 10000); });
    const e = ENCHANT.get(enchant);
    if (e) e.stats.forEach((v, i) => { if (v) add(i, v); });
    names.push(item.name + (suffix ? ` ${suffix.name}` : ''));
    if (item.setName) sets[item.setName] = (sets[item.setName] ?? 0) + 1;
  }
  for (const [set, pieces] of Object.entries(sets)) {
    for (const [need, bonus] of SET_BONUS[set] ?? []) {
      if (pieces >= need) for (const [k, v] of Object.entries(bonus)) add(STAT[k], v);
    }
  }
  const g = (k) => total[STAT[k]] ?? 0;
  const attr = (k) => (c[k] ?? 0) + (r[k] ?? 0) + g(k);
  const str = attr('str'), agi = attr('agi'), sta = attr('sta'), int = attr('int');
  const spirit = Math.floor(attr('spi') * (r.spiritMult ?? 1));
  const defense = 300 + g('def');
  const defenseShare = (defense - 300) * 0.04;
  let attackPower = c.ap + g('ap') + str * c.strAp + agi * (c.agiAp ?? 0);
  let health = c.hp - 180 + sta * 10;
  const itemArmor = g('armor') + g('bonusArmor');
  let armor = itemArmor + agi * 2;
  // Forms: sim/druid/forms.go and the client's rows for Cat Form and Dire Bear Form.
  if (opts.form === 'cat') attackPower += 12 + agi + g('fap');
  if (opts.form === 'bear') { attackPower += 120 + g('fap'); health += 600; armor = itemArmor * 4.6 + agi * 2; }
  health = Math.round(health * (r.healthMult ?? 1));
  const stats = {
    attackPower: Math.round(attackPower),
    crit: round1((c.crit ?? 0) + (r.crit ?? 0) + agi * c.agiCrit + g('crit') / RATING.crit),
    hit: round1(g('hit') / RATING.hit + (r.hit ?? 0)),
    spellCrit: round1((c.spellCrit ?? 0) + (r.spellCrit ?? 0) + int * (c.intCrit ?? 0) + g('crit') / RATING.crit),
  };
  if (g('exp')) stats.expertise = round1(g('exp') / RATING.exp);
  if (g('sp')) stats.spellPower = Math.round(g('sp'));
  const schools = {};
  for (const s of ['arcane', 'fire', 'frost', 'holy', 'nature', 'shadow']) if (g(s)) schools[s] = Math.round(g(s));
  if (Object.keys(schools).length) stats.spellPowerBySchool = schools;
  const shield = worn.find((x) => x.item.weaponType === 7);
  const main = melee[0]?.item;
  const off = melee.length > 1 && melee[1].item.handType !== 1 ? melee[1].item : null;
  if (opts.form) {
    // A paw: the weapon's table DPS over the form's swing, with the form's 40 % spread.
    const swing = opts.form === 'cat' ? 1 : 2.5;
    const dps = main.scalingOptions['0'].unroundedDps;
    const mean = dps * swing;
    stats.mainHand = { name: `${opts.form === 'cat' ? 'Cat' : 'Bear'} attack (${main.name}, ${round1(dps)} DPS)`, type: opts.form === 'cat' ? 'fist' : 'mace', min: Math.floor(mean * 0.8), max: Math.round(mean * 1.2), speed: swing };
    stats.offHand = null;
  } else {
    stats.mainHand = weaponOf(main);
    stats.offHand = off ? weaponOf(off) : null;
  }
  if (shield) stats.shield = true;
  if (opts.hunter) {
    const bow = worn.find((x) => RANGED[x.item.rangedWeaponType]).item;
    stats.rangedAttackPower = Math.round(c.rap + g('rap') + agi * c.agiRap);
    stats.ranged = weaponOf(bow, RANGED[bow.rangedWeaponType]);
    // settings in its builds: thorium_headed_arrow and ancient_sinew_wrapped_lamina.
    stats.ammoDps = 17.5;
    stats.rangedHaste = 1.15;
  }
  if (opts.health) stats.health = health;
  if (opts.tank) {
    const cat = opts.form === 'bear';
    stats.tank = {
      health,
      armor: Math.round(armor),
      defense: round1(defense),
      dodge: round1((c.dodge ?? 0) + (r.dodge ?? 0) + agi * dodgePerAgi(c, cls) + g('dodge') / RATING.dodge + defenseShare),
      parry: cat ? 0 : round1(5 + g('parry') / RATING.parry + defenseShare),
      block: shield ? round1(5 + g('block') / RATING.block + defenseShare) : 0,
      blockValue: shield ? Math.round(g('bv') + str * 0.05) : 0,
    };
  }
  const options = c.mana ? { mana: c.mana - 280 + int * 15, spirit, mp5: Math.round(g('mp5')) } : {};
  return { stats, options, names, sets, raw: { str, agi, sta, int, spirit } };
}

const out = {};
const notes = [`# Gear sheets from WoWSims Forever`, '', `Generated by \`tools/gear_sheets.mjs\` from wowsims/forever at \`${COMMIT.slice(0, 7)}\`. A sheet is what the character panel`,
  `would show unbuffed: gear, class and race base and plain set bonuses, with no talents, raid buffs, consumables, procs or on-use effects.`,
  `The builds marked community keep the sheets of the sims they came from.`, ''];
for (const [id, cls, race, path, opts = {}] of SHEETS) {
  const s = compute(id, cls, race, await gearOf(path), opts);
  out[id] = { stats: s.stats, options: s.options };
  notes.push(`## ${id}`, '', `\`${path}\`, ${race}. Str ${s.raw.str}, Agi ${s.raw.agi}, Sta ${s.raw.sta}, Int ${s.raw.int}, Spi ${s.raw.spirit}.`, '', s.names.join(', ') + '.', '');
  if (Object.keys(s.sets).length) notes.push(`Sets: ${Object.entries(s.sets).map(([k, v]) => `${k} (${v})`).join(', ')}.`, '');
}
fs.writeFileSync('src/specs/gear.gen.json', `${JSON.stringify(out, null, 1)}\n`);
fs.writeFileSync('research/wowsims_gear.md', `${notes.join('\n').trim()}\n`);
console.log(`Gear: ${Object.keys(out).length} sheets`);
