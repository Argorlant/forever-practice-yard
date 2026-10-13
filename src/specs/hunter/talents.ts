// WoW Forever hunter talents and the builds the sims use. Order: gunba's
// current tree (ui/core/talents/trees/hunter.json, same as fs), Beast
// Mastery 16, Marksmanship 16, Survival 18. See research/hunter_forever.md.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { MELEE_STATS, RANGED_STATS } from './data';

const TREES = [
  ['deadlyAspects', 'enduranceTraining', 'focusedFire', 'improvedAspectOfTheMonkey', 'pathfinding', 'improvedRevivePet',
    'bestialSwiftness', 'unleashedFury', 'improvedMendPet', 'ferocity', 'summonHawk', 'spiritBond', 'intimidation',
    'bestialDiscipline', 'frenzy', 'bestialWrath'],
  ['hawkEye', 'improvedConcussiveShot', 'lethalAttacks', 'improvedStings', 'efficiency', 'carefulAim', 'rapidKilling',
    'improvedArcaneShot', 'loneWolf', 'trueshotAura', 'mortalShots', 'rapidRecuperation', 'barrage', 'scatterShot',
    'rangedWeaponSpecialization', 'sniperShot'],
  ['improvedTracking', 'deflection', 'entrapment', 'savageStrikes', 'survivalist', 'improvedWingClip', 'cleverTraps',
    'surefooted', 'deterrence', 'survivalTactics', 'predatorsEdge', 'counterattack', 'resourcefulness', 'exposePrey',
    'survivalistsDiscipline', 'striderKick', 'lightningReflexes', 'laceratingStrikes'],
] as const;

export type TalentKey = (typeof TREES)[number][number];
export type Talents = Record<TalentKey, number>;

const NAMES: Record<TalentKey, string> = {
  deadlyAspects: 'Deadly Aspects', enduranceTraining: 'Endurance Training', focusedFire: 'Focused Fire',
  improvedAspectOfTheMonkey: 'Improved Aspect of the Monkey', pathfinding: 'Pathfinding', improvedRevivePet: 'Improved Revive Pet',
  bestialSwiftness: 'Bestial Swiftness', unleashedFury: 'Unleashed Fury', improvedMendPet: 'Improved Mend Pet', ferocity: 'Ferocity',
  summonHawk: 'Summon Hawk', spiritBond: 'Spirit Bond', intimidation: 'Intimidation', bestialDiscipline: 'Bestial Discipline',
  frenzy: 'Frenzy', bestialWrath: 'Bestial Wrath',
  hawkEye: 'Hawk Eye', improvedConcussiveShot: 'Improved Concussive Shot', lethalAttacks: 'Lethal Attacks', improvedStings: 'Improved Stings',
  efficiency: 'Efficiency', carefulAim: 'Careful Aim', rapidKilling: 'Rapid Killing', improvedArcaneShot: 'Improved Arcane Shot',
  loneWolf: 'Lone Wolf', trueshotAura: 'Trueshot Aura', mortalShots: 'Mortal Shots', rapidRecuperation: 'Rapid Recuperation',
  barrage: 'Barrage', scatterShot: 'Scatter Shot', rangedWeaponSpecialization: 'Ranged Weapon Specialization', sniperShot: 'Sniper Shot',
  improvedTracking: 'Improved Tracking', deflection: 'Deflection', entrapment: 'Entrapment', savageStrikes: 'Savage Strikes',
  survivalist: 'Survivalist', improvedWingClip: 'Improved Wing Clip', cleverTraps: 'Clever Traps', surefooted: 'Surefooted',
  deterrence: 'Deterrence', survivalTactics: 'Survival Tactics', predatorsEdge: "Predator's Edge", counterattack: 'Counterattack',
  resourcefulness: 'Resourcefulness', exposePrey: 'Expose Prey', survivalistsDiscipline: "Survivalist's Discipline",
  striderKick: 'Strider Kick', lightningReflexes: 'Lightning Reflexes', laceratingStrikes: 'Lacerating Strikes',
};

const NEW_IN_FOREVER = new Set<TalentKey>(['focusedFire', 'summonHawk', 'carefulAim', 'rapidKilling', 'loneWolf', 'rapidRecuperation',
  'sniperShot', 'improvedTracking', 'predatorsEdge', 'resourcefulness', 'exposePrey', 'survivalistsDiscipline', 'striderKick', 'laceratingStrikes']);

