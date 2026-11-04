// Hunter for WoW Forever: Beast Mastery (pet and hawks), Marksmanship (Lone
// Wolf or with a pet) and Survival (melee). Auto Shot lives in the engine
// (its windup and the dead zone); shared rules in ./core.ts, numbers in
// ./data.ts, builds in ./talents.ts. Melee weaving is an optional mode (./weave.ts).
import type { Combat } from '../../engine/combat';
import type { Spec } from '../../engine/types';
import { BOSS_RULES, CONTROLS } from '../common';
import { PET_HELP, PET_MODE } from '../pet';
import { ABILITIES, D, SOURCES, T, chances, onCooldown, prepare, regen } from './core';
import { gearOptions } from '../gear';
import { MELEE_STATS, RANGED_STATS } from './data';
import { buildLabel, buildsFor, summary, talentsFor, type HunterSpec } from './talents';
import { WEAVE_OPTIONS, weaveAdvised, weaveCue, weaveRings, weaveRows, weaveSuggest } from './weave';

type Row = { label: string; value: string; good?: boolean };
const pctOf = (n: number) => `${Math.round(n * 100)}%`;

/** Under the Classic rule a cast must end before the next windup starts, or it clips the shot. */
function castFits(c: Combat, id: string): boolean {
  if (!c.classicAutoShot || !c.autoShooting) return true;
  const a = c.ability(id)!;
  const cast = typeof a.castTime === 'function' ? a.castTime(c) : a.castTime ?? 0;
  return !c.windup && cast <= c.timeToWindup() + 0.05;
}

function ctx(c: Combat) {
  const p = c.player;
  const ready = (id: string) => c.cooldownLeft(id).left === 0 && (c.ability(id)?.usable?.(c) ?? true);
  const afford = (id: string) => c.cost(c.ability(id)!) <= p.resource;
  const mana = c.manaLocked ? 1 : p.resource / p.maxResource;
  const potion = !c.manaLocked && p.inCombat && p.resource <= p.maxResource - D.manaPotion.max && mana < 0.4 && ready('manaPotion');
  return { p, ready, afford, mana, potion };
}

function autoShotRows(c: Combat, rows: Row[]): void {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  const w = c.stats.ranged;
  if (!w || time < 1) return;
  // Shots the weapon allows with the quiver alone: a floor, since Quick Shots and Rapid Fire add more.
  const possible = time / (w.speed / (c.stats.rangedHaste ?? 1));
  rows.push({ label: 'Auto Shots fired', value: `${k.autoShots ?? 0} (about ${Math.round(possible)} without haste procs)`, good: (k.autoShots ?? 0) >= possible * 0.9 });
  rows.push({ label: 'Windups lost to moving', value: String(k.autoShotsInterrupted ?? 0), good: (k.autoShotsInterrupted ?? 0) === 0 });
  if (c.classicAutoShot) rows.push({ label: 'Auto Shots clipped by casts', value: String(k.autoShotsClipped ?? 0), good: (k.autoShotsClipped ?? 0) <= 2 });
}

function manaRows(c: Combat, rows: Row[]): void {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (c.manaLocked) return;
  if (c.raid.has('judgementOfWisdom')) rows.push({ label: 'Mana from Judgement of Wisdom', value: `+${Math.round(k.manaOnHit ?? 0)}` });
  rows.push({ label: 'Time without mana for your main shot', value: `${Math.round(k.lowMana ?? 0)} s (${pctOf((k.lowMana ?? 0) / Math.max(1, time))})`, good: (k.lowMana ?? 0) / Math.max(1, time) < 0.1 });
}

