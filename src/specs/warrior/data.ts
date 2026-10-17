// Every number the warrior uses, in one place. Sources and confidence for
// each value are in research/warrior_forever.json and research/warrior_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';

/**
 * Fury: gunba/wow-forever-sim's UI default (Human, real Forever items),
 * unbuffed. Crit is Agility + gear + Human Ruthless (+2 % with any weapon
 * since Oct 15, was the sword racial); Cruelty and Berserker Stance go on top.
 */
export const FURY_STATS: Stats = {
  attackPower: 784,
  crit: 16.2,   // Agility 7.15 + gear 7 + Human Ruthless 2
  hit: 9.9,     // gear
  spellCrit: 0,
  mainHand: { name: 'Ironwood Blade', type: 'sword', min: 79, max: 148, speed: 2.4 },
  offHand: { name: 'Persuader', type: 'mace', min: 89, max: 167, speed: 2.8 },
};

/** Arms: gunba's UI default (Human), a two-handed polearm, unbuffed. */
export const ARMS_STATS: Stats = {
  attackPower: 838,
  crit: 16.2,   // Agility 7.15 + gear 7 + Human Ruthless 2 (Oct 15; Weaponmaster adds the polearm crit)
  hit: 7.9,
  spellCrit: 0,
  mainHand: { name: 'Blackfury', type: 'polearm', min: 105, max: 158, speed: 2.1, twoHand: true },
  offHand: null,
};

/**
 * Protection: gunba's ranked tank weapons with the research's suggested
 * sheet for the dummy demo (hypothetical gear). Crit and hit are an
 * assumption: the sims publish none for an unbuffed tank.
 */
export const PROT_STATS: Stats = {
  attackPower: 1400,
  crit: 10,
  hit: 6,
  spellCrit: 0,
  mainHand: { name: 'Tank sword', type: 'sword', min: 68, max: 102, speed: 1.8 },
  offHand: null,
  shield: true,
  tank: { health: 8000, armor: 7800, defense: 315, dodge: 15, parry: 8, block: 12, blockValue: 75 },
};

export const NORMALIZED_SPEED = { oneHand: 2.4, twoHand: 3.3, dagger: 1.7 };

export const DATA = {
  gcd: 1.5,                 // confirmed: every warrior attack, not reduced by haste
  maxRage: 100,             // confirmed (Boundless Rage removed)
  decayOutOfCombat: 1,      // classic: about 1 rage per second
  refund: 0.8,              // provisional: 80 % of the paid cost when an attack misses, is dodged or parried
  // Rage from your white hits (confirmed, Forever normalized rage): a fixed amount per landed swing.
  rage: {
    oneHandPerSpeed: 3.46,
    twoHandPerSpeed: 4.5,
    offHandPerSpeed: 1.73,
    critFactor: 2,          // +100 % since 1 Oct (gs)
    // Rage from damage taken (partly confirmed): raw damage x (1 - 0.393) x C / 4365.
    incomingCoefficient: 10,
    expectedHealth: 4365,
    referenceArmor: 0.393,
    tacticalMastery: 10,    // baseline: rage kept on a stance swap
  },
  heroicStrike: { cost: 15, bonus: 157, threat: 173 },
  cleave: { cost: 20, bonus: 50, threat: 100, targets: 2 },
  bloodthirst: { cost: 30, cooldown: 6, apRatio: 0.45, bonus: 48, haste: 0.1, duration: 10 },
  mortalStrike: { cost: 30, cooldown: 6, bonus: 160 },
  whirlwind: { cost: 25, cooldown: 10, targets: 4 },
  slam: { cost: 15, cooldown: 18, cast: 1.5, bonus: 87, threat: 140 },
  execute: { cost: 15, base: 600, perRage: 15, threshold: 0.2 },
  overpower: { cost: 5, cooldown: 5, bonus: 35, window: 5 },
  revenge: { cost: 5, cooldown: 5, min: 138, max: 168, window: 5 },
  shieldSlam: { cost: 20, cooldown: 6, min: 640, max: 670, threat: 508 },
  shieldBlock: { cost: 10, cooldown: 5, block: 75, duration: 7, charges: 2 },
  sunderArmor: { cost: 15, armor: 450, stacks: 5, duration: 30, threat: 206 },
  thunderClap: { cost: 20, cooldown: 6, damage: 103, slow: 0.2, duration: 30, targets: 4 },
  demoralizingShout: { cost: 10, apReduction: 210, duration: 45, threat: 43 },
  battleShout: { cost: 10, ap: 140, duration: 180, threat: 60 },
  bloodrage: { cooldown: 60, now: 10, overTime: 10, duration: 10 },
  berserkerRage: { cooldown: 30, duration: 10, ragePerHit: 2 },
  recklessness: { cooldown: 1800, duration: 15, crit: 100, damageTaken: 1.2 },
  deathWish: { cost: 10, cooldown: 180, duration: 30, damage: 1.2, damageTaken: 1.05 },
  sweepingStrikes: { cost: 30, cooldown: 30, charges: 5, duration: 20 },
  rend: { cost: 10, tick: 21, ticks: 7, period: 3 },
  hamstring: { cost: 10, damage: 45 },
  pummel: { cost: 10, cooldown: 10, damage: 50 },
  shieldBash: { cost: 10, cooldown: 12, damage: 45 },
  shieldWall: { cooldown: 900, duration: 12, damageTaken: 0.4 },
  lastStand: { cooldown: 180, duration: 20, health: 0.3 },
  concussionBlow: { cost: 10, cooldown: 45, duration: 5 },
  charge: { rage: 15, cooldown: 15, minRange: 8, maxRange: 25 },
  intercept: { cost: 10, cooldown: 30, damage: 65, minRange: 8, maxRange: 25 },
  spearingStrike: { cost: 15, cooldown: 20, percent: 0.4 },
  stanceCooldown: 1,
  // Procs and passives.
  flurryCharges: 3,
  deepWounds: { ticks: 4, period: 3 },
  enrage: { chance: 30, duration: 12 },
  weaponmasterIcd: 0.2,
  threatPerRage: 5,         // confirmed: rage from non-damage sources, not modified by stance
};
