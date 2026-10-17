// WoW Forever druid talents and the builds the sims use. Order: gunba's
// current tree (post 1 October), Balance 16, Feral Combat 20, Restoration 16.
// See research/druid_forever.md → Talents and Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { BALANCE_STATS, BEAR_STATS, CAT_STATS } from './data';

const TREES = [
  ['improvedWrath', 'genesis', 'moonglow', 'improvedMoonfire', 'naturesMajesty', 'naturesReach', 'improvedEntanglingRoots',
    'naturesSplendor', 'insectSwarm', 'vengeance', 'improvedStarfire', 'overgrowth', 'naturesGrace', 'eclipse', 'moonfury', 'moonkinForm'],
  ['ferocity', 'heartOfTheWild', 'feralSwiftness', 'feralInstinct', 'brutalImpact', 'thickHide', 'shreddingAttacks', 'savageFury',
    'feralCharge', 'sharpenedClaws', 'shiftingPower', 'primalBite', 'predatoryStrikes', 'bloodFrenzy', 'improvedShiftingPower',
    'leaderOfThePack', 'naturalInstinct', 'naturalReaction', 'rendAndTear', 'berserk'],
  ['naturesFocus', 'furor', 'naturalist', 'subtlety', 'naturalShapeshifter', 'reflection', 'giftOfNature', 'giftOfTheEarthmother',
    'tranquilSpirit', 'improvedRejuvenation', 'swiftmend', 'naturesSwiftness', 'livingSpirit', 'improvedTranquility', 'improvedRegrowth', 'wildGrowth'],
] as const;

export type TalentKey = (typeof TREES)[number][number];
export type Talents = Record<TalentKey, number>;

const NAMES: Record<TalentKey, string> = {
  improvedWrath: 'Improved Wrath', genesis: 'Genesis', moonglow: 'Moonglow', improvedMoonfire: 'Improved Moonfire',
  naturesMajesty: "Nature's Majesty", naturesReach: "Nature's Reach", improvedEntanglingRoots: 'Improved Entangling Roots',
  naturesSplendor: "Nature's Splendor", insectSwarm: 'Insect Swarm', vengeance: 'Vengeance', improvedStarfire: 'Improved Starfire',
  overgrowth: 'Overgrowth', naturesGrace: "Nature's Grace", eclipse: 'Eclipse', moonfury: 'Moonfury', moonkinForm: 'Moonkin Form',
  ferocity: 'Ferocity', heartOfTheWild: 'Heart of the Wild', feralSwiftness: 'Feral Swiftness', feralInstinct: 'Feral Instinct',
  brutalImpact: 'Brutal Impact', thickHide: 'Thick Hide', shreddingAttacks: 'Shredding Attacks', savageFury: 'Savage Fury',
  feralCharge: 'Feral Charge', sharpenedClaws: 'Sharpened Claws', shiftingPower: 'Shifting Power', primalBite: 'Primal Bite',
  predatoryStrikes: 'Predatory Strikes', bloodFrenzy: 'Blood Frenzy', improvedShiftingPower: 'Improved Shifting Power',
  leaderOfThePack: 'Leader of the Pack', naturalInstinct: 'Natural Instinct', naturalReaction: 'Natural Reaction',
  rendAndTear: 'Rend and Tear', berserk: 'Berserk',
  naturesFocus: "Nature's Focus", furor: 'Furor', naturalist: 'Naturalist', subtlety: 'Subtlety', naturalShapeshifter: 'Natural Shapeshifter',
  reflection: 'Reflection', giftOfNature: 'Gift of Nature', giftOfTheEarthmother: 'Gift of the Earthmother', tranquilSpirit: 'Tranquil Spirit',
  improvedRejuvenation: 'Improved Rejuvenation', swiftmend: 'Swiftmend', naturesSwiftness: "Nature's Swiftness", livingSpirit: 'Living Spirit',
  improvedTranquility: 'Improved Tranquility', improvedRegrowth: 'Improved Regrowth', wildGrowth: 'Wild Growth',
};

const NEW_IN_FOREVER = new Set<TalentKey>(['genesis', 'naturesMajesty', 'naturesSplendor', 'overgrowth', 'eclipse', 'shiftingPower',
  'primalBite', 'improvedShiftingPower', 'naturalInstinct', 'naturalReaction', 'rendAndTear', 'berserk', 'giftOfTheEarthmother',
  'livingSpirit', 'wildGrowth']);

export type DruidSpec = 'cat' | 'bear' | 'balance';

export interface Build {
  id: string;
  spec: DruidSpec;
  name: string;
  talentString: string;
  stats: Stats;
  bar: Binding[];
  tank?: boolean;
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => ids.map((id, i) => ({ id, key: KEYS[i] }));

const CAT_BAR = bar(['shred', 'claw', 'rake', 'rip', 'ferociousBite', 'shiftingPower', 'faerieFire', 'berserk',
  'prowl', 'ravage', 'pounce', 'cower', 'manaPotion', 'thistleTea', 'dash', 'attack']);
const BEAR_BAR = bar(['primalBite', 'lacerate', 'maul', 'swipe', 'demoralizingRoar', 'faerieFire', 'druidEnrage', 'berserk',
  'attack', 'frenziedRegeneration', 'barkskin', 'bash', 'feralCharge', 'growl', 'ragePotion', null]);
const BALANCE_BAR = bar(['wrath', 'starfire', 'moonfire', 'insectSwarm', 'faerieFire', 'innervate', 'moonkinForm', 'barkskin',
  'manaPotion', null, null, null, null, null, null, null]);

const GS = 'gunba/wow-forever-sim';
export const BUILDS: Build[] = [
  { id: 'cat', spec: 'cat', name: 'Feral Cat', talentString: '05002-45010032021032212051-055', stats: CAT_STATS, bar: CAT_BAR },
  { id: 'cat-feral', spec: 'cat', name: 'Feral, deeper (Natural Shapeshifter)', talentString: '-55210032021132212051-05503', stats: CAT_STATS, bar: CAT_BAR },
  { id: 'bear', spec: 'bear', name: 'Bear tank', talentString: '01-50022332120132012551-055', stats: BEAR_STATS, bar: BEAR_BAR, tank: true },
  { id: 'moonkin', spec: 'balance', name: 'Moonkin', talentString: '5232220115501351--505003', stats: BALANCE_STATS, bar: BALANCE_BAR },
  { id: 'balance', spec: 'balance', name: 'Balance', talentString: '5532220115001351--505302', stats: BALANCE_STATS, bar: BALANCE_BAR },
];

export const buildsFor = (spec: DruidSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${GS})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown, spec: DruidSpec): Build {
  return BUILDS.find((b) => b.id === id && b.spec === spec) ?? buildsFor(spec)[0];
}
/** A build's talents, or your own (`custom`, a talent string from Settings → Edit talents). */
export function talentsFor(id: unknown, spec: DruidSpec, custom?: unknown): Talents {
  const own = typeof custom === 'string' && custom ? custom : null;
  const string = own ?? buildById(id, spec).talentString;
  const key = own ? `custom:${own}` : buildById(id, spec).id;
  let t = cache.get(key);
  if (!t) cache.set(key, (t = decodeTalents(TREES, string)));
  return t;
}
export const summary = (t: Talents) => talentSummary(['Balance', 'Feral Combat', 'Restoration'], TREES, NAMES, NEW_IN_FOREVER, t);