const HELP_COMMON = `Auto Shot fires on its own every weapon swing (faster with the quiver, Quick Shots and Rapid Fire). Each shot has a 0.5 sec windup in which you must stand still: moving makes it try again 0.5 sec later. Ranged attacks work from 8 to 35 yards; closer is the dead zone.
    WoW Forever: Aimed Shot is baseline (2 sec cast, 6 sec cooldown shared with Multi-Shot, which is instant since the Oct 15 client), Arcane Shot and Serpent Sting scale with ranged attack power, and Auto Shot keeps firing while you cast (Settings has the Classic rule as an option). You cannot cast while moving; Arcane Shot and Serpent Sting are instant.
    Mana is your resource: shots drain it fast. Judgement of Wisdom, Blessing of Wisdom and Mana Spring Totem are on by default under Raid buffs and debuffs, and Major Mana Potions are on your bar; you can lock your mana in Settings.`;

const WEAVE_HELP = `Melee weaving, really ranged weaving: on any build you can step in and out, because Auto Shot and your melee swing (the two-handed glaive) run on separate timers and the distance decides which one fires. The rings on the ground show it: inside the red one you hit in melee, outside the green one you shoot, and between them nothing fires. The weaving helper in Settings (on in gunba's SV Weave and MM Weave, which play this way from 12 yards) plans the trips: use your ranged cooldowns at range, step in, press what you can (Raptor Strike first, it goes on your next swing and off the global cooldown, then Immolation Trap, Mongoose Bite and Strider Kick), and step back out before the next windup; the cue above your bar says when. Without the helper nothing asks you to step in, but in melee it still shows what to press and when to step out. We assume separate timers, as in Classic, until this can be checked in the live game; on the beta a melee swing restarted the Auto Shot timer (reported as bug #14), and you can pick that rule in Settings to practice it.`;

const OPTIONS = [
  { key: 'classicAutoShot', name: 'Classic Auto Shot rule: a cast started in the windup clips the shot', kind: 'toggle' as const },
  { key: 'trackable', name: 'The dummy is a trackable type (Improved Tracking works)', kind: 'toggle' as const },
  { key: 'lockMana', name: 'Lock your mana (shots cost nothing)', kind: 'toggle' as const },
  { key: 'mana', name: 'Mana pool', kind: 'number' as const, step: 100 },
  { key: 'spirit', name: 'Spirit (regeneration outside the five-second rule)', kind: 'number' as const, step: 1 },
];
const PET_OPTION = { key: 'petSpeed', name: 'Pet', kind: 'choice' as const, choices: [{ value: '1.2', label: 'Fast cat (1.2 sec swings, the sims\' choice)' }, { value: '2', label: 'Normal pet (2.0 sec swings)' }] };

function specFor(spec: HunterSpec, base: Omit<Spec, 'className' | 'resource' | 'abilities' | 'rules' | 'prepare' | 'chances' | 'regen' | 'builds' | 'bar' | 'sources'>): Spec {
  return {
    className: 'Hunter',
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
    pet: { fur: 0x9a7a4a, belly: 0xd8c09a, eyes: 0xc8ff6a },
    ...base,
  };
}

// --------------------------------------------------------- Marksmanship
/** WoWSims Forever's turret and weave lists, with the practice yard's pre-pull. */
function mmSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, potion } = ctx(c);
  if (!c.aura(p, 'aspectOfTheHawk')) return 'aspectOfTheHawk';
  if (tl.trueshotAura && !c.aura(p, 'trueshotAura')) return 'trueshotAura';
  if (!c.aura(t, 'huntersMark')) return 'huntersMark';
  if (!c.autoShooting && c.inRangedRange(t)) return 'autoShot';
  if (p.inCombat && ready('rapidFire')) return 'rapidFire';
  if (!c.aura(t, 'serpentSting') && afford('serpentSting')) return 'serpentSting';
  if (ready('arcaneShot') && afford('arcaneShot')) return 'arcaneShot';
  // Weaving: no casts at range, they would keep you out of melee.
  if (weaveAdvised(c)) {
    if (ready('multiShot') && afford('multiShot')) return 'multiShot';
    return potion ? 'manaPotion' : null;
  }
  if (ready('aimedShot') && afford('aimedShot') && castFits(c, 'aimedShot')) return 'aimedShot';
  if (tl.sniperShot && ready('sniperShot') && afford('sniperShot') && castFits(c, 'sniperShot')) return 'sniperShot';
  if (potion) return 'manaPotion';
  return null;
}

function rangedReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const rows: Row[] = [];
  autoShotRows(c, rows);
  weaveRows(c, rows);
  if (!weaveAdvised(c)) rows.push({ label: 'Aimed Shot on cooldown', value: pctOf(onCooldown(c, 'aimedShot', D.aimedShot.cooldown)), good: onCooldown(c, 'aimedShot', D.aimedShot.cooldown) >= 0.7 });
  rows.push(
    { label: 'Serpent Sting uptime', value: pctOf((k['uptime:target:serpentSting'] ?? 0) / time), good: (k['uptime:target:serpentSting'] ?? 0) / time >= 0.85 },
  );
  if (T(c).deadlyAspects) rows.push({ label: 'Quick Shots uptime', value: pctOf((k['uptime:quickShots'] ?? 0) / time) });
  manaRows(c, rows);
  return rows;
}

export const hunterMm: Spec = specFor('mm', {
  id: 'hunter-mm',
  // 4: melee weaving defaults to the Classic rule (the beta reset is reported as a bug).
  prefsRevision: 4,
  specName: 'Marksmanship',
  stats: RANGED_STATS,
  startDistance: 12,
  defaultOptions: { build: 'mm', ...gearOptions('hunter-ranged'), lockMana: false, classicAutoShot: false, trackable: true, petSpeed: '1.2', petMode: 'assist', meleeWeaving: false, autoShotReset: 'classic' },
  options: [...OPTIONS, PET_OPTION, PET_MODE, ...WEAVE_OPTIONS],
  sheet: { attackPower: 'Melee attack power', spellCrit: false, offHand: false },
  lowMana: (c) => c.cost(c.ability('aimedShot')!),
  welcome: 'Welcome to Marksmanship practice. You start 12 yards from the dummy: keep Auto Shot firing (stand still during its windup), Serpent Sting up, then Arcane Shot, Aimed Shot and Sniper Shot, in that order. The build is Lone Wolf: no pet, +20% damage.',
  help: `${CONTROLS}
    ${PET_HELP}
    ${HELP_COMMON}
    Marksmanship: Lone Wolf gives +20% damage without a pet; Mortal Shots makes ranged crits 2.3x; Sniper Shot is a 4 sec cast for a big hit. The yellow glow follows the WoW Forever sims: Serpent Sting, Aimed Shot, Sniper Shot when Aimed has 3.5+ sec left, Arcane Shot above 15% mana. Multi-Shot shares Aimed's cooldown, so on one target it is a loss.
    With the Classic rule on, start a cast right after a shot leaves: the glow waits until the cast fits before the next windup.
    ${WEAVE_HELP}
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x3d5a2a, leatherColor: 0x5a4630, hood: true },
  suggest: (c) => weaveSuggest(c, mmSuggest),
  cue: (c) => weaveCue(c, mmSuggest),
  rings: weaveRings,
  review: rangedReview,
});

// --------------------------------------------------------- Beast Mastery
/** WoWSims Forever's Beast Mastery lists: hawk, hawk, Arcane Shot on their shared cooldown. */
function bmSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, mana, potion } = ctx(c);
  if (!c.aura(p, 'aspectOfTheHawk')) return 'aspectOfTheHawk';
  if (!c.aura(t, 'huntersMark')) return 'huntersMark';
  if (!c.autoShooting && c.inRangedRange(t)) return 'autoShot';
  if (p.inCombat && tl.bestialWrath && ready('bestialWrath')) return 'bestialWrath';
  if (p.inCombat && ready('rapidFire')) return 'rapidFire';
  if (p.inCombat && tl.intimidation && ready('intimidation') && mana > 0.5) return 'intimidation';
  if (!c.aura(t, 'serpentSting') && afford('serpentSting')) return 'serpentSting';
  // WoWSims Forever's Beast Mastery list dropped the hawks with the November shot buffs; BM Weave keeps them.
  const hawkNext = tl.summonHawk && c.options.build !== 'bm' && (c.counters.hawksInARow ?? 0) < 2;
  if (hawkNext && ready('summonHawk') && afford('summonHawk')) return 'summonHawk';
  if (!hawkNext && ready('arcaneShot') && afford('arcaneShot')) return 'arcaneShot';
  if (weaveAdvised(c)) {
    if (ready('multiShot') && afford('multiShot')) return 'multiShot';
  } else if (ready('aimedShot') && afford('aimedShot') && castFits(c, 'aimedShot')) return 'aimedShot';
  if (potion) return 'manaPotion';
  return null;
}

function bmReview(c: Combat): Row[] {
  const rows = rangedReview(c);
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return rows;
  const pet = ['petMelee', 'petClaw', 'petBite'].reduce((a, id) => a + (c.meter.rows.get(id)?.total ?? 0), 0);
  const hawks = ['hawk', 'hawkDive'].reduce((a, id) => a + (c.meter.rows.get(id)?.total ?? 0), 0);
  rows.splice(2, 0,
    { label: 'Pet and hawk share of your damage', value: c.meter.total ? `${pctOf(pet / c.meter.total)} + ${pctOf(hawks / c.meter.total)}` : '-' },
  );
  if (T(c).summonHawk) rows.splice(3, 0, { label: 'Hawks summoned', value: String(k.hawks ?? 0) });
  return rows;
}

export const hunterBm: Spec = specFor('bm', {
  id: 'hunter-bm',
  // 4: melee weaving defaults to the Classic rule (the beta reset is reported as a bug).
  prefsRevision: 4,
  specName: 'Beast Mastery',
  stats: RANGED_STATS,
  startDistance: 12,
  defaultOptions: { build: 'bm', ...gearOptions('hunter-ranged'), lockMana: false, classicAutoShot: false, trackable: true, petSpeed: '1.2', petMode: 'assist', meleeWeaving: false, autoShotReset: 'classic' },
  options: [...OPTIONS, PET_OPTION, PET_MODE, ...WEAVE_OPTIONS],
  sheet: { attackPower: 'Melee attack power', spellCrit: false, offHand: false },
  lowMana: (c) => c.cost(c.ability('aimedShot')!),
  welcome: 'Welcome to Beast Mastery practice. Your cat fights at the dummy while you shoot from 12 yards: Serpent Sting up, then hawk, hawk, Arcane Shot on their shared cooldown, Bestial Wrath and Rapid Fire together, and Aimed Shot when that waits.',
  help: `${CONTROLS}
    ${PET_HELP}
    ${HELP_COMMON}
    Beast Mastery: your pet attacks when you do (one swing timer, Focus at 10 per second for Bite and Claw). Summon Hawk sends up to two hawks for 18 sec each and shares its cooldown with Arcane Shot. Bestial Wrath gives the pet +50% damage; Intimidation makes its next attack crit; Frenzy speeds it up after its crits.
    ${WEAVE_HELP}
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x5a3a20, leatherColor: 0x4a3a28, hood: true },
  suggest: (c) => weaveSuggest(c, bmSuggest),
  cue: (c) => weaveCue(c, bmSuggest),
  rings: weaveRings,
  review: bmReview,
});

