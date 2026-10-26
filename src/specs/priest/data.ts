// Every number the priest uses, in one place. Sources and confidence for each
// value are in research/priest_forever.json and research/priest_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';

const MACE = { name: 'Persuader', type: 'mace' as const, min: 89, max: 167, speed: 2.8 };

/**
 * Shadow: gs's UI default gear (real Forever items), Troll, unbuffed. Shadow
 * spell power 206 (178 for every school + 28 Shadow only), spell crit from
 * gear and Intellect, hit from gear (Shadow Focus adds 5 % to Shadow spells).
 */
export const SHADOW_STATS: Stats = {
  attackPower: 100,
  crit: 5,
  hit: 7.9,
  spellCrit: 11.3,      // Oct 15: Mental Strength is 2% Intellect per point (was 3%)
  spellPower: 178,
  spellPowerBySchool: { shadow: 28 },
  mainHand: MACE,
  offHand: null,
  health: 2237,
};

/** Smite: the same gear with the Holy pieces: Holy spell power 205 (192 + 13 Holy only). Holy Specialization adds crit on top. */
export const SMITE_STATS: Stats = {
  attackPower: 100,
  crit: 5,
  hit: 7.9,
  spellCrit: 10.6,      // Oct 15: Mental Strength is 2% Intellect per point (was 3%)
  spellPower: 192,
  spellPowerBySchool: { holy: 13 },
  mainHand: MACE,
  offHand: null,
  health: 2157,
};

const BASE_MANA = 1376;

export const DATA = {
  gcd: 1.5,
  baseMana: BASE_MANA,
  spellMiss: 17,
  mindBlast: { mana: 350, cast: 1.5, cooldown: 8, min: 477, max: 504, coeff: 0.429 },
  mindFlay: { mana: 205, duration: 3, ticks: 3, tick: 130, coeff: 0.167, range: 20 },
  // Oct 15: Improved Mind Flay makes each tick 10/20% stronger than the one before (gs compounds it: x1.0/1.2/1.44 at 2/2).
  improvedMindFlay: 0.1,
  // Oct 15, Shadow row 4: Mind Blast and a full Mind Flay raise Spirit 3% per point for 10 sec.
  darkInspiration: { duration: 10, spirit: 0.03 },
  shadowWordPain: { mana: 470, ticks: 6, period: 3, tick: 127, coeff: 0.2 },
  // Oct 15: 24 sec (was 1 min), the length of its DoT.
  devouringPlague: { mana: 985, cooldown: 24, ticks: 8, period: 3, tick: 106, coeff: 0.1 },
  // Oct 15: 18 sec (the client had 15).
  shadowWordDeath: { mana: 340, cooldown: 18, min: 444, max: 472, coeff: 0.429, backlash: 0.1 },
  shadowform: { mana: Math.round(BASE_MANA * 0.4), damage: 1.1, cost: 0.5, critMultiplier: 2 },
  innerFocus: { cooldown: 180, crit: 25 },
  powerInfusion: { mana: Math.round(BASE_MANA * 0.2), cooldown: 180, duration: 15, damage: 1.2 },
  smite: { mana: 280, cast: 2.5, min: 166, max: 187, coeff: 0.714 },
  holyFire: { mana: 255, cast: 3.5, min: 184, max: 232, coeff: 0.75, ticks: 5, period: 2, tick: 15, tickCoeff: 0.05 },
  holyNova: { mana: 750, min: 174, max: 200, coeff: 0.107, range: 10 },
  penance: { mana: 385, cooldown: 12, bolts: 3, duration: 2, damage: 92, coeff: 0.19, range: 36 },
  shadowWeaving: { stacks: 5, duration: 15, perStack: 0.02 },
  holyPurpose: 10,
  manaPotion: { min: 1350, max: 2250, cooldown: 120 },
  spirit: 145,
  mp5: 9,
};
