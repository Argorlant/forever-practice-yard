// WoW Forever paladin talents and the builds the sims use. Order: Wowhead's
// Forever calculator after the live hotfix of 30 October (Holy 17,
// Protection 17, Retribution 17); the sims' builds are re-spent for it until
// they publish theirs. See research/paladin_forever.md → Talents and Builds.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { PROT_STATS, RET_STATS, SHOCK_STATS } from './data';

const TREES = [
  ['spiritualFocus', 'divineStrength', 'healingLight', 'reverence', 'improvedSeals', 'purifyingPower', 'divineFavor', 'illumination',
    'holyConduit', 'divinePrecision', 'infusionOfLight', 'oathOfLight', 'consecratedGround', 'holyShock', 'boundlessLight', 'holyPower',
    'lightsVigil'],
  ['divineIntellect', 'redoubt', 'precision', 'guardiansFavor', 'sacredDuty', 'templarsBulwark', 'improvedHammerOfJustice',
    'shieldSpecialization', 'toughness', 'swiftJudgement', 'improvedRighteousFury', 'anticipation', 'stoicism', 'holyShield', 'reckoning',
    'ironCreed', 'shieldsworn'],
  ['deflection', 'benediction', 'improvedJudgement', 'conviction', 'sanctifiedJudgement', 'vindication', 'unyieldingFaith',
    'sealOfCommand', 'pursuitOfJustice', 'eyeForAnEye', 'sacredArbiter', 'twoHandedWeaponSpecialization', 'turnEvil', 'repentance',
    'vengeance', 'championOfTheLight', 'unsealedWrath'],
] as const;

export type TalentKey = (typeof TREES)[number][number];
export type Talents = Record<TalentKey, number>;

const NAMES: Record<TalentKey, string> = {
  spiritualFocus: 'Spiritual Focus', divineStrength: 'Divine Strength', healingLight: 'Healing Light', reverence: 'Reverence',
  improvedSeals: 'Improved Seals', purifyingPower: 'Purifying Power', divineFavor: 'Divine Favor', illumination: 'Illumination',
  holyConduit: 'Holy Conduit', divinePrecision: 'Divine Precision', infusionOfLight: 'Infusion of Light', oathOfLight: 'Oath of Light',
  consecratedGround: 'Consecrated Ground', holyShock: 'Holy Shock', boundlessLight: 'Boundless Light', holyPower: 'Holy Power',
  lightsVigil: "Light's Vigil",
  divineIntellect: 'Divine Intellect', redoubt: 'Redoubt', precision: 'Precision', guardiansFavor: "Guardian's Favor", sacredDuty: 'Sacred Duty',
  templarsBulwark: "Templar's Bulwark", improvedHammerOfJustice: 'Improved Hammer of Justice', shieldSpecialization: 'Shield Specialization',
  toughness: 'Toughness', swiftJudgement: 'Swift Judgement', improvedRighteousFury: 'Improved Righteous Fury', anticipation: 'Anticipation',
  stoicism: 'Stoicism', holyShield: 'Holy Shield', reckoning: 'Reckoning', ironCreed: 'Iron Creed', shieldsworn: 'Shieldsworn',
  deflection: 'Deflection', benediction: 'Benediction', improvedJudgement: 'Improved Judgement', conviction: 'Conviction',
  sanctifiedJudgement: 'Sanctified Judgement', vindication: 'Vindication', unyieldingFaith: 'Unyielding Faith', sealOfCommand: 'Seal of Command',
  pursuitOfJustice: 'Pursuit of Justice', eyeForAnEye: 'Eye for an Eye', sacredArbiter: 'Sacred Arbiter',
  twoHandedWeaponSpecialization: 'Two-Handed Weapon Specialization', turnEvil: 'Turn Evil', repentance: 'Repentance', vengeance: 'Vengeance',
  championOfTheLight: 'Champion of the Light', unsealedWrath: 'Unsealed Wrath',
};

const NEW_IN_FOREVER = new Set<TalentKey>(['improvedSeals', 'reverence', 'purifyingPower', 'infusionOfLight', 'divinePrecision',
  'oathOfLight', 'consecratedGround', 'boundlessLight', 'lightsVigil', 'sacredDuty', 'swiftJudgement', 'templarsBulwark', 'stoicism',
  'ironCreed', 'shieldsworn', 'holyConduit', 'sanctifiedJudgement', 'sacredArbiter', 'turnEvil', 'championOfTheLight', 'unsealedWrath']);

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
const SHOCK_BAR = bar(['holyShock', 'holyStrike', 'judgement', 'sealOfRighteousness', 'divineFavor', 'consecration', 'exorcism', 'hammerOfWrath',
  'attack', 'sealOfCommand', 'manaPotion', 'layOnHands']);

const GS = 'gunba/wow-forever-sim';
// The Oct 30 trees rebuilt the paladin: Twist of Light, Instrument of Law, One-Handed Weapon Specialization,
// Improved Seal of Fury and Voice of Truth are gone, Unsealed Wrath and Shieldsworn are the new 31-point talents,
// and several talents moved trees or changed ranks. The yard re-spent gs's three lists on them.
const RESPENT = `${GS}, re-spent by the yard for the Oct 30 trees`;
export const BUILDS: Build[] = [
  { id: 'ret', spec: 'ret', name: 'Retribution (Unsealed Wrath)', talentString: '050250002-501-05233301001301351', source: RESPENT, stats: RET_STATS, bar: RET_BAR },
  { id: 'prot', spec: 'prot', name: 'Protection (Shieldsworn)', talentString: '-55302102513501531-0522', source: RESPENT, stats: PROT_STATS, bar: PROT_BAR, tank: true },
  { id: 'shockadin', spec: 'shock', name: 'Shockadin', talentString: '05025210221021--0523330100130133', source: RESPENT, stats: SHOCK_STATS, bar: SHOCK_BAR },
];

export const buildsFor = (spec: PaladinSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown, spec: PaladinSpec): Build {
  return BUILDS.find((b) => b.id === id && b.spec === spec) ?? buildsFor(spec)[0];
}
/** A build's talents, or your own (`custom`, a talent string from Settings → Edit talents). */
export function talentsFor(id: unknown, spec: PaladinSpec, custom?: unknown): Talents {
  const own = typeof custom === 'string' && custom ? custom : null;
  const string = own ?? buildById(id, spec).talentString;
  const key = own ? `custom:${own}` : buildById(id, spec).id;
  let t = cache.get(key);
  if (!t) cache.set(key, (t = decodeTalents(TREES, string)));
  return t;
}
export const summary = (t: Talents) => talentSummary(['Holy', 'Protection', 'Retribution'], TREES, NAMES, NEW_IN_FOREVER, t);
