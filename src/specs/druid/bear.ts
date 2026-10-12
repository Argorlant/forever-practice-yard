// Feral Bear (tank) for WoW Forever: normalized rage, the dummy attacks you,
// Lacerate stacks, Primal Bite, Maul on the next swing, threat x1.5.
// Numbers in ./data.ts, builds in ./talents.ts; sources in
// research/druid_forever.md â†’ Feral Bear.
import type { Combat, Incoming } from '../../engine/combat';
import type { Ability, Hit, Outcome, Spec, Unit } from '../../engine/types';
import { LEADER_OF_THE_PACK } from '../../engine/raid';
import { BOSS_RULES } from '../common';
import { BEAR_STATS } from './data';
import {
  CONTROLS, D, SOURCES, YARD, attack, barkskin, bleed, faerieFire, faerieFireLeft, freeWithClearcasting, landed, note, omen,
  resetState, roll, useClearcasting,
} from './shared';
import { buildById, buildLabel, buildsFor, summary, talentsFor, type Talents } from './talents';

const T = (c: Combat): Talents => talentsFor(c.options.build, 'bear');

/** Rage from damage taken, shared with warriors (8 Oct model): raw x (1 - 39.3 %) x coefficient / 4,365. */
const INCOMING = { coefficient: 10, expectedHealth: 4365, referenceArmor: 0.393 };
const RAGE_POTION = { min: 45, max: 75, ap: 120, duration: 20, cooldown: 120 };
const THREAT_PER_RAGE = 5;

// ------------------------------------------------------------------- rage
/** Rage from abilities and talents also makes threat: 5 per rage. */
function gainRage(c: Combat, n: number): void {
  c.addResource(n);
  c.addThreat(n * THREAT_PER_RAGE, { ignoreStance: true });
}
const swingRage = (crit: boolean) => D.bearRagePerSwing * (crit ? D.bearCritFactor : 1);
const incomingRage = (c: Combat, raw: number) =>
  (raw * (1 - INCOMING.referenceArmor) * Number(c.options.incomingRage ?? INCOMING.coefficient)) / INCOMING.expectedHealth;

// --------------------------------------------------------------- helpers
const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});
const others = (c: Combat, t: Unit, yards = 8) => c.targets.filter((u) => u !== t && u.health > 0 && c.inRange(u, yards));
const berserk = (c: Combat) => !!c.aura(c.player, 'berserk');

/** A bear attack: avoided attacks refund 80 % (Swipe none). Threat multipliers come from mod.threatFor. */
function strike(c: Combat, t: Unit, id: string, base: number, opts: { refund?: boolean } = {}): Outcome {
  const outcome = c.rollSpecial(t, id);
  if (!landed(outcome)) {
    if (opts.refund !== false) c.refund(D.catRefund);
    c.deal({ target: t, source: id, outcome, school: 'physical', amount: 0, white: false, hand: 'main' });
    return outcome;
  }
  const amount = c.physicalDamage(t, id, base, outcome);
  c.deal({ target: t, source: id, outcome, school: 'physical', amount, white: false, hand: 'main', weaponStrike: true });
  return outcome;
}

const lacerateStacks = (c: Combat, t: Unit | null) => (t ? c.aura(t, 'lacerate')?.stacks ?? 0 : 0);

