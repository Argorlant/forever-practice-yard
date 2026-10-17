// Feral Cat for WoW Forever: smooth Energy, combo points, Shifting Power (the
// Forever "powershift", paid in mana), Omen of Clarity, Blood Frenzy and
// Berserk. Numbers in ./data.ts, builds in ./talents.ts; sources in
// research/druid_forever.md.
import type { Combat } from '../../engine/combat';
import type { Ability, Hit, Outcome, Spec, Unit } from '../../engine/types';
import { LEADER_OF_THE_PACK } from '../../engine/raid';
import { UI } from '../../strings';
import { BOSS_RULES } from '../common';
import { CAT_STATS } from './data';
import {
  CONTROLS, D, SOURCES, attack, bleed, faerieFire, faerieFireLeft, freeWithClearcasting, landed, manaPotion, note, omen,
  resetState, roll, useClearcasting,
} from './shared';
import { buildById, buildLabel, buildsFor, summary, talentsFor, type Talents } from './talents';

const T = (c: Combat): Talents => talentsFor(c.options.build, 'cat', c.options.talents);

// --------------------------------------------------------------- helpers
const needsBehind = (c: Combat, t: Unit | null) => (t && !c.behind(t) ? UI.mustBeBehind : null);
const needsProwl = (c: Combat) => (c.stealthed() ? null : 'Must be prowling');
const needsComboPoints = (c: Combat, t: Unit | null) => (c.comboPointsOn(t) > 0 ? null : UI.needsComboPoints);
const hasPoints = (c: Combat) => c.comboPointsOn(c.target) > 0;
const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});

const shredCost = (c: Combat) => D.shred.cost - 6 * T(c).shreddingAttacks;
const clawCost = (c: Combat) => D.claw.cost - T(c).ferocity;
const rakeCost = (c: Combat) => D.rake.cost - T(c).ferocity;
const shiftingPowerMana = (c: Combat) => Math.round(D.shiftingPower.mana * (1 - 0.1 * T(c).naturalShapeshifter));
const shiftingPowerCooldown = (c: Combat) => D.shiftingPower.cooldown - 4 * T(c).improvedShiftingPower - (c.options.howlingIdol ? 0.5 : 0);
const shiftingPowerEnergy = (c: Combat) => D.shiftingPower.energy + (c.options.wolfshead ? 5 : 0);
const ripTicks = (c: Combat) => D.rip.ticks + (c.options.idolOfTheDream ? 1 : 0);
const ripTick = (c: Combat, cp: number) => D.rip.tick + D.rip.tickPerCp * cp + c.attackPower() * D.rip.apPerCp * Math.min(cp, 4);

/**
 * A combo point builder. Berserk makes builders crit; with Blood Frenzy a
 * builder crit adds a combo point. An avoided builder refunds 80 %.
 */
function builder(c: Combat, t: Unit, id: string, base: number, opts: { ignoreArmor?: boolean } = {}): Outcome {
  const berserk = !!c.aura(c.player, 'berserk');
  const outcome = c.rollSpecial(t, id, { forceCrit: berserk });
  useClearcasting(c);
  if (!landed(outcome)) {
    c.refund(D.catRefund);
    c.deal({ target: t, source: id, outcome, school: 'physical', amount: 0, white: false, hand: 'main' });
    return outcome;
  }
  const amount = c.physicalDamage(t, id, base, outcome, opts);
  c.deal({ target: t, source: id, outcome, school: 'physical', amount, white: false, hand: 'main', weaponStrike: true });
  c.addComboPoints(t, 1);
  const bf = T(c).bloodFrenzy;
  if (outcome === 'crit' && bf && roll(c, 50 * bf)) {
    c.addComboPoints(t, 1);
    c.count('bloodFrenzy');
    note(c, 'Blood Frenzy +1 combo point');
  }
  return outcome;
}

/** A finisher has to land; an avoided one keeps its combo points and refunds nothing (gs). */
function finisher(c: Combat, t: Unit, id: string): { cp: number; outcome: Outcome } | null {
  const outcome = c.rollSpecial(t, id);
  useClearcasting(c);
  if (!landed(outcome)) {
    c.deal({ target: t, source: id, outcome, school: 'physical', amount: 0, white: false, hand: 'main' });
    return null;
  }
  return { cp: c.spendComboPoints(), outcome };
}

