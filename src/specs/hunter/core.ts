// What every hunter spec shares: shots on the ranged table, the pet (one
// swing timer plus Claw and Bite on continuous Focus), Summon Hawk, the melee
// Survival kit, procs and the mana model. The engine owns Auto Shot (its
// windup and the dead zone). Numbers in ./data.ts; sources in research/hunter_forever.md.
import type { Combat } from '../../engine/combat';
import type { Ability, Hit, Outcome, Unit } from '../../engine/types';
import { PET_COMMANDS } from '../pet';
import { DATA } from './data';
import { buildById, talentsFor, type HunterSpec, type Talents } from './talents';
import { setupWeaving } from './weave';

export const D = DATA;
export const roll = (c: Combat, pct: number) => c.random() * 100 < pct;
export const landed = (o: Outcome) => o === 'hit' || o === 'crit' || o === 'glance' || o === 'block';
const note = (c: Combat, text: string, kind: 'proc' | 'resource' = 'proc') => c.emit('note', { text, kind });
const between = (c: Combat, min: number, max: number) => min + c.random() * (max - min);

const specOf = (c: Combat) => c.spec.id.replace('hunter-', '') as HunterSpec;
/** Talent ranks of the build chosen in Settings. */
export const T = (c: Combat): Talents => talentsFor(c.options.build, specOf(c), c.options.talents);
export const build = (c: Combat) => buildById(c.options.build, specOf(c));

interface HunterState {
  allDamage: number;
  focus: number;
  petSwing: { cancel: () => void } | null;
  petNext: number;
  lastPetAction: number;
  biteReady: number;
}
const states = new WeakMap<Combat, HunterState>();
export const state = (c: Combat): HunterState => {
  let s = states.get(c);
  if (!s) states.set(c, (s = { allDamage: 1, focus: 100, petSwing: null, petNext: 0, lastPetAction: -Infinity, biteReady: 0 }));
  return s;
};

// ------------------------------------------------------------------- mana
const efficiency = (c: Combat) => 0.03 * T(c).efficiency;
const resourceful = (c: Combat) => 0.3 * T(c).resourcefulness;
const shotCost = (base: number) => (c: Combat) => Math.round(base * (1 - efficiency(c)));
/** Melee abilities: Efficiency and Resourcefulness add up (gs). */
const meleeCost = (base: number) => (c: Combat) => Math.round(base * Math.max(0, 1 - efficiency(c) - resourceful(c)));
const trapCost = (base: number) => (c: Combat) => Math.round(base * (1 - resourceful(c)));

/**
 * Mana per second: Spirit regen outside the five-second rule; while casting,
 * Bestial Discipline (with a pet), Rapid Recuperation or Resourcefulness keep
 * part of it (the best one counts). MP5 always.
 */
export function regen(c: Combat): number {
  const t = T(c);
  const spirit = 6.25 + Number(c.options.spirit ?? D.spirit) / 8;
  const mp5 = Number(c.options.mp5 ?? 0) / 5;
  if (c.t - c.lastSpend >= 5) return spirit + mp5;
  let share = c.pet.out ? 0.25 * t.bestialDiscipline : 0;
  if (c.aura(c.player, 'rapidRecuperation')) share = Math.max(share, 0.25 * t.rapidRecuperation);
  if (c.aura(c.player, 'resourcefulness')) share = Math.max(share, 0.5);
  return spirit * share + mp5;
}

// ------------------------------------------------------------------ shots
const castTime = (base: number) => (c: Combat) => base / c.rangedHaste();

/** A ranged weapon shot: weapon roll, ammo and RAP/14 at the weapon speed (normalized 2.8 for specials) plus a bonus. */
function weaponShot(c: Combat, t: Unit, id: string, bonus: number, opts: { normalized?: boolean; refund?: boolean } = {}): Outcome {
  const w = c.stats.ranged!;
  const outcome = c.rollRanged(t, id);
  c.emit('shot', t);
  if (!landed(outcome)) {
    if (opts.refund !== false) c.refund(D.refund);
    c.deal({ target: t, source: id, outcome, school: 'physical', amount: 0, white: false, ranged: true });
    return outcome;
  }
  const speed = opts.normalized ? D.normalizedRanged : w.speed;
  const base = between(c, w.min, w.max) + (c.stats.ammoDps ?? 0) * w.speed + (c.rangedAttackPower(t) / 14) * speed + bonus;
  const amount = c.physicalDamage(t, id, base, outcome);
  c.deal({ target: t, source: id, outcome, school: 'physical', amount, white: false, ranged: true, weaponStrike: true });
  return outcome;
}

/** Arcane or Nature damage from a shot or sting: ignores armor; Lone Wolf, Focused Fire and talents apply. */
function magicAmount(c: Combat, id: string, base: number, outcome: Outcome): number {
  if (!landed(outcome)) return 0;
  const crit = outcome === 'crit' ? c.mod.critMultiplierFor[id] ?? c.rules.critMultiplier : 1;
  return Math.max(1, Math.round(base * state(c).allDamage * c.auraProduct('damageDone') * (c.mod.damageFor[id] ?? 1) * crit));
}

