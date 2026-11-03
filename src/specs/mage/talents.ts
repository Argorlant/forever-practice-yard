// The mage builds the sims and guides use (talent trees in ./talents.gen.ts,
// generated from research/mage_forever.json). See research/mage_forever.md → Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { gearOptions } from '../gear';
import { ARCANE_STATS, DATA, FIRE_STATS, FROST_STATS, MAGE_STATS } from './data';
import { NAMES, NEW_IN_FOREVER, TREES, TREE_NAMES, type Talents } from './talents.gen';

export type { Talents };
export type MageSpec = 'arcane' | 'fire' | 'frost';

export interface Build {
  id: string;
  spec: MageSpec;
  name: string;
  talentString: string;
  source: string;
  stats: Stats;
  bar: Binding[];
  /** Options the build sets when picked (its filler). */
  options?: Record<string, string | number>;
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => KEYS.map((key, i) => ({ id: ids[i] ?? null, key }));

const ARCANE_BAR = bar(['arcaneBlast', 'arcaneMissiles', 'arcaneWrath', 'fireBlast', 'arcanePower', 'presenceOfMind', 'evocation', 'manaRuby',
  'manaPotion', 'scorch', 'frostbolt']);
const FIRE_BAR = bar(['scorch', 'fireball', 'fireBlast', 'pyroblast', 'combustion', 'frostfireBolt', 'evocation', 'manaRuby', 'manaPotion',
  'presenceOfMind', 'arcaneBlast', 'arcaneMissiles', 'iceLance']);
const FROST_BAR = bar(['frostbolt', 'iceLance', 'arcaneMissiles', 'coneOfCold', 'fireBlast', 'presenceOfMind', 'evocation', 'manaRuby',
  'manaPotion', 'frostfireBolt', 'arcaneBlast', 'iceBarrier']);

const WS = 'wowsims/forever';
const GS = 'gunba/wow-forever-sim';
const FS = 'foreversim';
const MS = 'MythicSim / Kami Labs';
/** Builds with no equivalent in WoWSims Forever stay, for whoever practises them, re-spent for the 30 October trees. */
const COMMUNITY = (sim: string) => `community, from ${sim}, re-spent for the Oct 30 trees`;
const OLD = (mana: number) => ({ mana, spirit: DATA.spirit, mp5: DATA.mp5 });
export const BUILDS: Build[] = [
  { id: 'arcane', spec: 'arcane', name: 'Arcane', talentString: '050205223101311531-5500003-003', source: WS, stats: MAGE_STATS, bar: ARCANE_BAR, options: { ...gearOptions('mage') } },
  { id: 'arcane-fire', spec: 'arcane', name: 'Arcane/Fire', talentString: '050205203100311531-525000012001-003', source: WS, stats: MAGE_STATS, bar: ARCANE_BAR, options: { ...gearOptions('mage') } },
  { id: 'arcane-ms', spec: 'arcane', name: 'Arcane', talentString: '033205203100311531-505000012-023', source: COMMUNITY(MS), stats: ARCANE_STATS, bar: ARCANE_BAR, options: { ...OLD(4530) } },
  { id: 'arcane-fs', spec: 'arcane', name: 'Arcane/Frost', talentString: '253205203100311531-3-0533', source: COMMUNITY(FS), stats: ARCANE_STATS, bar: ARCANE_BAR, options: { ...OLD(4530) } },
  { id: 'fire', spec: 'fire', name: 'Fire', talentString: '0502052001001-55500001230133031-003', source: WS, stats: MAGE_STATS, bar: FIRE_BAR, options: { ...gearOptions('mage') } },
  { id: 'fire-fs', spec: 'fire', name: 'Fire', talentString: '0232052001001-55500001230133031-003', source: COMMUNITY(FS), stats: FIRE_STATS, bar: FIRE_BAR, options: { ...OLD(4218) } },
  { id: 'fire-ms', spec: 'fire', name: 'Fire', talentString: '023205103-55500001130133031-013', source: COMMUNITY(MS), stats: FIRE_STATS, bar: FIRE_BAR, options: { ...OLD(4218) } },
  { id: 'fire-frost', spec: 'fire', name: 'Fire/Frost (Frostfire Bolt)', talentString: '-55520201030133131-05350003', source: COMMUNITY(GS), stats: FIRE_STATS, bar: FIRE_BAR, options: { ...OLD(4218), fireFiller: 'frostfire' } },
  { id: 'frostfire', spec: 'fire', name: 'Frostfire', talentString: '-5550000123011303-2035010311013002', source: WS, stats: MAGE_STATS, bar: FIRE_BAR, options: { ...gearOptions('mage'), fireFiller: 'frostfire' } },
  { id: 'frost', spec: 'frost', name: 'Frost (Incineration)', talentString: '203205-5-053500011121331251', source: WS, stats: MAGE_STATS, bar: FROST_BAR, options: { ...gearOptions('mage') } },
  { id: 'arcane-frost', spec: 'frost', name: 'Arcane-Frost', talentString: '02320520310030053--0535000301003002', source: COMMUNITY(GS), stats: FROST_STATS, bar: FROST_BAR, options: { ...OLD(4203) } },
  { id: 'frost-ms', spec: 'frost', name: 'Frost with Missile Barrage', talentString: '023205103-3-053520030101301251', source: COMMUNITY(MS), stats: FROST_STATS, bar: FROST_BAR, options: { ...OLD(4203) } },
  { id: 'frost-p1', spec: 'frost', name: 'Frost (Arcane Meditation)', talentString: '2032250100003--053500001121331251', source: WS, stats: MAGE_STATS, bar: FROST_BAR, options: { ...gearOptions('mage') } },
];

export const buildsFor = (spec: MageSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown, spec: MageSpec): Build {
  return BUILDS.find((b) => b.id === id && b.spec === spec) ?? buildsFor(spec)[0];
}
/** A build's talents, or your own (`custom`, a talent string from Settings → Edit talents). */
export function talentsFor(id: unknown, spec: MageSpec, custom?: unknown): Talents {
  const own = typeof custom === 'string' && custom ? custom : null;
  const string = own ?? buildById(id, spec).talentString;
  const key = own ? `custom:${own}` : buildById(id, spec).id;
  let t = cache.get(key);
  if (!t) cache.set(key, (t = decodeTalents(TREES, string)));
  return t;
}
export const summary = (t: Talents) => talentSummary(TREE_NAMES, TREES, NAMES, NEW_IN_FOREVER, t);
