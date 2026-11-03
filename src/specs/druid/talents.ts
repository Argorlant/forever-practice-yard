// WoW Forever druid talents and the builds the sims use. Order: Wowhead's
// Forever calculator after the live hotfix of 30 October (Balance 16, Feral
// Combat 20, Restoration 16); the sims' builds are re-spent for it until they
// publish theirs. See research/druid_forever.md → Talents and Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { BALANCE_STATS, BEAR_STATS, CAT_STATS } from './data';

const TREES = [
  ['improvedWrath', 'genesis', 'moonglow', 'improvedMoonfire', 'naturesMajesty', 'naturesReach', 'improvedEntanglingRoots',
    'naturesSplendor', 'insectSwarm', 'vengeance', 'improvedStarfire', 'overgrowth', 'naturesGrace', 'eclipse', 'moonfury', 'moonkinForm'],
  ['ferocity', 'furor', 'feralSwiftness', 'feralInstinct', 'brutalImpact', 'thickHide', 'shreddingAttacks', 'savageFury',
    'feralCharge', 'sharpenedClaws', 'predatoryStrikes', 'lacerate', 'predatoryDiscipline', 'bloodFrenzy', 'leaderOfThePack',
    'naturalInstinct', 'rendAndTear', 'naturalReaction', 'primalBite', 'shiftingPower'],
  ['naturesFocus', 'heartOfTheWild', 'naturalist', 'reflection', 'naturalShapeshifter', 'subtlety', 'giftOfNature', 'bloom',
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
  predatoryStrikes: 'Predatory Strikes', lacerate: 'Lacerate', predatoryDiscipline: 'Predatory Discipline', bloodFrenzy: 'Blood Frenzy',
  leaderOfThePack: 'Leader of the Pack', naturalInstinct: 'Natural Instinct', naturalReaction: 'Natural Reaction',
  rendAndTear: 'Rend and Tear',
  naturesFocus: "Nature's Focus", furor: 'Furor', naturalist: 'Naturalist', subtlety: 'Subtlety', naturalShapeshifter: 'Natural Shapeshifter',
  reflection: 'Reflection', giftOfNature: 'Gift of Nature', bloom: 'Bloom', tranquilSpirit: 'Tranquil Spirit',
  improvedRejuvenation: 'Improved Rejuvenation', swiftmend: 'Swiftmend', naturesSwiftness: "Nature's Swiftness", livingSpirit: 'Living Spirit',
  improvedTranquility: 'Improved Tranquility', improvedRegrowth: 'Improved Regrowth', wildGrowth: 'Wild Growth',
};

const NEW_IN_FOREVER = new Set<TalentKey>(['genesis', 'naturesMajesty', 'naturesSplendor', 'overgrowth', 'eclipse', 'shiftingPower',
  'primalBite', 'lacerate', 'predatoryDiscipline', 'naturalInstinct', 'naturalReaction', 'rendAndTear', 'bloom',
  'livingSpirit', 'wildGrowth']);

export type DruidSpec = 'cat' | 'bear' | 'balance';

export interface Build {
  id: string;
  spec: DruidSpec;
  name: string;
  talentString: string;
  source: string;
  stats: Stats;
  bar: Binding[];
  tank?: boolean;
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => ids.map((id, i) => ({ id, key: KEYS[i] }));

const CAT_BAR = bar(['shred', 'claw', 'rake', 'rip', 'ferociousBite', 'shiftingPower', 'faerieFire', null,
  'prowl', 'ravage', 'pounce', 'cower', 'manaPotion', 'thistleTea', 'dash', 'attack']);
const BEAR_BAR = bar(['primalBite', 'lacerate', 'maul', 'swipe', 'demoralizingRoar', 'faerieFire', 'druidEnrage', null,
  'attack', 'frenziedRegeneration', 'barkskin', 'bash', 'feralCharge', 'growl', 'ragePotion', null]);
const BALANCE_BAR = bar(['wrath', 'starfire', 'moonfire', 'insectSwarm', 'faerieFire', 'innervate', 'moonkinForm', 'barkskin',
  'manaPotion', null, null, null, null, null, null, null]);

const GS = 'gunba/wow-forever-sim';
// The Oct 30 trees moved Furor to Feral and Heart of the Wild to Restoration and dropped Berserk and Improved
// Shifting Power; their points went to Feral Swiftness, Predatory Discipline and the row fillers. Balance builds
// keep their talents (Reflection and Subtlety swapped places).
const RESPENT = `${GS}, re-spent by us for the Oct 30 trees`;
const REENCODED = `${GS}, re-encoded to the Oct 30 trees`;
export const BUILDS: Build[] = [
  { id: 'cat', spec: 'cat', name: 'Feral Cat', talentString: '05002-55200032023012125001-055', source: RESPENT, stats: CAT_STATS, bar: CAT_BAR },
  { id: 'cat-feral', spec: 'cat', name: 'Feral, deeper (Natural Shapeshifter)', talentString: '-55220132023012125011-05503', source: RESPENT, stats: CAT_STATS, bar: CAT_BAR },
  { id: 'bear', spec: 'bear', name: 'Bear tank', talentString: '01-5502233212310212551-05', source: RESPENT, stats: BEAR_STATS, bar: BEAR_BAR, tank: true },
  { id: 'moonkin', spec: 'balance', name: 'Moonkin', talentString: '533222011550135--5053', source: REENCODED, stats: BALANCE_STATS, bar: BALANCE_BAR },
  { id: 'balance', spec: 'balance', name: 'Balance', talentString: '5532220115001351--505203', source: REENCODED, stats: BALANCE_STATS, bar: BALANCE_BAR },
];

export const buildsFor = (spec: DruidSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

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