/** A melee strike with the main hand (Survival). */
function meleeStrike(c: Combat, t: Unit, id: string, base: number): Outcome {
  const outcome = c.rollSpecial(t, id);
  if (!landed(outcome)) {
    c.refund(D.refund);
    c.deal({ target: t, source: id, outcome, school: 'physical', amount: 0, white: false, hand: 'main' });
    return outcome;
  }
  const amount = c.physicalDamage(t, id, base, outcome);
  c.deal({ target: t, source: id, outcome, school: 'physical', amount, white: false, hand: 'main', weaponStrike: true });
  return outcome;
}

const normalizedMelee = (c: Combat) => c.weaponDamage('main', { normalizedSpeed: c.stats.mainHand.twoHand ? D.normalizedTwoHand : D.normalizedOneHand });
const ASPECTS = ['aspectOfTheHawk', 'aspectOfTheBeast'];
function aspect(c: Combat, id: 'aspectOfTheHawk' | 'aspectOfTheBeast'): void {
  for (const a of ASPECTS) c.removeAura(c.player, a);
  if (id === 'aspectOfTheHawk') {
    c.applyAura(c.player, { id, name: 'Aspect of the Hawk', icon: id, duration: Infinity, rangedAttackPower: D.aspectOfTheHawk.rap });
  } else {
    c.applyAura(c.player, { id, name: 'Aspect of the Beast', icon: id, duration: Infinity, attackPower: D.aspectOfTheBeast.ap });
  }
}

const talent = (key: keyof Talents, name: string) => ({
  requirements: (c: Combat) => (T(c)[key] ? null : `Requires the ${name} talent`),
  usable: (c: Combat) => T(c)[key] > 0,
});
const needsPet = (c: Combat) => (c.pet.out ? null : 'You have no pet out (Lone Wolf)');

// -------------------------------------------------------------------- pet
const petAp = (c: Combat) => D.pet.apBase + D.pet.apShare * Math.max(c.attackPower(), c.rangedAttackPower(null));
const petSpeed = (c: Combat) => Number(c.options.petSpeed ?? 1.2);
/** Your crit (gear, talents and buffs, minus the boss's suppression) plus Ferocity: pets inherit it since Oct 15. */
const petCrit = (c: Combat) => D.pet.baseCrit + c.critChance('petAttack') + 2 * T(c).ferocity;
const petMult = (c: Combat) => {
  const t = T(c);
  const wrath = c.aura(c.player, 'bestialWrath') ? D.bestialWrath.damage : 1;
  return D.pet.happiness * D.pet.family * (1 + 0.03 * t.unleashedFury) * (1 + 0.01 * t.focusedFire) * wrath * state(c).allDamage;
};

/** A pet attack from behind: miss, dodge, glancing (white only), crit; armor applies. */
function petAttack(c: Combat, u: Unit, source: string, base: number, white: boolean): void {
  const missChance = Math.max(0, c.rules.specialMiss - c.totalHit());
  let x = c.random() * 100;
  let outcome: Outcome = 'hit';
  const intimidation = !!c.aura(c.player, 'intimidation');
  if ((x -= missChance) < 0) outcome = 'miss';
  else if ((x -= c.rules.dodge) < 0) outcome = 'dodge';
  else if (white && (x -= c.rules.glanceChance) < 0) outcome = 'glance';
  else if (intimidation || c.random() * 100 < petCrit(c)) outcome = 'crit';
  if (intimidation && outcome === 'crit') { c.removeAura(c.player, 'intimidation'); c.count('intimidationCrits'); }
  let amount = 0;
  if (landed(outcome)) {
    const m = outcome === 'crit' ? c.rules.critMultiplier : outcome === 'glance' ? 0.65 : 1;
    amount = Math.max(1, Math.round(base * petMult(c) * m * (1 - c.armorReduction(u))));
  }
  c.deal({ target: u, source, outcome, school: 'physical', amount, white: false });
  c.emit('petAttack', { kind: source });
  const fr = T(c).frenzy;
  if (outcome === 'crit' && fr && roll(c, 20 * fr)) {
    c.applyAura(c.player, { id: 'frenzy', name: 'Frenzy (pet)', icon: 'frenzy', duration: D.pet.frenzy.duration });
  }
}

function petSwing(c: Combat): void {
  const s = state(c);
  s.petSwing = null;
  const u = c.pet.target;
  if (!c.pet.attacking || !u || u.health <= 0) return;
  petAttack(c, u, 'petMelee', between(c, D.pet.min, D.pet.max) + petAp(c) / 7, true);
  s.petNext = c.t + petSpeed(c) / (c.aura(c.player, 'frenzy') ? D.pet.frenzy.speed : 1);
  s.petSwing = c.schedule(s.petNext, () => petSwing(c));
}

/** The pet's mind, every 0.1 s: Focus, and once it reached its target, Bite on cooldown and Claw with spare Focus. */
function petThink(c: Combat): void {
  const s = state(c);
  const P = D.pet;
  s.focus = Math.min(P.focusCap, s.focus + P.focusPerSecond * (1 + 0.1 * T(c).bestialDiscipline) * 0.1);
  const u = c.pet.target;
  // The engine moves the pet and says when it is in reach of its target.
  const fighting = c.pet.attacking && !!u && u.health > 0;
  if (!fighting) {
    s.petSwing?.cancel();
    s.petSwing = null;
    return;
  }
  if (!s.petSwing) s.petSwing = c.schedule(Math.max(c.t, s.petNext), () => petSwing(c));
  if (c.t - s.lastPetAction < P.actionInterval) return;
  if (c.t >= s.biteReady) {
    if (s.focus < P.bite.focus) return; // wait for Bite
    s.focus -= P.bite.focus;
    s.biteReady = c.t + P.bite.cooldown;
    s.lastPetAction = c.t;
    petAttack(c, u!, 'petBite', between(c, P.bite.min, P.bite.max), false);
  } else if (s.focus >= P.claw.focus) {
    s.focus -= P.claw.focus;
    s.lastPetAction = c.t;
    petAttack(c, u!, 'petClaw', between(c, P.claw.min, P.claw.max), false);
  }
}