function prowl(c: Combat): void {
  c.applyAura(c.player, {
    id: 'stealth', name: 'Prowl', icon: 'prowl', duration: Infinity, speed: D.prowl.speed,
    // The cooldown starts when Prowl ends.
    onRemove: (cc) => cc.startCooldown('prowl', D.prowl.cooldown),
  });
}

// ------------------------------------------------------------- abilities
const abilities: Ability[] = [
  { ...attack, description: () => 'Starts your auto attack: a cat swings every 1.0 sec for your weapon\'s DPS plus AP/14.' },
  {
    id: 'shred', name: 'Shred', icon: 'shred', gcd: D.catGcd, target: 'enemy', range: 'melee',
    animation: 'slash',
    cost: freeWithClearcasting(shredCost),
    requirements: needsBehind,
    description: () => `Shred the target for ${D.shred.percent * 100}% of weapon damage plus ${Math.round(D.shred.bonus * D.shred.percent)}. Must be behind the target. Awards 1 combo point.`,
    use: (c, t) => { builder(c, t!, 'shred', (c.weaponDamage('main') + D.shred.bonus) * D.shred.percent); },
  },
  {
    id: 'claw', name: 'Claw', icon: 'claw', gcd: D.catGcd, target: 'enemy', range: 'melee',
    animation: 'strike1',
    cost: freeWithClearcasting(clawCost),
    description: () => `Claw the enemy for ${Math.round(D.claw.percent * 100)}% of weapon damage plus ${Math.round(D.claw.bonus * D.claw.percent)}. From any side. Awards 1 combo point.`,
    use: (c, t) => { builder(c, t!, 'claw', (c.weaponDamage('main') + D.claw.bonus) * D.claw.percent); },
  },
  {
    id: 'rake', name: 'Rake', icon: 'rake', gcd: D.catGcd, target: 'enemy', range: 'melee',
    animation: 'strike2',
    cost: freeWithClearcasting(rakeCost),
    description: (c) => `Rake the target for ${Math.round(D.rake.initial + D.rake.apInitial * c.attackPower())} damage and ${Math.round((D.rake.tick + D.rake.apTick * c.attackPower()) * D.rake.ticks)} more over ${D.rake.ticks * D.rake.period} sec (both grow with attack power). Ignores armor; the ticks can crit. Awards 1 combo point.`,
    use: (c, t) => {
      const u = t!;
      // Attack power, fixed when Rake lands (gs, fitted to beta logs; provisional).
      const ap = c.attackPower();
      if (landed(builder(c, u, 'rake', D.rake.initial + D.rake.apInitial * ap, { ignoreArmor: true }))) {
        bleed(c, u, 'rake', 'Rake', D.rake.ticks, D.rake.period, () => D.rake.tick + D.rake.apTick * ap, { genesis: T(c).genesis });
      }
    },
  },
  {
    id: 'rip', name: 'Rip', icon: 'rip', gcd: D.catGcd, target: 'enemy', range: 'melee',
    animation: 'stab',
    cost: freeWithClearcasting(() => D.rip.cost),
    requirements: needsComboPoints,
    usable: hasPoints,
    description: (c) => `Finishing move: a bleed for ${ripTicks(c)} ticks over ${ripTicks(c) * D.rip.period} sec. 5 points: ${Math.round(ripTick(c, 5))} per tick. Ignores armor; the ticks can crit and use your attack power each tick.`,
    use: (c, t) => {
      const u = t!;
      const done = finisher(c, u, 'rip');
      if (!done) return;
      const cp = done.cp;
      bleed(c, u, 'rip', 'Rip', ripTicks(c), D.rip.period, (cc) => ripTick(cc, cp), { genesis: T(c).genesis });
      c.count('rips');
      if (cp >= 5) c.count('ripsAt5');
    },
  },
  {
    id: 'ferociousBite', name: 'Ferocious Bite', icon: 'ferociousBite', gcd: D.catGcd, target: 'enemy', range: 'melee',
    animation: 'jab',
    cost: freeWithClearcasting(() => D.ferociousBite.cost),
    requirements: needsComboPoints,
    usable: hasPoints,
    description: (c) => {
      const f = D.ferociousBite;
      return `Finishing move: ${f.min}-${f.max} damage plus ${f.perCp} and ${f.apPerCp * 100}% of attack power per combo point, and ${f.perEnergy} per extra Energy, which it spends too. 5 points: ${f.min + 5 * f.perCp}-${f.max + 5 * f.perCp} plus ${Math.round(c.attackPower() * f.apPerCp * 5)}.`;
    },
    use: (c, t) => {
      const u = t!;
      const done = finisher(c, u, 'ferociousBite');
      if (!done) return;
      const f = D.ferociousBite;
      // The extra Energy is only spent when the bite lands.
      const extra = c.player.resource;
      c.player.resource = 0;
      const base = f.min + c.random() * (f.max - f.min) + done.cp * (f.perCp + f.apPerCp * c.attackPower()) + f.perEnergy * extra;
      const amount = c.physicalDamage(u, 'ferociousBite', base, done.outcome);
      c.deal({ target: u, source: 'ferociousBite', outcome: done.outcome, school: 'physical', amount, white: false, hand: 'main', weaponStrike: true });
      c.count('bites');
      if (done.cp >= 5) c.count('bitesAt5');
    },
  },
  {
    id: 'shiftingPower', name: 'Shifting Power', icon: 'shiftingPower', gcd: D.catGcd, target: 'self',
    animation: 'cast',
    manaCost: shiftingPowerMana,
    cooldown: shiftingPowerCooldown,
    requirements: (c) => talent('shiftingPower', 'Shifting Power').requirements(c) ?? (c.player.resource >= c.player.maxResource ? 'Your Energy is full' : null),
    usable: (c) => T(c).shiftingPower > 0,
    description: (c) => `Gain ${shiftingPowerEnergy(c)} Energy for ${shiftingPowerMana(c)} mana. Not at full Energy. The Forever replacement for powershifting: you stay in Cat Form.`,
    use: (c) => {
      const n = shiftingPowerEnergy(c);
      c.addResource(n);
      c.count('shiftingPower');
      if (!c.manaLocked) c.count('shiftingPowerMana', shiftingPowerMana(c));
      note(c, `+${n} Energy`, 'resource');
    },
  },
  {
    id: 'berserk', name: 'Berserk', icon: 'berserk', gcd: 0, target: 'self',
    cooldown: D.berserk.cooldown,
    ...talent('berserk', 'Berserk'),
    description: () => `For ${D.berserk.duration} sec your Shred, Claw, Rake, Ravage and Pounce always crit; with Blood Frenzy each of them awards 2 combo points.`,
    use: (c) => { c.applyAura(c.player, { id: 'berserk', name: 'Berserk', icon: 'berserk', duration: D.berserk.duration }); },
  },
  faerieFire({ gcd: D.catGcd, cooldown: D.faerieFire.cooldown }),
  {
    id: 'ravage', name: 'Ravage', icon: 'ravage', gcd: D.catGcd, target: 'enemy', range: 'melee',
    animation: 'throw',
    cost: freeWithClearcasting(() => D.ravage.cost),
    requirements: (c, t) => needsProwl(c) ?? needsBehind(c, t),
    usable: (c) => c.stealthed(),
    description: () => `Ravage the target for ${D.ravage.percent * 100}% of weapon damage plus ${Math.round(D.ravage.bonus * D.ravage.percent)}. Must be prowling and behind the target. Awards 1 combo point.`,
    use: (c, t) => { builder(c, t!, 'ravage', (c.weaponDamage('main') + D.ravage.bonus) * D.ravage.percent); },
  },
  {
    id: 'pounce', name: 'Pounce', icon: 'pounce', gcd: D.catGcd, target: 'enemy', range: 'melee',
    animation: 'throw',
    cost: freeWithClearcasting(() => D.pounce.cost),
    requirements: (c, t) => needsProwl(c) ?? needsBehind(c, t),
    usable: (c) => c.stealthed(),
    description: () => `Pounce: stuns the target for ${D.pounce.stun} sec and bleeds it for ${D.pounce.total} over ${D.pounce.ticks * D.pounce.period} sec. Must be prowling and behind. Awards 1 combo point.`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollSpecial(u, 'pounce');
      useClearcasting(c);
      if (!landed(outcome)) {
        c.refund(D.catRefund);
        c.deal({ target: u, source: 'pounce', outcome, school: 'physical', amount: 0, white: false });
        return;
      }
      c.applyAura(u, { id: 'pounceStun', name: 'Pounce', icon: 'pounce', duration: D.pounce.stun });
      bleed(c, u, 'pounce', 'Pounce', D.pounce.ticks, D.pounce.period, () => D.pounce.total / D.pounce.ticks, { genesis: T(c).genesis });
      c.addComboPoints(u, 1);
    },
  },
  {
    id: 'prowl', name: 'Prowl', icon: 'prowl', gcd: 0, target: 'self', keepsStealth: true,
    requirements: (c) => (c.player.inCombat ? UI.cantInCombat : null),
    usable: (c) => !c.player.inCombat,
    highlight: (c) => c.stealthed(),
    description: () => `Sneak at ${Math.round((1 - D.prowl.speed) * 100)}% less speed. Opens Ravage and Pounce. Breaks when you attack. Press again to stop prowling.`,
    use: (c) => {
      if (c.stealthed()) { c.breakStealth(); return; }
      prowl(c);
    },
  },
  {
    id: 'cower', name: 'Cower', icon: 'cower', gcd: D.catGcd, target: 'enemy', range: 'melee',
    animation: 'block',
    cost: () => D.cower.cost, cooldown: D.cower.cooldown,
    description: () => `Lowers your threat by ${-D.cower.threat} (doubled in Forever).`,
    use: (c) => { c.addThreat(D.cower.threat); },
  },
  {
    id: 'thistleTea', name: 'Thistle Tea', icon: 'thistleTea', gcd: 0, target: 'self',
    cooldown: D.thistleTea.cooldown,
    animation: 'drink',
    description: () => `Instantly restores ${D.thistleTea.energy} Energy. Druids can drink it in Cat Form.`,
    use: (c) => { c.addResource(D.thistleTea.energy); },
  },
  manaPotion,
  {
    id: 'dash', name: 'Dash', icon: 'dash', gcd: 0, target: 'self', keepsStealth: true,
    cooldown: D.dash.cooldown,
    description: () => `Increases your speed by ${Math.round((D.dash.speed - 1) * 100)}% for ${D.dash.duration} sec. Works while prowling.`,
    use: (c) => { c.applyAura(c.player, { id: 'dash', name: 'Dash', icon: 'dash', duration: D.dash.duration, speed: D.dash.speed }); },
  },
];

