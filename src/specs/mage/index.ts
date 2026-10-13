// Mage for WoW Forever: Arcane (Arcane Blast stacks, Missile Barrage),
// Fire (Scorch, Heating Up Pyroblasts, rolling Ignite, Combustion) and
// Frost (Frostbolt, Fingers of Frost, Ice Lance), with the sims' hybrids as
// builds. Shared rules in ./core.ts, numbers in ./data.ts, builds in ./talents.ts.
import type { Combat } from '../../engine/combat';
import type { Spec } from '../../engine/types';
import { BOSS_RULES, CONTROLS } from '../common';
import { ABILITIES, D, SOURCES, T, abStacks, chances, prepare, regen, stacksOf } from './core';
import { ARCANE_STATS, FIRE_STATS, FROST_STATS } from './data';
import { buildLabel, buildsFor, summary, talentsFor, type MageSpec } from './talents';

type Row = { label: string; value: string; good?: boolean };
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

function ctx(c: Combat) {
  const p = c.player;
  const ready = (id: string) => c.cooldownLeft(id).left === 0 && (c.ability(id)?.usable?.(c) ?? true);
  const afford = (id: string) => c.cost(c.ability(id)!) <= p.resource;
  const mana = c.manaLocked ? 1 : p.resource / p.maxResource;
  return { p, ready, afford, mana };
}

/** Let a channel finish: Arcane Missiles and Evocation are worth more than what would clip them. */
const channelingNow = (c: Combat) => c.channeling?.id === 'arcaneMissiles' || c.channeling?.id === 'evocation';

/** Mana tools in the sims' order: Evocation when low, the Ruby below 80 %, a potion below 40 %. */
function manaTool(c: Combat, evocationAt: number): string | null {
  const { p, ready, mana } = ctx(c);
  if (c.manaLocked || !p.inCombat) return null;
  if (mana < evocationAt && ready('evocation')) return 'evocation';
  if (mana < 0.8 && p.maxResource - p.resource >= D.manaRuby.max && ready('manaRuby')) return 'manaRuby';
  if (mana < 0.4 && p.maxResource - p.resource >= D.manaPotion.max && ready('manaPotion')) return 'manaPotion';
  return null;
}

function manaRows(c: Combat, rows: Row[]): void {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (c.manaLocked) return;
  if (c.raid.has('judgementOfWisdom')) rows.push({ label: 'Mana from Judgement of Wisdom', value: `+${Math.round(k.manaOnHit ?? 0)}` });
  rows.push({ label: 'Time without mana for your main spell', value: `${Math.round(k.lowMana ?? 0)} s (${pctOf((k.lowMana ?? 0) / Math.max(1, time))})`, good: (k.lowMana ?? 0) / Math.max(1, time) < 0.1 });
}

const HELP_COMMON = `Spells have a cast bar and channels drain one; moving interrupts both. The global cooldown is 1.5 sec, shorter with casting haste (1.0 sec floor).
    Mana is your resource. Spirit regeneration stops for 5 sec after you spend mana, but Mage Armor and Arcane Meditation keep up to all of it while casting; Evocation is 16 times your Spirit regen for 8 sec. Judgement of Wisdom, Blessing of Wisdom and Mana Spring Totem are on by default; Mana Ruby and Major Mana Potion have separate cooldowns. You can lock your mana in Settings.`;
const OPTIONS = [
  { key: 'lockMana', name: 'Lock your mana (spells cost nothing)', kind: 'toggle' as const },
  { key: 'mana', name: 'Mana pool', kind: 'number' as const, step: 100 },
  { key: 'spirit', name: 'Spirit (regeneration outside the five-second rule)', kind: 'number' as const, step: 1 },
  { key: 'mp5', name: 'Mana per 5 sec from gear', kind: 'number' as const, step: 1 },
];

function specFor(spec: MageSpec, base: Omit<Spec, 'className' | 'resource' | 'abilities' | 'rules' | 'prepare' | 'chances' | 'regen' | 'builds' | 'bar' | 'sources' | 'defaultRaid'>): Spec {
  return {
    className: 'Mage',
    resource: 'mana',
    abilities: ABILITIES,
    rules: BOSS_RULES,
    builds: buildsFor(spec).map((b) => ({ id: b.id, label: buildLabel(b), name: b.name, source: b.source, talentString: b.talentString, stats: b.stats, bar: b.bar, options: b.options, trees: summary(talentsFor(b.id, spec)) })),
    bar: buildsFor(spec)[0].bar,
    sources: SOURCES,
    prepare,
    chances,
    regen,
    defaultRaid: ['judgementOfWisdom', 'blessingOfWisdom', 'manaSpring'],
    sheet: { attackPower: false, crit: false, spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell damage (every school)', mainHand: false, offHand: false },
    ...base,
  };
}

// ------------------------------------------------------------------ Arcane
/** gs's ranked Arcane list: cooldowns, Missiles on Barrage, Frostbolt at 3 Arcane Blast stacks, Arcane Blast. */
function arcaneSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, mana } = ctx(c);
  if (channelingNow(c)) return null;
  if (p.inCombat && tl.arcanePower && ready('arcanePower') && mana >= 0.6) return 'arcanePower';
  if (p.inCombat && tl.presenceOfMind && ready('presenceOfMind')) return 'presenceOfMind';
  const tool = manaTool(c, 0.15);
  if (tool) return tool;
  if (c.aura(p, 'missileBarrage')) return 'arcaneMissiles';
  const stacks = abStacks(c);
  if (!tl.arcaneBlast) return 'arcaneMissiles';
  if (stacks >= 3 || (stacks >= 2 && mana < 0.2)) return tl.ignite && ready('fireBlast') ? 'fireBlast' : 'frostbolt';
  return 'arcaneBlast';
}

