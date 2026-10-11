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
import { warlockAffliction, warlockDemonology, warlockDestruction } from '../src/specs/warlock';
import { warrior } from '../src/specs/warrior';

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
    const id = spec.suggest?.(c);
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
function play(sp: Spec, opts: { build?: string; seconds?: number; seed?: number; raid?: string[]; options?: Record<string, number | boolean | string> } = {}) {
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
  c.player.x = 0; c.player.z = tank ? 2 : sp.startDistance ? -sp.startDistance * 0.9144 : -2; c.player.facing = tank ? Math.PI : 0;
  // As in Settings: specs that show health play with it unlocked.
  c.playerHealthLocked = !sp.showHealth;
  c.reset();
  if (tank) c.enemyAttacks = { ...c.enemyAttacks, on: true, damage: sp.tankDamage ?? 3000 };
  const used: Record<string, number> = {};
  c.on('ability', ({ id }) => { used[id] = (used[id] ?? 0) + 1; });
  const seconds = opts.seconds ?? 300;
  for (let t = 0; t < seconds; t += 0.05) {
    const id = sp.suggest?.(c);
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
    console.log(`  ${b.label.padEnd(58)} ${r.c.dps().toFixed(0).padStart(4)} DPS${sp.showThreat ? ` ${r.c.tps().toFixed(0).padStart(4)} TPS` : ''}  ${review}`);
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
  if (!((locked.c.counters.shiftingPower ?? 0) > (k.shiftingPower ?? 0))) failures.push('locked mana did not allow more Shifting Powers');
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
  shock: ['sealOfCommand', 'judgement', 'holyShock', 'divineFavor', 'holyStrike'],
  'shock-ret': ['sealOfCommand', 'judgement', 'holyShock', 'holyStrike'],
};
for (const sp of [paladinRet, paladinProt, paladinShock]) {
  for (const b of sp.builds ?? []) {
    const r = play(sp, { build: b.id });
    const missing = (PALADIN_MUST_USE[b.id] ?? []).filter((id) => !r.used[id]);
    const review = (sp.review?.(r.c) ?? []).map((x) => `${x.label}: ${x.value}`).join(' | ');
    console.log(`  ${b.label.padEnd(58)} ${r.c.dps().toFixed(0).padStart(4)} DPS${sp.showThreat ? ` ${r.c.tps().toFixed(0).padStart(4)} TPS` : ''}  ${review}`);
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
  if (perSwing < 0.3 || perSwing > 0.5) failures.push(`Seal of Command on ${(perSwing * 100).toFixed(1)}% of landed swings, expected about 40%`);
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
  if (Math.abs(c.meter.threat - 1000) > 1e-6 || Math.abs(holyThreat - 1000 * 1.6 * 1.25) > 1e-6) failures.push(`Prot threat: Holy Strike ${holyThreat}, white ${c.meter.threat}; expected 2000 and 1000`);
}
// Shockadin: Holy Shock about every 10 s.
{
  const r = play(paladinShock, { build: 'shock', options: { lockMana: true } });
  const shocks = r.used.holyShock ?? 0;
  console.log(`Shockadin with locked mana: ${r.c.dps().toFixed(0)} DPS, ${shocks} Holy Shocks in 5 min`);
  if (shocks < 25) failures.push(`only ${shocks} Holy Shocks in 5 minutes`);
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
  if (!((classic.c.counters.autoShots ?? 0) < (k.autoShots ?? 0))) failures.push('the Classic Auto Shot rule did not cost any shots');
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
  arcane: ['arcaneBlast', 'frostbolt', 'arcaneMissiles', 'arcanePower', 'presenceOfMind'],
  'arcane-fire': ['arcaneBlast', 'fireBlast', 'arcaneMissiles'],
  'arcane-ms': ['arcaneBlast', 'arcaneMissiles'],
  'arcane-fs': ['arcaneBlast', 'frostbolt'],
  fire: ['scorch', 'fireBlast', 'pyroblast', 'combustion'],
  'fire-fs': ['scorch', 'fireBlast', 'pyroblast', 'combustion'],
  'fire-ms': ['scorch', 'fireBlast', 'pyroblast'],
  'fire-frost': ['frostfireBolt', 'fireBlast', 'pyroblast'],
  frost: ['frostbolt', 'iceLance'],
  'arcane-frost': ['frostbolt', 'iceLance', 'arcaneMissiles'],
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
// Arcane: Blast stacks raise its cost; Missiles fire 5 separate missiles; Evocation refills.
{
  const r = play(mageArcane, { build: 'arcane', options: { lockMana: true } });
  const k = r.c.counters;
  const missiles = r.c.meter.rows.get('arcaneMissiles');
  console.log(`Arcane with locked mana: ${r.c.dps().toFixed(0)} DPS, ${missiles?.hits ?? 0} missiles hit, Barrage ${k.missileBarrage ?? 0}/${k.barrageUsed ?? 0}, stacks spent at 3: ${k['stacksSpent:3'] ?? 0}`);
  if (!((k['stacksSpent:3'] ?? 0) > 20)) failures.push('Arcane rarely spent 3 Arcane Blast stacks');
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
  affliction: ['shadowBolt', 'corruption', 'siphonLife', 'immolate', 'baneOfDoom', 'curseOfTheElements', 'lifeTap'],
  'affliction-deep': ['shadowBolt', 'corruption', 'siphonLife', 'immolate', 'baneOfDoom', 'lifeTap'],
  pact: ['shadowBolt', 'searingPain', 'corruption', 'immolate', 'baneOfDoom', 'lifeTap'],
  'pact-fs': ['shadowBolt', 'searingPain', 'corruption', 'immolate', 'baneOfDoom'],
  fire: ['incinerate', 'immolate', 'conflagrate', 'shadowburn', 'corruption', 'baneOfDoom', 'lifeTap'],
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
  console.log(`Fury with Windfury Totem: ${fury.c.dps().toFixed(0)} DPS (${fury.c.counters.windfury ?? 0} procs) vs ${base.c.dps().toFixed(0)} without`);
  if (!(fury.c.dps() > base.c.dps())) failures.push('Windfury Totem did not raise Fury DPS');
  const cat = play(druidCat, { build: 'cat', raid: ['windfury', 'judgementOfWisdom'] });
  if (!((cat.c.counters.windfury ?? 0) > 20)) failures.push('Windfury Totem barely procced for a cat');
}

if (failures.length) {
  console.error(`FAILED:\n  ${failures.join('\n  ')}`);
  process.exit(1);
}
console.log('All checks passed.');