// ----------------------------------------------------------------- setup
const ABILITY_SOURCES = ['shred', 'claw', 'rake', 'rip', 'ferociousBite', 'ravage', 'pounce'];

function prepare(c: Combat): void {
  const t = T(c);
  const p = c.player;
  resetState(c);
  p.maxResource = 100;
  p.regenPerSecond = 10;
  // The second pool: mana for Shifting Power.
  p.maxMana = Math.max(0, Number(c.options.mana ?? 3000));
  p.manaPerSecond = Math.max(0, Number(c.options.manaRegen ?? 8));
  c.manaLocked = !!c.options.lockMana;

  c.mod.crit = 3 * t.sharpenedClaws + 2 * t.naturesMajesty;
  c.mod.hit = 2 * t.naturesReach;
  c.mod.threat = D.catThreat;
  c.mod.physicalDamage = 1 + 0.01 * t.naturalist;
  c.mod.vsBleeding = 0.02 * t.rendAndTear;
  for (const id of ['shred', 'claw', 'rake']) c.mod.damageFor[id] = 1 + 0.05 * t.savageFury;
  // Natural Instinct: ability crits only, not white hits.
  for (const id of ABILITY_SOURCES) c.mod.critMultiplierFor[id] = c.rules.critMultiplier + 0.1 * t.naturalInstinct;
  if (t.leaderOfThePack) c.applyAura(p, LEADER_OF_THE_PACK);

  c.trackedTargetAuras.push('rip', 'faerieFire', 'rake');
  c.trackedAuras.push('clearcasting');

  // Omen of Clarity on any landed cat hit, white or special (1.0 s form speed).
  c.onHit.push((_hit: Hit) => omen(c, 1));
}

