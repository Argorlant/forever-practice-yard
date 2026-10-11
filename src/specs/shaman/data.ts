// Every number the shaman uses, in one place. Sources and confidence for each
// value are in research/shaman_forever.json and research/shaman_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';

const PERSUADER = { name: 'Persuader', type: 'mace' as const, min: 89, max: 167, speed: 2.8 };

/**
 * gs's UI default gear (real Forever items), Orc, unbuffed. Hit and crit are
 * gear and Intellect/Agility only: Tidal Focus and Thundering Strikes are
 * added from the talents. Spell power includes Mental Quickness where the
 * build has it, attack power Mental Dexterity (both scale with Intellect).
 */
export const ELEMENTAL_STATS: Stats = {
  attackPower: 296, crit: 9.3, hit: 6.9, spellCrit: 10.8,
  spellPower: 228, spellPowerBySchool: { nature: 10 },
  mainHand: PERSUADER, offHand: null, shield: true, health: 2510,
};
/** Stormcaller: the same gear; Mental Quickness turns 30 % of Intellect into spell power, Mental Dexterity 100 % into attack power. */
export const STORMCALLER_STATS: Stats = {
  ...ELEMENTAL_STATS, attackPower: 517, spellCrit: 11.0, spellPower: 294,
};
/** Enhancement: Forest Defender's Axe (two-handed), Orc (+1 % crit with axes, included). */
export const ENHANCEMENT_STATS: Stats = {
  attackPower: 732, crit: 13.5, hit: 4.9, spellCrit: 7.9,
  spellPower: 56,
  mainHand: { name: "Forest Defender's Axe", type: 'axe', twoHand: true, min: 162, max: 244, speed: 3.3 },
  offHand: null, health: 2960,
};
/** Off-tank (our proposal): one-handed mace and shield; the tank sheet includes Anticipation, Toughness and Spirit Weapons' parry. */
export const OFFTANK_STATS: Stats = {
  attackPower: 640, crit: 10.5, hit: 4.9, spellCrit: 7.9,
  spellPower: 56,
  mainHand: { name: 'Persuader', type: 'mace', min: 89, max: 167, speed: 2.8 },
  offHand: null, shield: true,
  tank: { health: 4300, armor: 6400, defense: 310, dodge: 11, parry: 5, block: 5, blockValue: 52 },
};

export const DATA = {
  gcd: 1.5,
  totemGcd: 1,             // confirmed: every totem, not hasted
  baseMana: 1520,
  spellMiss: 17,
  partialResist: 0.94,     // provisional: gs's average; Earth Shock is all or nothing
  lightningBolt: { mana: 220, cast: 2.5, min: 190, max: 212, coeff: 0.714, speed: 20 },
  chainLightning: { mana: 485, cast: 2, cooldown: 6, min: 119, max: 134, coeff: 0.571, jump: 0.7, targets: 3 },
  lavaBurst: { mana: 265, cast: 2.5, cooldown: 10, min: 192, max: 248, coeff: 0.714, flameShockBonus: 0.2 },
  shockCooldown: 6,
  earthShock: { mana: 450, min: 293, max: 309, coeff: 0.386, threat: 2, range: 20 },
  flameShock: { mana: 410, direct: 166, coeff: 0.214, tick: 44, tickCoeff: 0.1, ticks: 4, period: 3, range: 20 },
  frostShock: { mana: 430, min: 278, max: 295, coeff: 0.386, range: 20 },
  stormstrike: { mana: 125, cooldown: 8, bonus: 0.2, duration: 12 },
  fireNova: { mana: 520, cooldown: 10, min: 397, max: 443, coeff: 0.214, radius: 10 },
  lightningShield: { mana: 370, orbs: 3, damage: 178, coeff: 0.267, icd: 3.5, duration: 600 },
  rageOfTheFarseer: { cooldown: 180, duration: 25, haste: 0.3 },
  windfuryWeapon: { ap: 333 },                       // 20 %, 1.5 s cooldown (engine/raid.ts WINDFURY)
  flametongueWeapon: { perSpeed: 28.1, coeff: 0.1 },
  rockbiterWeapon: { ap: 653, threat: 72 },
  searingTotem: { mana: 170, duration: 55, period: 2.5, min: 40, max: 54, coeff: 0.017, range: 20 },   // gs 2.5 s, fs 2.2 s
  magmaTotem: { mana: 650, duration: 20, period: 2, damage: 73, coeff: 0.033, radius: 8 },
  windfuryTotem: { mana: 250, duration: 300 },
  graceOfAirTotem: { mana: 310, duration: 300, crit: 89 / 19.7 },   // +89 Agility
  strengthOfEarthTotem: { mana: 275, duration: 300, ap: 106 },     // +53 Strength
  stoneskinTotem: { mana: 210, duration: 300, reduction: 30 },
  manaSpringTotem: { mana: 100, duration: 300, perSecond: 5 },     // 10 mana every 2 s
  clearcasting: { chance: 10, duration: 15 },
  elementalDevastation: { duration: 10 },
  maelstromWeapon: { ppmPerPoint: 2, max: 5, duration: 30 },        // provisional: both sims
  flurry: { charges: 3, duration: 15 },
  improvedStormstrike: { duration: 15, regen: 0.5 },
  lightningOverload: { damage: 0.5 },
  weaponMastery: 1.1,       // disputed: off by default
  manaPotion: { min: 1350, max: 2250, cooldown: 120 },
  spirit: { elemental: 110, enhancement: 103 },
  mp5: { elemental: 0, enhancement: 9 },
};
