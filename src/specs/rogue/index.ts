// Rogue for WoW Forever: abilities, talents (from the chosen build), poisons
// and one priority list per build. Numbers live in ./data.ts, builds in
// ./talents.ts; sources in research/.
import type { Combat } from '../../engine/combat';
import type { Ability, Hand, Hit, Outcome, Spec, Unit, Weapon } from '../../engine/types';
import { UI } from '../../strings';
import { DATA, NORMALIZED_SPEED, RAID_STATS, RULES, STATS } from './data';
import { BUILDS, buildById, buildLabel, summary, talentsFor, type Talents } from './talents';

const D = DATA;
/** Talent ranks of the build chosen in Settings. */
const T = (c: Combat): Talents => talentsFor(c.options.build);
const landed = (o: Outcome) => o === 'hit' || o === 'crit' || o === 'glance';
const roll = (c: Combat, pct: number) => c.random() * 100 < pct;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Per-fight state that is not an aura: internal cooldowns of procs. */
interface RogueState { lastSealFate: number; lastHackAndSlash: number; lastThousandCuts: number }
const states = new WeakMap<Combat, RogueState>();
const state = (c: Combat) => states.get(c)!;

// --------------------------------------------------------------- helpers
function needsBehind(c: Combat, t: Unit | null): string | null {
  return t && !c.behind(t) ? UI.mustBeBehind : null;
}
function needsDagger(c: Combat): string | null {
  return c.stats.mainHand.type !== 'dagger' ? UI.needsDagger : null;
}
function needsStealth(c: Combat): string | null {
  return c.stealthed() ? null : UI.mustBeStealthed;
}
function needsComboPoints(c: Combat, t: Unit | null): string | null {
  return c.comboPointsOn(t) > 0 ? null : UI.needsComboPoints;
}
const hasPoints = (c: Combat) => c.comboPointsOn(c.target) > 0;
/** Abilities that come from a talent: unusable if the build skips it. */
const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});

/** Normalized weapon damage: the roll plus AP at a fixed speed (Forever specials). */
function normalized(c: Combat, hand: Hand = 'main'): number {
  const w = hand === 'main' ? c.stats.mainHand : c.stats.offHand;
  const speed = w?.type === 'dagger' ? NORMALIZED_SPEED.dagger : NORMALIZED_SPEED.oneHand;
  return c.weaponDamage(hand, { normalizedSpeed: speed });
}
const mhDagger = (c: Combat) => c.stats.mainHand.type === 'dagger';
/** Quietus: more damage from some builders below 35 % health. */
const quietus = (c: Combat, t: Unit) => (t.health / t.maxHealth < 0.35 ? 1 + 0.02 * T(c).quietus : 1);

/** Cold Blood: the next Sinister Strike, Backstab, Ambush, Mutilate or Eviscerate is a sure crit. */
function useColdBlood(c: Combat): boolean {
  if (!c.aura(c.player, 'coldBlood')) return false;
  c.removeAura(c.player, 'coldBlood');
  return true;
}

function note(c: Combat, text: string, kind: 'proc' | 'resource' = 'proc'): void {
  c.emit('note', { text, kind });
}

/** Premeditation's points stay only if a builder adds to them or a finisher spends them. */
function keepPremeditation(c: Combat): void {
  const a = c.aura(c.player, 'premeditation');
  if (a) { a.value = 1; c.removeAura(c.player, 'premeditation'); }
}

function addPoints(c: Combat, t: Unit, n: number): void {
  keepPremeditation(c);
  c.addComboPoints(t, n);
}

/** Seal Fate: a builder crit can add a combo point (one try per cast, 500 ms ICD). */
function sealFate(c: Combat, t: Unit): void {
  const s = state(c);
  if (T(c).sealFate && c.t - s.lastSealFate >= D.sealFateIcd && roll(c, 20 * T(c).sealFate)) {
    s.lastSealFate = c.t;
    c.addComboPoints(t, 1);
    c.count('sealFate');
    note(c, 'Seal Fate +1 combo point');
  }
}

/** A combo point builder that strikes with the main-hand weapon. */
function builder(c: Combat, t: Unit, id: string, base: number, points = 1): Outcome {
  const outcome = c.rollSpecial(t, id, { forceCrit: useColdBlood(c) });
  if (!landed(outcome)) {
    c.refund(D.builderRefund);
    c.deal({ target: t, source: id, outcome, school: 'physical', amount: 0, white: false, hand: 'main' });
    return outcome;
  }
  const amount = c.physicalDamage(t, id, base, outcome);
  c.deal({ target: t, source: id, outcome, school: 'physical', amount, white: false, hand: 'main', weaponStrike: true });
  addPoints(c, t, points);
  if (outcome === 'crit') sealFate(c, t);
  return outcome;
}

/** Initiative: openers can add a combo point. */
function initiative(c: Combat, t: Unit): void {
  const r = T(c).initiative;
  if (r && roll(c, [0, 33, 67, 100][r])) {
    c.addComboPoints(t, 1);
    c.count('initiative');
    note(c, 'Initiative +1 combo point');
  }
}

/**
 * A finisher that has to land. An avoided finisher keeps its combo points
 * (Blizzard, 1 Oct) and refunds nothing (provisional).
 */
function attackFinisher(c: Combat, t: Unit, id: string, opts: { forceCrit?: boolean } = {}): { cp: number; outcome: Outcome } | null {
  const outcome = c.rollSpecial(t, id, { forceCrit: opts.forceCrit });
  if (!landed(outcome)) {
    c.refund(D.finisherRefund);
    c.deal({ target: t, source: id, outcome, school: 'physical', amount: 0, white: false });
    return null;
  }
  keepPremeditation(c);
  return { cp: c.spendComboPoints(), outcome };
}

/** After any finisher: Relentless Strikes and Ruthlessness. */
function afterFinisher(c: Combat, t: Unit, cp: number): void {
  const tl = T(c);
  if (tl.relentlessStrikes && roll(c, 20 * cp)) {
    c.addResource(D.relentlessEnergy);
    c.count('relentlessEnergy', D.relentlessEnergy);
    note(c, `+${D.relentlessEnergy} Energy`, 'resource');
  }
  if (tl.ruthlessness && roll(c, 20 * tl.ruthlessness)) {
    c.addComboPoints(t, 1);
    c.count('ruthlessness');
    note(c, 'Ruthlessness +1 combo point');
  }
}

/**
 * A bleed. In Forever bleeds can crit (2x) and each tick re-reads attack
 * power and modifiers; combo points and the Hemorrhage bonus stay as cast.
 * Bleeds ignore armor.
 */
