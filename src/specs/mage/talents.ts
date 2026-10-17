// The mage builds the sims and guides use (talent trees in ./talents.gen.ts,
// generated from research/mage_forever.json). See research/mage_forever.md → Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { ARCANE_STATS, FIRE_STATS, FROST_STATS } from './data';
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
  options?: Record<string, string>;
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => KEYS.map((key, i) => ({ id: ids[i] ?? null, key }));

const ARCANE_BAR = bar(['arcaneBlast', 'arcaneMissiles', 'arcaneWrath', 'fireBlast', 'arcanePower', 'presenceOfMind', 'evocation', 'manaRuby',
  'manaPotion', 'scorch', 'frostbolt']);
const FIRE_BAR = bar(['scorch', 'fireball', 'fireBlast', 'pyroblast', 'combustion', 'frostfireBolt', 'evocation', 'manaRuby', 'manaPotion',
  'presenceOfMind']);
const FROST_BAR = bar(['frostbolt', 'iceLance', 'arcaneMissiles', 'coneOfCold', 'fireBlast', 'presenceOfMind', 'evocation', 'manaRuby',
  'manaPotion', 'frostfireBolt', 'arcaneBlast']);

const GS = 'gunba/wow-forever-sim';
const FS = 'foreversim';
const MS = 'MythicSim / Kami Labs';
/** MythicSim publishes no strings for the Oct 15 trees: its builds by name, re-spent the way gunba re-spent his. */
const MS_REENCODED = `${MS}, re-encoded to the Oct 15 tree`;
export const BUILDS: Build[] = [
  { id: 'arcane', spec: 'arcane', name: 'Arcane', talentString: '0512005023100311531-03-005500032', source: GS, stats: ARCANE_STATS, bar: ARCANE_BAR },
  { id: 'arcane-fire', spec: 'arcane', name: 'Arcane/Fire', talentString: '0502015003100311531-2305003202003', source: 'gunba and foreversim', stats: ARCANE_STATS, bar: ARCANE_BAR },
  { id: 'arcane-ms', spec: 'arcane', name: 'Arcane', talentString: '0532205003100311531-230500001-005', source: MS_REENCODED, stats: ARCANE_STATS, bar: ARCANE_BAR },
  { id: 'arcane-fs', spec: 'arcane', name: 'Arcane', talentString: '0532005023100311531--005500033', source: `${FS} (gunba's Oct 15 re-encoding)`, stats: ARCANE_STATS, bar: ARCANE_BAR },
  { id: 'fire', spec: 'fire', name: 'Fire', talentString: '05001252000003-23450000130135031-002', source: GS, stats: FIRE_STATS, bar: FIRE_BAR },
  { id: 'fire-fs', spec: 'fire', name: 'Fire', talentString: '05002252000003-23550000130135031', source: `${FS} (gunba's Oct 15 re-encoding)`, stats: FIRE_STATS, bar: FIRE_BAR },
  { id: 'fire-ms', spec: 'fire', name: 'Fire', talentString: '0501205003-13550000130135031-004', source: MS_REENCODED, stats: FIRE_STATS, bar: FIRE_BAR },
  { id: 'fire-frost', spec: 'fire', name: 'Fire/Frost (Frostfire Bolt)', talentString: '-03552020130135131-005500033', source: 'gunba and foreversim', stats: FIRE_STATS, bar: FIRE_BAR, options: { fireFiller: 'frostfire' } },
  { id: 'frost', spec: 'frost', name: 'Frost', talentString: '0500105001-03-0555003331000301241', source: GS, stats: FROST_STATS, bar: FROST_BAR },
  { id: 'arcane-frost', spec: 'frost', name: 'Arcane-Frost', talentString: '050200500310031053--05550002010003002', source: GS, stats: FROST_STATS, bar: FROST_BAR },
  { id: 'frost-ms', spec: 'frost', name: 'Frost with Missile Barrage', talentString: '0501205003-03-0555000301001301251', source: MS_REENCODED, stats: FROST_STATS, bar: FROST_BAR },
  { id: 'frost-p1', spec: 'frost', name: 'Frost, first raid tier', talentString: '05002050030003--055500033100030024', source: 'gunba and foreversim', stats: FROST_STATS, bar: FROST_BAR },
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
