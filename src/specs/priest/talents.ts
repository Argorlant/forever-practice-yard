// WoW Forever priest talents and the damage builds the sims use. Order:
// gunba's current tree (ui/core/talents/trees/priest.json at 887a3a7, the
// Oct 15 trees), Discipline 18, Holy 17, Shadow Magic 17.
// See research/priest_forever.md.
import type { Binding, Stats } from '../../engine/types';
import { decodeTalents, talentSplit, talentSummary } from '../common';
import { SHADOW_STATS, SMITE_STATS } from './data';

const TREES = [
  ['powerInLight', 'wandSpecialization', 'twinDisciplines', 'silentResolve', 'holyPrecision', 'mentalStrength', 'martyrdom',
    'mentalAgility', 'innerFocus', 'improvedPowerWordShield', 'meditation', 'improvedInnerFire', 'improvedManaBurn', 'soulWarding',
    'penance', 'renewedHope', 'divineAegis', 'powerInfusion'],
  ['twilightFocus', 'improvedRenew', 'holySpecialization', 'spellWarding', 'divineFury', 'holyNova', 'blessedRecovery', 'inspiration',
    'holyReach', 'improvedHealing', 'searingLight', 'bindingHeal', 'litanyOfLight', 'spiritOfRedemption', 'spiritualGuidance',
    'spiritualHealing', 'prayerOfMending'],
  ['shadowFocus', 'blackout', 'spiritTap', 'improvedMindBlast', 'improvedShadowWordPain', 'shadowReach', 'improvedPsychicScream',
    'mindFlay', 'improvedMindFlay', 'darkInspiration', 'vampiricEmbrace', 'shadowWeaving', 'silence', 'devouringContagion',
    'earlyDemise', 'darkness', 'shadowform'],
] as const;

export type TalentKey = (typeof TREES)[number][number];
export type Talents = Record<TalentKey, number>;

const NAMES: Record<TalentKey, string> = {
  powerInLight: 'Power in Light', wandSpecialization: 'Wand Specialization', twinDisciplines: 'Twin Disciplines', silentResolve: 'Silent Resolve',
  holyPrecision: 'Holy Precision', improvedPowerWordShield: 'Improved Power Word: Shield', martyrdom: 'Martyrdom', mentalAgility: 'Mental Agility',
  innerFocus: 'Inner Focus', meditation: 'Meditation', improvedInnerFire: 'Improved Inner Fire', mentalStrength: 'Mental Strength',
  soulWarding: 'Soul Warding', improvedManaBurn: 'Improved Mana Burn', penance: 'Penance', renewedHope: 'Renewed Hope', divineAegis: 'Divine Aegis',
  powerInfusion: 'Power Infusion',
  twilightFocus: 'Twilight Focus', improvedRenew: 'Improved Renew', holySpecialization: 'Holy Specialization', spellWarding: 'Spell Warding',
  divineFury: 'Divine Fury', holyNova: 'Holy Nova', blessedRecovery: 'Blessed Recovery', inspiration: 'Inspiration', holyReach: 'Holy Reach',
  improvedHealing: 'Improved Healing', searingLight: 'Searing Light', bindingHeal: 'Binding Heal', litanyOfLight: 'Litany of Light',
  spiritOfRedemption: 'Spirit of Redemption', spiritualGuidance: 'Spiritual Guidance', spiritualHealing: 'Spiritual Healing', prayerOfMending: 'Prayer of Mending',
  shadowFocus: 'Shadow Focus', blackout: 'Blackout', spiritTap: 'Spirit Tap',
  improvedShadowWordPain: 'Improved Shadow Word: Pain', shadowReach: 'Shadow Reach', improvedMindBlast: 'Improved Mind Blast',
  improvedPsychicScream: 'Improved Psychic Scream', mindFlay: 'Mind Flay', improvedMindFlay: 'Improved Mind Flay', darkInspiration: 'Dark Inspiration',
  vampiricEmbrace: 'Vampiric Embrace', shadowWeaving: 'Shadow Weaving', silence: 'Silence', devouringContagion: 'Devouring Contagion',
  earlyDemise: 'Early Demise', darkness: 'Darkness', shadowform: 'Shadowform',
};

