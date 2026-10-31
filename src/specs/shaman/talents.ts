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
  'frostShock', 'magmaTotem', 'fireNova', 'strengthOfEarthTotem', 'graceOfAirTotem', 'elementalMastery']);
const ENHANCEMENT_BAR = bar(['stormstrike', 'earthShock', 'flameShock', 'fireNova', 'lightningBolt', 'searingTotem', 'strengthOfEarthTotem', 'graceOfAirTotem',
  'rageOfTheFarseer', 'windfuryTotem', 'manaSpringTotem', 'manaPotion', 'frostShock', 'magmaTotem', 'chainLightning']);
const TANK_BAR = bar(['stormstrike', 'earthShock', 'flameShock', 'lightningShield', 'lightningBolt', 'searingTotem', 'stoneskinTotem', 'strengthOfEarthTotem',
  'rageOfTheFarseer', 'graceOfAirTotem', 'manaSpringTotem', 'manaPotion', 'fireNova', 'magmaTotem', 'frostShock']);

const GS = 'gunba/wow-forever-sim';
const FS = 'foreversim';
/** foreversim's builds, still on the old tree: the same points in the Oct 15 tree (Call of Thunder's points moved). */
const FS_REENCODED = 'foreversim, re-encoded to the Oct 15 tree';
const OURS = 'our proposal';
// Mana: 1240 + 15 x Intellect (research → Default stats).
export const BUILDS: Build[] = [
  { id: 'elemental', spec: 'elemental', name: 'Elemental', talentString: '5503331000011351-055000001-05301', source: GS, stats: ELEMENTAL_STATS, bar: ELEMENTAL_BAR, options: { mana: 4376 } },
  { id: 'elemental-fs', spec: 'elemental', name: 'Elemental', talentString: '5500331023001351-053002001-053', source: FS, stats: ELEMENTAL_STATS, bar: ELEMENTAL_BAR, options: { mana: 4376 } },
  { id: 'elemental-60', spec: 'elemental', name: 'Elemental "Level 60"', talentString: '5505331000001351--553302001', source: FS_REENCODED, stats: ELEMENTAL_STATS, bar: ELEMENTAL_BAR, options: { mana: 4376 } },
  { id: 'stormcaller', spec: 'elemental', name: 'Stormcaller (caster hybrid)', talentString: '551333100000134-055030021004002', source: GS, stats: STORMCALLER_STATS, bar: ELEMENTAL_BAR, options: { mana: 4556 } },
  { id: 'stormcaller-fs', spec: 'elemental', name: 'Stormcaller', talentString: '253533100000033-055030030004102', source: FS_REENCODED, stats: STORMCALLER_STATS, bar: ELEMENTAL_BAR, options: { mana: 4556 } },
  { id: 'enhancement', spec: 'enhancement', name: 'Enhancement', talentString: '053503102-055030011005102251-01', source: GS, stats: ENHANCEMENT_STATS, bar: ENHANCEMENT_BAR, options: { mana: 2623 } },
  { id: 'enhancement-60', spec: 'enhancement', name: 'Enhancement "Level 60"', talentString: '5505031-053030031005112251', source: `${GS} and ${FS}`, stats: ENHANCEMENT_STATS, bar: ENHANCEMENT_BAR, options: { mana: 2623 } },
  { id: 'enhancement-fs', spec: 'enhancement', name: 'Enhancement', talentString: '053503102-053030031005112251', source: FS, stats: ENHANCEMENT_STATS, bar: ENHANCEMENT_BAR, options: { mana: 2623 } },
  { id: 'tank', spec: 'tank', name: 'Off-tank (experimental)', talentString: '05350013-050230031355112201', source: OURS, stats: OFFTANK_STATS, bar: TANK_BAR, options: { mana: 2900 }, tank: true },
];

export const buildsFor = (spec: ShamanSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown, spec: ShamanSpec): Build {
  return BUILDS.find((b) => b.id === id && b.spec === spec) ?? buildsFor(spec)[0];
}
/** A build's talents, or your own (`custom`, a talent string from Settings → Edit talents). */
export function talentsFor(id: unknown, spec: ShamanSpec, custom?: unknown): Talents {
  const own = typeof custom === 'string' && custom ? custom : null;
  const string = own ?? buildById(id, spec).talentString;
  const key = own ? `custom:${own}` : buildById(id, spec).id;
  let t = cache.get(key);
  if (!t) cache.set(key, (t = decodeTalents(TREES, string)));
  return t;
}
export const summary = (t: Talents) => talentSummary(TREE_NAMES, TREES, NAMES, NEW_IN_FOREVER, t);
