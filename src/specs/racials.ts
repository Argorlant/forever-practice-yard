// Active racials. Values from the sims' race audit (client data and Blizzard's
// October 26-27 notes): Blood Fury, Berserking, Elune's Light, Stoneform, Eureka!
// and Read Ley Line. The rest are Classic's, unconfirmed for Forever, and only
// run their timers against a dummy.
import type { Combat } from '../engine/combat';
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

/** Eureka!'s cost reduction per class (client variants); only these classes can be Gnomes. */
const EUREKA: Record<string, number> = { rogue: 0.2, warrior: 0.4, mage: 0.5, warlock: 0.5, priest: 0.15 };

const base = { gcd: 0, target: 'self' as const, group: 'racial' as const, keepsStealth: true };

function all(cls: string): Ability[] {
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
      description: () => 'Troll racial. Free, off the global cooldown: +10% attack and casting speed for 10 sec. 3 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'berserking', name: 'Berserking', icon: icon('racial_troll_berserk'), duration: 10, haste: 0.1, rangedHaste: 0.1, castHaste: 0.1 }); },
    },
    {
      ...base, id: 'elunesLight', name: "Elune's Light", icon: cdnIcon('spell_holy_elunesgrace'), race: ['nightelf'], cooldown: 180,
      description: () => 'Night Elf racial. Free, off the global cooldown: +10% critical strike chance with spells and attacks for 15 sec. 3 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'elunesLight', name: "Elune's Light", icon: cdnIcon('spell_holy_elunesgrace'), duration: 15, crit: 10, spellCrit: 10 }); },
    },
    {
      ...base, id: 'stoneform', name: 'Stoneform', icon: cdnIcon('spell_shadow_unholystrength'), race: ['dwarf'], cooldown: 180,
      description: () => 'Dwarf racial. +10% armor for 8 sec; it also removes bleeds, poisons and diseases, which the dummy does not use. 3 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'stoneform', name: 'Stoneform', icon: cdnIcon('spell_shadow_unholystrength'), duration: 8, playerArmor: 1.1 }); },
    },
    ...(EUREKA[cls] ? [{
      ...base, id: 'eureka', name: 'Eureka!', icon: cdnIcon('inv_misc_gear_01'), race: ['gnome'], cooldown: 120,
      description: () => `Gnome racial. Three charges for 15 sec: each ability that costs something pays ${Math.round(EUREKA[cls] * 100)}% less, deals 10% more and spends one. 2 min cooldown.`,
      use: (c: Combat) => { c.applyAura(c.player, { id: 'eureka', name: 'Eureka!', icon: cdnIcon('inv_misc_gear_01'), duration: 15, stacks: 3, costMult: 1 - EUREKA[cls], damageDone: 1.1 }); },
    }] : []),
    {
      ...base, id: 'readLeyLine', name: 'Read Ley Line', icon: cdnIcon('spell_arcane_arcane01'), race: ['highorder'], cooldown: 120, gcd: 1.5, castTime: 2,
      description: () => 'High Order racial. 2 sec cast: +100% health and mana regeneration for 15 sec. 2 min cooldown.',
      use: (c) => { c.applyAura(c.player, { id: 'readLeyLine', name: 'Read Ley Line', icon: cdnIcon('spell_arcane_arcane01'), duration: 15, regen: 2 }); },
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
  return all(cls).filter((a) => a.race!.some((r) => races.includes(r)));
}
