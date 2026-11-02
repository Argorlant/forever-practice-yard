// Generates src/specs/book.gen.json: the rest of each class's spellbook, the
// spells the specs do not simulate by hand. The roster below is kept by hand;
// the numbers (cost, cast time, cooldown, range, damage at level 60) come from
// the client spell table in laurencestokes/foreversim (MIT), and the icon names
// from gunba/wow-forever-sim. A spell the table does not carry is listed in
// CLASSIC with Classic's values and marked provisional.
//
// Usage: node tools/spellbook.mjs
import fs from 'node:fs';

const TABLE = 'https://raw.githubusercontent.com/laurencestokes/foreversim/HEAD/sim/core/spelldata/spells_auto_gen.go';
const ICONS = 'https://raw.githubusercontent.com/gunba/wow-forever-sim/HEAD/assets/db_inputs/forever_spell_icons.json';

const ALLIANCE = ['human', 'dwarf', 'nightelf', 'gnome', 'highorder'];
const HORDE = ['orc', 'undead', 'tauren', 'troll', 'windshaper'];
const FAMILY = { mage: 3, warrior: 4, warlock: 5, priest: 6, druid: 7, rogue: 8, hunter: 9, paladin: 10, shaman: 11 };

// [name, options]. Options: talent (points needed in that talent), race, group (one active at a time), speed (run speed while
// active), slot (a totem's element), ground (aimed at the target's spot), kind and target (when the effects do not say), pages (druid).
const CASTER = ['balance', 'cat', 'bear'];
const ROSTER = {
  warrior: [
    ['Taunt'], ['Mocking Blow'], ['Challenging Shout'], ['Disarm'], ['Retaliation'], ['Intimidating Shout'],
    ['Piercing Howl', { talent: 'piercingHowl' }], ['Victory Rush', { needsKill: true }],
  ],
  rogue: [
    ['Riposte', { talent: 'riposte' }], ['Blind'], ['Sap'], ['Distract'], ['Pick Pocket'], ['Disarm Trap'],
    ['Instant Poison VI', { kind: 'utility', target: 'self' }], ['Deadly Poison V', { kind: 'utility', target: 'self' }],
    ['Crippling Poison', { kind: 'utility', target: 'self' }], ['Mind-numbing Poison III', { kind: 'utility', target: 'self' }],
    ['Wound Poison', { kind: 'utility', target: 'self' }],
  ],
  hunter: [
    ['Volley', { ground: true, tickEvery: 1 }], ['Explosive Trap', { fromEffect: true, kind: 'damage', target: 'self', radius: 10 }], ['Frost Trap', { kind: 'utility', target: 'self' }], ['Freezing Trap', { kind: 'control', target: 'self' }],
    ['Concussive Shot'], ['Scatter Shot', { talent: 'scatterShot', kind: 'control', weapon: undefined }], ['Tranquilizing Shot'], ['Distracting Shot'], ['Scorpid Sting'], ['Viper Sting'],
    ['Disengage'], ['Feign Death'], ['Deterrence', { talent: 'deterrence' }], ['Counterattack', { talent: 'counterattack' }],
    ['Aspect of the Monkey', { group: 'aspect' }], ['Aspect of the Cheetah', { group: 'aspect', speed: 1.3 }], ['Aspect of the Pack', { group: 'aspect', speed: 1.3 }], ['Aspect of the Wild', { group: 'aspect' }],
    ['Flare', { target: 'self' }], ['Eyes of the Beast'], ['Mend Pet'], ['Revive Pet'],
    ['Track Beasts', { group: 'track' }], ['Track Demons', { group: 'track' }], ['Track Dragonkin', { group: 'track' }], ['Track Elementals', { group: 'track' }],
    ['Track Giants', { group: 'track' }], ['Track Hidden', { group: 'track' }], ['Track Humanoids', { group: 'track' }], ['Track Undead', { group: 'track' }],
  ],
  priest: [
    ['Power Word: Shield'], ['Power Word: Fortitude'], ['Prayer of Fortitude'], ['Inner Fire'], ['Psychic Scream'], ['Fade'], ['Mana Burn'],
    ['Lesser Heal'], ['Heal'], ['Flash Heal'], ['Greater Heal'], ['Renew'], ['Prayer of Healing'], ['Prayer of Mending', { talent: 'prayerOfMending' }], ['Resurrection'],
    ['Dispel Magic'], ['Cure Disease'], ['Abolish Disease'], ['Divine Spirit'], ['Prayer of Spirit'], ['Shadow Protection'], ['Prayer of Shadow Protection'],
    ['Mind Soothe'], ['Mind Vision'], ['Mind Control'], ['Shackle Undead'], ['Levitate'], ['Vampiric Embrace', { talent: 'vampiricEmbrace' }], ['Silence', { talent: 'silence' }],
    ['Starshards', { race: ['nightelf'] }], ["Elune's Grace", { race: ['nightelf'] }], ['Chastise', { race: ['dwarf'] }], ['Desperate Prayer', { race: ['dwarf'] }],
    ['Dark Sacrifice', { race: ['undead'] }], ['Touch of Weakness', { race: ['undead'], kind: 'buff', target: 'self', dmg: undefined }], ['Shadowguard', { race: ['troll'] }], ['Hex of Weakness', { race: ['troll'] }], ['Feedback', { race: ['human'] }],
    ['Fear Ward'],
  ],
  mage: [
    ['Arcane Intellect'], ['Arcane Brilliance'], ['Arcane Explosion'], ['Frost Nova'], ['Blizzard', { ground: true, tickEvery: 1 }], ['Flamestrike', { ground: true }], ['Blast Wave', { talent: 'blastWave' }],
    ['Cold Snap', { talent: 'coldSnap' }], ['Ice Block', { talent: 'iceBlock', aura: { damageTaken: 0 } }], ['Mana Shield'], ['Counterspell'],
    ['Mage Armor', { group: 'armor' }], ['Ice Armor', { group: 'armor' }], ['Frost Armor', { group: 'armor' }],
    ['Blink', { kind: 'utility' }], ['Slow Fall'], ['Remove Lesser Curse'], ['Polymorph'], ['Amplify Magic'], ['Dampen Magic'], ['Fire Ward'], ['Frost Ward'],
    ['Conjure Food'], ['Conjure Water'], ['Conjure Mana Citrine'], ['Conjure Mana Jade'], ['Conjure Mana Agate'],
    ['Teleport: Stormwind', { race: ALLIANCE }], ['Teleport: Ironforge', { race: ALLIANCE }], ['Teleport: Darnassus', { race: ALLIANCE }],
    ['Teleport: Orgrimmar', { race: HORDE }], ['Teleport: Undercity', { race: HORDE }], ['Teleport: Thunder Bluff', { race: HORDE }],
    ['Portal: Stormwind', { race: ALLIANCE }], ['Portal: Ironforge', { race: ALLIANCE }], ['Portal: Darnassus', { race: ALLIANCE }],
    ['Portal: Orgrimmar', { race: HORDE }], ['Portal: Undercity', { race: HORDE }], ['Portal: Thunder Bluff', { race: HORDE }],
  ],
  warlock: [
    ['Bane of Havoc', { talent: 'baneOfHavoc' }], ['Curse of Recklessness'], ['Curse of Weakness'], ['Curse of Tongues'], ['Curse of Exhaustion', { talent: 'curseOfExhaustion' }],
    ['Drain Soul'], ['Drain Mana'], ['Hellfire', { radius: 10 }], ['Rain of Fire', { ground: true, tickEvery: 2 }],
    ['Demon Armor', { group: 'armor' }], ['Demon Skin', { group: 'armor' }], ['Fear'], ['Howl of Terror'], ['Banish'], ['Subjugate Demon'], ['Health Funnel', { kind: 'utility', dot: undefined, hot: undefined }], ['Fel Domination', { talent: 'felDomination' }],
    ['Summon Imp', { demon: 'imp' }], ['Summon Voidwalker', { demon: 'voidwalker' }], ['Summon Succubus', { demon: 'succubus' }], ['Summon Incubus', { demon: 'succubus' }], ['Summon Felhunter', { demon: 'felhunter' }],
    ['Create Healthstone'], ['Create Spellstone'], ['Create Firestone'], ['Create Soulstone'],
    ['Ritual of Summoning'], ['Ritual of Doom'], ['Inferno', { ground: true }],
  ],
  shaman: [
    ['Healing Wave'], ['Lesser Healing Wave'], ['Chain Heal'], ['Riptide', { talent: 'riptide' }], ['Ancestral Spirit'], ['Reincarnation', { kind: 'utility', target: 'self' }],
    ['Purge'], ['Ghost Wolf', { speed: 1.4 }], ['Cure Poison'], ['Cure Disease'], ['Water Shield', { talent: 'waterShield', group: 'shield' }], ["Nature's Swiftness", { talent: 'naturesSwiftness' }],
    ['Windfury Weapon', { kind: 'utility', target: 'self', group: 'imbue' }],
    ['Totemic Recall'], ['Totemic Projection'], ['Call of the Elements'], ['Call of the Ancestors'], ['Call of the Spirits'],
    ['Earthbind Totem', { slot: 'earth' }], ['Stoneclaw Totem', { slot: 'earth' }], ['Tremor Totem', { slot: 'earth' }],
    ['Flametongue Totem', { slot: 'fire' }], ['Frost Resistance Totem', { slot: 'fire' }],
    ['Healing Stream Totem', { slot: 'water' }], ['Mana Tide Totem', { slot: 'water', talent: 'manaTideTotem' }], ['Fire Resistance Totem', { slot: 'water' }], ['Poison Cleansing Totem', { slot: 'water' }], ['Disease Cleansing Totem', { slot: 'water' }],
    ['Grounding Totem', { slot: 'air' }], ['Nature Resistance Totem', { slot: 'air' }], ['Windwall Totem', { slot: 'air' }], ['Sentry Totem', { slot: 'air' }],
  ],
  paladin: [
    ['Seal of Light', { group: 'seal' }], ['Seal of Wisdom', { group: 'seal' }], ['Seal of Justice', { group: 'seal' }], ['Seal of the Crusader', { group: 'seal' }],
    ['Blessing of Might', { group: 'blessing' }], ['Blessing of Wisdom', { group: 'blessing' }], ['Blessing of Kings', { group: 'blessing' }],
    ['Greater Blessing of Might', { group: 'blessing' }], ['Greater Blessing of Wisdom', { group: 'blessing' }], ['Greater Blessing of Kings', { group: 'blessing' }],
    ['Blessing of Protection'], ['Blessing of Freedom'], ['Blessing of Sacrifice'],
    ['Devotion Aura', { group: 'aura' }], ['Retribution Aura', { group: 'aura' }], ['Concentration Aura', { group: 'aura' }],
    ['Fire Resistance Aura', { group: 'aura' }], ['Frost Resistance Aura', { group: 'aura' }], ['Shadow Resistance Aura', { group: 'aura' }],
    ['Holy Light'], ['Flash of Light'], ['Cleanse'], ['Purify'], ['Redemption'], ['Holy Wrath'], ['Turn Undead'], ['Turn Evil', { talent: 'turnEvil' }],
    ['Divine Shield', { aura: { damageTaken: 0 } }], ['Divine Protection', { aura: { damageTaken: 0 } }], ['Divine Intervention'], ['Hammer of Justice'], ['Repentance', { talent: 'repentance' }], ["Light's Vigil", { talent: 'lightsVigil' }],
  ],
  druid: [
    ['Healing Touch', { pages: CASTER }], ['Rejuvenation', { pages: CASTER }], ['Regrowth', { pages: CASTER }], ['Tranquility', { pages: CASTER }], ['Rebirth', { pages: CASTER }], ['Revive', { pages: CASTER }],
    ['Swiftmend', { pages: CASTER, talent: 'swiftmend', kind: 'utility', heal: undefined }], ["Nature's Swiftness", { pages: CASTER, talent: 'naturesSwiftness' }], ['Wild Growth', { pages: CASTER, talent: 'wildGrowth' }],
    ['Remove Curse', { pages: CASTER }], ['Cure Poison', { pages: CASTER }], ['Abolish Poison', { pages: CASTER }], ['Mark of the Wild', { pages: CASTER }], ['Gift of the Wild', { pages: CASTER }], ['Thorns', { pages: CASTER }],
    ['Entangling Roots', { pages: CASTER }], ['Hibernate', { pages: CASTER }], ['Soothe Animal', { pages: CASTER }], ["Nature's Grasp", { pages: CASTER }], ['Hurricane', { pages: CASTER, ground: true, tickEvery: 1 }], ['Teleport: Moonglade', { pages: CASTER }],
    ['Wrath', { pages: ['cat', 'bear'] }], ['Starfire', { pages: ['cat', 'bear'] }], ['Moonfire', { pages: ['cat', 'bear'] }], ['Insect Swarm', { pages: ['cat', 'bear'], talent: 'insectSwarm' }],
    ['Innervate', { pages: ['cat', 'bear'] }], ['Barkskin', { pages: ['cat'], anyForm: true, aura: { damageTaken: 0.8 } }], ['Challenging Roar', { pages: ['bear'], rage: true }],
    ['Cat Form', { pages: CASTER, form: 'cat' }], ['Dire Bear Form', { pages: CASTER, form: 'bear' }], ['Travel Form', { pages: CASTER, form: 'travel', speed: 1.4 }], ['Aquatic Form', { pages: CASTER, form: 'aquatic' }],
  ],
};

