// The warlock builds the sims use (talent trees in ./talents.gen.ts,
// generated from research/warlock_forever.json). See research/warlock_forever.md → Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { AFFLICTION_STATS, DESTRUCTION_STATS, PACT_STATS, RUIN_STATS } from './data';
import { NAMES, NEW_IN_FOREVER, TREES, TREE_NAMES, type Talents } from './talents.gen';

export type { Talents };
export type WarlockSpec = 'affliction' | 'demonology' | 'destruction';
/** A demon at your side or given to Demonic Sacrifice (Imp +15% Shadow, Succubus +15% Fire, Voidwalker mana, Felhunter health). */
export type Demon = 'succubus' | 'imp' | 'voidwalker' | 'felhunter' | 'none';
/** Which priority list the build plays. */
export type Rotation = 'affliction' | 'ruin' | 'fire' | 'pact';

export interface Build {
  id: string;
  spec: WarlockSpec;
  name: string;
  talentString: string;
  source: string;
  stats: Stats;
  bar: Binding[];
  rotation: Rotation;
  options: Record<string, string | number | boolean>;
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => KEYS.map((key, i) => ({ id: ids[i] ?? null, key }));

const AFFLICTION_BAR = bar(['shadowBolt', 'corruption', 'siphonLife', 'immolate', 'baneOfDoom', 'baneOfAgony', 'curseOfTheElements', 'lifeTap',
  'drainLife', 'amplifyCurse', 'wrack', 'manaPotion', 'deathCoil', 'petAttackOrder', 'petFollowOrder', 'petStayOrder']);
const FIRE_BAR = bar(['incinerate', 'immolate', 'conflagrate', 'shadowburn', 'corruption', 'baneOfDoom', 'curseOfTheElements', 'lifeTap',
  'shadowBolt', 'baneOfAgony', 'searingPain', 'manaPotion', 'deathCoil', 'petAttackOrder', 'petFollowOrder', 'petStayOrder']);
const RUIN_BAR = bar(['shadowBolt', 'corruption', 'immolate', 'baneOfDoom', 'baneOfAgony', 'curseOfTheElements', 'lifeTap', 'shadowburn',
  'amplifyCurse', 'manaPotion', 'deathCoil']);
const PACT_BAR = bar(['shadowBolt', 'searingPain', 'corruption', 'immolate', 'baneOfDoom', 'baneOfAgony', 'curseOfTheElements', 'lifeTap',
  'soulFire', 'manaPotion', 'deathCoil', 'petAttackOrder', 'petFollowOrder', 'petStayOrder']);

const GS = 'gunba/wow-forever-sim';
const FS = 'foreversim';
// Mana: 1093 + 15 x Intellect, x1.15 with Fel Vitality 3/3 (research → Default stats).
export const BUILDS: Build[] = [
  { id: 'affliction', spec: 'affliction', name: 'Affliction', talentString: '2525000013520105--0550015103', source: GS, stats: AFFLICTION_STATS, bar: AFFLICTION_BAR, rotation: 'affliction', options: { mana: 4033 } },
  { id: 'affliction-deep', spec: 'affliction', name: 'Deep Affliction', talentString: '2535002013521105--05000551', source: FS, stats: AFFLICTION_STATS, bar: AFFLICTION_BAR, rotation: 'affliction', options: { mana: 4033 } },
  { id: 'pact', spec: 'demonology', name: 'Demonic Pact', talentString: '011-0005003221220311351-0550005003', source: GS, stats: PACT_STATS, bar: PACT_BAR, rotation: 'pact', options: { mana: 4638, sacrifice: 'voidwalker' } },
  { id: 'pact-fs', spec: 'demonology', name: 'Demonic Pact', talentString: '113-0005003221220311351-0550005', source: FS, stats: PACT_STATS, bar: PACT_BAR, rotation: 'pact', options: { mana: 4638, sacrifice: 'imp' } },
  { id: 'fire', spec: 'destruction', name: 'Shadow and Flame', talentString: '2521000003-0005-0050355103101351', source: GS, stats: DESTRUCTION_STATS, bar: FIRE_BAR, rotation: 'fire', options: { mana: 4153 } },
  { id: 'ruin', spec: 'destruction', name: 'DS/Ruin', talentString: '252200001351-0025003001-0550005103', source: GS, stats: RUIN_STATS, bar: RUIN_BAR, rotation: 'ruin', options: { mana: 4638, sacrifice: 'imp' } },
  { id: 'ruin-fs', spec: 'destruction', name: 'DS/Ruin with Pandemic', talentString: '25220010135201-0025003001-05500051', source: FS, stats: RUIN_STATS, bar: RUIN_BAR, rotation: 'ruin', options: { mana: 4638, sacrifice: 'imp' } },
];

export const buildsFor = (spec: WarlockSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown, spec: WarlockSpec): Build {
  return BUILDS.find((b) => b.id === id && b.spec === spec) ?? buildsFor(spec)[0];
}
export function talentsFor(id: unknown, spec: WarlockSpec): Talents {
  const b = buildById(id, spec);
  let t = cache.get(b.id);
  if (!t) cache.set(b.id, (t = decodeTalents(TREES, b.talentString)));
  return t;
}
export const summary = (t: Talents) => talentSummary(TREE_NAMES, TREES, NAMES, NEW_IN_FOREVER, t);
