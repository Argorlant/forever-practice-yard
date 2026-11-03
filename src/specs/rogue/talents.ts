// WoW Forever rogue talents and the builds the sims use.
// Talent strings list the points per talent in tree order, trees separated by
// '-'; the order is WoWSims Forever's (proto/rogue.proto).
// See research/rogue_forever.json → talents and builds.
import type { Binding, Stats } from '../../engine/types';
import { BACKSTAB_STATS, COMBAT_STATS, DAGGER_STATS, MUTILATE_STATS, STATS, SUB_BACKSTAB_STATS } from './data';

const TREES = [
  // Assassination
  ['improvedGouge', 'remorselessAttacks', 'malice', 'ruthlessness', 'murder', 'improvedSliceAndDice',
    'relentlessStrikes', 'improvedExposeArmor', 'lethality', 'vilePoisons', 'coldBlood', 'improvedPoisons',
    'vigor', 'mutilate', 'improvedKidneyShot', 'sealFate', 'venom'],
  // Combat
  ['improvedEviscerate', 'improvedSinisterStrike', 'lightningReflexes', 'puncturingWounds', 'deflection',
    'precision', 'endurance', 'riposte', 'improvedSprint', 'improvedKick', 'flawlessExecution',
    'dualWieldSpecialization', 'bladeFlurry', 'hackAndSlash', 'weaponExpertise', 'aggression', 'adrenalineRush'],
  // Subtlety
  ['camouflage', 'masterOfDeception', 'opportunity', 'setup', 'elusiveness', 'dirtyTricks', 'improvedAmbush',
    'initiative', 'ghostlyStrike', 'improvedDistract', 'heightenedSenses', 'premeditation', 'serratedBlades',
    'dirtyDeeds', 'preparation', 'hemorrhage', 'quietus', 'cutthroat', 'thousandCuts'],
] as const;

export type TalentKey = (typeof TREES)[number][number];
export type Talents = Record<TalentKey, number>;

const NAMES: Record<TalentKey, string> = {
  improvedGouge: 'Improved Gouge', remorselessAttacks: 'Remorseless Attacks', malice: 'Malice',
  ruthlessness: 'Ruthlessness', murder: 'Murder', improvedSliceAndDice: 'Improved Slice and Dice',
  relentlessStrikes: 'Relentless Strikes', improvedExposeArmor: 'Improved Expose Armor', lethality: 'Lethality',
  vilePoisons: 'Vile Poisons', coldBlood: 'Cold Blood', improvedPoisons: 'Improved Poisons', vigor: 'Vigor',
  mutilate: 'Mutilate', improvedKidneyShot: 'Improved Kidney Shot', sealFate: 'Seal Fate', venom: 'Venom',
  improvedEviscerate: 'Improved Eviscerate', improvedSinisterStrike: 'Improved Sinister Strike',
  lightningReflexes: 'Lightning Reflexes', puncturingWounds: 'Puncturing Wounds', deflection: 'Deflection',
  precision: 'Precision', endurance: 'Endurance', riposte: 'Riposte', improvedSprint: 'Improved Sprint',
  improvedKick: 'Improved Kick', flawlessExecution: 'Flawless Execution',
  dualWieldSpecialization: 'Dual Wield Specialization', bladeFlurry: 'Blade Flurry', hackAndSlash: 'Hack and Slash',
  weaponExpertise: 'Weapon Expertise', aggression: 'Aggression', adrenalineRush: 'Adrenaline Rush',
  camouflage: 'Camouflage', masterOfDeception: 'Master of Deception', opportunity: 'Opportunity', setup: 'Setup',
  elusiveness: 'Elusiveness', dirtyTricks: 'Dirty Tricks', improvedAmbush: 'Improved Ambush', initiative: 'Initiative',
  ghostlyStrike: 'Ghostly Strike', improvedDistract: 'Improved Distract', heightenedSenses: 'Heightened Senses',
  premeditation: 'Premeditation', serratedBlades: 'Serrated Blades', dirtyDeeds: 'Dirty Deeds',
  preparation: 'Preparation', hemorrhage: 'Hemorrhage', quietus: 'Quietus', cutthroat: 'Cutthroat',
  thousandCuts: 'Thousand Cuts',
};

/** Talents that are new in WoW Forever (marked in the build summary). */
const NEW_IN_FOREVER = new Set<TalentKey>(['mutilate', 'venom', 'flawlessExecution', 'hackAndSlash', 'puncturingWounds', 'quietus', 'cutthroat', 'thousandCuts']);

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

export type Rotation = 'combat' | 'combatIea' | 'backstab' | 'mutilate' | 'hemorrhage';

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