// ------------------------------------------------------------- abilities
const abilities: Ability[] = [
  { ...attack, description: () => 'Starts your auto attack. A bear swings every 2.5 sec; each landed swing gives 11.25 rage (22.5 on a crit).' },
  {
    id: 'maul', name: 'Maul', icon: 'maul', gcd: 0, target: 'enemy', range: 'melee', onNextSwing: true,
    animation: 'cross',
    cost: freeWithClearcasting((c) => D.maul.cost - T(c).ferocity),
    description: () => `Your next swing deals weapon damage plus ${D.maul.bonus} and extra threat. Press again to cancel. The rage is spent when it lands, and that swing gives no rage.`,
    use: (c, t) => {
      useClearcasting(c);
      strike(c, t!, 'maul', c.weaponDamage('main') + D.maul.bonus);
    },
  },
  {
    id: 'primalBite', name: 'Primal Bite', icon: 'primalBite', gcd: D.bearGcd, target: 'enemy', range: 'melee',
    animation: 'stab',
    cost: freeWithClearcasting((c) => D.primalBite.cost - T(c).ferocity),
    cooldown: (c) => (berserk(c) ? 0 : D.primalBite.cooldown),
    ...talent('primalBite', 'Primal Bite'),
    description: () => `Bite for weapon damage plus ${D.primalBite.bonus} and high threat. ${D.primalBite.cooldown} sec cooldown; during Berserk no cooldown and it hits 3 targets.`,
    use: (c, t) => {
      useClearcasting(c);
      const targets = berserk(c) ? [t!, ...others(c, t!).slice(0, 2)] : [t!];
      for (const u of targets) strike(c, u, 'primalBite', c.weaponDamage('main') + D.primalBite.bonus, { refund: u === t });
    },
  },
  {
    id: 'lacerate', name: 'Lacerate', icon: 'lacerate', gcd: D.bearGcd, target: 'enemy', range: 'melee',
    animation: 'strike1',
    cost: freeWithClearcasting((c) => D.lacerate.cost - T(c).shreddingAttacks),
    description: (c) => `A bleed that stacks ${D.lacerate.stacks} times: ${D.lacerate.tick} damage per stack every ${D.lacerate.period} sec for ${D.lacerate.duration} sec. The hit deals ${D.lacerate.hitPerStack * 100}% of weapon damage per stack already on the target. High threat. Stacks now: ${lacerateStacks(c, c.target)}.`,
    use: (c, t) => {
      const u = t!;
      useClearcasting(c);
      const before = lacerateStacks(c, u);
      const outcome = strike(c, u, 'lacerate', c.weaponDamage('main') * D.lacerate.hitPerStack * Math.max(1, before));
      if (!landed(outcome)) return;
      const stacks = Math.min(D.lacerate.stacks, before + 1);
      bleed(c, u, 'lacerate', 'Lacerate', D.lacerate.duration / D.lacerate.period, D.lacerate.period, (_cc, n) => D.lacerate.tick * n, { genesis: T(c).genesis, stacks });
    },
  },
  {
    id: 'swipe', name: 'Swipe', icon: 'swipe', gcd: D.bearGcd, target: 'enemy', range: 'melee', needsFacing: false,
    animation: 'hook',
    cost: freeWithClearcasting((c) => D.swipe.cost - T(c).ferocity),
    description: (c) => `Swipe up to ${D.swipe.targets} nearby enemies for ${Math.round(D.swipe.base + D.swipe.apRatio * c.attackPower())} (${D.swipe.base} plus ${D.swipe.apRatio * 100}% of attack power).`,
    use: (c, t) => {
      useClearcasting(c);
      for (const u of [t!, ...others(c, t!).slice(0, D.swipe.targets - 1)]) {
        strike(c, u, 'swipe', D.swipe.base + D.swipe.apRatio * c.attackPower(), { refund: false });
      }
    },
  },
  {
    id: 'demoralizingRoar', name: 'Demoralizing Roar', icon: 'demoralizingRoar', gcd: D.bearGcd, target: 'self',
    animation: 'cast',
    cost: freeWithClearcasting(() => D.demoralizingRoar.cost),
    description: () => `Lowers the attack power of nearby enemies by ${D.demoralizingRoar.apReduction} for ${D.demoralizingRoar.duration} sec: the dummy hits you softer. Does not stack with Demoralizing Shout.`,
    use: (c) => {
      useClearcasting(c);
      const d = D.demoralizingRoar;
      for (const u of c.targets.filter((x) => x.health > 0 && c.inRange(x, 10))) {
        c.applyAura(u, { id: 'demoralizingRoar', name: 'Demoralizing Roar', icon: 'demoralizingRoar', duration: d.duration, apReduction: d.apReduction });
        c.addThreat(d.threat);
      }
    },
  },
  faerieFire({ gcd: D.bearGcd, cooldown: D.faerieFire.cooldown }),
  {
    id: 'druidEnrage', name: 'Enrage', icon: 'druidEnrage', gcd: 0, target: 'self',
    cooldown: D.enrage.cooldown,
    description: (c) => `Gain ${D.enrage.now + (c.options.wolfshead ? 5 : 0)} rage now and ${D.enrage.perSecond * D.enrage.duration} over ${D.enrage.duration} sec. Your armor is 16% lower meanwhile.`,
    use: (c) => {
      const e = D.enrage;
      gainRage(c, e.now + (c.options.wolfshead ? 5 : 0));
      c.applyAura(c.player, {
        id: 'druidEnrage', name: 'Enrage', icon: 'druidEnrage', duration: e.duration, period: 1, playerArmor: 0.84,
        onTick: (cc) => gainRage(cc, e.perSecond),
      });
    },
  },
  {
    id: 'berserk', name: 'Berserk', icon: 'berserk', gcd: 0, target: 'self',
    cooldown: D.berserk.cooldown,
    ...talent('berserk', 'Berserk'),
    description: () => `For ${D.berserk.duration} sec Primal Bite has no cooldown and hits up to 3 targets.`,
    use: (c) => {
      c.applyAura(c.player, { id: 'berserk', name: 'Berserk', icon: 'berserk', duration: D.berserk.duration });
      c.clearCooldown('primalBite');
    },
  },
  {
    id: 'frenziedRegeneration', name: 'Frenzied Regeneration', icon: 'frenziedRegeneration', gcd: D.bearGcd, target: 'self',
    animation: 'cast',
    cooldown: D.frenziedRegeneration.cooldown,
    description: () => `For ${D.frenziedRegeneration.duration} sec, each second turns up to ${D.frenziedRegeneration.ragePerSecond} rage into 1% of your maximum health per rage. Unlock your health in Settings to see it heal.`,
    use: (c) => {
      c.applyAura(c.player, {
        id: 'frenziedRegeneration', name: 'Frenzied Regeneration', icon: 'frenziedRegeneration', duration: D.frenziedRegeneration.duration, period: 1,
        onTick: (cc) => {
          const p = cc.player;
          const n = Math.min(D.frenziedRegeneration.ragePerSecond, Math.floor(p.resource));
          if (n <= 0) return;
          p.resource -= n;
          p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.01 * n);
          cc.count('frenziedHealing', p.maxHealth * 0.01 * n);
        },
      });
    },
  },
  barkskin(D.bearGcd),
  {
    id: 'bash', name: 'Bash', icon: 'bash', gcd: D.bearGcd, target: 'enemy', range: 'melee',
    animation: 'cross',
    cost: freeWithClearcasting(() => D.bash.cost),
    cooldown: (c) => D.bash.cooldown - 15 * T(c).brutalImpact,
    description: (c) => `Stuns the target for ${D.bash.duration + 0.5 * T(c).brutalImpact} sec. Most bosses are immune.`,
    use: (c, t) => {
      useClearcasting(c);
      if (landed(strike(c, t!, 'bash', 0))) c.applyAura(t!, { id: 'bash', name: 'Bash', icon: 'bash', duration: D.bash.duration + 0.5 * T(c).brutalImpact });
    },
  },
  {
    id: 'feralCharge', name: 'Feral Charge', icon: 'feralCharge', gcd: 0, target: 'enemy', range: D.feralCharge.maxRange, needsFacing: false,
    cost: () => D.feralCharge.cost, cooldown: D.feralCharge.cooldown,
    requirements: (c, t) => talent('feralCharge', 'Feral Charge').requirements(c) ?? (t && c.distance(t) < D.feralCharge.minRange * YARD ? 'Target too close' : null),
    usable: (c) => T(c).feralCharge > 0,
    description: () => `Charge an enemy from ${D.feralCharge.minRange} to ${D.feralCharge.maxRange} yards away, rooting it and interrupting spells for 4 sec.`,
    use: (c, t) => {
      c.emit('dash', t!);
      c.applyAura(t!, { id: 'feralCharge', name: 'Feral Charge', icon: 'feralCharge', duration: 4 });
    },
  },
  {
    id: 'growl', name: 'Growl', icon: 'growl', gcd: 0, target: 'enemy', range: 20, needsFacing: false,
    cooldown: 8,
    description: () => 'Taunts the target to attack you for 3 sec.',
    use: (c, t) => { c.applyAura(t!, { id: 'growl', name: 'Growl', icon: 'growl', duration: 3 }); },
  },
  {
    id: 'ragePotion', name: 'Mighty Rage Potion', icon: 'ragePotion', gcd: 0, target: 'self',
    cooldown: RAGE_POTION.cooldown, cooldownGroup: 'potion',
    animation: 'drink',
    description: () => `Gain ${RAGE_POTION.min} to ${RAGE_POTION.max} rage and ${RAGE_POTION.ap} attack power (60 Strength) for ${RAGE_POTION.duration} sec. Works in Bear Form.`,
    use: (c) => {
      const n = Math.round(RAGE_POTION.min + c.random() * (RAGE_POTION.max - RAGE_POTION.min));
      gainRage(c, n);
      c.applyAura(c.player, { id: 'ragePotion', name: 'Mighty Rage', icon: 'ragePotion', duration: RAGE_POTION.duration, attackPower: RAGE_POTION.ap });
      note(c, `+${n} Rage`, 'resource');
    },
  },
];