function bleed(c: Combat, t: Unit, id: string, name: string, ticks: number, period: number,
  perTick: (cc: Combat) => number, snapshot = 1, onTick?: (cc: Combat) => void): void {
  c.applyAura(t, {
    id, name, icon: id, duration: ticks * period, period,
    onTick: (cc) => {
      const crit = cc.rollTickCrit(cc.critChance(id));
      const amount = Math.round(perTick(cc) * snapshot * cc.mod.physicalDamage * (cc.mod.damageFor[id] ?? 1) * (crit ? cc.rules.critMultiplier : 1));
      cc.deal({ target: t, source: id, outcome: crit ? 'crit' : 'hit', school: 'physical', amount, white: false, periodic: true });
      onTick?.(cc);
    },
  });
}

const sndDuration = (c: Combat, cp: number) => round1((D.sliceAndDice.base + D.sliceAndDice.perCp * cp) * (1 + 0.15 * T(c).improvedSliceAndDice));
const ruptureTick = (c: Combat, cp: number) => D.rupture.tick + D.rupture.tickPerCp * cp + c.stats.attackPower * D.rupture.apPerTick[cp - 1];
const thousandCutsStacks = (c: Combat) => c.aura(c.player, 'thousandCuts')?.stacks ?? 0;

function enterStealth(c: Combat): void {
  const camo = T(c).camouflage;
  c.applyAura(c.player, {
    id: 'stealth', name: 'Stealth', icon: 'stealth', duration: Infinity,
    speed: D.stealthSpeed + 0.03 * camo,
    // The cooldown starts when stealth ends; Camouflage shortens it by 2 to 6 sec.
    onRemove: (cc) => cc.startCooldown('stealth', D.stealth.cooldown - (camo ? camo + 1 : 0)),
  });
}

