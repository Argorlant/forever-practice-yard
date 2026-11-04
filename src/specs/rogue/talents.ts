// WoW Forever rogue talents and the builds the sims use.
// Talent strings list the points per talent in tree order, trees separated by
// '-'; the order is WoWSims Forever's (proto/rogue.proto).
// See research/rogue_forever.json → talents and builds.
import type { Binding, Stats } from '../../engine/types';
import { BACKSTAB_STATS, COMBAT_STATS, MUTILATE_STATS, SUB_BACKSTAB_STATS } from './data';

const TREES = [
  // Assassination
  ['improvedGouge', 'remorselessAttacks', 'malice', 'ruthlessness', 'improvedExposeArmor', 'improvedSliceAndDice',
    'vigor', 'bloodSplatter', 'lethality', 'vilePoisons', 'coldBlood', 'improvedPoisons',
    'relentlessStrikes', 'venom', 'improvedKidneyShot', 'sealFate', 'mutilate'],
  // Combat
  ['coupDeGrace', 'efficientStrikes', 'lightningReflexes', 'puncturingWounds', 'deflection', 'precision', 'improvedSprint',
    'endurance', 'riposte', 'composure', 'improvedKick', 'flawlessExecution', 'weaponExpertise', 'aggression',
    'dualWieldSpecialization', 'bladeFlurry', 'hackAndSlash', 'flashOfSteel', 'adrenalineRush'],
  // Subtlety
  ['setup', 'masterOfDeception', 'opportunity', 'dirtyDeeds', 'camouflage', 'improvedAmbush', 'dirtyTricks', 'initiative',
    'premeditation', 'serratedBlades', 'elusiveness', 'ghostlyStrike', 'quickGetaway', 'heightenedSenses', 'preparation',
    'hemorrhage', 'bootKnife', 'deathMark'],
] as const;

export type TalentKey = (typeof TREES)[number][number];
export type Talents = Record<TalentKey, number>;

const NAMES: Record<TalentKey, string> = {
  improvedGouge: 'Improved Gouge', remorselessAttacks: 'Remorseless Attacks', malice: 'Malice',
  ruthlessness: 'Ruthlessness', improvedExposeArmor: 'Improved Expose Armor', improvedSliceAndDice: 'Improved Slice and Dice',
  vigor: 'Vigor', bloodSplatter: 'Blood Splatter', lethality: 'Lethality',
  vilePoisons: 'Vile Poisons', coldBlood: 'Cold Blood', improvedPoisons: 'Improved Poisons',
  relentlessStrikes: 'Relentless Strikes', venom: 'Venom', improvedKidneyShot: 'Improved Kidney Shot', sealFate: 'Seal Fate', mutilate: 'Mutilate',
  coupDeGrace: 'Coup de Grace', efficientStrikes: 'Efficient Strikes',
  lightningReflexes: 'Lightning Reflexes', puncturingWounds: 'Puncturing Wounds', deflection: 'Deflection',
  precision: 'Precision', improvedSprint: 'Improved Sprint', endurance: 'Endurance', riposte: 'Riposte', composure: 'Composure',
  improvedKick: 'Improved Kick', flawlessExecution: 'Flawless Execution',
  weaponExpertise: 'Weapon Expertise', aggression: 'Aggression',
  dualWieldSpecialization: 'Dual Wield Specialization', bladeFlurry: 'Blade Flurry', hackAndSlash: 'Hack and Slash',
  flashOfSteel: 'Flash of Steel', adrenalineRush: 'Adrenaline Rush',
  setup: 'Setup', masterOfDeception: 'Master of Deception', opportunity: 'Opportunity', dirtyDeeds: 'Dirty Deeds',
  camouflage: 'Camouflage', improvedAmbush: 'Improved Ambush', dirtyTricks: 'Dirty Tricks', initiative: 'Initiative',
  premeditation: 'Premeditation', serratedBlades: 'Serrated Blades', elusiveness: 'Elusiveness',
  ghostlyStrike: 'Ghostly Strike', quickGetaway: 'Quick Getaway', heightenedSenses: 'Heightened Senses',
  preparation: 'Preparation', hemorrhage: 'Hemorrhage', bootKnife: 'Boot Knife', deathMark: 'Death Mark',
};

/** Talents that are new in WoW Forever (marked in the build summary). */
const NEW_IN_FOREVER = new Set<TalentKey>(['mutilate', 'venom', 'flawlessExecution', 'hackAndSlash', 'puncturingWounds', 'bloodSplatter', 'composure', 'flashOfSteel', 'quickGetaway', 'bootKnife', 'deathMark']);

export function decode(talentString: string): Talents {
  const out = {} as Talents;
  for (const tree of TREES) for (const k of tree) out[k] = 0;
  talentString.split('-').forEach((part, t) => {
    [...part].forEach((digit, i) => {
      const key = TREES[t]?.[i];
      if (key) out[key] = Number(digit);
    });
  });
  return out;
}

