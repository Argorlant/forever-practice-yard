# Priest data sheet for WoW Forever (level 60 vs a level 63 dummy)

Research date: 11 Oct 2026. The machine-readable version is `priest_forever.json` in this folder. Every number there has a source link and a confidence label. It covers Shadow, the experimental Smite build (Discipline/Holy damage with Smite, Holy Fire, Penance and optionally Mind Blast) and one hybrid of ours. Holy and Discipline **healing** are out of scope; their talents are listed only because talent strings need them. No Discipline damage build exists apart from Smite: Penance is the only Discipline damage talent, and the Smite builds take it.

## The five things that matter most

1. **Shadow Weaving and Shadowform are personal multipliers now.** Shadow Weaving (3/3) gives every landed Shadow damage spell a 100% chance to add a stack: +2% Shadow damage **from you**, 5 stacks, 15 s, refreshed by each stack. The aura sits on the target (Wowhead: "taking 2% increased Shadow damage from the caster"), but only your own damage counts. It is **not a raid debuff**; gs removes it from the raid list. Shadowform: +10% Shadow damage, -50% Shadow mana cost, Shadow crit damage 2.0x (which spells count is disputed), -15% physical damage taken. It costs 40% of base mana (550) to enter and has a 1.5 s cooldown; no healing spells and no Penance while in it. With Darkness 5/5 (+10% all Shadow), the three multiply to x1.331.
2. **Mind Flay is the filler, and it plays differently.** It does 390 Shadow over 3 s (130 per 1 s tick, +0.167 SP each) for 205 mana (103 in Shadowform). Range is 20 yd, or 30 yd with Improved Mind Flay 2/2, which also adds +20% damage. The hit is rolled once at cast and is all-or-nothing (no partial resists). Ticks crit, at 2.0x in Shadowform. fs and ms say casting haste does not speed it up; gs speeds it only with a "spell haste" stat that no gear has. gs's ranked APL clips it only after the 2nd tick, when Mind Blast or Death is ready or a DoT is down; gs says this "did not reliably beat" full channels. On the beta, a channel cut mid-tick deals a proportional partial tick (developer-style reply, bug #21), and channels cannot be queued (#230).
3. **The DoT kit is new.** Shadow Word: Pain r8 deals 762 over 18 s (24 s with Improved SWP 2/2) at 0.2 per tick. Devouring Plague is baseline for every race: 848 over 24 s, 1 min cooldown, heals you, and its ticks crit since 1 Oct. Shadow Word: Death is baseline at 32: r4 444-472 + 0.429 SP, 15 s cooldown, 340 mana, and **10% of your max health as backlash whenever the target survives**, so every cast on a dummy. DoTs are dynamic (no snapshot) and their ticks crit. Since 1 Oct, Inner Focus's +25% crit no longer applies to periodic damage. gs ranks Shadow 18/0/33 at ~825-833 DPS; MythicSim puts it in B tier at 660.
4. **Smite works, but it is experimental.** Smite r8 does 166-187 at 0.714 (Classic 384-429), 2.0 s with Divine Fury 5/5, 280 mana. Holy Fire r8 does 184-232 + 75 over 10 s, with a 3.5 s cast (3.0 s talented). Power in Light: +10% to Smite and Penance while **your** Holy Fire burns. Searing Light: +5% Holy damage. Holy Precision: +18% Holy hit, which caps by itself. Holy Specialization: +5% crit. Penance (Discipline 21) fires 3 bolts at 0/1/2 s: r4 92 + 0.19 SP each since 8 Oct, 385 mana, 12 s, not castable in Shadowform. gs ranks Smite 31/17/3 at ~444-464 DPS, mana-limited for 32-41 s. MythicSim labels Smite "Experimental" (B, 581 DPS, 21/23/7). **Mind Blast does ~1.8x Smite's damage per cast-second at the same mana efficiency**, yet only one MythicSim-engine APL casts it.
5. **Mana is the real limit.** In gs, Shadow spends ~3,970 mana/min and Smite ~5,980/min. They last thanks to raid Judgement of Wisdom (~700-875/min), Blessing of Wisdom, potions, Demonic Runes and Undead Dark Sacrifice. Alone at the dummy, the UI-default sheet regains ~840/min (Spirit 145, Meditation 3/3, 9 MP5): Shadow runs dry in ~80 s and Smite in ~55 s. **The yard needs raid mana toggles.**

## Sources