// ------------------------------------------------------------- abilities
const abilities: Ability[] = [
  {
    id: 'sinisterStrike', name: 'Sinister Strike', icon: 'sinisterStrike', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike1',
    cost: (c) => D.sinisterStrike.cost - [0, 3, 5][T(c).improvedSinisterStrike],
    description: () => `An instant strike that causes normalized weapon damage plus ${D.sinisterStrike.bonus}. Awards 1 combo point.`,
    use: (c, t) => { builder(c, t!, 'sinisterStrike', (normalized(c) + D.sinisterStrike.bonus) * quietus(c, t!)); },
  },
  {
    id: 'backstab', name: 'Backstab', icon: 'backstab', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'stab',
    cost: (c) => D.backstab.cost - 3 * thousandCutsStacks(c),
    requirements: (c, t) => needsDagger(c) ?? needsBehind(c, t),
    usable: mhDagger,
    description: () => `Backstab the target, causing ${D.backstab.percent * 100}% weapon damage plus ${D.backstab.bonus}. Must be behind the target. Requires a dagger in the main hand. Awards 1 combo point.`,
    use: (c, t) => {
      const u = t!;
      const tl = T(c);
      if (thousandCutsStacks(c)) c.removeAura(c.player, 'thousandCuts');
      const outcome = builder(c, u, 'backstab', (normalized(c) + D.backstab.bonus) * D.backstab.percent);
      if (!landed(outcome)) return;
      if (tl.puncturingWounds && roll(c, 15 * tl.puncturingWounds)) {
        c.addComboPoints(u, 1);
        c.count('puncturingWounds');
        note(c, 'Puncturing Wounds +1 combo point');
      }
      if (tl.cutthroat && roll(c, 3 * tl.cutthroat)) {
        c.applyAura(c.player, { id: 'cutthroat', name: 'Cutthroat', icon: 'ambush', duration: 10 });
        c.count('cutthroat');
        note(c, 'Cutthroat: Ambush ready');
      }
    },
  },
  {
    id: 'mutilate', name: 'Mutilate', icon: 'mutilate', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'cross',
    cost: () => D.mutilate.cost,
    requirements: (c) => talent('mutilate', 'Mutilate').requirements(c)
      ?? (c.stats.mainHand.type !== 'dagger' || c.stats.offHand?.type !== 'dagger' ? 'Requires a dagger in each hand' : null),
    usable: (c) => T(c).mutilate > 0 && c.stats.mainHand.type === 'dagger' && c.stats.offHand?.type === 'dagger',
    description: () => `Strike with both daggers, each for 75% weapon damage plus ${Math.round(D.mutilate.bonus * D.mutilate.percent)}; 20% more if the target has your Deadly Poison. Awards 2 combo points.`,
    use: (c, t) => {
      const u = t!;
      const cold = useColdBlood(c);
      // One avoidance roll for both strikes; then each hand rolls its own crit.
      const parent = c.rollSpecial(u, 'mutilate', { forceCrit: cold });
      if (!landed(parent)) {
        c.refund(D.builderRefund);
        c.deal({ target: u, source: 'mutilate', outcome: parent, school: 'physical', amount: 0, white: false });
        return;
      }
      const poisoned = c.aura(u, 'deadlyPoison') ? 1 + D.mutilate.poisonedBonus : 1;
      let anyCrit = false;
      for (const [hand, source] of [['main', 'mutilate'], ['off', 'mutilateOH']] as [Hand, string][]) {
        const crit = cold || roll(c, c.critChance(source));
        anyCrit ||= crit;
        const base = (normalized(c, hand) + D.mutilate.bonus) * D.mutilate.percent * poisoned;
        const outcome: Outcome = crit ? 'crit' : 'hit';
        const amount = c.physicalDamage(u, source, base, outcome);
        c.deal({ target: u, source, outcome, school: 'physical', amount, white: false, hand, weaponStrike: true });
      }
      addPoints(c, u, 2);
      if (anyCrit) sealFate(c, u);
    },
  },
  {
    id: 'hemorrhage', name: 'Hemorrhage', icon: 'hemorrhage', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike2',
    cost: (c) => D.hemorrhage.cost - 3 * thousandCutsStacks(c),
    ...talent('hemorrhage', 'Hemorrhage'),
    description: () => `An instant strike for ${D.hemorrhage.percent * 100}% normalized weapon damage (${D.hemorrhage.daggerPercent * 100}% with a dagger). For ${D.hemorrhage.duration} sec your Rupture on the target deals ${D.hemorrhage.ruptureBonus * 100}% more. Awards 1 combo point.`,
    use: (c, t) => {
      const u = t!;
      if (thousandCutsStacks(c)) c.removeAura(c.player, 'thousandCuts');
      const pct = mhDagger(c) ? D.hemorrhage.daggerPercent : D.hemorrhage.percent;
      const outcome = builder(c, u, 'hemorrhage', normalized(c) * pct * quietus(c, u));
      if (landed(outcome)) c.applyAura(u, { id: 'hemorrhage', name: 'Hemorrhage', icon: 'hemorrhage', duration: D.hemorrhage.duration });
    },
  },
  {
    id: 'ghostlyStrike', name: 'Ghostly Strike', icon: 'ghostlyStrike', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'slash',
    cost: () => D.ghostlyStrike.cost, cooldown: D.ghostlyStrike.cooldown,
    ...talent('ghostlyStrike', 'Ghostly Strike'),
    description: () => `A strike for ${D.ghostlyStrike.percent * 100}% weapon damage (${D.ghostlyStrike.daggerPercent * 100}% with a dagger) that raises your dodge by 15% for ${D.ghostlyStrike.duration} sec. Awards 1 combo point.`,
    use: (c, t) => {
      const u = t!;
      const pct = mhDagger(c) ? D.ghostlyStrike.daggerPercent : D.ghostlyStrike.percent;
      const outcome = builder(c, u, 'ghostlyStrike', c.weaponDamage('main') * pct * quietus(c, u));
      if (landed(outcome)) c.applyAura(c.player, { id: 'ghostlyStrikeBuff', name: 'Ghostly Strike', icon: 'ghostlyStrike', duration: D.ghostlyStrike.duration });
    },
  },
  {
    id: 'eviscerate', name: 'Eviscerate', icon: 'eviscerate', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'slash',
    cost: (c) => D.eviscerate.cost - 10 * T(c).flawlessExecution,
    requirements: (c, t) => needsComboPoints(c, t),
    usable: hasPoints,
    description: (c) => `Finishing move that causes ${D.eviscerate.min}-${D.eviscerate.max} damage plus ${D.eviscerate.perCp} and ${D.eviscerate.apPerCp * 100}% of attack power per combo point. 5 points: ${D.eviscerate.min + 5 * D.eviscerate.perCp}-${D.eviscerate.max + 5 * D.eviscerate.perCp} plus ${Math.round(c.stats.attackPower * D.eviscerate.apPerCp * 5)}.`,
    use: (c, t) => {
      const u = t!;
      const cp = c.comboPointsOn(u);
      const done = attackFinisher(c, u, 'eviscerate', { forceCrit: useColdBlood(c) });
      if (!done) return;
      const e = D.eviscerate;
      const base = e.min + c.random() * (e.max - e.min) + cp * (e.perCp + e.apPerCp * c.stats.attackPower);
      const amount = c.physicalDamage(u, 'eviscerate', base, done.outcome);
      c.deal({ target: u, source: 'eviscerate', outcome: done.outcome, school: 'physical', amount, white: false });
      c.count('eviscerates');
      if (cp >= evisceratePoints(c)) c.count('evisceratesAtTarget');
      afterFinisher(c, u, cp);
    },
  },
  {
    id: 'sliceAndDice', name: 'Slice and Dice', icon: 'sliceAndDice', gcd: D.gcd, target: 'enemy', needsFacing: false,
    animation: 'block',
    cost: () => D.sliceAndDice.cost,
    requirements: (c, t) => needsComboPoints(c, t),
    usable: hasPoints,
    description: (c) => `Finishing move that increases melee attack speed by ${D.sliceAndDice.haste * 100}%. Lasts longer per combo point: ${[1, 2, 3, 4, 5].map((n) => sndDuration(c, n)).join(' / ')} sec.`,
    use: (c, t) => {
      keepPremeditation(c);
      const cp = c.spendComboPoints();
      c.applyAura(c.player, { id: 'sliceAndDice', name: 'Slice and Dice', icon: 'sliceAndDice', duration: sndDuration(c, cp), haste: D.sliceAndDice.haste });
      afterFinisher(c, t!, cp);
    },
  },
  {
    id: 'rupture', name: 'Rupture', icon: 'rupture', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'stab',
    cost: () => D.rupture.cost,
    requirements: (c, t) => needsComboPoints(c, t),
    usable: hasPoints,
    description: (c) => `Finishing move that causes damage every ${D.rupture.period} sec, for 3 more ticks than combo points. 5 points: 8 ticks of ${Math.round(ruptureTick(c, 5))}. Can crit; ignores armor.`,
    use: (c, t) => {
      const u = t!;
      const done = attackFinisher(c, u, 'rupture');
      if (!done) return;
      const cp = done.cp;
      // The Hemorrhage bonus counts as cast.
      const hemo = c.aura(u, 'hemorrhage') ? 1 + D.hemorrhage.ruptureBonus : 1;
      bleed(c, u, 'rupture', 'Rupture', 3 + cp, D.rupture.period, (cc) => ruptureTick(cc, cp), hemo, thousandCutsTick);
      afterFinisher(c, u, cp);
    },
  },
  {
    id: 'exposeArmor', name: 'Expose Armor', icon: 'exposeArmor', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike2',
    cost: (c) => D.exposeArmor.cost - 5 * T(c).improvedExposeArmor,
    requirements: (c, t) => needsComboPoints(c, t),
    usable: hasPoints,
    description: () => `Finishing move that reduces the target's armor by ${D.exposeArmor.perCp} per combo point for ${D.exposeArmor.duration} sec. Does not stack with Sunder Armor: the stronger one applies.`,
    use: (c, t) => {
      const u = t!;
      const done = attackFinisher(c, u, 'exposeArmor');
      if (!done) return;
      c.applyAura(u, { id: 'exposeArmor', name: 'Expose Armor', icon: 'exposeArmor', duration: D.exposeArmor.duration, armor: D.exposeArmor.perCp * done.cp, armorSlot: 'major' });
      const iea = T(c).improvedExposeArmor;
      if (iea && done.cp === 5) {
        c.addComboPoints(u, iea);
        note(c, `Improved Expose Armor +${iea} combo point${iea > 1 ? 's' : ''}`);
      }
      afterFinisher(c, u, done.cp);
    },
  },
  {
    id: 'kidneyShot', name: 'Kidney Shot', icon: 'kidneyShot', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'cross',
    cost: () => D.kidneyShot.cost, cooldown: D.kidneyShot.cooldown,
    requirements: (c, t) => needsComboPoints(c, t),
    usable: hasPoints,
    description: () => 'Finishing move that stuns the target. Lasts longer per combo point: 2 to 6 sec. Most bosses are immune.',
    use: (c, t) => {
      const u = t!;
      const done = attackFinisher(c, u, 'kidneyShot');
      if (!done) return;
      c.applyAura(u, { id: 'kidneyShot', name: 'Kidney Shot', icon: 'kidneyShot', duration: 1 + done.cp });
      afterFinisher(c, u, done.cp);
    },
  },
  {
    id: 'venom', name: 'Venom', icon: 'venom', gcd: D.gcd, target: 'enemy', needsFacing: false,
    animation: 'block',
    cost: () => D.venom.cost,
    requirements: (c, t) => talent('venom', 'Venom').requirements(c) ?? needsComboPoints(c, t),
    usable: (c) => T(c).venom > 0 && hasPoints(c),
    description: () => `Finishing move: your poisons deal ${D.venom.damage * 100}% more damage and have ${D.venom.chance}% more chance to apply. ${D.venom.base + D.venom.perCp} to ${D.venom.base + 5 * D.venom.perCp} sec.`,
    use: (c, t) => {
      keepPremeditation(c);
      const cp = c.spendComboPoints();
      c.applyAura(c.player, { id: 'venom', name: 'Venom', icon: 'venom', duration: D.venom.base + D.venom.perCp * cp });
      afterFinisher(c, t!, cp);
    },
  },
  {
    id: 'ambush', name: 'Ambush', icon: 'ambush', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'stab',
    cost: () => D.ambush.cost,
    requirements: (c, t) => (c.aura(c.player, 'cutthroat') ? null : needsStealth(c)) ?? needsDagger(c) ?? needsBehind(c, t),
    usable: (c) => (c.stealthed() || !!c.aura(c.player, 'cutthroat')) && mhDagger(c),
    highlight: (c) => !!c.aura(c.player, 'cutthroat'),
    description: () => `Ambush the target, causing ${D.ambush.percent * 100}% weapon damage plus ${Math.round(D.ambush.bonus * D.ambush.percent)}. Must be stealthed and behind the target. Requires a dagger. Awards 1 combo point.`,
    use: (c, t) => {
      c.removeAura(c.player, 'cutthroat');
      const outcome = builder(c, t!, 'ambush', (normalized(c) + D.ambush.bonus) * D.ambush.percent);
      if (landed(outcome)) initiative(c, t!);
    },
  },
  {
    id: 'garrote', name: 'Garrote', icon: 'garrote', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'hook',
    cost: (c) => D.garrote.cost - 10 * T(c).dirtyDeeds,
    requirements: (c, t) => needsStealth(c) ?? (T(c).dirtyDeeds ? null : needsBehind(c, t)),
    usable: (c) => c.stealthed(),
    description: (c) => `Garrote the enemy: ${D.garrote.ticks} ticks of ${Math.round(D.garrote.tick + c.stats.attackPower * D.garrote.apPerTick)} every ${D.garrote.period} sec. Must be stealthed and behind the target. Can crit; ignores armor. Awards 1 combo point.`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollSpecial(u, 'garrote');
      if (!landed(outcome)) {
        c.refund(D.builderRefund);
        c.deal({ target: u, source: 'garrote', outcome, school: 'physical', amount: 0, white: false });
        return;
      }
      bleed(c, u, 'garrote', 'Garrote', D.garrote.ticks, D.garrote.period, (cc) => D.garrote.tick + cc.stats.attackPower * D.garrote.apPerTick);
      addPoints(c, u, 1);
      initiative(c, u);
    },
  },
  {
    id: 'cheapShot', name: 'Cheap Shot', icon: 'cheapShot', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'jab',
    cost: (c) => D.cheapShot.cost - 10 * T(c).dirtyDeeds,
    requirements: (c) => needsStealth(c),
    usable: (c) => c.stealthed(),
    description: () => `Stuns the target for ${D.cheapShot.duration} sec. Must be stealthed. Awards 2 combo points.`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollSpecial(u, 'cheapShot');
      if (!landed(outcome)) {
        c.refund(D.builderRefund);
        c.deal({ target: u, source: 'cheapShot', outcome, school: 'physical', amount: 0, white: false });
        return;
      }
      c.applyAura(u, { id: 'cheapShot', name: 'Cheap Shot', icon: 'cheapShot', duration: D.cheapShot.duration });
      addPoints(c, u, 2);
      initiative(c, u);
    },
  },
  {
    id: 'premeditation', name: 'Premeditation', icon: 'premeditation', gcd: 0, target: 'enemy', range: 20, needsFacing: false, keepsStealth: true,
    cooldown: D.premeditation.cooldown,
    requirements: (c) => talent('premeditation', 'Premeditation').requirements(c) ?? needsStealth(c),
    usable: (c) => T(c).premeditation > 0 && c.stealthed(),
    description: () => `Adds 2 combo points to your target. Must be stealthed. The points are lost after ${D.premeditation.window} sec unless you add to them or spend them.`,
    use: (c, t) => {
      c.addComboPoints(t!, 2);
      c.applyAura(c.player, {
        id: 'premeditation', name: 'Premeditation', icon: 'premeditation', duration: D.premeditation.window,
        onRemove: (cc, a, expired) => {
          if (expired && !a.value) cc.player.comboPoints = Math.max(0, cc.player.comboPoints - 2);
        },
      });
    },
  },
  {
    id: 'kick', name: 'Kick', icon: 'kick', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'jab',
    cost: () => D.kick.cost, cooldown: D.kick.cooldown,
    description: () => `A quick kick that causes ${D.kick.damage} damage and interrupts spellcasting.`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollSpecial(u, 'kick');
      const amount = c.physicalDamage(u, 'kick', D.kick.damage, outcome);
      c.deal({ target: u, source: 'kick', outcome, school: 'physical', amount, white: false });
    },
  },
  {
    id: 'gouge', name: 'Gouge', icon: 'gouge', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'hook',
    cost: () => D.gouge.cost, cooldown: D.gouge.cooldown,
    requirements: (c, t) => (t && c.behind(t) ? UI.needsFront : null),
    description: () => `Causes ${D.gouge.damage} damage and incapacitates the target for ${D.gouge.duration} sec. The target must be facing you. Awards 1 combo point.`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollSpecial(u, 'gouge');
      if (!landed(outcome)) {
        c.refund(D.builderRefund);
        c.deal({ target: u, source: 'gouge', outcome, school: 'physical', amount: 0, white: false });
        return;
      }
      const amount = c.physicalDamage(u, 'gouge', D.gouge.damage, outcome);
      c.deal({ target: u, source: 'gouge', outcome, school: 'physical', amount, white: false });
      c.applyAura(u, { id: 'gouge', name: 'Gouge', icon: 'gouge', duration: D.gouge.duration });
      addPoints(c, u, 1);
    },
  },
  {
    id: 'feint', name: 'Feint', icon: 'feint', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'block',
    cost: () => D.feint.cost, cooldown: D.feint.cooldown,
    description: () => 'Performs a feint, lowering your threat. Deals no damage.',
    use: () => {},
  },
  {
    id: 'stealth', name: 'Stealth', icon: 'stealth', gcd: 0, target: 'self', keepsStealth: true,
    requirements: (c) => (c.player.inCombat ? UI.cantInCombat : null),
    usable: (c) => !c.player.inCombat,
    highlight: (c) => c.stealthed(),
    description: (c) => `Sneak around at ${Math.round((1 - D.stealthSpeed - 0.03 * T(c).camouflage) * 100)}% less speed. Breaks when you attack. Press again to leave stealth.`,
    use: (c) => {
      if (c.stealthed()) { c.breakStealth(); return; }
      enterStealth(c);
    },
  },
  {
    id: 'vanish', name: 'Vanish', icon: 'vanish', gcd: 0, target: 'self', keepsStealth: true,
    cooldown: (c) => D.vanish.cooldown - 45 * T(c).elusiveness,
    description: () => 'Vanish from sight and enter stealth, even in combat. Your auto attack stops; Ambush, Garrote, Cheap Shot and Premeditation open again.',
    use: (c) => {
      c.stopAutoAttack();
      c.player.inCombat = false;
      enterStealth(c);
    },
  },
  {
    id: 'sprint', name: 'Sprint', icon: 'sprint', gcd: 0, target: 'self', keepsStealth: true,
    cooldown: (c) => D.sprint.cooldown * (1 - 0.3 * T(c).endurance),
    description: () => `Increases your movement speed by ${Math.round((D.sprintSpeed - 1) * 100)}% for ${D.sprint.duration} sec.`,
    use: (c) => { c.applyAura(c.player, { id: 'sprint', name: 'Sprint', icon: 'sprint', duration: D.sprint.duration, speed: D.sprintSpeed }); },
  },
  {
    id: 'evasion', name: 'Evasion', icon: 'evasion', gcd: 0, target: 'self', keepsStealth: true,
    cooldown: (c) => D.evasion.cooldown * (1 - 0.3 * T(c).endurance),
    description: () => `Increases your dodge chance by 50% for ${D.evasion.duration} sec.`,
    use: (c) => { c.applyAura(c.player, { id: 'evasion', name: 'Evasion', icon: 'evasion', duration: D.evasion.duration }); },
  },
  {
    id: 'bladeFlurry', name: 'Blade Flurry', icon: 'bladeFlurry', gcd: D.gcd, target: 'self',
    cost: () => D.bladeFlurry.cost, cooldown: D.bladeFlurry.cooldown,
    animation: 'block',
    ...talent('bladeFlurry', 'Blade Flurry'),
    description: () => `Increases your attack speed by ${D.bladeFlurry.haste * 100}% for ${D.bladeFlurry.duration} sec. With two or more dummies, your attacks also strike a second one.`,
    use: (c) => { c.applyAura(c.player, { id: 'bladeFlurry', name: 'Blade Flurry', icon: 'bladeFlurry', duration: D.bladeFlurry.duration, haste: D.bladeFlurry.haste }); },
  },
  {
    id: 'adrenalineRush', name: 'Adrenaline Rush', icon: 'adrenalineRush', gcd: D.gcd, target: 'self',
    cooldown: D.adrenalineRush.cooldown,
    ...talent('adrenalineRush', 'Adrenaline Rush'),
    description: () => `Doubles your energy regeneration (20 per second) for ${D.adrenalineRush.duration} sec.`,
    use: (c) => { c.applyAura(c.player, { id: 'adrenalineRush', name: 'Adrenaline Rush', icon: 'adrenalineRush', duration: D.adrenalineRush.duration, regen: 2 }); },
  },
  {
    id: 'coldBlood', name: 'Cold Blood', icon: 'coldBlood', gcd: 0, target: 'self', keepsStealth: true,
    cooldown: D.coldBlood.cooldown,
    ...talent('coldBlood', 'Cold Blood'),
    highlight: (c) => !!c.aura(c.player, 'coldBlood'),
    description: () => 'Your next Sinister Strike, Backstab, Ambush, Mutilate or Eviscerate is a critical strike.',
    use: (c) => { c.applyAura(c.player, { id: 'coldBlood', name: 'Cold Blood', icon: 'coldBlood', duration: Infinity }); },
  },
  {
    id: 'preparation', name: 'Preparation', icon: 'preparation', gcd: D.gcd, target: 'self', keepsStealth: true,
    cooldown: D.preparation.cooldown,
    ...talent('preparation', 'Preparation'),
    description: () => 'Finishes the cooldown of your other rogue abilities: Vanish, Cold Blood, Premeditation, Sprint, Evasion and more.',
    use: (c) => {
      for (const id of ['vanish', 'coldBlood', 'premeditation', 'sprint', 'evasion', 'ghostlyStrike', 'kick', 'gouge', 'kidneyShot', 'feint', 'stealth']) c.clearCooldown(id);
    },
  },
  {
    id: 'thistleTea', name: 'Thistle Tea', icon: 'thistleTea', gcd: 0, target: 'self',
    cooldown: D.thistleTea.cooldown,
    animation: 'drink',
    description: () => `Instantly restores ${D.thistleTea.energy} energy.`,
    use: (c) => { c.addResource(D.thistleTea.energy); },
  },
];

