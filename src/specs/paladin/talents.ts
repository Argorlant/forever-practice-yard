// WoW Forever paladin talents and the builds the sims use. Order: gunba's
// current tree (ui/core/talents/trees/paladin.json, same as fs), Holy 17,
// Protection 16, Retribution 17. See research/paladin_forever.md → Talents and Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { PROT_STATS, RET_STATS, SHOCK_STATS } from './data';

const TREES = [
  ['divineStrength', 'divineIntellect', 'healingLight', 'spiritualFocus', 'improvedSeals', 'unyieldingFaith', 'voiceOfTruth',
    'reverence', 'purifyingPower', 'infusionOfLight', 'illumination', 'divineFavor', 'divinePrecision', 'holyShock',
    'consecratedGround', 'holyPower', 'lightsVigil'],
  ['toughness', 'redoubt', 'precision', 'guardiansFavor', 'anticipation', 'improvedSealOfFury', 'improvedRighteousFury',
    'shieldSpecialization', 'sacredDuty', 'swiftJudgement', 'oneHandedWeaponSpecialization', 'improvedHammerOfJustice',
    'templarsBulwark', 'reckoning', 'ironCreed', 'holyShield'],
  ['deflection', 'benediction', 'improvedJudgement', 'holyConduit', 'conviction', 'vindication', 'sanctifiedJudgement',
    'sealOfCommand', 'pursuitOfJustice', 'eyeForAnEye', 'sacredArbiter', 'twoHandedWeaponSpecialization', 'vengeance',
    'repentance', 'championOfTheLight', 'instrumentOfLaw', 'twistOfLight'],
] as const;

export type TalentKey = (typeof TREES)[number][number];
export type Talents = Record<TalentKey, number>;

const NAMES: Record<TalentKey, string> = {
  divineStrength: 'Divine Strength', divineIntellect: 'Divine Intellect', healingLight: 'Healing Light', spiritualFocus: 'Spiritual Focus',
  improvedSeals: 'Improved Seals', unyieldingFaith: 'Unyielding Faith', voiceOfTruth: 'Voice of Truth', reverence: 'Reverence',
  purifyingPower: 'Purifying Power', infusionOfLight: 'Infusion of Light', illumination: 'Illumination', divineFavor: 'Divine Favor',
  divinePrecision: 'Divine Precision', holyShock: 'Holy Shock', consecratedGround: 'Consecrated Ground', holyPower: 'Holy Power',
  lightsVigil: "Light's Vigil",
  toughness: 'Toughness', redoubt: 'Redoubt', precision: 'Precision', guardiansFavor: "Guardian's Favor", anticipation: 'Anticipation',
  improvedSealOfFury: 'Improved Seal of Fury', improvedRighteousFury: 'Improved Righteous Fury', shieldSpecialization: 'Shield Specialization',
  sacredDuty: 'Sacred Duty', swiftJudgement: 'Swift Judgement', oneHandedWeaponSpecialization: 'One-Handed Weapon Specialization',
  improvedHammerOfJustice: 'Improved Hammer of Justice', templarsBulwark: "Templar's Bulwark", reckoning: 'Reckoning', ironCreed: 'Iron Creed',
  holyShield: 'Holy Shield',
  deflection: 'Deflection', benediction: 'Benediction', improvedJudgement: 'Improved Judgement', holyConduit: 'Holy Conduit',
  conviction: 'Conviction', vindication: 'Vindication', sanctifiedJudgement: 'Sanctified Judgement', sealOfCommand: 'Seal of Command',
  pursuitOfJustice: 'Pursuit of Justice', eyeForAnEye: 'Eye for an Eye', sacredArbiter: 'Sacred Arbiter',
  twoHandedWeaponSpecialization: 'Two-Handed Weapon Specialization', vengeance: 'Vengeance', repentance: 'Repentance',
  championOfTheLight: 'Champion of the Light', instrumentOfLaw: 'Instrument of Law', twistOfLight: 'Twist of Light',
};

const NEW_IN_FOREVER = new Set<TalentKey>(['improvedSeals', 'voiceOfTruth', 'reverence', 'purifyingPower', 'infusionOfLight',
  'divinePrecision', 'consecratedGround', 'lightsVigil', 'improvedSealOfFury', 'sacredDuty', 'swiftJudgement', 'templarsBulwark',
  'ironCreed', 'holyConduit', 'sanctifiedJudgement', 'sacredArbiter', 'championOfTheLight', 'instrumentOfLaw', 'twistOfLight']);