// ------------------------------------------------------------- rotation
/**
 * gs's ranked cat list, with the practice yard's opener and Faerie Fire
 * (research/druid_forever.md → "Our hint version").
 */
function suggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const p = c.player;
  const tl = T(c);
  const cp = c.comboPointsOn(t);
  const energy = p.resource;
  const ready = (id: string) => c.cooldownLeft(id).left === 0 && (c.ability(id)?.usable?.(c) ?? true);
  if (c.stealthed()) return 'ravage';
  if (!p.inCombat && ready('prowl')) return 'prowl';
  if (c.options.thistleTea !== false && p.inCombat && energy <= 10 && ready('thistleTea')) return 'thistleTea';
  if (p.inCombat && tl.berserk && ready('berserk')) return 'berserk';
  if (c.options.faerieFire && faerieFireLeft(c, t) <= 0 && ready('faerieFire')) return 'faerieFire';
  const rip = c.aura(t, 'rip');
  if (cp >= 5 && rip && rip.end - c.t >= 5) return 'ferociousBite';
  if (cp >= 4 && !rip) return 'rip';
  // gs keeps Rake up since it scales with attack power (Oct 16).
  if (cp < 5 && !c.aura(t, 'rake') && energy >= c.cost(c.ability('rake')!)) return 'rake';
  const enoughMana = c.manaLocked || p.mana >= shiftingPowerMana(c);
  if (tl.shiftingPower && energy <= 60 && ready('shiftingPower') && enoughMana) return 'shiftingPower';
  if (!c.manaLocked && p.inCombat && p.mana < shiftingPowerMana(c) && ready('manaPotion')) return 'manaPotion';
  return c.behind(t) ? 'shred' : 'claw';
}