/** Thousand Cuts: each Rupture tick makes the next Hemorrhage or Backstab cheaper. */
function thousandCutsTick(c: Combat): void {
  const r = T(c).thousandCuts;
  const s = state(c);
  if (!r || c.t - s.lastThousandCuts < 1.9) return;
  s.lastThousandCuts = c.t;
  const stacks = Math.min(5, thousandCutsStacks(c) + 1);
  c.applyAura(c.player, { id: 'thousandCuts', name: 'Thousand Cuts', icon: 'rupture', duration: 10, stacks });
}

// ----------------------------------------------------------------- setup
const weaponOf = (c: Combat, hand: Hand): Weapon | null => (hand === 'main' ? c.stats.mainHand : c.stats.offHand);
const MAIN_HAND_STRIKES = ['sinisterStrike', 'backstab', 'ambush', 'hemorrhage', 'ghostlyStrike', 'mutilate'];

function prepare(c: Combat): void {
  const t = T(c);
  states.set(c, { lastSealFate: -Infinity, lastHackAndSlash: -Infinity, lastThousandCuts: -Infinity });
  // Stats are gear only; the build's talents go on top.
  c.mod.crit = t.malice;
  c.mod.hit = t.precision;
  c.mod.expertise = t.weaponExpertise;
  c.mod.offHand = 1 + 0.05 * t.dualWieldSpecialization;
  c.mod.armorIgnore = 0.03 * t.serratedBlades;
  c.mod.natureDamage = 1 + 0.04 * t.vilePoisons;
  c.player.maxResource = 100 + 5 * t.vigor;

  const lethality = c.rules.critMultiplier + 0.04 * t.lethality;
  for (const id of ['sinisterStrike', 'backstab', 'gouge', 'mutilate', 'mutilateOH', 'ghostlyStrike', 'hemorrhage']) c.mod.critMultiplierFor[id] = lethality;
  const add = (id: string, n: number) => { c.mod.damageFor[id] = (c.mod.damageFor[id] ?? 1) + n; };
  for (const id of ['sinisterStrike', 'backstab', 'eviscerate']) add(id, 0.02 * t.aggression);
  add('eviscerate', [0, 0.07, 0.13, 0.2][t.improvedEviscerate]);
  for (const id of ['backstab', 'garrote', 'ambush', 'mutilate', 'mutilateOH']) add(id, 0.05 * t.opportunity);
  add('rupture', 0.1 * t.serratedBlades);
  const crit = (id: string, n: number) => { c.mod.critFor[id] = (c.mod.critFor[id] ?? 0) + n; };
  crit('backstab', 10 * t.puncturingWounds);
  crit('mutilate', 5 * t.puncturingWounds);
  crit('mutilateOH', 5 * t.puncturingWounds);
  crit('ambush', 15 * t.improvedAmbush);

  // Hack and Slash depends on the weapon in each hand.
  const hs = t.hackAndSlash;
  for (const hand of ['main', 'off'] as Hand[]) {
    const w = weaponOf(c, hand);
    if (!w || !hs) continue;
    const sources = hand === 'main' ? ['melee_mh', ...MAIN_HAND_STRIKES] : ['melee_oh', 'mutilateOH'];
    for (const s of sources) {
      if (w.type === 'dagger' || w.type === 'fist') crit(s, hs);
      if (w.type === 'mace') c.mod.armorIgnoreFor[s] = 0.03 * hs;
    }
  }

  c.trackedAuras.push('sliceAndDice');
  c.trackedTargetAuras.push('exposeArmor');
  c.registerSource('instantPoison', 'Instant Poison', 'instantPoison');
  c.registerSource('deadlyPoison', 'Deadly Poison', 'deadlyPoison');
  c.registerSource('bladeFlurryCopy', 'Blade Flurry', 'bladeFlurry');
  c.registerSource('mutilateOH', 'Mutilate (off hand)', 'mutilate');

  // Poisons and the Hack and Slash extra attack on landed weapon hits.
  // Extra attacks do not chain into more extra attacks.
  let extra = false;
  c.onHit.push((hit: Hit) => {
    const hand = hit.hand ?? 'main';
    const poison = String(hand === 'main' ? c.options.poisonMH : c.options.poisonOH);
    const venom = c.aura(c.player, 'venom') ? D.venom.chance : 0;
    const bonus = 2 * t.improvedPoisons + venom;
    if (poison === 'instant' && roll(c, D.instantPoison.chance + bonus)) instantPoison(c, hit.target);
    if (poison === 'deadly' && roll(c, D.deadlyPoison.chance + bonus)) deadlyPoison(c, hit.target);

    const w = weaponOf(c, hand);
    const s = state(c);
    if (!extra && hs && (w?.type === 'sword' || w?.type === 'axe') && c.t - s.lastHackAndSlash >= D.hackAndSlashIcd && roll(c, hs)) {
      extra = true;
      s.lastHackAndSlash = c.t;
      c.count('hackAndSlash');
      note(c, 'Hack and Slash!');
      c.extraAttack(hit.target);
      extra = false;
    }
  });

  // Blade Flurry copies physical damage to a second nearby dummy.
  c.afterDamage.push((hit: Hit) => {
    if (!c.aura(c.player, 'bladeFlurry') || hit.school !== 'physical' || hit.periodic || hit.amount <= 0) return;
    if (hit.source === 'bladeFlurryCopy' || hit.target !== c.target) return;
    const other = c.targets.find((u) => u !== hit.target && u.health > 0 && c.inRange(u, 8));
    if (other) c.deal({ target: other, source: 'bladeFlurryCopy', outcome: hit.outcome, school: 'physical', amount: hit.amount, white: false });
  });
}