// -------------------------------------------------------------- Survival
/** WoWSims Forever's melee Survival list, with Serpent Sting and shots on the way in. */
function svSuggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const tl = T(c);
  const { p, ready, afford, potion } = ctx(c);
  if (!c.aura(p, 'aspectOfTheBeast')) return 'aspectOfTheBeast';
  if (!c.aura(t, 'huntersMark')) return 'huntersMark';
  if (!c.inRange(t)) {
    if (!c.inRangedRange(t)) return null;
    if (!c.aura(t, 'serpentSting') && afford('serpentSting')) return 'serpentSting';
    if (ready('arcaneShot') && afford('arcaneShot')) return 'arcaneShot';
    return ready('multiShot') && afford('multiShot') ? 'multiShot' : null;
  }
  if (!p.autoAttacking) return 'attack';
  if (p.inCombat && ready('rapidFire')) return 'rapidFire';
  if (ready('raptorStrike') && c.queuedSwing !== 'raptorStrike' && afford('raptorStrike')) return 'raptorStrike';
  if (ready('mongooseBite') && afford('mongooseBite')) return 'mongooseBite';
  if (tl.striderKick && ready('striderKick') && afford('striderKick')) return 'striderKick';
  if (!c.aura(t, 'immolationTrap') && ready('immolationTrap') && afford('immolationTrap')) return 'immolationTrap';
  if (tl.summonHawk && ready('summonHawk') && afford('summonHawk')) return 'summonHawk';
  if (ready('wingClip') && afford('wingClip')) return 'wingClip';
  if (potion) return 'manaPotion';
  return null;
}