// ----------------------------------------------------------------- setup
const ABILITY_SOURCES = ['maul', 'primalBite', 'lacerate', 'swipe'];

function prepare(c: Combat): void {
  const t = T(c);
  const p = c.player;
  resetState(c);
  p.maxResource = 100;
  p.regenPerSecond = 0;
  p.decayPerSecond = 1;

  c.mod.crit = 3 * t.sharpenedClaws + 2 * t.naturesMajesty;
  c.mod.hit = 2 * t.naturesReach;
  c.mod.threat = D.bearThreat;
  c.mod.threatFor = { maul: D.maul.threat, primalBite: D.primalBite.threat, lacerate: D.lacerate.threat, swipe: D.swipe.threat };
  c.mod.physicalDamage = 1 + 0.01 * t.naturalist;
  c.mod.vsBleeding = 0.02 * t.rendAndTear;
  c.mod.damageFor = { maul: 1 + 0.05 * t.savageFury, swipe: (1 + 0.05 * t.savageFury) * (1 + 0.1 * t.feralInstinct) };
  for (const id of ABILITY_SOURCES) c.mod.critMultiplierFor[id] = c.rules.critMultiplier + 0.1 * t.naturalInstinct;
  if (t.leaderOfThePack) c.applyAura(p, LEADER_OF_THE_PACK);

  c.trackedAuras.push('barkskin');
  c.trackedTargetAuras.push('lacerate', 'demoralizingRoar', 'faerieFire');

  // Landed white swings: normalized rage (a queued Maul's swing gives none). Omen at the 2.5 s form speed.
  c.onHit.push((hit: Hit) => {
    if (hit.white) {
      const rage = swingRage(hit.outcome === 'crit');
      c.addResource(rage);
      c.count('swingRage', rage);
    }
    omen(c, 2.5);
  });
  // Blood Frenzy: any crit in Bear Form can give 5 rage.
  c.afterDamage.push((hit: Hit) => {
    if (hit.periodic || hit.outcome !== 'crit' || !t.bloodFrenzy) return;
    if (roll(c, 50 * t.bloodFrenzy)) {
      gainRage(c, 5);
      c.count('bloodFrenzyRage', 5);
    }
  });
  // The attacking dummy: rage from damage taken and Natural Reaction on a dodge.
  c.onIncoming.push((i: Incoming) => {
    // Unmitigated damage: crits and crushing blows give more, armor and Barkskin do not lower it; a dodge gives none.
    if (i.raw > 0) {
      const rage = incomingRage(c, i.raw);
      c.addResource(rage);
      c.count('incomingRage', rage);
    }
    if (i.outcome === 'dodge' && t.naturalReaction && roll(c, 20 * t.naturalReaction)) {
      gainRage(c, 5);
      c.count('naturalReaction', 5);
      note(c, 'Natural Reaction +5 Rage', 'resource');
    }
  });
}

