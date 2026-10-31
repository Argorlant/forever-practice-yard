// Headless check of the combat engine: plays the suggested rotation against
// one dummy for 5 minutes, several times, and prints DPS and a breakdown.
// Usage: npm test
import { Combat } from '../src/engine/combat';
import type { Spec, Unit } from '../src/engine/types';
import { druidBalance, druidBear, druidCat } from '../src/specs/druid';
import { hunterBm, hunterMm, hunterSv } from '../src/specs/hunter';
import { mageArcane, mageFire, mageFrost } from '../src/specs/mage';
import { paladinProt, paladinRet, paladinShock } from '../src/specs/paladin';
import { priestShadow, priestSmite } from '../src/specs/priest';
import { rogue } from '../src/specs/rogue';
import { shamanElemental, shamanEnhancement, shamanTank } from '../src/specs/shaman';
import { warlockAffliction, warlockDemonology, warlockDestruction } from '../src/specs/warlock';
import { warrior } from '../src/specs/warrior';
import { SPECS } from '../src/specs';
import { classKey, decode, pointsPerTree, treesOf } from '../src/ui/talents-data';
import {
  canAdd, canRemove, decodeOrder, defaultOrder, encode, encodeOrder, isValid, levelFor, parseTalents, pointsOf, repairOrder,
} from '../src/ui/talent-rules';
import { animKey } from '../src/scene/custom-model';
import { CRACKS, OnyxiaFight, ROOM } from '../src/encounters/onyxia';
import * as druidTalents from '../src/specs/druid/talents';
import * as hunterTalents from '../src/specs/hunter/talents';
import * as mageTalents from '../src/specs/mage/talents';
import * as paladinTalents from '../src/specs/paladin/talents';
import * as priestTalents from '../src/specs/priest/talents';
import * as rogueTalents from '../src/specs/rogue/talents';
import * as shamanTalents from '../src/specs/shaman/talents';
import * as warlockTalents from '../src/specs/warlock/talents';
import * as warriorTalents from '../src/specs/warrior/talents';

function run(spec: Spec, seconds: number, seed: number, stats = spec.stats, options: Record<string, number | boolean | string> = {}) {
  let s = seed;
  const c = new Combat(spec, options);
  c.stats = structuredClone(stats);
  c.random = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const dummy: Unit = {
    id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731,
    auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5,
  };
  c.targets = [dummy];
  c.target = dummy;
  c.player.x = 0; c.player.z = -2; c.player.facing = 0;
  c.reset();
  let sndUp = 0, energyWasted = 0, hasteTime = 0;
  const swings = { main: 0, off: 0 };
  const used: Record<string, number> = {};
  c.on('swing', ({ hand }) => swings[hand]++);
  c.on('ability', ({ id }) => { used[id] = (used[id] ?? 0) + 1; });
  const dt = 0.05;
  for (let t = 0; t < seconds; t += dt) {
    // A player who presses the glow when the cast ends (pressing during a cast would queue a stale choice).
    const id = c.casting ? null : spec.suggest?.(c);
    if (id) c.use(id);
    const before = c.player.resource;
    c.update(dt);
    hasteTime += c.haste() * dt;
    if (before + 1e-9 >= c.player.maxResource && c.player.resource >= c.player.maxResource) energyWasted += dt;
    if (c.aura(c.player, 'sliceAndDice')) sndUp += dt;
  }
  // Swings the weapon speeds allow; extra attacks may add a few more.
  const expected = { main: hasteTime / c.stats.mainHand.speed, off: c.stats.offHand ? hasteTime / c.stats.offHand.speed : 0 };
  return { c, dps: c.dps(), sndUptime: sndUp / seconds, cappedTime: energyWasted, swings, expected, used };
}

const spec = rogue;
const runs = [1, 2, 3, 4, 5].map((seed) => run(spec, 300, seed * 7919));
const dps = runs.map((r) => r.dps);
const mean = dps.reduce((a, b) => a + b, 0) / dps.length;
console.log(`${spec.className} ${spec.specName}: ${mean.toFixed(1)} DPS (runs: ${dps.map((d) => d.toFixed(0)).join(', ')})`);
console.log(`Slice and Dice uptime ${(runs[0].sndUptime * 100).toFixed(1)}%, time at full energy ${runs[0].cappedTime.toFixed(1)} s`);
const m = runs[0].c.meter;
for (const row of [...m.rows.values()].sort((a, b) => b.total - a.total)) {
  const attempts = row.hits + row.misses;
  console.log(`  ${row.name.padEnd(26)} ${String(Math.round(row.total)).padStart(8)}  ${((row.total / m.total) * 100).toFixed(1).padStart(5)}%  ` +
    `n=${attempts}  crit ${(row.hits ? (row.crits / row.hits) * 100 : 0).toFixed(1)}%  miss/dodge ${(attempts ? (row.misses / attempts) * 100 : 0).toFixed(1)}%` +
    (row.glances ? `  glance ${((row.glances / attempts) * 100).toFixed(1)}%` : ''));
}
console.log('Rotation review:');
for (const r of spec.review?.(runs[0].c) ?? []) console.log(`  ${r.label.padEnd(30)} ${r.value}`);
for (const preset of spec.presets ?? []) {
  const r = [1, 2, 3].map((seed) => run(spec, 300, seed * 104729, preset.stats).dps);
  console.log(`Preset "${preset.name}": ${(r.reduce((a, b) => a + b, 0) / r.length).toFixed(1)} DPS`);
}

const failures: string[] = [];
const currentSealOf = (c: Combat) => ['sealOfRighteousness', 'sealOfCommand', 'sealOfFury'].find((s) => c.aura(c.player, s)) ?? null;