const NEW_IN_FOREVER = new Set<TalentKey>(['powerInLight', 'twinDisciplines', 'holyPrecision', 'soulWarding', 'penance', 'renewedHope',
  'divineAegis', 'bindingHeal', 'litanyOfLight', 'prayerOfMending', 'improvedMindFlay', 'darkInspiration', 'devouringContagion', 'earlyDemise']);

export type PriestSpec = 'shadow' | 'smite';

export interface Build {
  id: string;
  spec: PriestSpec;
  name: string;
  talentString: string;
  source: string;
  stats: Stats;
  bar: Binding[];
}

const KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8',
  'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyZ', 'KeyX', 'KeyC', 'KeyV'];
const bar = (ids: (string | null)[]): Binding[] => KEYS.map((key, i) => ({ id: ids[i] ?? null, key }));

const SHADOW_BAR = bar(['mindFlay', 'mindBlast', 'shadowWordPain', 'shadowWordDeath', 'devouringPlague', 'innerFocus', 'shadowform', 'manaPotion',
  'powerInfusion']);
const SMITE_BAR = bar(['smite', 'holyFire', 'mindBlast', 'penance', 'innerFocus', 'powerInfusion', 'holyNova', 'shadowWordPain',
  'manaPotion', 'shadowWordDeath']);

const GS = 'gunba/wow-forever-sim';
const FS = 'foreversim';
export const BUILDS: Build[] = [
  { id: 'shadow', spec: 'shadow', name: 'Shadow', talentString: '50500500102--50542001201302251', source: GS, stats: SHADOW_STATS, bar: SHADOW_BAR },
  { id: 'shadow-community', spec: 'shadow', name: 'Shadow, community build', talentString: '02530003101--55052201201302251', source: 'all three sims', stats: SHADOW_STATS, bar: SHADOW_BAR },
  { id: 'shadow-fs', spec: 'shadow', name: 'Shadow', talentString: '00530320103--50052201251302051', source: FS, stats: SHADOW_STATS, bar: SHADOW_BAR },
  { id: 'smite', spec: 'smite', name: 'Smite', talentString: '515035031030001031-00505023002-003', source: GS, stats: SMITE_STATS, bar: SMITE_BAR },
  { id: 'smite-launch', spec: 'smite', name: 'Smite, launch preset', talentString: '515335031030001001-30505113002', source: 'all three sims', stats: SMITE_STATS, bar: SMITE_BAR },
  { id: 'smite-hybrid', spec: 'smite', name: 'Smite with Mind Blast and Pain', talentString: '505030031030001-305051102120003-50002', source: 'our proposal', stats: SMITE_STATS, bar: SMITE_BAR },
];

export const buildsFor = (spec: PriestSpec) => BUILDS.filter((b) => b.spec === spec);
export const buildLabel = (b: Build) => `${b.name} ${talentSplit(b.talentString)} (${b.source})`;

const cache = new Map<string, Talents>();
export function buildById(id: unknown, spec: PriestSpec): Build {
  return BUILDS.find((b) => b.id === id && b.spec === spec) ?? buildsFor(spec)[0];
}
/** A build's talents, or your own (`custom`, a talent string from Settings → Edit talents). */
export function talentsFor(id: unknown, spec: PriestSpec, custom?: unknown): Talents {
  const own = typeof custom === 'string' && custom ? custom : null;
  const string = own ?? buildById(id, spec).talentString;
  const key = own ? `custom:${own}` : buildById(id, spec).id;
  let t = cache.get(key);
  if (!t) cache.set(key, (t = decodeTalents(TREES, string)));
  return t;
}
export const summary = (t: Talents) => talentSummary(['Discipline', 'Holy', 'Shadow Magic'], TREES, NAMES, NEW_IN_FOREVER, t);