// ------------------------------------------------------------- rotation
/** gs's ranked bear list (research/druid_forever.md â†’ Bear). */
function suggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const p = c.player;
  const tl = T(c);
  const rage = p.resource;
  const ready = (id: string) => c.cooldownLeft(id).left === 0 && (c.ability(id)?.usable?.(c) ?? true);
  const cost = (id: string) => c.cost(c.ability(id)!);
  if (!p.autoAttacking && c.inRange(t)) return 'attack';
  if (!c.playerHealthLocked && p.health / p.maxHealth < 0.3 && rage >= 10 && ready('frenziedRegeneration')) return 'frenziedRegeneration';
  if (c.enemyAttacks.on && ready('barkskin')) return 'barkskin';
  if (p.inCombat && tl.berserk && ready('berserk')) return 'berserk';
  if (p.inCombat && rage <= 60 && ready('druidEnrage')) return 'druidEnrage';
  // Demoralizing Shout from the raid does the same job.
  let demoLeft = 0;
  for (const a of t.auras.values()) if (a.apReduction) demoLeft = Math.max(demoLeft, a.end - c.t);
  if (c.enemyAttacks.on && demoLeft <= 4 && rage >= cost('demoralizingRoar')) return 'demoralizingRoar';
  if (faerieFireLeft(c, t) <= 3 && ready('faerieFire')) return 'faerieFire';
  if (tl.primalBite && ready('primalBite') && rage >= cost('primalBite')) return 'primalBite';
  if (others(c, t).length >= 1 && rage >= 15) return 'swipe';
  const lac = c.aura(t, 'lacerate');
  if ((!lac || (lac.stacks ?? 0) < 5 || lac.end - c.t <= 4.5) && rage >= cost('lacerate')) return 'lacerate';
  if (!c.queuedSwing && rage >= 25) return 'maul';
  if (rage >= cost('lacerate') + 15) return 'lacerate';
  return null;
}