/** Not in the table: a Classic value, unconfirmed for Forever. */
const CLASSIC = {
  'Curse of Tongues': { spell: 11719, cost: { mana: 150 }, cast: 1.5, gcd: 1.5, range: 30, dur: 15, school: 'shadow', kind: 'debuff', icon: 'spell_shadow_curseoftounges' },
};

/** Icon file names, by hand: the spell tables of the sims only name the icons of what they simulate. */
const ICON = {
  Taunt: 'spell_nature_reincarnation', 'Mocking Blow': 'ability_warrior_punishingblow', 'Challenging Shout': 'ability_bullrush', Disarm: 'ability_warrior_disarm', Retaliation: 'ability_warrior_challange',
  'Intimidating Shout': 'ability_golemthunderclap', 'Piercing Howl': 'spell_shadow_deathscream', 'Victory Rush': 'ability_warrior_devastate',
  Riposte: 'ability_warrior_challange', Blind: 'spell_shadow_mindsteal', Sap: 'ability_sap', Distract: 'ability_rogue_distract', 'Pick Pocket': 'inv_misc_bag_11', 'Disarm Trap': 'spell_shadow_grimward',
  'Instant Poison VI': 'ability_poisons', 'Deadly Poison V': 'ability_rogue_dualweild', 'Crippling Poison': 'ability_poisonsting', 'Mind-numbing Poison III': 'spell_nature_nullifydisease', 'Wound Poison': 'inv_misc_herb_16',
  Volley: 'ability_marksmanship', 'Explosive Trap': 'spell_fire_selfdestruct', 'Frost Trap': 'spell_frost_freezingbreath', 'Freezing Trap': 'spell_frost_chainsofice', 'Concussive Shot': 'spell_frost_stun', 'Scatter Shot': 'ability_golemstormbolt',
  'Tranquilizing Shot': 'spell_nature_drowsy', 'Distracting Shot': 'spell_arcane_blink', 'Scorpid Sting': 'ability_hunter_criticalshot', 'Viper Sting': 'ability_hunter_aimedshot', Disengage: 'ability_rogue_feint', 'Feign Death': 'ability_rogue_feigndeath',
  Deterrence: 'ability_whirlwind', Counterattack: 'ability_warrior_challange', 'Aspect of the Monkey': 'ability_hunter_aspectofthemonkey', 'Aspect of the Cheetah': 'ability_mount_jungletiger', 'Aspect of the Pack': 'ability_mount_whitetiger',
  'Aspect of the Wild': 'spell_nature_protectionformnature', Flare: 'spell_fire_flare', 'Eyes of the Beast': 'ability_eyeoftheowl', 'Mend Pet': 'ability_hunter_mendpet', 'Revive Pet': 'ability_hunter_beastsoothe', 'Track Beasts': 'ability_tracking',
  'Track Demons': 'spell_shadow_summonfelhunter', 'Track Dragonkin': 'inv_misc_head_dragon_01', 'Track Elementals': 'spell_frost_summonwaterelemental', 'Track Giants': 'ability_racial_avatar', 'Track Hidden': 'ability_stealth',
  'Track Humanoids': 'spell_holy_prayerofhealing', 'Track Undead': 'spell_shadow_darksummoning',
  'Power Word: Shield': 'spell_holy_powerwordshield', 'Power Word: Fortitude': 'spell_holy_wordfortitude', 'Prayer of Fortitude': 'spell_holy_prayeroffortitude', 'Inner Fire': 'spell_holy_innerfire', 'Psychic Scream': 'spell_shadow_psychicscream',
  Fade: 'spell_magic_lesserinvisibilty', 'Mana Burn': 'spell_shadow_manaburn', 'Lesser Heal': 'spell_holy_lesserheal', Heal: 'spell_holy_heal', 'Flash Heal': 'spell_holy_flashheal', 'Greater Heal': 'spell_holy_greaterheal', Renew: 'spell_holy_renew',
  'Prayer of Healing': 'spell_holy_prayerofhealing02', 'Prayer of Mending': 'spell_holy_prayerofmendingtga', Resurrection: 'spell_holy_resurrection', 'Dispel Magic': 'spell_holy_dispelmagic', 'Cure Disease': 'spell_holy_nullifydisease',
  'Abolish Disease': 'spell_nature_nullifydisease', 'Divine Spirit': 'spell_holy_divinespirit', 'Prayer of Spirit': 'spell_holy_prayerofspirit', 'Shadow Protection': 'spell_shadow_antishadow', 'Prayer of Shadow Protection': 'spell_holy_prayerofshadowprotection',
  'Mind Soothe': 'spell_holy_mindsooth', 'Mind Vision': 'spell_holy_mindvision', 'Mind Control': 'spell_shadow_shadowworddominate', 'Shackle Undead': 'spell_nature_slow', Levitate: 'spell_holy_layonhands', 'Vampiric Embrace': 'spell_shadow_unsummonbuilding',
  Silence: 'spell_shadow_impphaseshift', Starshards: 'spell_arcane_starfire', "Elune's Grace": 'spell_holy_elunesgrace', Chastise: 'spell_holy_chastise', 'Desperate Prayer': 'spell_holy_restoration', 'Touch of Weakness': 'spell_shadow_deadofnight',
  Shadowguard: 'spell_nature_lightningshield', 'Hex of Weakness': 'spell_shadow_fingerofdeath', Feedback: 'spell_shadow_ritualofsacrifice', 'Fear Ward': 'spell_holy_excorcism',
  'Arcane Intellect': 'spell_holy_magicalsentry', 'Arcane Brilliance': 'spell_holy_arcaneintellect', 'Arcane Explosion': 'spell_nature_wispsplode', 'Frost Nova': 'spell_frost_frostnova', Blizzard: 'spell_frost_icestorm', Flamestrike: 'spell_fire_selfdestruct',
  'Blast Wave': 'spell_holy_excorcism_02', 'Cold Snap': 'spell_frost_wizardmark', 'Ice Block': 'spell_frost_frost', 'Mana Shield': 'spell_shadow_detectlesserinvisibility', Counterspell: 'spell_frost_iceshock', 'Mage Armor': 'spell_magearmor',
  'Ice Armor': 'spell_frost_frostarmor02', 'Frost Armor': 'spell_frost_frostarmor02', Blink: 'spell_arcane_blink', 'Slow Fall': 'spell_magic_featherfall', 'Remove Lesser Curse': 'spell_nature_removecurse', Polymorph: 'spell_nature_polymorph',
  'Amplify Magic': 'spell_holy_flashheal', 'Dampen Magic': 'spell_nature_abolishmagic', 'Fire Ward': 'spell_fire_firearmor', 'Frost Ward': 'spell_frost_frostward', 'Conjure Food': 'inv_misc_food_33', 'Conjure Water': 'inv_drink_18',
  'Conjure Mana Citrine': 'inv_misc_gem_opal_01', 'Conjure Mana Jade': 'inv_misc_gem_emerald_02', 'Conjure Mana Agate': 'inv_misc_gem_emerald_01',
  'Teleport: Stormwind': 'spell_arcane_teleportstormwind', 'Teleport: Ironforge': 'spell_arcane_teleportironforge', 'Teleport: Darnassus': 'spell_arcane_teleportdarnassus', 'Teleport: Orgrimmar': 'spell_arcane_teleportorgrimmar',
  'Teleport: Undercity': 'spell_arcane_teleportundercity', 'Teleport: Thunder Bluff': 'spell_arcane_teleportthunderbluff', 'Portal: Stormwind': 'spell_arcane_portalstormwind', 'Portal: Ironforge': 'spell_arcane_portalironforge',
  'Portal: Darnassus': 'spell_arcane_portaldarnassus', 'Portal: Orgrimmar': 'spell_arcane_portalorgrimmar', 'Portal: Undercity': 'spell_arcane_portalundercity', 'Portal: Thunder Bluff': 'spell_arcane_portalthunderbluff',
  'Curse of Recklessness': 'spell_shadow_unholystrength', 'Curse of Weakness': 'spell_shadow_curseofmannoroth', 'Curse of Tongues': 'spell_shadow_curseoftounges', 'Curse of Exhaustion': 'spell_shadow_grimward', 'Drain Soul': 'spell_shadow_haunting',
  'Drain Mana': 'spell_shadow_siphonmana', Hellfire: 'spell_fire_incinerate', 'Rain of Fire': 'spell_shadow_rainoffire', 'Demon Armor': 'spell_shadow_ragingscream', 'Demon Skin': 'spell_shadow_ragingscream', Fear: 'spell_shadow_possession',
  'Howl of Terror': 'spell_shadow_deathscream', Banish: 'spell_shadow_cripple', 'Subjugate Demon': 'spell_shadow_enslavedemon', 'Health Funnel': 'spell_shadow_lifedrain', 'Fel Domination': 'spell_nature_removecurse', 'Summon Imp': 'spell_shadow_summonimp',
  'Summon Voidwalker': 'spell_shadow_summonvoidwalker', 'Summon Succubus': 'spell_shadow_summonsuccubus', 'Summon Incubus': 'spell_shadow_summonsuccubus', 'Summon Felhunter': 'spell_shadow_summonfelhunter', 'Create Healthstone': 'inv_stone_04',
  'Create Spellstone': 'inv_misc_gem_sapphire_01', 'Create Firestone': 'inv_ammo_firetar', 'Create Soulstone': 'spell_shadow_soulgem', 'Ritual of Summoning': 'spell_shadow_twilight', 'Ritual of Doom': 'spell_shadow_antimagicshell', Inferno: 'spell_shadow_summoninfernal',
  'Healing Wave': 'spell_nature_magicimmunity', 'Lesser Healing Wave': 'spell_nature_healingwavelesser', 'Chain Heal': 'spell_nature_healingwavegreater', Riptide: 'spell_nature_riptide', 'Ancestral Spirit': 'spell_nature_regenerate',
  Reincarnation: 'spell_nature_reincarnation', Purge: 'spell_nature_purge', 'Ghost Wolf': 'spell_nature_spiritwolf', 'Cure Poison': 'spell_nature_nullifypoison', 'Water Shield': 'ability_shaman_watershield', "Nature's Swiftness": 'spell_nature_ravenform',
  'Windfury Weapon': 'spell_nature_cyclone', 'Totemic Recall': 'spell_shaman_totemrecall', 'Call of the Elements': 'spell_shaman_dropall_01', 'Call of the Ancestors': 'spell_shaman_dropall_02', 'Call of the Spirits': 'spell_shaman_dropall_03',
  'Earthbind Totem': 'spell_nature_strengthofearthtotem02', 'Stoneclaw Totem': 'spell_nature_stoneclawtotem', 'Tremor Totem': 'spell_nature_tremortotem', 'Flametongue Totem': 'spell_nature_guardianward', 'Frost Resistance Totem': 'spell_frostresistancetotem_01',
  'Healing Stream Totem': 'inv_spear_04', 'Mana Tide Totem': 'spell_frost_summonwaterelemental', 'Fire Resistance Totem': 'spell_fireresistancetotem_01', 'Poison Cleansing Totem': 'spell_nature_poisoncleansingtotem', 'Disease Cleansing Totem': 'spell_nature_diseasecleansingtotem',
  'Grounding Totem': 'spell_nature_groundingtotem', 'Nature Resistance Totem': 'spell_nature_natureresistancetotem', 'Windwall Totem': 'spell_nature_earthbind', 'Sentry Totem': 'spell_nature_removecurse',
  'Seal of Light': 'spell_holy_healingaura', 'Seal of Wisdom': 'spell_holy_righteousnessaura', 'Seal of Justice': 'spell_holy_sealofwrath', 'Seal of the Crusader': 'spell_holy_holysmite', 'Blessing of Might': 'spell_holy_fistofjustice', 'Blessing of Wisdom': 'spell_holy_sealofwisdom',
  'Blessing of Kings': 'spell_magic_magearmor', 'Greater Blessing of Might': 'spell_holy_greaterblessingofkings', 'Greater Blessing of Wisdom': 'spell_holy_greaterblessingofwisdom', 'Greater Blessing of Kings': 'spell_magic_greaterblessingofkings',
  'Blessing of Protection': 'spell_holy_sealofprotection', 'Blessing of Freedom': 'spell_holy_sealofvalor', 'Blessing of Sacrifice': 'spell_holy_sealofsacrifice', 'Devotion Aura': 'spell_holy_devotionaura', 'Retribution Aura': 'spell_holy_auraoflight',
  'Concentration Aura': 'spell_holy_mindsooth', 'Fire Resistance Aura': 'spell_fire_sealoffire', 'Frost Resistance Aura': 'spell_frost_wizardmark', 'Shadow Resistance Aura': 'spell_shadow_sealofkings', 'Holy Light': 'spell_holy_holybolt',
  'Flash of Light': 'spell_holy_flashheal', Cleanse: 'spell_holy_renew', Purify: 'spell_holy_purify', Redemption: 'spell_holy_resurrection', 'Holy Wrath': 'spell_holy_excorcism', 'Turn Undead': 'spell_holy_turnundead', 'Turn Evil': 'spell_holy_turnundead',
  'Divine Shield': 'spell_holy_divineintervention', 'Divine Protection': 'spell_holy_restoration', 'Divine Intervention': 'spell_nature_timestop', 'Hammer of Justice': 'spell_holy_sealofmight', Repentance: 'spell_holy_prayerofhealing',
  'Healing Touch': 'spell_nature_healingtouch', Rejuvenation: 'spell_nature_rejuvenation', Regrowth: 'spell_nature_resistnature', Tranquility: 'spell_nature_tranquility', Rebirth: 'spell_nature_reincarnation', Revive: 'spell_nature_regenerate',
  Swiftmend: 'inv_relics_idolofrejuvenation', 'Wild Growth': 'ability_druid_flourish', 'Remove Curse': 'spell_holy_removecurse', 'Abolish Poison': 'spell_nature_nullifypoison_02', 'Mark of the Wild': 'spell_nature_regeneration',
  'Gift of the Wild': 'spell_nature_giftofthewild', Thorns: 'spell_nature_thorns', 'Entangling Roots': 'spell_nature_stranglevines', Hibernate: 'spell_nature_sleep', 'Soothe Animal': 'ability_hunter_beastsoothe', "Nature's Grasp": 'spell_nature_natureswrath',
  Hurricane: 'spell_nature_cyclone', 'Teleport: Moonglade': 'spell_arcane_teleportmoonglade', Wrath: 'spell_nature_abolishmagic', Starfire: 'spell_arcane_starfire', Moonfire: 'spell_nature_starfall', 'Insect Swarm': 'spell_nature_insectswarm',
  Innervate: 'spell_nature_lightning', Barkskin: 'spell_nature_stoneclawtotem', 'Challenging Roar': 'ability_druid_challangingroar',
  'Cat Form': 'ability_druid_catform', 'Dire Bear Form': 'ability_racial_bearform', 'Travel Form': 'ability_druid_travelform', 'Aquatic Form': 'ability_druid_aquaticform',
};

