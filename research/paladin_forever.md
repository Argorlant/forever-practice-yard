# Paladin data sheet for WoW Forever (level 60 vs a level 63 dummy)

Research date: 10 Oct 2026. The machine-readable version is `paladin_forever.json` in this folder. Every number there has a source link and a confidence label. Covers Retribution, Protection (tank) and a Shockadin (Holy Shock damage hybrid). Holy healing is out of scope (its talents are listed only because talent strings need them).

## The five things that matter most

1. **Judgement no longer eats the seal.** Judgement (20271) is off the GCD, 10 s cooldown (8 s with Improved Judgement 2/2), costs 6% of base mana (91) and "does not consume the Seal". The seal still lasts 30 s. Judgements of Righteousness, Command and Fury now roll on the **melee table** (miss and 2.0x crit, never dodged/parried/blocked). Debuff judgements (Crusader, Wisdom, Light) last 40 s and **every landed melee strike refreshes them**.
2. **Seal twisting is a talent.** Twist of Light (Ret 31) makes seals 20% cheaper; replacing Seal of Command, Righteousness, Fury or Justice banks a one-charge **Echo** of the old seal that your next landed white swing also applies. The Ret loop swaps Command <-> Righteousness once per swing (1.5 s GCD per seal).
3. **Holy Strike is new and baseline**: 50% x (normalized weapon damage + 81-105) Holy, 20 mana, 10 s cooldown, 1.5 s GCD, melee table (can be dodged/parried). Consecration is baseline too (12 to all + 27 at 0.095 SP to the first 4 targets per tick, 8 ticks).
4. **Seal procs**: Seal of Command = 7 procs per minute (beta logs 6.75), 1 s ICD, white swings only, 70% weapon damage + 0.203 SP, 2.0x crit. Seal of Righteousness = 18.8 per 100 weapon speed x 1.2 (two-hand) / x0.85 (one-hand) + ~0.2 SP on every landed white swing, cannot miss. Slow two-handers win.
5. **Protection lives on blocks**: Righteous Fury +60% Holy threat, Holy Shield +30% block / 4 charges / 221 Holy per block, Redoubt +20% block, Shield Specialization 6% max mana per block (3 s ICD, no threat), Reckoning extra swings on block/crit (1.5 s ICD), Templar's Bulwark absorb = 100% max health. The practice dummy must swing at you. **Shockadin**: Holy Shock is a 21-point talent with a **10 s** cooldown (Classic 30 s); no sim models the build, so ours is a proposal.

## Sources

