// Every class and spec the yard can load. The player picks one in Settings;
// the choice is kept in the URL (?class=) and in the browser.
import type { Combat } from '../engine/combat';
import type { Spec } from '../engine/types';
import { addSpellbook } from './book';
import { talentsFor as druidTalents } from './druid/talents';
import { talentsFor as hunterTalents } from './hunter/talents';
import { talentsFor as mageTalents } from './mage/talents';
import { talentsFor as paladinTalents } from './paladin/talents';
import { talentsFor as priestTalents } from './priest/talents';
import { racialsFor } from './racials';
import { talentsFor as rogueTalents } from './rogue/talents';
import { talentsFor as shamanTalents } from './shaman/talents';
import { talentsFor as warlockTalents } from './warlock/talents';
import { talentsFor as warriorTalents } from './warrior/talents';
import { druidBalance, druidBear, druidCat } from './druid';
import { hunterBm, hunterMm, hunterSv } from './hunter';
import { mageArcane, mageFire, mageFrost } from './mage';
import { paladinProt, paladinRet, paladinShock } from './paladin';
import { priestShadow, priestSmite } from './priest';
import { rogue } from './rogue';
import { shamanElemental, shamanEnhancement, shamanTank } from './shaman';
import { warlockAffliction, warlockDemonology, warlockDestruction } from './warlock';
import { warrior } from './warrior';

export const SPECS: Spec[] = [rogue, warrior, druidCat, druidBear, druidBalance, paladinRet, paladinProt, paladinShock, hunterBm, hunterMm, hunterSv, priestShadow, priestSmite, mageArcane, mageFire, mageFrost, warlockAffliction, warlockDemonology, warlockDestruction, shamanElemental, shamanEnhancement, shamanTank];

/** Each class's talents, for the spells of the spellbook that need one. */
const TALENTS: Record<string, (c: Combat) => Record<string, number>> = {
  rogue: (c) => rogueTalents(c.options.build as never, c.options.talents as never),
  warrior: (c) => warriorTalents(c.options.build as never, c.options.talents as never),
  druid: (c) => druidTalents(c.options.build as never, c.spec.id.replace('druid-', '') as never, c.options.talents as never),
  paladin: (c) => paladinTalents(c.options.build as never, c.spec.id.replace('paladin-', '') as never, c.options.talents as never),
  hunter: (c) => hunterTalents(c.options.build as never, c.spec.id.replace('hunter-', '') as never, c.options.talents as never),
  priest: (c) => priestTalents(c.options.build as never, c.spec.id.replace('priest-', '') as never, c.options.talents as never),
  mage: (c) => mageTalents(c.options.build as never, c.spec.id.replace('mage-', '') as never, c.options.talents as never),
  warlock: (c) => warlockTalents(c.options.build as never, c.spec.id.replace('warlock-', '') as never, c.options.talents as never),
  shaman: (c) => shamanTalents(c.options.build as never, c.spec.id.replace('shaman-', '') as never, c.options.talents as never),
};
for (const spec of SPECS) {
  const cls = spec.className.toLowerCase();
  addSpellbook(spec, cls, TALENTS[cls], racialsFor(cls));
}

export function specById(id: string | null | undefined): Spec {
  return SPECS.find((s) => s.id === id) ?? SPECS[0];
}