// Every talent build plays its own priority list without errors.
console.log('Builds (5 min, own gear, priority list):');
const MUST_USE: Record<string, string[]> = {
  combat: ['sinisterStrike', 'eviscerate', 'sliceAndDice', 'bladeFlurry', 'adrenalineRush'],
  combatIea: ['sinisterStrike', 'exposeArmor', 'eviscerate'],
  backstab: ['backstab', 'eviscerate', 'sliceAndDice'],
  mutilate: ['mutilate', 'eviscerate', 'sliceAndDice'],
  hemorrhage: ['hemorrhage', 'rupture', 'vanish', 'premeditation', 'ambush', 'ghostlyStrike'],
};
for (const b of spec.builds ?? []) {
  const options = { ...(spec.defaultOptions ?? {}), build: b.id, ...(b.options ?? {}) };
  const r = run(spec, 300, 4242, b.stats, options);
  const rotation = (b.id.startsWith('combat-iea') ? 'combatIea' : b.id.startsWith('combat-backstab') ? 'backstab'
    : b.id.startsWith('combat') ? 'combat' : b.id.startsWith('mutilate') ? 'mutilate' : 'hemorrhage');
  const missing = MUST_USE[rotation].filter((id) => !r.used[id]);
  const review = (spec.review?.(r.c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
  console.log(`  ${b.label.padEnd(48)} ${r.dps.toFixed(0).padStart(4)} DPS  ${review}`);
  if (missing.length) failures.push(`${b.label} never used ${missing.join(', ')}`);
  if (!(r.dps > 100)) failures.push(`${b.label}: ${r.dps.toFixed(0)} DPS`);
}

// Expose Armor duty: the priority list keeps it up.
{
  const r = run(spec, 300, 99, spec.stats, { ...(spec.defaultOptions ?? {}), exposeArmorDuty: true });
  const k = r.c.counters;
  const up = (k['uptime:target:exposeArmor'] ?? 0) / (k.combatTime ?? 1);
  console.log(`Expose Armor duty with the default build: ${Math.round(up * 100)}% uptime, ${r.dps.toFixed(0)} DPS`);
  if (up < 0.8) failures.push(`Expose Armor uptime on duty only ${Math.round(up * 100)}%`);
}
if (!(mean > 100 && mean < 5000)) failures.push(`DPS ${mean.toFixed(0)} out of the plausible range`);
// The practice counters must agree with what the run measured directly.
{
  const k = runs[0].c.counters;
  const uptime = (k['uptime:sliceAndDice'] ?? 0) / (k.combatTime ?? 1);
  if (Math.abs(uptime - runs[0].sndUptime) > 0.03) failures.push(`Slice and Dice uptime counter ${uptime.toFixed(3)} vs measured ${runs[0].sndUptime.toFixed(3)}`);
  if (!(k.hackAndSlash > 0)) failures.push('no Hack and Slash procs in 5 minutes with a sword');
}
for (const r of runs) {
  if (r.swings.main < r.expected.main * 0.97 || r.swings.main > r.expected.main * 1.15) {
    failures.push(`main-hand swings ${r.swings.main}, expected about ${r.expected.main.toFixed(0)}`);
  }
  if (Math.abs(r.swings.off - r.expected.off) > r.expected.off * 0.03 + 1) {
    failures.push(`off-hand swings ${r.swings.off}, expected about ${r.expected.off.toFixed(0)}`);
  }
}

// Energy regenerates smoothly at 10 per second (WoW Forever), not in ticks.
{
  const c = new Combat(spec);
  c.player.resource = 0;
  c.update(0.35);
  if (Math.abs(c.player.resource - 3.5) > 1e-6) failures.push(`energy after 0.35 s is ${c.player.resource}, expected 3.5`);
  c.applyAura(c.player, { id: 'rush', name: 'Rush', icon: 'adrenalineRush', duration: 1, regen: 2 });
  c.update(2);
  if (Math.abs(c.player.resource - (3.5 + 20 + 10)) > 1e-6) failures.push(`energy with a 1 s doubling aura is ${c.player.resource}, expected 33.5`);
}

// Warrior: every build plays its own priority list for 5 minutes.
console.log('Warrior builds (5 min, own gear, priority list):');
const WARRIOR_MUST_USE: Record<string, string[]> = {
  'fury-dw': ['bloodthirst', 'whirlwind', 'heroicStrike', 'battleShout'],
  'fury-sunder': ['bloodthirst', 'sunderArmor'],
  'arms-2h': ['mortalStrike', 'overpower', 'rend', 'slam'],
  'fury-2h': ['bloodthirst', 'whirlwind'],
  prot: ['shieldSlam', 'revenge', 'shieldBlock', 'sunderArmor', 'thunderClap'],
  'prot-deep': ['shieldSlam', 'revenge', 'shieldBlock'],
};
for (const b of warrior.builds ?? []) {
  let s = 4242;
  const c = new Combat(warrior, { ...(warrior.defaultOptions ?? {}), build: b.id, ...(b.options ?? {}) });
  c.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  c.stats = structuredClone(b.stats);
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: Math.PI, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  // Tanks stand in front of the dummy; damage dealers behind it.
  c.player.x = 0; c.player.z = 2; c.player.facing = Math.PI;
  if (!b.tank) { dummy.facing = 0; c.player.z = -2; c.player.facing = 0; }
  c.reset();
  if (b.tank) c.enemyAttacks = { ...c.enemyAttacks, on: true };
  const used: Record<string, number> = {};
  c.on('ability', ({ id }) => { used[id] = (used[id] ?? 0) + 1; });
  let rage = 0;
  for (let t = 0; t < 300; t += 0.05) {
    const id = warrior.suggest?.(c);
    if (id) c.use(id);
    c.update(0.05);
    rage += c.player.resource * 0.05;
  }
  const missing = (WARRIOR_MUST_USE[b.id] ?? []).filter((id) => !used[id]);
  const review = (warrior.review?.(c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
  console.log(`  ${b.label.padEnd(58)} ${c.dps().toFixed(0).padStart(4)} DPS ${c.tps().toFixed(0).padStart(4)} TPS  avg rage ${(rage / 300).toFixed(0)}  ${review}`);
  if (missing.length) failures.push(`${b.label} never used ${missing.join(', ')}`);
  if (!(c.dps() > 100)) failures.push(`${b.label}: ${c.dps().toFixed(0)} DPS`);
}
// Execute phase: a Fury warrior at 15 % health executes.
{
  const c = new Combat(warrior, { ...(warrior.defaultOptions ?? {}) });
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.player.z = -2;
  c.startHealth = 0.15;
  c.healthLocked = true;
  c.reset();
  const used: Record<string, number> = {};
  c.on('ability', ({ id }) => { used[id] = (used[id] ?? 0) + 1; });
  for (let t = 0; t < 60; t += 0.05) { const id = warrior.suggest?.(c); if (id) c.use(id); c.update(0.05); }
  console.log(`Execute phase (60 s): ${used.execute ?? 0} Executes, ${used.heroicStrike ?? 0} Heroic Strikes`);
  if (!(used.execute > 5)) failures.push('Fury did not Execute in the execute phase');
  if (used.heroicStrike) failures.push('Heroic Strike used in the execute phase');
}
// Normalized rage: a main-hand 2.4 sword gives 3.46 x 2.4 rage per landed white hit, x2 on a crit.
{
  const c = new Combat(warrior, { ...(warrior.defaultOptions ?? {}) });
  c.stats = structuredClone(warrior.stats);
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.reset();
  c.player.inCombat = true;
  const before = c.player.resource;
  c.deal({ target: dummy, source: 'melee_mh', outcome: 'hit', school: 'physical', amount: 100, white: true, hand: 'main', weaponStrike: true });
  const gain = c.player.resource - before;
  if (Math.abs(gain - 3.46 * 2.4) > 1.01) failures.push(`main-hand rage per hit ${gain.toFixed(2)}, expected ${(3.46 * 2.4).toFixed(2)} (+1 with Unbridled Wrath)`);
}

// The attacking dummy: swing rhythm, avoidance table and locked health.
{
  let s = 777;
  const c = new Combat(spec);
  c.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  c.stats.tank = { health: 9000, armor: 8000, defense: 440, dodge: 10, parry: 10, block: 20, blockValue: 150 };
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: Math.PI, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  // Face the dummy from its front, so parry and block apply.
  c.player.x = 0; c.player.z = 2; c.player.facing = Math.PI;
  c.reset();
  c.enemyAttacks = { ...c.enemyAttacks, on: true, speed: 2, damage: 3000 };
  const seen: Record<string, number> = {};
  c.on('incoming', (i) => { seen[i.outcome] = (seen[i.outcome] ?? 0) + 1; });
  for (let t = 0; t < 600; t += 0.05) c.update(0.05);
  const n = Object.values(seen).reduce((a, b) => a + b, 0);
  const pct = (k: string) => ((seen[k] ?? 0) / n) * 100;
  console.log(`Attacking dummy: ${n} swings in 10 min; ` + Object.keys(seen).map((k) => `${k} ${pct(k).toFixed(1)}%`).join(', '));
  if (Math.abs(n - 300) > 3) failures.push(`attacking dummy swung ${n} times in 10 min at 2 s, expected 300`);
  if (Math.abs(pct('block') - 19.4) > 5) failures.push(`block ${pct('block').toFixed(1)}%, expected about 19.4%`);
  if ((seen.crit ?? 0) > 0) failures.push('a defense-capped tank (440) took crits');
  if (c.player.health !== c.player.maxHealth) failures.push('locked health dropped');
}

// ------------------------------------------------------------------ druid
/** Plays a spec's priority list; tanks stand in front of an attacking dummy, the others behind it. */
function play(sp: Spec, opts: { build?: string; seconds?: number; seed?: number; raid?: string[]; options?: Record<string, number | boolean | string>; distance?: number } = {}) {
  let s = opts.seed ?? 4242;
  const b = sp.builds?.find((x) => x.id === opts.build);
  const c = new Combat(sp, { ...(sp.defaultOptions ?? {}), ...(opts.build ? { build: opts.build } : {}), ...(b?.options ?? {}), ...(opts.options ?? {}) });
  c.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  c.stats = structuredClone(b?.stats ?? sp.stats);
  c.raid = new Set(opts.raid ?? sp.defaultRaid ?? []);
  const tank = b?.tank ?? !!sp.tank;
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: tank ? Math.PI : 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.player.x = 0; c.player.z = tank ? 2 : opts.distance ? -opts.distance * 0.9144 : sp.startDistance ? -sp.startDistance * 0.9144 : -2; c.player.facing = tank ? Math.PI : 0;
  // As in Settings: specs that show health play with it unlocked.
  c.playerHealthLocked = !sp.showHealth;
  c.reset();
  if (tank) c.enemyAttacks = { ...c.enemyAttacks, on: true, damage: sp.tankDamage ?? 3000 };
  const used: Record<string, number> = {};
  c.on('ability', ({ id }) => { used[id] = (used[id] ?? 0) + 1; });
  const seconds = opts.seconds ?? 300;
  for (let t = 0; t < seconds; t += 0.05) {
    // A player who presses the glow when the cast ends (pressing during a cast would queue a stale choice).
    const id = c.casting ? null : sp.suggest?.(c);
    if (id) c.use(id);
    c.update(0.05);
  }
  return { c, used, dummy };
}

console.log('Druid builds (5 min, own gear, priority list, default raid buffs):');
const DRUID_MUST_USE: Record<string, string[]> = {
  cat: ['prowl', 'ravage', 'shred', 'rip', 'ferociousBite', 'shiftingPower', 'berserk', 'faerieFire'],
  'cat-feral': ['shred', 'rip', 'ferociousBite', 'shiftingPower', 'berserk'],
  bear: ['primalBite', 'lacerate', 'maul', 'demoralizingRoar', 'faerieFire', 'druidEnrage', 'barkskin', 'berserk'],
  moonkin: ['wrath', 'starfire', 'moonfire', 'insectSwarm'],
  balance: ['wrath', 'starfire', 'moonfire', 'insectSwarm'],
};
for (const sp of [druidCat, druidBear, druidBalance]) {
  for (const b of sp.builds ?? []) {
    const r = play(sp, { build: b.id });
    const missing = (DRUID_MUST_USE[b.id] ?? []).filter((id) => !r.used[id]);
    const review = (sp.review?.(r.c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
    console.log(`  ${b.label.padEnd(58)} ${r.c.dps().toFixed(0).padStart(4)} DPS${sp.tank || r.c.enemyAttacks.on ? ` ${r.c.tps().toFixed(0).padStart(4)} TPS` : ''}  ${review}`);
    if (missing.length) failures.push(`${b.label} never used ${missing.join(', ')}`);
    if (!(r.c.dps() > 100)) failures.push(`${b.label}: ${r.c.dps().toFixed(0)} DPS`);
  }
}
// The cat with real mana: Shifting Power stops when the mana runs out; Judgement of Wisdom gives some back.
{
  const r = play(druidCat, { build: 'cat', options: { lockMana: false } });
  const k = r.c.counters;
  if (!r.c.player.auras.has('blessingOfWisdom') || !r.c.player.auras.has('manaSpring')) failures.push('the cat starts without Blessing of Wisdom or Mana Spring Totem');
  console.log(`Cat with mana (3,000, Judgement of Wisdom, Blessing of Wisdom, Mana Spring): ${k.shiftingPower ?? 0} Shifting Powers, ${Math.round(k.manaOnHit ?? 0)} mana from Judgement, ${Math.round(k.potionMana ?? 0)} from potions`);
  if (!(k.manaOnHit > 1000)) failures.push('Judgement of Wisdom gave the cat almost no mana');
  if (r.c.player.mana < 0) failures.push(`cat mana went negative: ${r.c.player.mana}`);
  const locked = play(druidCat, { build: 'cat', options: { lockMana: true } });
  // Since Oct 27 Shifting Power waits for 50 energy, so mana may no longer be what limits it.
  if ((locked.c.counters.shiftingPower ?? 0) < (k.shiftingPower ?? 0)) failures.push('locked mana allowed fewer Shifting Powers');
  const omenPerMin = ((k.clearcasting ?? 0) / ((k.combatTime ?? 1) / 60));
  if (omenPerMin < 0.8 || omenPerMin > 3) failures.push(`cat Clearcasting ${omenPerMin.toFixed(2)} per minute, expected under 2 (10 s cooldown)`);
}
// Bear rage: 11.25 per landed white swing, 22.5 on a crit, nothing from a dodge.
{
  const c = new Combat(druidBear, { ...(druidBear.defaultOptions ?? {}) });
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.reset();
  c.random = () => 0.99;
  const hit = (outcome: 'hit' | 'crit' | 'dodge') => {
    const before = c.player.resource;
    c.deal({ target: dummy, source: 'melee_mh', outcome, school: 'physical', amount: outcome === 'dodge' ? 0 : 100, white: true, hand: 'main', weaponStrike: true });
    return c.player.resource - before;
  };
  const [h, cr, d] = [hit('hit'), hit('crit'), hit('dodge')];
  // The bear build has Blood Frenzy 2/2: every crit also gives 5 rage.
  if (Math.abs(h - 11.245) > 0.01 || Math.abs(cr - (22.49 + 5)) > 0.02 || d !== 0) failures.push(`bear rage per swing ${h.toFixed(2)} / crit ${cr.toFixed(2)} / dodge ${d}, expected 11.25 / 27.5 (22.5 + Blood Frenzy) / 0`);
}
// Rage from hits taken: unmitigated damage (crit x2, crushing x1.5, armor and Barkskin ignored); a dodge gives none.
{
  let s = 31337;
  const c = new Combat(druidBear, { ...(druidBear.defaultOptions ?? {}) });
  c.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  c.stats = structuredClone(druidBear.stats);
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: Math.PI, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.player.z = 2; c.player.facing = Math.PI;
  c.reset();
  c.enemyAttacks = { ...c.enemyAttacks, on: true };
  c.applyAura(c.player, { id: 'barkskin', name: 'Barkskin', icon: 'barkskin', duration: Infinity, damageTaken: 0.8 });
  const bad: string[] = [];
  let crit = 0, crush = 0, hit = 0, nCrit = 0, nCrush = 0, nHit = 0;
  c.on('incoming', (i) => {
    if (i.outcome === 'dodge' || i.outcome === 'miss') { if (i.raw !== 0) bad.push(`a ${i.outcome} would give rage (raw ${i.raw})`); return; }
    if (i.amount >= i.raw) bad.push(`${i.outcome}: rage from ${i.raw}, but the damage after armor is ${i.amount}`);
    if (i.outcome === 'crit') { crit += i.raw; nCrit++; }
    if (i.outcome === 'crush') { crush += i.raw; nCrush++; }
    if (i.outcome === 'hit') { hit += i.raw; nHit++; }
  });
  // Rage from a dodge: only Natural Reaction's 5.
  let dodgeRage = 0;
  c.onIncoming.push((i) => { if (i.outcome === 'dodge') dodgeRage = Math.max(dodgeRage, c.player.resource); });
  for (let t = 0; t < 600; t += 0.05) { c.player.resource = 0; c.update(0.05); }
  if (dodgeRage > 5 + 1e-9) bad.push(`a dodge gave ${dodgeRage} rage, expected Natural Reaction's 5 at most`);
  const ratio = (a: number, n: number) => a / Math.max(1, n) / (hit / Math.max(1, nHit));
  console.log(`Hits taken (raw, for rage): crit x${ratio(crit, nCrit).toFixed(2)}, crushing x${ratio(crush, nCrush).toFixed(2)} a normal hit; ${bad.length} problems`);
  if (bad.length) failures.push(...bad.slice(0, 3));
  if (Math.abs(ratio(crit, nCrit) - 2) > 0.15 || Math.abs(ratio(crush, nCrush) - 1.5) > 0.12) failures.push('crit or crushing rage is not x2 / x1.5 of a normal hit');
}
// Balance: Wrath 1.5 s, Starfire 3.0 s and 2.5 s with an Eclipse charge; most Starfires use one.
{
  const r = play(druidBalance, { build: 'moonkin', seconds: 120 });
  const c = r.c;
  c.removeAura(c.player, 'naturesGrace');
  c.removeAura(c.player, 'eclipse');
  const wrath = c.ability('wrath')!.castTime as (cc: Combat) => number;
  const starfire = c.ability('starfire')!.castTime as (cc: Combat) => number;
  const w = wrath(c), s0 = starfire(c);
  c.applyAura(c.player, { id: 'eclipse', name: 'Eclipse', icon: 'eclipse', duration: 15, stacks: 1 });
  const s1 = starfire(c);
  if (Math.abs(w - 1.5) > 1e-9 || Math.abs(s0 - 3) > 1e-9 || Math.abs(s1 - 2.5) > 1e-9) failures.push(`cast times Wrath ${w} / Starfire ${s0} / with Eclipse ${s1}, expected 1.5 / 3 / 2.5`);
  const k = c.counters;
  if (!((k.eclipseStarfires ?? 0) / (k.starfires ?? 1) > 0.8)) failures.push(`only ${k.eclipseStarfires} of ${k.starfires} Starfires used Eclipse`);
  if (c.player.autoAttacking) failures.push('a Balance druid started auto attacking');
  const real = play(druidBalance, { build: 'moonkin' });
  const locked = play(druidBalance, { build: 'moonkin', options: { lockMana: true } });
  const rk = real.c.counters;
  console.log(`Balance with real mana and the raid's mana buffs: ${real.c.dps().toFixed(0)} DPS (locked: ${locked.c.dps().toFixed(0)}), ${Math.round(rk.manaOnHit ?? 0)} mana from Judgement of Wisdom, ${Math.round(rk.lowMana ?? 0)} s without mana for Starfire, ${real.used.innervate ?? 0} Innervates, ${real.used.manaPotion ?? 0} potions`);
  if (real.c.manaLocked) failures.push('Balance mana is locked by default');
  if (!(rk.manaOnHit > 0)) failures.push('Judgement of Wisdom never procced from spells');
  if (!real.c.player.auras.has('blessingOfWisdom') || !real.c.player.auras.has('manaSpring')) failures.push('Balance starts without Blessing of Wisdom or Mana Spring Totem');
  if (!(real.used.innervate > 0 && real.used.manaPotion > 0)) failures.push('Balance never used Innervate or a mana potion');
}

// ---------------------------------------------------------------- paladin
console.log('Paladin builds (5 min, own gear, priority list, default raid buffs):');
const PALADIN_MUST_USE: Record<string, string[]> = {
  ret: ['sealOfCommand', 'sealOfRighteousness', 'judgement', 'holyStrike', 'consecration'],
  'ret-physical': ['sealOfCommand', 'sealOfRighteousness', 'judgement', 'holyStrike'],
  'ret-fs': ['sealOfCommand', 'judgement', 'holyStrike'],
  'ret-deep': ['sealOfCommand', 'judgement', 'holyStrike'],
  // Righteous Fury is on before the pull.
  prot: ['sealOfRighteousness', 'judgement', 'holyShield', 'consecration', 'holyStrike', 'swiftJudgement'],
  'prot-human': ['judgement', 'holyShield', 'consecration', 'holyStrike'],
  'prot-dwarf': ['judgement', 'holyShield', 'consecration', 'holyStrike'],
  'prot-fs': ['judgement', 'holyShield', 'holyStrike'],
  'prot-deep': ['judgement', 'holyShield', 'holyStrike'],
  shock: ['sealOfCommand', 'judgement', 'holyShock', 'divineFavor', 'holyStrike', 'lightsVigil'],
  'shock-ret': ['sealOfCommand', 'judgement', 'holyShock', 'holyStrike'],
};
for (const sp of [paladinRet, paladinProt, paladinShock]) {
  for (const b of sp.builds ?? []) {
    const r = play(sp, { build: b.id });
    const missing = (PALADIN_MUST_USE[b.id] ?? []).filter((id) => !r.used[id]);
    const review = (sp.review?.(r.c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
    console.log(`  ${b.label.padEnd(58)} ${r.c.dps().toFixed(0).padStart(4)} DPS${sp.tank || r.c.enemyAttacks.on ? ` ${r.c.tps().toFixed(0).padStart(4)} TPS` : ''}  ${review}`);
    if (missing.length) failures.push(`${b.label} never used ${missing.join(', ')}`);
    if (!(r.c.dps() > 100)) failures.push(`${b.label}: ${r.c.dps().toFixed(0)} DPS`);
    if (r.c.player.resource < -1e-6) failures.push(`${b.label}: mana went negative`);
  }
}
// Retribution: Seal of Command at 7 per minute (44 % of landed swings at 3.8 s, a bit less with its 1 s cooldown); twisting carries both seals.
{
  const r = play(paladinRet, { build: 'ret', options: { lockMana: true } });
  const k = r.c.counters;
  const perSwing = (k.sealOfCommandProcs ?? 0) / (k.whiteLanded ?? 1);
  const twisted = (k.twistedSwings ?? 0) / (k.whiteLanded ?? 1);
  console.log(`Ret with locked mana: ${r.c.dps().toFixed(0)} DPS, Seal of Command on ${(perSwing * 100).toFixed(1)}% of landed swings, ${(twisted * 100).toFixed(0)}% of swings carry both seals`);
  if (perSwing < 0.3 || perSwing > 0.56) failures.push(`Seal of Command on ${(perSwing * 100).toFixed(1)}% of landed swings, expected about 40%`);
  if (twisted < 0.5) failures.push(`only ${(twisted * 100).toFixed(0)}% of Ret swings carried both seals`);
  // Judgement keeps the seal in Forever.
  const c = r.c;
  c.clearCooldown('judgement');
  const before = currentSealOf(c);
  c.use('judgement');
  if (currentSealOf(c) !== before || !before) failures.push('Judgement used up the seal');
}
// Protection: Holy Shield adds 30 % block; Righteous Fury multiplies Holy threat by 1.6.
{
  const r = play(paladinProt, { build: 'prot' });
  const k = r.c.counters;
  const blockRate = (k.blocks ?? 0) / (k.incomingSwings ?? 1);
  console.log(`Prot: ${r.c.dps().toFixed(0)} DPS, ${r.c.tps().toFixed(0)} TPS, ${(blockRate * 100).toFixed(1)}% of swings blocked, ${k.reckoning ?? 0} Reckoning swings, ${Math.round(k.shieldSpecMana ?? 0)} mana from Shield Specialization`);
  // Sheet 7 % + Holy Shield 30 % (+ Redoubt 20 % part of the time), minus 0.6 % vs +3.
  if (blockRate < 0.33 || blockRate > 0.57) failures.push(`Prot blocked ${(blockRate * 100).toFixed(1)}% of swings, expected 36 to 56%`);
  if (!(k.reckoning > 0)) failures.push('no Reckoning extra swings');
  const c = new Combat(paladinProt, { ...(paladinProt.defaultOptions ?? {}) });
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.reset();
  c.clearMeter();
  c.deal({ target: dummy, source: 'holyStrike', outcome: 'hit', school: 'holy', amount: 1000, white: false });
  const holyThreat = c.meter.threat;
  c.clearMeter();
  c.deal({ target: dummy, source: 'melee_mh', outcome: 'hit', school: 'physical', amount: 1000, white: true, hand: 'main' });
  if (Math.abs(c.meter.threat - 1000) > 1e-6 || Math.abs(holyThreat - 1000 * 1.9 * 1.25) > 1e-6) failures.push(`Prot threat: Holy Strike ${holyThreat}, white ${c.meter.threat}; expected 2375 and 1000`);
}
// Shockadin: Holy Shock about every 10 s.
{
  const r = play(paladinShock, { build: 'shock', options: { lockMana: true } });
  const shocks = r.used.holyShock ?? 0;
  const vigils = r.c.counters.vigils ?? 0;
  const spent = r.c.counters.vigilShocks ?? 0;
  console.log(`Shockadin with locked mana: ${r.c.dps().toFixed(0)} DPS, ${shocks} Holy Shocks in 5 min, ${spent} of ${vigils} Light's Vigils spent`);
  if (shocks < 25) failures.push(`only ${shocks} Holy Shocks in 5 minutes`);
  // A Vigil'd Shock leaves Holy Shock ready, so each Vigil brings a second Shock right after it.
  if (vigils < 20 || spent < vigils - 1) failures.push(`Light's Vigil: ${spent} of ${vigils} spent`);
  if (shocks < 2 * spent - 1) failures.push(`Light's Vigil should double the Holy Shocks: ${shocks} with ${spent} Vigils`);
}

// ----------------------------------------------------------------- hunter
console.log('Hunter builds (5 min, own gear, priority list, default raid buffs):');
const HUNTER_MUST_USE: Record<string, string[]> = {
  mm: ['autoShot', 'aimedShot', 'serpentSting', 'arcaneShot', 'sniperShot', 'rapidFire', 'huntersMark'],
  'mm-fs': ['autoShot', 'aimedShot', 'serpentSting', 'sniperShot'],
  'mm-p1': ['autoShot', 'aimedShot', 'serpentSting'],
  'sv-ranged': ['autoShot', 'aimedShot', 'serpentSting'],
  bm: ['autoShot', 'aimedShot', 'serpentSting', 'summonHawk', 'bestialWrath', 'intimidation', 'rapidFire'],
  'bm-fs': ['autoShot', 'aimedShot', 'serpentSting', 'bestialWrath'],
  sv: ['attack', 'raptorStrike', 'mongooseBite', 'striderKick', 'immolationTrap', 'huntersMark'],
  'sv-pet': ['attack', 'raptorStrike', 'mongooseBite', 'striderKick', 'summonHawk'],
};
for (const sp of [hunterMm, hunterBm, hunterSv]) {
  for (const b of sp.builds ?? []) {
    const r = play(sp, { build: b.id });
    const missing = (HUNTER_MUST_USE[b.id] ?? []).filter((id) => !r.used[id]);
    const review = (sp.review?.(r.c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
    console.log(`  ${b.label.padEnd(58)} ${r.c.dps().toFixed(0).padStart(4)} DPS  ${review}`);
    if (missing.length) failures.push(`${b.label} never used ${missing.join(', ')}`);
    if (!(r.c.dps() > 100)) failures.push(`${b.label}: ${r.c.dps().toFixed(0)} DPS`);
    if (r.c.player.resource < -1e-6) failures.push(`${b.label}: mana went negative`);
  }
}
// Auto Shot: the cycle runs every speed / haste, standing still; casts do not stop it (Forever rule).
{
  const r = play(hunterMm, { build: 'mm', options: { lockMana: true } });
  const k = r.c.counters;
  const floor = 300 / (2.5 / 1.15);
  console.log(`MM with locked mana: ${r.c.dps().toFixed(0)} DPS, ${k.autoShots} Auto Shots (quiver alone: ${floor.toFixed(0)}), Quick Shots ${k.quickShots ?? 0}`);
  if ((k.autoShots ?? 0) < floor * 0.97) failures.push(`only ${k.autoShots} Auto Shots in 5 min, expected at least ${floor.toFixed(0)}`);
  // Classic rule: casts clip the windup.
  const classic = play(hunterMm, { build: 'mm', options: { lockMana: true, classicAutoShot: true } });
  console.log(`MM, Classic Auto Shot rule: ${classic.c.dps().toFixed(0)} DPS, ${classic.c.counters.autoShots} Auto Shots, ${classic.c.counters.autoShotsClipped ?? 0} clipped by casts`);
  // Since Oct 28 the list only starts Aimed Shot when it fits before the next windup, so check the rule itself:
  // under the Classic rule an Aimed Shot started in the windup clips the shot.
  const clip = play(hunterMm, { build: 'mm', options: { lockMana: true, classicAutoShot: true }, seconds: 0 });
  const cc = clip.c;
  cc.use('autoShot');
  for (let i = 0; i < 200 && !cc.windup; i++) cc.update(0.05);
  cc.use('aimedShot');
  for (let i = 0; i < 100 && cc.casting; i++) cc.update(0.05);
  if (!((cc.counters.autoShotsClipped ?? 0) > 0)) failures.push('under the Classic Auto Shot rule an Aimed Shot in the windup did not clip the shot');
}
// Moving during the windup cancels it; the dead zone stops Auto Shot.
{
  const c = new Combat(hunterMm, { ...(hunterMm.defaultOptions ?? {}) });
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.player.z = -12 * 0.9144;
  c.reset();
  c.startAutoShot();
  c.update(0.05);
  if (!c.windup) failures.push('Auto Shot did not start its windup at 12 yards');
  c.player.moving = true;
  c.update(0.05);
  if (c.windup || !(c.counters.autoShotsInterrupted > 0)) failures.push('moving did not cancel the Auto Shot windup');
  c.player.moving = false;
  c.player.z = -6 * 0.9144;
  for (let i = 0; i < 100; i++) c.update(0.05);
  if (c.counters.autoShots) failures.push(`Auto Shot fired from the dead zone (${c.counters.autoShots} shots at 6 yards)`);
  c.player.z = -12 * 0.9144;
  for (let i = 0; i < 60; i++) c.update(0.05);
  if (!(c.counters.autoShots > 0)) failures.push('Auto Shot did not resume after leaving the dead zone');
}
// The pet: Bite about every 10 s, Claw with spare Focus.
{
  const r = play(hunterBm, { build: 'bm', options: { lockMana: true } });
  const rows = r.c.meter.rows;
  const bites = (rows.get('petBite')?.hits ?? 0) + (rows.get('petBite')?.misses ?? 0);
  const claws = (rows.get('petClaw')?.hits ?? 0) + (rows.get('petClaw')?.misses ?? 0);
  const pet = ['petMelee', 'petClaw', 'petBite', 'hawk', 'hawkDive'].reduce((a, id) => a + (rows.get(id)?.total ?? 0), 0);
  console.log(`BM with locked mana: ${r.c.dps().toFixed(0)} DPS, pet and hawks ${((pet / r.c.meter.total) * 100).toFixed(0)}%, ${bites} Bites and ${claws} Claws in 5 min`);
  if (bites < 25 || bites > 31) failures.push(`pet used Bite ${bites} times in 5 min, expected about 29`);
  if (claws < 60) failures.push(`pet used Claw only ${claws} times in 5 min`);
}
// Melee weaving: a scripted hunter follows the cues (step in, Raptor Strike, step out) at running speed.
{
  const weaveRun = (weave: boolean, rule: string, build = 'mm') => {
    const r = play(hunterMm, { build, seconds: 0, options: { lockMana: true, meleeWeaving: weave, autoShotReset: rule } });
    const c = r.c;
    for (let t = 0; t < 180; t += 0.05) {
      const cue = hunterMm.cue?.(c)?.text;
      const dir = cue === 'Step in' ? 1 : cue === 'Step out' ? -1 : 0;
      c.player.moving = dir !== 0;
      c.player.z += dir * 7 * 0.9144 * 0.05;
      const id = hunterMm.suggest?.(c);
      if (id) c.use(id);
      c.update(0.05);
    }
    return c;
  };
  const still = weaveRun(false, 'beta');
  const line = (name: string, c: Combat) => {
    const k = c.counters;
    return `${name} ${c.dps().toFixed(0)} DPS (${k.weaveRaptor ?? 0} Raptor, ${k.weaveWhite ?? 0} white, Auto Shot lost ${((k.autoShotDelay ?? 0) + (k.autoShotHeld ?? 0)).toFixed(1)} s, dead zone ${(k.deadZone ?? 0).toFixed(1)} s)`;
  };
  const classic = weaveRun(true, 'classic');
  const beta = weaveRun(true, 'beta');
  console.log(`Melee weaving, MM Lone Wolf, 3 min, locked mana: no weaving ${still.dps().toFixed(0)} DPS | ${line('Classic rule', classic)} | ${line('beta rule', beta)}`);
  // The rotation keeps casting, so windows are rare (Aimed, Quick Shots and Rapid Fire close them), as the research expects.
  if (!((classic.counters.weaveRaptor ?? 0) >= 5)) failures.push('the weaving cues led to few Raptor Strikes under the Classic rule');
  if ((classic.counters.autoShotHeld ?? 0) > 2) failures.push(`Classic weaving held Auto Shot ${(classic.counters.autoShotHeld ?? 0).toFixed(1)} s`);
  if (!(beta.counters.autoShotResets > 0)) failures.push('the beta rule never reset Auto Shot');
  // foreversim's ranged build with Survival talents: no Quick Shots to close windows, Raptor crits 2.3x and costs 75% less.
  const svStill = weaveRun(false, 'classic', 'sv-ranged');
  const svWeave = weaveRun(true, 'classic', 'sv-ranged');
  console.log(`  Survival talents, ranged rotation (foreversim): no weaving ${svStill.dps().toFixed(0)} DPS | ${line('Classic rule', svWeave)}`);
}

// Pets as in WoW: they run to the target and hit only there; orders and modes decide when they go.
{
  const PET_SOURCES = ['petMelee', 'petClaw', 'petBite', 'lashOfPain', 'firebolt'];
  /** Plays a few seconds and returns when the owner and the pet first hit. */
  const watch = (sp: Spec, opts: Parameters<typeof play>[1], extra?: (c: Combat) => void) => {
    let owner = -1, pet = -1;
    const r = play(sp, { ...opts, seconds: 0 });
    r.c.on('damage', (h) => {
      if (PET_SOURCES.includes(h.source)) { if (pet < 0) pet = r.c.t; } else if (owner < 0) owner = r.c.t;
    });
    extra?.(r.c);
    for (let t = 0; t < (opts?.seconds ?? 20); t += 0.05) {
      const id = sp.suggest?.(r.c);
      if (id) r.c.use(id);
      r.c.update(0.05);
    }
    return { ...r, owner, pet };
  };
  const bm = watch(hunterBm, { build: 'bm', seconds: 20 });
  console.log(`Pet from 12 yards: you hit at ${bm.owner.toFixed(1)} s, the pet at ${bm.pet.toFixed(1)} s`);
  // It leaves on your first attack (t = 0) and needs about 1 s to run into melee range.
  if (!(bm.pet >= 0.9)) failures.push(`the pet hit at ${bm.pet.toFixed(2)} s, before it could run from 12 yards`);
  const passive = watch(hunterBm, { build: 'bm', seconds: 10, options: { petMode: 'passive' } });
  if (passive.pet >= 0) failures.push('a passive pet attacked without an order');
  const ordered = watch(hunterBm, { build: 'bm', seconds: 10, options: { petMode: 'passive' } }, (c) => c.use('petAttackOrder'));
  if (!(ordered.pet > 0)) failures.push('the Attack order did not send a passive pet');
  const defensive = watch(hunterBm, { build: 'bm', seconds: 10, options: { petMode: 'defensive' } });
  if (defensive.pet >= 0) failures.push('a defensive pet attacked a dummy that never hit you');
  const back = play(hunterBm, { build: 'bm', seconds: 10, options: { petMode: 'defensive' } });
  back.c.use('petAttackOrder');
  for (let t = 0; t < 4; t += 0.05) back.c.update(0.05);
  back.c.use('petFollowOrder');
  for (let t = 0; t < 4; t += 0.05) back.c.update(0.05);
  const home = Math.hypot(back.c.pet.x - back.c.player.x, back.c.pet.z - back.c.player.z);
  if (back.c.pet.attacking || home > 1.5) failures.push(`Follow did not bring the pet back (${home.toFixed(1)} m from you)`);
  // Assist: Follow sticks while Auto Shot keeps firing; your next shot sends the pet again.
  const assist = play(hunterBm, { build: 'bm', seconds: 0 });
  assist.c.use('autoShot');
  for (let t = 0; t < 4; t += 0.05) assist.c.update(0.05);
  assist.c.use('petFollowOrder');
  for (let t = 0; t < 4; t += 0.05) assist.c.update(0.05);
  if (assist.c.pet.order !== 'follow' || assist.c.pet.attacking) failures.push('Auto Shot alone sent the pet back after Follow');
  assist.c.use('arcaneShot');
  if (assist.c.pet.order !== 'attack') failures.push('an Arcane Shot did not send the assisting pet again');
  const far = watch(warlockDemonology, { build: 'pact', seconds: 20, options: { demon: 'imp' } }, (c) => { c.player.z = -40 * 0.9144; c.use('petAttackOrder'); });
  const impToDummy = Math.hypot(far.c.pet.x, far.c.pet.z) / 0.9144;
  console.log(`Imp sent from 40 yards: it casts from ${impToDummy.toFixed(0)} yards, first Firebolt at ${far.pet.toFixed(1)} s`);
  if (impToDummy > 30.5 || far.pet < 0) failures.push(`the Imp did not close to casting range (${impToDummy.toFixed(1)} yd)`);
}

// ----------------------------------------------------------------- priest
console.log('Priest builds (5 min, own gear, priority list, default raid buffs):');
const PRIEST_MUST_USE: Record<string, string[]> = {
  shadow: ['mindFlay', 'mindBlast', 'shadowWordPain', 'devouringPlague', 'shadowWordDeath', 'innerFocus'],
  'shadow-community': ['mindFlay', 'mindBlast', 'shadowWordPain', 'devouringPlague', 'shadowWordDeath'],
  'shadow-fs': ['mindFlay', 'mindBlast', 'shadowWordPain', 'shadowWordDeath'],
  smite: ['smite', 'holyFire', 'mindBlast', 'powerInfusion', 'innerFocus'],
  'smite-launch': ['smite', 'holyFire', 'mindBlast'],
  'smite-hybrid': ['smite', 'holyFire', 'mindBlast', 'shadowWordPain'],
};
for (const sp of [priestShadow, priestSmite]) {
  for (const b of sp.builds ?? []) {
    const r = play(sp, { build: b.id });
    const missing = (PRIEST_MUST_USE[b.id] ?? []).filter((id) => !r.used[id]);
    const review = (sp.review?.(r.c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
    console.log(`  ${b.label.padEnd(58)} ${r.c.dps().toFixed(0).padStart(4)} DPS  ${review}`);
    if (missing.length) failures.push(`${b.label} never used ${missing.join(', ')}`);
    if (!(r.c.dps() > 100)) failures.push(`${b.label}: ${r.c.dps().toFixed(0)} DPS`);
  }
}
// Mind Flay: three ticks over 3 s, one hit roll; Shadow Weaving reaches 5 stacks; Death hurts you.
{
  const r = play(priestShadow, { build: 'shadow', options: { lockMana: true } });
  const c = r.c;
  const flay = c.meter.rows.get('mindFlay')!;
  console.log(`Shadow with locked mana: ${c.dps().toFixed(0)} DPS, Mind Flay ${flay.hits} ticks (${flay.misses} resisted casts), ${c.counters['clipped:mindFlay'] ?? 0} clipped, Death backlash ${c.counters.deathBacklash ?? 0}`);
  if ((c.aura(c.target, 'shadowWeaving')?.stacks ?? 0) !== 5) failures.push('Shadow Weaving is not at 5 stacks after 5 minutes');
  if (!(c.counters.deathBacklash > 0)) failures.push('Shadow Word: Death never hurt the priest');
  if (c.player.health < 0) failures.push('priest health went negative');
}
{
  const r = play(priestSmite, { build: 'smite', options: { lockMana: true } });
  const k = r.c.counters;
  const hf = (k['uptime:target:holyFire'] ?? 0) / (k.combatTime ?? 1);
  console.log(`Smite with locked mana: ${r.c.dps().toFixed(0)} DPS, Holy Fire uptime ${Math.round(hf * 100)}%, ${(r.c.meter.rows.get('penance')?.hits ?? 0)} Penance bolts`);
  if (hf < 0.8) failures.push(`Holy Fire uptime ${Math.round(hf * 100)}%, expected 80%+ for Power in Light`);
}

// ------------------------------------------------------------------- mage
console.log('Mage builds (5 min, own gear, priority list, default raid buffs):');
const MAGE_MUST_USE: Record<string, string[]> = {
  arcane: ['arcaneBlast', 'arcaneWrath', 'arcaneMissiles', 'arcanePower', 'presenceOfMind'],
  'arcane-fire': ['arcaneBlast', 'arcaneWrath', 'arcaneMissiles'],
  'arcane-ms': ['arcaneBlast', 'arcaneWrath', 'arcaneMissiles'],
  'arcane-fs': ['arcaneBlast', 'arcaneWrath', 'arcaneMissiles'],
  fire: ['scorch', 'fireBlast', 'pyroblast', 'combustion'],
  'fire-fs': ['scorch', 'fireBlast', 'pyroblast', 'combustion'],
  'fire-ms': ['scorch', 'fireBlast', 'pyroblast'],
  'fire-frost': ['frostfireBolt', 'fireBlast', 'pyroblast'],
  frost: ['frostbolt', 'iceLance'],
  'arcane-frost': ['frostbolt', 'iceLance', 'arcaneMissiles', 'arcaneBlast'],
  'frost-ms': ['frostbolt', 'iceLance', 'arcaneMissiles'],
  'frost-p1': ['frostbolt'],
};
for (const sp of [mageArcane, mageFire, mageFrost]) {
  for (const b of sp.builds ?? []) {
    const r = play(sp, { build: b.id });
    const missing = (MAGE_MUST_USE[b.id] ?? []).filter((id) => !r.used[id]);
    const review = (sp.review?.(r.c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
    console.log(`  ${b.label.padEnd(58)} ${r.c.dps().toFixed(0).padStart(4)} DPS  ${review}`);
    if (missing.length) failures.push(`${b.label} never used ${missing.join(', ')}`);
    if (!(r.c.dps() > 100)) failures.push(`${b.label}: ${r.c.dps().toFixed(0)} DPS`);
  }
}
// Arcane (Oct 15): Arcane Blast's stacks last 15 s from the first, nothing spends them, and each adds 15 % of
// Intellect as spell damage; Arcane Wrath goes on cooldown; Missiles fire 5 separate missiles.
{
  const r = play(mageArcane, { build: 'arcane', options: { lockMana: true } });
  const k = r.c.counters;
  const missiles = r.c.meter.rows.get('arcaneMissiles');
  const wraths = (r.c.meter.rows.get('arcaneWrath')?.hits ?? 0) + (r.c.meter.rows.get('arcaneWrath')?.misses ?? 0);
  const up = (k['uptime:arcaneBlast'] ?? 0) / (k.combatTime ?? 1);
  console.log(`Arcane with locked mana: ${r.c.dps().toFixed(0)} DPS, ${missiles?.hits ?? 0} missiles hit, ${wraths} Arcane Wraths, Arcane Blast stacks up ${Math.round(up * 100)}%, Barrage ${k.missileBarrage ?? 0}/${k.barrageUsed ?? 0}`);
  // Stacks fall off 15 s after the first and take four casts to rebuild; Arcane Wrath fits about once per cycle.
  if (up < 0.6) failures.push(`Arcane Blast stacks up only ${Math.round(up * 100)}% of the fight`);
  if (wraths < 10) failures.push(`only ${wraths} Arcane Wraths in 5 minutes`);
}
{
  let s = 2024;
  const c = new Combat(mageArcane, { ...(mageArcane.defaultOptions ?? {}), lockMana: true });
  c.random = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  c.stats = structuredClone(mageArcane.builds?.find((b) => b.id === 'arcane')?.stats ?? mageArcane.stats);
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.player.x = 0; c.player.z = -2; c.player.facing = 0;
  c.reset();
  const step = () => c.update(0.05);
  const cast = (id: string) => {
    c.use(id);
    step();
    while (c.casting || c.channeling || c.player.gcdEnd > c.t) step();
  };
  cast('arcaneBlast');
  const first = c.aura(c.player, 'arcaneBlast');
  const firstEnd = first?.end ?? 0;
  for (let i = 0; i < 4; i++) cast('arcaneBlast');
  const stacks = c.aura(c.player, 'arcaneBlast')?.stacks ?? 0;
  const end = c.aura(c.player, 'arcaneBlast')?.end ?? 0;
  cast('frostbolt');
  cast('arcaneMissiles');
  const kept = c.aura(c.player, 'arcaneBlast')?.stacks ?? 0;
  if (stacks !== 4 || Math.abs(end - firstEnd) > 1e-9 || kept !== 4) failures.push(`Arcane Blast stacks: ${stacks} after five Blasts (4), timer ${end.toFixed(2)} vs first ${firstEnd.toFixed(2)}, ${kept} after Frostbolt and Missiles (4)`);
  // Since Oct 21 Arcane Missiles' missiles proc neither Clearcasting nor Missile Barrage (a log: none from 34 casts).
  let fromMissiles = 0;
  for (let i = 0; i < 150; i++) {
    c.use('arcaneMissiles');
    step();
    while (c.channeling) {
      const procs = (c.counters.clearcasting ?? 0) + (c.counters.missileBarrage ?? 0);
      step();
      if ((c.counters.clearcasting ?? 0) + (c.counters.missileBarrage ?? 0) > procs) fromMissiles++;
    }
    while (c.player.gcdEnd > c.t) step();
  }
  console.log(`Arcane Blast: ${stacks} stacks on the first one's timer, kept by other spells; ${fromMissiles} procs from missiles in 150 casts`);
  if (fromMissiles) failures.push(`${fromMissiles} Clearcasting or Missile Barrage procs from Arcane Missiles' missiles`);
}
// Frost (Oct 15): Winter's Chill feeds Cone of Cold within 10 yards; Ice Lance x3 on Fingers of Frost.
{
  const r = play(mageFrost, { build: 'frost', options: { lockMana: true }, distance: 9 });
  const k = r.c.counters;
  console.log(`Frost at 9 yards with locked mana: ${r.c.dps().toFixed(0)} DPS, ${k.fullCones ?? 0} Cones of Cold at 5 Winter's Chill, ${k.fingers ?? 0} Fingers charges`);
  if (!((k.fullCones ?? 0) > 5)) failures.push(`Frost cast only ${k.fullCones ?? 0} Cones of Cold at 5 Winter's Chill`);
}
// Spell queue: a press in the last 0.4 s of a cast goes off the moment the cast ends; earlier is an error;
// an interrupted cast drops the queued spell.
{
  const c = new Combat(mageFrost, { ...(mageFrost.defaultOptions ?? {}), lockMana: true });
  c.stats = structuredClone(mageFrost.stats);
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.player.x = 0; c.player.z = -10; c.player.facing = 0;
  c.reset();
  const errors: string[] = [];
  c.on('error', (e) => errors.push(e));
  const until = (left: number) => { while (c.casting && c.casting.end - c.t > left) c.update(0.01); };
  c.use('frostbolt');
  until(0.6);
  c.use('frostbolt');
  const early = errors.length;
  until(0.3);
  c.use('frostbolt');
  const end = c.casting!.end;
  while (c.t < end + 0.001) c.update(0.01);
  const next = c.casting;
  if (early !== 1 || errors.length !== 1) failures.push(`spell queue: ${errors.length} errors (${early} for the early press); expected 1`);
  if (!next || Math.abs(next.start - end) > 1e-6) failures.push(`spell queue: the queued Frostbolt started at ${next?.start.toFixed(3)}, the cast ended at ${end.toFixed(3)}`);
  until(0.3);
  c.use('frostbolt');
  c.cancelCast();
  for (let i = 0; i < 50; i++) c.update(0.01);
  if (c.casting) failures.push('spell queue: a spell queued behind an interrupted cast still went off');
  console.log(`Spell queue: a press 0.3 s before the end starts the next cast ${next ? ((next.start - end) * 1000).toFixed(0) : '?'} ms after it`);
}
// Fire: Ignite rolls, Fire Vulnerability stays at 5, Pyroblast only with Heating Up.
{
  const r = play(mageFire, { build: 'fire', options: { lockMana: true } });
  const k = r.c.counters;
  const fv = (k['uptime:target:fireVulnerability'] ?? 0) / (k.combatTime ?? 1);
  console.log(`Fire with locked mana: ${r.c.dps().toFixed(0)} DPS, Ignite ${Math.round(r.c.meter.rows.get('ignite')?.total ?? 0)}, ${k.pyroblasts ?? 0} Pyroblasts, Fire Vulnerability uptime ${Math.round(fv * 100)}%`);
  if (fv < 0.9) failures.push(`Fire Vulnerability uptime ${Math.round(fv * 100)}%`);
  if (!(k.pyroblasts > 5)) failures.push('Fire cast almost no Pyroblasts');
}

// ---------------------------------------------------------------- warlock
console.log('Warlock builds (5 min, own gear, priority list, default raid buffs):');
const WARLOCK_MUST_USE: Record<string, string[]> = {
  affliction: ['shadowBolt', 'corruption', 'immolate', 'baneOfDoom', 'curseOfTheElements', 'lifeTap'],
  'affliction-deep': ['shadowBolt', 'corruption', 'siphonLife', 'immolate', 'baneOfDoom', 'lifeTap'],
  pact: ['shadowBolt', 'searingPain', 'corruption', 'immolate', 'baneOfDoom', 'lifeTap'],
  fire: ['shadowBolt', 'immolate', 'conflagrate', 'shadowburn', 'corruption', 'baneOfDoom', 'lifeTap'],
  ruin: ['shadowBolt', 'corruption', 'immolate', 'baneOfDoom', 'lifeTap'],
  'ruin-fs': ['shadowBolt', 'corruption', 'immolate', 'baneOfDoom'],
};
for (const sp of [warlockAffliction, warlockDemonology, warlockDestruction]) {
  for (const b of sp.builds ?? []) {
    const r = play(sp, { build: b.id });
    const missing = (WARLOCK_MUST_USE[b.id] ?? []).filter((id) => !r.used[id]);
    const review = (sp.review?.(r.c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
    console.log(`  ${b.label.padEnd(58)} ${r.c.dps().toFixed(0).padStart(4)} DPS  ${review}`);
    if (missing.length) failures.push(`${b.label} never used ${missing.join(', ')}`);
    if (!(r.c.dps() > 100)) failures.push(`${b.label}: ${r.c.dps().toFixed(0)} DPS`);
    if (r.c.player.health <= 0) failures.push(`${b.label}: Life Tap killed the warlock`);
  }
}
// Affliction: DoTs stay up, Nightfall procs get used, Doom lands every minute, Life Tap pays for it.
{
  const r = play(warlockAffliction, { build: 'affliction' });
  const k = r.c.counters;
  const time = k.combatTime ?? 1;
  const up = (id: string) => (k[`uptime:target:${id}`] ?? 0) / time;
  const doom = r.c.meter.rows.get('baneOfDoom');
  console.log(`Affliction: Corruption ${Math.round(up('corruption') * 100)}%, Immolate ${Math.round(up('immolate') * 100)}%, Doom hits ${doom?.hits ?? 0}, Shadow Trance ${k.shadowTrance ?? 0}/${k.tranceUsed ?? 0}, ${k.lifeTaps ?? 0} Life Taps, health at the end ${Math.round(r.c.player.health)}`);
  if (up('corruption') < 0.85) failures.push(`Corruption uptime ${Math.round(up('corruption') * 100)}%`);
  if (!((doom?.hits ?? 0) >= 3)) failures.push('Bane of Doom landed fewer than 3 times in 5 minutes');
  if (r.c.aura(r.dummy, 'baneOfAgony') && r.c.aura(r.dummy, 'baneOfDoom')) failures.push('two Banes on one target');
  if (!(k.lifeTaps > 3)) failures.push('Affliction never needed Life Tap');
  if (!((k.tranceUsed ?? 0) > 0)) failures.push('Shadow Trance never used');
}
// Demonic Pact: the Succubus attacks and Demonic Brand adds hits; Destruction keeps both Shadow and Flame buffs.
{
  const r = play(warlockDemonology, { build: 'pact', options: { lockMana: true } });
  const pet = r.c.meter.rows.get('petMelee');
  const brand = r.c.meter.rows.get('demonicBrand');
  console.log(`Demonic Pact with locked mana: ${r.c.dps().toFixed(0)} DPS, Succubus ${pet?.hits ?? 0} swings (${Math.round(pet?.total ?? 0)}), Lash of Pain ${r.c.meter.rows.get('lashOfPain')?.hits ?? 0}, Brand ${brand?.hits ?? 0} hits`);
  if (!((pet?.hits ?? 0) > 100)) failures.push('the Succubus barely attacked');
  if (!((brand?.hits ?? 0) > 50)) failures.push('Demonic Brand barely fired');
  const f = play(warlockDestruction, { build: 'fire', options: { lockMana: true } });
  const k = f.c.counters;
  const time = k.combatTime ?? 1;
  console.log(`Shadow and Flame with locked mana: ${f.c.dps().toFixed(0)} DPS, Immolate ${Math.round((k['uptime:target:immolate'] ?? 0) / time * 100)}%, Flame buff ${Math.round((k['uptime:shadowFlameFire'] ?? 0) / time * 100)}%, Shadow buff ${Math.round((k['uptime:shadowFlameShadow'] ?? 0) / time * 100)}%`);
  if ((k['uptime:target:immolate'] ?? 0) / time < 0.85) failures.push('Shadow and Flame let Immolate drop');
}
// Demonic Sacrifice: without Demonic Pact it leaves no demon; with it the buff stays beside another demon,
// unless you summon the one you sacrificed. The Imp at your side throws Firebolts.
{
  const has = (r: ReturnType<typeof play>, id: string) => r.c.player.auras.has(id);
  const ruin = play(warlockDestruction, { build: 'ruin', seconds: 20, options: { sacrifice: 'voidwalker', demon: 'succubus' } });
  if (!has(ruin, 'felEnergy') || ruin.c.pet.out) failures.push('DS/Ruin with a Voidwalker sacrifice: expected Fel Energy and no demon out');
  const pactImp = play(warlockDemonology, { build: 'pact', seconds: 60, options: { sacrifice: 'imp', demon: 'succubus' } });
  if (!has(pactImp, 'burningShadow') || !pactImp.c.pet.out) failures.push('Demonic Pact did not keep Burning Shadow with the Succubus out');
  const same = play(warlockDemonology, { build: 'pact', seconds: 20, options: { sacrifice: 'succubus', demon: 'succubus' } });
  if (has(same, 'touchOfFire')) failures.push('Demonic Pact kept the buff of the demon summoned again');
  const imp = play(warlockDemonology, { build: 'pact', seconds: 120, options: { sacrifice: 'voidwalker', demon: 'imp', lockMana: true } });
  const fb = imp.c.meter.rows.get('firebolt');
  console.log(`Demonic Pact with the Imp out: ${imp.c.dps().toFixed(0)} DPS, ${fb?.hits ?? 0} Firebolts (${Math.round(fb?.total ?? 0)})`);
  if (!((fb?.hits ?? 0) > 40) || imp.c.meter.rows.get('petMelee')) failures.push('the Imp did not cast Firebolts (or the Succubus swung)');
  const fel = play(warlockDestruction, { build: 'ruin', seconds: 20, options: { sacrifice: 'felhunter' } });
  if (!has(fel, 'felStamina')) failures.push('Felhunter sacrifice did not give Fel Stamina');
  const aff = play(warlockAffliction, { build: 'affliction', seconds: 20, options: { sacrifice: 'imp' } });
  if (has(aff, 'burningShadow') || !aff.c.pet.out) failures.push('Affliction (no Demonic Sacrifice) got a sacrifice buff or lost its demon');
}

// ----------------------------------------------------------------- shaman
console.log('Shaman builds (5 min, own gear, priority list, default raid buffs):');
const SHAMAN_MUST_USE: Record<string, string[]> = {
  elemental: ['lightningBolt', 'lavaBurst', 'flameShock', 'earthShock', 'searingTotem', 'manaSpringTotem', 'elementalMastery'],
  'elemental-fs': ['lightningBolt', 'lavaBurst', 'flameShock', 'searingTotem', 'elementalMastery'],
  'elemental-60': ['lightningBolt', 'lavaBurst', 'flameShock', 'searingTotem', 'elementalMastery'],
  stormcaller: ['lightningBolt', 'flameShock', 'earthShock', 'searingTotem'],
  'stormcaller-fs': ['lightningBolt', 'flameShock', 'searingTotem'],
  enhancement: ['stormstrike', 'earthShock', 'flameShock', 'fireNova', 'lightningBolt', 'searingTotem', 'strengthOfEarthTotem', 'rageOfTheFarseer'],
  'enhancement-60': ['stormstrike', 'earthShock', 'flameShock', 'lightningBolt', 'searingTotem'],
  'enhancement-fs': ['stormstrike', 'earthShock', 'lightningBolt', 'searingTotem'],
  tank: ['stormstrike', 'earthShock', 'lightningShield', 'stoneskinTotem'],
};
for (const sp of [shamanElemental, shamanEnhancement, shamanTank]) {
  for (const b of sp.builds ?? []) {
    const r = play(sp, { build: b.id });
    const missing = (SHAMAN_MUST_USE[b.id] ?? []).filter((id) => !r.used[id]);
    const review = (sp.review?.(r.c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
    console.log(`  ${b.label.padEnd(58)} ${r.c.dps().toFixed(0).padStart(4)} DPS${sp.tank || r.c.enemyAttacks.on ? ` ${r.c.tps().toFixed(0).padStart(4)} TPS` : ''}  ${review}`);
    if (missing.length) failures.push(`${b.label} never used ${missing.join(', ')}`);
    if (!(r.c.dps() > 100)) failures.push(`${b.label}: ${r.c.dps().toFixed(0)} DPS`);
  }
}
// Enhancement: Windfury Weapon replaces the raid totem, two attacks per proc; Maelstrom bolts; Stormstrike charges get spent.
{
  const r = play(shamanEnhancement, { build: 'enhancement', options: { lockMana: true }, raid: ['windfury'] });
  const k = r.c.counters;
  const wf = r.c.meter.rows.get('windfuryWeapon');
  const totemSwings = r.c.meter.rows.get('melee_mh');
  console.log(`Enhancement with locked mana: ${r.c.dps().toFixed(0)} DPS, ${k.windfury ?? 0} Windfury procs (${(wf?.hits ?? 0) + (wf?.misses ?? 0)} attacks), ${k.maelstromBolts ?? 0} 5-stack Lightning Bolts, ${k.stormstrikeCharges ?? 0} Stormstrike charges spent and ${k.stormstrikeShocks ?? 0} Earth Shocks with the bonus, ${k.clearcasting ?? 0} Clearcasting`);
  if ((wf?.hits ?? 0) + (wf?.misses ?? 0) !== 2 * (k.windfury ?? 0)) failures.push('Windfury Weapon did not give two attacks per proc');
  if (!(k.windfury > 20)) failures.push('Windfury Weapon barely procced');
  if (!(k.maelstromBolts > 10)) failures.push('Enhancement cast few 5-stack Lightning Bolts');
  // Since Oct 21 Earth Shock takes the bonus without spending the charge: bolts spend it.
  if (!(k.stormstrikeCharges + k.stormstrikeShocks > 20)) failures.push('Stormstrike charges were rarely used');
  if (!(k.stormstrikeShocks > 5)) failures.push('Earth Shock never took the Stormstrike bonus');
  if (!totemSwings) failures.push('no melee swings');
  const ft = play(shamanEnhancement, { build: 'enhancement', options: { lockMana: true, imbue: 'flametongue' }, raid: [] });
  const ftRow = ft.c.meter.rows.get('flametongueWeapon');
  console.log(`Enhancement with Flametongue and its own Windfury Totem: ${ft.c.dps().toFixed(0)} DPS, Flametongue ${ftRow?.hits ?? 0} hits, ${ft.c.counters.windfury ?? 0} totem procs`);
  if (!((ftRow?.hits ?? 0) > 100)) failures.push('Flametongue Weapon barely hit');
  if (!((ft.c.counters.windfury ?? 0) > 10)) failures.push('the own Windfury Totem never procced');
}
// Elemental: Lava Burst on Flame Shock, Searing Totem keeps attacking, Overload copies; mana runs out without a lock.
{
  const r = play(shamanElemental, { build: 'elemental', options: { lockMana: true } });
  const k = r.c.counters;
  const time = k.combatTime ?? 1;
  console.log(`Elemental with locked mana: ${r.c.dps().toFixed(0)} DPS, Flame Shock ${Math.round((k['uptime:target:flameShock'] ?? 0) / time * 100)}%, Searing ${Math.round((k['uptime:searingTotem'] ?? 0) / time * 100)}%, ${r.c.meter.rows.get('lavaBurst')?.hits ?? 0} Lava Bursts, ${k.overloads ?? 0} Overloads`);
  if ((k['uptime:searingTotem'] ?? 0) / time < 0.9) failures.push('Searing Totem was not kept up');
  if (!((r.c.meter.rows.get('lavaBurst')?.hits ?? 0) > 20)) failures.push('few Lava Bursts');
  const tank = play(shamanTank, { build: 'tank' });
  console.log(`Off-tank: ${tank.c.dps().toFixed(0)} DPS, ${tank.c.tps().toFixed(0)} TPS, ${tank.c.meter.rows.get('lightningShield')?.hits ?? 0} Lightning Shield orbs, ${tank.c.counters.stormstrikeResets ?? 0} Stormstrike resets`);
  if (!((tank.c.meter.rows.get('lightningShield')?.hits ?? 0) > 10)) failures.push('Lightning Shield orbs barely fired');
}

// ----------------------------------------------------------- raid effects
// Armor debuffs: one per slot (Sunder and Expose Armor share one), different slots add up.
{
  const c = new Combat(rogue);
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.raid = new Set(['sunderArmor', 'faerieFire', 'curseOfRecklessness']);
  c.reset();
  const expected = (3731 - 2250 - 505 - 640) / (3731 - 2250 - 505 - 640 + 5500);
  if (Math.abs(c.armorReduction(dummy) - expected) > 1e-9) failures.push(`armor with Sunder, Faerie Fire and Curse of Recklessness ${c.armorReduction(dummy)}, expected ${expected}`);
  c.applyAura(dummy, { id: 'exposeArmor', name: 'Expose Armor', icon: 'exposeArmor', duration: 30, armor: 1700, armorSlot: 'major' });
  if (Math.abs(c.armorReduction(dummy) - expected) > 1e-9) failures.push('a weaker Expose Armor stacked with Sunder Armor');
}
// Curse of the Elements: +10 % to magic hits (a rogue's Nature poisons too), physical hits untouched.
{
  const c = new Combat(rogue);
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.raid = new Set(['curseOfElements']);
  c.reset();
  const seen: number[] = [];
  c.on('damage', (h) => seen.push(h.amount));
  c.deal({ target: dummy, source: 'instantPoison', outcome: 'hit', school: 'nature', amount: 1000, white: false });
  c.deal({ target: dummy, source: 'melee_mh', outcome: 'hit', school: 'physical', amount: 1000, white: true, hand: 'main' });
  if (seen[0] !== 1100 || seen[1] !== 1000) failures.push(`Curse of the Elements: nature ${seen[0]}, physical ${seen[1]}, expected 1100 and 1000`);
}
// Windfury Totem: main-hand attacks only, 1.5 s cooldown; the extra swing gives a warrior rage.
{
  const c = new Combat(warrior, { ...(warrior.defaultOptions ?? {}) });
  c.stats = structuredClone(warrior.stats);
  const dummy: Unit = { id: 0, name: 'Dummy', level: 63, health: 1e9, maxHealth: 1e9, armor: 3731, auras: new Map(), x: 0, z: 0, facing: 0, radius: 0.5 };
  c.targets = [dummy];
  c.target = dummy;
  c.raid = new Set(['windfury']);
  c.reset();
  // The first roll after a hit is Windfury's (10 < 20 %); every later roll is 95 (a plain hit on the table).
  let calls = 0;
  c.random = () => (calls++ === 0 ? 0.1 : 0.95);
  const white = (hand: 'main' | 'off') => {
    calls = 0;
    c.deal({ target: dummy, source: hand === 'main' ? 'melee_mh' : 'melee_oh', outcome: 'hit', school: 'physical', amount: 100, white: true, hand, weaponStrike: true });
  };
  white('off');
  if (c.counters.windfury) failures.push('Windfury procced from an off-hand hit');
  const before = c.player.resource;
  white('main');
  if (c.counters.windfury !== 1) failures.push(`Windfury procs after a main-hand hit: ${c.counters.windfury ?? 0}, expected 1`);
  if (!(c.player.resource - before > 3.46 * c.stats.mainHand.speed * 1.5)) failures.push('the Windfury swing gave no rage');
  white('main');
  if (c.counters.windfury !== 1) failures.push('Windfury procced again inside its 1.5 s cooldown');
  const fury = play(warrior, { build: 'fury-dw', raid: ['windfury', 'battleShout'] });
  const base = play(warrior, { build: 'fury-dw', raid: [] });
  // Since Oct 28 Fury spends rage on Hamstring for the extra procs, so the check is on white damage, not the total.
  const whiteMh = (r: typeof fury) => r.c.meter.rows.get('melee_mh')?.total ?? 0;
  console.log(`Fury with Windfury Totem: ${fury.c.dps().toFixed(0)} DPS (${fury.c.counters.windfury ?? 0} procs, ${fury.used.hamstring ?? 0} Hamstrings), main-hand white ${Math.round(whiteMh(fury))} vs ${Math.round(whiteMh(base))} without`);
  if (!(whiteMh(fury) > whiteMh(base) * 1.1)) failures.push('Windfury Totem did not raise Fury main-hand damage');
  const cat = play(druidCat, { build: 'cat', raid: ['windfury', 'judgementOfWisdom'] });
  if (!((cat.c.counters.windfury ?? 0) > 20)) failures.push('Windfury Totem barely procced for a cat');
}

// The talent trees drawn in the UI (gunba's layout) read every build's talent string the same way the specs do.
for (const sp of SPECS) {
  const cls = classKey(sp.className);
  if (!treesOf(cls).length) { failures.push(`no talent layout for ${cls}`); continue; }
  for (const b of sp.builds ?? []) {
    if (!b.talentString) { failures.push(`${sp.id}/${b.id}: no talent string`); continue; }
    const drawn = pointsPerTree(cls, b.talentString);
    const decoded = b.trees.map((t) => t.points);
    if (drawn.join('/') !== decoded.join('/')) failures.push(`${sp.id}/${b.id}: the drawn trees show ${drawn.join('/')}, the spec reads ${decoded.join('/')}`);
    decode(cls, b.talentString).forEach((tree, i) => tree.forEach((r, j) => {
      const t = treesOf(cls)[i].talents[j];
      if (r > t.max) failures.push(`${sp.id}/${b.id}: ${t.name} at ${r}/${t.max}`);
    }));
  }
}
console.log(`Talent layouts checked for ${SPECS.reduce((n, s) => n + (s.builds?.length ?? 0), 0)} builds`);

// Talents of your own (Settings → Edit talents) are written in the drawn layout's order: a point on any
// drawn talent must reach the spec as that same talent.
{
  type Summary = { tree: string; points: number; talents: string[] }[];
  const read: Record<string, (s: string) => Summary> = {
    rogue: (s) => rogueTalents.summary(rogueTalents.talentsFor(undefined, s)),
    warrior: (s) => warriorTalents.summary(warriorTalents.talentsFor(undefined, s)),
    druid: (s) => druidTalents.summary(druidTalents.talentsFor(undefined, 'cat', s)),
    paladin: (s) => paladinTalents.summary(paladinTalents.talentsFor(undefined, 'ret', s)),
    hunter: (s) => hunterTalents.summary(hunterTalents.talentsFor(undefined, 'mm', s)),
    priest: (s) => priestTalents.summary(priestTalents.talentsFor(undefined, 'shadow', s)),
    mage: (s) => mageTalents.summary(mageTalents.talentsFor(undefined, 'fire', s)),
    warlock: (s) => warlockTalents.summary(warlockTalents.talentsFor(undefined, 'affliction', s)),
    shaman: (s) => shamanTalents.summary(shamanTalents.talentsFor(undefined, 'elemental', s)),
  };
  const norm = (x: string) => x.replace(/ \d+( ★)?$/, '').toLowerCase().replace(/[^a-z]/g, '');
  let checked = 0;
  for (const [cls, summarize] of Object.entries(read)) {
    treesOf(cls).forEach((tree, i) => tree.talents.forEach((t, j) => {
      const s = treesOf(cls).map((_, k) => (k === i ? `${'0'.repeat(j)}1` : '')).join('-');
      const got = summarize(s)[i]?.talents ?? [];
      checked++;
      if (got.length !== 1 || norm(got[0]) !== norm(t.name)) failures.push(`${cls}: a point on ${t.name} reads as ${got.join(', ') || 'nothing'}`);
    }));
  }
  console.log(`Own talents: ${checked} talents read back as drawn`);
  // Every published build follows the rules the editor enforces.
  for (const sp of SPECS) {
    const cls = classKey(sp.className);
    for (const b of sp.builds ?? []) {
      if (b.talentString && !isValid(cls, decode(cls, b.talentString))) failures.push(`${sp.id}/${b.id}: not a legal level 60 build`);
    }
  }
  // The rules: a row needs five points above it, a prerequisite at full rank, at most 51 points.
  const holy = decode('paladin', '');
  const shock = treesOf('paladin')[0].talents.findIndex((t) => t.key === 'holyShock');
  const vigil = treesOf('paladin')[0].talents.findIndex((t) => t.key === 'lightsVigil');
  if (canAdd('paladin', holy, 0, shock)) failures.push('Holy Shock could be taken with no points in Holy');
  const shockadin = decode('paladin', '55003013200131151--05223331001');
  if (canRemove('paladin', shockadin, 0, shock)) failures.push("Holy Shock could be removed under Light's Vigil");
  if (!canRemove('paladin', shockadin, 0, vigil)) failures.push("Light's Vigil could not be removed");
  if (canAdd('paladin', shockadin, 2, 0)) failures.push('a 52nd point could be spent');
  if (encode(shockadin) !== '55003013200131151--05223331001') failures.push(`encode gives ${encode(shockadin)}`);
  if (parseTalents('paladin', '5555555555555555555') !== null) failures.push('an illegal link was accepted');
  // The planner's leveling order: every published build gets a legal order of all its points, and a link gives it back.
  let orders = 0;
  for (const sp of SPECS) {
    const cls = classKey(sp.className);
    for (const b of sp.builds ?? []) {
      if (!b.talentString) continue;
      const order = defaultOrder(cls, decode(cls, b.talentString));
      if (encode(pointsOf(cls, order)) !== encode(decode(cls, b.talentString))) failures.push(`${sp.id}/${b.id}: the planner's order leaves points out`);
      const back = decodeOrder(cls, encodeOrder(cls, order));
      if (!back || encodeOrder(cls, back) !== encodeOrder(cls, order)) failures.push(`${sp.id}/${b.id}: the order's link reads back differently`);
      orders++;
    }
  }
  // Taking back an early point moves a later one that needed it until it fits again.
  const arms = treesOf('warrior')[0].talents;
  const row1 = arms.findIndex((t) => t.row === 1 && !t.req);
  const early: [number, number][] = [[0, 0], [0, 0], [0, 0], [0, 1], [0, 1], [0, row1], [0, 1]];
  const fixed = repairOrder('warrior', early.filter((_, k) => k !== 0));
  if (fixed.length !== 6 || fixed[4][1] !== 1 || fixed[5][1] !== row1) failures.push(`the order kept a point too early: ${JSON.stringify(fixed)}`);
  if (decodeOrder('warrior', '!!') !== null || decodeOrder('warrior', 'z'.repeat(52)) !== null) failures.push('a broken order link was accepted');
  if (levelFor(1) !== 10 || levelFor(51) !== 60) failures.push('talent points come at the wrong levels');
  console.log(`Talent planner: ${orders} builds ordered level by level`);
}
{
  // Your own model: the animation names exports use, read as the yard's.
  const names: [string, string][] = [
    ['Walk (ID 4 variation 0)', 'walk'], ['Attack1H (ID 17 variation 1)', 'attack1h'], ['ReadySpellDirected (ID 51 variation 0)', 'readyspelldirected'],
    ['Stand', 'stand'], ['Stand_0', 'stand'], ['Run (5)', 'run'], ['Walk_0_0', 'walk'], ['Attack1H [17]', 'attack1h'],
    ['17', 'attack1h'], ['47_0', 'firebow'], ['Anim_53', 'spellcastdirected'], ['Ready2H', 'ready2h'],
    ['WalkBackwards_1', 'walkbackwards'], ['Sword_Regular_A', 'swordregulara'], ['Jog_Fwd_Loop', 'jogfwdloop'],
  ];
  for (const [name, want] of names) if (animKey(name) !== want) failures.push(`animation "${name}" reads as ${animKey(name)}, not ${want}`);
}
{
  // Onyxia: the fight runs through its three phases; each mechanic hits where it should.
  const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const realRandom = Math.random;
  Math.random = seeded(7);
  const fightAt = (x: number, z: number, locked: boolean, seconds = 900) => {
    const c = new Combat(warrior);
    const f = new OnyxiaFight(c, true);
    c.encounter = true;
    c.playerHealthLocked = locked;
    f.reset();
    const phases: number[] = [];
    f.on('phase', (n) => phases.push(n));
    f.start();
    c.player.x = x; c.player.z = z;
    for (let t = 0; t < seconds && !f.over; t += 0.05) { c.update(0.05); f.update(0.05); }
    return { f, c, phases };
  };
  // Standing still at the start with health locked: the raid brings her down through all three phases.
  const idle = fightAt(ROOM.start.x, ROOM.start.z, true);
  if (idle.phases.join() !== '1,2,3') failures.push(`Onyxia: phases ${idle.phases.join()}`);
  if (!idle.f.review.won) failures.push('Onyxia: the raid did not bring her down');
  if (idle.f.review.flameBreath || idle.f.review.tailSweep) failures.push('Onyxia: breath or tail reached the start, at her side');
  if (idle.f.review.whelpsSpawned < 12 || idle.f.review.fears < 2) failures.push(`Onyxia: ${idle.f.review.whelpsSpawned} whelps, ${idle.f.review.fears} fears`);
  // In front of her, where the tank stands, the breath lands; behind her, the tail.
  const front = fightAt(0, 14, true, 40);
  if (!front.f.review.flameBreath) failures.push('Onyxia: Flame Breath missed the front');
  const back = fightAt(0, -8, true, 40);
  if (!back.f.review.tailSweep) failures.push('Onyxia: Tail Sweep missed behind her');
  // On a crack in phase three the lava burns; at her side, out of every breath line, nothing but whelps and fireballs.
  const [a, b] = CRACKS[3];
  const crack = fightAt((a.x + b.x) / 2, (a.z + b.z) / 2, true);
  if (!crack.f.review.lava) failures.push('Onyxia: the lava missed a crack');
  // The whelp tanks hold most whelps and their groups kill them; the loose ones keep biting an idle player.
  if (idle.f.review.whelpsAtYou >= idle.f.review.whelpsSpawned / 2) failures.push(`Onyxia: ${idle.f.review.whelpsAtYou} of ${idle.f.review.whelpsSpawned} whelps came at you`);
  if (idle.f.review.whelpsKilled < idle.f.review.whelpsSpawned - idle.f.review.whelpsAtYou) failures.push('Onyxia: the whelp groups did not kill the whelps they held');
  if (idle.f.review.whelpBites < 20) failures.push(`Onyxia: loose whelps bit an idle player only ${idle.f.review.whelpBites} times`);
  const wipe = fightAt(ROOM.start.x, ROOM.start.z, false);
  // Phase two's Deep Breath: standing in the middle, on every line across the room, burns five or six times (wiki).
  let line = fightAt(0, 0, true);
  let breaths = 0;
  for (let seed = 11; seed < 40; seed++) {
    Math.random = seeded(seed);
    const c = new Combat(warrior);
    const f = new OnyxiaFight(c, true);
    c.encounter = true;
    f.reset();
    breaths = 0;
    f.on('deepBreath', (d) => { if (!d.warn) breaths++; });
    f.start();
    c.player.x = 0; c.player.z = 0;
    for (let t = 0; t < 900 && !f.over; t += 0.05) { c.update(0.05); f.update(0.05); }
    if (breaths) { line = { f, c, phases: [] }; break; }
  }
  const perBreath = line.f.review.deepBreath / Math.max(1, breaths);
  if (!breaths || perBreath < 5 || perBreath > 6) failures.push(`Onyxia: Deep Breath hit the middle ${perBreath} times a breath (${breaths} breaths)`);
  // From the middle of the room a 30-yard spell reaches her at every spot she hovers at.
  {
    const c = new Combat(warrior);
    const f = new OnyxiaFight(c, true);
    f.reset();
    c.player.x = 0; c.player.z = 0;
    for (let i = 0; i < 6; i++) {
      Object.assign(f.boss, { x: Math.sin(i * Math.PI / 3) * ROOM.hover, z: Math.cos(i * Math.PI / 3) * ROOM.hover, altitude: ROOM.altitude });
      if (!c.inRange(f.boss, 30)) failures.push(`Onyxia: out of 30-yard range from the middle at spot ${i}`);
      if (c.inRange(f.boss)) failures.push('Onyxia: melee reaches her in the air');
    }
  }
  Math.random = realRandom;
  console.log(`Onyxia: ${idle.f.review.time.toFixed(0)} s idle with the raid, ${idle.f.review.whelpsSpawned} whelps, ${idle.f.review.fears} fears, ${perBreath} Deep Breath hits a breath in the middle; idle with real health: ${wipe.f.review.won ? 'survives' : `dies in phase ${wipe.f.review.phase}`}, bitten ${wipe.f.review.whelpBites} times by ${wipe.f.review.whelpsAtYou} loose whelps`);
}
if (failures.length) {
  console.error(`FAILED:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('All checks passed.');