const SCHOOLS = { 1: 'physical', 2: 'holy', 4: 'fire', 8: 'nature', 16: 'frost', 32: 'shadow', 64: 'arcane' };
const SHOTS = new Set(['Concussive Shot', 'Scatter Shot', 'Tranquilizing Shot', 'Distracting Shot', 'Scorpid Sting', 'Viper Sting']);
const camel = (s) => s.replace(/[^A-Za-z0-9 ]/g, '').split(' ').filter(Boolean).map((w, i) => (i ? w[0].toUpperCase() : w[0].toLowerCase()) + w.slice(1)).join('');
const round = (x, n = 1) => { const p = 10 ** n; return Math.round(x * p) / p; };

const [tableText, iconsJson] = await Promise.all([
  fetch(TABLE).then((r) => { if (!r.ok) throw new Error(`table: ${r.status}`); return r.text(); }),
  fetch(ICONS).then((r) => { if (!r.ok) throw new Error(`icons: ${r.status}`); return r.json(); }),
]);
const LOCAL = new Set(fs.readdirSync('public/icons').map((f) => f.replace(/\.jpg$/, '')));
const iconById = new Map(iconsJson.spellIcons.map((s) => [s.id, s.icon]));
const iconByName = new Map(iconsJson.spellIcons.map((s) => [s.name, s.icon]));

