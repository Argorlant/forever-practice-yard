// Every number the warrior uses, in one place. Sources and confidence for
// each value are in research/warrior_forever.json and research/warrior_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';
import { sheet } from '../gear';

/** WoWSims Forever's Pre-BiS gear. */
export const FURY_STATS = sheet('warrior-fury');
export const ARMS_STATS = sheet('warrior-arms');
export const PROT_STATS = sheet('warrior-prot');

/** The older sims' sheets, for the community builds. Arms: gunba's UI default (Human), a two-handed polearm, unbuffed. */
export const GS_ARMS_STATS: Stats = {
  attackPower: 838,
  crit: 15.2,   // Agility 7.15 + gear 7 + Human Ruthless 1 (launch racials, Oct 26; Weaponmaster adds the polearm crit)
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
export const GS_PROT_STATS: Stats = {
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
    // Rage from damage taken: rageFromDamageTaken in ../common (measured on Forever logs, gs Oct 21).
    tacticalMastery: 10,    // baseline: rage kept on a stance swap
  },
  // Trainer ranks (gs Oct 21): Heroic Strike 9, Revenge 6 and Battle Shout 7 are Ahn'Qiraj books, and raids open on 9 December.
  // Heroic Strike rank 8: threat 2.5 per spell level (56); Cleave rank 5 and Slam 1.5 per spell level (WoWSims, Nov 8 logs), split between the targets it lands on.
  heroicStrike: { cost: 15, bonus: 138, threat: 140 },
  cleave: { cost: 20, bonus: 50, threat: 90, targets: 2 },
  bloodthirst: { cost: 30, cooldown: 6, apRatio: 0.45, bonus: 48, haste: 0.1, duration: 10 },
  mortalStrike: { cost: 30, cooldown: 6, bonus: 160 },
  whirlwind: { cost: 25, cooldown: 10, targets: 4, improvedCooldown: 1, improvedClosest: 0.15 },   // Improved Whirlwind, per point
  slam: { cost: 15, cooldown: 15, cast: 1.5, bonus: 87, threat: 81, improvedCooldown: 2.5 },   // Improved Slam, per point
  execute: { cost: 15, base: 600, perRage: 15, threshold: 0.2 },
  overpower: { cost: 5, cooldown: 5, bonus: 35, window: 5 },
  revenge: { cost: 5, cooldown: 5, min: 109, max: 133, ap: 0.25, window: 5 },   // rank 5, +25 % of attack power (Oct 30 hotfix); threat 2.25x its damage
  shieldSlam: { cost: 20, cooldown: 6, min: 640, max: 670, threat: 508 },
  shieldBlock: { cost: 10, cooldown: 5, block: 75, duration: 7, charges: 2 },
  sunderArmor: { cost: 15, armor: 450, stacks: 5, duration: 30, threat: 206, threatAp: 0.05 },   // threat 206 + 5 % of attack power
  thunderClap: { cost: 20, cooldown: 6, damage: 103, slow: 0.2, duration: 30, targets: 4 },
  demoralizingShout: { cost: 10, apReduction: 210, duration: 45, threat: 43 },
  battleShout: { cost: 10, ap: 111, duration: 180, threat: 0 },   // rank 6; Forever buffs make no threat (forever-bugs#64)
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
  spearingStrike: { cost: 15, cooldown: 20, percent: 0.75 },
  // 25 % of base health (1689 at 60); each of the next 4 white swings adds 5 rage.
  recklessSwings: { cooldown: 15, gcd: 1, duration: 8, charges: 4, rage: 5, health: 422 },
  stanceCooldown: 1,
  // Procs and passives.
  flurryCharges: 3,
  deepWounds: { ticks: 4, period: 3 },
  enrage: { chance: 30, duration: 12 },
  bloodthrill: { chance: 10, window: 5 },   // per point; the Overpower window is 5 s since a server hotfix (gs Oct 21)
  weaponmasterIcd: 0.2,
  threatPerRage: 5,         // rage from non-damage sources, times the stance's threat when the rage arrives (gs Oct 21)
};
