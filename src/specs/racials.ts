// Active racials, from WoWSims Forever (sim/core/racials.go, and the client's rows
// for Eureka!). Where Blizzard's October notes and the game build disagree it follows
// the notes, and so do we until the live game settles it: Berserking 15 sec (build 10),
// Blood Fury 2 min (build 3), Read Leyline 15 sec at +50% (build 30 at +100%), Skysight
// 15 sec at +15% (build 30 at +10%). War Stomp and the book's are Classic's, unconfirmed
// for Forever, and only run their timers against a dummy.
import type { Ability } from '../engine/types';

const icon = (name: string) => `local:${name}`;
const cdnIcon = (name: string) => `cdn:${name}`;

/** Races per class, from the character-creation roster. */
const RACES: Record<string, string[]> = {
  druid: ['nightelf', 'highorder', 'tauren', 'windshaper'],
  hunter: ['human', 'dwarf', 'nightelf', 'highorder', 'orc', 'tauren', 'troll', 'windshaper'],
  mage: ['human', 'gnome', 'highorder', 'orc', 'troll', 'undead'],
  paladin: ['human', 'dwarf', 'undead'],
  priest: ['human', 'dwarf', 'nightelf', 'gnome', 'troll', 'undead'],
  rogue: ['human', 'dwarf', 'nightelf', 'gnome', 'highorder', 'orc', 'troll', 'undead', 'windshaper'],
  shaman: ['dwarf', 'orc', 'tauren', 'troll', 'windshaper'],
  warlock: ['human', 'gnome', 'orc', 'troll', 'undead'],
  warrior: ['human', 'dwarf', 'nightelf', 'gnome', 'highorder', 'orc', 'tauren', 'troll', 'undead', 'windshaper'],
};

const base = { gcd: 0, target: 'self' as const, group: 'racial' as const, keepsStealth: true };

/** Read Leyline's buff, which an Innervate ends. */
export const ENERGIZED = 'energized';

