// Every number the rogue uses, in one place. Sources and confidence for each
// value are in research/rogue_forever.json and research/rogue_forever.md:
//   confirmed  = Forever beta client data, Wowhead Forever or Blizzard
//   provisional = a sim choice with no Forever source yet
//   classic    = Forever says nothing; the sims keep Classic's value
import type { AttackRules, Stats } from '../../engine/types';

/** Attack table against a level 63 boss. Measured on the beta (magey) unless noted. */
export const RULES: AttackRules = {
  specialMiss: 8,           // confirmed: measured 7.63 %; hit suppression is gone in Forever
  spellMiss: 17,            // classic: poisons roll the spell table vs +3
  dualWieldMiss: 27,        // classic: 8 % + 19 % dual-wield penalty
  dodge: 6.5,               // confirmed: measured 6.47 %
  parryFromFront: 14,       // confirmed: measured 14.31 %, only from the front
  glanceChance: 40,         // confirmed: measured 40.15 %
  glanceMin: 0.55,          // classic / provisional: the beta shows ~75 % on average (reported as a bug)
  glanceMax: 0.75,
  critSuppression: 4.8,     // confirmed: 3 % skill + 1.8 % aura vs +3
  critMultiplier: 2,        // classic
  spellCritMultiplier: 1.5, // classic
  offHandMultiplier: 0.5,   // classic
};

/**
 * Default gear: gunba/wow-forever-sim's Combat preset (Orc, real Forever
 * items), unbuffed. Crit and hit are what the gear (and Agility) give; the
 * build's talents (Malice, Precision…) are added on top.
 */
export const STATS: Stats = {
  attackPower: 594,
  crit: 12.1,     // Agility 236 / 29 + 4 % gear
  hit: 7.9,       // gear
  spellCrit: 4,   // gear only: Agility does not count for poisons
  mainHand: { name: 'Ironwood Blade', type: 'sword', min: 79, max: 148, speed: 2.4 },
  offHand: { name: 'Persuader', type: 'mace', min: 89, max: 167, speed: 2.8 },
};

/** gunba's raid-buffed test character (Human, PvP swords), without the talent crit. */
export const RAID_STATS: Stats = {
  attackPower: 1263,
  crit: 27.9,
  hit: 7,
  spellCrit: 4,
  mainHand: { name: "Premier High Warlord's Blade", type: 'sword', min: 109, max: 165, speed: 2.9 },
  offHand: { name: "Premier High Warlord's Quickblade", type: 'sword', min: 68, max: 102, speed: 1.8 },
};

/**
 * Dagger builds (Backstab, Mutilate, Hemorrhage). The sims publish no real
 * level-60 dagger set, so these are generic practice daggers with the same
 * sheet as the default gear: the damage is approximate, the rotation is not.
 */
export const DAGGER_STATS: Stats = {
  ...STATS,
  mainHand: { name: 'Practice dagger (main hand)', type: 'dagger', min: 66, max: 123, speed: 1.8 },
  offHand: { name: 'Practice dagger (off hand)', type: 'dagger', min: 52, max: 97, speed: 1.5 },
};

export const NORMALIZED_SPEED = { dagger: 1.7, oneHand: 2.4 };

export const DATA = {
  gcd: 1,
  builderRefund: 0.8,     // provisional: 80 % of the paid cost when a builder misses
  finisherRefund: 0,      // provisional: gunba refunds nothing (foreversim 80 %); points are kept (confirmed)
  stealthSpeed: 0.7,      // confirmed: -30 %
  sprintSpeed: 1.7,       // confirmed: +70 %
  relentlessEnergy: 25,
  sinisterStrike: { cost: 45, bonus: 68 },
  backstab: { cost: 60, percent: 1.5, bonus: 150 },  // provisional: the tooltip says "plus 150", Classic said 225
  eviscerate: { cost: 35, min: 54, max: 162, perCp: 170, apPerCp: 0.03 },  // AP share provisional (Classic)
  sliceAndDice: { cost: 25, base: 6, perCp: 3, haste: 0.3 },
  rupture: { cost: 25, tick: 35, tickPerCp: 4.73, apPerTick: [0.01, 0.02, 0.03, 0.03, 0.03], period: 2 },
  exposeArmor: { cost: 25, perCp: 450, duration: 30 },
  kidneyShot: { cost: 25, cooldown: 20 },
  garrote: { cost: 50, tick: 92, apPerTick: 0.03, ticks: 6, period: 3 },  // AP share provisional
  ambush: { cost: 60, percent: 2.5, bonus: 116 },
  cheapShot: { cost: 60, duration: 4 },
  kick: { cost: 25, cooldown: 10, damage: 80 },
  gouge: { cost: 45, cooldown: 10, duration: 4, damage: 75 },
  feint: { cost: 20, cooldown: 10 },
  evasion: { cooldown: 300, duration: 15 },
  sprint: { cooldown: 300, duration: 15 },
  vanish: { cooldown: 300 },
  stealth: { cooldown: 10 },
  bladeFlurry: { cost: 25, cooldown: 120, duration: 15, haste: 0.2 },
  adrenalineRush: { cooldown: 300, duration: 15 },
  coldBlood: { cooldown: 180 },
  thistleTea: { energy: 100, cooldown: 300 },
  instantPoison: { chance: 20, min: 76, max: 100, ap: 0.005 },
  deadlyPoison: { chance: 30, tick: 23, period: 3, duration: 12, maxStacks: 5 },
  hackAndSlashIcd: 0.2,
  mutilate: { cost: 60, bonus: 67, percent: 0.75, poisonedBonus: 0.2 },
  hemorrhage: { cost: 35, percent: 1, daggerPercent: 1.45, duration: 15, ruptureBonus: 0.15 },
  ghostlyStrike: { cost: 40, cooldown: 20, percent: 1.25, daggerPercent: 1.8, duration: 7 },
  premeditation: { cooldown: 120, window: 20 },
  preparation: { cooldown: 600 },
  venom: { cost: 25, base: 6, perCp: 3, damage: 0.3, chance: 10 },
  sealFateIcd: 0.5,
};
