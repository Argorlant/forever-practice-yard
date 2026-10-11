// Every class and spec the yard can load. The player picks one in Settings;
// the choice is kept in the URL (?class=) and in the browser.
import type { Spec } from '../engine/types';
import { druidBalance, druidBear, druidCat } from './druid';
import { hunterBm, hunterMm, hunterSv } from './hunter';
import { mageArcane, mageFire, mageFrost } from './mage';
import { paladinProt, paladinRet, paladinShock } from './paladin';
import { priestShadow, priestSmite } from './priest';
import { rogue } from './rogue';
import { warlockAffliction, warlockDemonology, warlockDestruction } from './warlock';
import { warrior } from './warrior';

export const SPECS: Spec[] = [rogue, warrior, druidCat, druidBear, druidBalance, paladinRet, paladinProt, paladinShock, hunterBm, hunterMm, hunterSv, priestShadow, priestSmite, mageArcane, mageFire, mageFrost, warlockAffliction, warlockDemonology, warlockDestruction];

export function specById(id: string | null | undefined): Spec {
  return SPECS.find((s) => s.id === id) ?? SPECS[0];
}
