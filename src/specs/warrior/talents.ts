// WoW Forever warrior talents and the builds the sims use. Order: WoWSims
// Forever's tree (proto/warrior.proto), Arms 17, Fury 18, Protection 18. See
// research/warrior_forever.md → Talents and Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { ARMS_STATS, FURY_STATS, GS_ARMS_STATS, GS_PROT_STATS, PROT_STATS } from './data';

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

export type Rotation = 'fury' | 'twoHandBloodthirst' | 'arms' | 'protection';
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
const TWO_HAND_BAR = bar(['bloodthirst', 'whirlwind', 'heroicStrike', 'execute', 'overpower', 'slam', 'sunderArmor', 'recklessSwings',
  'attack', 'berserkerRage', 'bloodrage', 'battleShout', 'pummel', 'hamstring', 'deathWish', 'recklessness']);
const ARMS_BAR = bar(['mortalStrike', 'overpower', 'heroicStrike', 'execute', 'rend', 'slam', 'sunderArmor', 'spearingStrike',
  'attack', 'charge', 'bloodrage', 'battleShout', 'sweepingStrikes', 'whirlwind', 'hamstring', 'recklessness']);
const PROT_BAR = bar(['shieldSlam', 'revenge', 'sunderArmor', 'heroicStrike', 'shieldBlock', 'thunderClap', 'demoralizingShout', 'battleShout',
  'attack', 'shieldBash', 'bloodrage', 'lastStand', 'shieldWall', 'cleave', 'concussionBlow', 'charge']);

const WS = 'wowsims/forever';
/** Builds with no equivalent in WoWSims Forever: they stay, for whoever practises them. */
const COMMUNITY = 'community, from gunba/wow-forever-sim';
/** The same build on the November tree: Improved Tactical Mastery, Raging Blows and Flurry freed 5 points, which went to Reckless Swings, Improved Whirlwind, Improved Heroic Strike and Anger Management. */
const MOVED = `${COMMUNITY}, moved to the November tree`;
export const BUILDS: Build[] = [
  { id: 'fury-dw', name: 'Fury, dual wield', talentString: '30303213002-350530005122100231-1', source: WS, rotation: 'fury', stance: 'berserker', stats: FURY_STATS, bar: FURY_BAR },
  { id: 'fury-sunder', name: 'Fury, keeps Sunder Armor up', talentString: '30303213002-350530005122100231-1', source: WS, rotation: 'fury', stance: 'berserker', stats: FURY_STATS, bar: FURY_BAR, options: { sunderDuty: true } },
  { id: 'arms-2h', name: 'Arms, two-hander', talentString: '30303213132215201-55050000002-2', source: WS, rotation: 'arms', stance: 'battle', stats: ARMS_STATS, bar: ARMS_BAR },
  { id: 'fury-2h', name: 'Two-hand Bloodthirst', talentString: '30303213032-450500250120100231', source: MOVED, rotation: 'twoHandBloodthirst', stance: 'berserker', stats: GS_ARMS_STATS, bar: TWO_HAND_BAR },
  { id: 'prot', name: 'Protection', talentString: '05-05050005-150531120300001351', source: WS, rotation: 'protection', stance: 'defensive', stats: PROT_STATS, bar: PROT_BAR, tank: true },
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