const COMBAT_BAR = bar(['sinisterStrike', 'eviscerate', 'sliceAndDice', 'rupture', 'exposeArmor', 'bladeFlurry', 'adrenalineRush', 'coldBlood',
  'kick', 'kidneyShot', 'thistleTea', 'feint', 'stealth', 'garrote', 'sprint', 'vanish']);
const BACKSTAB_BAR = bar(['backstab', 'eviscerate', 'sliceAndDice', 'rupture', 'exposeArmor', 'bladeFlurry', 'adrenalineRush', 'coldBlood',
  'kick', 'kidneyShot', 'thistleTea', 'feint', 'stealth', 'garrote', 'sprint', 'vanish']);
const MUTILATE_BAR = bar(['mutilate', 'eviscerate', 'sliceAndDice', 'rupture', 'exposeArmor', 'venom', 'coldBlood', 'thistleTea',
  'kick', 'kidneyShot', 'gouge', 'feint', 'stealth', 'garrote', 'sprint', 'vanish']);
const SUB_BACKSTAB_BAR = bar(['backstab', 'eviscerate', 'sliceAndDice', 'rupture', 'hemorrhage', 'premeditation', 'preparation', 'ambush',
  'kick', 'kidneyShot', 'thistleTea', 'feint', 'stealth', 'garrote', 'sprint', 'vanish']);
const HEMO_SWORDS_BAR = bar(['hemorrhage', 'eviscerate', 'sliceAndDice', 'rupture', 'premeditation', 'preparation', 'thistleTea', 'coldBlood',
  'kick', 'kidneyShot', 'gouge', 'feint', 'stealth', 'garrote', 'sprint', 'vanish']);
const HEMO_BAR = bar(['hemorrhage', 'eviscerate', 'sliceAndDice', 'rupture', 'ghostlyStrike', 'premeditation', 'preparation', 'thistleTea',
  'kick', 'kidneyShot', 'garrote', 'feint', 'stealth', 'ambush', 'sprint', 'vanish']);

const WS = 'wowsims/forever';
/** Builds with no equivalent in WoWSims Forever: they stay, for whoever practises them. */
const GS = 'community, from gunba/wow-forever-sim';
const FS = 'community, from foreversim';

export const BUILDS: Build[] = [
  { id: 'combat-gs', name: 'Combat Sinister Strike', source: WS, talentString: '005323101012-32030320201515231', rotation: 'combat', stats: COMBAT_STATS, bar: COMBAT_BAR },
  { id: 'combat-fs', name: 'Combat Swords', source: FS, talentString: '00530310501-32003311201515231', rotation: 'combat', stats: STATS, bar: COMBAT_BAR },
  { id: 'combat-iea', name: 'Combat, Improved Expose Armor', source: GS, talentString: '005303125-32003311201515131', rotation: 'combatIea', stats: STATS, bar: COMBAT_BAR, options: { exposeArmorDuty: true } },
  { id: 'combat-backstab', name: 'Combat Backstab', source: WS, talentString: '00532310101-32030320201515231-002', rotation: 'backstab', stats: BACKSTAB_STATS, bar: BACKSTAB_BAR },
  { id: 'mutilate-gs', name: 'Mutilate, Assassination', source: WS, talentString: '00532310151501031-302303202014', rotation: 'mutilate', stats: MUTILATE_STATS, bar: MUTILATE_BAR },
  { id: 'mutilate-combat', name: 'Mutilate, Combat', source: WS, talentString: '00532310101401-302303202015152-001', rotation: 'mutilate', stats: MUTILATE_STATS, bar: MUTILATE_BAR },
  { id: 'mutilate-fs', name: 'Mutilate', source: FS, talentString: '00530310551021051-302303202004', rotation: 'mutilate', stats: DAGGER_STATS, bar: MUTILATE_BAR },
  { id: 'hemo-gs', name: 'Subtlety Hemorrhage', source: WS, talentString: '005323101014--4323200300013211501', rotation: 'hemorrhage', stats: COMBAT_STATS, bar: HEMO_SWORDS_BAR },
  { id: 'sub-backstab', name: 'Subtlety Backstab', source: WS, talentString: '0053031-3203-4320203300013211051', rotation: 'backstab', stats: SUB_BACKSTAB_STATS, bar: SUB_BACKSTAB_BAR },
  { id: 'hemo-fs', name: 'Subtlety Hemorrhage', source: FS, talentString: '125320101--5320003310013211551', rotation: 'hemorrhage', stats: DAGGER_STATS, bar: HEMO_BAR },
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
