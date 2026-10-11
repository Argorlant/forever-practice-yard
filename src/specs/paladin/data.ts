// Every number the paladin uses, in one place. Sources and confidence for each
// value are in research/paladin_forever.json and research/paladin_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats } from '../../engine/types';

/**
 * Retribution: gs's ranked Ret sheet (Undead, modeled ilvl 65 gear), unbuffed.
 * Stats are gear + Agility + Strength; talents (Conviction, Precision) go on
 * top. Spell power already counts Champion of the Light (60 % of 200 Int).
 */
export const RET_STATS: Stats = {
  attackPower: 736,
  crit: 17.4,       // 22.4 on the sheet minus Conviction 5
  hit: 14.4,        // gear (Precision adds 2)
  spellCrit: 20.1,
  spellPower: 258,
  mainHand: { name: 'Two-handed spell mace', type: 'mace', min: 187, max: 281, speed: 3.8, twoHand: true },
  offHand: null,
};

/** Protection: the research's round demo sheet (gs UI default, rounded up), one-hander and shield. */
export const PROT_STATS: Stats = {
  attackPower: 600,
  crit: 20.5,       // gear + Agility (Conviction 2 goes on top)
  hit: 14.4,        // gear (Precision adds 2)
  spellCrit: 20.6,
  spellPower: 250,
  mainHand: { name: 'One-handed sword', type: 'sword', min: 70, max: 105, speed: 1.8 },
  offHand: null,
  shield: true,
  tank: { health: 7000, armor: 8000, defense: 320, dodge: 6, parry: 7, block: 7, blockValue: 70 },
};

/** Shockadin (our proposal): the ranked Ret gear with the 31/0/20 build. */
export const SHOCK_STATS: Stats = {
  attackPower: 736,
  crit: 17.4,       // gear + Agility (Conviction 3 goes on top)
  hit: 14.4,
  spellCrit: 20.1,  // Holy Power adds 5 % to every spell, 15 % to Holy Shock
  spellPower: 138,  // no Champion of the Light in this build
  mainHand: { name: 'Two-handed spell mace', type: 'mace', min: 187, max: 281, speed: 3.8, twoHand: true },
  offHand: null,
};

const BASE_MANA = 1512;

export const DATA = {
  gcd: 1.5,
  baseMana: BASE_MANA,
  normalizedSpeed: { oneHand: 2.4, twoHand: 3.3 },
  partialResist: 0.94,        // provisional: gs's average partial resist on non-binary Holy damage
  refund: 0.8,                // provisional: avoided Holy Strike refunds 80 %
  // Seals: 30 s, 1.5 s GCD, one at a time. Judgement does not use them up.
  sealDuration: 30,
  sealOfRighteousness: { mana: 200, perSpeed: 18.8, twoHand: 1.2, oneHand: 0.85, coeff2h: 0.22, coeff1h: 0.2 },
  sealOfCommand: { mana: 210, ppm: 7, icd: 1, weapon: 0.7, coeff: 0.203 },
  sealOfFury: { mana: 200, damage: 35, coeff: 0.1, absorb: 0.5, absorbDuration: 30 },
  judgement: { mana: Math.round(BASE_MANA * 0.06), cooldown: 10, range: 10 },
  judgementOfRighteousness: { min: 170, max: 186, coeff: 0.5 },
  judgementOfCommand: { min: 169.5, max: 186.5, coeff: 0.429 },
  judgementOfFury: { min: 153, max: 167, coeff: 0.45, taunt: 4 },
  judgementOfTheCrusader: 161, // Holy damage taken, scaled by each spell's coefficient
  holyStrike: { mana: 20, cooldown: 10, min: 81, max: 105, percent: 0.5, coeff: 0.429 * 0.5 },
  consecration: { mana: 565, cooldown: 8, ticks: 8, all: 12, first4: 27, coeff: 0.095 },
  exorcism: { mana: 345, cooldown: 15, min: 474, max: 530, coeff: 0.429, range: 30 },
  hammerOfWrath: { mana: 425, cooldown: 6, gcd: 1, cast: 1, min: 473, max: 523, coeff: 0.429, range: 30, threshold: 0.2 },
  holyShield: { mana: 240, cooldown: 10, duration: 10, block: 30, charges: 4, damage: 221, coeff: 0.08, threat: 1.2 },
  righteousFury: { mana: Math.round(BASE_MANA * 0.3), duration: 1800, holyThreat: 1.6 },
  templarsBulwark: { mana: 110, cooldown: 300, duration: 8, absorb: 1, forbearance: 60 },
  swiftJudgement: { cooldown: 60 },
  holyShock: { mana: 325, cooldown: 10, min: 334, max: 362, coeff: 0.429, range: 20 },
  divineFavor: { mana: Math.round(BASE_MANA * 0.04), cooldown: 120 },
  layOnHands: { cooldown: 1200 },
  manaPotion: { min: 1350, max: 2250, cooldown: 120 },
  // Procs and passives
  vengeance: { duration: 30, stacks: 3 },
  vindication: { apPerRank: 68, duration: 30 },
  reckoning: { onBlock: 8, onCrit: 20, icd: 1.5 },
  redoubt: { chance: 2, block: 4, duration: 10, blocks: 5 },
  shieldSpecialization: { manaPct: 0.06, icd: 3 },
  ironCreed: { duration: 6 },
  improvedSealOfFuryMana: 87,  // 60 at 60, +15 % per attacker level above you (boss +3)
  // Mana
  spirit: 100,                 // provisional: Spirit regen 6.25 + Spi/8 per second outside the five-second rule
};