/** "18/33/0" from a talent string. */
function split(talentString: string): string {
  return talentString.split('-').map((p) => [...p].reduce((a, d) => a + Number(d), 0)).concat([0, 0, 0]).slice(0, 3).join('/');
}

/** Talents with points, by tree, for the Settings summary. */
export function summary(t: Talents): { tree: string; points: number; talents: string[] }[] {
  return ['Assassination', 'Combat', 'Subtlety'].map((tree, i) => {
    const talents = TREES[i].filter((k) => t[k] > 0).map((k) => {
      const max = k === 'vigor' ? 2 : undefined;
      return `${NAMES[k]} ${t[k]}${max ? `/${max}` : ''}${NEW_IN_FOREVER.has(k) ? ' ★' : ''}`;
    });
    return { tree, points: TREES[i].reduce((a, k) => a + t[k], 0), talents };
  });
}

export type Rotation = 'combat' | 'backstab' | 'mutilate' | 'hemorrhage';

export interface Build {
  id: string;
  name: string;
  source: string;
  talentString: string;
  rotation: Rotation;
  stats: Stats;
  bar: Binding[];
  /** Options the build turns on when picked. */
  options?: Record<string, boolean>;
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => ids.map((id, i) => ({ id, key: KEYS[i] }));

const COMBAT_BAR = bar(['sinisterStrike', 'shank', 'eviscerate', 'sliceAndDice', 'rupture', 'bladeFlurry', 'adrenalineRush', 'coldBlood',
  'exposeArmor', 'kick', 'kidneyShot', 'thistleTea', 'stealth', 'garrote', 'sprint', 'vanish']);
const VENOM_BAR = bar(['sinisterStrike', 'shank', 'eviscerate', 'sliceAndDice', 'rupture', 'bladeFlurry', 'coldBlood', 'thistleTea',
  'exposeArmor', 'kick', 'kidneyShot', 'feint', 'stealth', 'garrote', 'sprint', 'vanish']);
const BACKSTAB_BAR = bar(['backstab', 'shank', 'eviscerate', 'sliceAndDice', 'rupture', 'bladeFlurry', 'adrenalineRush', 'thistleTea',
  'exposeArmor', 'kick', 'kidneyShot', 'feint', 'stealth', 'garrote', 'sprint', 'vanish']);
const MUTILATE_BAR = bar(['mutilate', 'shank', 'eviscerate', 'sliceAndDice', 'rupture', 'coldBlood', 'thistleTea', 'exposeArmor',
  'kick', 'kidneyShot', 'gouge', 'feint', 'stealth', 'garrote', 'sprint', 'vanish']);
const HEMO_BAR = bar(['hemorrhage', 'shank', 'deathMark', 'sliceAndDice', 'rupture', 'ghostlyStrike', 'garrote', 'premeditation',
  'preparation', 'kick', 'thistleTea', 'exposeArmor', 'stealth', 'eviscerate', 'sprint', 'vanish']);

const WS = 'wowsims/forever';
export const BUILDS: Build[] = [
  { id: 'combat-gs', name: 'Combat Sinister Strike', source: WS, talentString: '00530320201-3200132202012321551', rotation: 'combat', stats: COMBAT_STATS, bar: COMBAT_BAR },
  { id: 'combat-backstab', name: 'Combat Backstab', source: WS, talentString: '005203002-3203130202012321351-005', rotation: 'backstab', stats: BACKSTAB_STATS, bar: BACKSTAB_BAR },
  { id: 'combat-venom', name: 'Combat Venom', source: WS, talentString: '00530320241001-320013220201232115', rotation: 'combat', stats: SUB_BACKSTAB_STATS, bar: VENOM_BAR },
  { id: 'mutilate-gs', name: 'Mutilate, Assassination', source: WS, talentString: '00530311231251031-32030302020103-001', rotation: 'mutilate', stats: MUTILATE_STATS, bar: MUTILATE_BAR },
  { id: 'hemo-gs', name: 'Subtlety Hemorrhage', source: WS, talentString: '00530301-320003-305230031321001151', rotation: 'hemorrhage', stats: COMBAT_STATS, bar: HEMO_BAR },
];

export const buildLabel = (b: Build) => `${b.name} ${split(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown): Build {
  return BUILDS.find((b) => b.id === id) ?? BUILDS[0];
}
/** A build's talents, or your own (`custom`, a talent string from Settings → Edit talents). */
export function talentsFor(id: unknown, custom?: unknown): Talents {
  const own = typeof custom === 'string' && custom ? custom : null;
  const key = own ? `custom:${own}` : buildById(id).id;
  let t = cache.get(key);
  if (!t) cache.set(key, (t = decode(own ?? buildById(id).talentString)));
  return t;
}
