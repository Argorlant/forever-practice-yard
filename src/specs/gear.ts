// The character sheets of WoWSims Forever's gear, worked out by tools/gear_sheets.mjs (research/wowsims_gear.md lists
// the items). Unbuffed: talents, raid buffs and consumables go on top in the yard.
import type { Stats } from '../engine/types';
import GEAR from './gear.gen.json';
import OLD_SHEETS from './old-sheets.json';

type SheetId = keyof typeof GEAR;

export const sheet = (id: SheetId): Stats => GEAR[id].stats as unknown as Stats;

/** A sheet's mana pool, Spirit and mana per 5 sec, which the yard keeps among a build's options. */
export const gearOptions = (id: SheetId): Record<string, number> => GEAR[id].options;

const fingerprint = (s: Stats) => [s.attackPower, s.crit, s.hit, s.spellCrit, s.spellPower ?? 0, s.mainHand?.name ?? ''].join('|');
const OLD = new Set<string>(OLD_SHEETS);

/** One of the sheets the builds had before this gear: nobody edited it, so it can follow its build. */
export const isOldSheet = (s: Stats) => OLD.has(fingerprint(s));