function svReview(c: Combat): Row[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const tl = T(c);
  const rows: Row[] = [
    { label: 'Raptor Strike on cooldown', value: pctOf(onCooldown(c, 'raptorStrike', D.raptorStrike.cooldown)), good: onCooldown(c, 'raptorStrike', D.raptorStrike.cooldown) >= 0.85 },
  ];
  if (tl.striderKick) rows.push({ label: 'Strider Kick on cooldown', value: pctOf(onCooldown(c, 'striderKick', D.striderKick.cooldown)), good: onCooldown(c, 'striderKick', D.striderKick.cooldown) >= 0.8 });
  if (tl.exposePrey) rows.push({ label: 'Mongoose Bites / Expose Prey windows', value: `${k.mongoose ?? 0} / ${k.exposePrey ?? 0}` });
  rows.push(
    { label: "Hunter's Mark uptime", value: pctOf((k['uptime:target:huntersMark'] ?? 0) / time), good: (k['uptime:target:huntersMark'] ?? 0) / time >= 0.95 },
    { label: 'Immolation Trap uptime', value: pctOf((k['uptime:target:immolationTrap'] ?? 0) / time) },
  );
  manaRows(c, rows);
  return rows;
}

export const hunterSv: Spec = specFor('sv', {
  id: 'hunter-sv',
  // 2: the pet bar (Attack, Follow, Stay) joined the default action bar.
  prefsRevision: 2,
  specName: 'Survival',
  stats: MELEE_STATS,
  defaultOptions: { build: 'sv-pet', ...gearOptions('hunter-melee'), lockMana: false, classicAutoShot: false, trackable: true, petSpeed: '1.2', petMode: 'assist' },
  options: [...OPTIONS.filter((o) => o.key !== 'classicAutoShot'), PET_OPTION, PET_MODE],
  sheet: { attackPower: 'Melee attack power', spellCrit: false },
  lowMana: (c) => c.cost(c.ability('raptorStrike')!),
  welcome: 'Welcome to Survival practice. In WoW Forever Survival is a melee spec: dual wield, Aspect of the Beast, Raptor Strike on cooldown, Mongoose Bite when Expose Prey lights it on your marked target, Strider Kick, and Immolation Trap at your feet.',
  help: `${CONTROLS}
    ${PET_HELP}
    Survival fights in melee: two one-handers (Predator's Edge makes the off hand hit harder), Aspect of the Beast for melee attack power. Raptor Strike replaces your next swing (off the global cooldown); Strider Kick is a weapon kick on an 8 sec cooldown; Mongoose Bite lights up after a dodge or, with Expose Prey, after landed hits on the target you marked yourself; Lacerating Strikes makes it bleed.
    The rings on the ground mark melee range and Auto Shot's minimum range: step out past the green one and Auto Shot fires between your swings.
    Immolation Trap is placed at your feet and usable in combat in WoW Forever. Wing Clip is the filler when you have mana to spare. Mana is your resource: Judgement of Wisdom gives a lot back to a melee hunter.
    This is a practice tool: hit, crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x4a5a3a, leatherColor: 0x3a3022, hood: true },
  suggest: svSuggest,
  rings: weaveRings,
  review: svReview,
});