function arcaneReview(c: Combat): Row[] {
  const k = c.counters;
  if ((k.combatTime ?? 0) < 1) return [];
  const spent = [1, 2, 3, 4].map((n) => k[`stacksSpent:${n}`] ?? 0);
  const total = spent.reduce((a, b) => a + b, 0);
  const rows: Row[] = [
    { label: 'Arcane Blast stacks spent at 3+', value: total ? `${spent[2] + spent[3]} of ${total}` : '-', good: total === 0 || (spent[2] + spent[3]) / total >= 0.7 },
  ];
  if (T(c).missileBarrage) rows.push({ label: 'Missile Barrage procs / used', value: `${k.missileBarrage ?? 0} / ${k.barrageUsed ?? 0}`, good: (k.barrageUsed ?? 0) >= (k.missileBarrage ?? 0) - 1 });
  if (T(c).arcaneConcentration) rows.push({ label: 'Clearcasting procs / used', value: `${k.clearcasting ?? 0} / ${k.clearcastingUsed ?? 0}` });
  manaRows(c, rows);
  return rows;
}

export const mageArcane: Spec = specFor('arcane', {
  id: 'mage-arcane',
  specName: 'Arcane',
  stats: ARCANE_STATS,
  defaultOptions: { build: 'arcane', mana: 4530, spirit: D.spirit, mp5: D.mp5, lockMana: false, missilesUseStacks: false },
  options: [...OPTIONS, { key: 'missilesUseStacks', name: 'Arcane Missiles use and spend Arcane Blast stacks (gunba; the client data says no)', kind: 'toggle' }],
  lowMana: (c) => c.cost(c.ability('arcaneBlast')!),
  welcome: 'Welcome to the Arcane practice yard. Arcane Blast is the core in WoW Forever: three Blasts (each one costs more and adds +10% to your other spells), then a Frostbolt to spend the stacks. Arcane Missiles when Missile Barrage lights it; Arcane Power and Presence of Mind together.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Arcane in WoW Forever: Arcane Blast (2.5 sec) adds a stack (max 4, 8 sec): +10% to your other spells and +175% to its own cost. The next other damage spell spends them, so the loop is three Blasts and a Frostbolt (Fire Blast for the Arcane/Fire build). Arcane Missiles neither use nor spend them (the client data; an option below gives gunba's rule, where they do). Missile Barrage (40% from Arcane Blast, 20% from Frostbolt) makes the next Arcane Missiles free and twice as fast; each missile rolls its own hit and crit, and each one that lands can proc Clearcasting: five chances per cast. Clearcasting makes the next spell free: best on a 3-stack Arcane Blast. Arcane Mind makes Arcane crits 2.0x.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x6a4aa0, leatherColor: 0x30264a, hood: true, robe: true },
  suggest: arcaneSuggest,
  review: arcaneReview,
});

// -------------------------------------------------------------------- Fire
/** gs's ranked Fire list: Combustion, Pyroblast at 3 Heating Up, Fire Blast, Scorch upkeep, then your filler. */
function fireSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready } = ctx(c);
  if (channelingNow(c)) return null;
  const tool = manaTool(c, 0.2);
  if (tool) return tool;
  if (p.inCombat && tl.combustion && ready('combustion')) return 'combustion';
  if (tl.pyroblast && stacksOf(c, p, 'heatingUp') >= 3) return 'pyroblast';
  if (ready('fireBlast')) return 'fireBlast';
  const fv = c.aura(t, 'fireVulnerability');
  if (tl.improvedScorch && (!fv || (fv.stacks ?? 0) < 5 || fv.end - c.t <= 5)) return 'scorch';
  const filler = String(c.options.fireFiller ?? 'scorch');
  return filler === 'fireball' ? 'fireball' : filler === 'frostfire' ? 'frostfireBolt' : 'scorch';
}

function fireReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const tl = T(c);
  const rows: Row[] = [];
  if (tl.improvedScorch) rows.push({ label: 'Fire Vulnerability uptime', value: pctOf((k['uptime:target:fireVulnerability'] ?? 0) / time), good: (k['uptime:target:fireVulnerability'] ?? 0) / time >= 0.9 });
  if (tl.pyroblast) rows.push({ label: 'Pyroblasts (with Heating Up)', value: String(k.pyroblasts ?? 0) });
  const ignite = c.meter.rows.get('ignite')?.total ?? 0;
  if (tl.ignite) rows.push({ label: 'Ignite share of your damage', value: c.meter.total ? pctOf(ignite / c.meter.total) : '-' });
  manaRows(c, rows);
  return rows;
}

