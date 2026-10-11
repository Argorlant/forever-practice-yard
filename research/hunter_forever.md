# Hunter data sheet for WoW Forever (level 60 vs a level 63 dummy)

Research date: 11 Oct 2026. The machine-readable version is `hunter_forever.json` in this folder. Every number there has a source link and a confidence label. It covers Beast Mastery (pet + hawks), Marksmanship (petless Lone Wolf in gs, pet in fs) and Survival. In gs, Survival is a **melee** spec; in fs it is a ranged build with melee talents. It also covers the pet and the melee-weaving decision.

## The five things that matter most

1. **Auto Shot timing is still unsettled, and it drives the feel.** A Blizzard community manager wrote on 23 Sep that the **0.5 s cast before Auto Shot is intended** and that the beta's much shorter cast is a bug. On the 8-9 Oct build it is still 0.1-0.2 s (bug #289: "ranged code needs a rework"). A developer-style reply on bug #76 says Auto Shot is **meant to keep firing during Aimed Shot, Multi-Shot and Sniper Shot casts**. fs models that. gs deliberately keeps Classic gating: Auto Shot waits for a cast, and a cast waits for the windup. In gs's own audit, the timing model moves MM by about 110 DPS (12%). **Practice-yard default:** a 0.5 s windup, hasted, during which you must stand still; autos keep firing through casts; Classic gating as a toggle.
2. **The shots are reshuffled.** Aimed Shot is now baseline at level 20: 2 s cast, only +166 damage, 310 mana, and a 6 s cooldown **shared with Multi-Shot**. Multi-Shot has one rank: 0.5 s cast, no flat bonus, 13.9% of base mana (239). Arcane Shot does 217 Arcane on its own 6 s cooldown, which Summon Hawk shares. Serpent Sting does 555 over 15 s, and its ticks can crit. New **Sniper Shot** (MM 31): 4 s cast, 15 s cooldown, +295, 365 mana, 45 yd. In beta logs Arcane Shot and Serpent Sting gain RAP scaling (fs 0.11 per hit and 0.035 per tick; community wiki 10% and 3%); gs keeps the Classic SP-only coefficients. Forever has no Kill Command, Steady Shot, Aspect of the Viper or Wyvern Sting.
3. **Three real damage specs, two playstyles.** gs ranks BM 31/20/0 at ~904 DPS, melee **Survival 7/11/33 at ~900** and **Pet/Melee 16/11/24 at ~912**, all above petless Lone Wolf MM 5/35/11 at ~777 (Orc, modeled ilvl-65 gear, raid buffs). Survival plays as a melee spec: Aspect of the Beast (+110 melee AP), Raptor Strike, Strider Kick, Mongoose Bite lit by **Expose Prey** on your own Hunter's Mark, Lacerating Strikes, and dual wield with Predator's Edge. All three fs builds are ranged.
4. **Pets are stronger and simpler.** Focus regenerates continuously at 10 per second (cap 150). The pet inherits 10% of max(AP, RAP), 100% of the hunter's crit and hit, 30% of armor and 2 health per Stamina. Per-hit damage is **not normalized by attack speed**, so fast pets win (bug #31 open). Happiness gives x1.25 and pets take no external buffs. BM adds **Summon Hawk** (up to two 18 s hawks), Focused Fire, Frenzy (+30% attack speed after a crit), Bestial Wrath (+50% for 18 s) and Intimidation (+100% crit on the pet's next attack).
5. **Mana limits ranged hunters.** gs ranked MM spends ~4,900 mana/min and BM ~4,800/min. They last only because raid Judgement of Wisdom returns ~1,300-1,450/min and they also use potions, runes and casting regen. Melee Survival spends ~4,700/min but takes ~3,400/min back from Judgement of Wisdom. **The practice yard needs a "raid Judgement of Wisdom" toggle.** Without it, every spec goes dry in well under two minutes.

## Sources

