// Every number the hunter uses, in one place. Sources and confidence for each
// value are in research/hunter_forever.json and research/hunter_forever.md:
//   confirmed   = Forever beta client data, Wowhead Forever, Blizzard or an in-game log
//   provisional = a sim choice with no Forever source yet
//   classic     = Forever says nothing; the sims keep Classic's value
import type { Stats, Weapon } from '../../engine/types';
import { sheet } from '../gear';

/** WoWSims Forever's P1 gear: a two-hander to shoot and weave with, and two weapons for melee Survival. */
export const RANGED_STATS = sheet('hunter-ranged');
export const MELEE_STATS = sheet('hunter-melee');

const RIFLE: Weapon = { name: 'Core Marksman Rifle', type: 'gun', min: 107, max: 200, speed: 2.5 };
const GLAIVE: Weapon = { name: 'Legionite Glaive', type: 'polearm', min: 138, max: 207, speed: 3.2, twoHand: true };

/**
 * Marksmanship and Beast Mastery: gs's UI default gear (real Forever items),
 * Troll, unbuffed. Crit and hit are gear + Agility; Lethal Attacks and
 * Surefooted go on top. Aspect of the Hawk, Trueshot Aura and Hunter's Mark
 * are auras. Mana is the research's round demo sheet (the real one is 2,355).
 */
export const GS_RANGED_STATS: Stats = {
  attackPower: 738,
  rangedAttackPower: 1001,
  crit: 10.2,
  hit: 5.9,
  spellCrit: 0,
  mainHand: GLAIVE,
  offHand: null,
  ranged: RIFLE,
  ammoDps: 17.5,      // Thorium arrows
  rangedHaste: 1.15,  // quiver
};

/** Survival (melee): two Ironwood Blades; Aspect of the Beast adds 110 AP in combat. */
export const GS_MELEE_STATS: Stats = {
  attackPower: 713,
  rangedAttackPower: 972,
  crit: 10.4,         // Savage Strikes adds 4 % to melee abilities, Lethal Attacks 5 % to everything
  hit: 6.9,           // gear (Surefooted adds 3)
  spellCrit: 0,
  mainHand: { name: 'Ironwood Blade', type: 'sword', min: 79, max: 148, speed: 2.4 },
  offHand: { name: 'Ironwood Blade', type: 'sword', min: 79, max: 148, speed: 2.4 },
  ranged: RIFLE,
  ammoDps: 17.5,
  rangedHaste: 1.15,
};

const BASE_MANA = 1720;

export const DATA = {
  gcd: 1.5,
  baseMana: BASE_MANA,
  normalizedRanged: 2.8,
  normalizedOneHand: 2.4,
  normalizedTwoHand: 3.3,
  refund: 0.8,                 // provisional: an avoided shot refunds 80 % of its mana
  aimedShot: { mana: 310, cast: 2, cooldown: 6, bonus: 359 },   // +9 a hit, as Multi-Shot (WoWSims, from logs)
  multiShot: { mana: Math.round(BASE_MANA * 0.139), cast: 0, cooldown: 6, targets: 3 },   // instant since client 70425 (gs; testers fire it on the move)
  arcaneShot: { mana: Math.round(BASE_MANA * 0.11), cooldown: 6, damage: 280, rap: 0.15 },          // rank 8; RAP share: WoWSims, from Blizzard's notes (no row states it)
  // Rank 8 (gs Oct 21): rank 9 is an Ahn'Qiraj book, and raids open on 9 December. RAP: 3 % a tick (both sims since Oct 28).
  serpentSting: { mana: 230, ticks: 5, period: 3, tick: 100, rap: 0.05 },
  sniperShot: { mana: 365, cast: 4, cooldown: 15, bonus: 590, range: 45 },
  huntersMark: { mana: 60, duration: 120, rap: 143 },   // rank 4: 143 since a server hotfix (was 71, below rank 3's 98)
  rapidFire: { mana: 100, cooldown: 300, duration: 15, haste: 0.4 },
  aspectOfTheHawk: { mana: 120, rap: 110 },   // rank 6, doubled by the November hotfix (rank 7 is an Ahn'Qiraj book)
  aspectOfTheBeast: { mana: 110, ap: 110 },
  trueshotAura: { mana: 425, rap: 100 },   // rank 5, doubled by the November hotfix
  bestialWrath: { mana: Math.round(BASE_MANA * 0.12), cooldown: 120, duration: 18, damage: 1.5 },
  intimidation: { mana: Math.round(BASE_MANA * 0.08), cooldown: 60, window: 15 },
  // Hawks from combat logs (gs Oct 27): 80 % of your RAP as attack power (128.8 per DPS), a swing of 7.1-14.3 before Unleashed
  // Fury, half your crit plus Ferocity's, your hit, on the white melee table.
  // Since the Nov 10 hotfix (WoWSims, from level 48 logs): 80% of your ranged attack power plus 7 and 14 a point of the
  // bow's dps; a swing of 0.185 of the creature dps over 2.5 sec, 22% either side, 60 attack power a point of dps, both
  // before Unleashed Fury 5/5 and Focused Fire 2/2. Arcane Shot and Summon Hawk cost 11% of base mana (build 70888).
  summonHawk: { mana: Math.round(BASE_MANA * 0.11), cooldown: 6, dive: 108, diveRap: 0.05, duration: 18, max: 2, swing: 2.5, swingMin: 18.59, swingMax: 29.08, apShare: 0.8, weaponAp: 7, weaponApPerDps: 14, apPerDps: 70.38, critShare: 0.5 },
  raptorStrike: { mana: 100, cooldown: 6, bonus: 70 },
  mongooseBite: { mana: 65, cooldown: 5, bonus: 57, window: 10, dodgeWindow: 5 },
  striderKick: { mana: Math.round(BASE_MANA * 0.0581), cooldown: 8 },
  wingClip: { mana: 80, damage: 50 },
  // Fire traps scale with 13 % of the higher of attack power and ranged attack power, fixed when placed (MythicSim in game, gs Oct 21).
  immolationTrap: { mana: 245, cooldown: 30, total: 690, ticks: 5, period: 3, apShare: 0.13 },
  laceratingStrikes: { share: 0.4, ticks: 7, period: 3 },
  quickShots: { haste: 0.3, duration: 12 },
  manaPotion: { min: 1350, max: 2250, cooldown: 120 },
  // Pet (gs model): weapon 36.34-55.32 at any speed, AP/14 x 2.0
  pet: {
    min: 36.34, max: 55.32, apBase: 252, apShare: 0.1, happiness: 1.25, family: 1.1, // Cat
    // Oct 15: pets have no crit of their own; they take yours (the higher of melee and ranged) plus Ferocity.
    focusPerSecond: 10, focusCap: 150, actionInterval: 1.6, baseCrit: 0,
    claw: { focus: 25, min: 43, max: 59 }, bite: { focus: 35, cooldown: 10, min: 81, max: 99 },
    frenzy: { speed: 1.3, duration: 8 },
  },
  spirit: 71,
};