export type PaladinSpec = 'ret' | 'prot' | 'shock';

export interface Build {
  id: string;
  spec: PaladinSpec;
  name: string;
  talentString: string;
  source: string;
  stats: Stats;
  bar: Binding[];
  tank?: boolean;
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => KEYS.map((key, i) => ({ id: ids[i] ?? null, key }));

const RET_BAR = bar(['holyStrike', 'judgement', 'sealOfCommand', 'sealOfRighteousness', 'consecration', 'hammerOfWrath', 'exorcism', 'manaPotion',
  'attack', 'layOnHands']);
const PROT_BAR = bar(['holyStrike', 'judgement', 'holyShield', 'consecration', 'sealOfRighteousness', 'sealOfFury', 'righteousFury', 'templarsBulwark',
  'attack', 'swiftJudgement', 'hammerOfWrath', 'layOnHands', 'exorcism', 'manaPotion']);
const SHOCK_BAR = bar(['holyShock', 'holyStrike', 'judgement', 'sealOfCommand', 'divineFavor', 'consecration', 'exorcism', 'hammerOfWrath',
  'attack', 'sealOfRighteousness', 'manaPotion', 'layOnHands', 'lightsVigil']);

const GS = 'gunba/wow-forever-sim';
const FS = 'foreversim';
export const BUILDS: Build[] = [
  { id: 'ret', spec: 'ret', name: 'Retribution', talentString: '55003-232-05225231001330301', source: GS, stats: RET_STATS, bar: RET_BAR },
  { id: 'ret-physical', spec: 'ret', name: 'Physical Retribution', talentString: '52003003-232-05225031101330311', source: GS, stats: RET_STATS, bar: RET_BAR },
  { id: 'ret-fs', spec: 'ret', name: 'Retribution', talentString: '550030022001--05225231001330321', source: FS, stats: RET_STATS, bar: RET_BAR },
  { id: 'ret-deep', spec: 'ret', name: 'Retribution, deep', talentString: '51003--55225331201331321', source: FS, stats: RET_STATS, bar: RET_BAR },
  { id: 'prot', spec: 'prot', name: 'Protection (Undead)', talentString: '-5520513321301551-15102', source: GS, stats: PROT_STATS, bar: PROT_BAR, tank: true },
  { id: 'prot-human', spec: 'prot', name: 'Protection (Human)', talentString: '-5521513321301551-152', source: GS, stats: PROT_STATS, bar: PROT_BAR, tank: true },
  { id: 'prot-dwarf', spec: 'prot', name: 'Protection (Dwarf)', talentString: '-5520513321301551-15003', source: GS, stats: PROT_STATS, bar: PROT_BAR, tank: true },
  { id: 'prot-fs', spec: 'prot', name: 'Protection, Holy dip', talentString: '55003-5530513321301501', source: FS, stats: PROT_STATS, bar: PROT_BAR, tank: true },
  { id: 'prot-deep', spec: 'prot', name: 'Protection, deep', talentString: '-5532513321301551-15', source: FS, stats: PROT_STATS, bar: PROT_BAR, tank: true },
  { id: 'shock', spec: 'shock', name: 'Shockadin', talentString: '55003003200131251--05223331001', source: 'our proposal', stats: SHOCK_STATS, bar: SHOCK_BAR },
  { id: 'shock-ret', spec: 'shock', name: 'Shock-Ret hybrid', talentString: '55003013200101--0522513100133031', source: 'our proposal', stats: RET_STATS, bar: SHOCK_BAR },
];

export const buildsFor = (spec: PaladinSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown, spec: PaladinSpec): Build {
  return BUILDS.find((b) => b.id === id && b.spec === spec) ?? buildsFor(spec)[0];
}
export function talentsFor(id: unknown, spec: PaladinSpec): Talents {
  const b = buildById(id, spec);
  let t = cache.get(b.id);
  if (!t) cache.set(b.id, (t = decodeTalents(TREES, b.talentString)));
  return t;
}
export const summary = (t: Talents) => talentSummary(['Holy', 'Protection', 'Retribution'], TREES, NAMES, NEW_IN_FOREVER, t);