| Id | Source | Version read |
|---|---|---|
| gs | [gunba/wow-forever-sim](https://github.com/gunba/wow-forever-sim) (MIT) | commit `9c05fc8`, 9 Oct 2026: `sim/priest`, `sim/core`, `ui/shadow_priest`, `ui/smite_priest`, `ui/core/talents/trees/priest.json`, `docs/` (beta-pass/priest.md, modelled_build_reviews.md, uncertainties.md PRI-001..005, october-8-overnight-update.md) |
| fs | [laurencestokes/foreversim](https://github.com/laurencestokes/foreversim) (MIT) | commit `255df16`, 1 Oct 2026. One "DPS priest" spec with Shadow and Smite presets; same tree order as gs, so its strings decode |
| ms | [sage3648/mythicsim-forever-engine-go](https://github.com/sage3648/mythicsim-forever-engine-go) (MIT), MythicSim's engine | commit `8361dcc`, 10 Oct 2026. A fork of the fs codebase with newer client masks (70170/70334). Secondary |
| client | Beta client rows in fs `sim/core/spelldata/spells_auto_gen.go` | build 1.60.1.70124 (Penance there predates the 8 Oct retune) |
| wowhead | Wowhead Forever tooltips (`nether.wowhead.com/forever/tooltip/spell/<id>`) | ~110 spell ids read 11 Oct 2026, with icon names |
| blizzard | [Development notes](https://us.forums.blizzard.com/en/wow/t/2360696): posts 1 (24 Sep, edited 8 Oct), 4 (1 Oct), 5 (8 Oct, the latest). [Priest and Warrior deep dive](https://worldofwarcraft.blizzard.com/en-us/news/24301514) (30 Sep) | no posts after 8 Oct |
| bugs | [forever-bugs](https://github.com/ClassicWoWCommunity/forever-bugs) #21, #54, #81, #137, #188, #230, #286, #288, #295, #303 | replies by "AidanZMoon" read like a developer but are not flagged as Blizzard |
| mythicsim | [mythicsim.com tier list](https://mythicsim.com/wow-forever/tier-list) | robots.txt allows AI agents except `/sims/`, `/history`, `/developer`, `/login`, `/api/`; ai.txt returns 404 (no opt-out). Tier list read (snapshot 10 Oct, 2 min fights). Build pages load from `/api/`, so they were not read. Secondary |
| secondary | wow.gg (19 Sep, 1 Oct), classicwow.gg (8 Oct), kami-labs (14-23 Sep) | Icy Veins returned 403 (not read). **miao.tips not read** (AI opt-out) |

Wowhead **talent** tooltips print stale or rank-1 raw values: Power in Light 15%, Improved Mind Blast 3 s, Divine Fury 1 s, Searing Light 10%, Shadow Affinity 8%, Litany of Light 20%, Spiritual Healing 2%, and 0% for Martyrdom, Inspiration and Spirit Tap. This sheet uses gs's tree, which follows the client trait curves. Ability tooltips match the client rows; scaling spells are printed at their max scaling level (Mind Blast 485-511, Holy Fire 196-244), while the sims use the level-60 values.

## Confidence labels

- **confirmed-forever**: Forever client data, a Wowhead Forever tooltip, Blizzard, or an in-game beta measurement (mostly levels 10-30).
- **sim-provisional**: a choice made by one or more sims with no Forever source, or where sources disagree.
- **classic-fallback**: Forever says nothing, so the Classic 1.12 value is kept.

## Core rules

| Rule | Value | Confidence |
|---|---|---|
| Spell table vs +3 | 17% miss; 1% always misses, so +16% hit caps. Gear hit counts for spells (Forever unifies gear hit and crit). Shadow Focus +5% Shadow hit, Holy Precision +18% Holy hit | classic-fallback / confirmed |
| Partial resists | gs: average **6%** off non-binary Shadow and Holy damage vs +3 (level-based), DoT ticks included. Binary (all-or-nothing): Mind Flay (both sims), Starshards (gs). Bug #81 hints at a new resistance model ("Vulnerability Damage") | sim-provisional |
| Spell crit | 1.5x; **2.0x for Shadow spells in Shadowform** (scope below). No crit suppression vs +3 in the sims. Base spell crit 0.8% + Int/59.5 (0.0168% per point) | classic-fallback / provisional |
| GCD | 1.5 s on every priest spell; casting speed shortens it to a 1.0 s floor (gs CORE-004). Off the GCD: Inner Focus, Power Infusion | confirmed / haste rule provisional |
| Casting and moving | No casts and no channels while moving; moving breaks a channel. Instants are fine: SWP, DP, SWD, Holy Nova, VE, Shadowform, IF, PI | confirmed |
| Channels | Mind Flay ticks at 1, 2 and 3 s; Penance bolts at 0, 1 and 2 s (fixed 8 Oct: a 2 s channel); Starshards 6 ticks over 6 s. Cost is paid at the start; a new spell after the GCD clips the channel. Partial last tick on clip (#21) and no queueing (#230) are beta behaviour; the sims use whole ticks | confirmed / beta |
| DoTs | Ticks re-read your current stats (no snapshot; #137 reply, gs CORE-008) and can crit (DP since 1 Oct). Recasting restarts the DoT (the pending partial tick is lost) | confirmed / refresh classic-fallback |
| Pushback | Only matters when the dummy attacks. gs: 1.0 s, then 0.2 s less per hit (min 0.2). Beta: spell hits cause no pushback (#188, open). Twilight Focus 3/3: 70% chance to avoid it | classic-fallback |
| Mana pool | 1096 + 15 x Int (priest base 1376; the first 20 Int give 1 mana each) | classic-fallback |
| Regen | Spirit: 6.25 + Spirit/8 per s, only outside the five-second rule (gs common formula). Meditation keeps 17/33/50% while casting; Spirit Tap 50% (kills only). MP5/5 per s at all times; beta gear MP5 pays every second (#54, open) | sim-provisional |
| Threat | 1.0x on all damage in the sims (Mind Blast's tooltip still says "high threat"). Shadow Affinity -10/20/30% Shadow, Silent Resolve -10/20/30% Holy; Holy Nova no threat; Fade -4,100 for 10 s | classic-fallback |
| Races | Human, Dwarf, Night Elf, **Gnome** (Alliance); Troll, Undead (Horde). Troll Berserking: +10% casting speed, 10 s / 3 min. Undead Touch of the Grave: 10% per spell, 1 s ICD, drains 5% of max health. Night Elf Elune's Light: +10% crit, 15 s / 3 min. Gnome Eureka!: next 3 non-periodic spells cost 10% less and deal 10% more, 15 s / 2 min. Dwarf: +1% crit with a mace | confirmed |
| Target | gs's reference dummy is Dragonkin. Chastise (Dwarf) works on Humanoids only. Early Demise and gs's SWD kill check need an execute phase | confirmed |

## Abilities (max rank at 60)

Costs, cast times, cooldowns and ranges come from client rows and Wowhead (**confirmed-forever**) unless the Effect or Notes column says otherwise. "SP" = spell damage for the spell's school.

| Ability | Id | Icon | Mana | Cast / CD / GCD | Range | Effect at 60 | Notes |
|---|---|---|---|---|---|---|---|
| Mind Blast r9 | 10947 | spell_shadow_unholyfrenzy | 350 | 1.5 s / 8 s (5.5 s with Imp MB 5/5) / 1.5 | 30 yd | 477-504 Shadow + 0.429 SP | Classic 508-537. Tooltip: high threat |
| Mind Flay r6 (Shadow 11) | 18807 | spell_shadow_siphonmana | 205 | 3 s channel / - / 1.5 | 20 yd (+5/+10 Imp MF) | 3 ticks x 130 + 0.167 SP; slows 50% (35/20% with Imp MF) | Classic 426 at 0.15. Binary |
| Shadow Word: Pain r8 | 10894 | spell_shadow_shadowwordpain | 470 | instant / - / 1.5 | 30 yd | 6 ticks x 127 + 0.2 SP every 3 s (+1 tick per Imp SWP point) | Classic 852 at 0.167 |
| Devouring Plague r6 (baseline, all races) | 19280 | spell_shadow_devouringplague | 985 | instant / **60 s** / 1.5 | 30 yd | 8 ticks x 106 + 0.1 SP every 3 s; heals you for the damage | Classic: Undead only, 3 min, 904 at 0.063. Shadow T1 5-piece removes the cooldown |
| Shadow Word: Death r4 (new, baseline at 32) | 1309636 | spell_shadow_demonicfortitude | 340 | instant / 15 s / 1.5 | 30 yd | 444-472 + 0.429 SP; you take 10% max health if the target survives | Unknown "script 150" effect (PRI-001). Ranks 1309595/1309633/1309635 at 32/40/48 |
| Vampiric Embrace (Shadow 16) | 15286 | spell_shadow_unsummonbuilding | 40 | instant / **60 s** / 1.5 | 30 yd | 30 s: your party heals for 20% of your Shadow damage | Classic: 1 min duration, no cooldown, self only |
| Shadowform (Shadow 31) | 15473 | spell_shadow_shadowform | 40% base (550) | instant / 1.5 s / 1.5 | self | see the procs table | Blocks healing spells and Penance |
| Shadowfiend | 401977 | spell_shadow_shadowfiend | 0 | instant / 5 min / 1.5 | 30 yd | 15 s pet; you gain 5% max mana per landed attack (Mana Leech 401988) | In the client and on Wowhead (level 1, not a talent); **trainability unconfirmed**. fs/ms: optional, swings 68-92 Shadow every 1.5 s; gs: not modelled |
| Silence (Shadow 21) | 15487 | spell_shadow_impphaseshift | 225 | instant / 45 s / 1.5 | 20 yd | silence 5 s | Utility |
| Inner Focus (Discipline 11) | 14751 | spell_frost_windwalkon | 0 | instant / 3 min / none | self | next priest spell free; +25% crit if non-periodic | Scope disputed (procs) |
| Power Infusion (Discipline 31) | 10060 | spell_holy_powerinfusion | 20% base (275) | instant / 3 min / none | 30 yd | +20% spell damage and healing, 15 s | gs/fs cast it on yourself |
| Smite r8 | 10934 | spell_holy_holysmite | 280 | 2.5 s (2.0 with Divine Fury 5/5) / - / 1.5 | 30 yd (+10/20% Holy Reach) | 166-187 Holy + 0.714 SP | Classic 384-429. Ranks 1-4 retuned 8 Oct |
| Holy Fire r8 | 15261 | spell_holy_searinglight | 255 | 3.5 s (3.0) / - / 1.5 | 30 yd | 184-232 + 0.75 SP, then 5 ticks x 15 + 0.05 SP every 2 s | Classic 355-449 + 145 dot. Rank 5's dot out-ticks rank 6 |
| Holy Nova r6 (Holy 11) | 27801 | spell_holy_holynova | 750 | instant / - / 1.5 | 10 yd around you | 174-200 Holy + 0.107 SP to each enemy; heals party 288-334 | No threat. Free after a Searing Light proc |
| Penance r4 (Discipline 21) | 1316995 | spell_holy_penance | **385** | 2 s channel, bolts at 0/1/2 s / 12 s / 1.5 | 36 yd | 3 bolts x **92 + 0.19 SP** Holy, each its own hit roll and crit | 8 Oct values (Wowhead, gs). fs/client row: 131 at 0.285, 355 mana; ms casts r3 (old 180). Not in Shadowform |
| Starshards r7 (Night Elf) | 19305 | spell_arcane_starfire | 350 | 6 s channel / 30 s / 1.5 | 30 yd | 6 ticks x 300 Arcane + 0.167 SP | Classic 936, no cooldown |
| Chastise r5 (Dwarf) | 1277335 | spell_holy_chastise | 225 | instant / 2 min / 1.5 | 20 yd | 272-306 Holy + 0.143 SP, 2 s root | **Humanoids only** |
| Dark Sacrifice r5 (Undead) | 1277328 | spell_holy_powerinfusion_shadow | 0 | instant / 10 min / 1.5 | self | 5 ticks over 15 s: 320 health -> 320 mana each (Wowhead 328, "+ Spirit" mana) | gs uses it as a mana cooldown |
| Touch of Weakness r6 (Undead) | 19266 | spell_shadow_deadofnight | 195 | instant / - / 1.5 | self | next melee attacker: 56 Shadow, -204 AP for 2 min | Needs an attacking dummy |
| Shadowguard r6 (Troll) | 19312 | spell_nature_lightningshield | 250 | instant / - / 1.5 | self | 3 charges: 116 + 0.267 SP to an attacker, 3.5 s ICD, no threat | Needs an attacking dummy |
| Hex of Weakness r6 (Troll) | 19285 | spell_shadow_fingerofdeath | 240 | instant / - / 1.5 | 30 yd | -204 melee AP, -20% healing, 2 min | Debuff on an attacking dummy |
| Elune's Grace / Feedback | 2651 / 19275 | spell_holy_elunesgrace / spell_shadow_ritualofsacrifice | 3% base / 230 | 5 min / 3 min | self | -50% chance to be hit / burn 105 mana from casters | Defensive racials |
| Power Word: Shield r10 | 10901 | spell_holy_powerwordshield | 500 | instant / 4 s / 1.5 | 40 yd | absorb 928 + 0.1 SP for 30 s, no casting pushback while it holds | Weakened Soul 6788 (spell_holy_ashestoashes) 15 s; recasting always overwrites (24 Sep, #44) |
| Inner Fire r6 | 10952 | spell_holy_innerfire | 315 | instant | self | +1,395 armor, 20 charges, 10 min | |
| Psychic Scream / Fade | 10890 / 10942 | spell_shadow_psychicscream / spell_magic_lesserinvisibilty | 210 / 275 | 30 s / 30 s | 8 yd / self | fear 5 enemies 8 s / -4,100 threat for 10 s | Fade's threat cut doubled (deep dive) |
| Desperate Prayer / Mana Burn | 19243 / 10876 | spell_holy_restoration / spell_shadow_manaburn | 0 / 270 | 10 min / 3 s cast | self / 30 yd | heal 1,318-1,546 / burn ~770 mana | Dwarf (Desperate Prayer) |
| Shoot (wand) | 5019 | ability_shootwand | 0 | auto-repeat | 30 yd | wand damage only | **Wands no longer scale with spell damage** (24 Sep) |

Not in Forever: Vampiric Touch, Lightwell, Force of Will, Improved Vampiric Embrace. Baseline buffs: Divine Spirit +40 Spirit (spell_holy_divinespirit), Power Word: Fortitude +70 Stamina (spell_holy_wordfortitude), Prayer of Shadow Protection +60 (spell_holy_prayerofshadowprotection).

Costs before talents: Shadowform -50% on Shadow spells (a school power-cost aura). Mental Agility -3/7/10% on Smite, Holy Fire and instants. Devouring Contagion -25/50% on DP. Inner Focus makes the next spell free. Improved Healing -5/10/15% on Penance. **gs adds all of them together, so DP is free in Shadowform with Contagion 2/2.** fs and ms multiply the Shadowform aura with the talent: 985 x 0.5 x 0.5 = 246. The two aura types differ, so the multiplicative reading is more likely.

## Procs, debuffs and passives

| Name | Value | Notes |
|---|---|---|
| Shadow Weaving (Shadow 3, 15257; stack aura 15258, spell_shadow_blackplague) | 33/67/100% per landed Shadow damage spell (MB, MF cast, SWP, DP, SWD; fs/ms also VE): +2%/stack Shadow damage from you, 5 stacks, 15 s, refreshed | Personal debuff on the target ("from the caster"), not a raid debuff. 1 Oct: it can no longer fail to apply |
| Shadowform (15473) | +10% Shadow damage; -50% Shadow mana cost; Shadow crit 2.0x; -15% physical taken | Crit scope: gs all Shadow spells; fs MB, MF, SWP, DP (the client mask); ms adds SWD ("Forever has since extended it") |
| Darkness (Shadow 5) | +2%/point all Shadow damage | Classic: 5 named spells |
| Improved Mind Flay (Shadow 2, new) | +10/20% MF damage, +5/10 yd | gs multiplies it; fs adds it with other damage modifiers |
| Twin Disciplines (Discipline 5, new) | +1%/point damage of instant spells | gs: every instant priest spell (incl. MF, SWD, Penance, Starshards). fs/ms (client masks): SWP, DP, Holy Nova, Chastise only |
| Power in Light (Discipline 5, new) | +2%/point Smite and Penance while your Holy Fire DoT is on the target | |
| Searing Light (Holy 2, redesigned) | +2/5% Holy damage; each Holy Fire tick has 5/10% to grant Holy Purpose (1284536, spell_holy_holynova): next Holy Nova free, 10 s | |
| Holy Specialization / Holy Precision | +1%/point Holy crit / +6%/point Holy hit | |
| Inner Focus crit | +25% on the next non-periodic spell | gs: Smite, MB, HF, Holy Nova, Penance. ms: also MF and Starshards (channels are not periodic in client 70170). fs (1 Oct): all but MF, SWD, Starshards |
| Early Demise (Shadow 2, new) | +15/30% SWD crit at or below 20% target health | 1 Oct: no longer always on |
| Improved Mind Blast / Improved SWP | -0.5 s per point MB cooldown / +3 s per point SWP | |
| Mental Agility / Devouring Contagion / Meditation / Mental Strength | -3/7/10% cost / -25/50% DP cost / 17/33/50% regen while casting / +3%/point Int | |
| Spirit Tap (Shadow 5) | 20%/point on a kill (or when your VE target dies): +100% Spirit and 50% casting regen for 15 s (15271, spell_shadow_requiem) | Never on an endless dummy |
| Blackout (Shadow 5) | 2%/point: 3 s stun (15269) | Bosses immune |
| Martyrdom / Twilight Focus | Focused Casting (27828) after a crit taken / 23/47/70% no pushback | Need an attacking dummy |
| Vampiric Embrace / Devouring Plague heals | 20% of your Shadow damage to the party / DP damage to you | Healing only |
| Shadowfiend Mana Leech (401988) | +5% max mana per landed Shadowfiend attack (~10 swings in 15 s) | Only if Shadowfiend is trainable |
| Touch of the Grave (Undead, 1260201) | 10% per spell, 1 s ICD: drain 5% of your max health (Shadow, no crit) | gs ranked: ~10 DPS. 24 Sep: SWP triggers it on cast, not on ticks |
| Judgement of the Crusader (raid, 20303, spell_holy_holysmite) | +161 Holy damage taken, x each spell's coefficient: Smite +115, Holy Fire +121 + 8 per tick, Penance bolt +31 | Raid debuff for Smite |
| Curse of the Elements (raid, 1311680, warlock_curse_shadow) | +10% Arcane, Fire, Frost, Holy, Nature, Shadow; -75 resistance | Forever merged Curse of Shadow into it |
| Judgement of Wisdom (raid, 20355) | 59 mana, 50% per landed spell or hit (gs) | Mana toggle |

Not in Forever: Surge of Light, Misery, Vampiric Touch, Improved Vampiric Embrace, Force of Will. No priest proc has an internal cooldown except Touch of the Grave (1 s) and Shadowguard (3.5 s). Shadow Weaving's only cooldown is its 15 s duration.

## Talents

Talent strings use gs's order (`ui/core/talents/trees/priest.json` = `sim/priest/priest.go` sizes 18/17/18 = fs = ms): **Discipline 18, Holy 17, Shadow Magic 18**. Each row needs 5 points per row above it, and prerequisites must be maxed. **New in Forever** in bold; renamed in italics. Per-rank values, icons and Forever spell ids are in the JSON, with `talents.tsSnippet`.

- **Discipline**: **powerInLight** 5, wandSpecialization 2, **twinDisciplines** 5, silentResolve 3, **holyPrecision** 3, improvedPowerWordShield 3, martyrdom 2, mentalAgility 3, innerFocus 1, meditation 3, improvedInnerFire 3, mentalStrength 5 (Int %), **soulWarding** 1 (needs Imp PW:S), improvedManaBurn 2, **penance** 1, **renewedHope** 5 (needs Soul Warding), **divineAegis** 3, powerInfusion 1 (needs Penance).
- **Holy**: *twilightFocus* 3 (was Healing Focus), improvedRenew 3, holySpecialization 5, spellWarding 5, divineFury 5, holyNova 1, blessedRecovery 3, inspiration 3, holyReach 2, improvedHealing 3, searingLight 2 (needs Divine Fury), **bindingHeal** 1, **litanyOfLight** 2, spiritOfRedemption 1, spiritualGuidance 5, spiritualHealing 3, **prayerOfMending** 1 (needs Spirit of Redemption).
- **Shadow Magic**: shadowFocus 5, blackout 5, spiritTap 5, shadowAffinity 3, improvedShadowWordPain 2, shadowReach 2, improvedMindBlast 5, improvedPsychicScream 2 (needs Blackout), mindFlay 1, **improvedMindFlay** 2 (needs Mind Flay), improvedFade 2, vampiricEmbrace 1, shadowWeaving 3, silence 1, **devouringContagion** 2, **earlyDemise** 2, darkness 5, shadowform 1 (needs Vampiric Embrace).

Removed: Unbreakable Will (into Silent Resolve), Improved Power Word: Fortitude, Divine Spirit (baseline), Force of Will, Improved Prayer of Healing, Lightwell, Improved Vampiric Embrace.

Values that change the rotation or the numbers (per rank, from gs's tree):

| Talent | Per rank | At max | Rotation effect |
|---|---|---|---|
| Power in Light | 2% | 10% | Smite and Penance while your Holy Fire burns |
| Twin Disciplines | 1% | 5% | instants (scope disputed, see procs) |
| Holy Precision / Shadow Focus | 6% / 1% hit | 18% / 5% | Holy capped / Shadow needs 11% gear hit |
| Mental Agility | 3/7/10% | 10% | Smite, Holy Fire, instants cheaper |
| Inner Focus | - | free + 25% crit | every 3 min |
| Meditation | 17/33/50% | 50% | regen while casting |
| Mental Strength | 3% Int | 15% | mana and crit |
| Penance | - | 3 bolts | 12 s cooldown |
| Power Infusion | - | +20% / 15 s | every 3 min, 275 mana |
| Holy Specialization | 1% crit | 5% | Holy spells |
| Divine Fury | 0.1 s | 0.5 s | Smite 2.0 s, Holy Fire 3.0 s |
| Searing Light | 2/5% dmg, 5/10% proc | 5% / 10% | free Holy Nova after Holy Fire ticks |
| Spiritual Guidance | 1/3/5/6/8% of Spirit as damage | 8% | healing 5%/point |
| Improved SWP | +3 s | +6 s | SWP 24 s |
| Improved Mind Blast | 0.5 s | 2.5 s | MB every 5.5 s |
| Improved Mind Flay | 10%, +5 yd | 20%, +10 yd | MF 30 yd |
| Shadow Weaving | 33/67/100% | 100% | 5 stacks x 2% |
| Devouring Contagion | 25% cost | 50% | DP cheaper |
| Early Demise | +15% SWD crit | +30% | at <= 20% target health |
| Darkness | 2% | 10% | all Shadow |
| Shadowform | - | +10% / -50% / 2.0x | permanent form |

## Builds

| Build | Split | Talent string (gs order) | Sim result |
|---|---|---|---|
| **gs Shadow** (UI default and ranked) | 18/0/33 | `305030001303--504020501201302251` | Troll 826, Undead 833, Human 825, Dwarf 831, NE 831, Gnome 828 DPS (0 mana-limited s) |
| gs/fs/ms "Shadow 15/0/36" (community build; gs regression golden) | 15/0/36 | `0253000311--550022501201302251` | fs/ms naked-gear tests only |
| fs/ms "Shadow" (fs UI default) | 20/0/31 | `005300231303--505120501201300051` | - |
| **gs Smite 31/17/3** (UI default and ranked; community build) | 31/17/3 | `515030031305001031-00505023002-003` | Troll 444, Undead 464, Human 447, Dwarf 444, NE 445, Gnome 455 DPS (mana-limited 32-41 s) |
| gs/fs/ms "Smite" (launch) | 31/20/0 | `515330031305001001-30505113002` | - |
| MythicSim tier list | 18/0/33 Shadow; 21/23/7 Smite | (string not public; build pages need `/api/`) | Shadow 660 (B), Smite 581 (B, "Experimental"); 2 min, raid buffs, dungeon/crafted gear |
| **Smite hybrid (ours)** | 21/23/7 | `505030031300001-305051102120003-50002` | not simmed; for practising Smite + Holy Fire + Mind Blast + SWP |

gs results: 300 s, raid buffs, consumables, modeled ilvl-65 gear and Tier 1 bonuses (`docs/modelled_build_reviews.md`). All 6 strings decode cleanly on gs's tree (row and prerequisite checks pass). Contents:
- **Shadow 18/0/33**: Power in Light 3, Twin Disciplines 5, Holy Precision 3, Inner Focus, Meditation 3, Mental Strength 3 / Shadow Focus 5, Spirit Tap 4, Improved SWP 2, Improved MB 5, Mind Flay, Improved MF 2, VE, Shadow Weaving 3, Devouring Contagion 2, Early Demise 2, Darkness 5, Shadowform. (gs: 2/2 Early Demise is paid with Intellect points.)
- **Shadow 15/0/36**: Wand Spec 2, Twin Disciplines 5, Silent Resolve 3, Mental Agility 3, Inner Focus, Meditation 1 / Shadow Focus 5, Blackout 5, Imp SWP 2, Shadow Reach 2, Imp MB 5, Mind Flay, Imp MF 2, VE, Shadow Weaving 3, Devouring Contagion 2, Early Demise 2, Darkness 5, Shadowform.
- **Shadow 20/0/31 (fs)**: Twin Disciplines 5, Silent Resolve 3, Martyrdom 2, Mental Agility 3, IF, Meditation 3, Mental Strength 3 / Shadow Focus 5, Spirit Tap 5, Shadow Affinity 1, Imp SWP 2, Imp MB 5, MF, Imp MF 2, VE, Shadow Weaving 3, Darkness 5, Shadowform.
- **Smite 31/17/3**: Power in Light 5, Wand Spec 1, Twin Disciplines 5, Holy Precision 3, Mental Agility 3, IF, Meditation 3, Mental Strength 5, Penance, Divine Aegis 3, Power Infusion / Holy Spec 5, Divine Fury 5, Blessed Recovery 2, Inspiration 3, Searing Light 2 / Spirit Tap 3. About 11 points are fillers that do nothing on a dummy (Divine Aegis, Inspiration, Blessed Recovery, Spirit Tap).
- **Smite 31/20/0**: as above without Divine Aegis and Spirit Tap, plus Silent Resolve 3, Twilight Focus 3, Holy Nova, Blessed Recovery 1.
- **Hybrid 21/23/7 (ours, sim-provisional)**: Power in Light 5, Twin Disciplines 5, Holy Precision 3, Mental Agility 3, IF, Meditation 3, Penance / Twilight Focus 3, Holy Spec 5, Divine Fury 5, Holy Nova, Blessed Recovery 1, Holy Reach 2, Improved Healing 1, Searing Light 2, Spiritual Guidance 3 / Shadow Focus 5, Improved SWP 2. It drops Power Infusion and Mental Strength in exchange for Shadow hit on Mind Blast and SWP, longer SWP and 36 yd Smite. It only mirrors MythicSim's 21/23/7 split; that build's actual string is unknown.

## Suggested ability (priority lists)

**gs Shadow, ranked (death_first_adaptive)**: Shadowform at -1.5 s; cooldowns; **SWD**; DP if not ticking; SWP if not ticking (and >= 10 s left); Inner Focus + Mind Blast; Mind Blast; **Mind Flay**, clipped after >= 2 ticks if MB or SWD is castable, or DP or SWP is missing and castable. **gs UI default (p1)**: DP, SWP, SWD, IF + MB, MB, full Mind Flay. **fs/ms Shadow**: Shadowform at -1 s; SWP if not ticking (>= 10 s left); Inner Focus + DP; DP (ms only: fs casts DP just with Inner Focus, once per 3 min); MB; SWD; full Mind Flay. No sim casts VE or Silence.

**gs Smite, ranked**: Holy Fire r8 at -3 s; cooldowns (Power Infusion); Penance only as a finisher (<= 2.5 s left; Undead never); **Holy Fire when its DoT has < 3 s**; Inner Focus + Smite; **Smite**. Routine Penance was removed on 8 Oct (+21-29 DPS, mana). **fs Smite**: Holy Fire at -3 s; Holy Fire < 3 s; IF + Smite; Penance r4 on cooldown; SWP if missing and mana >= 30%; Smite r8 at mana >= 20%, else Smite r7. **ms Smite**: as fs with Penance r3; the `smite_lowrank_mindblast` variant adds SWD in execute, then SWP (>= 30%), **Mind Blast at mana >= 30%**, Smite r8 (>= 40%), Smite r2 below.

**Practice-yard hints** (no fight-length checks, since the dummy never dies):
- **Shadow**: Shadowform before the pull (550 mana). Keep **SWP** ticking: recast it right after its last tick, never early, because a recast restarts it and loses the pending tick (24 s with Imp SWP). **DP** whenever it is off cooldown (60 s cd, 24 s DoT). **SWD** on cooldown; it costs 224 health per cast on the dummy, so skip it below ~30% health if the yard tracks health. **Mind Blast** on cooldown (5.5 s); spend Inner Focus on MB (its crit does not help DoTs) or on DP (saves 246 mana). **Mind Flay** fills: let it tick at least twice, then clip right after a tick only when MB or SWD is ready or a DoT fell off; never cut mid-tick, which loses the rest of the tick (or deals a partial tick on the beta, #21). After a cast, five landed Shadow spells build 5 Weaving stacks; any Shadow spell within 15 s keeps them. Stand at <= 30 yd (Imp MF 2/2), or 20 yd without it. Potion or rune at ~40% mana; Undead: Dark Sacrifice once you are 1,600 mana short.
- **Smite**: Holy Fire at -3 s (3.0 s cast). Recast Holy Fire when its DoT has < 3 s left, so it lands as the old one ends and Power in Light never drops. Power Infusion + Inner Focus + Smite together every 3 min. SWP when missing (fs/ms). **Mind Blast on cooldown while mana > 30%** (our recommendation; ms variant). Smite as filler. Penance is a cooldown filler only when mana is plentiful (gs dropped it). A free Holy Nova (Holy Purpose) is worth a GCD only when you stand within 10 yd. Under ~20% mana, stop optional spells first: MB, SWP, then Penance.
- **Hybrid 21/23/7**: as Smite, minus Power Infusion; SWP lasts 24 s and MB hits on the Shadow table with +5% hit.

**Clipping and refresh math** (Shadow 18/0/33 sheet, see worked examples): Mind Flay is worth ~280 damage per second of channel. Mind Blast is worth ~516 per cast-second and SWD ~480 per GCD-second. So a ready MB or SWD beats the next MF tick, but only once the current tick has landed. A tick lands every 1.0 s, and the GCD after MF ends at 1.5 s. The earliest useful clip is therefore right after tick 2 (2.0 s): you lose tick 3 (~263) to cast MB ~1 s sooner. gs found this roughly break-even, so the yard should accept both styles and only flag mid-tick clips (a whole tick lost). SWP: one recast restarts the 24 s timer. Recasting with 3 s left wastes the pending tick (~221) plus 235 mana, so recast only after the last tick. Holy Fire is the exception: recast with < 3 s left, because the 3.0 s cast lands as the old DoT ends, and Power in Light (+10% Smite) needs the DoT up.

## Default stats

There is no confirmed level-60 Forever gear. gs's UI default gear uses **real items**, the same for both specs except two slots: Bloodvine Goggles, Chains of the Lich, Mantle of the Timbermaw, **Fel Cape** (Shadow) / **Hide of the Wild** (Smite), Bloodvine Vest, **Netherpearl Cuffs** (+13 Shadow) / **Netherlight Cuffs** (+13 Holy), Gloves of Spell Mastery, Belt of the Archmage, Bloodvine Leggings, Earthen Silk Slippers, Blackstone Ring, Electrocutioner Lagnut, Frozen Heart of the Mountain (use: +29 Shadow and Frost for 15 s, 5 min) and Molten Heart of the Mountain, **Persuader 89-167 @ 2.8** (a mace), Truesilver Conduit, **Brilliant Wand 33-62 @ 1.2**. No enchants. The Bloodvine 3-piece needs Tailoring; the default professions are Engineering and Enchanting, so it is off. Defaults: race Troll, channel clip delay 100 ms, distance 20 yd; Brilliant Wizard Oil, Flask of Supreme Power, Greater Arcane Elixir, Elixir of Shadow Power (Shadow), Major Mana Potion, Demonic Rune; raid buffs AI, Divine Spirit, GotW, Mana Spring, Moonkin, Blessing of Wisdom; debuff Judgement of Wisdom.

| Preset (Troll, our derived unbuffed sheet) | Shadow SP | Holy SP | Spell crit | Hit (Shadow / Holy) | Int / Spi | Mana | MP5 | Health | Regen in / out of FSR |
|---|---|---|---|---|---|---|---|---|---|
| Shadow 18/0/33 | 206 | 178 | 11.4% | 12.9% / 25.9% | 214 / 145 | 4,301 | 9 | 2,237 | 14.0 / 26.2 mana/s |
| Shadow 15/0/36 | 206 | 178 | 11.1% | 12.9% / 7.9% | 196 / 145 | 4,036 | 9 | 2,237 | 5.9 / 26.2 |
| Smite 31/17/3 | 192 | 205 | 10.8% (Holy 15.8%) | 7.9% / 25.9% | 237 / 145 | 4,650 | 9 | 2,157 | 14.0 / 26.2 |
| Hybrid 21/23/7 | 192 | 205 | 10.3% (Holy 15.3%) | 12.9% / 25.9% | 206 / 145 | 4,186 | 9 | 2,157 | 14.0 / 26.2 |

Items total (Shadow set): SP 169, Shadow +28, spell damage +9, Int 80, Spirit 19, Stamina 51, MP5 9, hit 7.9%, crit 7%. The Smite set has Holy +13 and spell damage +23 instead, and crit 6%. Priest level-60 base in gs: health 1,397, mana 1,376, Str 35, Agi 40, Sta 50, Int 120, Spi 125; base spell crit 0.8%. Race offsets: Troll +1/+2/+1/-4/+1, Undead -1/-2/+1/-2/+5, Dwarf +2/-4/+3/-1/-1, Night Elf -3/+5/-1/0/0, Gnome -5/+3/-1/+3/0, Human 0 (Str/Agi/Sta/Int/Spi). The "Regen out of FSR" column includes MP5.

**gs ranked gear** (modeled ilvl 65, items only, before enchants): Shadow (Undead) SP 125 + Shadow 157, Int 131, Sta 214, hit 10.6%, crit 16.5% (231 rating); one-hand mace 76-142 @ 2.3, held off-hand, wand 49-92 @ 1.5. Smite (Undead) SP 358, Int 218, Sta 213, hit 9.8%, crit 10.3%; dagger 66-123 @ 2.0. In combat gs adds Arcane Brilliance +31 Int, Gift of the Wild +16 stats, Divine Spirit +40 Spirit, Kings +10% stats, Moonkin +3% spell crit, Blessing of Wisdom 40 MP5.

**Suggested round demo sheets:** **Shadow** 450 Shadow SP, 13% crit, 8% gear hit, Int 280 / Spi 200, 5,500 mana, 10 MP5. **Smite** 400 Holy SP (380 Shadow), 12% crit (+5% Holy Spec), 8% gear hit, Int 300 / Spi 200, 6,000 mana.

## Worked examples

Shadow 18/0/33 Troll sheet (Shadow SP 206, crit 11.4%, miss 4.1%), unbuffed, with Shadowform x1.10, Darkness x1.10, 5 Weaving stacks x1.10 (x1.331 total), crit 2.0x, partial resist x0.94 where non-binary:
- **Mind Blast**: 490.5 + 0.429 x 206 = 578.9 -> **724** (crit 1,449); 774 on average. 175 mana, 1.5 s, every 5.5 s.
- **Mind Flay**: tick 130 + 0.167 x 206 = 164.4 x1.20 (Imp MF) x1.331 = **263** (gs 276 with Twin Disciplines), crit 525; full channel 788 (gs 827), ~842 on average. 103 mana.
- **SWP tick**: 127 + 0.2 x 206 = 168.2 x1.05 (Twin Disciplines) x1.331 x0.94 = **221** (crit 442); 8 ticks = 1,768 (~1,969 with crits). 235 mana.
- **DP tick**: 106 + 0.1 x 206 = 126.6 -> **166**; 1,331 over 24 s (~1,482 with crits), and it heals that much. 246 mana (fs/ms) or 0 (gs).
- **SWD**: 458 + 88.4 = 546.4 -> **684** (gs 718 with Twin Disciplines); crit 1,436 in gs (2.0x) or 1,025 in fs (1.5x). 170 mana and 224 health.

Smite 31/17/3 Troll sheet (Holy SP 205, Holy crit 15.8%, hit capped: 1% miss), crit 1.5x, Searing Light x1.05, Power in Light x1.10, partial x0.94:
- **Smite**: 176.5 + 0.714 x 205 = 322.9 -> **351** (crit 526); 374 on average = **187 per cast-second**. 252 mana, 2.0 s.
- **Holy Fire**: 208 + 0.75 x 205 = 361.8 -> **357** (crit 536), then 15 + 0.05 x 205 = 25.25 -> **24.9 per tick** x5 = 125 over 10 s. 514 per 3.0 s cast on average. 230 mana.
- **Penance** (8 Oct values): bolt 92 + 0.19 x 205 = 130.9 -> **142** (gs 149 with Twin Disciplines); 3 bolts = 427 (448). 385 mana (gs 347 with Mental Agility).
- **Mind Blast in the Smite build** (Shadow SP 192, no Shadow talents, 9.1% miss): **538** per hit, 516 on average = **344 per cast-second**, 1.47 damage per mana (Smite 1.49). **SWP** there: 979 over 18 s for 423 mana (2.22 per mana). Free **Holy Nova**: 206 per enemy within 10 yd.
- **Mana per minute**: gs ranked Shadow spends MF 1,421, MB 1,190, SWD 679, SWP 570, Shadowform 110 = **3,970** (DP free in gs; +246 with the fs cost). Income: regen 1,614, JoW 875, rune 587, potion 357, Dark Sacrifice 320. gs ranked Smite spends Smite 4,626, Holy Fire 1,252, PI 99 = **5,977**. Income: regen 1,713, rune 720, potion 720, JoW 707, Dark Sacrifice 320. On a solo dummy the UI sheets regain ~839/min in combat: **4,301 mana lasts ~80 s for Shadow, 4,650 lasts ~55 s for Smite**. Toggles: JoW ~700-875/min, Blessing of Wisdom 480/min, Mana Spring (improved) 375/min, Shadowfiend ~2,150 per 5 min (if it exists).

## Where the sources disagree

| Question | gs | fs (1 Oct) | ms (10 Oct) | Forever source |
|---|---|---|---|---|
| Shadowform crit on SWD | yes (all Shadow) | no | yes | client mask (70124): MB, MF, SWP, DP, Mana Burn |
| Inner Focus crit | Smite, MB, HF, HN, Penance | all but MF, SWD, Starshards | all but SWP, DP, SWD (MF yes) | Blizzard 1 Oct: not on periodic |
| DP ticks crit | yes | no (old flag) | yes | Blizzard 1 Oct: yes |
| Twin Disciplines / Mental Agility on MF, SWD, Penance | yes | no | no | client masks support fs/ms |
| Mind Flay haste | spell-haste stat only | none | none | - |
| DP cost in Shadowform + Contagion 2/2 | 0 (additive) | 246 | 246 | different aura types: multiplicative likely |
| Penance r4 bolt / mana | 92 at 0.19 / 385 | 131 at 0.285 / 355 | r3 180 / 270 cast | Wowhead (8 Oct): r4 92, 385; r3 72 |
| Shadowfiend | not modelled | optional | optional | in client; trainer unknown |

## Engine gaps (what the practice yard does not cover yet)

The engine already has `Ability.channel` (per-tick `onTick`, cost and GCD at the start, clipped by the next GCD spell, broken by movement, clips counted), aura `stacks`, DoT restart on recast, absorbs (Power Word: Shield), `schoolTaken` and `schoolBonusTaken` debuffs (Curse of the Elements, Judgement of the Crusader), `castHaste` with a 1 s GCD floor and the five-second rule through `spec.regen`. The priest still needs:

1. **Channel haste off by default**: `startChannel` divides the channel by `castHaste()`, so Berserking would speed up Mind Flay. Forever sims do not (gs's Berserking/Arcane Missiles evidence). Add `channel.hasted?: boolean`.
2. **No channel start while moving**: `blocker` only checks `castTime > 0`, so a channel can start on the move.
3. **A tick at the start of a channel** (Penance's first bolt at 0 s).
4. **Hit rolled once per channel**: a missed Mind Flay must not tick. `use` runs first, but it needs a way to cancel the channel.
5. **Optional partial last tick when clipped** (beta #21), and an option to stop channels from being queued (#230).
6. **A stacking personal debuff**: Shadow Weaving adds a stack and refreshes 15 s per landed Shadow spell. `applyAura` replaces the aura, so a small `addStack(target, id, max, duration)` helper is needed. Show it on the target, not in the raid list.
7. **Spell power by school**: priest gear has Shadow-only and Holy-only power (Elixir of Shadow Power +40, Frozen Heart +29 Shadow), but `Stats.spellPower` is a single number.
8. **School-specific hit and crit**: Shadow Focus and Holy Precision for hit, Holy Specialization for crit (`totalHit()` is shared; paladin's `extraHit` pattern works at spec level).
9. **Per-spell crit multiplier**: 2.0x for Shadowform's spells (`rules.spellCritMultiplier` is global).
10. **Cost stacking**: Shadowform's school discount multiplies the additive talent discounts. Inner Focus makes the next spell free; Holy Purpose makes the next Holy Nova free.
11. **Self-damage and self-healing on a DPS spec**: SWD backlash, Dark Sacrifice, DP and VE healing, Touch of the Grave. Needs a player health bar without the attacking dummy.
12. **An execute toggle** ("dummy below 20%") for Early Demise.
13. **A temporary pet** (Shadowfiend: 15 s, 1.5 s swings, 5% max mana per hit). The hunter pet code could serve, if the spell turns out to be trainable.
14. **A form state** for Shadowform: it blocks healing spells and Penance; the look can be cosmetic.
15. **Raid list additions**: Judgement of the Crusader (+161 Holy), Divine Spirit (+40 Spirit), Arcane Intellect (+31 Int), Power Infusion from another priest. Optional: a wand auto-repeat (no spell-power scaling).

## What changed from Classic 1.12

- Shadow Weaving is personal, +2%/stack (was a 3%/stack raid debuff). Shadowform: +10% (was 15%), half-cost Shadow spells, 2.0x Shadow crits, castable non-healing spells, 40% base mana to enter.
- Shadow Word: Death (new, baseline at 32) and Devouring Plague (all races, 1 min cooldown) are baseline; Mind Flay 390 (was 426) at 0.167; SWP 762 at 0.2/tick; DP 0.1/tick; Darkness covers all Shadow damage.
- Vampiric Embrace: party healing, 30 s, 1 min cooldown. New talents: Improved Mind Flay, Devouring Contagion, Early Demise; Shadow Focus gives hit.
- Smite halved (166-187), Holy Fire halved (184-232 + 75); Holy damage built back by Power in Light, Searing Light (all Holy), Holy Precision, Mental Agility on Smite and Holy Fire. Penance and Twin Disciplines are new.
- Starshards doubled (1,800) with a 30 s cooldown; new priest racials Chastise, Dark Sacrifice, Divine Grace, Contingency Plan, Confounding Flash; Gnome priests.
- Periodic damage crits and updates with your stats; gear hit and crit count for spells; wands ignore spell damage; Divine Spirit and Improved Fortitude are baseline or gone.

## Provisional values (use them, but expect changes)

- Spirit regen 6.25 + Spi/8; gear MP5 per-second bug (#54); JoW 50% per spell.
- Average 6% partial resists on Shadow and Holy, Mind Flay binary; new resistance model (#81).
- Shadowform crit scope on SWD; Inner Focus on Mind Flay; Twin Disciplines and Mental Agility scope; DP cost stacking.
- Mind Flay haste; partial tick on clip (#21); channel queueing (#230).
- Penance r4 92 at 0.19 (8 Oct) vs older rows; Smite ranks 1-4 (8 Oct); downranking penalties.
- SWD script value 150 (PRI-001); Dark Sacrifice 1,600 vs 1,640 (+ Spirit).
- Shadowfiend availability and swing damage; all default gear, priority lists, DPS and our hybrid.

## Open questions

1. Does Shadowform's 2.0x crit cover Shadow Word: Death (gs/ms yes, client mask no)?
2. Does Inner Focus's crit apply to Mind Flay (ms yes, gs no)?
3. Do Twin Disciplines and Mental Agility cover Mind Flay, SWD and Penance?
4. Is Devouring Plague free in Shadowform with Devouring Contagion 2/2 (gs) or 246 mana (fs/ms)?
5. Is Shadowfiend trainable in Forever, and how hard does it hit?
6. Does Mind Flay speed up with any haste? Will clipping keep the proportional partial tick (#21)?
7. What does SWD's script value 150 do (PRI-001)?
8. Are Holy and Shadow partially resisted by bosses as in Classic (6%), or by a new model (#81)?
9. MythicSim's experimental Smite 21/23/7: what is its string, and does it cast Mind Blast?
10. Should Smite weave Mind Blast (1.8x per cast-second)? Neither gs nor fs does.
11. How does a recast DoT behave: Classic restart, or does it keep the pending tick?
12. Spirit regen and the five-second rule at 60; gear MP5 (#54).
