// Every number the rogue uses, in one place. Sources and confidence for each
// value are in research/rogue_forever.json and research/rogue_forever.md:
//   confirmed  = Forever beta client data, Wowhead Forever or Blizzard
//   provisional = a sim choice with no Forever source yet
//   classic    = Forever says nothing; the sims keep Classic's value
import type { AttackRules, Stats } from '../../engine/types';
import { sheet } from '../gear';

/** WoWSims Forever's gear, one set per way of fighting. */
export const COMBAT_STATS = sheet('rogue-combat');
export const BACKSTAB_STATS = sheet('rogue-backstab');
export const MUTILATE_STATS = sheet('rogue-mutilate');
export const SUB_BACKSTAB_STATS = sheet('rogue-sub-backstab');

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

/** gunba's raid-buffed test character (Human, PvP swords), without the talent crit. */
export const RAID_STATS: Stats = {
  attackPower: 1263,
  crit: 27.9,
  hit: 7,
  spellCrit: 4,
  mainHand: { name: "Premier High Warlord's Blade", type: 'sword', min: 109, max: 165, speed: 2.9 },
  offHand: { name: "Premier High Warlord's Quickblade", type: 'sword', min: 68, max: 102, speed: 1.8 },
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
  // Trainer ranks since Oct 21 (both sims): Backstab 9, Eviscerate 9 and Deadly Poison V are Ahn'Qiraj books, and raids open on 9 December.
  backstab: { cost: 60, percent: 1.5, bonus: 140 },  // rank 8 (rank 9's tooltip says "plus 150"; Classic said 225)
  eviscerate: { cost: 35, min: 48, max: 144, perCp: 151, apPerCp: 0.03 },  // rank 8; AP share provisional (Classic)
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
  instantPoison: { chance: 20, min: 76, max: 100, ap: 0.01 },
  deadlyPoison: { chance: 30, tick: 18, ap: 0.009, ticks: 4, period: 3, duration: 12, maxStacks: 5 },   // Deadly Poison IV; ap over all its ticks, per stack
  hackAndSlashIcd: 0.2,
  mutilate: { cost: 60, bonus: 88, percent: 0.9, poisonedBonus: 0.2 },
  hemorrhage: { cost: 35, percent: 1, daggerPercent: 1.45, duration: 15, bleedBonus: 0.15 },
  ghostlyStrike: { cost: 40, cooldown: 20, percent: 1.25, daggerPercent: 1.8, duration: 7 },
  premeditation: { cooldown: 120, window: 20 },
  preparation: { cooldown: 600 },
  // A passive since November: your Shank raises poison damage and the chance to apply them.
  venom: { duration: 6, damage: 0.3, chance: 20 },
  // Rank 2. Always hits; the weapon share is of the off-hand's damage at half, and Dual Wield Specialization does not reach it.
  shank: { cost: 5, cooldown: 10, weapon: 0.5, energy: 25, flashEnergy: 3, flashCooldown: 0.4, bootKnifeChance: 20, bootKnifePoints: 2 },
  // Rank 4. WoWSims reads the rates from the tooltip: no row states them.
  deathMark: { cost: 25, cooldown: 10, duration: 6, perPoint: 0.12, capBase: 156, capPerPoint: 245, capAp: 0.04 },
  coupDeGrace: [0, 0.07, 0.13, 0.2],
  poised: { energy: 10, composure: 5 },
  bloodSplatter: { ruptureTicks: 3, garroteTicks: 3 },   // +6 s and +9 s
  sealFate: [0, 33, 66, 100],
  sealFateIcd: 0.5,
};
