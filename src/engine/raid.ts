// Raid buffs and dummy debuffs the player can switch on in Settings: what
// other raid members would bring and that changes how a rotation plays
// (extra swings, crit, mana, armor, how hard the dummy hits).
// Values: WoW Forever sims (gunba/wow-forever-sim) and the research sheets.
import type { Combat } from './combat';

export interface RaidEffect {
  id: string;
  name: string;
  /** Who brings it. */
  from: string;
  side: 'buff' | 'debuff';
  icon: string;
  apply: (c: Combat) => void;
}

const forever = (duration = Infinity) => ({ duration });

export const RAID_EFFECTS: RaidEffect[] = [
  // ------------------------------------------------------------ buffs
  {
    id: 'windfury', name: 'Windfury Totem (main-hand attacks: 20% for an extra attack, +246 AP; cats and bears too)', from: 'shaman', side: 'buff', icon: 'windfury',
    apply: (c) => c.applyAura(c.player, { id: 'windfuryTotem', name: 'Windfury Totem', icon: 'windfury', ...forever(), windfury: true }),
  },
  {
    id: 'battleShout', name: 'Battle Shout (+139 AP)', from: 'warrior', side: 'buff', icon: 'battleShout',
    apply: (c) => c.applyAura(c.player, { id: 'battleShout', name: 'Battle Shout', icon: 'battleShout', ...forever(), attackPower: 139 }),
  },
  {
    id: 'blessingOfMight', name: 'Blessing of Might (+133 AP)', from: 'paladin', side: 'buff', icon: 'blessingOfMight',
    apply: (c) => c.applyAura(c.player, { id: 'blessingOfMight', name: 'Blessing of Might', icon: 'blessingOfMight', ...forever(), attackPower: 133 }),
  },
  {
    id: 'leaderOfThePack', name: 'Leader of the Pack or Moonkin Aura (+3% crit, melee and spells; they do not stack)', from: 'druid', side: 'buff', icon: 'leaderOfThePack',
    apply: (c) => c.applyAura(c.player, LEADER_OF_THE_PACK),
  },
  {
    id: 'blessingOfWisdom', name: 'Blessing of Wisdom (40 MP5: +8 mana per second)', from: 'paladin', side: 'buff', icon: 'blessingOfWisdom',
    apply: (c) => c.applyAura(c.player, { id: 'blessingOfWisdom', name: 'Blessing of Wisdom', icon: 'blessingOfWisdom', ...forever(), manaPerSecond: 8 }),
  },
  {
    // In Forever both factions get paladin and shaman buffs (gs: canReceivePaladinBuffs / canReceiveShamanBuffs).
    id: 'manaSpring', name: 'Mana Spring Totem (25 MP5: +5 mana per second)', from: 'shaman', side: 'buff', icon: 'manaSpring',
    apply: (c) => c.applyAura(c.player, { id: 'manaSpring', name: 'Mana Spring Totem', icon: 'manaSpring', ...forever(), manaPerSecond: 5 }),
  },
  // ---------------------------------------------------------- debuffs
  {
    id: 'judgementOfWisdom', name: 'Judgement of Wisdom (your hits and direct spells: 50% for 59 mana)', from: 'paladin', side: 'debuff', icon: 'judgementOfWisdom',
    apply: (c) => { for (const u of c.targets) c.applyAura(u, { id: 'judgementOfWisdom', name: 'Judgement of Wisdom', icon: 'judgementOfWisdom', ...forever(), manaOnHit: { chance: 50, mana: 59 } }); },
  },
  {
    // Forever: 40 s, refreshed by melee; +161 Holy damage taken, times each spell's coefficient.
    id: 'judgementOfTheCrusader', name: 'Judgement of the Crusader (+161 Holy damage taken, scaled by each spell)', from: 'paladin', side: 'debuff', icon: 'judgementOfTheCrusader',
    apply: (c) => { for (const u of c.targets) c.applyAura(u, { id: 'judgementOfTheCrusader', name: 'Judgement of the Crusader', icon: 'judgementOfTheCrusader', ...forever(), schoolBonusTaken: { holy: 161 } }); },
  },
  {
    id: 'sunderArmor', name: 'Sunder Armor x5 (-2,250 armor)', from: 'warrior', side: 'debuff', icon: 'sunderArmor',
    apply: (c) => { for (const u of c.targets) c.applyAura(u, { id: 'raidSunder', name: 'Sunder Armor (raid)', icon: 'sunderArmor', ...forever(), stacks: 5, armor: 2250, armorSlot: 'major' }); },
  },
  {
    id: 'faerieFire', name: 'Faerie Fire (-505 armor)', from: 'druid', side: 'debuff', icon: 'faerieFire',
    apply: (c) => { for (const u of c.targets) c.applyAura(u, { id: 'raidFaerieFire', name: 'Faerie Fire (raid)', icon: 'faerieFire', ...forever(), armor: 505, armorSlot: 'faerieFire' }); },
  },
  {
    id: 'curseOfRecklessness', name: 'Curse of Recklessness (-640 armor)', from: 'warlock', side: 'debuff', icon: 'curseOfRecklessness',
    apply: (c) => { for (const u of c.targets) c.applyAura(u, { id: 'curseOfRecklessness', name: 'Curse of Recklessness', icon: 'curseOfRecklessness', ...forever(), armor: 640, armorSlot: 'curse' }); },
  },
  {
    // Forever (spell 1311680): every magic school, and Curse of Shadow is gone (gs debuffs.go, Wowhead Forever).
    id: 'curseOfElements', name: 'Curse of the Elements (+10% magic damage taken: arcane, fire, frost, holy, nature, shadow)', from: 'warlock', side: 'debuff', icon: 'curseOfElements',
    apply: (c) => {
      const magic = { arcane: 1.1, fire: 1.1, frost: 1.1, holy: 1.1, nature: 1.1, shadow: 1.1 };
      for (const u of c.targets) c.applyAura(u, { id: 'curseOfElements', name: 'Curse of the Elements', icon: 'curseOfElements', ...forever(), schoolTaken: magic });
    },
  },
  {
    id: 'demoralizingShout', name: 'Demoralizing Shout (the dummy hits softer)', from: 'warrior', side: 'debuff', icon: 'demoralizingShout',
    apply: (c) => { for (const u of c.targets) c.applyAura(u, { id: 'raidDemoralizingShout', name: 'Demoralizing Shout (raid)', icon: 'demoralizingShout', ...forever(), apReduction: 210 }); },
  },
  {
    id: 'thunderClap', name: 'Thunder Clap (the dummy swings 20% slower)', from: 'warrior', side: 'debuff', icon: 'thunderClap',
    apply: (c) => { for (const u of c.targets) c.applyAura(u, { id: 'raidThunderClap', name: 'Thunder Clap (raid)', icon: 'thunderClap', ...forever(), attackSlow: 0.2 }); },
  },
];

/** Leader of the Pack and Moonkin Aura: one aura id, so a druid's own and the raid's never stack. */
export const LEADER_OF_THE_PACK = { id: 'leaderOfThePack', name: 'Leader of the Pack', icon: 'leaderOfThePack', duration: Infinity, crit: 3, spellCrit: 3 };

/** Windfury Totem in the sims: 20 % per eligible landed main-hand attack, +246 AP, 1.5 s internal cooldown. */
export const WINDFURY = { chance: 20, ap: 246, icd: 1.5 };