const venomDamage = (c: Combat) => (c.aura(c.player, 'venom') ? 1 + D.venom.damage : 1);

function instantPoison(c: Combat, t: Unit): void {
  const ip = D.instantPoison;
  const outcome = c.rollSpell(c.mod.crit);
  const base = ip.min + c.random() * (ip.max - ip.min) + ip.ap * c.stats.attackPower;
  const amount = outcome === 'resist' ? 0
    : Math.round(base * c.mod.natureDamage * venomDamage(c) * (outcome === 'crit' ? c.rules.spellCritMultiplier : 1));
  c.deal({ target: t, source: 'instantPoison', outcome, school: 'nature', amount, white: false });
}

function deadlyPoison(c: Combat, t: Unit): void {
  const dp = D.deadlyPoison;
  if (c.rollSpell() === 'resist') {
    c.deal({ target: t, source: 'deadlyPoison', outcome: 'resist', school: 'nature', amount: 0, white: false });
    return;
  }
  // Each landed application adds a stack (max 5) and refreshes the duration.
  const stacks = Math.min(dp.maxStacks, (c.aura(t, 'deadlyPoison')?.stacks ?? 0) + 1);
  c.applyAura(t, {
    id: 'deadlyPoison', name: 'Deadly Poison', icon: 'deadlyPoison', duration: dp.duration, period: dp.period, stacks,
    onTick: (cc, a) => {
      const crit = cc.rollTickCrit(cc.stats.spellCrit + cc.mod.crit);
      const amount = Math.round(dp.tick * (a.stacks ?? 1) * cc.mod.natureDamage * venomDamage(cc) * (crit ? cc.rules.spellCritMultiplier : 1));
      cc.deal({ target: t, source: 'deadlyPoison', outcome: crit ? 'crit' : 'hit', school: 'nature', amount, white: false, periodic: true });
    },
  });
}