export type HunterSpec = 'bm' | 'mm' | 'sv';

export interface Build {
  id: string;
  spec: HunterSpec;
  name: string;
  talentString: string;
  source: string;
  stats: Stats;
  bar: Binding[];
  /** A pet is out (Lone Wolf builds fight alone). */
  pet: boolean;
  /** Melee build: stands in melee range and swings (Survival). */
  melee?: boolean;
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => KEYS.map((key, i) => ({ id: ids[i] ?? null, key }));

const MM_BAR = bar(['autoShot', 'aimedShot', 'arcaneShot', 'serpentSting', 'sniperShot', 'multiShot', 'rapidFire', 'huntersMark',
  'aspectOfTheHawk', 'trueshotAura', 'manaPotion', 'petAttackOrder', 'petFollowOrder', 'petStayOrder', 'raptorStrike']);
const BM_BAR = bar(['autoShot', 'aimedShot', 'arcaneShot', 'serpentSting', 'summonHawk', 'bestialWrath', 'intimidation', 'rapidFire',
  'aspectOfTheHawk', 'huntersMark', 'multiShot', 'manaPotion', 'petAttackOrder', 'petFollowOrder', 'petStayOrder', 'raptorStrike']);
const SV_BAR = bar(['raptorStrike', 'mongooseBite', 'striderKick', 'immolationTrap', 'wingClip', 'huntersMark', 'rapidFire', 'aspectOfTheBeast',
  'attack', 'summonHawk', 'serpentSting', 'manaPotion', 'petAttackOrder', 'petFollowOrder', 'petStayOrder']);

const GS = 'gunba/wow-forever-sim';
const FS = 'foreversim';
export const BUILDS: Build[] = [
  { id: 'mm', spec: 'mm', name: 'Marksmanship, Lone Wolf', talentString: '5-0050552011523051-50005001', source: GS, stats: RANGED_STATS, bar: MM_BAR, pet: false },
  { id: 'mm-fs', spec: 'mm', name: 'Marksmanship with a pet', talentString: '-3050552301503151-50024001', source: FS, stats: RANGED_STATS, bar: MM_BAR, pet: true },
  { id: 'mm-p1', spec: 'mm', name: 'Marksmanship, Beast Mastery dip', talentString: '5023000501-0050550501503051', source: FS, stats: RANGED_STATS, bar: MM_BAR, pet: true },
  { id: 'sv-ranged', spec: 'mm', name: 'Survival talents, ranged rotation', talentString: '-005055-550230031051220151', source: FS, stats: RANGED_STATS, bar: MM_BAR, pet: true },
  { id: 'bm', spec: 'bm', name: 'Beast Mastery', talentString: '5320001505101251-00522510005', source: GS, stats: RANGED_STATS, bar: BM_BAR, pet: true },
  { id: 'bm-fs', spec: 'bm', name: 'Beast Mastery', talentString: '5520001505121251-0050551', source: FS, stats: RANGED_STATS, bar: BM_BAR, pet: true },
  { id: 'sv', spec: 'sv', name: 'Survival, melee', talentString: '502-0050051-230230230250022151', source: GS, stats: MELEE_STATS, bar: SV_BAR, pet: true, melee: true },
  { id: 'sv-pet', spec: 'sv', name: 'Pet/Melee', talentString: '53200005001-0050051-5302002300501201', source: GS, stats: MELEE_STATS, bar: SV_BAR, pet: true, melee: true },
];

export const buildsFor = (spec: HunterSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown, spec: HunterSpec): Build {
  return BUILDS.find((b) => b.id === id && b.spec === spec) ?? buildsFor(spec)[0];
}
/** A build's talents, or your own (`custom`, a talent string from Settings → Edit talents). */
export function talentsFor(id: unknown, spec: HunterSpec, custom?: unknown): Talents {
  const own = typeof custom === 'string' && custom ? custom : null;
  const string = own ?? buildById(id, spec).talentString;
  const key = own ? `custom:${own}` : buildById(id, spec).id;
  let t = cache.get(key);
  if (!t) cache.set(key, (t = decodeTalents(TREES, string)));
  return t;
}
export const summary = (t: Talents) => talentSummary(['Beast Mastery', 'Marksmanship', 'Survival'], TREES, NAMES, NEW_IN_FOREVER, t);