export const mageFire: Spec = specFor('fire', {
  id: 'mage-fire',
  specName: 'Fire',
  stats: FIRE_STATS,
  defaultOptions: { build: 'fire', mana: 4218, spirit: D.spirit, mp5: D.mp5, lockMana: false, fireFiller: 'scorch' },
  options: [...OPTIONS, {
    key: 'fireFiller', name: 'Filler spell', kind: 'choice',
    choices: [{ value: 'scorch', label: 'Scorch (gunba: fast crits for Heating Up)' }, { value: 'fireball', label: 'Fireball (foreversim)' }, { value: 'frostfire', label: 'Frostfire Bolt (Fire/Frost builds)' }],
  }],
  lowMana: (c) => c.cost(c.ability('scorch')!),
  welcome: 'Welcome to the Fire practice yard. Fire in WoW Forever plays around Heating Up: direct crits make your next Pyroblast faster, and at 3 stacks it is a 1.5 sec cast. Keep Fire Vulnerability at 5 stacks with Scorch, Fire Blast on cooldown, Pyroblast at 3 Heating Up; Ignite rolls your crits into a burn.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Fire in WoW Forever: Heating Up (each direct crit of Fireball, Frostfire Bolt, Fire Blast or Scorch takes 25% off the next Pyroblast; 3 stacks, 20 sec). Ignite is 40% of a crit over 4 sec, rolling into the next one; it never crits. Improved Scorch is personal: +3% of your Fire damage per stack, 5 stacks, 30 sec. Combustion adds 10% crit per Fire hit and ends after 3 crits. gunba fills with Scorch (its fast crits build Heating Up); foreversim with Fireball: pick yours in Settings.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0xa0301a, leatherColor: 0x4a2010, hood: true, robe: true },
  suggest: fireSuggest,
  review: fireReview,
});

// ------------------------------------------------------------------- Frost
/** gs's ranked Frost list (and Arcane-Frost): Ice Lance on Fingers of Frost, Missiles on Barrage, Frostbolt. */
function frostSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p } = ctx(c);
  if (channelingNow(c)) return null;
  const tool = manaTool(c, 0.15);
  if (tool) return tool;
  if (tl.iceLance && c.aura(p, 'fingersOfFrost') && !c.casting) return 'iceLance';
  if (tl.missileBarrage && c.aura(p, 'missileBarrage')) return 'arcaneMissiles';
  return 'frostbolt';
}

function frostReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const tl = T(c);
  const rows: Row[] = [];
  if (tl.wintersChill) rows.push({ label: "Winter's Chill uptime", value: pctOf((k['uptime:target:wintersChill'] ?? 0) / time), good: (k['uptime:target:wintersChill'] ?? 0) / time >= 0.9 });
  if (tl.fingersOfFrost) {
    const lances = (c.meter.rows.get('iceLance')?.hits ?? 0) + (c.meter.rows.get('iceLance')?.misses ?? 0);
    rows.push({ label: 'Fingers of Frost charges / Ice Lances', value: `${k.fingers ?? 0} / ${lances}`, good: lances >= (k.fingers ?? 0) * 0.7 });
  }
  if (tl.missileBarrage) rows.push({ label: 'Missile Barrage procs / used', value: `${k.missileBarrage ?? 0} / ${k.barrageUsed ?? 0}` });
  manaRows(c, rows);
  return rows;
}

export const mageFrost: Spec = specFor('frost', {
  id: 'mage-frost',
  specName: 'Frost',
  stats: FROST_STATS,
  defaultOptions: { build: 'frost', mana: 4203, spirit: D.spirit, mp5: D.mp5, lockMana: false, missilesUseStacks: false },
  options: OPTIONS,
  lowMana: (c) => c.cost(c.ability('frostbolt')!),
  welcome: 'Welcome to the Frost practice yard. Frostbolt is your spell; Fingers of Frost (15% per Frostbolt) gives two charges that make Ice Lance hit four times as hard and crit far more. Winter\'s Chill stacks itself. The Arcane-Frost build also fires Arcane Missiles on Missile Barrage.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Frost in WoW Forever: bosses cannot be frozen, so Fingers of Frost is how Shatter works: each landed Frostbolt has a 15% chance to give 2 charges; each damage spell spends one (+50% crit with Shatter, Ice Lance x4). Winter's Chill is personal: +2% crit per stack for your Frostbolt and Ice Lance, 5 stacks. Ice Shards makes Frost crits 2.0x. Frostbolt and Ice Lance are all or nothing.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x3a6aa0, leatherColor: 0x1a2a4a, hood: true, robe: true },
  suggest: frostSuggest,
  review: frostReview,
});
