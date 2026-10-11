# Shaman data sheet for WoW Forever (level 60 vs a level 63 dummy)

Research date: 11 Oct 2026. The machine-readable version is `shaman_forever.json` in this folder. Every number there has a source link and a confidence label. It covers Elemental, Enhancement, the Stormcaller caster hybrid and the "Level 60" presets the sims ship, plus an off-tank proposal. Forever has **no tank shaman spec** and **no dual wield**. Restoration healing is out of scope; its talents are listed only because talent strings need them.

## The five things that matter most

1. **Enhancement is a one-weapon spec.** Shamans cannot dual wield in Forever (gs engine rule; classicwow.gg: two-handed axes and maces are baseline but "this does not grant dual wield"). Lava Lash and Earth Shield exist only as Season of Discovery leftovers in the client. The loop is a slow two-hander with **Windfury Weapon** (20% per landed hit, 1.5 s ICD, two extra attacks with +333 AP, +40% with Elemental Weapons 3/3). Add **Stormstrike** (8 s cooldown, 125 mana, a weapon hit, and your next Lightning Bolt, Chain Lightning or Earth Shock within 12 s deals +20%; personal, not a raid debuff) and **Maelstrom Weapon** (5 stacks make the next Lightning Bolt instant and free; the proc rate is unknown, and both sims use 2 PPM per point).
2. **Casts are faster and weaker.** Lightning Bolt r10: 2.5 s cast, 190-212 + 0.714 SP, 220 mana (Classic: 3 s, 428-477 + 0.857). Chain Lightning r4: 2 s cast, 119-134 + 0.571, 6 s cooldown. **Lava Burst** (Elemental 31 points): 2.5 s cast, 10 s cooldown, 192-248 + 0.714 Fire, +20% while **your** Flame Shock is on the target. Elemental Alacrity 3/3 takes 0.5 s off all three. Lightning Overload gives a 3/7/10% chance of a free copy for about half damage. Elemental Fury 5/5 makes spell crits 2.0x. **Elemental Mastery is gone.**
3. **Totems are cheap to place and exclusive.** All totems have a 1.0 s GCD, and buff totems last 5 min. Windfury Totem (party, 20% chance for an extra attack with +246 AP), Grace of Air (+89 Agi) and Tranquil Air (removed) never stack, even from different shamans. Flametongue Totem does not stack with Windfury Totem. Your own Windfury or Flametongue Weapon disables your personal benefit from the matching totem. **Fire Nova Totem is replaced by a Fire Nova spell**: 397-443 + 0.214 Fire around your active Fire totem, 10 s cooldown (6 s talented). It is Enhancement's biggest spell in gs (~93 DPS).
4. **Mana limits Elemental.** gs ranked Elemental spends ~5,550 mana/min and is still mana-limited for ~42 s of each 5-min fight, even with raid Judgement of Wisdom, potions and runes. Its mana tools are Clearcasting (10%), Convection (-10% cost), Mindfulness (50% regen while casting) and the restoration-only **Water Shield**: 2% of max mana per globe when you are **hit**, so it does nothing on a passive dummy. Blizzard confirms Water Shield has no cooldown; gs still gives it a 15 s cooldown. **The practice yard needs a "raid Judgement of Wisdom" toggle.**
5. **Enhancement is far ahead.** gs ranks Enhancement 20/31/0 at ~810-817 DPS, Elemental 31/7/13 at ~490-495 and Stormcaller 29/22/0 at ~453-461 (modeled ilvl 65, raid buffs, 300 s). mythicsim: Enhancement 691 (A tier, 9th of 23), Elemental 451 (C tier, last). **Weapon Mastery is disputed**: Blizzard's deep dive calls it baseline and gs adds +10% weapon damage, but a developer-style reply on bug #280 says the article listed it by mistake, and the beta character sheet shows no bonus.

## Sources