/** Hawks: up to two, each swinging every 2.5 s (the hunter's ranged haste) for 18 s. */
export const hawkCount = (c: Combat) => ['hawkA', 'hawkB'].filter((id) => c.aura(c.player, id)).length;
export const oldestHawkLeft = (c: Combat) => {
  const left = ['hawkA', 'hawkB'].map((id) => c.aura(c.player, id)).filter(Boolean).map((a) => a!.end - c.t);
  return left.length ? Math.min(...left) : 0;
};
function hawkHit(c: Combat, u: Unit, base: number, source: string): void {
  const t = T(c);
  const crit = roll(c, D.summonHawk.crit + 2 * t.ferocity);
  const amount = Math.max(1, Math.round(base * (1 + 0.03 * t.unleashedFury) * (1 + 0.01 * t.focusedFire) * state(c).allDamage
    * (crit ? c.rules.critMultiplier : 1) * (1 - c.armorReduction(u))));
  c.deal({ target: u, source, outcome: crit ? 'crit' : 'hit', school: 'physical', amount, white: false });
}

// --------------------------------------------------------------- abilities
export const ABILITIES: Ability[] = [
  {
    id: 'autoShot', name: 'Auto Shot', icon: 'autoShot', gcd: 0, target: 'enemy', range: 35, minRange: 8, noAutoAttack: true,
    highlight: (c) => c.autoShooting,
    description: (c) => `Shoots every ${(c.stats.ranged?.speed ?? 0).toFixed(1)} sec divided by your ranged haste. Each shot has a ${0.5} sec windup (shorter with haste) in which you must stand still; moving makes it try again 0.5 sec later. Works from 8 to 35 yards: closer is the dead zone. Press again to stop.${c.classicAutoShot ? ' Classic rule on: a cast started during the windup clips the shot.' : ' Forever: it keeps firing while you cast Aimed Shot or Sniper Shot.'}`,
    use: (c) => { if (c.autoShooting) c.stopAutoShot(); else c.startAutoShot(); },
  },
  {
    id: 'attack', name: 'Attack', icon: 'melee', gcd: 0, target: 'enemy', range: 'melee',
    highlight: (c) => c.player.autoAttacking,
    description: () => 'Starts your melee auto attack (it turns Auto Shot off).',
    use: () => {},
  },
  {
    id: 'aimedShot', name: 'Aimed Shot', icon: 'aimedShot', gcd: D.gcd, target: 'enemy', range: 35, minRange: 8, ranged: true,
    animation: 'shoot',
    cost: shotCost(D.aimedShot.mana), cooldown: D.aimedShot.cooldown, cooldownGroup: 'aimedMulti',
    castTime: castTime(D.aimedShot.cast),
    description: (c) => `A ${castTime(D.aimedShot.cast)(c).toFixed(2)} sec cast (ranged haste speeds it up): normalized weapon damage plus ${D.aimedShot.bonus}. Baseline in WoW Forever; shares a ${D.aimedShot.cooldown} sec cooldown with Multi-Shot.`,
    use: (c, t) => { weaponShot(c, t!, 'aimedShot', D.aimedShot.bonus, { normalized: true }); },
  },
  {
    id: 'multiShot', name: 'Multi-Shot', icon: 'multiShot', gcd: D.gcd, target: 'enemy', range: 35, minRange: 8, ranged: true,
    animation: 'shoot',
    cost: shotCost(D.multiShot.mana), cooldown: D.multiShot.cooldown, cooldownGroup: 'aimedMulti',
    castTime: castTime(D.multiShot.cast),
    description: () => `Instant (since client 70425): normalized weapon damage to up to ${D.multiShot.targets} targets. Shares its cooldown with Aimed Shot, so on one target Aimed Shot is better.`,
    use: (c, t) => {
      const u = t!;
      const near = c.targets.filter((x) => x !== u && x.health > 0 && Math.hypot(x.x - u.x, x.z - u.z) <= 8 * 0.9144).slice(0, D.multiShot.targets - 1);
      for (const x of [u, ...near]) weaponShot(c, x, 'multiShot', 0, { normalized: true, refund: x === u });
    },
  },
  {
    id: 'arcaneShot', name: 'Arcane Shot', icon: 'arcaneShot', gcd: D.gcd, target: 'enemy', range: 35, minRange: 8, ranged: true,
    animation: 'shoot',
    projectile: { color: 0xe9a8ff, speed: 40, style: 'arcane' },
    cost: shotCost(D.arcaneShot.mana), cooldownGroup: 'arcaneHawk',
    cooldown: (c) => D.arcaneShot.cooldown - 0.3 * T(c).improvedArcaneShot,
    description: (c) => `An instant shot for ${D.arcaneShot.damage} Arcane damage plus ${D.arcaneShot.rap * 100}% of ranged attack power (${Math.round(D.arcaneShot.damage + D.arcaneShot.rap * c.rangedAttackPower())}). Ignores armor; you can fire it while moving. Shares its cooldown with Summon Hawk.`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollRanged(u, 'arcaneShot');
      if (!landed(outcome)) c.refund(D.refund);
      const amount = magicAmount(c, 'arcaneShot', D.arcaneShot.damage + D.arcaneShot.rap * c.rangedAttackPower(u), outcome);
      c.deal({ target: u, source: 'arcaneShot', outcome, school: 'arcane', amount, white: false, ranged: true, weaponStrike: landed(outcome) });
    },
  },
  {
    id: 'serpentSting', name: 'Serpent Sting', icon: 'serpentSting', gcd: D.gcd, target: 'enemy', range: 35, minRange: 8, ranged: true,
    animation: 'shoot',
    cost: shotCost(D.serpentSting.mana),
    description: (c) => `Stings the target for ${D.serpentSting.tick * D.serpentSting.ticks} Nature damage over ${D.serpentSting.ticks * D.serpentSting.period} sec, plus ranged attack power each tick. The ticks can crit.${T(c).rapidRecuperation ? ' A landed sting gives Rapid Recuperation (mana regen while casting).' : ''}`,
    use: (c, t) => {
      const u = t!;
      const outcome = c.rollRanged(u, 'serpentSting');
      if (!landed(outcome)) {
        c.deal({ target: u, source: 'serpentSting', outcome, school: 'nature', amount: 0, white: false, ranged: true });
        return;
      }
      const s = D.serpentSting;
      c.applyAura(u, {
        id: 'serpentSting', name: 'Serpent Sting', icon: 'serpentSting', duration: s.ticks * s.period, period: s.period,
        onTick: (cc) => {
          const crit: Outcome = cc.random() * 100 < cc.critChance('serpentSting') ? 'crit' : 'hit';
          const amount = magicAmount(cc, 'serpentSting', s.tick + s.rap * cc.rangedAttackPower(u), crit);
          cc.deal({ target: u, source: 'serpentSting', outcome: crit, school: 'nature', amount, white: false, periodic: true });
        },
      });
      const rr = T(c).rapidRecuperation;
      if (rr) c.applyAura(c.player, { id: 'rapidRecuperation', name: 'Rapid Recuperation', icon: 'rapidRecuperation', duration: 15 });
    },
  },
  {
    id: 'sniperShot', name: 'Sniper Shot', icon: 'sniperShot', gcd: D.gcd, target: 'enemy', range: D.sniperShot.range, minRange: 8, ranged: true,
    animation: 'shoot',
    // Oct 15: Efficiency and Mortal Shots now apply to Sniper Shot.
    cost: shotCost(D.sniperShot.mana), cooldown: D.sniperShot.cooldown,
    castTime: castTime(D.sniperShot.cast),
    ...talent('sniperShot', 'Sniper Shot'),
    description: (c) => `A ${castTime(D.sniperShot.cast)(c).toFixed(2)} sec cast: normalized weapon damage plus ${D.sniperShot.bonus}, up to ${D.sniperShot.range} yards.`,
    use: (c, t) => { weaponShot(c, t!, 'sniperShot', D.sniperShot.bonus, { normalized: true }); },
  },
  {
    id: 'huntersMark', name: "Hunter's Mark", icon: 'huntersMark', gcd: D.gcd, target: 'enemy', range: 100, needsFacing: false, noAutoAttack: true,
    animation: 'cast',
    cost: () => D.huntersMark.mana,
    description: (c) => `Marks the target for ${D.huntersMark.duration / 60} min: everyone shooting it has +${D.huntersMark.rap} ranged attack power.${T(c).exposePrey ? ' Expose Prey needs your own mark.' : ''}`,
    use: (c, t) => { c.applyAura(t!, { id: 'huntersMark', name: "Hunter's Mark", icon: 'huntersMark', duration: D.huntersMark.duration, rangedApTaken: D.huntersMark.rap }); },
  },
  {
    id: 'rapidFire', name: 'Rapid Fire', icon: 'rapidFire', gcd: 0, target: 'self',
    cost: () => D.rapidFire.mana,
    cooldown: (c) => D.rapidFire.cooldown - 60 * T(c).rapidKilling,
    description: () => `+${D.rapidFire.haste * 100}% ranged and melee attack speed for ${D.rapidFire.duration} sec (melee too in WoW Forever). Off the global cooldown.`,
    use: (c) => { c.applyAura(c.player, { id: 'rapidFire', name: 'Rapid Fire', icon: 'rapidFire', duration: D.rapidFire.duration, haste: D.rapidFire.haste, rangedHaste: D.rapidFire.haste }); },
  },
  {
    id: 'aspectOfTheHawk', name: 'Aspect of the Hawk', icon: 'aspectOfTheHawk', gcd: D.gcd, target: 'self', animation: 'cast',
    cost: (c) => (c.aura(c.player, 'aspectOfTheHawk') ? 0 : D.aspectOfTheHawk.mana),
    highlight: (c) => !!c.aura(c.player, 'aspectOfTheHawk'),
    description: (c) => `+${D.aspectOfTheHawk.rap} ranged attack power.${T(c).deadlyAspects ? ` Deadly Aspects: each Auto Shot has a ${2 * T(c).deadlyAspects}% chance to give Quick Shots (+30% ranged speed for 12 sec).` : ''} One aspect at a time.`,
    use: (c) => aspect(c, 'aspectOfTheHawk'),
  },
  {
    id: 'aspectOfTheBeast', name: 'Aspect of the Beast', icon: 'aspectOfTheBeast', gcd: D.gcd, target: 'self', animation: 'cast',
    cost: (c) => (c.aura(c.player, 'aspectOfTheBeast') ? 0 : D.aspectOfTheBeast.mana),
    highlight: (c) => !!c.aura(c.player, 'aspectOfTheBeast'),
    description: (c) => `+${D.aspectOfTheBeast.ap} melee attack power (new ranks in WoW Forever).${T(c).deadlyAspects ? ` Deadly Aspects: each white swing has a ${2 * T(c).deadlyAspects}% chance to give Quick Strikes (+30% melee speed for 12 sec).` : ''} One aspect at a time.`,
    use: (c) => aspect(c, 'aspectOfTheBeast'),
  },
  {
    id: 'trueshotAura', name: 'Trueshot Aura', icon: 'trueshotAura', gcd: D.gcd, target: 'self', animation: 'cast',
    cost: () => D.trueshotAura.mana,
    ...talent('trueshotAura', 'Trueshot Aura'),
    highlight: (c) => !!c.aura(c.player, 'trueshotAura'),
    description: () => `+${D.trueshotAura.rap} ranged attack power for the raid, 30 min.`,
    use: (c) => { c.applyAura(c.player, { id: 'trueshotAura', name: 'Trueshot Aura', icon: 'trueshotAura', duration: 1800, rangedAttackPower: D.trueshotAura.rap }); },
  },
  {
    id: 'bestialWrath', name: 'Bestial Wrath', icon: 'bestialWrath', gcd: 0, target: 'self',
    cost: () => D.bestialWrath.mana, cooldown: D.bestialWrath.cooldown,
    requirements: (c) => talent('bestialWrath', 'Bestial Wrath').requirements(c) ?? needsPet(c),
    usable: (c) => T(c).bestialWrath > 0 && c.pet.out,
    description: () => `Your pet deals ${Math.round((D.bestialWrath.damage - 1) * 100)}% more damage for ${D.bestialWrath.duration} sec. Off the global cooldown.`,
    use: (c) => { c.applyAura(c.player, { id: 'bestialWrath', name: 'Bestial Wrath', icon: 'bestialWrath', duration: D.bestialWrath.duration }); },
  },
  {
    id: 'intimidation', name: 'Intimidation', icon: 'intimidation', gcd: D.gcd, target: 'self',
    cost: () => D.intimidation.mana, cooldown: D.intimidation.cooldown,
    requirements: (c) => talent('intimidation', 'Intimidation').requirements(c) ?? needsPet(c),
    usable: (c) => T(c).intimidation > 0 && c.pet.out,
    description: () => `Your pet's next attack within ${D.intimidation.window} sec is a critical hit (the stun does not work on bosses).`,
    use: (c) => { c.applyAura(c.player, { id: 'intimidation', name: 'Intimidation', icon: 'intimidation', duration: D.intimidation.window }); },
  },
  {
    id: 'summonHawk', name: 'Summon Hawk', icon: 'summonHawk', gcd: D.gcd, target: 'enemy', range: 35, needsFacing: false, noAutoAttack: true,
    animation: 'cast',
    cost: shotCost(D.summonHawk.mana), cooldown: D.summonHawk.cooldown, cooldownGroup: 'arcaneHawk',
    ...talent('summonHawk', 'Summon Hawk'),
    description: (c) => `A hawk dives at the target for ${Math.round(D.summonHawk.dive + D.summonHawk.diveRap * c.rangedAttackPower())} (it always hits) and keeps attacking for ${D.summonHawk.duration} sec. Up to ${D.summonHawk.max} hawks; shares its cooldown with Arcane Shot. Hawks out: ${hawkCount(c)}.`,
    use: (c, t) => {
      const u = t!;
      const h = D.summonHawk;
      hawkHit(c, u, h.dive + h.diveRap * c.rangedAttackPower(u), 'hawkDive');
      // Two at most: a third replaces the oldest.
      let slot = ['hawkA', 'hawkB'].find((id) => !c.aura(c.player, id));
      if (!slot) slot = (c.aura(c.player, 'hawkA')!.end <= c.aura(c.player, 'hawkB')!.end) ? 'hawkA' : 'hawkB';
      c.applyAura(c.player, {
        id: slot, name: 'Hawk', icon: 'summonHawk', duration: h.duration, period: h.swing / c.rangedHaste(),
        // Oct 15: the hawk sticks to the target you summoned it on.
        onTick: (cc) => { if (u.health > 0) hawkHit(cc, u, h.swingDamage, 'hawk'); },
      });
      c.count('hawks');
    },
  },
  {
    id: 'raptorStrike', name: 'Raptor Strike', icon: 'raptorStrike', gcd: 0, target: 'enemy', range: 'melee', onNextSwing: true,
    animation: 'slash',
    cost: meleeCost(D.raptorStrike.mana), cooldown: D.raptorStrike.cooldown,
    description: () => `Your next main-hand swing deals weapon damage plus ${D.raptorStrike.bonus}. Off the global cooldown; press again to cancel.`,
    use: (c, t) => { meleeStrike(c, t!, 'raptorStrike', c.weaponDamage('main') + D.raptorStrike.bonus); },
  },
  {
    id: 'mongooseBite', name: 'Mongoose Bite', icon: 'mongooseBite', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'stab',
    cost: meleeCost(D.mongooseBite.mana), cooldown: D.mongooseBite.cooldown,
    requirements: (c) => (c.aura(c.player, 'mongooseReady') ? null : 'Only after the target dodges or after Expose Prey'),
    usable: (c) => !!c.aura(c.player, 'mongooseReady'),
    highlight: (c) => !!c.aura(c.player, 'mongooseReady'),
    description: (c) => `Normalized weapon damage plus ${D.mongooseBite.bonus}. Usable ${D.mongooseBite.dodgeWindow} sec after the target dodges${T(c).exposePrey ? `, or ${D.mongooseBite.window} sec after Expose Prey (${5 * T(c).exposePrey}% per landed hit on your marked target)` : ''}.${T(c).laceratingStrikes ? ' Lacerating Strikes: it also bleeds for 40% of its damage over 21 sec.' : ''}`,
    use: (c, t) => {
      const u = t!;
      c.removeAura(c.player, 'mongooseReady');
      c.count('mongoose');
      const outcome = meleeStrike(c, u, 'mongooseBite', normalizedMelee(c) + D.mongooseBite.bonus);
      if (!landed(outcome) || !T(c).laceratingStrikes) return;
      const total = (normalizedMelee(c) + D.mongooseBite.bonus) * (1 - c.armorReduction(u)) * D.laceratingStrikes.share;
      const l = D.laceratingStrikes;
      c.applyAura(u, {
        id: 'laceratingStrikes', name: 'Lacerating Strikes', icon: 'laceratingStrikes', duration: l.ticks * l.period, period: l.period, bleed: true,
        onTick: (cc) => {
          const crit = cc.random() * 100 < cc.critChance('laceratingStrikes');
          const amount = Math.max(1, Math.round((total / l.ticks) * (crit ? cc.rules.critMultiplier : 1)));
          cc.deal({ target: u, source: 'laceratingStrikes', outcome: crit ? 'crit' : 'hit', school: 'physical', amount, white: false, periodic: true });
        },
      });
    },
  },
  {
    id: 'striderKick', name: 'Strider Kick', icon: 'striderKick', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike2',
    // Oct 15: Resourcefulness lowers its mana cost.
    cost: trapCost(D.striderKick.mana), cooldown: D.striderKick.cooldown,
    ...talent('striderKick', 'Strider Kick'),
    description: () => `A kick for 100% of normalized weapon damage; you run 30% faster for 3 sec.`,
    use: (c, t) => {
      meleeStrike(c, t!, 'striderKick', normalizedMelee(c));
      c.applyAura(c.player, { id: 'striderKick', name: 'Strider Kick', icon: 'striderKick', duration: 3, speed: 1.3 });
    },
  },
  {
    id: 'wingClip', name: 'Wing Clip', icon: 'wingClip', gcd: D.gcd, target: 'enemy', range: 'melee',
    animation: 'strike1',
    cost: meleeCost(D.wingClip.mana),
    description: () => `${D.wingClip.damage} damage and a slow. The melee filler when you have mana to spare.`,
    use: (c, t) => { meleeStrike(c, t!, 'wingClip', D.wingClip.damage); },
  },
  {
    id: 'immolationTrap', name: 'Immolation Trap', icon: 'immolationTrap', gcd: D.gcd, target: 'self', animation: 'cast',
    cost: trapCost(D.immolationTrap.mana), cooldownGroup: 'fireTrap',
    cooldown: (c) => D.immolationTrap.cooldown * (1 - 0.2 * T(c).survivalistsDiscipline),
    description: (c) => `A trap at your feet: an enemy on it burns for ${Math.round(D.immolationTrap.total * (1 + [0, 0.15, 0.3][T(c).cleverTraps]))} Fire damage over ${D.immolationTrap.ticks * D.immolationTrap.period} sec. Usable in combat in WoW Forever; the dummy has to be next to you.`,
    use: (c) => {
      const tr = D.immolationTrap;
      // Oct 15: + 10 % of your higher attack power (gs, provisional), fixed when you place it.
      const ap = tr.apShare * Math.max(c.attackPower(), c.rangedAttackPower(null));
      const tick = ((tr.total + ap) / tr.ticks) * (1 + [0, 0.15, 0.3][T(c).cleverTraps]);
      for (const u of c.targets.filter((x) => x.health > 0 && c.inRange(x, 5))) {
        c.applyAura(u, {
          id: 'immolationTrap', name: 'Immolation Trap', icon: 'immolationTrap', duration: tr.ticks * tr.period, period: tr.period,
          onTick: (cc) => cc.deal({ target: u, source: 'immolationTrap', outcome: 'hit', school: 'fire', amount: Math.round(tick * state(cc).allDamage * cc.auraProduct('damageDone')), white: false, periodic: true }),
        });
      }
    },
  },
  {
    id: 'manaPotion', name: 'Major Mana Potion', icon: 'manaPotion', gcd: 0, target: 'self',
    cooldown: D.manaPotion.cooldown, cooldownGroup: 'potion',
    animation: 'drink',
    description: () => `Restores ${D.manaPotion.min} to ${D.manaPotion.max} mana.`,
    use: (c) => {
      const n = Math.round(between(c, D.manaPotion.min, D.manaPotion.max));
      c.gainMana(n);
      c.count('potionMana', n);
      note(c, `+${n} Mana`, 'resource');
    },
  },
  ...PET_COMMANDS,
];