// ------------------------------------------------------- practice helpers
function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, n).toFixed(1)}%`;
  const r = c.rules;
  const hit = c.totalHit();
  const tbl = c.enemyTable(c.target ?? c.targets[0]);
  const avgHit = c.enemyAttacks.damage * (1 + 1 / 6 + c.enemyAttacks.ap / 2478);
  const procs: [string, string][] = [
    ['Clearcasting (Omen of Clarity): next ability free', `${pct(((D.omen.ppm * 2.5) / 60) * 100)} per landed hit, ${D.omen.icd} s cooldown (provisional)`],
  ];
  if (tl.bloodFrenzy) procs.push(['Blood Frenzy: +5 rage on any crit', `${50 * tl.bloodFrenzy}%`]);
  if (tl.naturalReaction) procs.push(['Natural Reaction: +5 rage when you dodge', `${20 * tl.naturalReaction}%`]);
  if (c.raid.has('windfury')) procs.push(['Windfury Totem: extra swing (with its rage)', '20% per landed hit, 1.5 s cooldown']);
  return [
    {
      title: 'Your attacks',
      rows: [
        ['Crit chance (gear + talents, minus 4.8% vs a +3 boss)', pct(c.critChance('maul'))],
        ['Auto attack: miss / dodge / glancing', `${pct(r.specialMiss - hit)} / ${pct(c.dodgeChance())} / ${pct(r.glanceChance)}`],
        ['Abilities: miss / dodge', `${pct(r.specialMiss - hit)} / ${pct(c.dodgeChance())}`],
        ['Parry and block if you stand in front (the dummy faces you)', `${pct(r.parryFromFront)} / 5.0%`],
      ],
    },
    {
      title: 'Rage (WoW Forever, normalized)',
      rows: [
        ['Per landed swing / crit', `${swingRage(false).toFixed(2)} / ${swingRage(true).toFixed(1)} rage`],
        ['Misses, dodges, parries, Maul swings', '0 rage'],
        ['Per hit taken: normal / crit / crushing blow (unmitigated damage)', [1, 2, 1.5].map((m) => incomingRage(c, m * avgHit).toFixed(1)).join(' / ') + ' rage'],
        ['Hits you dodge or that miss you', '0 rage (Natural Reaction: +5 on a dodge)'],
      ],
    },
    { title: 'Procs', rows: procs },
    {
      title: 'The attacking dummy against you',
      rows: [
        ['Miss / dodge (bears cannot parry or block)', `${pct(tbl.miss)} / ${pct(tbl.dodge)}`],
        ['Crit / crushing blow', `${pct(tbl.crit)} / ${pct(tbl.crush)}`],
        ['Your armor reduces its damage by', pct(c.playerArmorReduction() * 100)],
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
  const casts = (id: string) => (c.meter.rows.get(id) ? c.meter.rows.get(id)!.hits + c.meter.rows.get(id)!.misses : 0);
  const onCooldown = Math.min(1, (casts('primalBite') * D.primalBite.cooldown) / time);
  const wasted = k.resourceWasted ?? 0;
  const rows: { label: string; value: string; good?: boolean }[] = [
    { label: 'Rage wasted at 100', value: `${Math.round(wasted)}`, good: wasted / (time / 60) < 20 },
    { label: 'Lacerate uptime', value: pctOf(uptime('uptime:target:lacerate')), good: uptime('uptime:target:lacerate') >= 0.9 },
    { label: 'Primal Bite on cooldown', value: pctOf(onCooldown), good: onCooldown >= 0.8 },
    { label: 'Faerie Fire uptime', value: pctOf(uptime('uptime:target:faerieFire')), good: uptime('uptime:target:faerieFire') >= 0.9 },
  ];
  if (c.enemyAttacks.on) {
    rows.push(
      { label: 'Demoralizing Roar uptime', value: pctOf(uptime('uptime:target:demoralizingRoar')), good: uptime('uptime:target:demoralizingRoar') >= 0.9 },
      { label: 'Rage from swings / hits taken', value: `+${Math.round(k.swingRage ?? 0)} / +${Math.round(k.incomingRage ?? 0)}` },
    );
    if (T(c).naturalReaction) rows.push({ label: 'Natural Reaction rage (dodges)', value: `+${k.naturalReaction ?? 0}` });
  }
  if (T(c).bloodFrenzy) rows.push({ label: 'Blood Frenzy rage', value: `+${k.bloodFrenzyRage ?? 0}` });
  return rows;
}

export const druidBear: Spec = {
  id: 'druid-bear',
  className: 'Druid',
  specName: 'Feral Bear',
  resource: 'rage',
  showThreat: true,
  tank: true,
  tankDamage: 3000,
  form: () => 'bear',
  forms: { bear: { fur: 0x5a3b26, belly: 0x8a6a4a, eyes: 0xffd27a } },
  abilities,
  stats: BEAR_STATS,
  rules: BOSS_RULES,
  builds: buildsFor('bear').map((b) => ({ id: b.id, label: buildLabel(b), name: b.name, source: 'gunba/wow-forever-sim', talentString: b.talentString, stats: b.stats, bar: b.bar, tank: b.tank, trees: summary(talentsFor(b.id, 'bear')) })),
  defaultOptions: { build: 'bear', wolfshead: true, incomingRage: INCOMING.coefficient },
  options: [
    { key: 'wolfshead', name: 'Wolfshead Helm (+5 rage from Enrage)', kind: 'toggle' },
    { key: 'incomingRage', name: 'Rage from damage taken: coefficient (10 to 20, unconfirmed)', kind: 'number', step: 1 },
  ],
  sheet: { spellCrit: false, mainHand: 'Weapon (its DPS x 2.5 is your bear swing)' },
  bar: buildById('bear', 'bear').bar,
  welcome: 'Welcome to the Feral Bear practice yard. The dummy hits back, so rage from damage taken, dodges and Frenzied Regeneration work as in the game. Keep Lacerate at 5 stacks, Primal Bite on cooldown, Demoralizing Roar and Faerie Fire up, and Maul with spare rage.',
  help: `${CONTROLS}
    Bear rage in WoW Forever is normalized: each landed white swing gives 11.25 rage (22.5 on a crit), every 2.5 sec. Misses, dodges, parries and the swing a Maul replaces give none. Hits you take give rage from their unmitigated damage (before armor and Barkskin): about 6 for a normal hit, 12 for a crit, 9 for a crushing blow; a dodge gives none, except Natural Reaction's 5.
    Maul replaces your next swing: press once to queue, again to cancel. Primal Bite has a 6 sec cooldown (none during Berserk). Lacerate stacks 5 times and its hit grows with the stacks.
    The dummy attacks you: bears cannot parry or block, so dodge is your avoidance and crushing blows land 15% of the time. Your health is locked by default; unlock it to practice Frenzied Regeneration and Barkskin. The meter shows threat per second (x1.5 in Bear Form).
    Clearcasting (Omen of Clarity) makes your next ability free. Blood Frenzy gives 5 rage on a crit, Natural Reaction 5 rage on a dodge.
    This is a practice tool: crit, proc and rage numbers follow WoW Forever; damage and threat are an approximation.`,
  look: { clothColor: 0x2f4a2a, leatherColor: 0x4a3a28, hood: false },
  sources: SOURCES,
  prepare,
  suggest,
  chances,
  review,
};
