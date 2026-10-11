# Mage data sheet for WoW Forever (level 60 vs a level 63 dummy)

Research date: 11 Oct 2026. The machine-readable version is `mage_forever.json` in this folder. Every number there has a source link and a confidence label. It covers Arcane, Fire and Frost, the hybrids the sims and guides run (Arcane-Frost, Fire/Frost, the experimental Frostfire build) and the new baseline Frostfire Bolt. Healing does not apply, and no source shows a tank or off-role mage build.

## The five things that matter most

1. **Arcane Blast is the new core of Arcane.** It is the Arcane 11-point talent: a 2.5 s cast for 364-424 Arcane at 0.714, costing 15% of base mana (182) **+175% per stack**. Each cast adds a stack (max 4, 8 s) that gives **+10% damage to your *other* spells**. The next other damage spell spends every stack. The gs loop is Arcane Blast x3 (182 + 500 + 819 mana), then Frostbolt at +30%. **Missile Barrage** (16-point talent) procs 40% of the time from Arcane Blast and 20% from Fireball, Frostbolt and Frostfire Bolt (gs rolls on the landed hit, fs on cast completion). It makes the next Arcane Missiles free and twice as fast (5 missiles in 2.5 s). Clearcasting is 2% per point with a 1 s internal cooldown. The sims disagree on whether Missiles benefit from the stacks: gs says yes, while the client mask and fs say no.
2. **Fire plays around Heating Up.** Heating Up is the 1 Oct name of Hot Streak. Each non-periodic crit of Fireball, Frostfire Bolt, Fire Blast or Scorch takes 25% off the next Pyroblast. Three stacks make it a **1.5 s Pyroblast** (520-646 + 212 over 12 s, coefficient 1.0 + 0.60), the strongest cast Fire has. The stacks last 20 s, and that Pyroblast spends all of them. gs therefore fills with **Scorch**, which crits often and fast, plus Fire Blast on cooldown; fs fills with Fireball. **Ignite** is 40% of the crit over 4 s in two ticks, one per mage. It rolls over, so no damage is lost, never crits, and no longer double dips. **Improved Scorch is personal**: +3% of *your* Fire damage per stack, 5 stacks, 30 s. Combustion ends after **3** crits.
3. **Frost is Frostbolt plus Fingers of Frost.** Bosses cannot be frozen. Each landed Chill (Frostbolt, Cone of Cold, Frostfire Bolt, Improved Blizzard) has a 15% chance to give **2 charges** that treat the boss as Frozen: Shatter +50% crit and **Ice Lance x4**. Ice Lance's spell-power coefficient is unknown (gs 0.10, fs 0.143; the client has none). **Winter's Chill is personal**: +2% crit per stack, only for your Frostbolt and Ice Lance, one stack per talent point (5), 15 s. Ice Shards makes Frost and Frostfire crits 2.0x. Arcane Mind 5/5 now makes Arcane crits 2.0x too.
4. **Spell table and numbers.** Against +3: 17% miss, hit cap +16%. Gear hit and crit count for spells and melee alike. Arcane Focus and Elemental Precision now give hit (1% per point). Frostbolt, Ice Lance, Cone of Cold, Frost Nova and Blast Wave are binary; everything else loses ~6% to partial resists. Neither sim applies spell crit suppression. DoT ticks can crit, and DoTs are dynamic (no snapshot). Spells are weaker than Classic: Fireball 12 is 425-541 + 60, Frostbolt 11 457-493, Scorch 166-197. New baseline **Frostfire Bolt** (level 40): 3 s, 270-314 + 57, counts as both Fire and Frost. gs ranks Arcane 33/3/15, Fire 18/31/2 and Arcane-Frost 28/0/23 at **~725-742 DPS** and Frost 11/3/37 at ~680-690. MythicSim ranks Arcane 673, Frostfire (experimental) 652, Fire 643 and Frost 622.
5. **Mana and engine work.** Ranked profiles spend 5,000-7,700 mana per minute and last only with raid Judgement of Wisdom, potions, runes and gems. Mage Armor (50%) and Arcane Meditation (50%) **add up to 100% Spirit regen while casting**. Evocation multiplies Spirit regen by 16 for 8 s, every 8 min. **The practice yard needs:** channels whose ticks are separate projectiles, each with its own hit and crit roll; personal stacking target debuffs; Ignite's rolling payload; self-buff stacks that change other spells; Cold Snap resets; and a "raid Judgement of Wisdom" toggle.

## Sources

