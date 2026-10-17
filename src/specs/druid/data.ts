// Every number the druid uses, in one place. Sources and confidence for each
// value are in research/druid_forever.json and research/druid_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';

/**
 * Cat: gunba's UI default (Night Elf), unbuffed. In Forever a form swings
 * with your weapon's DPS: a cat every 1.0 s for weapon DPS + AP/14, so the
 * "weapon" here is the Mithril Warhammer's DPS (32.6) at a 1.0 s swing.
 * AP is the cat sheet; crit is Agility + gear (talents are added on top).
 */
export const CAT_STATS: Stats = {
  attackPower: 829,
  crit: 16.3,   // 0.9 base + Agility 257 / 20 + 2.5 gear
  hit: 3.9,     // gear (Nature's Reach adds 4 %)
  spellCrit: 0,
  mainHand: { name: 'Cat attack (Mithril Warhammer, 32.6 DPS)', type: 'fist', min: 26, max: 39.1, speed: 1 },
  offHand: null,
};

/**
 * Bear: the research's round demo sheet from gunba's ranked gear (hypothetical).
 * A bear swings every 2.5 s for weapon DPS x 2.5 + AP/14 x 2.5.
 */
export const BEAR_STATS: Stats = {
  attackPower: 900,
  crit: 16,     // Agility + gear (Sharpened Claws and Leader of the Pack are added on top)
  hit: 6,
  spellCrit: 0,
  mainHand: { name: 'Bear attack (two-hand mace, 61.6 DPS)', type: 'mace', min: 123, max: 185, speed: 2.5 },
  offHand: null,
  tank: { health: 6500, armor: 7000, defense: 300, dodge: 17, parry: 0, block: 0, blockValue: 0 },
};

/** Balance: gunba's UI default moonkin (Night Elf), unbuffed. */
export const BALANCE_STATS: Stats = {
  attackPower: 200,
  crit: 5,
  hit: 7.9,          // gear (Nature's Reach adds 4 %)
  spellCrit: 10.2,   // 1.8 base + Intellect 204 / 60 + 5 gear (Nature's Majesty and Moonkin Aura are added on top)
  spellPower: 205,
  mainHand: { name: 'Staff', type: 'staff', min: 60, max: 90, speed: 3, twoHand: true },
  offHand: null,
};

export const DATA = {
  // Cat
  catGcd: 1,
  catRefund: 0.8,           // provisional: builders refund 80 % when avoided
  shred: { cost: 60, bonus: 80, percent: 1.55 },
  claw: { cost: 45, bonus: 115, percent: 1.1 },
  // Attack power shares: gs's fit to beta logs (provisional); foreversim uses 5 % on both.
  rake: { cost: 40, initial: 61, tick: 34, ticks: 3, period: 3, apInitial: 0.065, apTick: 0.045 },
  rip: { cost: 30, tick: 15, tickPerCp: 25.5, apPerCp: 0.01, ticks: 6, period: 2 },
  ferociousBite: { cost: 35, min: 52, max: 112, perCp: 147, apPerCp: 0.03, perEnergy: 2.7 },
  shiftingPower: { mana: 684, energy: 40, cooldown: 16 },
  berserk: { cooldown: 180, duration: 15 },
  faerieFire: { cooldown: 6, armor: 505, duration: 40, mana: 115 },
  ravage: { cost: 60, bonus: 98, percent: 3.5 },
  pounce: { cost: 50, total: 150, ticks: 6, period: 3, stun: 2 },
  prowl: { cooldown: 10, speed: 0.7 },
  cower: { cost: 20, cooldown: 10, threat: -1200 },
  dash: { cooldown: 300, duration: 15, speed: 1.6 },
  thistleTea: { energy: 100, cooldown: 300 },
  manaPotion: { min: 1350, max: 2250, cooldown: 120 },
  omen: { ppm: 2, icd: 10 },          // provisional: 2 procs per minute (fs), 10 s internal cooldown
  judgementOfWisdom: { chance: 50, mana: 59 },
  catThreat: 0.71,
  // Bear
  bearGcd: 1.5,
  bearRagePerSwing: 3.46 * 2.5 * 1.3, // confirmed: 11.25 per landed swing (the two-hand rate at a 2.5 s swing)
  bearCritFactor: 2,                   // +100 % since 8 Oct
  maul: { cost: 15, bonus: 128, threat: 1.75 },
  primalBite: { cost: 20, cooldown: 6, bonus: 77, threat: 3 },
  lacerate: { cost: 15, tick: 15, period: 3, duration: 15, stacks: 5, hitPerStack: 0.1, threat: 3.33 },
  swipe: { cost: 20, base: 83, apRatio: 0.03, targets: 3, threat: 2 },
  demoralizingRoar: { cost: 10, apReduction: 204, duration: 30, threat: 100 },
  enrage: { now: 10, perSecond: 2, duration: 10, cooldown: 60 },
  frenziedRegeneration: { cooldown: 180, duration: 10, ragePerSecond: 10 },
  barkskin: { cooldown: 60, duration: 15, damageTaken: 0.8 },
  bash: { cost: 10, cooldown: 60, duration: 4 },
  feralCharge: { cost: 5, cooldown: 15, minRange: 8, maxRange: 25 },
  bearThreat: 1.5,
  // Balance
  spellGcd: 1.5,
  partialResist: 0.94,     // classic: level-based partial resists on Wrath, Starfire and Moonfire vs +3
  wrath: { mana: 120, cast: 2, min: 92, max: 102, coeff: 0.571, eclipseCharges: 2 },
  starfire: { mana: 340, cast: 3.5, min: 350, max: 412, coeff: 1 },
  moonfire: { mana: 375, min: 128, max: 151, coeff: 0.15, tick: 60, tickCoeff: 0.13, ticks: 4, period: 3 },
  insectSwarm: { mana: 160, tick: 31, tickCoeff: 0.158, ticks: 6, period: 2 },
  innervate: { mana: 62, cooldown: 360, duration: 20, regen: 5 },
  moonkinForm: { mana: 435, crit: 3 },
  naturesGrace: { haste: 0.1, gcd: 0.9, duration: 3 },
  eclipse: { maxCharges: 4, duration: 15 },
  spellMiss: 17,
};