| Id | Source | Version read |
|---|---|---|
| gs | [gunba/wow-forever-sim](https://github.com/gunba/wow-forever-sim) (MIT) | commit `9c05fc8`, 9 Oct 2026: `sim/shaman/*` (all totem files), `sim/core` (base stats, buffs, debuffs, cast, mana, spell outcome, resistances, racials, flametongue_totem), `ui/elemental_shaman`, `ui/enhancement_shaman`, `ui/core/talents/trees/shaman.json`, `docs/` (beta-pass/shaman.md, uncertainties SHA-001 to 007, modelled_build_reviews, October 8 review) |
| fs | [laurencestokes/foreversim](https://github.com/laurencestokes/foreversim) (MIT) | commit `255df16`, 1 Oct 2026: `sim/shaman/*`, `ui/specs/shaman/*`. Same tree order and prerequisites as gs, so all fs strings decode |
| client | Beta client rows in fs `sim/core/spelldata/spells_auto_gen.go` | build 1.60.1.70124 (310 shaman-family rows) |
| wowhead | Wowhead Forever tooltips (`nether.wowhead.com/forever/tooltip/spell/<id>`) | 143 ids read 11 Oct 2026, with icon names |
| blizzard | [Development notes](https://us.forums.blizzard.com/en/wow/t/2360696): post 1 (24 Sep, edited 8 Oct), post 4 (1 Oct), post 5 (8 Oct, the latest; the thread is titled "Updated October 8"); [Mage and Shaman deep dive](https://worldofwarcraft.blizzard.com/en-us/news/24302097) (7 Oct) | no posts after 8 Oct |
| bugs | [forever-bugs](https://github.com/ClassicWoWCommunity/forever-bugs) #280, #276, #257, #235, #134, #215, #248, #80, #220 | "AidanZMoon" replies read like a developer but are not flagged as Blizzard |
| mythicsim | [mythicsim.com tier list](https://mythicsim.com/wow-forever/tier-list) and [shaman page](https://mythicsim.com/wow-forever/shaman) (secondary) | robots.txt allows Claude agents outside `/sims/`, `/api/` and a few private paths; ai.txt returns 404 (no opt-out). Snapshot 10 Oct, engine `8361dcc`, client 70334, 2-min fight, empty trinket slots |
| secondary | [classicwow.gg](https://classicwow.gg/forever/guides/shaman) (8 Oct), [Mobalytics](https://mobalytics.gg/wow-forever/classes/enhancement-shaman-guide), [wowtbc.gg](https://wowtbc.gg/warcraftforever/class-guides/enhancement-shaman/) (rotation labelled a guess; wrongly assumes two weapons), [Kami Labs](https://kami-labs.fr/en/wow-forever/wow-forever-chaman-quete-arme-niveau-30/) (quest axe only) | Icy Veins returned 403 (not read). **miao.tips not read** (AI opt-out) |

Wowhead prints scaling spells at each rank's maximum scaling level (Lightning Bolt 191-213, Earth Shock 303-318, Lava Burst 203-258 "+54%", Windfury Weapon "433 AP", Rockbiter "686 AP"). This sheet uses the level-60 values (190-212, 293-309, 192-248 +20%, 333, 653). Wowhead **talent** tooltips print stale raw values (Lightning Overload 30%, Anticipation 1%, Improved Stormstrike 20%, Mindfulness 5%, Natural Grace 30%), so this sheet uses gs's tree, which follows the client trait curves.

## Confidence labels

- **confirmed-forever**: Forever client data, a Wowhead Forever tooltip, Blizzard, or an in-game beta measurement (mostly at levels 10-30).
- **sim-provisional**: a choice made by one or both sims with no Forever source, or where sources disagree.
- **classic-fallback**: Forever says nothing, so the Classic 1.12 value is kept.

## Core rules

| Rule | Value | Confidence |
|---|---|---|
| Weapons | Two-hander, or one-hander with a shield or held off-hand. **No dual wield** (gs; classicwow.gg). fs still offers an off-hand imbue and dual-wield sync (legacy code) | confirmed / fs differs |
| Melee table vs +3 | 8% miss (sims 9%), 6.5% dodge, 14% parry and 5% block from the front, 40% glancing at 0.65 (beta ~0.75), crit -4.8% | confirmed (magey) |
| Spell table vs +3 | 17% miss (cap +16% hit; gear hit counts for spells too, and Tidal Focus gives +1%/point to both). No spell crit suppression in gs. Partial resists average 6% on non-binary Nature, Fire and Frost damage (gs); Earth Shock is binary in gs | classic-fallback / provisional |
| Crit multipliers | Melee 2.0x. Spells 1.5x, 2.0x with Elemental Fury 5/5 (1.9x at 4/5) for shaman Fire/Frost/Nature spells and Searing/Magma Totem (gs). fs also gives Elemental Fury to Flametongue/Frostbrand attacks and Lightning Shield orbs | confirmed / scope differs |
| GCD | 1.5 s for spells, shocks, Stormstrike, shields and imbues. **1.0 s for every totem** (not hasted). Off the GCD: Rage of the Farseer, Nature's Swiftness, Blood Fury, Berserking. gs hastes non-physical GCDs down to 1.0 s; Stormstrike (physical) stays at 1.5 s | confirmed / haste provisional |
| Shared cooldowns | Earth, Flame and Frost Shock share 6 s (Reverberation -0.2 s/point to 5 s). Chain Lightning 6 s, Lava Burst 10 s, Fire Nova 10 s (Improved Fire Nova -2 s/point) | confirmed |
| Casting and moving | Lightning Bolt, Chain Lightning and Lava Burst stop when you move. Instants (shocks, totems, Stormstrike, 5-stack Lightning Bolt) work while moving | confirmed (client interrupt flags) |
| Casts vs melee swings | gs: a hardcast Lightning Bolt, Chain Lightning or Lava Burst pauses melee and restarts a full swing at cast end. Instant casts (5-stack Lightning Bolt) keep the swing (SHA-002). fs pauses melee only if the cast runs past the next swing | sim-provisional |
| Armor | Physical damage x(1 - A/(A+5500)); 3731 gives x0.5958. Spells ignore armor | confirmed |
| Stats | AP = 100 + 2 x Str (+ Mental Dexterity 33/67/100% of Int). 19.7 Agi = 1% melee crit and dodge; 59.2 Int = 1% spell crit. Base crit 1.7% melee, 2.3% spell. Hit rating 10 = 1%, crit rating 14 = 1%. Block value = shield + Str/20 | classic-fallback / confirmed |
| Base (level 60) | Health 1,280, mana 1,520, Str 85, Agi 55, Sta 95, Int 90, Spi 100. Races: Dwarf (Alliance, new); Orc, Tauren, Troll, Windshaper (Horde). Orc +1% crit with axes, Blood Fury +10% AP and spell power for 15 s / 2 min; Troll Berserking +10% attack and cast speed for 10 s / 3 min; Tauren +5% health and +1% hit; Dwarf +1% crit with maces; Windshaper +1% haste | classic-fallback / confirmed |
| Mana | Pool 1,240 + 15 x Int. Spirit regen 6.25 + Spi/8 per s, only outside the five-second rule (gs model). MP5 = 1/5 per s. Mindfulness 17/33/50% and Improved Stormstrike 50% (15 s) let regen continue while casting | provisional |
| Threat | Damage 1.0x; Earth Shock 2.0x (gs). Spirit Weapons: -30% threat without Rockbiter, +30% with it. Natural Grace -5%/point spell threat. Lightning Overload copies cause no threat | confirmed / classic-fallback |
| Raid debuff | Forever's Curse of the Elements (1311680, icon warlock_curse_shadow) gives +10% to **all** magic schools, Nature included, and -75 resistance (Wowhead, gs). Stormstrike is no longer a raid debuff | confirmed |

## Abilities (max rank at 60)

Costs, cooldowns, ranges and damage come from client rows and Wowhead (**confirmed-forever**) unless the Notes column says otherwise. Base mana 1,520 sets the % costs.

| Ability | Id | Icon | Mana | Cast / CD / GCD | Effect at 60 | Notes |
|---|---|---|---|---|---|---|
| Lightning Bolt r10 | 15208 | spell_nature_lightning | 220 | 2.5 s / - / 1.5 | 190-212 + 0.714 SP Nature, 30 yd, missile 20 yd/s | Convection, Concussion, Call of Thunder, Elemental Alacrity, Maelstrom. r9 15207: 173-193, 190 mana |
| Chain Lightning r4 | 10605 | spell_nature_chainlightning | 485 | 2 s / 6 s / 1.5 | 119-134 + 0.571, 3 targets, -30% per jump | r3 stores 0.517 (kept by both sims) |
| Lava Burst r3 (Elemental 31) | 1238300 | spell_shaman_lavaburst | 265 | 2.5 s / 10 s / 1.5 | 192-248 + 0.714 Fire; +20% if your Flame Shock is up | r1 408490 (40): 150-192, 165 mana; r2 1238299 (50): 180-230, 230 mana. Call of Flame applies |
| Earth Shock r7 | 10414 | spell_nature_earthshock | 450 | instant / 6 s shared / 1.5 | 293-309 + 0.386 Nature, interrupt 2 s, 20 yd | "High threat" (gs 2.0x); binary in gs |
| Flame Shock r6 | 29228 | spell_fire_flameshock | 410 | instant / 6 s shared / 1.5 | 166 + 0.214 Fire, then 4 x (44 + 0.1 SP) over 12 s | Ticks can crit (Forever rule); both sims snapshot the tick |
| Frost Shock r4 | 10473 | spell_frost_frostshock | 430 | instant / 6 s shared / 1.5 | 278-295 + 0.386 Frost, -50% speed 8 s | Neither sim's APL casts it on a boss |
| Stormstrike (Enhancement 16) | 17364 | ability_shaman_stormstrike | 125 | instant / 8 s / 1.5 | main-hand weapon damage + AP; target debuff: your next LB, CL or ES +20%, 12 s, one charge | Client effect is normalized weapon damage; Wowhead says "normal weapon damage"; both sims use unnormalized |
| Fire Nova r5 | 408345 | spell_fire_sealoffire | 520 | instant / 10 s / 1.5 | 397-443 + 0.214 Fire to enemies within 10 yd of your active Fire totem | Needs a live Fire totem (gs; fs ignores this). Wowhead prints 413-459 |
| Lightning Shield r7 | 10432 | spell_nature_lightningshield | 370 | instant / - / 1.5 | 3 orbs, 10 min: 178 + 0.267 Nature to a melee attacker, 3.5 s ICD | Orbs never crit. Shamanistic Focus -45% |
| Water Shield (Restoration 11) | 408510 | ability_shaman_watershield | 0 | instant / **none** / 1.5 | 3 globes, 10 min: 2% max mana when hit or on a heal crit, 3.5 s ICD | One shield at a time. Client row and gs have a 15 s CD; Blizzard (8 Oct, #134): no CD |
| Rage of the Farseer (Enhancement 31) | 425336 | spell_nature_bloodlust | 0 | instant / 3 min / none | +30% melee speed for 25 s | Lost its cast speed in 70009 |
| Nature's Swiftness (Restoration 21) | 16188 | spell_nature_ravenform | 0 | instant / 3 min / none | next Nature spell under 10 s cast is instant | Not in any damage build |
| Purge r2 | 8012 | spell_nature_purge | 10% base (152) | instant / - / 1.5 | removes 2 magic buffs, 30 yd | |
| Ghost Wolf | 2645 | spell_nature_spiritwolf | 100 | 3 s / - / 1.5 | +40% speed | Improved Ghost Wolf -1 s / -3 s |
| Earthbind Totem | 2484 | spell_nature_strengthofearthtotem02 | 6% base (91) | instant / 15 s / 1.0 | slows enemies in 10 yd for 45 s | Earthbound: 5 s root on cast. Bosses are immune |
| Totemic Recall | 36936 | spell_shaman_totemrecall | 0 | instant / - / 1.5 | destroys your totems, refunds 25% of their cost | Refund fixed 1 Oct |
| Totemic Projection | 437009 | ability_shaman_totemrelocation | 25% base (380) | instant / 1 min / 1.5 | moves your totems up to 30 yd | |
| Call of the Elements / Ancestors / Spirits | 66842 / 66843 / 66844 | spell_shaman_dropall_01 / _02 / _03 | sum of the four totems | 3 s / - / 1.5 | drops a saved set of four totems | Levels 20 / 30 / 40 |

Not in Forever: Elemental Mastery (removed, says Blizzard), Shamanistic Rage (its id 425336 is now Rage of the Farseer), Totem of Wrath, Fire Nova Totem, Tranquil Air Totem. Lava Lash 408507 (off-hand), Earth Shield 408514, Molten Blast 425339, Feral Spirit 440580 and Rolling Thunder 432056 are Season of Discovery leftovers: they appear in the client and on Wowhead, but no Forever spellbook or tree teaches them.

## Weapon imbues

All four last 60 min (were 5), cost a 1.5 s GCD and can sit alongside sharpening stones, weightstones and oils.

| Imbue | Id | Icon | Mana | Proc rule at 60 | Confidence |
|---|---|---|---|---|---|
| Windfury Weapon r4 | 16362 (aura 439431, buff 16361) | spell_nature_cyclone | 165 | 20% per landed melee hit (white or special), **1.5 s ICD**: 2 extra attacks with +333 AP (Elemental Weapons +13/27/40% gives 466). On the main hand it disables your personal Windfury Totem benefit | chance and ICD confirmed. gs: two special-table hits; fs: two white swings (can glance) plus a 333-AP buff with 3 charges. Open (SHA-003) |
| Flametongue Weapon r6 | 16342 (proc 16344) | spell_fire_flametounge | 155 | every landed hit: Fire = 28.1 x weapon speed + 0.1 SP (35-112 range; fs clamps speed to 1.3-4.0), magic table, Elemental Weapons +5/10/15% | confirmed (spell power scaling seen in game, #80) |
| Frostbrand Weapon r5 | 16356 (attack 16353) | spell_frost_frostbrand | 160 | 169 + 0.1 SP Frost and -25% speed for 8 s; fs 8 PPM (beta log: 7.95 ± 0.24), gs 9 PPM (Classic) | value confirmed, rate provisional |
| Rockbiter Weapon r7 | 16316 (passive 16313) | spell_nature_rockbiter | 150 | +653 melee AP and bonus threat on the weapon's attacks (gs: +72 threat per hit); Elemental Weapons +7/13/20% AP; Spirit Weapons +30% threat | confirmed (threat amount classic-fallback) |

## Totems

One per element. Placing a totem replaces the old one in that slot. Buff radius is 30 yd from the totem. Totemic Focus takes -5%/point off the cost.

| Totem | Slot | Id | Icon | Mana | Lasts | Effect at 60 |
|---|---|---|---|---|---|---|
| Searing Totem r6 | Fire | 10438 (attack 10436) | spell_fire_searingtotem | 170 | 55 s | 40-54 + **0.017** SP Fire to one enemy in 20 yd every 2.2 s (fs, client cast time) or 2.5 s (gs, allows for missile travel); crits; Call of Flame +5%/point |
| Magma Totem r4 | Fire | 10587 (pulse 10581) | spell_fire_selfdestruct | 650 | 20 s | 73 + 0.033 SP Fire to all enemies in 8 yd every 2 s |
| Flametongue Totem r4 | Fire | 16387 (buff 15036) | spell_nature_guardianward | 275 | 5 min (the buff has no duration and ends with the totem) | party main-hand hits add Fire damage scaled by weapon speed (gs provisional: 13.63 x speed, no SP). Does not stack with Windfury Totem or your own Flametongue Weapon |
| Windfury Totem r3 | Air | 10614 (buff 10610) | spell_nature_windfury | 250 | 5 min | party main-hand hits: 20% for 1 extra attack with +246 AP. ICD 1.5 s (gs, Classic) vs 0.1 s (fs reading of the client row) |
| Grace of Air r3 | Air | 25359 (buff 25360) | spell_nature_invisibilitytotem | 310 | 5 min | +89 Agi to the party; exclusive with Windfury Totem |
| Strength of Earth r5 | Earth | 25361 (buff 25362) | spell_nature_earthbindtotem | 275 | 5 min | +53 Str to the party. r4 (10442) gives 42; gs's APL casts r4 but grants 53 |
| Stoneskin Totem r6 | Earth | 10408 (buff 10405) | spell_nature_stoneskintotem | 210 | 5 min | -30 Physical damage per hit taken (Guardian Totems +10/20%) |
| Mana Spring r4 | Water | 10497 (buff 10494) | spell_nature_manaregentotem | 100 | 5 min | 10 mana every 2 s (25 MP5) to the party; Restorative Totems +5%/point |
| Mana Tide r3 (Restoration 16) | Water | 17359 (buff 17360) | spell_frost_summonwaterelemental | 60 | 12 s | 290 mana every 3 s (4 ticks = 1,160) to the party; 5 min cooldown |
| Healing Stream / Tremor / Windwall / Grounding / Stoneclaw / resistance totems | various | 10463 / 8143 / 15112 / 8177 / 10428 / 10538, 10479, 10601 | inv_spear_04, spell_nature_tremortotem, ... | | | Utility. Resistance totems now reach the whole raid |

## Procs, debuffs and passives

| Name | Value | Notes |
|---|---|---|
| Clearcasting (Elemental Focus, Elemental 11) | 10% after casting any Fire, Frost or Nature damage spell (hit or miss); the next damage spell (LB, CL, LvB, shocks, Fire Nova) costs nothing; 1 charge, 15 s | buff 16246, spell_shadow_manaburn. Lower chance on low ranks (Blizzard). A Fire Nova consume-and-proc bug is fixed on 15 Oct (#235) |
| Elemental Devastation (Elemental row 2) | a direct harmful spell crit gives +3/6/9% melee crit for 10 s | buff 30165 (rank 1 id), spell_fire_elementaldevastation. Not from periodic ticks, procs (Flametongue) or totems (#257). gs also excludes Overload crits |
| Elemental Fury (Elemental 26) | crit damage bonus +20%/point: spells crit for 2.0x at 5/5 | needs Call of Thunder |
| Call of Thunder (Elemental 16) | +3% crit for Lightning Bolt and Chain Lightning | needs Elemental Alacrity 3/3 |
| Lightning Overload (Elemental 21) | 3/7/10%: LB or CL casts a free copy that does about half damage and no threat. LB r10 copy: ~100 + 0.357 SP | Separate client rows (gs). fs halves the parent |
| Concussion / Convection / Call of Flame | +1%/point LB, CL, ES (not Flame or Frost Shock) / -2%/point cost of shocks, LB, CL, LvB / +5%/point fire totems, Flame Shock, Fire Nova, LvB | |
| Stormstrike debuff | +20% to **your** next LB, CL or ES within 12 s, one charge | aura 17364, ability_shaman_stormstrike. Personal in Forever. gs: the Overload copy of the same bolt does not get it |
| Maelstrom Weapon (Enhancement 26) | melee hits stack it (5 stacks, 30 s); each stack cuts the next LB's cast time and cost by 4%/point (20% at 5/5); LB consumes it | buff 408505, spell_shaman_maelstromweapon. **Proc rate unknown**: both sims use 2 PPM per point (10 PPM at 5/5). The client's unexplained "50" matches SoD's +50% bonuses for Windfury and two-handers (fs note) |
| Flurry (Enhancement row 4) | a melee crit gives +5/10/15/20/25% attack speed for 3 swings (white swings spend charges, 500 ms ICD), 15 s | buff 16257, ability_ghoulfrenzy. Needs Mental Dexterity |
| Improved Stormstrike | Stormstrike: 50/100% chance of 50% regen while casting for 15 s; your dodge or parry: 50/100% chance to reset Stormstrike | buff 1238931, spell_shaman_improvedstormstrike |
| Elemental Weapons | Windfury AP +13/27/40%; Flametongue and Frostbrand +5/10/15%; Rockbiter AP +7/13/20% | does not affect Windfury Totem |
| Thundering Strikes / Ancestral Knowledge | +1%/point crit for all attacks and spells / +2%/point Int | |
| Mental Dexterity / Mental Quickness | AP +33/67/100% of Int / spell damage +15/30% of Int | the Int-scaling core of Enhancement and Stormcaller |
| Shamanistic Focus (Enhancement 11) | shocks and Lightning Shield always cost 45% less | Classic: a proc after melee crits |
| Spirit Weapons (Enhancement 21) | can parry; threat -30% (+30% with Rockbiter) | |
| Weapon Mastery (29088) | gs: +10% Physical damage with axes, maces, staves, fists and daggers at 60 | **Disputed**: deep dive says baseline; #280 reply says no |
| Not in Forever | Unleashed Rage, Shield Specialization (removed), Two-Handed Axes and Maces (baseline skill only), Enhancing Totems and Improved Weapon Totems (folded into 53 / 89 / 246) | |

**Raid buffs and debuffs for the yard list:** add Grace of Air (+89 Agi, exclusive with Windfury Totem), Strength of Earth (+53 Str), Flametongue Totem (exclusive with Windfury Totem), Stoneskin Totem (tanks), Mana Tide (1,160 mana per 5 min) and Forever's Curse of the Elements (+10% all magic schools). For a shaman player with Windfury Weapon, switch off the raid Windfury Totem. Stormstrike is no longer a raid debuff.

## Tank shaman

**Forever has no tank shaman.** Blizzard's deep dive and mythicsim list no tank spec, gs ranks none (SHA-005: "no current Shaman tank row"), and classicwow.gg says not to "establish Enhancement as a raid tank". Season of Discovery's tank runes (Way of Earth, Shield Mastery, Earth Shield, Molten Blast) are not trainable. The tank tools that remain are Rockbiter (+653 AP and threat), Spirit Weapons (parry; +30% threat with Rockbiter), Anticipation (+2/4/6% dodge), Toughness (+2%/point Stamina), Earth Shock (2.0x threat), Improved Stormstrike resets on dodge or parry, Lightning Shield (orb damage on each hit, 3.5 s ICD), Water Shield (mana when hit), Stoneskin, Elemental Warding and a shield (5% block, block value shield + Str/20; there is no Shield Specialization).

**Off-tank toggle (our proposal, experimental):** `0535031-050230031355112201` (17/34/0: Concussion, Elemental Warding, Reverberation, Elemental Devastation, Elemental Focus / Thundering Strikes, Guardian Totems, Mental Dexterity, Elemental Weapons, Shamanistic Focus, Anticipation 3, Toughness 5, Flurry, Stormstrike, Spirit Weapons, Mental Quickness, Improved Stormstrike, Rage of the Farseer). Against the warrior's attacking dummy (`warrior_forever.md`), use the same 2.0 s swing, the same miss/dodge/parry/block/crit/crushing roll and armor A/(A+5755). Per swing: roll parry (5% base with Spirit Weapons), dodge (Anticipation), block (5% with a shield). A dodge or parry has a 100% chance to reset Stormstrike; a landed hit fires a Lightning Shield orb (or a Water Shield globe) at most every 3.5 s; Stoneskin takes 30 off physical hits. Threat: Rockbiter x1.3 on everything, Earth Shock x2.0 on top. Nothing reduces crushing blows or crit chance below the defense rule, so expect high damage taken.

## Talents

Talent strings use gs's order (`ui/core/talents/trees/shaman.json` = `TalentTreeSizes {16, 18, 16}` = fs): **Elemental Combat 16, Enhancement 18, Restoration 16**. Rows need 5 points per row above, and prerequisites must be maxed. **New in Forever** talents are in bold; renamed or redesigned ones are in italics. Per-rank values, icons and client spell ids are in the JSON, along with `talents.tsSnippet`.

- **Elemental Combat**: convection 5, concussion 5, elementalWarding 3, reverberation 5 (now row 2), callOfFlame 3 (+Flame Shock, Fire Nova, LvB), elementalDevastation 3 (row 2), elementalFocus 1, *elementalAlacrity* 3 (was Lightning Mastery; 0.17/0.33/0.5 s), *improvedFireNova* 2 (was Improved Fire Totems), *eyeOfTheStorm* 3 (pushback), callOfThunder 1 (needs Elemental Alacrity), *elementalReach* 2 (was Storm Reach), **lightningOverload** 3, **earthbound** 1, elementalFury 5 (needs Call of Thunder), **lavaBurst** 1 (needs Lightning Overload).
- **Enhancement**: earthsGrasp 2 (moved from Elemental), thunderingStrikes 5 (all crit), ancestralKnowledge 5 (Int), guardianTotems 2, **mentalDexterity** 3, improvedGhostWolf 2, improvedLightningShield 3, elementalWeapons 3, **shamanisticFocus** 1, anticipation 3 (doubled), toughness 5 (Stamina), flurry 5 (25% max; needs Mental Dexterity), stormstrike 1, *spiritWeapons* 1 (was Parry), **mentalQuickness** 2, **improvedStormstrike** 2 (needs Stormstrike), **maelstromWeapon** 5, **rageOfTheFarseer** 1 (needs Mental Quickness).
- **Restoration**: improvedHealingWave 5, totemicFocus 5, **mindfulness** 3, *naturalGrace* 3 (was Healing Grace; spell threat), tidalFocus 5 (+hit), improvedReincarnation 2 (+health), ancestralHealing 3, healingFocus 3, **waterShield** 1, tidalMastery 5, restorativeTotems 5, manaTideTotem 1 (now 16 points), healingWay 3, naturesSwiftness 1, purification 5, **riptide** 1 (needs Healing Way).

Removed: Elemental Mastery, Shield Specialization, Enhancing Totems, Two-Handed Axes and Maces, Weapon Mastery, Improved Weapon Totems (the last four are baseline per Blizzard), Nature's Guidance and Totemic Mastery.

| Talent | Per rank | At max | Rotation effect |
|---|---|---|---|
| Convection | -2% cost | -10% | LB 198, CL 437, shocks 369-405 (203 Earth Shock with Shamanistic Focus too), LvB 239 |
| Reverberation | -0.2 s | -1 s | shocks every 5 s |
| Elemental Alacrity | 0.17/0.33/0.5 s | -0.5 s | LB 2.0 s, CL 1.5 s, LvB 2.0 s |
| Lightning Overload | 3/7/10% | 10% | free half-damage copy |
| Elemental Fury | +20% crit bonus | +100% | spell crit 2.0x |
| Improved Fire Nova | +10% / -2 s | +20% / -4 s | Fire Nova every 6 s |
| Elemental Devastation | 3% melee crit | 9% | after a spell crit, 10 s |
| Thundering Strikes | 1% crit | 5% | all attacks and spells |
| Mental Dexterity / Quickness | 33/67/100% / 15/30% of Int | 100% / 30% | AP / spell damage |
| Elemental Weapons | WF +13/27/40% AP | 40% | Windfury attacks with 466 AP |
| Flurry | 5% speed | 25% | 3 swings after a crit |
| Maelstrom Weapon | 4% per stack | 20% per stack | 5 stacks = instant free LB |
| Improved Stormstrike | 50% chance | 100% | 50% casting regen 15 s; reset on dodge/parry |
| Mindfulness | 17/33/50% | 50% | regen while casting |
| Tidal Focus | 1% hit | 5% | melee and spell hit |

## Builds

| Build | Split | Talent string (gs order) | Sim result |
|---|---|---|---|
| **gs Elemental** (UI default, ranked) | 31/7/13 | `5502301300123051-052-05305` | Orc 495, Tauren 490, Troll 491, Windshaper 490, Dwarf 491 DPS; ~42 s mana-limited |
| **gs Stormcaller** (caster hybrid) | 29/22/0 (preset label still says 28/23/0) | `550133130010304-055030021004002` | Orc 457, Tauren 461, Troll 453, Windshaper 453, Dwarf 455; ~65 s mana-limited |
| **gs Enhancement** (UI default, ranked) | 20/31/0 | `550133102-053030031005102251` | Orc 813, Tauren 808, Troll 812, Windshaper 810, Dwarf 817 |
| gs and fs "Level 60" Enhancement | 19/32/0 | `5505301-053030031005112251` | - |
| fs Elemental | 31/6/14 | `2505301300123051-0500001-053050001` | fs tests are naked (not meaningful) |
| fs "Level 60" Elemental | 32/0/19 | `5505301300103051--503352001` | - |
| fs Stormcaller | 28/23/0 | `150533130010303-055030030004102` | - |
| fs Enhancement | 16/35/0 | `2502331-055030030205112251` | - |
| mythicsim Enhancement / Elemental | 18/33/0 / 31/7/13 | no strings published | 691 / 451 DPS (2-min fight, empty trinket slots) |
| Off-tank (ours, experimental) | 17/34/0 | `0535031-050230031355112201` | - |

gs results are 300 s with raid buffs and modeled ilvl-65 gear (`docs/modelled_build_reviews.md`). All 9 strings decode cleanly on gs's tree (row and prerequisite checks pass). Contents:
- **Elemental 31/7/13**: Convection 5, Concussion 5, Reverberation 2, Call of Flame 3, Elemental Focus, Elemental Alacrity 3, Call of Thunder, Elemental Reach 2, Lightning Overload 3, Elemental Fury 5, Lava Burst / Thundering Strikes 5, Ancestral Knowledge 2 / Totemic Focus 5, Mindfulness 3, Tidal Focus 5.
- **Stormcaller 29/22/0**: Convection 5, Concussion 5, Reverberation 1, Call of Flame 3, Elemental Devastation 3, Elemental Focus, Elemental Alacrity 3, Call of Thunder, Lightning Overload 3, Elemental Fury 4 / Thundering Strikes 5, Ancestral Knowledge 5, Mental Dexterity 3, Elemental Weapons 2, Shamanistic Focus, Flurry 4, Mental Quickness 2. No Lava Burst: Int is turned into spell damage instead.
- **Enhancement 20/31/0**: Convection 5, Concussion 5, Reverberation 1, Call of Flame 3, Elemental Devastation 3, Elemental Focus, Improved Fire Nova 2 / Thundering Strikes 5, Ancestral Knowledge 3, Mental Dexterity 3, Elemental Weapons 3, Shamanistic Focus, Flurry 5, Stormstrike, Mental Quickness 2, Improved Stormstrike 2, Maelstrom Weapon 5, Rage of the Farseer.
- **Level 60 19/32/0** trades Elemental Devastation and Improved Fire Nova for Reverberation 5 and Spirit Weapons. **fs Enhancement 16/35/0** adds Ancestral Knowledge 5, Anticipation 2 and Spirit Weapons. **fs Elemental 31/6/14** takes Water Shield and Improved Lightning Shield.

## Suggested ability (priority lists)

**gs Elemental** (`default.apl.json`): LB r10 at -2 s; Searing Totem r6 if not active (single target; Magma at 2+ targets); cooldowns; Flame Shock if not ticking; **Lava Burst r3**; Chain Lightning on Clearcasting (or 2+ targets); LB r10 while mana >= 35 x remaining seconds; LB r10. **fs Elemental**: the same, plus CL also at mana >= 100 x remaining seconds, and LB **rank 4** (915) as the low-mana filler. **Stormcaller**: the same minus Lava Burst, with a 10 x remaining-seconds mana gate.

**gs Enhancement** (`default.apl.json`): Strength of Earth r4 at -4.5 s, Windfury Totem at -3 s, Searing at -1.5 s; re-drop the earth and air totems when expired; cooldowns (Rage of the Farseer, Blood Fury); Searing if the fire totem expired (>= 5 s left); **Fire Nova on Clearcasting**; **Stormstrike**; **LB at 5 Maelstrom stacks**; Flame Shock if not ticking (>= 10 s left); **Earth Shock**; Fire Nova at mana >= 20%. **fs Enhancement**: Strength of Earth r5 and **Grace of Air**; Stormstrike; LB at 5 stacks; Searing (>= 20 s left); Earth Shock. No Flame Shock or Fire Nova.

**Practice-yard hints** (no fight-length checks, since the dummy never dies):
- **Elemental**: drop Searing Totem (and Mana Spring if the raid has none), Flame Shock, then Lava Burst whenever it is ready **and** Flame Shock is ticking (renew Flame Shock as soon as it drops). Chain Lightning only on Clearcasting (free). Lightning Bolt fills everything else (2.0 s). Re-drop Searing every 55 s; it costs only a 1.0 s GCD. While moving, use instants: Flame Shock if it is down, otherwise Earth Shock (it shares the shock cooldown). Potion or rune under ~35% mana. Under ~15% mana, use LB rank 4 or 5 as a cheap filler (fs uses rank 4).
- **Enhancement**: Windfury Weapon on the main hand. On a solo dummy drop **Grace of Air**, not Windfury Totem (your own Windfury Weapon disables the totem for you), plus Strength of Earth r5 and Searing. Rage of the Farseer and Blood Fury on cooldown. Fire Nova whenever Clearcasting is up, otherwise at mana >= 20% (Searing must be alive). Stormstrike on cooldown, then spend its 12 s charge on Earth Shock or a 5-stack Lightning Bolt. At 5 Maelstrom stacks cast Lightning Bolt at once (instant, free, keeps the swing). Flame Shock when not ticking, Earth Shock on the shock cooldown. Never hardcast Lightning Bolt below 5 stacks: it restarts the swing.
- **Stormcaller**: Searing, Flame Shock, Chain Lightning on Clearcasting, Lightning Bolt spam. Mana runs out first; the hint is the same as Elemental without Lava Burst.

## Default stats

There is no confirmed level-60 Forever gear. gs's UI default gear is **real items**. Elemental and Stormcaller: Blue Dragonscale Helm, Chains of the Lich, Mantle of the Timbermaw, Hide of the Wild, Bloodvine Vest, Runecloth Cuffs, Gloves of the Greatfather, Belt of the Archmage, Ironfeather Leggings, Bloodvine Boots, Blackstone Ring, Electrocutioner Lagnut, Frozen and Molten Heart of the Mountain, **Persuader 89-167 @ 2.8** (one-hand mace), **Evergreen Shield** (2,468 armor, 44 block value) and Totem of Thunder. Items total Int 114, spell power 179 + damage-only 49 (Nature +10), hit 6.9%, crit 5%, Sta 44. Enhancement: Bloodvine Goggles, Ghostshard Talisman, Black Dragonscale Shoulders, Chromatic Cloak, Timbermaw Tunic, Primal Batskin Bracers, Chromatic Gauntlets, Might of the Timbermaw, Warbear Woolies, Scalegut Treaders, Blackstone Ring, Ironspine's Eye, Hearts of the Mountain and **Forest Defender's Axe 162-244 @ 3.3** (two-hand axe). Items total Str 104, Agi 81, AP 156, spell power 28, hit 4.9%, crit 4%, MP5 9. Default race Orc for both. The ranked builds use modeled ilvl-65 mail: Int/spell power/crit/hit for Elemental, and Str/Int/crit/hit with a spell two-hander **187-281 @ 3.8** for Enhancement.

| Preset (our derived unbuffed sheet) | AP | Melee crit (vs boss) | Hit | Spell dmg (Nature) | Spell crit | Int / Spi | Mana | Health |
|---|---|---|---|---|---|---|---|---|
| UI Elemental 31/7/13, Orc | 296 | 14.3% (9.5%) | 11.9% (spell miss 5.1%) | 228 (238) | 15.8% (+3% LB/CL), 2.0x | 209 / 110 | 4,376 | 2,510 |
| UI Stormcaller 29/22/0, Orc | 517 | 14.3% | 6.9% (miss 10.1%) | 294 (304) | 16.0% (+3%), 1.9x | 221 / 110 | 4,556 | 2,510 |
| UI Enhancement 20/31/0, Orc | 732 | 17.5% (12.7%), +1% with the axe | 4.9% | 56 | 12.9%, 1.5x | 92 / 103 | 2,623 | 2,960 |
| Ranked Elemental, Orc (items only) | 276 | 19.6% | 15.4% (miss 1.6%) | 356 | 22.9% (+3%) | 312 / 103 | 5,920 | 4,280 |
| Ranked Enhancement, Dwarf (items only) | 890 | 21.7% (16.9%) | 16.7% | 166 | 23.6% | 272 / 99 | 5,326 | 4,460 |

Regen: Elemental 20 mana/s outside the five-second rule, 10/s while casting (Mindfulness 3/3); Enhancement 19/s outside, 0 while casting (9.6/s for 15 s after an Improved Stormstrike proc), plus MP5 9. The UI Elemental sheet has 3,372 armor and a 48 block value. In combat add Strength of Earth +106 AP (Enhancement) and Blood Fury +10% AP and spell power.

**Suggested round demo sheets:** **Elemental** spell damage 350 (Nature +10), spell crit 20% (+3% LB/CL), hit 12%, mana 5,500, Int 300, Spi 110, 2.0x crits. **Enhancement** AP 900 (with own Strength of Earth), melee crit 20%, hit 9% (melee capped; spells still miss), spell damage 120, spell crit 18%, mana 4,000, two-hand axe 180-270 @ 3.6.

## Worked examples

Enhancement: UI Orc sheet + own Strength of Earth = **AP 838**, axe 162-244 @ 3.3, spell damage 56, armor x0.5958, gs Weapon Mastery x1.10 (toggle). Elemental: UI Orc sheet, Nature spell damage 238 (Fire 228), 18.8% LB crit, 94.9% hit, x0.94 average resist.
- **White swing**: 203 + 838/14 x 3.3 = 400.5 -> x1.10 = 440.6 -> **263** after armor (239 without Weapon Mastery); glancing 171, crit 525.
- **Windfury proc**: two attacks at AP 838 + 466 = 1,304: 510.4 each -> **335** after armor (crit 669), about 669 per proc. At 20% per landed hit with a 3.3 s weapon, about one proc every 5-6 swings. gs: special-table hits (no glancing); fs: white swings (can glance).
- **Stormstrike**: 400.5 -> **263** (crit 525). For a 3.3 two-hander, normalized and unnormalized damage are the same; with a 3.8 two-hander, normalized is lower.
- **Earth Shock** (Enhancement): (301 + 0.386 x 56) x 1.05 = **339**; with the Stormstrike charge **407**; crit 1.5x 508 (610). Elemental: (301 + 0.386 x 238) x 1.05 = **413**, crit 2.0x 825.
- **Fire Nova** (Enhancement): (420 + 0.214 x 56) x 1.15 x 1.2 = **596** (560 after average resists), crit 894, 520 mana every 6 s.
- **5-stack Lightning Bolt** (Enhancement): (201 + 0.714 x 56) x 1.05 = **253**, 304 with Stormstrike, crit 380; instant and free.
- **Lightning Bolt** (Elemental): (201 + 0.714 x 238) x 1.05 = **390** (366 after resists), crit 779. Overload copy 195. Expected per cast with crit, miss, resists and overload: **~434** per 2.0 s cast and 198 mana: 217 DPS from LB spam alone.
- **Chain Lightning** (Elemental): (126.5 + 0.571 x 238) x 1.05 = **276**, then 193 and 135; 1.5 s cast, 437 mana or free on Clearcasting.
- **Lava Burst** (Elemental, Fire 228): (220 + 0.714 x 228) x 1.15 = 440; x1.2 with Flame Shock = **528**, crit 1,057; 2.0 s cast, 239 mana.
- **Flame Shock** (Elemental): 247 direct + 4 x 77 = **554** over 12 s, ticks crit for 154. Searing Totem: 58.5 per attack, 23-27 DPS.
- **Flametongue** (2H @ 3.3): (28.1 x 3.3 + 0.1 x 56) x 1.15 = **113** per landed hit (only if Flametongue is the imbue).
- **Clearcasting**: 10% per damage cast. On Elemental LB spam it saves ~10% of LB mana (5,940 -> 5,346/min); the gs APL spends it on Chain Lightning (saves 437). On Enhancement it pays for a 520-mana Fire Nova.

**Mana per minute** (gs ranked, 300 s logs / 5): **Elemental** spends LB 3,327, Flame Shock 1,247, Lava Burst 825, Searing 153 = **5,552**; income: casting regen 1,381, potion 1,047, JoW 831, rune 721, idle regen 195 = 4,177 (**-1,375/min**). **Enhancement** spends Fire Nova 2,964, Earth Shock 1,075, Stormstrike 947, Flame Shock 661, totems 394 = **6,041**; income: JoW 1,866, regen 1,491, potion 892, rune 719 = 4,968. **Stormcaller** spends 4,521 against 3,404. On a solo dummy without raid JoW and consumables, the Elemental sheet (4,376 mana, 10/s regen) lasts about 1 min.

## Engine gaps (what the shaman needs beyond the current engine)

1. **Totems as placed objects**: four element slots, one totem each; placing replaces the slot; a position (buffs reach 30 yd, Searing attacks 20 yd, Magma 8 yd, Fire Nova 10 yd around the Fire totem); durations (5 min, 55 s, 20 s, 12 s); a 1.0 s unhasted GCD; a totem bar with timers; Totemic Recall (25% refund) and Call of the Elements (3 s cast, four totems, summed cost).
2. **Totem pulses with their own clocks**: Searing attacks every 2.2-2.5 s (a projectile), Magma every 2 s, Mana Spring 10 mana every 2 s, Mana Tide 290 every 3 s. Totem damage does not trigger the shaman's procs (Clearcasting, Elemental Devastation) but does get Call of Flame and Elemental Fury.
3. **Exclusive buff categories**: an air slot where Windfury Totem and Grace of Air exclude each other, even across shamans; Flametongue Totem excludes Windfury Totem; your Windfury or Flametongue Weapon disables the matching totem for you only.
4. **Weapon imbues** as per-weapon enchants with their own proc rules: Windfury (20%, 1.5 s ICD, two extra attacks with +333/466 AP; a white-or-special toggle), Flametongue (every hit, speed-scaled spell proc), Frostbrand (8 PPM), Rockbiter (flat AP plus threat).
5. **Shared shock cooldown**: three shocks on one 6 s timer, cut by Reverberation.
6. **Elemental shields**: one active at a time, 3 charges, a 3.5 s ICD, triggered by being hit (needs the attacking dummy); orb damage back to the attacker; mana per globe.
7. **Stormstrike charge**: a one-charge target aura that only your LB, CL and ES consume, +20%, 12 s.
8. **Maelstrom Weapon**: a PPM stack aura (2 PPM per point) that scales LB cast time and cost by stacks, consumed by LB.
9. **Cast-to-swing coupling**: hardcast LB, CL and LvB pause melee and restart a full swing at cast end; instant casts keep the swing.
10. **Lightning Overload**: a chance for a free, no-threat copy with its own damage row and travel time.
11. **Clearcasting and Elemental Devastation rules**: cast-complete triggers, no self-consume, direct spell crits only.
12. **Per-family crit multipliers**: Elemental Fury makes shaman Fire/Frost/Nature spells and fire totems crit 2.0x.
13. **Conditional cast requirements**: Fire Nova needs a live Fire totem; Lava Burst's bonus needs **your** Flame Shock on the target.
14. **Spell partial resists** (average 6% vs +3) and binary Earth Shock; melee/spell hit pools from the same gear hit.
15. **Party regen pulses as direct mana** (Mana Spring, Mana Tide), Water Shield mana on being hit, and a raid Judgement of Wisdom toggle.
16. **Toggles**: Weapon Mastery baseline (on/off), Windfury extra attacks (yellow/white), Searing interval (2.2/2.5 s), Water Shield cooldown (none/15 s).

## What changed from Classic 1.12

- Lightning Bolt r10 190-212 (was 428-477), 2.5 s (3), 220 mana (265), 0.714 (0.857); ranks 3-4 raised so every rank is an upgrade. Chain Lightning 119-134 (505-564), 2 s (2.5), 485 mana (605), 0.571 (0.714).
- Earth Shock 293-309 (517-545), Flame Shock 166 + 176 (292 + 320), Frost Shock 278-295 (492-520); Lightning Shield orbs 178 (198).
- New: Lava Burst (Elemental 31), Lightning Overload, Earthbound, Maelstrom Weapon, Rage of the Farseer, Mental Dexterity, Mental Quickness, Improved Stormstrike, Shamanistic Focus (flat -45%), Mindfulness, Water Shield, Riptide, Totemic Recall, Totemic Projection, the Call spells.
- Removed: Elemental Mastery, Fire Nova Totem (now the Fire Nova spell), Tranquil Air Totem, Shield Specialization, Nature's Guidance.
- Stormstrike: 8 s (20), 125 mana, personal +20% to the next LB/CL/ES (was +20% Nature damage for two hits from anyone).
- Totems: 1.0 s GCD, 5-min buff totems, Windfury Totem a party buff (246 AP, 1 extra attack), Grace of Air 89, Strength of Earth 53, Searing 0.017 coefficient, Magma 73; resistance totems raid-wide.
- Imbues last 60 min and stack with stones and oils; Windfury Weapon 20% with a 1.5 s ICD.
- Flurry max 25% (was 30%); Toughness and Ancestral Knowledge are now percentages; Anticipation doubled; Thundering Strikes covers spells; Tidal Focus gives hit; Elemental Devastation moved to row 2; Call of Thunder is the 16-point talent; Mana Tide moved to 16 points.
- Dwarf and Windshaper shamans; Alliance shamans exist.

## Provisional values (use them, but expect changes)

- Maelstrom Weapon proc rate (2 PPM per point in both sims); Windfury Weapon extra attacks as special or white hits; Windfury Totem ICD (1.5 s vs 0.1 s).
- Weapon Mastery baseline +10%; Stormstrike normalized or not; Searing interval 2.2 vs 2.5 s; Fire Nova 397-443 (sims) vs 413-459 (Wowhead).
- Elemental Fury scope (gs: spells and totems; fs: also Flametongue, Frostbrand, Lightning Shield); Frostbrand 8 vs 9 PPM; Flametongue speed clamp.
- Partial resists (6% average), Earth Shock binary, Spirit regen 6.25 + Spi/8, raid Judgement of Wisdom 50% per hit.
- Flametongue Totem damage formula (SHA-006); totem threat ownership (SHA-005); all default gear, priority lists and DPS; the off-tank proposal.

## Open questions

1. What is Maelstrom Weapon's real proc rate, and do Windfury attacks and two-handers raise it (SoD-style +50% each)?
2. Is Weapon Mastery baseline (Blizzard article) or not (#280 reply, character sheet)?
3. Are Windfury Weapon's extra attacks white swings (glancing, Flurry charges) or yellow hits?
4. Is Stormstrike normalized (client effect) or "normal weapon damage" (tooltip, both sims)?
5. Will Water Shield's 15 s cooldown leave the client rows, as Blizzard says it should?
6. Fire Nova base damage at 60 (397-443 or 413-459), and does it really need a Fire totem in range of the target?
7. Does Elemental Fury reach Flametongue, Frostbrand and Lightning Shield (fs) or not (gs)?
8. Windfury Totem's internal cooldown (1.5 s or 0.1 s) and whether it can proc from special attacks.
9. Searing Totem's real attack interval, and whether totem attacks can be partially resisted.
10. Spell crit suppression and partial resists against level-63 bosses (not measured).
11. Will Blizzard add a tank shaman (Spirit Weapons is the only hook), or more Enhancement spell-crit damage (promised on 24 Sep)?