| Id | Source | Version read |
|---|---|---|
| gs | [gunba/wow-forever-sim](https://github.com/gunba/wow-forever-sim) (MIT) | commit `9c05fc8`, 9 Oct 2026: `sim/mage`, `sim/core`, `proto/mage.proto`, `ui/core/talents/trees/mage.json`, `ui/mage` (presets, APLs, gear), `docs/` (beta-pass, build reviews, uncertainties MAG-001..008). Client tables 1.60.1.70291 |
| fs | [laurencestokes/foreversim](https://github.com/laurencestokes/foreversim) (MIT) | commit `255df16`, 1 Oct 2026; same tree order as gs, so its strings decode. Tests run naked, so its DPS is not meaningful |
| client | Beta client rows in fs `sim/core/spelldata/spells_auto_gen.go` | build 1.60.1.70124 (114 mage rows read) |
| wowhead | Wowhead Forever tooltips (`nether.wowhead.com/forever/tooltip/spell/<id>`) | 104 spell ids read 11 Oct, with icon names. Damage is printed at the rank's top scaling level (Frostbolt 11: 470-506 at 64) |
| blizzard | [Development notes](https://us.forums.blizzard.com/en/wow/t/2360696): post 1 (24 Sep, edited 8 Oct), post 4 (1 Oct), post 5 (8 Oct, the latest); [Mage and Shaman deep dive](https://worldofwarcraft.blizzard.com/en-us/news/24302097) (7 Oct); [Rogue and Warlock deep dive](https://worldofwarcraft.blizzard.com/en-us/news/24310968) (Curse of the Elements); [known issues](https://us.forums.blizzard.com/en/wow/t/2352687) | no posts after 8 Oct; the "Class Highlights Part 2" video was not watched |
| bugs | [forever-bugs](https://github.com/ClassicWoWCommunity/forever-bugs) #21, #54, #57, #60, #81, #92, #137, #187, #188, #258, #284, #297 | replies by "AidanZMoon" read like a developer but are not flagged as Blizzard |
| mythicsim | [mythicsim.com tier list](https://mythicsim.com/wow-forever/tier-list) (**secondary**) | robots.txt allows `*` and the Claude-User/ClaudeBot/Claude-SearchBot agents (only `/sims/`, `/history`, `/developer`, `/login`, `/api/` blocked); ai.txt is 404. Snapshot 10 Oct, client 1.60.1.70334, 120 s, reference gear without trinkets |
| secondary | [classicwow.gg](https://classicwow.gg/forever/guides/mage) (8 Oct, mechanics only), [wow.gg](https://wow.gg/guides/mage-arcane-forever-overview) overviews (19 Sep, example builds), [Kami Labs](https://kami-labs.fr/en/wow-forever/mage-wow-forever-sorts-et-talents-modifies/) (14 and 26 Sep), conquestcapped (4 Oct) | Icy Veins returned 403 (snippets only). **miao.tips not read** (AI opt-out) |

## Confidence labels

- **confirmed-forever**: Forever client data, a Wowhead Forever tooltip, Blizzard, or an in-game beta measurement (mostly levels 10-30).
- **sim-provisional**: a choice made by one or both sims with no Forever source, or where sources disagree.
- **classic-fallback**: Forever says nothing, so the Classic 1.12 value is kept.

## Core rules

| Rule | Value | Confidence |
|---|---|---|
| Spell table vs +3 | 17% base miss (4/5/6/17% vs +0..+3), 1% always misses: **hit cap +16%**. Gear hit is shared with melee (10 rating = 1%). Talent hit: Arcane Focus +1%/point (Arcane), Elemental Precision +1%/point (Fire, Frost); Manaflare 2-piece +1% | classic-fallback / confirmed |
| Resists | **Binary** (hit or miss only): Frostbolt, Ice Lance, Cone of Cold, Frost Nova, Blast Wave. Others roll 0/25/50/75% partials, **6% average vs +3** (gs). Frostfire Bolt checks the lower of Fire and Frost resistance | classic-fallback |
| Spell crit | 0.2% base + Int x 0.0168% (59.5 Int = 1%); gear crit 14 rating = 1%, shared with melee. **No crit suppression** in either sim (gs computes 2.1% but leaves it commented out) | classic-fallback / provisional |
| Crit damage | 1.5x. **Ice Shards 5/5: Frost and Frostfire 2.0x. Arcane Mind 5/5: Arcane 2.0x** (new). Fire stays 1.5x. Blizzard's example: Frostfire with Ignite + Ice Shards = 200% + 40% Ignite = 280% | confirmed |
| DoTs | Fireball, Pyroblast and Frostfire DoT ticks can crit (1.5x) and read current stats (no snapshot, bug #137 reply). Ignite never crits | confirmed |
| GCD | 1.5 s, hasted by cast speed to a 1.0 s floor (gs CORE-004). **Off the GCD:** Presence of Mind, Arcane Power, Combustion, Cold Snap, Counterspell, mana gem, potions, racials | confirmed (haste rule provisional) |
| Moving | No cast-time spell or channel while moving; moving cancels a channel. Instants on the move: Fire Blast, Ice Lance, Arcane Explosion, Cone of Cold, Frost Nova, Blast Wave, a Presence of Mind cast | confirmed |
| Pushback | Classic: 1.0 s, then 0.2 s less per hit; channels lose time. Burning Soul 70% (Fire), Improved Channeling 100% (Missiles) / 70% (Arcane Blast), Ice Barrier stops it. Beta bugs: #188 no pushback from spells; #21 Missiles fire the lost missiles at the end | classic-fallback |
| Haste | Troll Berserking +10% cast speed for 10 s (3 min) but **not** channels (log: ~1 s missile spacing either way); Skyborne +1%; no haste gear | confirmed |
| Arcane Missiles | 5 missiles, the first at 1 s, then one per second; **each missile is a projectile (20 yd/s) with its own hit and crit roll**. Missile Barrage: every 0.5 s (2.5 s channel), free. Line of sight is checked once (24 Sep). Casting again or moving cancels the rest. Beta bug #258: Barrage is consumed at channel end (fix 15 Oct) | confirmed |
| Blizzard | 8 ticks, 1 per second; an area trigger casting a damage spell each tick. gs rolls Arcane Concentration once per target on the cast | confirmed |
| Evocation | 8 s channel, 8 min: Spirit regen x16 (+1500%), fully active while channelling; MP5 unchanged | confirmed |
| Mana pool | 933 + 15 x Int (base 1213); Gnome x1.05. Health 1190 + 10 x Sta | classic-fallback |
| Regen | Spirit: **6.25 + Spi/8 per s** in 2 s ticks, outside the five-second rule (gs CORE-016). While casting: **Mage Armor 50% + Arcane Meditation 17/33/50%, additive** (both 3/3 = 100%). MP5/5 per s (bug #54: gear MP5 pays every second while casting) | confirmed / provisional |
| Mana items | Mana Ruby 1000-1200, then Citrine 775-925 / Jade 550-650 / Agate 375-425, all on one 2 min timer in both sims (the spell row and Wowhead say 1 min); Major Mana Potion 1350-2250; Demonic Rune 900-1500 | provisional |
| Threat | 1.0x; Arcane Subtlety -30% Arcane, Burning Soul -30% Fire, Frost Channeling -30% Frost; Counterspell high threat | confirmed |
| Downranking | Spells far below your level get less spell damage and fewer talent procs: rank-1 Frostbolt at 60 has a **0%** Frostbite chance (1 Oct). The curve is unpublished | confirmed |
| Top ranks | Frostbolt 11, Fireball 12 and Missiles 8 are Ahn'Qiraj tome ranks in Classic; both sims use them. Fallbacks: Frostbolt 10 (383-412, 260 mana), Fireball 11 (397-505 + 56, 395), Missiles 7 (175 per missile, 595) | provisional |
| Races | Orc, Troll, Undead, Human, Gnome, High Order. Berserking (above); Orc Blood Fury +10% spell power 15 s / 2 min; Gnome Eureka! (next 3 damaging spells -10% cost, +10% damage, not periodic) and +5% mana; Undead Touch of the Grave (10% per cast, 5% max health drain, ~20 DPS); Human +5% Spirit; Skyborne +1% haste | confirmed |

## Abilities (max rank at 60)

Costs, cast times, cooldowns and ranges are **confirmed-forever** (client rows and Wowhead). Damage is the level-60 value from the client rows.

| Ability | Id | Icon | Mana | Cast / CD | Effect at 60 (coefficient) | Notes |
|---|---|---|---|---|---|---|
| Frostbolt r11 | 25304 | spell_frost_frostbolt02 | 290 | 3.0 s (2.5 talented) | 457-493 Frost (0.814), 40% slow 9 s | Binary, 28 yd/s. Classic 515-555 |
| Fireball r12 | 25306 | spell_fire_flamebolt | 410 | 3.5 s (3.0 talented) | 425-541 (1.0) + 60 over 8 s (4 x 15, no SP) | 24 yd/s. Classic 596-760 + 76 |
| Scorch r7 | 10207 | spell_fire_soulburn | 150 | 1.5 s | 166-197 (0.429) | No projectile. Classic 237-280 |
| Fire Blast r7 | 10199 | spell_fire_fireball | 340 | instant / 8 s (6 with Wake of Fire) | 417-489 (0.429) | 20 yd |
| Pyroblast r8 (talent) | 18809 | spell_fire_fireball02 | 440 | 6 s (4.5/3.0/1.5 with Heating Up) | 520-646 (1.0) + 212 over 12 s (4 x 53, 0.15/tick) | 35 yd, 24 yd/s |
| Arcane Missiles r8 | 25345 | spell_nature_starfall | 655 (0 with Barrage) | 5 s channel (2.5 s) | 5 x 209 Arcane (0.286 each) | Missile 25346. Classic 230 at 0.24 |
| Arcane Blast r5 (talent) | 1239700 | spell_arcane_blast | 182 / 500 / 819 / 1137 / 1456 | 2.5 s | 364-424 Arcane (0.714); stack +10% other spells | 4 stacks, 8 s; gs action id 30451 |
| Arcane Explosion r6 | 10202 | spell_nature_wispsplode | 390 | instant | 238-259 to all within 10 yd (0.143) | AoE |
| Cone of Cold r5 | 10161 | spell_frost_glacier | 555 | instant / 10 s | 328-358 (0.129), 40% slow 6 s | Binary, a Chill; Improved +12/23/35% |
| Frost Nova r4 | 10230 | spell_frost_frostnova | 145 | instant / 25 s | 72-79 (0.029), root 8 s | Bosses immune to the root |
| Ice Lance r6 (talent) | 1240047 | spell_frost_frostblast | 160 | instant | 136-161 Frost, **x4 vs Frozen / Fingers of Frost** | Coefficient: gs 0.10, fs 0.143, client none. Binary, 38 yd/s |
| **Frostfire Bolt r3** (new, 40) | 1237313 | ability_mage_frostfirebolt | 370 | 3.0 s | 270-314 (0.814) + 57 over 9 s (3 x 19, no SP), 40% slow | Fire and Frost: lower resistance, higher spell damage, both schools' talents; Improved Fireball shortens it |
| Blizzard r6 | 10187 | spell_frost_icestorm | 1400 | 8 s channel | 8 x 146 (0.042/tick), 8 yd area | Improved Blizzard chill 15/30/40% |
| Flamestrike r6 | 10216 | spell_fire_selfdestruct | 990 | 3 s | 381-466 (0.157) + 332 over 8 s (0.032/tick) | One per mage |
| Blast Wave r5 (talent) | 13021 | spell_holy_excorcism_02 | 545 | instant / 45 s | 453-533 (0.129), daze 50% 6 s | 10 yd |
| Presence of Mind | 12043 | spell_nature_enchantarmor | 0 | 3 min, off GCD | next cast-time spell (<10 s) instant | Cooldown starts on use |
| Arcane Power | 12042 | spell_nature_lightning | 0 | 3 min, off GCD | +30% damage, +30% mana cost, 15 s | Needs Presence of Mind now |
| Combustion | 11129 | spell_fire_sealoffire | 0 | 3 min after it ends | +10% Fire crit per Fire hit until **3** Fire crits | 4 before 1 Oct |
| Cold Snap | 12472 | spell_frost_wizardmark | 0 | 10 min, off GCD | resets your other Frost cooldowns | 21-point talent |
| Ice Barrier r4 | 13033 | spell_ice_lament | 480 | 30 s | absorbs 819, 1 min, no pushback | Wowhead prints 835 (level 64) |
| Ice Block | 11958 | spell_frost_frost | 15 | 5 min | immune 10 s | 16-point talent |
| Mana Shield r6 | 10193 | spell_shadow_detectlesserinvisibility | 140 | - | 570 physical, 2 mana per point | Arcane Shielding -33% |
| Evocation | 12051 | spell_nature_purge | 0 | 8 s channel / 8 min | regen x16, active while channelling | Moving cancels it |
| Counterspell | 2139 | spell_frost_iceshock | 100 | 30 s, off GCD | 10 s lockout; silence 2/4 s talented | High threat |
| Mage Armor r3 | 22783 | spell_magearmor | 490 | 30 min | +15 resistances, **50%** casting regen | Default armor in both sims |
| Ice Armor r4 | 10220 | spell_frost_frostarmor02 | 500 | 30 min | +560 armor, +15 Frost resist, chills attackers | - |
| Arcane Intellect / Brilliance | 10157 / 23028 | spell_holy_magicalsentry / spell_holy_arcaneintellect | 1510 / 3400 | 1 hour | +31 Int | The mage's raid buff |
| Mana Ruby | 8008 (use 10058) | inv_misc_gem_ruby_01 | conjure 1470, 3 s | 2 min shared (sims) | +1000-1200 mana | - |

**Not in Forever:** Molten Armor, Icy Veins, Dragon's Breath, Arcane Surge, Arcane Barrage, Living Bomb, Water Elemental, and instant Hot Streak Pyroblasts. Available but unused by the sims: Fire/Frost Ward (913 absorb, 320 mana, 30 s), Blink (35% base mana, 15 s), Polymorph. Wands no longer gain spell damage (24 Sep).

## Procs, debuffs and passives

| Name | Value | Notes |
|---|---|---|
| Ignite (Fire 5) | 8%/point of the crit's final damage over 4 s (2 ticks, 2 s apart). A new crit adds the unpaid ticks and restarts the debuff | One per mage, no munching, no crit, ignores % modifiers and Fire Power, does not spend Combustion. Direct crits only. gs rolls partial resists on the ticks; fs does not. Icon spell_fire_incinerate |
| Fire Vulnerability (Improved Scorch 3) | 33/66/100% per landed Scorch: **+3% of your own Fire damage** per stack, 5 stacks, 30 s | **Personal** (Classic: raid debuff). No second resist roll (1 Oct). spell_fire_soulburn |
| Winter's Chill (Frost 5) | 20%/point per landed Frost spell: **+2% crit for your Frostbolt and Ice Lance**, 1 stack per point, 15 s | **Personal**. Wowhead's talent tooltip prints "0%". spell_frost_chillingblast |
| Clearcasting (Arcane Concentration 5) | 2%/point per landed damage spell, **1 s ICD**; next damage spell free, 15 s | gs: missiles can proc it, the Missiles cast cannot; the client marks missiles NOT_A_PROC (MAG-005). spell_shadow_manaburn |
| Missile Barrage (Arcane 16) | Arcane Blast 40%, Fireball/Frostbolt/Frostfire 20% on a landed hit: next Missiles free, every 0.5 s, 15 s | fs rolls on cast completion. ability_mage_missilebarrage |
| Heating Up (Fire row 4) | Each Fireball/Frostfire/Fire Blast/Scorch direct crit: -25% next Pyroblast cast, 3 stacks, 20 s | All stacks spent by that Pyroblast. spell_fire_firebolt |
| Fingers of Frost (Frost 2) + Shatter (3) | 15% per landed Chill: 1/2 charges, 15 s; each damage cast spends one: +17/33/50% crit, Ice Lance x4 | A cast already in progress skips it (MAG-002); bug #297 double use. ability_mage_wintersgrasp |
| Arcane Blast stacks | +10% to other spells and +175% Arcane Blast cost per stack, 4, 8 s | Scope: gs all other spells; client/fs not Missiles, Blizzard or Flamestrike |
| Combustion | +10% Fire crit per Fire hit, ends after 3 crits | Client cap 10 stacks |
| Master of Elements (Fire 3) | Fire/Frost crits refund 10/20/30% of base cost, 9 ms ICD | gs also refunds free casts |
| Arcane Power / Presence of Mind | +30% damage and cost 15 s / next cast instant | - |
| Impact, Frostbite, Wake of Fire | 3/7/10% stun; 5/10/15% freeze; post-kill +50% Fire Blast crit | Never matter on a boss dummy |
| Passive talents | Arcane Instability +1/2/3% damage and crit; Arcane Impact +2/4/6% Arcane crit; Critical Mass +2/4/6% Fire crit; Fire Power +2..10%; Incineration +2/4/6% crit on Fire Blast, Scorch, Ice Lance, Arcane Blast; Piercing Ice +2/4/6% Frost; Frost Channeling -15% Frost cost | % damage talents, Arcane Power and Arcane Blast stacks add; Fire Vulnerability multiplies |
| Manaflare Regalia (Tier 1) | 2: +1% hit; 3: Counterspell -5 s; 4: vs Elementals; 5: Frostfire +10% Barrage/Fingers chance, +10% Frostfire crit in Combustion | gs applies it in rankings |

**Raid list:** none of the mage's debuffs help anyone else now. The mage provides **Arcane Brilliance** (+31 Int). Useful raid entries: **Curse of the Elements** (Forever: +10% damage and -75 resistance for *all* magic schools), the **3% crit aura** (Moonkin or Leader of the Pack, all spells), Divine Spirit (+40 Spi, baseline), Blessing of Wisdom (40 MP5), Mana Spring (25 MP5), Gift of the Wild (+16), and **Judgement of Wisdom** (59 mana, 50% per hit in gs). World buffs do not work in raids.

## Talents

Talent strings use gs's order (`ui/core/talents/trees/mage.json` = `proto/mage.proto` = fs): **Arcane 18, Fire 17, Frost 19**. Each row needs 5 points per row above it, and prerequisites must be maxed. **New in Forever** in bold; renamed in italics. Per-rank values, icons and Forever spell ids are in the JSON, along with `talents.tsSnippet`.

- **Arcane**: wandSpecialization 2, arcaneFocus 5 (hit), *improvedChanneling* 5, arcaneSubtlety 2, magicAbsorption 2, arcaneConcentration 5, arcaneResilience 2, **arcaneGeometry** 2, *arcaneImpact* 3, **arcaneBlast** 1, *arcaneShielding* 2, improvedCounterspell 2, arcaneMeditation 3 (needs Arcane Concentration), **missileBarrage** 1, presenceOfMind 1, arcaneMind 5, arcaneInstability 3, arcanePower 1 (needs Presence of Mind).
- **Fire**: *wakeOfFire* 2, *incineration* 3, improvedFireball 5, ignite 5, flameThrowing 2, impact 3, burningSoul 3, improvedFlamestrike 3, pyroblast 1, improvedScorch 3, improvedFireWard 2, **hotStreak** 1 (Heating Up; needs Pyroblast), masterOfElements 3, criticalMass 3, blastWave 1, firePower 5, combustion 1 (needs Critical Mass).
- **Frost**: frostWarding 2, improvedFrostbolt 5, elementalPrecision 5 (hit), iceShards 5, permafrost 3, improvedFrostNova 2, frostbite 3, piercingIce 3, frostChanneling 3, **iceLance** 1, improvedBlizzard 3, arcticReach 2, iceBlock 1, shatter 3, improvedConeOfCold 3, coldSnap 1, **fingersOfFrost** 2 (needs Ice Lance), wintersChill 5, iceBarrier 1 (needs Cold Snap).

Renamed: Improved Arcane Missiles -> Improved Channeling, Improved Arcane Explosion -> Arcane Impact, Improved Mana Shield -> Arcane Shielding, Improved Fire Blast -> Wake of Fire, Incinerate -> Incineration, Hot Streak -> Heating Up. Removed: Magic Attunement (baseline). Wowhead talent tooltips print raw base points, not the curves: Arcane Focus 2%, Elemental Precision 6%, Arcane Concentration 100%, Shatter 1%, Winter's Chill 0%. gs draws the wrong icon for Arcane Geometry (Forever: inv_ability_mage_radiantspark) and for Wake of Fire (Forever: spell_fire_lavaspawn).

| Talent | Per rank | At max | Rotation effect |
|---|---|---|---|
| Arcane Focus / Elemental Precision | 1% hit | 5% | Arcane / Fire and Frost hit |
| Arcane Concentration | 2% | 10% | Clearcasting, 1 s ICD |
| Arcane Impact / Arcane Instability | 2% crit / 1% damage and crit | 6% / 3% | - |
| Arcane Meditation | 17/33/50% | 50% | casting regen (+50% Mage Armor) |
| Arcane Mind | 2% Int, 20% crit bonus | 10% / 2.0x Arcane crits | - |
| Missile Barrage | 40% AB / 20% others | - | free, double-speed Missiles |
| Wake of Fire | -1 s | -2 s | Fire Blast every 6 s |
| Incineration / Critical Mass | 2% crit | 6% | Scorch and Fire Blast get both (+12%) |
| Improved Fireball / Improved Frostbolt | 0.1 s | 0.5 s | Fireball 3.0 s, Frostfire 2.5 s / Frostbolt 2.5 s |
| Ignite | 8% | 40% | rolling DoT from crits |
| Improved Scorch | 33% | 100% | personal +3%/stack Fire, 5 stacks |
| Heating Up | - | 25%/stack, 3 | 1.5 s Pyroblast |
| Master of Elements | 10% | 30% | base-cost refund on crit |
| Fire Power / Piercing Ice | 2% | 10% / 6% | - |
| Ice Shards | 20% crit bonus | 2.0x Frost crits | - |
| Frost Channeling | 5% cost, 10% threat | 15% / 30% | - |
| Shatter | 17/33/50% | 50% | crit vs Frozen (Fingers of Frost) |
| Fingers of Frost | 15% chance, 1 charge | 2 charges | Ice Lance x4 |
| Winter's Chill | 20% chance, 1 stack | 100%, 5 stacks | +10% Frostbolt/Ice Lance crit |
| Combustion | - | 10% per hit, 3 crits | burst |

## Builds

| Build | Split | Talent string (gs order) | Sim result |
|---|---|---|---|
| **gs Arcane** (ranked) | 33/3/15 | `053005023100311531-03-005500032` | Undead 742, Gnome 735, HO 730, Human 729, Troll 725, Orc 725 DPS |
| **gs Fire** (ranked, Undead) | 18/31/2 | `0501252000003-23450000130133051-002` | Undead 741, Human 739, Gnome 730, Orc 728, Troll 723, HO 714 |
| gs Fire High Order | 17/31/3 | `0501252000002-23450000130133051-003` | (HO allocation) |
| **gs Frost** (ranked, UI default talents) | 11/3/37 | `050005001-03-0555003321001301251` | Gnome 691, Human 686, Undead 683, Orc 682, HO 681, Troll 679 |
| **gs Arcane-Frost** (ranked hybrid) | 28/0/23 | `05020500310031053--05550002010003002` | Undead 740, Human 737, HO 733, Gnome 733, Orc 727, Troll 725 |
| gs/fs Fire 0/35/16 (Fire/Frost) | 0/35/16 | `-03552020130133151-005500033` | - |
| gs/fs Frost DPS P1 | 18/0/31 (49 pts) | `0502050030003--055500033100030024` | - (fs default talents) |
| gs/fs Arcane DPS P1 (Arcane/Fire) | 31/20/0 | `050215003100311531-2305003202003-` | - |
| fs Fire DPS | 19/32/0 | `0502252000003-23550000130133051-` | - |
| fs Frost "14/0/37" | 14/0/35 (49 pts) | `050005013--0555003301001301251` | naked test only |
| fs Arcane 35/0/16 | 35/0/16 | `055005023100311531--005500033` | naked test only |
| MythicSim / Kami Labs Arcane | 35/11/5 | `055205003100311531-230500001-005` | 673 (A, #11); Undead 674 ... HO 661 |
| MythicSim / Kami Labs Fire | 16/31/4 | `05020500300001-13550000130133051-004` | 643 (B, #17) |
| MythicSim / Kami Labs Frost | 16/3/32 | `05020500300001-03-0555000301001301251` | 622 (B, #20) |
| MythicSim Frostfire (experimental) | 0/29/22 | not published | 652 (B, #15) |
| wow.gg examples | 47/4/0, 0/46/5, 0/0/51 | `255225223122311531-13`, `-23552333132133151-005`, `--0555323331321331251` | not simmed |

gs results are 300 s with raid buffs, modeled ilvl-65 gear and full Tier 1 (`docs/modelled_build_reviews.md`, 9 Oct). Mana-limited time is 0 s for Arcane and Arcane-Frost, 1-3 s for Fire and under 0.4 s for Frost. MythicSim runs 120 s with reference gear and no trinkets, so its numbers are lower. **All 17 published strings decode cleanly on gs's tree** (ranks, row requirements, prerequisites); two fs/gs presets spend only 49 points. Contents:
- **Arcane 33/3/15**: Arcane Focus 5, Improved Channeling 3, Arcane Concentration 5, Arcane Geometry 2, Arcane Impact 3, Arcane Blast, Arcane Meditation 3, Missile Barrage, Presence of Mind, Arcane Mind 5, Arcane Instability 3, Arcane Power / Incineration 3 / Elemental Precision 5, Ice Shards 5, Piercing Ice 3, Frost Channeling 2. Damage (Undead): Missiles 339, Arcane Blast 327, Frostbolt 56, Touch of the Grave 21.
- **Fire 18/31/2**: Arcane Focus 5, Arcane Subtlety 1, Magic Absorption 2, Arcane Concentration 5, Arcane Resilience 2, Arcane Meditation 3 / Wake of Fire 2, Incineration 3, Improved Fireball 4, Ignite 5, Pyroblast, Improved Scorch 3, Heating Up, Master of Elements 3, Critical Mass 3, Fire Power 5, Combustion / Elemental Precision 2. Damage: Scorch 269, Pyroblast 172, Fire Blast 167, Ignite 99, Fireball 9.
- **Frost 11/3/37**: Arcane Focus 5, Arcane Concentration 5, Arcane Impact 1 / Incineration 3 / Improved Frostbolt 5, Elemental Precision 5, Ice Shards 5, Frostbite 3, Piercing Ice 3, Frost Channeling 2, Ice Lance, Ice Block, Shatter 3, Cold Snap, Fingers of Frost 2, Winter's Chill 5, Ice Barrier. Damage (Gnome): Frostbolt 519, Ice Lance 172.
- **Arcane-Frost 28/0/23**: Arcane Focus 5, Arcane Subtlety 2, Arcane Concentration 5, Arcane Impact 3, Arcane Blast, Arcane Meditation 3, Missile Barrage, Arcane Mind 5, Arcane Instability 3 / Improved Frostbolt 5, Elemental Precision 5, Ice Shards 5, Piercing Ice 2, Ice Lance, Shatter 3, Fingers of Frost 2. Damage: Frostbolt 441, Missiles 155, Ice Lance 126. Its APL never casts Arcane Blast; Barrage comes from Frostbolt.
- **Frostfire (MythicSim)**: "Fire/Frost hybrid using Frostfire Bolt, Heating Up Pyroblast and Scorch"; resistance and dual-school bonuses are unconfirmed. gs treats Frostfire builds as conditional research.

### Hybrid and experimental builds

Blizzard says the redesign aims at "cross-school builds", and the sims bear that out:
- **Arcane-Frost** (gs ranked, 28/0/23) ties pure Arcane and Fire. Frostbolt is the filler and procs free Missiles (20%); Ice Lance is cast on Fingers of Frost. It needs no Winter's Chill and has no Arcane Blast in its rotation.
- **Arcane/Fire** (P1 31/20/0; MythicSim's Arcane 35/11/5 dips into Ignite, Incineration and Wake of Fire) spends Arcane Blast stacks on Fire Blast or Scorch, which Ignite then boosts. Icy Veins' level-30 snippet gives the same idea: 2-3 Blasts, then Fire Blast. Unranked in gs.
- **Frost with Missile Barrage** (MythicSim/Kami 16/3/32) takes 16 Arcane points for Arcane Concentration and Missile Barrage, so Frostbolt procs free Missiles.
- **Fire/Frost and Frostfire** (gs/fs 0/35/16; MythicSim 0/29/22, experimental): Ignite + Ice Shards on Frostfire Bolt give 280% crits (Blizzard's example). Frostfire also feeds Heating Up, Winter's Chill and Fingers of Frost. No published Frostfire string, and gs has not ranked one.
- **Tank or off-role**: none. Ice Barrier, Ice Armor and Mana Shield are defensive only, and the mage talents only reduce threat.

## Suggested ability (priority lists)

**gs Arcane**: cooldowns (Arcane Power, Presence of Mind, racial); Evocation below 15% mana (>20 s left); **Missiles if Missile Barrage is up**; **Frostbolt at 3 Arcane Blast stacks** or below 20% mana; Arcane Blast. On 8 Oct all six races moved to the 3-stack reset (+6-8 DPS). **fs Arcane** is the same, but it dumps with Frostbolt below 40% mana.

**gs Fire**: Mana Ruby at 80%; Combustion and racial; Evocation below 20%; **Pyroblast at 3 Heating Up**; Fire Blast (mana >= 10 x seconds left); Scorch if Fire Vulnerability < 5 stacks or <= 5 s left; Fireball if mana >= 150 x seconds left (rare); **Scorch**. **fs Fire**: the same up to Scorch upkeep, then **Fireball while mana >= 10%**, then rank-1 Scorch. Its "low rank" variant ends on Fireball rank 2. The 1 Oct downranking penalty argues against both low-rank fillers.

**gs Frost**: Mana Ruby at 80%; cooldowns; Evocation below 15%; **Ice Lance with Fingers of Frost**; Frostbolt. **fs Frost**: the same, with Evocation at 20%. **gs Arcane-Frost**: Ruby; cooldowns; Evocation; Ice Lance on Fingers; Missiles on Barrage; Frostbolt.

**Practice-yard hints** (no fight-length checks, since the dummy never dies):
- **Arcane**: Mage Armor and Arcane Intellect first. Use Arcane Power + Presence of Mind (instant Arcane Blast) + racial together at full mana. Arcane Blast to 3 stacks, then Frostbolt; at low mana spend at 2 stacks; Fire Blast spends them while moving. Missiles whenever Barrage is up. Make it an engine option: gs gives the missiles the stack bonus, while the client rule does not, so with the client rule fire them at 0 stacks. Clearcasting is worth most on a 3-stack Arcane Blast (1137 mana). Ruby below ~80%, potion below ~50%, Evocation below 15%.
- **Fire**: open with Scorch to 5 Fire Vulnerability. Pyroblast as soon as Heating Up hits 3; never hard-cast 6 s Pyroblasts after the pull. Fire Blast on cooldown (6 s); it is also the movement spell. Re-Scorch at <= 5 s. Filler: Scorch (gs) or Fireball (fs); offer both. Combustion on cooldown, ideally before a 3-stack Pyroblast. Ruby below 80%, Evocation below 20%.
- **Frost**: Frostbolt only; Winter's Chill stacks to 5 by itself. On Fingers of Frost, Ice Lance (twice with 2 charges); finish a Frostbolt already in progress first (sim rule). Ice Lance without Fingers (~200) is only for moving. Ruby below 80%, Evocation below 15%.
- **Hybrids**: Arcane-Frost is Frostbolt filler, Ice Lance on Fingers and Missiles on Barrage. Frostfire is Scorch to 5 stacks, Frostfire Bolt filler, Pyroblast at 3 Heating Up.

## Default stats

There is no confirmed level-60 Forever gear. gs's UI default gear is **real items**, one set per spec, differing only in the bracers and main hand: Bloodvine Goggles, Vest and Leggings (3-piece +2% spell crit with Tailoring, the gs default profession), Chains of the Lich, Mantle of the Timbermaw, Hide of the Wild, Netherfroth/Nethershine/Netherflame Cuffs (+13 to the spec's school), Gloves of Spell Mastery, Belt of the Archmage, Earthen Silk Slippers, Blackstone Ring, Electrocutioner Lagnut, Frozen and Molten Heart of the Mountain, **Sageblade 58-109 @ 1.8** (Fire: Searing Golden Blade, +39 Fire), Truesilver Conduit, **Brilliant Wand 33-62 @ 1.2**. Items total Int 96, Spi 19, Sta 57, spell damage 192, MP5 9, hit 7.9%, crit 5%. Defaults: Orc (`sim.ts`), Mage Armor, 20 yd. The ranked builds use modeled ilvl-65 cloth.

| Sheet (our derived unbuffed values) | Int | Spi | Mana | Health | Spell damage | Crit (talented) | Hit (school) |
|---|---|---|---|---|---|---|---|
| UI Arcane 33/3/15 (Orc) | 240 | 142 | 4,530 | 2,230 | 192 (+13 Arcane) | 14.2% (Arcane 20.2%, Arcane Blast 26.2%) | 7.9% (Arcane/Frost 12.9%) |
| UI Fire 18/31/2 (Orc) | 219 | 142 | 4,218 | 2,090 | 244 Fire | 10.9% (Fire 16.9%, Scorch/Fire Blast 22.9%) | 6.9% (Fire 8.9%) |
| UI Frost 11/3/37 (Orc) | 218 | 142 | 4,203 | 2,230 | 205 Frost | 10.9% (+10% with 5 Winter's Chill; Ice Lance with Fingers 76.9%) | 7.9% (Frost 12.9%) |
| Ranked Arcane (Undead, modeled + enchants + Tier 1 hit) | 338 | 134 | 5,999 | 3,790 | 389 | 21.4% (Arcane 27.4%) | 12.5% (capped with talents) |

Spirit regen is 24 mana/s at 142 Spirit. Mage level-60 base in gs: health 1370, base mana 1213, Str 30, Agi 35, Sta 45, Int 125, Spi 120 (Orc +3/-3/+2/-3/+3, Undead -1/-2/+1/-2/+5, Gnome -5/+3/-1/+3/0, Troll +1/+2/+1/-4/+1). In combat add Arcane Brilliance +31 Int, Gift of the Wild +16, Divine Spirit +40 Spi, crit aura 3%, Flask of Supreme Power +150, Greater Arcane Elixir +35, Brilliant Wizard Oil +36 and 1% crit, and the school elixir (Classic values).

**Suggested round demo sheets:** **Arcane** 400 spell damage, Int 340, crit 13% before talents, hit 12%, mana 6,000. **Fire** 400 + 30 Fire, Int 300, crit 14%, hit 11%, mana 5,500. **Frost** 400 + 13 Frost, Int 300, crit 13%, hit 12%, mana 5,500.

## Worked examples

Sheet: 390 spell damage, 13% crit before talents, hit capped (99% land), 6% average partial resist on non-binary spells, no buffs. % talents add; Fire Vulnerability (5 stacks) multiplies by 1.15.
- **Frostbolt** (Frost): (475 + 0.814 x 390) x 1.06 = **840** (crit 1680 at 2.0x). Crit 23% with 5 Winter's Chill: 1,023 expected per 2.5 s cast = 409 DPS while casting, 261 mana.
- **Ice Lance with Fingers of Frost**: (148.6 + 0.10 x 390) x 1.06 x 4 = **795** (fs 0.143: 867). Crit 79% (13 + 10 + 6 Incineration + 50 Shatter) gives ~1,410 expected. Without Fingers it is 199.
- **Fireball** (Fire): (483 + 390) x 1.10 x 1.15 x 0.94 = **1,038** (crit 1,557 at 1.5x, 19% crit). Ignite from a crit: 623 (two ticks of 311). DoT tick 15 x 1.10 x 1.15 x 0.94 = 18. Expected per 3.1 s cast: direct 1,125 + Ignite 117 + DoT 77 = 1,320 (426 DPS); a crit refunds 123 mana (Master of Elements).
- **Scorch**: (181.4 + 0.429 x 390) x 1.265 x 0.94 = **415** (crit 622, 25% crit, Ignite 249). 523 expected per 1.5 s = 349 DPS. That is less than Fireball, but **0.165 crits per second against Fireball's 0.061**, so Heating Up fills 2.7x faster.
- **Pyroblast at 3 Heating Up**: (583 + 390) x 1.265 x 0.94 = **1,157** (crit 1,736) + DoT 4 x 133 = 530, in a 1.5 s cast.
- **Ignite rolling**: a Fireball crit of 1,557 makes a pool of 623, paid as 311 at +2 s and +4 s. A Scorch crit of 622 at +1 s (both ticks still owed) makes 623 + 249 = **872**, paid as 436 at +3 s and +5 s. The same crit at +3 s (one tick paid) makes 311 + 249 = 560, paid as 280 x 2. Nothing is lost or paid twice.
- **Arcane Blast** (Arcane): (394 + 0.714 x 390) x 1.03 x 0.94 = **651** (crit 1,302, 28% crit). Cost 182 / 500 / 819 / 1137 / 1456 at 0-4 stacks. Frostbolt dump at 3 stacks: 792.5 x (1 + 0.03 + 0.06 + 0.30) = **1,102** (crit 2,203; 3.0 s, no Improved Frostbolt). The loop of 3 Blasts and a Frostbolt costs 1,762 mana per ~10.5 s before Clearcasting and free Missiles.
- **Arcane Missiles with Barrage**: per missile (209 + 0.286 x 390) x 1.03 x 0.94 = **310** (fs); gs with 3 stacks gives 401. Crit 22% at 2.0x. 5 missiles at +0.5/1.0/1.5/2.0/2.5 s, each a separate projectile with its own hit and crit roll. The channel is worth ~1,874 (fs) or ~2,420 (gs, 3 stacks) for 0 mana.
- **Mana per minute**, gs ranked (300 s logs / 5):

| Build | Spent | Gained | Net | of which raid JoW | of which regen |
|---|---|---|---|---|---|
| Arcane 33/3/15 | 5,698 (Arcane Blast 5,152) | 5,118 | -580 | 1,366 | 2,528 |
| Fire 18/31/2 | 7,748 (Scorch 3,145, Fire Blast 2,887, Pyroblast 1,590) | 6,632 (incl. Master of Elements 883) | -1,116 | 1,097 | 3,305 |
| Arcane-Frost 28/0/23 | 5,004 | 4,675 | -329 | 1,127 | 2,512 |
| Frost 11/3/37 | 5,394 | 4,424 | -970 | 744 | 2,293 |

On a solo dummy without Judgement of Wisdom, potions or gems, a 4,200-6,000 pool lasts about 1.5-2 minutes. Evocation returns ~3,000 mana at 134 Spirit (16 x 23 x 8 s).

## Engine gaps (what the practice yard does not cover yet)

1. **Channels with per-tick sub-casts.** Arcane Missiles needs 5 projectiles with their own hit, crit and proc rolls, no tick at 0 s, and a period fixed at channel start (1.0 or 0.5 s). Casting or moving cancels the rest. The channel holds Arcane Blast stacks until it ends. Blizzard needs 8 ground ticks; Evocation needs regen x16 while channelling.
2. **Personal stacking target debuffs.** Fire Vulnerability (+3% of this mage's Fire damage per stack, 5, 30 s, refreshed per stack) and Winter's Chill (+2% crit per stack for this mage's Frostbolt and Ice Lance only, 15 s). The existing per-school damage-taken debuffs affect everyone and every spell.
3. **Ignite.** The payload is 40% of the crit's final damage. Unpaid ticks roll into the new payload; 2 ticks over 4 s; no crit, no modifiers; one per mage; it does not spend Combustion.
4. **Self-buff stacks that modify other spells.** Arcane Blast (+10% to other spells, +175% own cost, spent by the next other damage cast). Heating Up (Pyroblast cast -25% per stack, spent on completion). Combustion (crit per Fire hit, ends after 3 crits, cooldown starts at the end). Presence of Mind. Clearcasting (one free damage spell, 1 s proc ICD). Missile Barrage (changes the next Missiles' period and cost). Fingers of Frost (2 charges, "treat as Frozen", in-flight rule).
5. **Cooldown resets**: Cold Snap finishes all other Frost cooldowns.
6. **Costs**: percent of base mana with stacking multipliers (Arcane Blast x (1 + 1.75 x stacks + 0.30 Arcane Power)); Frost Channeling -15%; free casts.
7. **Mana refunds and regen fractions**: Master of Elements (base-cost refund on crit, 9 ms ICD); additive casting regen (Mage Armor 50% + Arcane Meditation 50%); gems on one 2 min timer, potion separate; a raid Judgement of Wisdom toggle.
8. **A dual-school spell**: Frostfire Bolt uses the lower resistance and the higher spell damage, and both schools' talents apply. Arcane Power and Instability skip its DoT.
9. **Procs that roll on impact**: Missile Barrage, Winter's Chill, Fingers of Frost, Improved Scorch and Ignite roll when the projectile lands, usually during the next cast.
10. *Check the engine for*: partial resists (0/25/50/75% or a flat x0.94) on non-binary spells; per-school crit multipliers (2.0x from Ice Shards and Arcane Mind); several DoTs from one caster on one target (Fireball, Pyroblast, Frostfire, Ignite); range bands (Fire Blast 20 yd, 30/35 yd casts, 10 yd point-blank). Pushback only matters if the dummy attacks.

## What changed from Classic 1.12

- Gear hit and crit are shared by spells and melee. Arcane Focus and Elemental Precision give hit. Arcane Mind gives Intellect and 2.0x Arcane crits.
- Ignite, Improved Scorch and Winter's Chill are personal; Ignite rolls over and no longer double dips (24 Sep). Winter's Chill affects only Frostbolt and Ice Lance.
- New: Arcane Blast, Missile Barrage, Arcane Geometry, Heating Up (20 s, renamed 1 Oct), Ice Lance, Fingers of Frost and baseline Frostfire Bolt.
- Combustion has 3 charges (4 earlier in the beta, until 1 Oct). Wake of Fire replaces Improved Fire Blast; Incineration covers Ice Lance and Arcane Blast. Ice Block is the 16-point talent; Cold Snap is the 21-point talent with a 10 min cooldown. Arcane Power needs Presence of Mind; Blast Wave and Shatter lost their prerequisites. Magic Attunement is baseline.
- Damage is lower: Fireball 425-541 + 60, Frostbolt 457-493, Scorch 166-197, Pyroblast 520-646 + 212, Missiles 209 per missile (at 0.286), Fire Blast 417-489. Ranks 1-5 were smoothed on 8 Oct. Much lower ranks now get less spell damage and fewer talent procs.
- Mage Armor 50% casting regen (was 30%), Arcane Meditation 50% (was 15%), Arcane Intellect lasts 1 h, Improved Blizzard slow 40% (was 65%), Cone of Cold slows for less time, Permafrost +11/22/33%.
- Blizzard and Flamestrike's burn are area triggers; Missiles checks line of sight once. DoTs crit and are dynamic. Curse of the Elements covers all magic schools; the crit aura covers spells. Wands no longer gain spell damage; world buffs do not work in raids. Molten Armor, Icy Veins, Dragon's Breath and Water Elemental do not exist.

## Provisional values (use them, but expect changes)

- Ice Lance coefficient (gs 0.10, fs 0.143, client none) and whether x4 covers the spell-power part.
- The scope of Arcane Blast stacks: Missiles, Blizzard and Flamestrike are in for gs and out for the client mask/fs. One report has Missiles inheriting the stacks at 15%.
- Fingers of Frost in-flight rule; Missile Barrage on landed hit (gs) or cast completion (fs); Clearcasting from missiles.
- Combustion charges (Blizzard 3, the 70124 row 4) and its stack cap (10 or 20). Whether Ignite's tick timer restarts and whether its ticks partially resist.
- Master of Elements on free casts; mana gem cooldown (2 min in the sims, 1 min in the spell row).
- 6% average partial resist, no crit suppression, Spirit regen 6.25 + Spi/8, the MP5 bug (#54).
- Availability of the AQ-tome top ranks; all default gear, priority lists and DPS.

## Open questions

1. Ice Lance coefficient at 60 and the scope of the frozen multiplier (MAG-001).
2. Do Arcane Missiles gain from (and spend) Arcane Blast stacks, at 10% or 15% per stack?
3. Fingers of Frost: does a cast already in progress use a charge (MAG-002)? Bug #297 double consumption.
4. Combustion's live charge count and stack cap.
5. Clearcasting from missile ticks; Missile Barrage timing after the 15 Oct fix (#258).
6. Frostfire Bolt: "higher of Fire or Frost spell damage" against the sims' dual-school handling, and which other talents and tier effects stack (MAG-003).
7. Heating Up: what happens to a stack earned while Pyroblast is casting (MAG-004)?
8. Spell penetration "vulnerability damage" past 0 resistance (#81): a bug or intended?
9. Mana gem cooldown (1 or 2 min); shared with Demonic Rune?
10. The downranking curve for spell damage and talent procs.
11. Spell crit suppression and the partial-resist average against +3 bosses on the live server.
12. How the AQ-tome ranks (Frostbolt 11, Fireball 12, Missiles 8) are obtained in Forever.
