// WoW Forever warrior talents and the builds the sims use. Order: WoWSims
// Forever's tree (proto/warrior.proto), Arms 17, Fury 18, Protection 18. See
// research/warrior_forever.md → Talents and Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { ARMS_STATS, FURY_2H_STATS, FURY_STATS, GS_PROT_STATS, PROT_OFFENSIVE_STATS, PROT_STATS } from './data';

const TREES = [
  ['improvedHeroicStrike', 'deflection', 'improvedRend', 'improvedCharge', 'improvedTacticalMastery', 'improvedOverpower',
    'angerManagement', 'deepWounds', 'spearingStrike', 'twoHandedWeaponSpecialization', 'impale', 'bloodthrill',
    'sweepingStrikes', 'weaponmaster', 'improvedSlam', 'improvedHamstring', 'mortalStrike'],
  ['boomingVoice', 'cruelty', 'lingeringRage', 'unbridledWrath', 'furiousPrecision', 'piercingHowl', 'bloodCraze',
    'enrage', 'dualWieldSpecialization', 'recklessSwings', 'improvedExecute', 'improvedBerserkerRage', 'deathWish',
    'goreDrinker', 'improvedIntercept', 'improvedWhirlwind', 'flurry', 'bloodthirst'],
  ['improvedBloodrage', 'shieldSpecialization', 'ironWill', 'anticipation', 'improvedRevenge', 'improvedThunderClap',
    'lastStand', 'masterOfDefense', 'improvedDisarm', 'defiance', 'improvedSunderArmor', 'vanguard', 'improvedShieldBash',
    'improvedShieldWall', 'concussionBlow', 'focusedRage', 'bastion', 'shieldSlam'],
] as const;

export type TalentKey = (typeof TREES)[number][number];
export type Talents = Record<TalentKey, number>;

const NAMES: Record<TalentKey, string> = {
  improvedHeroicStrike: 'Improved Heroic Strike', deflection: 'Deflection', improvedRend: 'Improved Rend',
  improvedCharge: 'Improved Charge', improvedTacticalMastery: 'Improved Tactical Mastery', improvedOverpower: 'Improved Overpower',
  angerManagement: 'Anger Management', deepWounds: 'Deep Wounds', spearingStrike: 'Spearing Strike',
  twoHandedWeaponSpecialization: 'Two-Handed Weapon Specialization', impale: 'Impale', bloodthrill: 'Bloodthrill',
  sweepingStrikes: 'Sweeping Strikes', weaponmaster: 'Weaponmaster', improvedSlam: 'Improved Slam',
  improvedHamstring: 'Improved Hamstring', mortalStrike: 'Mortal Strike',
  boomingVoice: 'Booming Voice', cruelty: 'Cruelty', lingeringRage: 'Lingering Rage', unbridledWrath: 'Unbridled Wrath',
  furiousPrecision: 'Furious Precision', piercingHowl: 'Piercing Howl', bloodCraze: 'Blood Craze',
  dualWieldSpecialization: 'Dual Wield Specialization', recklessSwings: 'Reckless Swings', enrage: 'Enrage',
  improvedExecute: 'Improved Execute', improvedBerserkerRage: 'Improved Berserker Rage', deathWish: 'Death Wish',
  improvedIntercept: 'Improved Intercept', improvedWhirlwind: 'Improved Whirlwind', flurry: 'Flurry', goreDrinker: 'Gore Drinker', bloodthirst: 'Bloodthirst',
  improvedBloodrage: 'Improved Bloodrage', shieldSpecialization: 'Shield Specialization', ironWill: 'Iron Will',
  anticipation: 'Anticipation', improvedRevenge: 'Improved Revenge', improvedThunderClap: 'Improved Thunder Clap',
  lastStand: 'Last Stand', masterOfDefense: 'Master of Defense', improvedDisarm: 'Improved Disarm', defiance: 'Defiance',
  improvedSunderArmor: 'Improved Sunder Armor', vanguard: 'Vanguard', improvedShieldBash: 'Improved Shield Bash',
  improvedShieldWall: 'Improved Shield Wall', concussionBlow: 'Concussion Blow', focusedRage: 'Focused Rage',
  bastion: 'Bastion', shieldSlam: 'Shield Slam',
};

const NEW_IN_FOREVER = new Set<TalentKey>(['spearingStrike', 'bloodthrill', 'weaponmaster', 'lingeringRage', 'furiousPrecision',
  'recklessSwings', 'improvedWhirlwind', 'goreDrinker', 'masterOfDefense', 'vanguard', 'bastion', 'focusedRage']);

export type Rotation = 'fury' | 'arms' | 'protection';
export type Stance = 'battle' | 'defensive' | 'berserker';

export interface Build {
  id: string;
  name: string;
  talentString: string;
  source: string;
  rotation: Rotation;
  stance: Stance;
  stats: Stats;
  bar: Binding[];
  /** The dummy attacks you by default (tanks). */
  tank?: boolean;
  options?: Record<string, boolean>;
}

// 16 action bar slots, then the stance bar: Battle, Defensive, Berserker on Z, X, C.
const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyV', 'KeyB', 'Digit9', 'Digit0', 'KeyZ', 'KeyX', 'KeyC'];
const STANCE_BAR = ['battleStance', 'defensiveStance', 'berserkerStance'];
const bar = (ids: string[]): Binding[] => [...ids, ...STANCE_BAR].map((id, i) => ({ id, key: KEYS[i] }));