// ----------------------------------------------------------------- setup
const RANGED_SHOTS = ['autoShot', 'aimedShot', 'multiShot', 'sniperShot'];
const MELEE_ABILITIES = ['raptorStrike', 'mongooseBite', 'striderKick', 'wingClip'];

export function prepare(c: Combat): void {
  const t = T(c);
  const b = build(c);
  const p = c.player;
  const s = state(c);
  Object.assign(s, { focus: 100, petSwing: null, petNext: 0, lastPetAction: -Infinity, biteReady: 0 });
  p.maxResource = Math.max(1, Number(c.options.mana ?? 4000));
  p.regenPerSecond = 0;
  c.manaLocked = !!c.options.lockMana;
  // Melee weaving (optional, ranged builds): both autos on, the Auto Shot reset rule from Settings.
  setupWeaving(c, !!b.melee);
  c.classicAutoShot = !!c.options.classicAutoShot;

  c.mod.crit = t.lethalAttacks;
  c.mod.hit = t.surefooted;
  // Improved Tracking: all damage against a trackable dummy.
  s.allDamage = c.options.trackable !== false ? 1 + 0.01 * t.improvedTracking : 1;
  c.mod.physicalDamage = s.allDamage;
  const mult = (id: string, n: number) => { c.mod.damageFor[id] = (c.mod.damageFor[id] ?? 1) * n; };
  for (const id of RANGED_SHOTS) mult(id, 1 + 0.01 * t.rangedWeaponSpecialization);
  for (const id of ['aimedShot', 'multiShot']) mult(id, 1 + [0, 0.03, 0.07, 0.1][t.barrage]);
  mult('serpentSting', 1 + [0, 0.06, 0.13, 0.2][t.improvedStings]);
  for (const id of [...RANGED_SHOTS, 'arcaneShot', 'serpentSting']) c.mod.critMultiplierFor[id] = c.rules.critMultiplier + 0.06 * t.mortalShots;
  for (const id of MELEE_ABILITIES) {
    c.mod.critMultiplierFor[id] = c.rules.critMultiplier + 0.06 * t.predatorsEdge;
    c.mod.critFor[id] = 2 * t.savageStrikes;
  }
  c.mod.offHand = 1 + 0.1 * t.predatorsEdge;

  if (!b.pet && t.loneWolf) c.applyAura(p, { id: 'loneWolf', name: 'Lone Wolf', icon: 'loneWolf', duration: Infinity, damageDone: 1.2 });
  if (b.pet && t.focusedFire) c.applyAura(p, { id: 'focusedFire', name: 'Focused Fire', icon: 'focusedFire', duration: Infinity, damageDone: 1 + 0.01 * t.focusedFire });
  // Before the pull: your aspect and Trueshot Aura are up.
  aspect(c, b.melee ? 'aspectOfTheBeast' : 'aspectOfTheHawk');
  if (t.trueshotAura) c.applyAura(p, { id: 'trueshotAura', name: 'Trueshot Aura', icon: 'trueshotAura', duration: 1800, rangedAttackPower: D.trueshotAura.rap });

  c.pet.out = b.pet;
  if (b.pet) {
    c.applyAura(p, { id: 'petAI', name: 'Pet', icon: 'petClaw', duration: Infinity, period: 0.1, hidden: true, onTick: (cc) => petThink(cc) });
  }

  c.registerSource('autoShot', 'Auto Shot', 'autoShot');
  c.registerSource('petMelee', 'Pet: Cat', 'petClaw');
  c.registerSource('petClaw', 'Pet: Claw', 'petClaw');
  c.registerSource('petBite', 'Pet: Bite', 'petBite');
  c.registerSource('hawk', 'Hawks', 'summonHawk');
  c.registerSource('hawkDive', 'Hawk dive', 'summonHawk');
  c.registerSource('laceratingStrikes', 'Lacerating Strikes', 'laceratingStrikes');
  c.trackedAuras.push('quickShots', 'hawkA', 'rapidRecuperation');
  c.trackedTargetAuras.push('serpentSting', 'huntersMark', 'immolationTrap');

  c.onHit.push((hit: Hit) => {
    // Deadly Aspects: Quick Shots from Auto Shot with the Hawk, Quick Strikes from white swings with the Beast.
    const da = t.deadlyAspects;
    if (da && hit.source === 'autoShot' && c.aura(p, 'aspectOfTheHawk') && roll(c, 2 * da)) {
      c.applyAura(p, { id: 'quickShots', name: 'Quick Shots', icon: 'quickShots', duration: D.quickShots.duration, rangedHaste: D.quickShots.haste });
      c.count('quickShots');
    }
    if (da && hit.white && !hit.ranged && c.aura(p, 'aspectOfTheBeast') && roll(c, 2 * da)) {
      c.applyAura(p, { id: 'quickStrikes', name: 'Quick Strikes', icon: 'quickStrikes', duration: D.quickShots.duration, haste: D.quickShots.haste });
    }
    // Expose Prey: landed hits on your marked target can open Mongoose Bite for 10 s.
    if (t.exposePrey && c.aura(hit.target, 'huntersMark') && roll(c, 5 * t.exposePrey)) {
      c.applyAura(p, { id: 'mongooseReady', name: 'Expose Prey', icon: 'mongooseBite', duration: D.mongooseBite.window });
      c.count('exposePrey');
    }
  });
  c.afterDamage.push((hit: Hit) => {
    // The pet's and the hawks' own hits do not count as yours.
    if (hit.source.startsWith('pet') || hit.source.startsWith('hawk')) return;
    if (hit.outcome === 'dodge' && !hit.periodic) {
      const a = c.aura(p, 'mongooseReady');
      if (!a || a.end - c.t < D.mongooseBite.dodgeWindow) c.applyAura(p, { id: 'mongooseReady', name: 'Mongoose Bite', icon: 'mongooseBite', duration: D.mongooseBite.dodgeWindow });
    }
    // Resourcefulness: a melee or ranged ability crit (not auto attacks or traps, Oct 15) can give casting regen for 30 s.
    if (hit.outcome === 'crit' && !hit.periodic && !hit.white && t.resourcefulness && roll(c, 50 * t.resourcefulness)) {
      c.applyAura(p, { id: 'resourcefulness', name: 'Resourcefulness', icon: 'resourcefulness', duration: 30 });
    }
  });
}