// ------------------------------------------------------- practice helpers
function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, n).toFixed(1)}%`;
  const r = c.rules;
  const hit = c.totalHit();
  const omenChance = ((D.omen.ppm * 1) / 60) * 100;
  const procs: [string, string][] = [
    ['Clearcasting (Omen of Clarity): next attack free', `${pct(omenChance)} per landed hit, ${D.omen.icd} s cooldown (2 per minute, provisional)`],
  ];
  if (tl.bloodFrenzy) procs.push(['Blood Frenzy: +1 combo point on a builder crit', `${50 * tl.bloodFrenzy}%`]);
  if (c.raid.has('judgementOfWisdom')) procs.push(['Judgement of Wisdom: +59 mana', '50% per landed hit']);
  if (c.raid.has('windfury')) procs.push(['Windfury Totem: extra attack', '20% per landed hit, 1.5 s cooldown']);
  return [
    {
      title: 'Your attacks',
      rows: [
        ['Crit chance (gear + talents, minus 4.8% vs a +3 boss)', pct(c.critChance('shred'))],
        ['Crit with Berserk (Shred, Claw, Rake, Ravage)', '100%'],
        ['Auto attack: miss / dodge / glancing', `${pct(r.specialMiss - hit)} / ${pct(c.dodgeChance())} / ${pct(r.glanceChance)}`],
        ['Abilities: miss / dodge', `${pct(r.specialMiss - hit)} / ${pct(c.dodgeChance())}`],
        ['Parry and block if you stand in front', `${pct(r.parryFromFront)} / 5.0%`],
        ['Faerie Fire misses (spell table)', pct(Math.max(1, r.spellMiss - hit))],
      ],
    },
    { title: 'Procs', rows: procs },
    {
      title: 'Rhythm',
      rows: [
        ['Energy', '10 per second, smooth; max 100'],
        ['Global cooldown', `${D.catGcd.toFixed(1)} s on every cat attack`],
        ['Cat swing', '1.0 s (weapon DPS + AP/14 per swing)'],
        ['Shifting Power', `+${shiftingPowerEnergy(c)} Energy every ${shiftingPowerCooldown(c)} s for ${shiftingPowerMana(c)} mana`],
        ['Shred / Claw / Rake cost', `${shredCost(c)} / ${clawCost(c)} / ${rakeCost(c)} Energy`],
        ['Rip', `${ripTicks(c)} ticks over ${ripTicks(c) * D.rip.period} s`],
      ],
    },
  ];
}

function review(c: Combat): { label: string; value: string; good?: boolean }[] {
  const k = c.counters;
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const pctOf = (n: number) => `${Math.round(n * 100)}%`;
  const uptime = (key: string) => (k[key] ?? 0) / time;
  const wasted = k.resourceWasted ?? 0;
  const perMinute = wasted / (time / 60);
  const bites = k.bites ?? 0;
  const rows: { label: string; value: string; good?: boolean }[] = [
    { label: 'Rip uptime', value: pctOf(uptime('uptime:target:rip')), good: uptime('uptime:target:rip') >= 0.75 },
    { label: 'Energy wasted at full', value: `${Math.round(wasted)} (${Math.round(perMinute)}/min)`, good: perMinute < 30 },
    { label: 'Ferocious Bites at 5 points', value: bites ? `${k.bitesAt5 ?? 0} of ${bites}` : '-', good: bites === 0 || (k.bitesAt5 ?? 0) / bites >= 0.8 },
    { label: 'Shifting Power casts', value: String(k.shiftingPower ?? 0) },
    { label: 'Clearcasting procs / used', value: `${k.clearcasting ?? 0} / ${k.clearcastingUsed ?? 0}` },
  ];
  if (c.options.faerieFire) rows.push({ label: 'Faerie Fire uptime', value: pctOf(uptime('uptime:target:faerieFire')), good: uptime('uptime:target:faerieFire') >= 0.9 });
  if (T(c).bloodFrenzy) rows.push({ label: 'Blood Frenzy combo points', value: `+${k.bloodFrenzy ?? 0}` });
  if (!c.manaLocked) {
    rows.push({ label: 'Mana on Shifting Power / back from Judgement', value: `${Math.round(k.shiftingPowerMana ?? 0)} / ${Math.round(k.manaOnHit ?? 0)}` });
  }
  return rows;
}

export const druidCat: Spec = {
  id: 'druid-cat',
  className: 'Druid',
  specName: 'Feral Cat',
  resource: 'energy',
  comboPoints: true,
  form: () => 'cat',
  forms: { cat: { fur: 0x3b2c5a, belly: 0x6a5a86, eyes: 0xb6ff8a } },
  abilities,
  stats: CAT_STATS,
  rules: BOSS_RULES,
  builds: buildsFor('cat').map((b) => ({ id: b.id, label: buildLabel(b), name: b.name, source: 'gunba/wow-forever-sim', talentString: b.talentString, stats: b.stats, bar: b.bar, trees: summary(talentsFor(b.id, 'cat')) })),
  defaultOptions: {
    build: 'cat', mana: 3000, manaRegen: 8, lockMana: false,
    wolfshead: true, howlingIdol: true, idolOfTheDream: false, thistleTea: true, faerieFire: true,
  },
  defaultRaid: ['judgementOfWisdom', 'blessingOfWisdom', 'manaSpring'],
  prefsRevision: 2,
  options: [
    { key: 'faerieFire', name: 'You keep Faerie Fire up (free in Cat Form)', kind: 'toggle' },
    { key: 'thistleTea', name: 'Use Thistle Tea', kind: 'toggle' },
    { key: 'wolfshead', name: 'Wolfshead Helm (+5 Energy from Shifting Power)', kind: 'toggle' },
    { key: 'howlingIdol', name: 'Howling Idol (Shifting Power cooldown -0.5 sec since Oct 15)', kind: 'toggle' },
    { key: 'idolOfTheDream', name: 'Idol of the Dream (Rip +2 sec)', kind: 'toggle' },
    { key: 'mana', name: 'Mana pool', kind: 'number', step: 100 },
    { key: 'manaRegen', name: 'Mana regeneration per second', kind: 'number', step: 1 },
    { key: 'lockMana', name: 'Lock your mana (Shifting Power costs nothing)', kind: 'toggle' },
  ],
  sheet: { spellCrit: false, mainHand: 'Weapon (its DPS is your cat swing)' },
  bar: buildById('cat', 'cat').bar,
  welcome: 'Welcome to the Feral Cat practice yard. Energy flows smoothly, Shifting Power is the Forever powershift (paid in mana) and Omen of Clarity is baseline. Open with Prowl and Ravage from behind, keep Rip up, bite at 5 points and Shred everything else.',
  help: `${CONTROLS}
    Energy regenerates smoothly at 10 per second. The global cooldown is 1.0 sec for every cat attack. A cat swings every 1.0 sec for your weapon's DPS plus AP/14; Shred and Claw use the same weapon damage.
    Shifting Power gives 40 Energy (45 with Wolfshead Helm) for 684 mana, every 8 sec with Improved Shifting Power, and cannot be used at full Energy. Mana is the second bar: Judgement of Wisdom on the dummy gives mana back on your hits, Blessing of Wisdom and Mana Spring Totem add 8 and 5 per second (all three are on by default under Raid buffs and debuffs), Major Mana Potions do the rest; you can also lock it.
    Clearcasting (Omen of Clarity, baseline) makes your next attack free. With Blood Frenzy a builder crit adds a combo point; Berserk makes every builder crit for 15 sec.
    Shred needs you behind the target; Claw works from any side. Ravage and Pounce open from Prowl. Rip and Rake ticks can crit and ignore armor. Ferocious Bite spends your extra Energy too.
    The yellow glow follows the WoW Forever sims' cat list: Rip at 4+ points when it is missing, Ferocious Bite at 5 points while Rip has 5+ sec left, Shifting Power at 60 Energy or less, Shred.
    This is a practice tool: crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x2f4a2a, leatherColor: 0x4a3a28, hood: false },
  sources: SOURCES,
  prepare,
  suggest,
  chances,
  review,
};