const num = (s, k) => { const m = s.match(new RegExp(`\\b${k}: (-?[0-9.e+-]+)`)); return m ? Number(m[1]) : 0; };
const spells = [];
let cur = null;
for (const line of tableText.split(/\r?\n/)) {
  if (line.startsWith('\t{ID: ')) {
    cur = {
      id: num(line, 'ID'), name: line.match(/Name: "((?:[^"\\]|\\.)*)"/)?.[1] ?? '', rank: line.match(/Rank: "((?:[^"\\]|\\.)*)"/)?.[1] ?? '',
      school: num(line, 'School'), level: num(line, 'SpellLevel'), cast: Math.max(0, num(line, 'CastTimeMs')) / 1000, cd: Math.max(num(line, 'CooldownMs'), num(line, 'CategoryCooldownMs')) / 1000,
      gcd: num(line, 'GCDMs') / 1000, dur: Math.max(0, num(line, 'DurationMs')) / 1000, lasting: num(line, 'DurationMs') < 0, range: num(line, 'MaxRange'), min: num(line, 'MinRange'), family: num(line, 'Family'),
      passive: (Number(line.match(/Attr: \[17\]uint32\{0: (0x[0-9a-f]+)/)?.[1] ?? 0) & 0x40) !== 0, channel: line.includes('ChannelInterrupt'), effects: [], powers: {},
    };
    spells.push(cur);
  } else if (cur && line.startsWith('\t\t\t{ID: ')) {
    cur.effects.push({
      type: line.match(/Type: dbcenums\.E_(\w+)/)?.[1] ?? '', aura: line.match(/Aura: dbcenums\.A_(\w+)/)?.[1] ?? '', base: num(line, 'BasePoints'), ppl: num(line, 'PPL'),
      baseLevel: num(line, 'BaseLevel'), maxLevel: num(line, 'MaxLevel'), variance: num(line, 'Variance'), sp: num(line, 'SPCoef'), ap: num(line, 'APCoef'), amp: num(line, 'Amplitude'),
      radius: num(line, 'RadiusMax'), target: Number(line.match(/ImplicitTarget\{(\d+)/)?.[1] ?? 0), target2: Number(line.match(/ImplicitTarget\{\d+, (\d+)/)?.[1] ?? 0),
    });
  }
  if (cur && /Powers: \[\]Power\{/.test(line)) {
    const m = line.match(/Power\{\{([^}]*)\}/)?.[1] ?? '';
    const type = num(m, 'Type');
    const amount = num(m, 'Cost');
    const pct = num(m, 'CostPct');
    if (type === 1) cur.powers.rage = amount / 10;
    else if (type === 3) cur.powers.energy = amount;
    else if (pct) cur.powers.manaPct = pct;
    else if (amount) cur.powers.mana = amount;
  }
}

/** The value of an effect at level 60. */
const at60 = (e) => e.base + e.ppl * (Math.min(60, e.maxLevel || 60) - (e.baseLevel || 60));
const span = (e) => { const x = at60(e); return [Math.round(x * (1 - e.variance / 2)), Math.round(x * (1 + e.variance / 2))]; };

function describe(name, opts, cls) {
  const named = spells.filter((s) => s.name === name && !s.passive && s.level <= 60);
  const mine = named.filter((s) => s.family === FAMILY[cls]);
  const pool = mine.length ? mine : named;
  if (!pool.length) {
    const c = CLASSIC[name];
    if (!c) { console.warn(`  ! ${cls}: no record for ${name}`); return null; }
    return { id: camel(name), name, provisional: true, ...c, ...opts };
  }
  const score = (x) => (x.gcd > 0 ? 2 : 0) + (Object.keys(x.powers).length ? 1 : 0);
  const s = pool.reduce((a, b) => (score(b) > score(a) || (score(b) === score(a) && b.level > a.level) ? b : a));
  const school = SCHOOLS[s.school] ?? 'physical';
  const out = { id: camel(name.replace(/ (I|II|III|IV|V|VI)$/, '')), spell: s.id, name: name.replace(/ (I|II|III|IV|V|VI)$/, ''), school, cost: s.powers, cast: s.cast, cd: s.cd, gcd: s.gcd, range: s.range, min: s.min, dur: s.dur };
  if (s.lasting) out.lasting = true;
  if (SHOTS.has(name)) out.shot = true;
  if (s.channel) out.channel = true;
  const eff = s.effects;
  const hostile = eff.some((e) => [6, 15, 16, 53].includes(e.target) || [15, 16].includes(e.target2));
  const around = eff.some((e) => e.target === 22 && e.target2 === 15);
  const radius = Math.max(0, ...eff.map((e) => e.radius));
  const direct = eff.find((e) => e.type === 'SCHOOL_DAMAGE');
  const weapon = eff.find((e) => /WEAPON/.test(e.type));
  const dot = eff.find((e) => /PERIODIC_(DAMAGE|LEECH)/.test(e.aura));
  const manaDrain = eff.find((e) => e.aura === 'PERIODIC_MANA_LEECH' || e.type === 'POWER_BURN');
  const heal = eff.find((e) => e.type === 'HEAL');
  const hot = eff.find((e) => e.aura === 'PERIODIC_HEAL');
  const absorb = eff.find((e) => e.aura === 'SCHOOL_ABSORB');
  // Crowd control: bosses and dummies are immune to it.
  const control = hostile && eff.find((e) => /MOD_(STUN|FEAR|CONFUSE|ROOT|PACIFY|SILENCE|CHARM|POSSESS)|TRANSFORM|BANISH|SLEEP/.test(e.aura) || e.type === 'INTERRUPT_CAST');
  if (radius) out.radius = radius;
  if (direct) { out.dmg = span(direct); if (direct.sp !== 1) out.sp = round(direct.sp, 3); if (direct.ap) out.ap = round(direct.ap, 3); }
  if (weapon) { out.weapon = weapon.type === 'WEAPON_PERCENT_DAMAGE' ? round(weapon.base / 100, 2) : 1; }
  // An area channel's ticks are a spell of their own, of the same name and level.
  if (opts.ground && !direct && !dot) {
    const tick = spells.find((x) => x.name === name && x.level === s.level && x.effects[0]?.type === 'SCHOOL_DAMAGE');
    if (tick) { const e = tick.effects[0]; const [a, b] = span(e); out.dot = { every: opts.tickEvery ?? 1, each: Math.round((a + b) / 2) }; if (e.sp !== 1 && e.sp) out.dot.sp = round(e.sp, 3); }
  }
  if (dot) { const every = (dot.amp || 3000) / 1000; const each = at60(dot); out.dot = { every, each: Math.round(each) }; if (dot.sp !== 1) out.dot.sp = round(dot.sp, 3); }
  if (heal) { out.heal = span(heal); if (heal.sp !== 1) out.healSp = round(heal.sp, 3); }
  if (hot) { out.hot = { every: (hot.amp || 3000) / 1000, each: Math.round(at60(hot)) }; }
  if (absorb) out.absorb = Math.round(at60(absorb));
  out.kind = direct || weapon || out.dot ? 'damage' : heal || hot ? 'heal' : absorb ? 'absorb' : manaDrain ? 'utility' : control ? 'control' : hostile ? 'debuff' : s.dur > 0 || s.lasting ? 'buff' : 'utility';
  out.target = around ? 'self' : hostile ? 'enemy' : 'self';
  if (out.kind === 'heal' || out.kind === 'absorb') out.target = 'self';
  if (opts.fromEffect) {
    const fx = spells.filter((x) => x.name === name && x.effects.some((e) => e.type === 'SCHOOL_DAMAGE')).reduce((a, b) => (b.level > a.level ? b : a));
    const hit = fx.effects.find((e) => e.type === 'SCHOOL_DAMAGE');
    const over = fx.effects.find((e) => /PERIODIC_DAMAGE/.test(e.aura));
    out.dmg = span(hit);
    if (over) { out.dot = { every: (over.amp || 3000) / 1000, each: Math.round(at60(over)) }; out.dur = fx.dur; }
  }
  out.icon = ICON[name] ?? iconById.get(s.id) ?? iconByName.get(name) ?? '';
  if (LOCAL.has(out.icon)) out.local = true;
  return { ...out, ...opts };
}

const book = {};
for (const [cls, list] of Object.entries(ROSTER)) {
  book[cls] = [];
  for (const [name, opts = {}] of list) {
    const entry = describe(name, opts, cls);
    if (entry) book[cls].push(entry);
  }
}
fs.writeFileSync('src/specs/book.gen.json', `${JSON.stringify(book, null, 0).replace(/\},\{/g, '},\n{').replace(/\[\{/g, '[\n{')}\n`);
console.log(Object.entries(book).map(([c, l]) => `${c} ${l.length}`).join(', '));