// ------------------------------------------------------- practice helpers
export function chances(c: Combat): { title: string; rows: [string, string][] }[] {
  const tl = T(c);
  const pct = (n: number) => `${Math.max(0, Math.min(100, n)).toFixed(1)}%`;
  const r = c.rules;
  const hit = c.totalHit();
  const w = c.stats.ranged;
  const haste = c.rangedHaste();
  const rows: [string, string][] = [
    ['Ranged: miss / crit (no dodge, parry or glancing)', `${pct(r.specialMiss - hit)} / ${pct(c.critChance('autoShot'))}`],
    ['Ranged crit damage', `${(c.rules.critMultiplier + 0.06 * tl.mortalShots).toFixed(1)}x${tl.mortalShots ? ' (Mortal Shots)' : ''}`],
  ];
  if (build(c).melee) {
    rows.push(
      ['Melee crit (abilities)', `${pct(c.critChance('melee_mh'))} (${pct(c.critChance('raptorStrike'))})`],
      ['Melee white: miss (dual wield) / dodge / glancing', `${pct(r.dualWieldMiss - hit)} / ${pct(c.dodgeChance())} / ${pct(r.glanceChance)}`],
    );
  }
  const procs: [string, string][] = [];
  if (tl.deadlyAspects) procs.push(['Quick Shots / Quick Strikes (+30% speed, 12 s)', `${2 * tl.deadlyAspects}% per Auto Shot with the Hawk / per white swing with the Beast`]);
  if (tl.exposePrey) procs.push(['Expose Prey: Mongoose Bite for 10 s', `${5 * tl.exposePrey}% per landed hit on your marked target`]);
  if (tl.frenzy && c.pet.out) procs.push(['Frenzy: pet +30% attack speed for 8 s', `${20 * tl.frenzy}% per pet crit`]);
  if (tl.resourcefulness) procs.push(['Resourcefulness: casting regen for 30 s', `${50 * tl.resourcefulness}% per melee or ranged ability crit (not auto attacks or traps)`]);
  if (c.raid.has('judgementOfWisdom')) procs.push(['Judgement of Wisdom: +59 mana', '50% per landed hit or shot']);
  const groups = [
    { title: 'Your attacks', rows },
    {
      title: 'Auto Shot',
      rows: [
        ['Shot cycle (windup start to windup start)', w ? `${(w.speed / haste).toFixed(2)} s (weapon ${w.speed.toFixed(1)} s, haste x${haste.toFixed(2)})` : '-'],
        ['Windup: stand still', `${(0.5 / haste).toFixed(2)} s; moving makes it try again 0.5 s later`],
        ['Range', '8 to 35 yards (closer is the dead zone)'],
        ['Rule', c.classicAutoShot ? 'Classic: a cast started in the windup clips the shot' : 'Forever: autos keep firing while you cast'],
      ] as [string, string][],
    },
    { title: 'Procs', rows: procs },
  ];
  if (c.pet.out) {
    groups.push({
      title: 'Pet (Cat)',
      rows: [
        ['Swing time / crit vs the boss', `${petSpeed(c).toFixed(1)} s / ${pct(petCrit(c))}`],
        ['Attack power (10% of yours + its own)', `${Math.round(petAp(c))}`],
        ['Focus', '10 per second (cap 150): Bite on cooldown, Claw with spare Focus'],
      ],
    });
  }
  groups.push({ title: 'Mana', rows: [['Regeneration now', `${regen(c).toFixed(1)} per second (Spirit stops for 5 s after you spend mana)`]] });
  return groups;
}

/** How often an ability was used compared with its cooldown, 0 to 1. */
export function onCooldown(c: Combat, id: string, cooldown: number): number {
  const time = c.counters.combatTime ?? 0;
  const row = c.meter.rows.get(id);
  const casts = row ? row.hits + row.misses : 0;
  return time > 0 ? Math.min(1, (casts * cooldown) / time) : 0;
}

export const SOURCES = [
  { label: 'wow-forever-sim', url: 'https://github.com/gunba/wow-forever-sim' },
  { label: 'foreversim', url: 'https://github.com/laurencestokes/foreversim' },
];