| Id | Source | Version read |
|---|---|---|
| gs | [gunba/wow-forever-sim](https://github.com/gunba/wow-forever-sim) (MIT) | commit `9c05fc8`, 9 Oct 2026. Client tables 1.60.1.70170; follows the 24 Sep, 1 Oct and 8 Oct notes |
| fs | [laurencestokes/foreversim](https://github.com/laurencestokes/foreversim) (MIT) | commit `255df16`, 1 Oct 2026. Same tree order as gs; a few talent values are pre-1-Oct (Redoubt 6%, Champion of the Light 33/66/100%, Iron Creed 3%) |
| client | Beta client spell rows in fs `sim/core/spelldata/spells_auto_gen.go` | build 1.60.1.70124 (Holy Shock ranks 2-4 missing; Wowhead used) |
| wowhead | Wowhead Forever tooltips (`nether.wowhead.com/forever/tooltip`) | 141 spell ids read 10 Oct 2026, incl. every icon name |
| blizzard | [Beta development notes](https://us.forums.blizzard.com/en/wow/t/wow-forever-beta-development-notes-%E2%80%93-updated-october-1/2360696) posts 1 (24 Sep, edited 8 Oct), 4 (1 Oct), 5 (8 Oct) | No paladin class deep dive found (the published ones cover Hunter/Druid and Priest/Warrior) |
| bugs | [forever-bugs](https://github.com/ClassicWoWCommunity/forever-bugs) #260, #232, #255, #64 | "AidanZMoon" replies read like a developer but are not flagged as Blizzard |
| magey | [magey/forever-warrior](https://github.com/magey/forever-warrior) #1 attack table, #24 armor | shared melee rules |
| secondary | Icy Veins, wow.gg, Kami Labs paladin pages | BlizzCon-demo era; not used for numbers. None has a Shockadin build. miao.tips **not read** (AI opt-out) |

Wowhead note: spell tooltips print scaling spells at the rank's maximum scaling level (Seal of Command 5 judgement 388-422 stunned, Righteousness 8 judgement 187-203, Holy Strike 97-121, Exorcism 491-545, Hammer of Wrath 489-538); the sims use the level-60 values (339-373, 170-186, 81-105, 474-530, 473-523). Wowhead **talent** tooltips print raw spell values that are stale for curve-based ranks (Iron Creed 30%/15%, Vengeance 5%, Champion of the Light 100%, Spiritual Focus 14%, Eye for an Eye 15%); this sheet uses gs's tree (client trait curves).

## Confidence labels

- **confirmed-forever**: Forever client data, a Wowhead Forever tooltip, Blizzard, or an in-game beta measurement (mostly levels 8-30; level-60 values datamined or extrapolated).
- **sim-provisional**: a choice made by one or both sims with no Forever source, or where they disagree.
- **classic-fallback**: Forever says nothing, so the Classic value is kept.

## Core rules

| Rule | Value | Confidence |
|---|---|---|
| GCD | 1.5 s: seals, Holy Strike, Consecration, Exorcism, Holy Wrath, Holy Shield, Holy Shock, Light's Vigil, blessings, auras, Righteous Fury. Hammer of Wrath 1.0 s (+1.0 s cast). Holy Strike and Hammer of Wrath ignore haste; other spell GCDs haste to 1.0 s in gs | confirmed (haste rule provisional) |
| Off the GCD | Judgement, Swift Judgement, Divine Favor, Templar's Bulwark | confirmed (client rows) |
| Melee table vs +3 | Single weapon, no dual wield: 8% miss (sims 9%), 6.5% dodge, 14% parry and 5% block from the front only, 40% glancing (sims 65% damage), crit -4.8% | confirmed |
| Crit damage | 2.0x for melee/ranged-table hits (white, seal procs, damage Judgements, Holy Strike, Hammer of Wrath); 1.5x for spell-table hits (Holy Shock, Exorcism, Holy Wrath, Holy Shield, Light's Vigil). No crit-damage talent | classic-fallback |
| Holy tables | Seal of Righteousness/Fury procs: crit only. Seal of Command proc: its own melee roll. Holy Strike: full melee special table. Holy Shock, Exorcism: 17% spell miss vs +3 (cap +16%). Consecration: hit roll per tick, no crit (gs). Holy Shield damage: never misses | confirmed |
| Partial resists | gs: average 6% on non-binary Holy damage vs +3, **including** melee-table seals and Holy Strike (in-game unknown, PAL-004). Binary: Exorcism, Judgement of Righteousness/Fury | sim-provisional |
| Spell crit suppression | none in gs | sim-provisional |
| Armor | A/(A+5500) on your white swings (3731 = 40.4%); all Holy damage ignores armor; boss vs you A/(A+5755) | confirmed |
| Mana | Pool 1232 + 15 x Int (base 1512). Spirit regen 6.25 + Spi/8 per s, only outside the five-second rule (gs; Classic paladin 7.5 + Spi/10). A paladin casts every GCD, so it is ~0 (30% with Reverence 3/3). MP5/5 per s | classic-fallback / provisional |
| Stats | AP = 160 + 2 x Str; 19.8 Agi = 1% crit and dodge; 60 Int = 1% spell crit; base crit 0.7% melee, 3.5% spell; block value = shield + Str/20; hit rating 10 = 1%, crit rating 14 = 1%; gear hit/crit count for melee and spells | classic-fallback / confirmed |
| Races | Human, Dwarf (Alliance); **Undead** (Horde, new). Human +2% crit with swords, Dwarf +1% with maces | confirmed |
| Target | Exorcism and Holy Wrath: Undead/Demon only. Hammer of Wrath: target <= 20%. Bosses ignore stuns/incapacitates (Hammer of Justice, Repentance, Seal of Justice, "stunned" Judgement of Command) | confirmed |

## Seals and Judgement

All seals: 30 s, 1.5 s GCD, one at a time. Judgement unleashes the current seal and leaves it up. Costs below are before talents (Benediction -2%/point on all instants, Twist of Light -20% on seals; gs adds them: 70% at 5/5 + talent, 65% with Libram of Invocation).

| Seal | Id | Icon | Mana | On white swing | Judgement (level 60) |
|---|---|---|---|---|---|
| Righteousness r8 | 20293 | ability_thunderbolt | 200 | 18.8/100 speed x speed x 1.2 (2H) / 0.85 (1H) + SP x ~0.2 (gs 0.2/0.22, fs 0.2/0.24); crit only | JoR 20286: 170-186 + 0.5 SP, binary, melee table |
| Command r5 (talent) | 20920 | ability_warrior_innerrage | 210 (r4 20919: 180) | 7 PPM (44% at 3.8 s), 1 s ICD: 70% weapon damage + 0.203 SP, own melee roll | JoC 20966: 169.5-186.5 + 0.429 SP (double base if stunned; r4: 155-168) |
| the Crusader r6 | 20308 | spell_holy_holysmite | 160 | +325 AP, swings 40% faster but 1/1.4 damage | JotC 20303: +161 Holy damage taken (x each spell's coefficient), 40 s |
| Wisdom r3 | 20357 | spell_holy_righteousnessaura | 200 | chance to restore 90 mana (PPM, rate unknown) | JoW 20355: 50% chance per hit on the target to give the attacker 59 mana, 40 s |
| Light r4 | 20349 | spell_holy_healingaura | 210 | chance to heal you 94 | JoL 20346: melee attackers healed 61, 40 s |
| Justice | 20164 | spell_holy_sealofwrath | 13% base (197) | 2 s stun chance (bosses immune) | JoJ 20184: cannot flee 10 s |
| **Fury r7 (new, tank)** | 20423 | spell_holy_retributionaura | 200 | 35 + 0.1 SP; with a shield, absorb = 50% of that damage | JoF 20414: 153-167 + 0.45 SP, **taunt 4 s** |

- **Echoes** (Twist of Light): Echo of Command 1311703 (ability_warrior_innerrage), Righteousness 1311704 (ability_thunderbolt), Fury 1311701 (spell_holy_retributionaura), Justice 1311705 (spell_holy_sealofwrath). One charge, no duration, spent by the next landed white swing, not by Judgements. Both sims let two different Echoes coexist (open, PAL-002). Classic batch-window twisting without the talent is modelled by neither sim.
- **Sanctified Judgement** refunds 20/40/60% of the *current* seal's cost on 33/66/100% of Judgements; since the seal is never consumed, every Judgement refunds.
- **One debuff Judgement per paladin**, refreshed by your melee. Whether a damage Judgement (Righteousness/Command) removes your own Wisdom/Crusader debuff is not stated (open question 1). Improved Seal of the Crusader is baked into the 161.
- Seal of Fury absorb: lifetime and replace-vs-stack unknown (gs: one pool, 30 s, provisional). Improved Seal of Fury returns 60 mana (+15% per attacker level, 87 vs a boss) when the absorb is used up; no threat (8 Oct). Power Word: Shield currently soaks first (bug #255, fix announced for 15 Oct).
- Twist cost reality: gs ranked Ret spends ~3,830 mana/min on seals.

## Abilities (max rank at 60)

Costs, cooldowns, GCDs and ranges are **confirmed-forever** (client rows and Wowhead) unless noted.

| Ability | Id | Icon | Mana | Cooldown | GCD | Effect at 60 |
|---|---|---|---|---|---|---|
| Judgement | 20271 | spell_holy_righteousfury | 6% base (91) | 10 s (8 talented) | none | Unleash the seal (see above); 10 yd |
| Holy Strike r8 (new) | 10333 | classicon_paladin | 20 | 10 s | 1.5 | 50% x (normalized weapon + 81-105) Holy; SP: gs 0.429 x 50%, fs full 0.429 (sims disagree). Shares cooldown with Hammer of the Righteous |
| Consecration r5 | 20924 | spell_holy_innerfire | 565 | 8 s | 1.5 | 8 ticks/1 s: 12 all + (27 + 0.095 SP) first 4 targets = 312 + 0.76 SP single target |
| Exorcism r6 | 10314 | spell_holy_excorcism_02 | 345 | 15 s | 1.5 | 474-530 + 0.429 SP, Undead/Demon only, 30 yd, binary |
| Hammer of Wrath r3 | 24239 | ability_thunderclap | 425 | 6 s | 1.0 | 1 s cast, 473-523 + 0.429 SP, target <= 20%, ranged table |
| Holy Wrath r2 | 10318 | spell_holy_excorcism | 805 | 60 s | 1.5 | 2 s cast, 490-576 + 0.19 SP to Undead/Demons in 20 yd |
| Holy Shield r3 (Prot 31) | 20928 | spell_holy_blessingofprotection | 240 | 10 s | 1.5 | +30% block 10 s, 4 charges, 221 + 0.08 SP per block, threat x1.2; needs a shield |
| Righteous Fury | 25780 | spell_holy_sealoffury | 30% base (454) | - | 1.5 | +60% Holy threat, 30 min |
| Templar's Bulwark (new) | 1311015 | ability_paladin_shieldofthetemplar | 110 | 5 min (4 with Sacred Duty) | none | Absorb 100% max health 8 s; Forbearance 1 min |
| Swift Judgement (new) | 1310994 | ability_paladin_judgementred | 0 | 60 s | none | Finishes Judgement's cooldown, next Judgement free |
| Holy Shock r4 (Holy 21) | 20930 | spell_holy_searinglight | 325 | 10 s | 1.5 | 334-362 + 0.429 SP Holy (or 307-333 heal), 20 yd, spell table |
| Light's Vigil r3 (Holy 31) | 1311595 | ability_paladin_judgementofthepure | 1340 (75% back) | 6 s | 1.5 | 1.5 s cast, 30 s mark: next Holy Shock no cooldown + 380-410 + 0.429 SP |
| Divine Favor (Holy) | 20216 | spell_holy_heal | 4% base (60) | 2 min | none | Next Holy Shock / Flash / Holy Light crits |
| Lay on Hands r3 | 10310 | spell_holy_layonhands | all mana | **20 min** | 1.5 | Heal = max health, target +550 mana |
| Divine Shield r2 | 1020 | spell_holy_divineintervention | 110 | 5 min | 1.5 | Immune 12 s, **-50% damage dealt** |
| Divine Protection r2 | 5573 | spell_holy_restoration | 35 | 5 min | 1.5 | Immune 8 s, cannot attack |
| Hammer of Justice r4 | 10308 | spell_holy_sealofmight | 100 | 60 s | 1.5 | Stun 6 s (bosses immune) |
| Repentance (Ret) | 20066 | spell_holy_prayerofhealing | 60 | 60 s | 1.5 | Humanoids only |
| Hammer of the Righteous | 407632 | ability_paladin_hammeroftherighteous | 6% base | 6 s | 1.5 | 3 x MH weapon DPS to 4 targets, 1H only. **Season of Discovery leftover**; fs has it, gs disables it (no trainer path shown) |

Blessings and auras: Blessing of Might 25291 (spell_holy_fistofjustice) **+133 AP** (Classic r7 185); Kings 20217 (spell_magic_magearmor) +10% stats, **baseline at 20**; Wisdom 25290 (spell_holy_sealofwisdom) 40 mp5; greater versions 25916 / 25898 / 25918 (spell_holy_greaterblessingofkings, spell_magic_greaterblessingofkings, spell_holy_greaterblessingofwisdom); **Blessing of Sanctuary removed**. Devotion Aura 10293 (spell_holy_devotionaura) +735 armor; Retribution Aura 10301 (spell_holy_auraoflight) 20 + 6% of the caster's SP (8 Oct); Concentration 19746 (spell_holy_mindsooth); Sanctity 20218 (spell_holy_mindvision) +10% Holy, no longer trained per gs. Forbearance 25771 (spell_holy_removecurse). Consumables: Major Mana Potion inv_potion_76, Demonic Rune inv_misc_rune_04.

## Procs and passives

| Name | Value | Notes |
|---|---|---|
| Vengeance (Ret, 3) | +1/2/3% Physical and Holy per stack, 3 stacks, 30 s, any non-periodic crit | 24 Sep. Seal and Holy Shock crits count. Buff 20050, ability_racial_avatar |
| Vindication (Ret, 3) | Every landed melee hit: target -68/136/204 AP, you +1/2/3% AP, 30 s | 100% chance. Debuff 440667 inv_gauntlets_29 |
| Seal of Command | 7 PPM, 1 s ICD | see seals |
| Reckoning (Prot, 5) | Extra swing: 8%/point on block, 20%/point when crit; shared 1.5 s ICD (8 Oct) | fs has no ICD. Extra swings trigger seals |
| Redoubt (Prot, 5) | 2%/point on any landed melee hit taken: +4%/point block, 10 s or 5 blocks | 1 Oct: was 6%/point (stored row and Wowhead still 30%) |
| Shield Specialization (Prot, 3) | Block value +10/20/30%; 33/66/100% on block: 6% max mana, 3 s ICD, no threat | |
| Iron Creed (Prot, 5) | Holy Strike threat +5%/point; with Righteous Fury Holy Strike gives -2%/point damage taken 6 s | gs (beta tooltips); fs 3%/point |
| Improved Righteous Fury (Prot, 3) | -2/4/6% damage taken with Righteous Fury up | no longer threat |
| Illumination (Holy) | heal crits only, 20%/point: 50% of base cost back | does nothing for damage |
| Eye for an Eye (Ret, 2) | 5/10% of crit damage taken reflected | gs does not simulate it |
| Touch of the Grave (Undead) | damage + heal proc (33 DPS in gs ranked Prot) | not researched further |

---

## Retribution

**Loop**: slow two-hander; seal up; Holy Strike and Judgement on cooldown; with Twist of Light swap Seal of Command <-> Seal of Righteousness once per swing so every swing carries both. gs swaps whenever the matching Echo is not banked (mana >= 15%); fs swaps only when the swing is < 0.4 s away. One seal per 3.8 s swing leaves ~1.5 free GCDs.

**Mana** (gs ranked, per minute): Judgement of Wisdom +2,816, Seal of Righteousness -2,011, Seal of Command -1,822, Consecration -1,226, potion +717, rune +660, regen +622, Judgement -588, Sanctified Judgement +573, Hammer of Wrath -212, Holy Strike -104 = **-575/min**. Without a raid Judgement of Wisdom: ~-3,400/min, dry in ~1.5 min. **The practice yard needs a "raid Judgement of Wisdom" toggle** (or let the player keep their own JoW if open question 1 allows it).

gs ranked damage (Undead, 1,058 DPS): Seal of Command 306, white 172 + 84 extra swings (raid Windfury), Seal of Righteousness 159, Holy Strike 83, Consecration 67, Judgement of Righteousness 51, Judgement of Command 46.

## Protection as a tank

Base it on the warrior's attacking dummy (`warrior_forever.md`):

1. **Swing** 2.0 s, parry haste; raw damage 3000 x (U(1, 1.333) + AP/2478), AP 805 (gs stress boss).
2. **Boss table** (level 63 vs 60): miss 4.4% + 0.04%/defense over 300; dodge, parry, block = yours - 0.6% (block +30% with Holy Shield charges, +20% Redoubt); crit 5.6% - 0.04%/defense; **crushing 15%** unless the rest fills 100%; hit. Blocked hits cannot crit or crush. No paladin crit-reduction talent: 440 defense removes crits.
3. **Example** (gs UI default sheet, defense 320): miss 5.2, dodge 4.4, parry 6.2, block 5.2 / **35.2 with Holy Shield** / 55.2 with Redoubt too, crit 4.8, crushing 15, hit 59.2 / 29.2 / 9.2%.
4. **Mitigation**: block value 64 off blocked hits, armor A/(A+5755), Improved Righteous Fury x0.94, Iron Creed x0.90 for 6 s, Templar's Bulwark absorb.
5. **Reactions per swing**: Holy Shield charge + 221 Holy, Reckoning swing, Redoubt roll, Shield Specialization mana, Seal of Fury absorb soak.
6. **Health bar** with healing (gs uses 2,500 HPS in its 3-attacker scenario) for Bulwark and Lay on Hands.
7. **Threat meter**: Holy x1.6 (Righteous Fury), Holy Shield x1.92, Holy Strike x2.0 (Iron Creed 5/5), white x1.0; mana 0.5 threat per point except Shield Specialization/Seal of Fury mana.

Holy Shield: 10 s duration and 10 s cooldown, so recast on cooldown for ~100% uptime; at 35-55% block the 4 charges outlast a 2.0 s boss. Mana (gs ranked, per minute): Consecration -3,596, Judgement of Wisdom +3,020, Shield Specialization +2,377, Holy Shield -1,296, Hammer of Wrath -620, Judgement -532, regen +453, seal -396, potion +354 = **-235/min**. gs ranked: Undead 613 DPS / 914 TPS / 699 DTPS, Human 599 / 917 / 696, Dwarf 586 / 894 / 698 (stress boss, not real balance). Re-casting an active seal every free GCD once cost gs 18,100 mana per 5 min: refresh only at <= 2 s.

## Shockadin (Holy Shock damage hybrid)

**Status**: no sim models it (no gs/fs preset, APL or gear; fs Holy presets are healers) and no guide publishes one (Kami Labs only speculates). Everything below is **sim-provisional**, our proposal.

**Holy Shock** (talent, Holy row 5 = 21st point): ranks 1311606 / 20473 / 20929 / 20930 at 30/40/48/56. Rank 4: **334-362 Holy + 0.429 SP**, 325 mana, **10 s cooldown** (Classic 30 s), instant, 1.5 s GCD, 20 yd vs enemies (Wowhead prints 20-40 yd), spell table (17% miss vs +3), 1.5x crit, icon spell_holy_searinglight. Forever added rank 1 and cut ranks 2-4 by ~10% (Classic r3 365-395). Heal branch 307-333 shares the cooldown.

What makes it work:
- **Holy Power 5/5**: +15% crit on Holy Shock and Holy Strike (+5% other spells). **Divine Favor**: guaranteed crit every 2 min, off the GCD.
- **Divine Precision 3/3** (needs Holy Shock): +18% hit for the Holy spell family, which alone caps Holy Shock's 17% miss and Holy Strike's 8%.
- Consecrated Ground 2/2 (+10% Holy on Consecration's first 4 targets), Improved Seals, Divine Strength/Intellect, Reverence (30% regen while casting).
- Vengeance (+9%) and Champion of the Light (60% of Int as spell damage) are only reachable with Holy 21 / Ret 30.
- **Not useful**: Illumination (heal crits only), Light's Vigil (1.5 s cast + 335 net mana for one extra Holy Shock; gs adds its 380-410 on top of Holy Shock, fs replaces it), Lasting Judgement (not in the Forever tree). **Infusion of Light** bug #260 currently adds +50% Holy Shock damage (fix announced for 15 Oct): do not model it.

| Proposal | Split | Talent string (gs order) | Notes |
|---|---|---|---|
| **Shockadin** | 31/0/20 | `5500301320013125--05223331001` | Divine Strength 5, Divine Intellect 5, Improved Seals 3, Voice of Truth 1, Reverence 3, Purifying Power 2, Divine Favor 1, Divine Precision 3, Holy Shock 1, Consecrated Ground 2, Holy Power 5 / Benediction 5, Improved Judgement 2, Holy Conduit 2, Conviction 3, Vindication 3, Sanctified Judgement 3, Seal of Command 1, Sacred Arbiter 1 |
| Shock-Ret hybrid | 21/0/30 | `55003013200101--0522513100133031` | Holy Shock as the 21st Holy point; keeps Vengeance, Two-Handed Spec, Champion of the Light, Instrument of Law 1; loses Twist of Light, Holy Power and Divine Precision |

**Mana** (31/0/20, per minute): Holy Shock -1,755, Judgement -614, seal -378, Holy Strike -108, Consecration (3 casts) -915, Divine Favor -27; Sanctified Judgement +851, Reverence regen +293 = **-2,650/min** (a 4,235 pool lasts ~1.6 min; ~2.4 min without Consecration). A raid Judgement of Wisdom adds ~+1,230/min. Practise it as a burst add-on.

**Damage split** (our estimate, 31/0/20 on the gs ranked Ret gear, unbuffed): white 3,935, Seal of Command 2,566, Judgement of Command 2,223, Holy Strike 2,335, Holy Shock 2,734, Consecration (3/min) 1,164 per minute = ~249 DPS; **~74% melee-triggered, ~26% spell** (Holy Shock ~18%). The Shockadin is a melee paladin with a 10 s nuke.

---

## Talents

Order used by talent strings (gs `ui/core/talents/trees/paladin.json`, identical to `proto/paladin.proto` and to fs): Holy 17, Protection 16, Retribution 17. Rows need 5 points per row above; prerequisites must be maxed. **New in Forever** (vs Classic 1.12) in bold. Ranks, icons, Forever spell ids and per-talent changes are in the JSON (`talents`, plus `talents.tsSnippet` with TREES / NAMES / NEW_IN_FOREVER for `src/specs/paladin/talents.ts`).

- **Holy**: divineStrength 5, divineIntellect 5, healingLight 3, spiritualFocus 2, **improvedSeals** 3 (+5/10/15% seals and their judgements), unyieldingFaith 2, **voiceOfTruth** 1, **reverence** 3, **purifyingPower** 2 (Exorcism/Holy Wrath -17/33%), **infusionOfLight** 2, illumination 5, divineFavor 1, **divinePrecision** 3, holyShock 1, **consecratedGround** 2, holyPower 5, **lightsVigil** 1.
- **Protection**: toughness 5, redoubt 5, precision 3 (hit for spells too), guardiansFavor 2, anticipation 5, **improvedSealOfFury** 1, improvedRighteousFury 3 (now damage reduction), shieldSpecialization 3, **sacredDuty** 2, **swiftJudgement** 1, oneHandedWeaponSpecialization 3 (3/7/10%), improvedHammerOfJustice 3, **templarsBulwark** 1, reckoning 5, **ironCreed** 5, holyShield 1.
- **Retribution**: deflection 5, benediction 5 (-2%/point all instants), improvedJudgement 2, **holyConduit** 2, conviction 5, vindication 3, **sanctifiedJudgement** 3, sealOfCommand 1, pursuitOfJustice 2, eyeForAnEye 2, **sacredArbiter** 1 (Holy Strike +20%), twoHandedWeaponSpecialization 3 (2/4/6%), vengeance 3, repentance 1, **championOfTheLight** 3 (20/40/60% Int -> spell damage), **instrumentOfLaw** 2, **twistOfLight** 1.

Removed: Improved Seal of Righteousness, Consecration (baseline), Improved Lay on Hands, Improved Blessing of Wisdom, Lasting Judgement, Improved Devotion Aura, Blessing of Kings (baseline), Improved Concentration Aura, Blessing of Sanctuary, Improved Blessing of Might, Improved Seal of the Crusader (baked in), Improved Retribution Aura, Sanctity Aura; beta-only Improved Holy Strike (removed 24 Sep) and Crusade (removed in client 70009). Purifying Power, Infusion of Light, Sacred Duty and Sanctified Judgement come from later expansions but are new to this Classic. fs strings decode on the current tree; only some fs talent *values* are pre-1-Oct.

## Builds

| Build | Split | Talent string (gs order) | Sim result |
|---|---|---|---|
| **Retribution** (gs default, ranked) | 13/7/31 | `55003-232-05225231001330301` | 1,058 / 1,051 / 1,053 DPS (Undead / Human / Dwarf) |
| Physical Ret (gs) | 13/7/31 | `52003003-232-05225031101330311` | 968 / 960 / 951 DPS |
| **Protection** (gs default, ranked Undead) | 0/42/9 | `-5520513321301551-15102` | 613 DPS, 914 TPS, 699 DTPS |
| Protection Human (gs) | 0/43/8 | `-5521513321301551-152` | 599 DPS, 917 TPS |
| Protection Dwarf (gs) | 0/42/9 | `-5520513321301551-15003` | 586 DPS, 894 TPS |
| fs "P4/P5 Ret" (fs default) | 18/0/33 | `550030022001--05225231001330321` | fs tests equip only a weapon: no usable DPS |
| fs "Retribution 9/0/42" | 9/0/42 | `51003--55225331201331321` | - |
| fs "P5 Prot" (fs default) / "P4 Prot" | 13/38/0 | `55003-5530513321301501` / `52003003-5530513321301501` | - |
| fs "Protection 0/45/6" | 0/45/6 | `-5532513321301551-15` | - |
| fs Holy healers (out of scope) | 35/16/0, 38/13/0 | `05321013025131251-503210302`, `25320213225131051-50323` | - |
| **Shockadin** (ours) | 31/0/20 | `5500301320013125--05223331001` | ~249 DPS unbuffed (our estimate) |
| Shock-Ret (ours) | 21/0/30 | `55003013200101--0522513100133031` | - |

All 14 strings were decoded and checked against row requirements and prerequisites on gs's tree.

- **Retribution 13/7/31**: Divine Strength 5, Divine Intellect 5, Improved Seals 3 / Toughness 2, Redoubt 3, Precision 2 / Benediction 5, Improved Judgement 2, Holy Conduit 2, Conviction 5, Vindication 2, Sanctified Judgement 3, Seal of Command 1, Sacred Arbiter 1, Two-Handed Spec 3, Vengeance 3, Champion of the Light 3, Twist of Light 1.
- **Physical Ret**: swaps Divine Intellect 3 and Vindication 2 for Reverence 3, Pursuit of Justice 1, Instrument of Law 1.
- **Protection 0/42/9**: Toughness 5, Redoubt 5, Precision 2, Anticipation 5, Improved Seal of Fury 1, Improved Righteous Fury 3, Shield Specialization 3, Sacred Duty 2, Swift Judgement 1, One-Handed Spec 3, Templar's Bulwark 1, Reckoning 5, Iron Creed 5, Holy Shield 1 / Deflection 1, Benediction 5, Improved Judgement 1, Conviction 2.

## Suggested ability (priority lists)

The gs paladin APLs have no fight-length checks. Hammer of Wrath needs an execute phase and Exorcism an Undead/Demon target, so on a plain endless dummy both never fire.

### Retribution (gs "Basic Ret", ranked)

0. Seal of Command **rank 4** (20919) at -1.5 s (the proc is identical at every rank).
1. Cooldowns when ready.
2. **Holy Strike**.
3. **Judgement** (off the GCD).
4. Seal of Command if the seal has <= 1 s.
5. **Seal of Righteousness** if mana >= 15%, no Echo of Command, Seal of Command active.
6. **Seal of Command** if mana >= 15%, no Echo of Righteousness, Seal of Righteousness active.
7. Hammer of Wrath (execute).
8. Consecration if mana >= 20%.

fs: Judgement; seal if none; twist only when the next swing is < 0.4 s away; Hammer of Wrath; Holy Strike; Consecration at >= 70% mana.

**Our hint**: Judgement whenever ready (weave it); Holy Strike on cooldown; in the last ~0.5 s before a swing cast the other seal if its Echo is not banked (skip under 15% mana); refresh the seal at <= 1-2 s; Consecration above 20% mana with raid JoW, 50% solo; potion/rune under ~40%.

### Protection (gs "Forever Protection", ranked)

0. Primary seal (Righteousness) at -3 s, Holy Shield at -1.5 s, Righteous Fury on.
1. **Judgement**. 2. Swift Judgement if Judgement has >= 6 s left. 3. Cooldowns.
4. Templar's Bulwark if health < 30%.
5. **Holy Shield** if <= 2 s left. 6. Seal if <= 2 s left.
7. **Consecration** if mana >= 30% (then again at >= 15%; the doc says rank 1 there, the shipped APL casts rank 5).
8. Hammer of Wrath (execute). 9. **Holy Strike**. 10. Holy Shield (filler).

fs "P5 Prot": Lay on Hands < 10%; Judgement while Seal of Righteousness is up; seal <= 1.5 s; Hammer of Wrath; Holy Strike; Holy Shield. **Our hint**: as gs, plus Lay on Hands under 10%; never re-cast an active seal to fill a GCD.

### Shockadin (ours)

Seal of Command up (refresh at <= 2 s); Judgement on cooldown; Divine Favor -> Holy Shock every 2 min; **Holy Shock** on cooldown; Holy Strike on cooldown; Exorcism on Undead/Demon dummies; Consecration only above ~60% mana; Hammer of Wrath in execute.

## Default stats

No real level-60 Forever gear is confirmed. gs's Ret UI default uses real Forever item ids; its Prot UI default and all ranked profiles use modeled ilvl-65 items; fs defaults to Classic pre-raid gear. Derived sheets = base + items + talents, no enchants or buffs (our calculation).

| Preset | Gear | Our derived unbuffed sheet |
|---|---|---|
| gs UI default Ret (Undead, 13/7/31) | Lionheart Helm, Chromatic Cloak, Timbermaw Tunic, Titanic Leggings, Blackstone Ring... **Blackfury 105-158 @ 2.1** (two-hand polearm), Libram of Invocation. Items: Str 141, Agi 63, Sta 65, AP 156, hit 6.9%, crit 7.0% | Str 269, Agi 126, **AP 855**, crit 19.1% (14.3% vs boss), hit 8.9%, Int 75, mana 2,354, spell damage 45, spell crit 11.7%, health 2,861 |
| gs ranked Ret (Undead) | Modeled Int/SP/crit and Str/crit/hit plate, spell two-hander **187-281 @ 3.8**, physical libram. Items: Str 146, Sta 220, Int 114, SP 138, AP 26, hit 14.4%, crit 13.3% | Str 275, **AP 736**, crit 22.4% (17.6% vs boss), hit 16.4%, Int 200, mana 4,235, **spell damage 258**, spell crit 20.1%, health 4,411 |
| gs UI default Prot (Human, 0/42/9) | Modeled Int/SP/crit and SP/crit/hit plate, **one-hand sword 68-102 @ 1.8**, hybrid shield 2,468 armor / 44 block value. Items: Sta 218, Int 99, SP 258, AP 50, hit 14.4%, crit 14.3% | Health 4,508, mana 3,767, armor 7,574 (8,309 with Devotion), defense 320, dodge 5.0%, parry 6.8%, block 5.8% (35.8% Holy Shield), block value 64, AP 420, SP 258, crit 22.5%, hit 16.4% |
| Shockadin (ours) | gs ranked Ret gear with 31/0/20 | AP 736, spell damage 138, spell crit 25.1% (Holy Shock 35.1%), melee crit 20.4%, hit 14.4% (Holy spells capped), mana 4,235 |

Suggested round demo sheets: **Ret** 1,000 AP, 22% crit, 9% hit, 250 spell damage, 4,500 mana, 190-285 @ 3.8. **Prot** 7,000 health, 8,000 armor, 320 defense, 6% dodge, 7% parry, 7% block, 70 block value, 600 AP, 250 SP, 4,000 mana, 70-105 @ 1.8 + shield. **Shockadin** 800 AP, 250 spell damage, 22% spell crit, 9% hit, 5,500 mana.

Paladin level-60 base: health 1,381, mana 1,512, Str 105, Agi 65, Sta 100, Int 70, Spi 75 (Undead Str 104, Agi 63, Sta 101, Int 68, Spi 80; Dwarf 107/61/103/69/74).

## Worked examples

Unbuffed gs ranked Ret sheet (AP 736, SP 258, 187-281 @ 3.8) and gs UI default Prot sheet (AP 420, SP 264); boss armor 3,731 (x0.596); x0.94 = gs average partial resist.

- **White swing (Ret)**: 234 + 736/14 x 3.8 = 434; x1.06 Two-Handed Spec = 460 -> **274** after armor (glancing 178, crit 548).
- **Seal of Righteousness proc**: 18.8 x 1.2 x 3.8 = 85.7 + 0.22 x 258 = 56.8 -> x1.15 Improved Seals x1.06 (gs) = **174** (163 after resists, crit 347; fs 170). Ignores armor.
- **Seal of Command proc**: (434 + 0.29 x 258) x 0.7 x 1.15 x 1.06 = **434** (408 after resists), 44.3% per swing.
- **Judgements**: Command (178 + 0.429 x 258) x 1.15 x 1.06 = 352; Righteousness (178 + 0.5 x 258) x 1.15 = 353 (binary).
- **Holy Strike**: normalized 234 + 736/14 x 3.3 = 408; gs (408 + 93 + 111) x 0.5 x 1.2 x 1.06 = **389** (365 after resists); fs adds the full SP: 433.
- **Consecration**: 39 + 0.095 x 258 = 63.5 per tick, 508 per 8 s, for 305 mana (gs; fs 283).
- **Judgement of the Crusader** (+161) adds per hit: SoR 35, SoC 33, Holy Strike 69, JoR 80, JoC 69, Consecration tick 15, Holy Shock 69.
- **Holy Shock (Shockadin)**: 348 + 0.429 x 138 = 407 (crit 611), 35.1% crit -> ~450 expected after resists.
- **Holy Shield block (Prot)**: 221 + 0.08 x 264 = **242** (crit 363); threat x1.2 x1.6 = 465.
- **Prot others**: white 91 after armor; SoR proc (1.8 one-hander) 18.8 x 0.85 x 1.8 + 0.2 x 264 = 81.6 x1.10 = 90 (threat 144); JoR 310 (threat 496); Consecration 513 per 8 s (threat 820); Holy Strike 200 (threat 400); Shield Specialization 226 mana per block.
- **Mana per minute**: twisting Ret -575 (gs ranked, with raid JoW, potions, runes), -3,391 without JoW; Prot -235; Shockadin 31/0/20 -2,650 without JoW.

## What changed from Classic 1.12

- Judgement keeps the seal, is off the GCD, 10 s, 6% base mana; damage Judgements use the melee table (2.0x crit).
- Crusader/Wisdom/Light judgements last 40 s and are refreshed by your melee; Improved Seal of the Crusader baked in (161).
- Seal twisting formalized by Twist of Light (Echoes, -20% seal cost).
- New baseline Holy Strike and Consecration (new two-part ticks); new Seal of Fury, Swift Judgement, Templar's Bulwark, Light's Vigil, Voice of Truth.
- Holy Shock: 21-point talent, 4 ranks, 10 s cooldown, ~10% weaker. Exorcism and Hammer of Wrath ~6% weaker. Holy Shield 221 at 0.08, 30% block.
- Righteous Fury +60% Holy threat (beta briefly 90%); Improved Righteous Fury = damage reduction; Instrument of Law lowers threat without RF.
- Redoubt on any landed hit (4%/point), Reckoning on block or crit with a 1.5 s ICD, Shield Specialization mana on block, Iron Creed.
- Vengeance 1/2/3% per stack x3 for 30 s on any non-periodic crit; Two-Handed Spec 2/4/6%; One-Handed 3/7/10%.
- Benediction on all instants; Precision gives spell hit; Conviction now boosts seal procs and Judgements.
- New: Champion of the Light, Holy Conduit, Sacred Arbiter, Sanctified Judgement, Consecrated Ground, Reverence, Divine Precision, Improved Seals.
- Blessing of Kings baseline, Blessing of Sanctuary removed, Blessing of Might 133 AP, Blessing of Wisdom 40 mp5, Sanctity Aura not trained.
- Lay on Hands 20 min; Divine Shield halves your damage; Retribution Aura 20 + 6% caster SP.
- Undead paladins; melee hit cap 8% (no suppression); gear hit/crit shared by melee and spells.

## Provisional values (use them, but expect changes)

- Seal of Righteousness SP formula and hand factors (PAL-001); Holy Strike SP inside the weapon %.
- Partial resists on melee-table Holy damage (PAL-004); spell crit suppression (none); 17% spell miss.
- Echo coexistence/consumption (PAL-002); Seal of Fury absorb lifetime (PAL-006); Seal of Wisdom/Light proc rates.
- Weapon specialization on seal procs (gs yes, fs no); Holy Power on seals (fs yes, gs no).
- Light's Vigil: adds to or replaces Holy Shock damage.
- Spirit regen (6.25 + Spi/8), MP5 rate, Judgement of Wisdom 50% chance.
- Default gear, priority lists, all DPS/TPS, and everything in the Shockadin section.

## Open questions

1. Does a damage Judgement (Righteousness/Command) remove your own Judgement of Wisdom/Crusader? If not, a solo Ret can open Seal of Wisdom -> Judgement and keep JoW up by meleeing.
2. Seal of Righteousness SP coefficient and two-hand factor at 60.
3. Holy Strike SP scaling (x50% or full 0.429); do melee-table Holy hits partially resist?
4. Can Echo of Command and Echo of Righteousness coexist? Do avoided swings spend them?
5. Seal of Command PPM at 60 (6.75 measured at 20); downranking penalties (gs casts rank 4).
6. Seal of Fury absorb lifetime/replacement; Power Word: Shield ordering (#255).
7. Iron Creed damage reduction per point (gs 2%, fs 3%, Wowhead raw 15% at max).
8. Light's Vigil enemy strike: extra or replacement damage?
9. Infusion of Light +50% Holy Shock (#260): confirm the 15 Oct fix before balancing a Shockadin.
10. Hammer of the Righteous: learnable or leftover (PAL-007)?
11. Seal of Wisdom / Light proc rates (not in the client).
12. Paladin Spirit regen and MP5 at 60.
13. Bosses parrying/blocking from behind when you stand close (beta known issue, 1 Oct).
14. Wowhead talent tooltips vs client curves (Vengeance 5%, Champion 100%, Purifying Power 50%, Eye for an Eye 15%).