| Id | Source | Version read |
|---|---|---|
| gs | [gunba/wow-forever-sim](https://github.com/gunba/wow-forever-sim) (MIT) | commit `9c05fc8`, 9 Oct 2026: `sim/hunter`, `sim/core`, `ui/hunter`, `ui/core/talents/trees/hunter.json`, `docs/` |
| fs | [laurencestokes/foreversim](https://github.com/laurencestokes/foreversim) (MIT) | commit `255df16`, 1 Oct 2026; same tree order as gs, so its strings decode |
| client | Beta client rows in fs `sim/core/spelldata/spells_auto_gen.go` | build 1.60.1.70124 |
| wowhead | Wowhead Forever tooltips (`nether.wowhead.com/forever/tooltip/spell/<id>`) | ~140 spell ids, read 11 Oct 2026, with icon names |
| blizzard | [Development notes](https://us.forums.blizzard.com/en/wow/t/2360696): post 1 (24 Sep, edited 8 Oct), post 4 (1 Oct), post 5 (8 Oct, the latest); [Hunter and Druid deep dive](https://worldofwarcraft.blizzard.com/en-us/news/24301515) (30 Sep); [CM post "Auto-shoot Bug and Fix Incoming"](https://eu.forums.blizzard.com/en/wow/t/630969) (23 Sep) | no posts after 8 Oct |
| bugs | [forever-bugs](https://github.com/ClassicWoWCommunity/forever-bugs) #14, #43, #76, #289, #113, #91, #283, #31, #48, #316 | replies by "AidanZMoon" read like a developer but are not flagged as Blizzard |
| wiki | [classic-hunter/forever-hunter wiki](https://github.com/classic-hunter/forever-hunter/wiki) | rev `4676367`, 30 Sep. *Forever Beta Changes* is Forever-specific (client and beta tests); the mechanics pages describe **Classic** |
| magey | [magey/forever-warrior](https://github.com/magey/forever-warrior) #1 attack table, #24 armor | shared melee rules |
| secondary | [classicwow.gg Forever hunter](https://classicwow.gg/forever/guides/hunter) (8 Oct), [wowforeverbuilds](https://wowforeverbuilds.com/news/auto-shot-with-no-wind-up-and-wands-that-fire-on-the-move-why-wow-forever-kiting) (22 Sep, AI-drafted fan site) | Icy Veins returned 403 (not read); no wow.gg or Kami Labs hunter page found. **miao.tips not read** (AI opt-out) |

Wowhead's **talent** tooltips print stale raw values: Unleashed Fury 20%, Ferocity 16%, Savage Strikes 20%, Barrage 15%, Lightning Reflexes 15%, Survival Tactics 17%, Bestial Discipline 100% Focus. This sheet uses gs's tree, which follows the client trait curves.

## Confidence labels

- **confirmed-forever**: Forever client data, a Wowhead Forever tooltip, Blizzard, or an in-game beta measurement (mostly at levels 10-30).
- **sim-provisional**: a choice made by one or both sims with no Forever source, or where sources disagree.
- **classic-fallback**: Forever says nothing, so the Classic 1.12 value is kept.

## Core rules

| Rule | Value | Confidence |
|---|---|---|
| Auto Shot cycle | Every `weapon speed / ranged haste` s, measured windup start to windup start. Damage = weapon roll + ammo DPS x weapon speed + RAP/14 x weapon speed | classic-fallback |
| Auto Shot windup | **0.5 s / ranged haste**; you must stand still. Blizzard says it is intended (23 Sep) but the beta runs ~0.1-0.2 s (#289). Moving at the start triggers a **0.5 s retry timer** (wiki, fs) | confirmed (intent) / beta differs |
| Autos during casts | Forever intent: Auto Shot fires during Aimed, Multi and Sniper casts (#76 reply; fs). gs: Classic gating. Volley's channel holds autos in both sims | sim-provisional |
| Melee and ranged timers | **Beta: a melee swing resets the ranged timer** (#14; reply: "for Hunters this is a bug"; still present after 8 Oct). Ranged does not reset melee. Classic 1.12: independent. fs models the reset, gs never mixes the two | confirmed beta bug |
| Ranges | Ranged 8-35 yd (Hawk Eye +2 yd/point, Sniper Shot +10 yd for the next 3 shots). Melee 5 yd. **Dead zone 5-8 yd** (Blizzard), about 5-11 yd in practice because ranged range is measured to the target's centre (wiki). gs uses 12 yd as its ranged minimum | confirmed |
| GCD | 1.5 s on shots, stings, aspects, traps, Hunter's Mark, Mongoose, Wing Clip, Strider Kick. Off the GCD: Raptor Strike (next swing), Rapid Fire, Bestial Wrath. gs lets cast speed haste non-physical GCDs (Arcane Shot, Serpent Sting, aspects) down to 1.0 s; physical shots stay locked | confirmed / haste provisional |
| Shared cooldowns | Aimed and Multi (category 2, 6 s); Arcane Shot and Summon Hawk (1173, 6 s); fire traps (30 s) and frost traps (30 s) each share a timer | confirmed |
| Cast times | Aimed 2 s, Multi 0.5 s and Sniper 4 s, all hasted by ranged attack speed (both sims); cast time is added before the cooldown starts. No shot can be cast while moving | sim-provisional |
| Ranged table vs +3 | Miss 8% (sims 9% with 1% hit suppression; magey found no suppression on melee), block 5% **from the front only**, **no dodge, parry or glancing**. Crit is rolled separately on hits; crit suppression -4.8% | confirmed (melee-measured) |
| Melee table vs +3 | 8% miss (27% white while dual wielding), 6.5% dodge, 14% parry and 5% block from the front, 40% glancing at 0.55-0.75 (beta ~0.75), crit -4.8% | confirmed |
| Crit damage | 2.0x for ranged and melee; **Mortal Shots 5/5 makes ranged 2.3x** (fs mask: Auto, Aimed, Arcane, Multi, Serpent, Volley; gs also gives it to Sniper and the melee abilities). Predator's Edge: melee abilities +30% | confirmed / scope provisional |
| Armor | Physical damage x(1 - A/(A+5500)); 3731 gives x0.5958. Arcane, Nature, Fire and bleeds ignore armor | classic-fallback |
| Stats | RAP = 100 + 2 x Agi + gear; melee AP = 100 + Str + Agi + gear; Careful Aim adds 20%/point of Int to both. 52.9 Agi = 1% crit; 10 hit rating = 1%, 14 crit rating = 1%; gear hit and crit count for every attack type | classic-fallback / confirmed |
| Haste | Multiplies: quiver or ammo pouch 1.10-1.15 x Quick Shots 1.30 x Rapid Fire 1.40 (**melee too** in Forever) x Berserking 1.10 (Forever Troll: 10% attack and cast speed, 3 min) x Windshaper/High Order 1.01 | confirmed |
| Ammo | DPS x weapon speed added to every weapon shot (Thorium 17.5, Rockshard 18, Ice Threaded 16.5, Jagged 13). Bug #113: the beta adds flat damage instead (open) | classic-fallback |
| Races | Alliance: Human, Dwarf, Night Elf, High Order; Horde: Orc, Tauren, Troll, Windshaper. Troll lost bow skill. **Human and Orc weapon crit does not reach ranged attacks** (#91 test: p = 0.007); gs still applies it. Night Elf Elune's Light: +10% crit for 15 s every 3 min. Orc Blood Fury: +10% AP for 15 s every 2 min | confirmed / gs differs |
| Threat | All damage at 1.0x threat (gs); Disengage -840 at 60; Distracting Shot adds flat threat; Intimidation is "high threat"; Feign Death drops combat | classic-fallback |
| Mana | Pool 1440 + 15 x Int (base 1720). Spirit regen 6.25 + Spi/8 per s, only outside the five-second rule; casting regen comes from Bestial Discipline (25/50%), Rapid Recuperation (25/50% for 15 s) and Resourcefulness (50% for 30 s) | classic-fallback / provisional |

## Abilities (max rank at 60)

Costs, cooldowns and ranges come from client rows and Wowhead (**confirmed-forever**) unless the Notes column says otherwise.

| Ability | Id | Icon | Mana | Cast / CD / GCD | Effect at 60 | Notes |
|---|---|---|---|---|---|---|
| Auto Shot | 75 | ability_whirlwind | 0 | 0.5 s windup (see rules) | weapon + ammo + RAP/14 x speed | Missile speed 40 yd/s. Quick Shots procs only from Auto Shot |
| Aimed Shot r6 | 20904 | inv_spear_07 | 310 | 2 s / 6 s (shared with Multi) / 1.5 | normalized weapon (2.8) + ammo + RAP/14 x 2.8 + **166** | Classic +600, 3 s cast, talent. Barrage +10% |
| Multi-Shot | 2643 | ability_upgrademoonglaive | 13.9% base (239) | 0.5 s / 6 s (shared with Aimed) / 1.5 | normalized weapon + ammo, 3 targets | One rank; Classic +150, instant, 10 s |
| Arcane Shot r8 | 14287 | ability_impalingbolt | 190 | instant / 6 s (shared with Summon Hawk) / 1.5 | **217** Arcane + RAP: fs 0.11, wiki 0.10, gs 0 (SP 0.429 kept) | Classic 183. Improved Arcane Shot -0.3 s/point |
| Serpent Sting r9 | 25295 | ability_hunter_quickshot | 250 | instant / - / 1.5 | 555 Nature over 15 s (111 per 3 s) + RAP per tick: fs 0.035, wiki 0.03, gs 0 (SP 1.0 total) | Dynamic (no snapshot); ticks crit. Improved Stings +6/13/20% |
| Sniper Shot r3 (MM 31-point talent) | 1310786 | hunter_pvp_snipershot | 365 | 4 s / 15 s / 1.5 | normalized weapon + ammo + **295**; next 3 shots +10 yd for 10 s | 8-45 yd. Not covered by Efficiency |
| Volley r3 | 14295 | ability_marksmanship | 490 | 6 s channel / none / 1.5 | 6 ticks x 112 Arcane, 8 yd | 1 min cooldown removed. SP .056/tick kept; AP coefficient unknown |
| Hunter's Mark r4 | 14325 | ability_hunter_snipershot | 60 | instant / - / 1.5 | +71 RAP for all attackers, 2 min | **Rank 3 (14324) gives 98**, a reported anomaly. Improved Mark is baseline |
| Rapid Fire | 3045 | ability_hunter_runningshot | 100 | instant / 5 min (4 or 3 with Rapid Killing) / none | +40% **ranged and melee** attack speed, 15 s | |
| Aspect of the Hawk r7 | 25296 | spell_nature_ravenform | 120 | 1.5 | +120 RAP; Deadly Aspects procs Quick Shots | Rank 6 shows 55 (anomaly) |
| Aspect of the Beast r4 (new ranks) | 1299447 | ability_mount_pinktiger | 110 | 1.5 | **+110 melee AP**, untrackable; Deadly Aspects procs Quick Strikes | Melee Survival aspect |
| Trueshot Aura (MM row 4) | 20905 / 20906 | ability_trueshot | 425 / 525 | 1.5 | party +75 RAP (r4) / **+50 (r5, anomaly)**, 45 yd, 30 min | Ranged AP only now. gs never casts it (not simulated) |
| Bestial Wrath (BM 31-point talent) | 19574 | ability_druid_ferociousbite | 12% base (206) | 2 min / none | pet +50% damage, 18 s | |
| Intimidation (BM 21-point talent) | 19577 | ability_devour | 8% base (138) | 1 min / 1.5 | pet's next attack +100% crit (stun 3 s; bosses immune) | 15 s window |
| Summon Hawk r4 (BM 16-point talent) | 1293527 | ability_hunter_animalhandler | 190 | instant / 6 s (shared with Arcane) / 1.5 | dive **108 + 5% RAP** (always hits, can crit) + an 18 s hawk; max 2 | Hawk swings: gs calibration 0.35 x 108 per 2.5 s (owner ranged haste), 1.5% crit |
| Raptor Strike r8 | 14266 | ability_meleedamage | 100 | next swing / 6 s / none | main-hand weapon damage + **70** | Classic +140. Yellow hit (never glances) |
| Mongoose Bite r4 | 14271 | ability_hunter_swiftstrike | 65 | instant / 5 s / 1.5 | **normalized weapon + 57** | Usable 5 s after a dodge or 10 s after Expose Prey. Classic: flat 115 |
| Wing Clip r3 | 14268 | ability_rogue_trip | 80 | instant / - / 1.5 | 50 damage, -60% speed for 10 s | gs melee filler at mana >= 40% (with raid JoW) |
| Strider Kick (SV 21-point talent) | 1317257 | ability_hunter_pet_tallstrider | 5.81% base (100) | instant / 8 s / 1.5 | **100% normalized weapon damage**, +30% move speed for 3 s | Not covered by Efficiency or Resourcefulness |
| Lacerating Strikes (SV 31-point talent) | 1310533 (bleed 1310536) | ability_gouge | - | - | Mongoose Bite bleeds 40% of its damage over 21 s (7 ticks every 3 s), can crit | |
| Counterattack r4 (SV 16-point talent) | 20910 | ability_warrior_challange | 85 | 5 s / 1.5 | after a parry: 50% weapon + 110, root 5 s, cannot be dodged, parried or blocked | Needs an attacking dummy. Rank 2 (1242634, +40) is new in Forever |
| Explosive Trap r3 | 14317 | spell_fire_selfdestruct | 520 | 30 s (fire timer) / 1.5 | 208-264 + 330 over 20 s, 10 yd | **No AP scaling yet; fix 15 Oct (#283)** |
| Immolation Trap r5 | 14305 | spell_fire_flameshock | 245 | 30 s (fire timer) / 1.5 | 690 over 15 s (5 ticks) | Placed at your feet, usable in combat. Clever Traps +30%; Survivalist's Discipline -40% CD |
| Frost / Freezing Trap | 13809 / 14311 | spell_frost_freezingbreath / spell_frost_chainsofice | 60 / 100 | 30 s (frost timer) | slow 60% / freeze 20 s | Bosses immune |
| Concussive / Scatter / Tranquilizing / Distracting | 5116 / 19503 / 19801 / 15632 | spell_frost_stun / ability_golemstormbolt / spell_nature_drowsy / spell_arcane_blink | 138 / 138 / 270 / 110 | 12 s / 30 s / 20 s / 8 s | slow / 50% weapon + 4 s disorient / remove Frenzy / threat | Utility |
| Scorpid / Viper Sting | 3043 / 14280 | ability_hunter_criticalshot / ability_hunter_aimedshot | 9% base / 215 | - / 15 s | target -2% hit for 20 s / drain 1108 mana | Scorpid has one rank now |
| Disengage r3 | 14273 | ability_rogue_feint | 150 | 5 s / 1.5 | -840 threat; **turns off auto-attack** | Threat cut doubled (8 Oct) |
| Feign Death / Deterrence | 5384 / 19263 | ability_rogue_feigndeath / ability_whirlwind | 80 / 0 | 30 s / 5 min | FD lasts 6 min, then you really die / +25% dodge and parry for 10 s | |
| Aspects: Monkey, Cheetah, Pack, Wild | 13163 / 5118 / 13159 / 20190 | ability_hunter_aspectofthemonkey / ability_mount_jungletiger / ability_mount_whitetiger / spell_nature_protectionformnature | 20 / 40 / 100 / 115 | 1.5 | +8% dodge / +30% speed / +30% party speed / +60 Nature resistance | Only one aspect at a time |

Costs before talents: **Efficiency** takes 3%/point off Aimed, Multi, Arcane, Serpent, Volley, Summon Hawk, Raptor, Mongoose and Wing Clip. **Resourcefulness** takes 30/60% off traps, Raptor, Mongoose and Wing Clip (additive with Efficiency in gs).

## Procs and passives

| Name | Value | Notes |
|---|---|---|
| Deadly Aspects (BM, 5 ranks; formerly Improved Aspect of the Hawk) | 2%/point: Auto Shot (Hawk) -> **Quick Shots** 6150, +30% ranged speed for 12 s; melee white hit (Beast) -> **Quick Strikes** 1299448, +30% melee speed for 12 s | Proc chance only; same 30%/12 s at every rank. Icons ability_warrior_innerrage / ability_rogue_slicedice |
| Lethal Attacks (MM, 5 ranks) | +1%/point crit with **all** attacks | replaces Lethal Shots |
| Mortal Shots (MM, 5 ranks, needs Careful Aim) | +6%/point ranged crit damage bonus (2.3x) | see the crit-damage rule |
| Careful Aim (MM, 5 ranks) | 20%/point of Int added to AP and RAP | |
| Lone Wolf (MM 11-point talent) | +20% damage with all attacks while no pet is out | gs MM is petless |
| Barrage / Ranged Weapon Spec | +3/7/10% Aimed, Multi, Volley / +1%/point ranged weapon damage (not Serpent) | |
| Rapid Recuperation (MM, 2 ranks) | Serpent Sting hit: 25/50% of mana regen continues while casting, for 15 s | permanent with Serpent kept up |
| Rapid Killing (MM, 2 ranks) | Rapid Fire -1/-2 min; a kill gives +20% on the next Shot within 20 s | the kill half never fires on a dummy |
| Expose Prey (SV, 2 ranks) | 5/10% per landed melee or ranged attack on **your** marked target: Mongoose usable for **10 s** (was 5 before 8 Oct) | buff 1310726 ability_hunter_swiftstrike; dodge window 5302, 5 s |
| Savage Strikes (SV, 2 ranks) | client: melee abilities +2/4% crit (gs, fs); Blizzard article: all melee damage +2/4% | conflict (gs HUN-012) |
| Predator's Edge (SV, 5 ranks) | melee ability crit damage +6%/point; off-hand damage +10%/point | |
| Resourcefulness (SV, 2 ranks) | 30/60% cheaper traps and melee; a crit has a 50/100% chance to give 50% casting regen for 30 s | buff 1242688 |
| Lightning Reflexes / Surefooted | +2%/point Agi (fs 3%, stale) / +1%/point hit for all attacks | |
| Improved Tracking (SV, 5 ranks) | +1%/point all damage against the tracked type; **Mechanical is not trackable** | give the dummy a creature type |
| Focused Fire (BM, 2 ranks) | +1%/point damage for you and the pet while it is out | |
| Frenzy (BM, 5 ranks, needs Ferocity) | pet crit -> 20%/point chance of +30% attack speed for 8 s | ~100% uptime at 5/5 |
| Ferocity / Unleashed Fury / Endurance Training | pet and hawk crit +2%/point / damage +3%/point / pet health and armor +3%/point | |
| Bestial Discipline (BM, 2 ranks) | pet Focus regen +10/20%; 25/50% casting mana regen | |
| Judgement of Wisdom (raid) | 59 mana; gs rolls 50% per landed melee or ranged hit | proc rule provisional (gs CORE-007) |

Not in Forever: Thrill of the Hunt and Expose Weakness (TBC talents), Killer Instinct (folded into Resourcefulness), Improved Hunter's Mark (baseline), Kill Command, Steady Shot, Aspect of the Viper.

## Pet

**gs model (Forever):** base Str 136, Agi 100, Sta 274; AP = 2 x Str - 20 + **10% of max(hunter AP, RAP)**. It inherits 100% of the hunter's melee crit and hit, 30% of armor and 2 x Stamina health; crit also gets Agi at the warrior rate (5%). The weapon is 36.34-55.32 per hit at **any** attack speed, scaling at 2.0 speed (AP/14 x 2). Damage multipliers: happiness x1.25; family Cat 1.10, Raptor 1.10, Wind Serpent 1.07, Wolf 1.00, Boar 0.90. Focus is continuous at 10/s (Bestial Discipline +20%), cap 150. gs gives pet actions a 1.6 s AI interval. Pets take no player buffs; beta pets snapshot owner stats on summon (#48).

| Ability | Id | Focus | CD | Effect at 60 | Icon |
|---|---|---|---|---|---|
| Claw r8 | 3009 | 25 | - | 43-59 | ability_druid_rake |
| Bite r8 | 17261 | 35 | 10 s | 81-99 | ability_racial_cannibalize |
| Lightning Breath r6 (Wind Serpent) | 25012 | 50 | - | 86-98 Nature, 20 yd, no coefficient | spell_nature_lightning |
| Scorpid Poison r4 | 24587 | 30 | 4 s | 5 per 2 s, 5 stacks | ability_poisonsting |
| Demoralizing Screech r4 (Carrion Bird) | 24582 | 20 | 10 s | 24-42 and -204 AP | ability_hunter_pet_bat |

The gs presets use a **Cat (Bite + Claw) at 1.2 s**. Families new in Forever (wiki values): Raptor Savage Rend (156 over 18 s, 50 Focus, 60 s CD), Croc Dismember, Gorilla Thunderstomp (132 Nature), Tallstrider Dust Cloud (-505 armor) and Wolf Furious Howl (party melee AP, cut 40% on 24 Sep). Neither sim models them.

**Practice-yard pet model:** one swing timer of 2.0 s (or a 1.2 s "fast pet" option), divided by 1.3 while Frenzy is up; the hunter's haste does not apply. Per hit: `(45.83 + petAP/7) x 1.25 x family x (1 + 0.03 x Unleashed Fury) x Focused Fire`, on the melee table from behind (miss 8% minus owner hit, dodge 6.5%, glancing 40% at 0.65, crit = 5% + owner crit + Ferocity - 4.8%). Focus is 10/s: cast Bite when ready (35), otherwise Claw (25) whenever Focus >= 25, with at least 1.6 s between actions. Bestial Wrath gives x1.5 for 18 s. Intimidation makes the next landed attack a crit.

## Talents

Talent strings use gs's order (`ui/core/talents/trees/hunter.json` = `proto/hunter.proto` = fs): **Beast Mastery 16, Marksmanship 16, Survival 18**. Each row needs 5 points per row above it, and prerequisites must be maxed. **New in Forever** talents are in bold; renamed or redesigned ones are in italics. Per-rank values, icons and Forever spell ids are in the JSON, along with `talents.tsSnippet`.

- **Beast Mastery**: *deadlyAspects* 5, enduranceTraining 5 (now includes Thick Hide), **focusedFire** 2, improvedAspectOfTheMonkey 3, pathfinding 2, improvedRevivePet 2, bestialSwiftness 1, unleashedFury 5 (3%), improvedMendPet 2, ferocity 5 (2%), **summonHawk** 1, spiritBond 2, intimidation 1 (needs Bestial Swiftness), bestialDiscipline 2, frenzy 5 (needs Ferocity), bestialWrath 1 (needs Intimidation).
- **Marksmanship**: hawkEye 3, improvedConcussiveShot 5, *lethalAttacks* 5, *improvedStings* 3, efficiency 5 (3%), **carefulAim** 5, **rapidKilling** 2, improvedArcaneShot 5 (0.3 s), **loneWolf** 1, trueshotAura 1, mortalShots 5 (needs Careful Aim), **rapidRecuperation** 2 (needs Rapid Killing), barrage 3, scatterShot 1, rangedWeaponSpecialization 5 (1%), **sniperShot** 1 (needs Trueshot Aura).
- **Survival**: **improvedTracking** 5, deflection 5 (1%/point since 1 Oct), entrapment 5 (root 1-5 s), savageStrikes 2, survivalist 5, improvedWingClip 3, cleverTraps 2, surefooted 3, deterrence 1, *survivalTactics* 2, **predatorsEdge** 5, counterattack 1 (needs Deterrence), **resourcefulness** 2, **exposePrey** 2, **survivalistsDiscipline** 2, **striderKick** 1, lightningReflexes 5 (2%), **laceratingStrikes** 1 (needs Expose Prey).

Removed: Improved Eyes of the Beast (baseline), Thick Hide, Improved Hunter's Mark (baseline), Aimed Shot (baseline), Improved Scorpid Sting, Monster and Humanoid Slaying, Trap Mastery, Killer Instinct, Improved Feign Death and Wyvern Sting.

Talent values that change the rotation or the numbers (per rank, from gs's tree):

| Talent | Per rank | At max | Rotation effect |
|---|---|---|---|
| Deadly Aspects | 2% proc | 10% | Quick Shots +30% ranged speed for 12 s (Auto Shot only) |
| Focused Fire | 1% | 2% | hunter and pet damage while the pet is out |
| Unleashed Fury / Ferocity | 3% / 2% | 15% / 10% | pet and hawk damage / crit |
| Frenzy | 20% | 100% | +30% pet speed for 8 s after a pet crit |
| Bestial Discipline | 10% Focus, 25% regen | 20% / 50% | pet Focus rate; hunter casting mana regen |
| Lethal Attacks / Surefooted | 1% crit / 1% hit | 5% / 3% | all attacks |
| Efficiency | 3% | 15% | cheaper shots, stings and melee (not Sniper or Strider) |
| Careful Aim | 20% of Int | 100% | AP and RAP |
| Improved Arcane Shot | 0.3 s | 1.5 s | Arcane Shot every 4.5 s (Summon Hawk unchanged) |
| Mortal Shots | 6% | 30% | ranged crit 2.3x |
| Barrage | 3/7/10% | 10% | Aimed, Multi, Volley |
| Ranged Weapon Spec | 1% | 5% | ranged weapon shots (not Serpent) |
| Rapid Killing | 1 min | 2 min | Rapid Fire every 3 min |
| Rapid Recuperation | 25% | 50% | casting regen for 15 s per landed Serpent Sting |
| Improved Stings | 6/13/20% | 20% | Serpent Sting damage |
| Improved Tracking | 1% | 5% | all damage vs the tracked type |
| Savage Strikes | 2% | 4% | melee ability crit (client) or all melee damage (article) |
| Predator's Edge | 6% crit dmg, 10% off hand | 30% / 50% | melee abilities 2.3x crit; off-hand swings x1.5 |
| Resourcefulness | 30% cost, 50% proc | 60% / 100% | cheaper traps and melee; casting regen after crits |
| Expose Prey | 5% | 10% | Mongoose window (10 s) per landed hit on your mark |
| Survivalist's Discipline | 20% | 40% | traps every 18 s |
| Lightning Reflexes | 2% Agi | 10% | |

## Builds

| Build | Split | Talent string (gs order) | Pet | Sim result |
|---|---|---|---|---|
| **gs Marksmanship** (UI default) | 5/35/11 | `5-0050552011523051-50005001` | none (Lone Wolf) | Orc 777, Troll 785, Human 781, NE 775, Tauren 763, Dwarf 764 DPS |
| **gs Beast Mastery** | 31/20/0 | `5320001505101251-00522510005` | Cat 1.2 s + 2 hawks | Orc 904, Troll 901, Human 906, NE 908, Tauren 895, Dwarf 896 |
| **gs Survival** (melee) | 7/11/33 | `502-0050051-230230230250022151` | Cat 1.2 s | Orc 899, Troll 888, Human 901, NE 895, Tauren 887, Dwarf 884 |
| **gs Pet/Melee** | 16/11/24 | `53200005001-0050051-5302002300501201` | Cat + hawks | Orc 912, Troll 902, Human 913, NE 907, Tauren 898, Dwarf 897 |
| fs P1 "Marksmanship" (also gs's test string) | 16/35/0 | `5023000501-0050550501503051` | Cat | - |
| fs Beast Mastery | 35/16/0 | `5520001505121251-0050551` | Cat | 463 DPS (weapon-only test gear, not meaningful) |
| fs Marksmanship | 0/39/12 | `-3050552301503151-50024001` | Cat | 337 (same caveat) |
| fs Survival (ranged APL) | 0/15/36 | `-005055-550230031051220151` | Cat | 310 (same caveat) |

gs results are 300 s with raid buffs and modeled ilvl-65 gear (`docs/modelled_build_reviews.md`); BM is mana-limited for 14-36 s per fight, MM for 2-4 s, and the melee builds for 0 s. All 8 strings decode cleanly on gs's tree (row and prerequisite checks pass). Contents:
- **MM 5/35/11**: Deadly Aspects 5 / Lethal 5, Efficiency 5, Careful Aim 5, Rapid Killing 2, Lone Wolf, Trueshot, Mortal Shots 5, Rapid Recuperation 2, Barrage 3, RWS 5, Sniper Shot / Improved Tracking 5, Survivalist 5, Surefooted 1.
- **BM 31/20/0**: Deadly Aspects 5, Endurance 3, Focused Fire 2, Bestial Swiftness, Unleashed Fury 5, Ferocity 5, Summon Hawk, Intimidation, Bestial Discipline 2, Frenzy 5, Bestial Wrath / Lethal 5, Improved Stings 2, Efficiency 2, Careful Aim 5, Rapid Killing 1, Mortal Shots 5.
- **SV 7/11/33**: Deadly Aspects 5, Focused Fire 2 / Lethal 5, Careful Aim 5, Rapid Killing 1 / Improved Tracking 2, Deflection 3, Savage Strikes 2, Survivalist 3, Clever Traps 2, Surefooted 3, Survival Tactics 2, Predator's Edge 5, Expose Prey 2, Survivalist's Discipline 2, Strider Kick, Lightning Reflexes 5, Lacerating Strikes.
- **Pet/Melee 16/11/24**: Deadly Aspects 5, Endurance 3, Focused Fire 2, Unleashed Fury 5, Summon Hawk / Lethal 5, Careful Aim 5, Rapid Killing 1 / Improved Tracking 5, Deflection 3, Savage Strikes 2, Clever Traps 2, Surefooted 3, Predator's Edge 5, Resourcefulness 1, Expose Prey 2, Strider Kick.

## Suggested ability (priority lists)

**gs Marksmanship**: Hawk at -10 s; cooldowns; Serpent Sting if missing (and >= 12 s left); **Aimed Shot**; Sniper Shot at mana >= 30%; Arcane Shot at mana >= 15%. It never casts Multi-Shot single-target, Hunter's Mark (raid debuff assumed) or Trueshot Aura. **fs Marksmanship**: Hawk at -10 s and Aimed at -2.5 s; Rapid Fire when the next auto is < 0.1 s away and Aimed is ready within 0.5 s; Aimed when the next auto is > 1 s away; Multi when > 0.5 s away; Serpent when < 1 s left (Aimed and Multi not ready within 0.5 s, mana >= 30%); Sniper when the next auto is > 1 s away and Aimed and Multi are >= 1 s from ready. It never casts Arcane Shot.

**gs Beast Mastery**: Hawk at -10 s; cooldowns (Bestial Wrath, Rapid Fire); Intimidation at mana > 80%; Summon Hawk if < 2 hawks or the oldest expires within its travel time; Serpent if missing; Aimed; Arcane at mana >= 15%. **fs BM** is fs MM with Summon Hawk (next auto > 1 s away) in place of Sniper.

**gs Survival (melee)**: Aspect of the Beast at -4 s, move to 5 yd at -2 s, Hunter's Mark at -1.5 s; Mark at <= 5 s left; **Raptor Strike** (queued); cooldowns; **Strider Kick**; **Mongoose Bite**; Immolation Trap (>= 12 s left); Wing Clip at mana >= 40%. **Pet/Melee**: Mongoose before Strider, then Summon Hawk (>= 9 s left), then trap and Wing Clip.

**Practice-yard hints** (no fight-length checks, since the dummy never dies):
- **MM**: before the pull, Hawk, Trueshot and your own Mark (r4 71, or r3 98 while the anomaly lasts). Rapid Fire and racial on cooldown, ideally as Aimed comes up. Serpent Sting when it is not ticking. Aimed on cooldown. Sniper when Aimed has >= 3.5 s left and mana >= 30%. Arcane at mana >= 15%; it is the instant to fire while moving. Never Multi single-target. Under the potion threshold (~40%), drop Sniper first, then Arcane.
- **BM**: Hawk, Mark, send the pet. Bestial Wrath + Rapid Fire + racial together. Intimidation on cooldown. Keep two hawks up (they share the cooldown with Arcane). Serpent, then Aimed on cooldown, then Arcane only when no hawk is needed.
- **Survival**: Beast, Mark (Expose Prey needs **your** mark), melee range. Raptor on cooldown (off the GCD), Strider Kick on cooldown, Mongoose whenever it lights, Immolation Trap at your feet on cooldown (18 s with Discipline 2/2), Wing Clip only above 40% mana with raid JoW (60% without).
- **Not clipping Auto Shot** (Classic-gating mode): start Aimed, Multi and Sniper right after an Auto Shot releases; never start a cast or move in the ~0.45 s before the next windup. Instants are always safe. With the Forever-intended model, only moving or standing in the dead zone at windup time costs a shot (plus the 0.5 s retry).

## Default stats

There is no confirmed level-60 Forever gear. gs's UI default gear is **real items**, the same for MM and BM: Outlaw's Collar, Ghostshard Talisman, Bloodsoul Shoulders, Shifting Cloak, Dawn Armor, Primal Batskin Bracers, Chromatic Gauntlets, Molten Belt, Devilsaur Leggings, Scalegut Treaders, Blackstone Ring, Ironspine's Eye, Frozen and Molten Heart of the Mountain, **Legionite Glaive 138-207 @ 3.2** (polearm) and **Core Marksman Rifle 107-200 @ 2.5**. Items total Agi 174, Str 4, Sta 99, AP 216, RAP 238, hit 5.9%, crit 4.5%, no Int, Spirit or MP5. Survival swaps the glaive for **two Ironwood Blades 79-148 @ 2.4**. Defaults: Thorium arrows (17.5 DPS), 15% quiver, race Troll (`presets.ts`; `sim.ts` says Orc), Cat at 1.2 s for pet builds. The ranked builds use modeled ilvl-65 mail.

| Preset (Troll, our derived unbuffed sheet) | RAP | Melee AP | Agi | Crit (vs boss) | Hit | Int / Spi | Mana | Health |
|---|---|---|---|---|---|---|---|---|
| MM 5/35/11 | 1001 | 738 | 301 | 15.2% (10.4%) | 6.9% | 61 / 71 | 2,355 | 3,506 |
| BM 31/20/0 | 1001 | 738 | 301 | 15.2% (10.4%) | 5.9% | 61 / 71 | 2,355 | 3,187 |
| SV 7/11/33 | 972 | 713 (823 with Beast) | 314 | 15.4% (+4% abilities) | 9.9% | 61 / 71 | 2,355 | 3,633 |
| Pet/Melee 16/11/24 | 915 | 684 | 285 | 14.9% | 9.9% | 61 / 71 | 2,355 | 3,427 |

In combat add Hawk +120 RAP (or Beast +110 AP), Trueshot +75 RAP for MM, and Hunter's Mark +71 RAP against the target. Hunter level-60 base in gs: health 1467, mana 1720, Str 55, Agi 125, Sta 90, Int 65, Spi 70, AP and RAP 100 (Troll +1/+2/+1/-4/+1, Orc +3/-3/+2/-3/+3, Night Elf -3/+5/-1/0/0). BM pet with Hawk up: AP 364, crit 25.4% against the boss.

**Suggested round demo sheets:** **MM** RAP 1,300 in combat, melee AP 750, crit 16%, hit 7%, mana 4,000, rifle 107-200 @ 2.5 + 17.5 ammo, 15% quiver, glaive 138-207 @ 3.2. **BM** the same plus a Cat (AP 365, 2.0 s or 1.2 s). **SV** melee AP 850 with Beast, crit 16% (+4% abilities), hit 9%, mana 3,500, swords 79-148 @ 2.4 x2.

## Worked examples

MM Troll sheet against a marked 3731-armor dummy (RAP 1267 with Hawk, Trueshot and Mark; x0.5958 armor; Lone Wolf x1.20, RWS x1.05; ammo 17.5 x 2.5 = 43.75; Mortal Shots 2.3x crit):
- **Auto Shot**: 153.5 + 43.75 + 1267/14 x 2.5 = 423.5 -> x1.26 = 533.6 -> **318** after armor (crit 731). With 2.1% miss and 10.4% crit, the average is 353 per shot. Cycle 2.5/1.15 = 2.17 s, windup 0.43 s, so 1.74 s free per cycle (1.34 s with Quick Shots, 0.96 s with Quick Shots and Rapid Fire).
- **Aimed Shot**: 153.5 + 43.75 + 1267/14 x 2.8 + 166 = 616.6 -> x1.10 x1.26 -> **509** (crit 1171). Cast 2/1.15 = 1.74 s.
- **Multi-Shot**: 450.6 -> **372** per target. **Sniper Shot**: 745.6 x1.26 -> **560** (crit 1288 in gs, 1120 in fs).
- **Arcane Shot** (ignores armor): gs 217 x1.26 = **273**; fs (217 + 0.11 x 1267) x1.26 = **449**; wiki 10%: 433.
- **Serpent Sting tick** (no RWS): gs 111 x1.20 = **133**; fs (111 + 0.035 x 1267) x1.20 = **186**; ticks crit at 2.0x.
- **Pet swing** (BM, Cat): (45.83 + 364/7) = 97.8 x1.25 x1.10 x1.15 x1.02 = 157.8 -> **94** after armor (glancing 61, crit 188). The average is 97 per swing: 81 DPS at 1.2 s, 105 with Frenzy, 63 at 2.0 s with Frenzy. Claw **49**, Bite **87** after armor; 10 Focus/s pays one Bite and 2.6 Claws per 10 s. Hawk dive (108 + 0.05 x 1121) x1.15 = 189 -> **112**; assault swing 26.
- **Survival** (Human, AP 823 with Beast, sword 79-148 @ 2.4): Raptor 113.5 + 823/14 x 2.4 + 70 = 324.6 -> **193** (crit 445 at 2.3x); Mongoose **186**, then Lacerating 74 over 21 s (10.6 per tick); Strider Kick **152**; main-hand white 152; off-hand white 114 (Predator's Edge 5/5); Wing Clip 30.
- **Mana per minute**, gs ranked (300 s logs / 5): MM spends Aimed 2,250, Arcane 1,083, Serpent 783, Sniper 772, Rapid Fire 40 = **4,928**; income JoW +1,448, regen +1,362, potion and rune +1,442. BM spends **4,812** (Aimed 2,249, Summon Hawk 1,093, Serpent 852, Arcane 408). SV melee spends **4,660** (Wing Clip 1,810, Raptor 868, trap 732, Strider 680, Mongoose 473) against JoW +3,416. The MM sheet on a solo dummy without JoW: ~4,900 spent vs ~450 of Rapid Recuperation regen, so **2,355 mana lasts ~32 s**. Aimed and Serpent alone still drain ~2,800/min.

## Melee weaving (the decision)

**What weaving was in Classic:** after an Auto Shot releases, step from range into melee, take a melee swing or Raptor Strike, step back out and be still before the next windup. Classic timers were independent, so the window is `ranged speed - windup`. The wiki's Classic page says to activate Raptor Strike only after entering melee range, because a hidden melee retry delays a pre-queued strike.

**Forever changes that matter:**
- **Melee resets the Auto Shot timer on the beta** (#14, reported 18 Sep, open; still present after the 8 Oct patch; reply: "For Hunters, this is a Bug with Auto Shot"). The community wiki writes that it "significantly affects melee weaving"; a fan site calls it the end of weaving. Wrath Classic linked both timers on purpose to stop weaving (a Blizzard producer said so in 2022); Forever's beta has only half of that link.
- The **windup is officially 0.5 s** but currently 0.1-0.2 s (#289). A short windup makes standing still trivial and Auto Shot nearly free to keep up.
- **Autos fire during casts** (Forever intent), so standing still for Aimed or Sniper casts at range is worth more. A weave costs about 1 s in which no shot can be cast (no shot is castable while moving, and none at all inside 8 yd).
- **Raptor Strike** gains only +70 (Classic +140), but it now costs 15% less with Efficiency and 60% less with Resourcefulness. **Rapid Fire** now hastes melee too, but it also shrinks the ranged window. Aspects cost mana and a 1.5 s GCD; Beast (+110 AP) is worse than Hawk (+120 RAP plus Quick Shots) for a weaver, so do not swap aspects.
- **Melee is a real spec instead:** Survival with Strider Kick, Expose Prey, Lacerating Strikes and dual wield ranks with BM in gs, about 120-135 DPS above petless MM.

**What the sims do:** neither models weaving or reports a weaving gain. gs ranged APLs stand at 12 yd; Raptor Strike appears only in the melee builds standing at 5 yd; Auto Shot needs >= 12 yd and melee needs <= 5 yd; no move actions. fs carries legacy TBC rotation fields (`melee_weave`, `time_to_weave`, shown only with a two-handed main hand) with no hunter code behind them. Its core engine **bakes in the beta reset** ("a melee swing resets the ranged auto timer") and has wake-up hooks for out-of-range swings, but none of its APLs moves.

**Timing and value** (our arithmetic with the MM sheet and gs's Legionite Glaive 138-207 @ 3.2, melee AP 738, Lone Wolf):
- Free window per Auto Shot cycle: **1.74 s** (quiver only), 1.34 s with Quick Shots, 0.96 s with Quick Shots and Rapid Fire. Crossing the dead zone (8 -> 5 yd) at 7 yd/s takes ~0.43 s each way, or ~0.6 s with latency; a round trip is ~1.0-1.2 s. **Feasible only outside haste windows**, and only when the melee swing is ready on arrival (glaive 3.2 s, Raptor every 6 s).
- Gain per weave (expected, after armor): Raptor Strike **~300**, white swing **~217**. The ceiling is ~50 DPS for Raptor-only weaving, ~86 DPS for one Raptor and one white per 6 s, against ~165 DPS from Auto Shots on this sheet.
- Cost: every 0.1 s of Auto Shot delay = **16 damage**. With independent timers, a weave is free if you are back in time; **0.5 s late costs ~82 plus up to 0.5 s of retry**. With the beta reset, the cost is deterministic: the time from Auto release to the melee hit (>= 0.45-0.75 s) = **74-123 per weave**. Add ~1 s of cooldown drift on Aimed or Arcane (~50-80 damage) and 85-100 mana per Raptor.
- Net: **perfect play +15-30 DPS (3-6%) with Classic timers, about +0-25 with the beta reset, negative with routine 0.5 s mistakes.** An average raider loses DPS. The ~5-11 yd effective dead zone on large bosses makes it worse.
- Guides: classicwow.gg (8 Oct) gives no Forever weaving schedule and notes the Auto Shot timing bug. The community wiki documents Classic weaving and flags the Forever reset. No Forever guide recommends weaving.

**Recommendation: make weaving an optional advanced mode, off by default. Make melee Survival core.** The engine pieces are mostly the ones Survival needs anyway.

**Design sketch.** The engine already has positions, facing, ranges, melee swing timers and on-next-swing abilities. It needs:
1. **A ranged auto timer** `rangedNextAt`, period `weapon speed / ranged haste`. At `rangedNextAt` start a windup of 0.5 s / haste if the player is stationary, 8-35 yd away, facing the target and not channeling Volley; fire when it ends (projectile at 40 yd/s). If the start fails, retry every 0.5 s. Moving during the windup cancels it and starts the retry.
2. **The dead zone:** ranged needs distance >= 8 yd plus target radius; melee needs <= 5 yd plus combat reach; between them, nothing fires.
3. **Both autos on at once, chosen by distance.** The melee timer keeps running out of range; a ready swing fires on entering range after a ~0.1-0.2 s retry. Leaving melee range does not touch the melee timer.
4. **A setting "melee hit resets Auto Shot"** with three options: beta (default, flagged as a bug), Classic (independent) and Wrath (both reset).
5. **Raptor Strike on the next swing:** 6 s cooldown and cost applied on the hit, off the GCD. A strike queued out of range lands only after a small retry delay on entering range (~0.2 s; the wiki describes a hidden retry).
6. **A setting "autos continue during casts":** Forever (default on) or Classic gating (gs).

Cues:
- **"Step in"** right after an Auto Shot releases, when all of these hold: the melee swing will be ready on arrival; Raptor is ready (or white weaves are enabled); the remaining window >= travel in + travel out + 0.3 s margin; no Aimed or Sniper is due in that window; neither Rapid Fire nor Quick Shots is active.
- **"Step out"** the moment the swing lands, or at the deadline `nextWindupAt - travelOut - margin`.
- **"Abort"** if the swing has not landed by the deadline: step out anyway.

The review should show: weaves attempted and landed (Raptor vs white), weave damage, Auto Shots clipped (count and total delay), Auto Shot damage lost (delay / speed x average auto), casts delayed (Aimed, Sniper, Arcane drift), Raptor Strikes queued out of range, time in the dead zone, mana spent on Raptor, and **net DPS gained or lost** against a no-weave replay of the same fight.

## What changed from Classic 1.12

- Aimed Shot is baseline: 2 s cast, +166, 6 s cooldown shared with Multi-Shot. Multi-Shot: one rank, 0.5 s cast, no bonus, 13.9% base mana.
- Arcane Shot 217 on its own cooldown (shared with Summon Hawk); Serpent Sting 555 with dynamic, crit-capable ticks; RAP scaling on both in beta logs. Volley: no cooldown, 112 per tick.
- New: Sniper Shot, Summon Hawk, Strider Kick, Lacerating Strikes, Aspect of the Beast ranks 2-4 with melee AP, Counterattack rank 2.
- Raptor Strike +70 (was +140); Mongoose Bite is weapon-based; Rapid Fire hastes melee; Hunter's Mark r4 71 (was 110) with the improved version baseline; Aspect of the Hawk r6 55 and Trueshot r5 50 are anomalies.
- Traps are usable in combat, have a 30 s cooldown, keep separate fire and frost timers and are placed at your feet; trap AP scaling is coming 15 Oct.
- Pets inherit owner stats, regenerate 10 Focus/s with a 150 cap, keep unnormalized speeds and take no buffs; Foxes and family abilities are new; Devilsaur Tooth only makes Revive Pet free.
- Talents rebuilt (16/16/18 nodes, 16-point milestones). Wyvern Sting, Killer Instinct, the Slaying talents, Improved Hunter's Mark and Thick Hide are gone.
- Disengage threat doubled and it turns off auto-attack; Feign Death kills you after 6 min; Human and Skyborne hunters; weapon racials give crit, but not to ranged attacks on the beta.

## Provisional values (use them, but expect changes)

- Auto Shot windup (0.5 s intended, 0.1-0.2 s live), autos during casts, melee-resets-ranged (#14), the retry timer.
- Arcane Shot and Serpent Sting RAP coefficients (fs 0.11/0.035, wiki 0.10/0.03, gs none); Volley AP coefficient; trap AP scaling after 15 Oct.
- Mortal Shots scope (gs includes Sniper and melee); Savage Strikes crit vs damage; Lightning Reflexes 2% vs 3%.
- Hawk assault damage (0.35 x base) and crit (1.5%); pet inheritance coefficients and snapshotting; pet AI interval.
- Hunter's Mark r3/r4, Aspect of the Hawk r6 and Trueshot r4/r5 anomalies; ammo bug #113; racial crit on ranged.
- Spirit regen 6.25 + Spi/8; Judgement of Wisdom 50% per hit; all default gear, priority lists and DPS.

## Open questions

1. Will the 0.5 s windup ship (#289), and will Auto Shot keep firing during Aimed, Multi and Sniper casts?
2. Will melee keep resetting the ranged timer (#14)? Will the fix be Classic (independent) or Wrath (both reset)? This decides whether weaving exists.
3. Arcane Shot and Serpent Sting scaling at 60 (RAP share, SP removal).
4. Does Mortal Shots cover Sniper Shot? Does Savage Strikes add crit or damage?
5. Hawk swing damage, crit and Ferocity transfer at rank 4; can two hawks coexist with Lone Wolf?
6. Pet AP slope at fast speeds; will fast pets be normalized (#31)? Do pets re-inherit dynamically (#48)?
7. Hunter's Mark rank 3 (98) vs rank 4 (71); Trueshot rank 4 (75) vs rank 5 (50).
8. Judgement of Wisdom proc rule for ranged hits (CORE-007).
9. The practical dead zone on large raid bosses (minimum range measured to the centre).
10. Trap scaling after the 15 Oct fix, and whether one fire and one frost trap can both be active.
