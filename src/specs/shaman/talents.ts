// The shaman builds the sims use (talent trees in ./talents.gen.ts,
// generated from research/shaman_forever.json). See research/shaman_forever.md → Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { ELEMENTAL_STATS, ENHANCEMENT_STATS, OFFTANK_STATS, STORMCALLER_STATS } from './data';
import { NAMES, NEW_IN_FOREVER, TREES, TREE_NAMES, type Talents } from './talents.gen';

export type { Talents };
export type ShamanSpec = 'elemental' | 'enhancement' | 'tank';

export interface Build {
  id: string;
  spec: ShamanSpec;
  name: string;
  talentString: string;
  source: string;
  stats: Stats;
  bar: Binding[];
  options: Record<string, string | number | boolean>;
  tank?: boolean;
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => KEYS.map((key, i) => ({ id: ids[i] ?? null, key }));

const ELEMENTAL_BAR = bar(['lightningBolt', 'lavaBurst', 'flameShock', 'chainLightning', 'earthShock', 'searingTotem', 'manaSpringTotem', 'manaPotion',
  'frostShock', 'magmaTotem', 'fireNova', 'strengthOfEarthTotem', 'graceOfAirTotem']);
const ENHANCEMENT_BAR = bar(['stormstrike', 'earthShock', 'flameShock', 'fireNova', 'lightningBolt', 'searingTotem', 'strengthOfEarthTotem', 'graceOfAirTotem',
  'rageOfTheFarseer', 'windfuryTotem', 'manaSpringTotem', 'manaPotion', 'frostShock', 'magmaTotem', 'chainLightning']);
const TANK_BAR = bar(['stormstrike', 'earthShock', 'flameShock', 'lightningShield', 'lightningBolt', 'searingTotem', 'stoneskinTotem', 'strengthOfEarthTotem',
  'rageOfTheFarseer', 'graceOfAirTotem', 'manaSpringTotem', 'manaPotion', 'fireNova', 'magmaTotem', 'frostShock']);

const GS = 'gunba/wow-forever-sim';
const FS = 'foreversim';
const OURS = 'our proposal';
// Mana: 1240 + 15 x Intellect (research → Default stats).
export const BUILDS: Build[] = [
  { id: 'elemental', spec: 'elemental', name: 'Elemental', talentString: '5502301300123051-052-05305', source: GS, stats: ELEMENTAL_STATS, bar: ELEMENTAL_BAR, options: { mana: 4376 } },
  { id: 'elemental-fs', spec: 'elemental', name: 'Elemental with Water Shield', talentString: '2505301300123051-0500001-053050001', source: FS, stats: ELEMENTAL_STATS, bar: ELEMENTAL_BAR, options: { mana: 4376 } },
  { id: 'elemental-60', spec: 'elemental', name: 'Elemental "Level 60"', talentString: '5505301300103051--503352001', source: FS, stats: ELEMENTAL_STATS, bar: ELEMENTAL_BAR, options: { mana: 4376 } },
  { id: 'stormcaller', spec: 'elemental', name: 'Stormcaller (caster hybrid)', talentString: '550133130010304-055030021004002', source: GS, stats: STORMCALLER_STATS, bar: ELEMENTAL_BAR, options: { mana: 4556 } },
  { id: 'stormcaller-fs', spec: 'elemental', name: 'Stormcaller', talentString: '150533130010303-055030030004102', source: FS, stats: STORMCALLER_STATS, bar: ELEMENTAL_BAR, options: { mana: 4556 } },
  { id: 'enhancement', spec: 'enhancement', name: 'Enhancement', talentString: '550133102-053030031005102251', source: GS, stats: ENHANCEMENT_STATS, bar: ENHANCEMENT_BAR, options: { mana: 2623 } },
  { id: 'enhancement-60', spec: 'enhancement', name: 'Enhancement "Level 60"', talentString: '5505301-053030031005112251', source: `${GS} and ${FS}`, stats: ENHANCEMENT_STATS, bar: ENHANCEMENT_BAR, options: { mana: 2623 } },
  { id: 'enhancement-fs', spec: 'enhancement', name: 'Enhancement', talentString: '2502331-055030030205112251', source: FS, stats: ENHANCEMENT_STATS, bar: ENHANCEMENT_BAR, options: { mana: 2623 } },
  { id: 'tank', spec: 'tank', name: 'Off-tank (experimental)', talentString: '0535031-050230031355112201', source: OURS, stats: OFFTANK_STATS, bar: TANK_BAR, options: { mana: 2900 }, tank: true },
];

export const buildsFor = (spec: ShamanSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown, spec: ShamanSpec): Build {
  return BUILDS.find((b) => b.id === id && b.spec === spec) ?? buildsFor(spec)[0];
}
export function talentsFor(id: unknown, spec: ShamanSpec): Talents {
  const b = buildById(id, spec);
  let t = cache.get(b.id);
  if (!t) cache.set(b.id, (t = decodeTalents(TREES, b.talentString)));
  return t;
}
export const summary = (t: Talents) => talentSummary(TREE_NAMES, TREES, NAMES, NEW_IN_FOREVER, t);