const FURY_BAR = bar(['bloodthirst', 'whirlwind', 'heroicStrike', 'execute', 'overpower', 'recklessSwings', 'sunderArmor', 'cleave',
  'attack', 'berserkerRage', 'bloodrage', 'battleShout', 'pummel', 'hamstring', 'deathWish', 'recklessness']);
// The Dragonkin/Giant build presses Spearing Strike where the others have Pummel.
const FURY_DRAGON_BAR = bar(['bloodthirst', 'whirlwind', 'heroicStrike', 'execute', 'overpower', 'recklessSwings', 'sunderArmor', 'cleave',
  'attack', 'berserkerRage', 'bloodrage', 'battleShout', 'spearingStrike', 'hamstring', 'deathWish', 'recklessness']);
const ARMS_BAR = bar(['mortalStrike', 'overpower', 'heroicStrike', 'execute', 'rend', 'slam', 'sunderArmor', 'spearingStrike',
  'attack', 'charge', 'bloodrage', 'battleShout', 'sweepingStrikes', 'whirlwind', 'hamstring', 'recklessness']);
const PROT_BAR = bar(['shieldSlam', 'revenge', 'sunderArmor', 'heroicStrike', 'shieldBlock', 'thunderClap', 'demoralizingShout', 'battleShout',
  'attack', 'shieldBash', 'bloodrage', 'lastStand', 'shieldWall', 'cleave', 'concussionBlow', 'charge']);
// The Offensive build presses Reckless Swings where the others have Concussion Blow.
const PROT_OFFENSIVE_BAR = bar(['shieldSlam', 'revenge', 'sunderArmor', 'heroicStrike', 'shieldBlock', 'thunderClap', 'demoralizingShout', 'battleShout',
  'attack', 'shieldBash', 'bloodrage', 'lastStand', 'shieldWall', 'cleave', 'recklessSwings', 'charge']);

const WS = 'wowsims/forever';
/** Builds with no equivalent in WoWSims Forever: they stay, for whoever practises them. */
const COMMUNITY = 'community, from gunba/wow-forever-sim';
export const BUILDS: Build[] = [
  // WoWSims c5b3805's Fury talents: Enrage instead of Booming Voice and Improved Bloodrage.
  { id: 'fury-dw', name: 'Fury, dual wield', talentString: '30303213002-050530045122100231', source: WS, rotation: 'fury', stance: 'berserker', stats: FURY_STATS, bar: FURY_BAR },
  { id: 'fury-sunder', name: 'Fury, keeps Sunder Armor up', talentString: '30303213002-050530045122100231', source: WS, rotation: 'fury', stance: 'berserker', stats: FURY_STATS, bar: FURY_BAR, options: { sunderDuty: true } },
  // Against a Giant or Dragonkin boss (Onyxia): an Enrage point goes to Spearing Strike, which deals double to both, and
  // the rotation swaps to Battle Stance for it. The dummy starts as one; on another kind it does less than Fury.
  { id: 'fury-dragonkin', name: 'Fury, Dragonkin or Giant boss', talentString: '30303213102-050530035122100231', source: WS, rotation: 'fury', stance: 'berserker', stats: FURY_STATS, bar: FURY_DRAGON_BAR, options: { giantDummy: true } },
  { id: 'arms-2h', name: 'Arms, two-hander', talentString: '30303213132215201-55050000002-2', source: WS, rotation: 'arms', stance: 'battle', stats: ARMS_STATS, bar: ARMS_BAR },
  // WoWSims 4269136's Fury 2H: Two-Handed Weapon Specialization, Blood Craze, a Gore Drinker point and a fifth Enrage
  // point in place of Dual Wield Specialization and Furious Precision; the Fury list with a two-hander's thresholds.
  { id: 'fury-2h', name: 'Fury, two-hander', talentString: '30303213032-050500350122110231', source: WS, rotation: 'fury', stance: 'berserker', stats: FURY_2H_STATS, bar: FURY_BAR },
  // Protection comes in two groups since 4269136: Balanced, which takes less damage, and Offensive, for threat.
  { id: 'prot', name: 'Protection, balanced', talentString: '05-05050005-150531120300001351', source: WS, rotation: 'protection', stance: 'defensive', stats: PROT_STATS, bar: PROT_BAR, tank: true },
  { id: 'prot-offensive', name: 'Protection, offensive', talentString: '3-0505000501-050032120331021351', source: WS, rotation: 'protection', stance: 'defensive', stats: PROT_OFFENSIVE_STATS, bar: PROT_OFFENSIVE_BAR, tank: true },
  { id: 'prot-deep', name: 'Protection, deeper', talentString: '31-0501-255333120230021351', source: COMMUNITY, rotation: 'protection', stance: 'defensive', stats: GS_PROT_STATS, bar: PROT_BAR, tank: true },
];

export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown): Build {
  return BUILDS.find((b) => b.id === id) ?? BUILDS[0];
}
/** A build's talents, or your own (`custom`, a talent string from Settings → Edit talents). */
export function talentsFor(id: unknown, custom?: unknown): Talents {
  const own = typeof custom === 'string' && custom ? custom : null;
  const key = own ? `custom:${own}` : buildById(id).id;
  let t = cache.get(key);
  if (!t) cache.set(key, (t = decodeTalents(TREES, own ?? buildById(id).talentString)));
  return t;
}
export const summary = (t: Talents) => talentSummary(['Arms', 'Fury', 'Protection'], TREES, NAMES, NEW_IN_FOREVER, t);