// ------------------------------------------------------------- rotations
/** Combo points the build's priority list waits for before Eviscerate. */
const evisceratePoints = (c: Combat) => (buildById(c.options.build).rotation === 'mutilate' ? 3 : 5);

/**
 * The sims' priority lists, one per build (research/rogue_forever.md →
 * "Suggested ability"). Fight-length checks are dropped: the dummy never dies.
 */
function suggest(c: Combat): string | null {
  const t = c.target;
  if (!t || t.health <= 0) return null;
  const p = c.player;
  const tl = T(c);
  const rotation = buildById(c.options.build).rotation;
  const cp = c.comboPointsOn(t);
  const snd = c.aura(p, 'sliceAndDice');
  const sndLeft = snd ? snd.end - c.t : 0;
  const ready = (id: string) => c.cooldownLeft(id).left === 0;
  const canAmbush = mhDagger(c) && c.behind(t);
  const tea = c.options.thistleTea !== false && p.resource <= 10 && ready('thistleTea');
  // The rogue on Expose Armor duty keeps it up at 5 points (no warrior Sunder in the raid).
  const ea = c.aura(t, 'exposeArmor');
  // Refresh early: building 5 points again takes about 15 seconds.
  // About to drop with 4 points: a slightly weaker Expose Armor beats a gap.
  const eaLeft = ea ? ea.end - c.t : 0;
  const exposeArmor = !!c.options.exposeArmorDuty && ((cp === 5 && eaLeft < 15) || (cp === 4 && eaLeft < 2));

  if (rotation === 'hemorrhage') {
    if (cp >= 1 && !snd) return 'sliceAndDice';
    if (!c.stealthed() && p.inCombat && p.resource >= 60 && cp <= 1 && snd && ready('vanish')) return 'vanish';
    if (c.stealthed()) {
      if (cp <= 2 && tl.premeditation && ready('premeditation')) return 'premeditation';
      return canAmbush ? 'ambush' : 'cheapShot';
    }
    if (cp >= 5 && sndLeft <= 2) return 'sliceAndDice';
    if (tea) return 'thistleTea';
    if (exposeArmor) return 'exposeArmor';
    if (tl.preparation && ready('preparation') && c.cooldownLeft('vanish').left > 30) return 'preparation';
    const rupture = c.aura(t, 'rupture');
    if (!c.aura(t, 'hemorrhage') && cp >= 2 && !rupture) return 'hemorrhage';
    if (cp >= 3 && !rupture) return 'rupture';
    if (cp >= 5) return 'eviscerate';
    if (cp <= 3 && tl.ghostlyStrike && ready('ghostlyStrike')) return 'ghostlyStrike';
    return 'hemorrhage';
  }

  if (c.stealthed()) return canAmbush ? 'ambush' : 'cheapShot';
  if (cp >= 1 && !snd) return 'sliceAndDice';
  if (cp === 5 && sndLeft < 3) return 'sliceAndDice';
  if (p.inCombat && tea) return 'thistleTea';
  if (exposeArmor) return 'exposeArmor';

  if (rotation === 'mutilate') {
    if (cp >= 4 && snd && tl.coldBlood && ready('coldBlood') && !c.aura(p, 'coldBlood')) return 'coldBlood';
    if (cp >= 3) return 'eviscerate';
    return 'mutilate';
  }

  // Combat (Sinister Strike or Backstab).
  if (tl.adrenalineRush && p.inCombat && p.resource < 59 && ready('adrenalineRush')) return 'adrenalineRush';
  if (tl.bladeFlurry && snd && ready('bladeFlurry') && p.resource >= D.bladeFlurry.cost) return 'bladeFlurry';
  if (cp === 5 && snd && tl.coldBlood && ready('coldBlood') && !c.aura(p, 'coldBlood')) return 'coldBlood';
  if (cp === 5 && (snd || p.resource >= 79)) return 'eviscerate';
  return rotation === 'backstab' ? 'backstab' : 'sinisterStrike';
}

