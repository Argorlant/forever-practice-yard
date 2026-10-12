// Shaman for WoW Forever: Elemental (Lightning Bolt, Lava Burst on Flame
// Shock, Clearcasting, Lightning Overload; Stormcaller as a build),
// Enhancement (one two-hander with Windfury Weapon, Stormstrike, Maelstrom
// Weapon, Fire Nova around your Searing Totem) and our experimental
// off-tank. Shared rules in ./core.ts, numbers in ./data.ts, builds in ./talents.ts.
import type { Combat } from '../../engine/combat';
import type { Spec } from '../../engine/types';
import { BOSS_RULES, CONTROLS } from '../common';
import { ABILITIES, D, SOURCES, T, chances, fireTotem, imbue, maelstromStacks, nearFireTotem, prepare, regen } from './core';
import { ELEMENTAL_STATS, ENHANCEMENT_STATS, OFFTANK_STATS } from './data';
import { buildLabel, buildsFor, summary, talentsFor, type ShamanSpec } from './talents';

type Row = { label: string; value: string; good?: boolean };
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

function ctx(c: Combat) {
  const p = c.player;
  const t = c.target!;
  const ready = (id: string) => c.cooldownLeft(id).left === 0 && (c.ability(id)?.usable?.(c) ?? true);
  const afford = (id: string) => c.cost(c.ability(id)!) <= p.resource;
  const can = (id: string) => ready(id) && afford(id);
  const mana = c.manaLocked ? 1 : p.resource / p.maxResource;
  const has = (id: string) => !!c.aura(p, id);
  return { p, t, ready, afford, can, mana, has };
}

/** Totems the hint keeps up (a 1.0 s global cooldown each); a Fire totem is dropped again when it runs out. */
function totems(c: Combat, list: string[]): string | null {
  const { can, has } = ctx(c);
  for (const id of list) {
    const aura = id === 'windfuryTotem' ? 'windfuryTotemOwn' : id;
    if (id === 'manaSpringTotem' && (c.manaLocked || c.raid.has('manaSpring'))) continue;
    if (!has(aura) && can(id)) return id;
  }
  return null;
}

/** A potion below 35 % mana, when it all fits. */
function potion(c: Combat): string | null {
  const { p, ready, mana } = ctx(c);
  if (c.manaLocked || !p.inCombat) return null;
  return mana < 0.35 && p.maxResource - p.resource >= D.manaPotion.max && ready('manaPotion') ? 'manaPotion' : null;
}

function manaRows(c: Combat, rows: Row[], label: string): void {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (c.manaLocked) return;
  if (c.raid.has('judgementOfWisdom')) rows.push({ label: 'Mana from Judgement of Wisdom', value: `+${Math.round(k.manaOnHit ?? 0)}` });
  rows.push({ label, value: `${Math.round(k.lowMana ?? 0)} s (${pctOf((k.lowMana ?? 0) / Math.max(1, time))})`, good: (k.lowMana ?? 0) / Math.max(1, time) < 0.15 });
}

const onCooldown = (c: Combat, id: string, cd: number) => {
  const time = c.counters.combatTime ?? 0;
  return time > 0 ? Math.min(1, ((c.counters[`casts:${id}`] ?? 0) * cd) / time) : 0;
};

// --------------------------------------------------------------- Elemental
/** gs's ranked Elemental list (Stormcaller: the same without Lava Burst): Searing, Flame Shock, Lava Burst on it, Chain Lightning on Clearcasting, Lightning Bolt. */
function elementalSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, can, has } = ctx(c);
  const totem = totems(c, ['searingTotem', 'manaSpringTotem']);
  if (totem) return totem;
  const drink = potion(c);
  if (drink) return drink;
  const flame = !!c.aura(t, 'flameShock');
  // On the move, only instants: Flame Shock when it is down, otherwise Earth Shock.
  if (p.moving) return !flame && can('flameShock') ? 'flameShock' : can('earthShock') ? 'earthShock' : null;
  if (!flame && can('flameShock')) return 'flameShock';
  if (tl.lavaBurst && flame && can('lavaBurst') && c.casting?.id !== 'lavaBurst') return 'lavaBurst';
  if (has('clearcasting') && can('chainLightning')) return 'chainLightning';
  return 'lightningBolt';
}

function elementalReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const tl = T(c);
  const uptime = (key: string) => (k[key] ?? 0) / time;
  const casts = (id: string) => (c.meter.rows.get(id)?.hits ?? 0) + (c.meter.rows.get(id)?.misses ?? 0);
  const rows: Row[] = [
    { label: 'Flame Shock uptime', value: pctOf(uptime('uptime:target:flameShock')), good: uptime('uptime:target:flameShock') >= 0.85 },
    { label: 'Searing Totem uptime', value: pctOf(uptime('uptime:searingTotem')), good: uptime('uptime:searingTotem') >= 0.9 },
  ];
  if (tl.lavaBurst) {
    const lvb = Math.min(1, (casts('lavaBurst') * D.lavaBurst.cooldown) / time);
    rows.push({ label: 'Lava Burst on cooldown', value: pctOf(lvb), good: lvb >= 0.8 });
  }
  if (tl.elementalFocus) rows.push({ label: 'Clearcasting procs / spent on Chain Lightning', value: `${k.clearcasting ?? 0} / ${k['clearcasting:chainLightning'] ?? 0}` });
  if (tl.lightningOverload) rows.push({ label: 'Lightning Overloads', value: String(k.overloads ?? 0) });
  manaRows(c, rows, 'Time without mana for Lightning Bolt');
  return rows;
}

// ------------------------------------------------------------- Enhancement
/** gs's ranked Enhancement list: totems, Rage of the Farseer, Fire Nova on Clearcasting, Stormstrike, a 5-stack Lightning Bolt, Flame Shock, Earth Shock, Fire Nova with mana. */
function enhancementSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, can, has, mana } = ctx(c);
  const air = imbue(c) === 'windfury' ? 'graceOfAirTotem' : 'windfuryTotem';
  const totem = totems(c, ['strengthOfEarthTotem', air, 'searingTotem', 'manaSpringTotem']);
  if (totem) return totem;
  const close = c.inRange(t);
  const nova = fireTotem(c) && nearFireTotem(c, t, D.fireNova.radius) && can('fireNova');
  if (tl.rageOfTheFarseer && p.inCombat && close && can('rageOfTheFarseer')) return 'rageOfTheFarseer';
  if (nova && has('clearcasting')) return 'fireNova';
  if (tl.stormstrike && close && can('stormstrike')) return 'stormstrike';
  if (tl.maelstromWeapon && maelstromStacks(c) >= D.maelstromWeapon.max) return 'lightningBolt';
  if (!c.aura(t, 'flameShock') && can('flameShock')) return 'flameShock';
  if (can('earthShock')) return 'earthShock';
  if (nova && mana >= 0.2) return 'fireNova';
  return potion(c);
}

function enhancementReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const tl = T(c);
  const uptime = (key: string) => (k[key] ?? 0) / time;
  const casts = (id: string) => (c.meter.rows.get(id)?.hits ?? 0) + (c.meter.rows.get(id)?.misses ?? 0);
  const rows: Row[] = [];
  if (tl.stormstrike) {
    const ss = onCooldown(c, 'stormstrike', D.stormstrike.cooldown);
    rows.push({ label: 'Stormstrike on cooldown', value: pctOf(ss), good: ss >= 0.85 });
  }
  if (tl.maelstromWeapon) rows.push({ label: 'Maelstrom stacks / 5-stack Lightning Bolts', value: `${k.maelstromStacks ?? 0} / ${k.maelstromBolts ?? 0}`, good: (k.maelstromBolts ?? 0) * 5 >= (k.maelstromStacks ?? 0) - 9 });
  if (imbue(c) === 'windfury') rows.push({ label: 'Windfury procs', value: String(k.windfury ?? 0) });
  rows.push({ label: 'Fire Nova casts', value: String(Math.round(casts('fireNova'))) });
  rows.push({ label: 'Searing Totem uptime', value: pctOf(uptime('uptime:searingTotem')), good: uptime('uptime:searingTotem') >= 0.85 });
  if (tl.flurry) rows.push({ label: 'Flurry uptime', value: pctOf(uptime('uptime:flurry')) });
  manaRows(c, rows, 'Time without mana for Earth Shock');
  return rows;
}

// -------------------------------------------------------------- Off-tank
/** Our proposal: Lightning Shield up, Stoneskin and Grace of Air, Stormstrike, Earth Shock for threat, Fire Nova with mana. */
function tankSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, can, has, mana } = ctx(c);
  if (!has('lightningShield') && can('lightningShield')) return 'lightningShield';
  const totem = totems(c, ['stoneskinTotem', 'graceOfAirTotem', 'searingTotem', 'manaSpringTotem']);
  if (totem) return totem;
  const close = c.inRange(t);
  if (tl.rageOfTheFarseer && p.inCombat && close && can('rageOfTheFarseer')) return 'rageOfTheFarseer';
  if (tl.stormstrike && close && can('stormstrike')) return 'stormstrike';
  if (can('earthShock')) return 'earthShock';
  if (fireTotem(c) && nearFireTotem(c, t, D.fireNova.radius) && can('fireNova') && mana >= 0.4) return 'fireNova';
  return potion(c);
}

function tankReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const rows: Row[] = [
    { label: 'Stormstrike on cooldown', value: pctOf(onCooldown(c, 'stormstrike', D.stormstrike.cooldown)) },
    { label: 'Stormstrike resets (dodge or parry)', value: String(k.stormstrikeResets ?? 0) },
    { label: 'Lightning Shield orbs', value: String(c.meter.rows.get('lightningShield')?.hits ?? 0) },
  ];
  manaRows(c, rows, 'Time without mana for Earth Shock');
  return rows;
}

// ------------------------------------------------------------------- specs
const OPTIONS = [
  { key: 'lockMana', name: 'Lock your mana (spells cost nothing)', kind: 'toggle' as const },
  { key: 'mana', name: 'Mana pool', kind: 'number' as const, step: 100 },
  { key: 'spirit', name: 'Spirit (regeneration outside the five-second rule)', kind: 'number' as const, step: 1 },
  { key: 'mp5', name: 'Mana per 5 sec from gear', kind: 'number' as const, step: 1 },
];
const MELEE_OPTIONS = [
  ...OPTIONS,
  { key: 'weaponMastery', name: 'Weapon Mastery: +10% weapon damage (disputed: Blizzard\'s article says baseline, the beta sheet shows nothing)', kind: 'toggle' as const },
];
const HELP_COMMON = `Spells have a cast bar; moving interrupts it, so use instants (shocks, totems) on the move. The global cooldown is 1.5 sec; totems have a 1.0 sec global cooldown.
    Mana is your resource. Spirit regeneration stops for 5 sec after you spend mana; Judgement of Wisdom and Blessing of Wisdom are on by default under Raid buffs and debuffs, your own Mana Spring Totem covers the rest, and you can lock your mana in Settings.
    Totems: one per element (Fire, Earth, Air, Water); a new one replaces the old. Searing Totem attacks for 55 sec, buff totems last 5 min. Fire Nova needs a live Fire totem and hits around it. Your totems stand around your feet where you dropped them; the buff icons show how long they last.
    Earth, Flame and Frost Shock share one cooldown. Clearcasting (10% after a damage spell) makes the next damage spell free.`;

function specFor(spec: ShamanSpec, base: Omit<Spec, 'className' | 'resource' | 'abilities' | 'rules' | 'prepare' | 'chances' | 'regen' | 'builds' | 'bar' | 'sources' | 'defaultRaid'>): Spec {
  return {
    className: 'Shaman',
    resource: 'mana',
    abilities: ABILITIES,
    rules: BOSS_RULES,
    builds: buildsFor(spec).map((b) => ({ id: b.id, label: buildLabel(b), name: b.name, source: b.source, talentString: b.talentString, stats: b.stats, bar: b.bar, options: b.options, tank: b.tank, trees: summary(talentsFor(b.id, spec)) })),
    bar: buildsFor(spec)[0].bar,
    sources: SOURCES,
    prepare,
    chances,
    regen,
    defaultRaid: ['judgementOfWisdom', 'blessingOfWisdom'],
    ...base,
  };
}

export const shamanElemental: Spec = specFor('elemental', {
  id: 'shaman-elemental',
  specName: 'Elemental',
  stats: ELEMENTAL_STATS,
  defaultOptions: { build: 'elemental', mana: 4376, spirit: D.spirit.elemental, mp5: D.mp5.elemental, lockMana: false },
  options: OPTIONS,
  sheet: { attackPower: false, crit: false, spellCrit: 'Spell crit (gear + Intellect; Thundering Strikes adds on top)', spellPower: 'Spell damage (every school)', hit: 'Hit (gear; Tidal Focus adds on top)', mainHand: false, offHand: false },
  lowMana: (c) => c.cost(c.ability('lightningBolt')!),
  welcome: 'Welcome to the Elemental practice yard. Drop Searing Totem and Mana Spring Totem, keep Flame Shock burning, cast Lava Burst whenever it is ready on your Flame Shock, Chain Lightning on Clearcasting, and Lightning Bolt for everything else. Mana runs out; that is part of the spec in WoW Forever.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Elemental in WoW Forever: casts are faster and weaker (Lightning Bolt 2.0 sec with Elemental Alacrity). Lava Burst (31 points) deals 20% more on your own Flame Shock. Elemental Fury makes your spells and Searing Totem crit for 2.0x; Lightning Overload has 10% for a free half-damage copy. Elemental Mastery is gone. The Stormcaller builds trade Lava Burst for Intellect turned into spell damage.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x2a5a8a, leatherColor: 0x4a3a20, hood: false, robe: true },
  suggest: elementalSuggest,
  review: elementalReview,
});

