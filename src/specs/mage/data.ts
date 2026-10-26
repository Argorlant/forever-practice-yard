// Every number the mage uses, in one place. Sources and confidence for each
// value are in research/mage_forever.json and research/mage_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';

const SAGEBLADE = { name: 'Sageblade', type: 'sword' as const, min: 58, max: 109, speed: 1.8 };

/**
 * gs's UI default gear (real Forever items), Orc, unbuffed. Spell crit is
 * base + Intellect + gear + the Bloodvine set + Orc Savage (+1 % since Oct 15;
 * talents go on top: Arcane Instability, Arcane Impact, Critical Mass, Incineration).
 */
export const ARCANE_STATS: Stats = {
  attackPower: 100, crit: 6, hit: 7.9, spellCrit: 12.2,
  spellPower: 192, spellPowerBySchool: { arcane: 13 },
  mainHand: SAGEBLADE, offHand: null, health: 2230,
};
export const FIRE_STATS: Stats = {
  attackPower: 100, crit: 6, hit: 6.9, spellCrit: 11.9,
  spellPower: 192, spellPowerBySchool: { fire: 52 },
  mainHand: { name: 'Searing Golden Blade', type: 'dagger', min: 58, max: 109, speed: 1.8 }, offHand: null, health: 2090,
};
export const FROST_STATS: Stats = {
  attackPower: 100, crit: 6, hit: 7.9, spellCrit: 11.9,
  spellPower: 192, spellPowerBySchool: { frost: 13 },
  mainHand: SAGEBLADE, offHand: null, health: 2230,
};

const BASE_MANA = 1213;

export const DATA = {
  gcd: 1.5,
  baseMana: BASE_MANA,
  spellMiss: 17,
  // Trainer ranks since Oct 21 (gs): Frostbolt 11, Fireball 12 and Arcane Missiles 8 are Ahn'Qiraj books, and raids open on 9 December.
  frostbolt: { mana: 260, cast: 3, min: 382, max: 413, coeff: 0.814, speed: 28 },   // rank 10
  fireball: { mana: 395, cast: 3.5, min: 397, max: 505, coeff: 1, dot: 14, dotTicks: 4, dotPeriod: 2, speed: 24 },   // rank 11
  scorch: { mana: 150, cast: 1.5, min: 166, max: 197, coeff: 0.429 },
  fireBlast: { mana: 340, cooldown: 8, min: 417, max: 489, coeff: 0.429, range: 20 },
  pyroblast: { mana: 440, cast: 6, min: 520, max: 646, coeff: 1, dot: 53, dotCoeff: 0.15, dotTicks: 4, dotPeriod: 3, range: 35 },
  arcaneMissiles: { mana: 595, duration: 5, missiles: 5, damage: 175, coeff: 0.286 },   // rank 7
  // Oct 15 redesign (gs arcane_blast.go): 1.5 s cast, damage and coefficient -40%; each cast adds a stack (4, 15 s from
  // the first, not refreshed, not spent) worth 15% of your Intellect as spell damage; cost still +175% per stack.
  arcaneBlast: { manaPct: 0.15, perStack: 1.75, cast: 1.5, min: 218, max: 254, coeff: 0.429, stacks: 4, duration: 15, intPerStack: 0.15 },
  // Oct 15, Arcane 16-point talent, rank 4 (gs): as if you had 5% of your maximum mana more spell damage; 6 s cooldown.
  arcaneWrath: { mana: 395, cast: 3.5, cooldown: 6, min: 406, max: 496, coeff: 1, maxManaPct: 0.05 },
  // Ice Lance vs Frozen (Fingers of Frost): x3 since Oct 15 (was x4). Coefficient provisional: gs 0.10, fs 0.143.
  iceLance: { mana: 160, min: 136, max: 161, coeff: 0.1, frozen: 3 },
  // Rank 5 (gs frost_area.go): 10 yd; Improved Cone of Cold +12/23/35%. Winter's Chill feeds it since Oct 15.
  coneOfCold: { mana: 555, min: 328, max: 358, coeff: 0.129, cooldown: 10, range: 10, improved: [0, 0.12, 0.23, 0.35] },
  frostfireBolt: { mana: 370, cast: 3, min: 270, max: 314, coeff: 0.814, dot: 19, dotTicks: 3, dotPeriod: 3 },
  presenceOfMind: { cooldown: 180 },
  arcanePower: { cooldown: 180, duration: 15, damage: 0.3, cost: 0.3 },
  combustion: { cooldown: 180, perHit: 10, crits: 3 },
  coldSnap: { cooldown: 600 },
  evocation: { cooldown: 480, duration: 8, regen: 16 },
  manaRuby: { min: 1000, max: 1200, cooldown: 120 },
  manaPotion: { min: 1350, max: 2250, cooldown: 120 },
  clearcasting: { duration: 15, icd: 1 },
  // Oct 15: a 2-point talent; per point, Arcane Blast 20%, Arcane Wrath/Fireball/Frostbolt/Frostfire 10%. Arcane Missiles no longer proc it (Oct 21).
  missileBarrage: { duration: 15, arcaneBlast: 20, other: 10 },
  heatingUp: { stacks: 3, duration: 20, cut: 0.25 },
  ignite: { duration: 4, ticks: 2 },
  fireVulnerability: { stacks: 5, duration: 30, perStack: 0.03 },
  // Server hotfix (gs Oct 21): 20% per point from a landed Frostbolt or Fingers of Frost Ice Lance; stacks to the talent's rank,
  // each +5% damage and +0.07 spell power coefficient on your next Cone of Cold, which spends them.
  wintersChill: { duration: 15, chance: 20, coneBonus: 0.05, coneCoeff: 0.07 },
  // Server hotfix (gs Oct 21): +3% Frost damage while the shield holds (a dummy never breaks it) and Frigid Power +3% for 1 min.
  iceBarrier: { mana: 480, cooldown: 30, duration: 60, frost: 0.03 },   // rank 4
  // Oct 15: 1/2/3% Fire damage per point for each of your Fire effects on the target (Ignite, Fire Vulnerability, Fireball and Pyroblast burns), up to 4.
  firePower: { perEffect: 0.01, maxEffects: 4 },
  // Improved Fire Blast (Wake of Fire's slot since Oct 15): -1/-2 s cooldown, +8/15 yd range.
  improvedFireBlast: { cooldown: [0, 1, 2], range: [0, 8, 15] },
  // Mana is 933 + 15 x Intellect (research/mage_forever.json): Arcane Blast's stacks read Intellect from the mana pool.
  intellect: { manaAtZero: 933, manaPerPoint: 15 },
  fingersOfFrost: { chance: 15, duration: 15 },
  mageArmorShare: 0.5,
  spirit: 142,
  mp5: 9,
};