// ------------------------------------------------------- practice helpers
/** How often things happen against the level 63 dummy, from behind, with the current gear and build. */
function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, n).toFixed(1)}%`;
  const r = c.rules;
  const hit = c.totalHit();
  const whiteMiss = (c.stats.offHand ? r.dualWieldMiss : r.specialMiss) - hit;
  const poisonChance = (p: unknown) => (p === 'instant' ? D.instantPoison.chance : p === 'deadly' ? D.deadlyPoison.chance : 0);
  const poisonName = (p: unknown) => (p === 'instant' ? 'Instant' : p === 'deadly' ? 'Deadly' : 'none');
  const poisonRow = (hand: string, p: unknown): [string, string] =>
    [`${hand} poison (${poisonName(p)})`, poisonChance(p) ? `${pct(poisonChance(p) + 2 * tl.improvedPoisons)} per hit${tl.venom ? ` (+${D.venom.chance}% with Venom)` : ''}` : '-'];
  const speed = (w: Weapon | null, haste: number) => (w ? `${(w.speed / haste).toFixed(2)} s` : '-');
  const swordHands = [c.stats.mainHand, c.stats.offHand].filter((w) => w && (w.type === 'sword' || w.type === 'axe')).length;
  const procs: [string, string][] = [];
  if (tl.hackAndSlash) procs.push(['Hack and Slash: extra main-hand attack', swordHands ? `${tl.hackAndSlash}% per sword or axe hit` : 'no sword or axe equipped']);
  if (tl.sealFate) procs.push(['Seal Fate: +1 combo point on a builder crit', `${20 * tl.sealFate}%`]);
  if (tl.puncturingWounds) procs.push(['Puncturing Wounds: +1 combo point from Backstab', `${15 * tl.puncturingWounds}%`]);
  if (tl.initiative) procs.push(['Initiative: +1 combo point from openers', `${[0, 33, 67, 100][tl.initiative]}%`]);
  if (tl.relentlessStrikes) procs.push(['Relentless Strikes: +25 energy', '20% per combo point spent (100% at 5)']);
  if (tl.ruthlessness) procs.push(['Ruthlessness: +1 combo point after a finisher', `${20 * tl.ruthlessness}%`]);
  if (tl.cutthroat) procs.push(['Cutthroat: Ambush without stealth after Backstab', `${3 * tl.cutthroat}%`]);
  procs.push(poisonRow('Main-hand', c.options.poisonMH), poisonRow('Off-hand', c.options.poisonOH));
  procs.push(['Poisons: resisted / crit', `${pct(Math.max(1, r.spellMiss - hit))} / ${pct(c.stats.spellCrit + c.mod.crit)}`]);
  const builderCrit = (id: string) => pct(c.critChance(id));
  const attacks: [string, string][] = [['Crit chance (gear + talents, minus 4.8% vs a +3 boss)', pct(c.critChance('melee_mh'))]];
  if (tl.puncturingWounds || tl.improvedAmbush) {
    attacks.push(['Crit with Backstab / Ambush / Mutilate', `${builderCrit('backstab')} / ${builderCrit('ambush')} / ${builderCrit('mutilate')}`]);
  }
  attacks.push(
    ['Auto attack: miss / dodge / glancing', `${pct(whiteMiss)} / ${pct(c.dodgeChance())} / ${pct(r.glanceChance)}`],
    ['Abilities: miss / dodge', `${pct(r.specialMiss - hit)} / ${pct(c.dodgeChance())}`],
    ['Parry and block if you stand in front', `${pct(r.parryFromFront - c.mod.expertise)} / 5.0%`],
  );
  return [
    { title: 'Your attacks', rows: attacks },
    { title: 'Procs', rows: procs },
    {
      title: 'Rhythm',
      rows: [
        ['Energy', `10 per second, smooth${tl.adrenalineRush ? ' (20 with Adrenaline Rush)' : ''}; max ${c.player.maxResource}`],
        ['Global cooldown', `${D.gcd.toFixed(1)} s`],
        ['Main hand swing: base / Slice and Dice', `${speed(c.stats.mainHand, 1)} / ${speed(c.stats.mainHand, 1.3)}`],
        ['Off hand swing: base / Slice and Dice', `${speed(c.stats.offHand, 1)} / ${speed(c.stats.offHand, 1.3)}`],
        ['Slice and Dice at 1 / 5 combo points', `${sndDuration(c, 1)} s / ${sndDuration(c, 5)} s`],
      ],
    },
  ];
}

/** What a practice run looked like: the habits that make the build. */
function review(c: Combat): { label: string; value: string; good?: boolean }[] {
  const k = c.counters;
  const tl = T(c);
  const time = k.combatTime ?? 0;
  if (time < 1) return [];
  const snd = (k['uptime:sliceAndDice'] ?? 0) / time;
  const wasted = k.resourceWasted ?? 0;
  const perMinute = wasted / (time / 60);
  const evis = k.eviscerates ?? 0;
  const atTarget = k.evisceratesAtTarget ?? 0;
  const need = evisceratePoints(c);
  const rows: { label: string; value: string; good?: boolean }[] = [
    { label: 'Slice and Dice uptime', value: `${Math.round(snd * 100)}%`, good: snd >= 0.9 },
    ...(c.options.exposeArmorDuty ? [{
      label: 'Expose Armor uptime', value: `${Math.round(((k['uptime:target:exposeArmor'] ?? 0) / time) * 100)}%`,
      good: (k['uptime:target:exposeArmor'] ?? 0) / time >= 0.9,
    }] : []),
    { label: 'Energy wasted at full', value: `${Math.round(wasted)} (${Math.round(perMinute)}/min)`, good: perMinute < 30 },
    { label: `Eviscerates at ${need}${need < 5 ? '+' : ''} points`, value: evis ? `${atTarget} of ${evis}` : '-', good: evis === 0 || atTarget / evis >= 0.8 },
  ];
  // Only procs that can happen with this build and these weapons.
  const swords = [c.stats.mainHand, c.stats.offHand].some((w) => w && (w.type === 'sword' || w.type === 'axe'));
  const rotation = buildById(c.options.build).rotation;
  if (tl.hackAndSlash && swords) rows.push({ label: 'Hack and Slash extra attacks', value: String(k.hackAndSlash ?? 0) });
  if (tl.sealFate) rows.push({ label: 'Seal Fate combo points', value: `+${k.sealFate ?? 0}` });
  if (tl.puncturingWounds && rotation === 'backstab') rows.push({ label: 'Puncturing Wounds combo points', value: `+${k.puncturingWounds ?? 0}` });
  if (tl.initiative) rows.push({ label: 'Initiative combo points', value: `+${k.initiative ?? 0}` });
  if (tl.relentlessStrikes) rows.push({ label: 'Relentless Strikes energy', value: `+${k.relentlessEnergy ?? 0}` });
  if (tl.ruthlessness) rows.push({ label: 'Ruthlessness combo points', value: `+${k.ruthlessness ?? 0}` });
  return rows;
}

const POISONS = [
  { value: 'instant', label: 'Instant Poison VI' },
  { value: 'deadly', label: 'Deadly Poison V' },
  { value: 'none', label: 'None' },
];

export const rogue: Spec = {
  id: 'rogue',
  className: 'Rogue',
  specName: 'WoW Forever',
  resource: 'energy',
  comboPoints: true,
  abilities,
  stats: STATS,
  rules: RULES,
  presets: [
    { name: 'Swords and mace, unbuffed', stats: STATS },
    { name: 'Daggers, unbuffed', stats: BUILDS.find((b) => b.rotation === 'backstab')!.stats },
    { name: 'Raid-buffed, PvP swords', stats: RAID_STATS },
  ],
  builds: BUILDS.map((b) => ({ id: b.id, label: buildLabel(b), stats: b.stats, bar: b.bar, options: b.options, trees: summary(talentsFor(b.id)) })),
  defaultOptions: { build: BUILDS[0].id, poisonMH: 'instant', poisonOH: 'deadly', exposeArmorDuty: false, thistleTea: true },
  options: [
    { key: 'exposeArmorDuty', name: 'You keep Expose Armor up (no warrior Sunder Armor in the raid)', kind: 'toggle' },
    { key: 'thistleTea', name: 'Use Thistle Tea', kind: 'toggle' },
    { key: 'poisonMH', name: 'Main-hand poison', kind: 'choice', choices: POISONS },
    { key: 'poisonOH', name: 'Off-hand poison', kind: 'choice', choices: POISONS },
  ],
  bar: BUILDS[0].bar,
  welcome: 'Welcome to the rogue practice yard. Pick a talent build from the WoW Forever sims in Settings and practice its rotation on a training dummy, in the browser or on a phone.',
  help: `You start behind the dummy. W and S move along your facing, A and D turn, Q and E strafe; all six can be rebound below. Space jumps.
    Hold the left mouse button to orbit the camera; hold the right button to steer; hold both to run forward. Scroll to zoom.
    Click a dummy to target it, right-click to target and start attacking, Tab cycles targets, Esc clears it.
    On a phone, use the joystick to move and drag the screen to steer.
    Energy regenerates smoothly at 10 per second, as in WoW Forever (not in Classic's 20-every-2-seconds ticks).
    Builders award combo points on your target; finishers spend them. An avoided builder refunds 80% of its energy; an avoided finisher keeps its combo points.
    Attacking from the front can be parried; stay behind. Rupture, Garrote and Deadly Poison can crit, as in Forever.
    The yellow glow marks the next ability of the build's priority list. Procs call themselves out next to your character.
    Under the damage meter, a short review tracks the habits that matter: Slice and Dice uptime, energy wasted at full, Eviscerates at the right combo points and your procs.
    This is a practice tool: crit and proc chances follow WoW Forever; damage numbers are an approximation.`,
  look: { clothColor: 0x3a2a58, leatherColor: 0x36302c, hood: true },
  sources: [
    { label: 'foreversim', url: 'https://github.com/laurencestokes/foreversim' },
    { label: 'wow-forever-sim', url: 'https://github.com/gunba/wow-forever-sim' },
  ],
  prepare,
  suggest,
  chances,
  review,
};