function all(): Ability[] {
  return [
    {
      ...base, id: 'bloodFury', name: 'Blood Fury', icon: cdnIcon('racial_orc_berserkerstrength'), race: ['orc'], cooldown: 120,
      description: () => 'Orc racial. Free, off the global cooldown: +10% attack power, ranged attack power and spell power for 15 sec. 2 min cooldown.',
      use: (c) => {
        const spell = Math.max(c.spellPowerFor('fire'), c.spellPowerFor('frost'), c.spellPowerFor('shadow'), c.spellPowerFor('nature'), c.spellPowerFor('arcane'), c.spellPowerFor('holy'));
        c.applyAura(c.player, { id: 'bloodFury', name: 'Blood Fury', icon: cdnIcon('racial_orc_berserkerstrength'), duration: 15, attackPower: 0.1 * c.attackPower(), rangedAttackPower: 0.1 * c.rangedAttackPower(null), spellPower: 0.1 * spell });
      },
    },
    {
      ...base, id: 'berserking', name: 'Berserking', icon: icon('racial_troll_berserk'), race: ['troll'], cooldown: 180,
      description: () => 'Troll racial. Free, off the global cooldown: +10% attack and casting speed for 15 sec. 3 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'berserking', name: 'Berserking', icon: icon('racial_troll_berserk'), duration: 15, haste: 0.1, rangedHaste: 0.1, castHaste: 0.1 }); },
    },
    {
      ...base, id: 'elunesLight', name: "Elune's Light", icon: icon('spell_nature_moonglow'), race: ['nightelf'], cooldown: 180,
      description: () => 'Night Elf racial. Free, off the global cooldown: +10% critical strike chance with spells and attacks for 15 sec. 3 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'elunesLight', name: "Elune's Light", icon: icon('spell_nature_moonglow'), duration: 15, crit: 10, spellCrit: 10 }); },
    },
    {
      ...base, id: 'stoneform', name: 'Stoneform', icon: cdnIcon('spell_shadow_unholystrength'), race: ['dwarf'], cooldown: 180, gcd: 1.5,
      description: () => 'Dwarf racial. -10% physical damage taken for 8 sec. 3 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'stoneform', name: 'Stoneform', icon: cdnIcon('spell_shadow_unholystrength'), duration: 8, physicalTaken: 0.9 }); },
    },
    {
      ...base, id: 'shatterCurse', name: 'Shatter Curse', icon: cdnIcon('spell_nature_removecurse'), race: ['orc'], cooldown: 180, gcd: 1.5,
      description: () => 'Orc racial. -5% magic damage taken for 8 sec. 3 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'shatterCurse', name: 'Shatter Curse', icon: cdnIcon('spell_nature_removecurse'), duration: 8, magicTaken: 0.95 }); },
    },
    {
      ...base, id: 'eureka', name: 'Eureka!', icon: cdnIcon('inv_gnometoy'), race: ['gnome'], cooldown: 120,
      description: () => 'Gnome racial. Free, off the global cooldown: for 8 sec your abilities cost 10% less and deal 10% more direct damage (in the yard, all your damage). 2 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'eureka', name: 'Eureka!', icon: cdnIcon('inv_gnometoy'), duration: 8, costMult: 0.9, damageDone: 1.1 }); },
    },
    {
      ...base, id: 'readLeyLine', name: 'Read Leyline', icon: cdnIcon('ability_mage_incantersabsorbtion'), race: ['highorder'], cooldown: 120, gcd: 1.5, castTime: 0.5,
      requirements: (c) => (c.aura(c.player, 'innervate') ? "Can't do that under Innervate" : null),
      description: () => 'High Order racial. 0.5 sec cast: Energized, +50% health and mana regeneration for 15 sec (mana only in the yard), or +100% if Attuned at a Ley Line, which the yard does not have. Not under Innervate, and an Innervate ends it. 2 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: ENERGIZED, name: 'Energized', icon: cdnIcon('spell_arcane_arcane02'), duration: 15, manaRegen: 1.5 }); },
    },
    {
      ...base, id: 'skysight', name: 'Skysight', icon: cdnIcon('ability_skyreach_lens_flare'), race: ['windshaper'], cooldown: 120, gcd: 1.5, castTime: 0.5,
      description: () => 'Windshaper racial. 0.5 sec cast: Elemental Blessing, +15% movement speed for 15 sec, or +30% if Charged at an elemental convergence, which the yard does not have. 2 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'elementalBlessing', name: 'Elemental Blessing', icon: cdnIcon('ability_monk_ridethewind'), duration: 15, speed: 1.15 }); },
    },
    {
      ...base, id: 'warStomp', name: 'War Stomp', icon: cdnIcon('ability_warstomp'), race: ['tauren'], cooldown: 120, gcd: 1.5, castTime: 0.5, provisional: true,
      description: () => 'Tauren racial. 0.5 sec cast: stuns enemies within 8 yards for 2 sec. Bosses and training dummies are immune. 2 min cooldown. Classic value.',
      use: (c) => c.emit('note', { text: 'Immune', kind: 'proc' }),
    },
    {
      ...base, book: true, id: 'shadowmeld', name: 'Shadowmeld', icon: icon('ability_ambush'), race: ['nightelf'], cooldown: 10, provisional: true,
      requirements: (c) => (c.player.inCombat ? "Can't do that while in combat" : null),
      description: () => 'Night Elf racial. Out of combat: fades from sight until you move. In the yard it only shows on you. 10 sec cooldown. Classic value.',
      use: (c) => { c.applyAura(c.player, { id: 'shadowmeld', name: 'Shadowmeld', icon: icon('ability_ambush'), duration: Infinity }); },
    },
    {
      ...base, book: true, id: 'willOfTheForsaken', name: 'Will of the Forsaken', icon: cdnIcon('spell_shadow_raisedead'), race: ['undead'], cooldown: 120, provisional: true,
      description: () => 'Undead racial. Removes charm, fear and sleep, and makes you immune to them for 5 sec. 2 min cooldown. Classic value.',
      use: (c) => { c.applyAura(c.player, { id: 'willOfTheForsaken', name: 'Will of the Forsaken', icon: cdnIcon('spell_shadow_raisedead'), duration: 5 }); },
    },
    {
      ...base, book: true, id: 'cannibalize', name: 'Cannibalize', icon: icon('ability_racial_cannibalize'), race: ['undead'], cooldown: 120, gcd: 1.5, provisional: true,
      requirements: () => 'No corpse nearby',
      description: () => 'Undead racial. Channel on a nearby corpse to regain health. There are no corpses in the yard. 2 min cooldown. Classic value.',
      use: () => {},
    },
    {
      ...base, book: true, id: 'escapeArtist', name: 'Escape Artist', icon: cdnIcon('ability_rogue_trip'), race: ['gnome'], cooldown: 60, gcd: 1.5, castTime: 0.5, provisional: true,
      description: () => 'Gnome racial. 0.5 sec cast: escapes roots and snares. Nothing to escape from in the yard. 1 min cooldown. Classic value.',
      use: () => {},
    },
    {
      ...base, book: true, id: 'perception', name: 'Perception', icon: cdnIcon('spell_nature_sleep'), race: ['human'], cooldown: 180, gcd: 1.5, provisional: true,
      description: () => 'Human racial. Better stealth detection for 20 sec. 3 min cooldown. Classic value, unconfirmed for Forever.',
      use: (c) => { c.applyAura(c.player, { id: 'perception', name: 'Perception', icon: cdnIcon('spell_nature_sleep'), duration: 20 }); },
    },
  ];
}

/** The active racials of the races this class can be. */
export function racialsFor(cls: string): Ability[] {
  const races = RACES[cls] ?? [];
  return all().filter((a) => a.race!.some((r) => races.includes(r)));
}
