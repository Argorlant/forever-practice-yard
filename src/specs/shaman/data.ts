// Every number the shaman uses, in one place. Sources and confidence for each
// value are in research/shaman_forever.json and research/shaman_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';

const PERSUADER = { name: 'Persuader', type: 'mace' as const, min: 89, max: 167, speed: 2.8 };

/**
 * gs's UI default gear (real Forever items), Orc, unbuffed. Hit and crit are
 * gear, Intellect/Agility and Orc Savage (+1 % melee and spell crit since Oct 15): Tidal Focus and Thundering Strikes are
 * added from the talents. Spell power includes Mental Quickness where the
 * build has it, attack power Mental Dexterity (both scale with Intellect).
 */
export const ELEMENTAL_STATS: Stats = {
  attackPower: 296, crit: 10.3, hit: 6.9, spellCrit: 11.8,
  spellPower: 228, spellPowerBySchool: { nature: 10 },
  mainHand: PERSUADER, offHand: null, shield: true, health: 2510,
};
/** Stormcaller: the same gear; Mental Quickness turns 30 % of Intellect into spell power, Mental Dexterity 100 % into attack power. */
export const STORMCALLER_STATS: Stats = {
  ...ELEMENTAL_STATS, attackPower: 517, spellCrit: 12.0, spellPower: 294,
};
/** Enhancement: Forest Defender's Axe (two-handed), Orc (Savage: +1 % crit with everything since Oct 15, was axes only). */
export const ENHANCEMENT_STATS: Stats = {
  attackPower: 732, crit: 13.5, hit: 4.9, spellCrit: 8.9,
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
  lightningBolt: { mana: 220, cast: 2.5, min: 190, max: 212, coeff: 0.714, speed: 20 },
  // Oct 15: about 35% cheaper on every rank (gs chain_lightning.go: 145/200/250/315, was 225/305/390/485).
  chainLightning: { mana: 315, cast: 2, cooldown: 6, min: 119, max: 134, coeff: 0.571, jump: 0.7, targets: 3 },
  // Rank 4 since Oct 15 (the old rank 3's numbers; ranks at 30/40/50/60). Elemental Mastery cuts the cast by 0.5 s.
  lavaBurst: { mana: 265, cast: 2.5, cooldown: 10, min: 192, max: 248, coeff: 0.714, flameShockBonus: 0.2 },
  shockCooldown: 6,
  earthShock: { mana: 450, min: 293, max: 309, coeff: 0.386, threat: 2, range: 20 },
  flameShock: { mana: 410, direct: 166, coeff: 0.214, tick: 44, tickCoeff: 0.1, ticks: 4, period: 3, range: 20 },
  frostShock: { mana: 430, min: 278, max: 295, coeff: 0.386, range: 20 },
  // Oct 15: 8% of base mana (1520 at 60, gs base_stats.go), was 125.
  stormstrike: { mana: 121, cooldown: 8, bonus: 0.2, duration: 12 },
  // Oct 15: rank 5 much weaker and cheaper (gs fire_totems.go: 232-258, 375 mana, coefficient 0.143; was 397-443, 520, 0.214).
  fireNova: { mana: 375, cooldown: 10, min: 232, max: 258, coeff: 0.143, radius: 10 },
  lightningShield: { mana: 370, orbs: 3, damage: 178, coeff: 0.267, icd: 3.5, duration: 600 },
  rageOfTheFarseer: { cooldown: 180, duration: 25, haste: 0.3 },
  windfuryWeapon: { ap: 333 },                       // 20 %, 1.5 s cooldown (engine/raid.ts WINDFURY)
  flametongueWeapon: { perSpeed: 28.1, coeff: 0.1 },
  rockbiterWeapon: { ap: 653, threat: 72 },
  searingTotem: { mana: 170, duration: 55, period: 2.5, min: 40, max: 54, coeff: 0.017, range: 20 },   // gs 2.5 s, fs 2.2 s
  magmaTotem: { mana: 650, duration: 20, period: 2, damage: 73, coeff: 0.033, radius: 8 },
  windfuryTotem: { mana: 250, duration: 300 },
  graceOfAirTotem: { mana: 250, duration: 300, crit: 77 / 19.7 },   // rank 2, +77 Agility (rank 3 is an Ahn'Qiraj book)
  strengthOfEarthTotem: { mana: 225, duration: 300, ap: 84 },      // rank 4, +42 Strength (rank 5 is an Ahn'Qiraj book)
  stoneskinTotem: { mana: 210, duration: 300, reduction: 30 },
  manaSpringTotem: { mana: 100, duration: 300, perSecond: 5 },     // 10 mana every 2 s
  clearcasting: { chance: 10, duration: 15 },
  elementalDevastation: { duration: 10 },
  // Oct 15: the 31-point talent again. 15 s of Lightning Bolt and Lava Burst 0.5 s faster and Chain Lightning off cooldown; 3 min.
  elementalMastery: { cooldown: 180, duration: 15, castCut: 0.5 },
  maelstromWeapon: { ppm: 10, max: 5, duration: 30 },              // 10 per minute at any rank (both sims, Oct 16)
  flurry: { charges: 3, duration: 15 },
  improvedStormstrike: { duration: 15, regen: 0.5 },
  lightningOverload: { damage: 0.5 },
  weaponMastery: 1.1,       // disputed: off by default
  manaPotion: { min: 1350, max: 2250, cooldown: 120 },
  spirit: { elemental: 110, enhancement: 103 },
  mp5: { elemental: 0, enhancement: 9 },
};
