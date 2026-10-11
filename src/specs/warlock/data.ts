// Every number the warlock uses, in one place. Sources and confidence for each
// value are in research/warlock_forever.json and research/warlock_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';

const SAGEBLADE = { name: 'Sageblade', type: 'sword' as const, min: 58, max: 109, speed: 1.8 };

/**
 * gs's UI default gear (real Forever items), Orc, unbuffed, with the
 * Spellstone (+21 Shadow and Fire). Hit is gear only (Suppression adds 1 %
 * per point); spell crit is gear and Intellect (Malevolence adds Shadow crit).
 */
export const AFFLICTION_STATS: Stats = {
  attackPower: 100, crit: 5, hit: 7.9, spellCrit: 10.9,
  spellPower: 210, spellPowerBySchool: { shadow: 15 },
  mainHand: SAGEBLADE, offHand: null, health: 2484,
};
/** Shadow and Flame: the Fire pieces and the Firestone (+21 Fire, +2 % crit). */
export const DESTRUCTION_STATS: Stats = {
  attackPower: 100, crit: 5, hit: 6.9, spellCrit: 12.1,
  spellPower: 192, spellPowerBySchool: { fire: 73 },
  mainHand: { name: 'Searing Golden Blade', type: 'dagger', min: 58, max: 109, speed: 1.8 }, offHand: null, health: 2334,
};
/** DS/Ruin: the Affliction gear with Fel Vitality's extra mana and Demonic Embrace's health. */
export const RUIN_STATS: Stats = { ...AFFLICTION_STATS, health: 2559 };
/** Demonic Pact: the Affliction gear; spell power includes Demonic Knowledge's +60. */
export const PACT_STATS: Stats = { ...AFFLICTION_STATS, spellPower: 270, spellPowerBySchool: { shadow: 15 } };

const BASE_MANA = 1373;

export const DATA = {
  gcd: 1.5,
  baseMana: BASE_MANA,
  spellMiss: 17,
  partialResist: 0.94,     // provisional: gs's average; Immolate, Shadowburn, Death Coil and Siphon Life are all or nothing
  shadowBolt: { mana: 380, cast: 3, min: 253, max: 283, coeff: 0.857, speed: 20 },
  immolate: { mana: 380, cast: 2, direct: 158, coeff: 0.2, tick: 55, tickCoeff: 0.13, ticks: 5, period: 3 },
  corruption: { mana: 340, cast: 2, tick: 73, coeff: 0.2, ticks: 6, period: 3 },
  baneOfAgony: { mana: 215, ticks: 12, period: 2, blocks: [23, 46, 69], coeff: 0.133 },
  baneOfDoom: { mana: 300, cooldown: 60, delay: 60, damage: 1742, coeff: 4 },
  curseOfTheElements: { mana: 200, duration: 300 },
  siphonLife: { mana: 365, ticks: 10, period: 3, tick: 41, coeff: 0.05 },
  drainLife: { mana: 300, duration: 5, ticks: 5, tick: 51, coeff: 0.1 },
  wrack: { mana: 200, duration: 6, ticks: 6, tick: 36, coeff: 0.143, bonus: 0.1 },
  searingPain: { mana: 168, cast: 1.5, min: 107, max: 126, coeff: 0.429 },
  soulFire: { mana: 335, cast: 6, cooldown: 60, min: 390, max: 487, coeff: 1 },
  incinerate: { mana: 325, cast: 2.5, min: 201, max: 233, coeff: 0.714, immolateBonus: 0.25 },
  conflagrate: { mana: 255, cooldown: 10, min: 251, max: 313, coeff: 0.429 },
  shadowburn: { mana: 365, cooldown: 15, min: 258, max: 288, coeff: 0.429 },
  deathCoil: { mana: 600, cooldown: 120, damage: 460, coeff: 0.214 },
  lifeTap: { base: 424 },
  amplifyCurse: { cooldown: 180, duration: 30, bonus: 0.5 },
  improvedShadowBolt: { duration: 12 },
  shadowTrance: { duration: 10 },
  shadowAndFlame: { duration: 20 },
  decimation: { threshold: 0.35, duration: 10 },
  demonicSacrifice: { damage: 1.15, voidMana: 0.02, voidPeriod: 4, felhunterHealth: 0.03 },
  soulLink: 1.03,
  manaPotion: { min: 1350, max: 2250, cooldown: 120 },
  // Demons (gs model): melee demons Str 129 / Agi 85, AP 2 x Str - 20 + 10 % of your spell power
  pet: {
    apBase: 238, apShare: 0.1, spShare: 0.1, swing: 2, base: 113, crit: 3.27 + 85 / 20,
    lashOfPain: { cooldown: 12, damage: 50, coeff: 0.429 },
    firebolt: { cast: 2, gap: 0.2, min: 41.5, max: 46.5, coeff: 0.571 },
    brand: { min: 65, max: 68, coeff: 0.078 },
  },
  healingShare: 20,        // our choice: raid healers keep up, healing 20 % of your missing health per second
  spirit: 132,
  mp5: 9,
};
