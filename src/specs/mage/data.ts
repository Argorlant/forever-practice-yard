// Every number the mage uses, in one place. Sources and confidence for each
// value are in research/mage_forever.json and research/mage_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';

const SAGEBLADE = { name: 'Sageblade', type: 'sword' as const, min: 58, max: 109, speed: 1.8 };

/**
 * gs's UI default gear (real Forever items), Orc, unbuffed. Spell crit is
 * base + Intellect + gear + the Bloodvine set (talents go on top: Arcane
 * Instability, Arcane Impact, Critical Mass, Incineration).
 */
export const ARCANE_STATS: Stats = {
  attackPower: 100, crit: 5, hit: 7.9, spellCrit: 11.2,
  spellPower: 192, spellPowerBySchool: { arcane: 13 },
  mainHand: SAGEBLADE, offHand: null, health: 2230,
};
export const FIRE_STATS: Stats = {
  attackPower: 100, crit: 5, hit: 6.9, spellCrit: 10.9,
  spellPower: 192, spellPowerBySchool: { fire: 52 },
  mainHand: { name: 'Searing Golden Blade', type: 'dagger', min: 58, max: 109, speed: 1.8 }, offHand: null, health: 2090,
};
export const FROST_STATS: Stats = {
  attackPower: 100, crit: 5, hit: 7.9, spellCrit: 10.9,
  spellPower: 192, spellPowerBySchool: { frost: 13 },
  mainHand: SAGEBLADE, offHand: null, health: 2230,
};

const BASE_MANA = 1213;

export const DATA = {
  gcd: 1.5,
  baseMana: BASE_MANA,
  spellMiss: 17,
  partialResist: 0.94,   // provisional: gs's average on non-binary spells (Frostbolt and Ice Lance are all or nothing)
  frostbolt: { mana: 290, cast: 3, min: 457, max: 493, coeff: 0.814, speed: 28 },
  fireball: { mana: 410, cast: 3.5, min: 425, max: 541, coeff: 1, dot: 15, dotTicks: 4, dotPeriod: 2, speed: 24 },
  scorch: { mana: 150, cast: 1.5, min: 166, max: 197, coeff: 0.429 },
  fireBlast: { mana: 340, cooldown: 8, min: 417, max: 489, coeff: 0.429, range: 20 },
  pyroblast: { mana: 440, cast: 6, min: 520, max: 646, coeff: 1, dot: 53, dotCoeff: 0.15, dotTicks: 4, dotPeriod: 3, range: 35 },
  arcaneMissiles: { mana: 655, duration: 5, missiles: 5, damage: 209, coeff: 0.286 },
  arcaneBlast: { manaPct: 0.15, perStack: 1.75, cast: 2.5, min: 364, max: 424, coeff: 0.714, stacks: 4, duration: 8, bonus: 0.1 },
  iceLance: { mana: 160, min: 136, max: 161, coeff: 0.1, frozen: 4 },   // coefficient provisional: gs 0.10, fs 0.143
  frostfireBolt: { mana: 370, cast: 3, min: 270, max: 314, coeff: 0.814, dot: 19, dotTicks: 3, dotPeriod: 3 },
  presenceOfMind: { cooldown: 180 },
  arcanePower: { cooldown: 180, duration: 15, damage: 0.3, cost: 0.3 },
  combustion: { cooldown: 180, perHit: 10, crits: 3 },
  coldSnap: { cooldown: 600 },
  evocation: { cooldown: 480, duration: 8, regen: 16 },
  manaRuby: { min: 1000, max: 1200, cooldown: 120 },
  manaPotion: { min: 1350, max: 2250, cooldown: 120 },
  clearcasting: { duration: 15, icd: 1 },
  missileBarrage: { duration: 15 },
  heatingUp: { stacks: 3, duration: 20, cut: 0.25 },
  ignite: { duration: 4, ticks: 2 },
  fireVulnerability: { stacks: 5, duration: 30, perStack: 0.03 },
  wintersChill: { duration: 15, perStack: 2 },
  fingersOfFrost: { chance: 15, duration: 15 },
  mageArmorShare: 0.5,
  spirit: 142,
  mp5: 9,
};