export const shamanEnhancement: Spec = specFor('enhancement', {
  id: 'shaman-enhancement',
  specName: 'Enhancement',
  stats: ENHANCEMENT_STATS,
  defaultOptions: { build: 'enhancement', mana: 2623, spirit: D.spirit.enhancement, mp5: D.mp5.enhancement, lockMana: false, imbue: 'windfury', weaponMastery: false },
  options: [...MELEE_OPTIONS, {
    key: 'imbue', name: 'Weapon imbue', kind: 'choice',
    choices: [{ value: 'windfury', label: 'Windfury Weapon (the sims; turns the raid Windfury Totem off for you)' }, { value: 'flametongue', label: 'Flametongue Weapon (with a Windfury Totem)' }],
  }],
  sheet: { spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell damage', crit: 'Melee crit (gear + Agility; Thundering Strikes adds on top)', offHand: false },
  lowMana: (c) => c.cost(c.ability('earthShock')!),
  welcome: 'Welcome to the Enhancement practice yard. One two-hander with Windfury Weapon: drop Strength of Earth, Grace of Air and Searing Totem, then Stormstrike on cooldown, spend its charge on Earth Shock or a 5-stack Lightning Bolt (instant and free), keep Flame Shock up and use Fire Nova around your Searing Totem, always on Clearcasting.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Enhancement in WoW Forever: no dual wield. Windfury Weapon: 20% per landed main-hand hit (1.5 sec cooldown) for two extra attacks with +466 AP (Elemental Weapons 3/3); it turns a Windfury Totem off for you, so your Air totem is Grace of Air. Stormstrike (8 sec): a weapon hit, and your next Lightning Bolt, Chain Lightning or Earth Shock within 12 sec deals 20% more. Maelstrom Weapon: melee hits stack it (2 procs per minute per point, provisional); at 5 stacks Lightning Bolt is instant and free. Never hardcast Lightning Bolt below 5 stacks: it restarts your swing. Fire Nova is the biggest spell; Rage of the Farseer gives +30% attack speed.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x3a6a8a, leatherColor: 0x5a4020, hood: false, plate: false },
  suggest: enhancementSuggest,
  review: enhancementReview,
});

export const shamanTank: Spec = specFor('tank', {
  id: 'shaman-tank',
  specName: 'Off-tank (experimental)',
  tank: true,
  stats: OFFTANK_STATS,
  defaultOptions: { build: 'tank', mana: 2900, spirit: D.spirit.enhancement, mp5: D.mp5.enhancement, lockMana: false, weaponMastery: false },
  options: MELEE_OPTIONS,
  sheet: { spellCrit: 'Spell crit (gear + Intellect)', spellPower: 'Spell damage', offHand: false },
  lowMana: (c) => c.cost(c.ability('earthShock')!),
  welcome: 'Welcome to the off-tank practice yard, our experimental proposal: WoW Forever has no tank shaman. Rockbiter Weapon (+threat), Lightning Shield orbs when the dummy hits you, Stoneskin Totem, Stormstrike (your dodges and parries can reset it) and Earth Shock for double threat.',
  help: `${CONTROLS}
    ${HELP_COMMON}
    Off-tank (our proposal, 17/34/0): Forever has no tank shaman, so this is an experiment. Rockbiter Weapon gives +784 AP and threat on each hit, Spirit Weapons lets you parry and adds 30% threat with Rockbiter, Anticipation and Toughness are in the tank sheet. Lightning Shield: 3 orbs, one per hit you take (3.5 sec apart). Improved Stormstrike resets Stormstrike when you dodge or parry. Nothing lowers crushing blows, so expect to take a lot of damage.
    This is a practice tool built on an experimental build: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x4a5a6a, leatherColor: 0x5a4020, hood: false, plate: true },
  suggest: tankSuggest,
  review: tankReview,
});
