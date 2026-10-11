# Druid data sheet for WoW Forever (level 60 vs a level 63 dummy)

Research date: 10 Oct 2026. The machine-readable version is `druid_forever.json` in this folder. Every number there has a source link and a confidence label. Covers Feral Cat, Feral Bear (tank) and Balance. Restoration is out of scope (its talents are listed only because talent strings need them).

## The five things that matter most

1. **Tiger's Fury is gone** (1 Oct). The new Feral talent **Shifting Power** is the Forever "powershift": Cat Form only, costs 55% of base mana (684 at 60, the same as Cat Form), gives **+40 Energy**, 16 s cooldown (8 s with Improved Shifting Power 2/2, 7 s with Howling Idol), 1.0 s GCD, **cannot be used at full Energy**. Wolfshead Helm adds 5 Energy.
2. **Form auto attacks use your weapon's DPS** (Blizzard deep dive): a cat swings every 1.0 s for weapon DPS x 1.0 + AP/14, a bear every 2.5 s for weapon DPS x 2.5 + AP/14 x 2.5. Shred, Claw, Maul, Primal Bite and Lacerate use the same values.
3. **Bear rage is normalized** like the warrior's (measured in game): about **11.25 Rage per landed white swing**, +100% on a crit (8 Oct), nothing on miss/dodge/parry. A queued Maul's swing gives none. gs still uses the Classic damage-based formula, which gives about half.
4. **Balance** is a Wrath - Starfire - Starfire loop: Wrath (1.5 s talented, 30 mana) grants two Eclipse charges, each taking 0.5 s off one Starfire (3.0 s -> 2.5 s). Keep Insect Swarm and Moonfire up. Nature's Grace: a non-periodic spell crit gives +10% cast speed and -10% GCD for 3 s. DoT and bleed ticks can crit.
5. **Omen of Clarity is baseline** for every druid at 20: Clearcasting (15 s, one charge, 10 s internal cooldown) makes the next costed ability free, never Wrath. Its proc rate is the biggest open number: fs uses **2 procs per minute** from beta logs (about 3-4% per cat hit, 8% per bear hit); gs procs on the first eligible hit after the cooldown. Moonkin Form doubles the chance.

## Sources

| Id | Source | Version read |
|---|---|---|
| gs | [gunba/wow-forever-sim](https://github.com/gunba/wow-forever-sim) (MIT) | commit `9c05fc8`, 9 Oct 2026. Current tree (client 70170/70291) with Shifting Power |
| fs | [laurencestokes/foreversim](https://github.com/laurencestokes/foreversim) (MIT) | commit `255df16`, 1 Oct 2026. Pre-1-Oct Feral (Tiger's Fury, King of the Jungle), but carries the client rows |
| client | Beta client spell rows in fs `sim/core/spelldata/spells_auto_gen.go` | build 1.60.1.70124 |
| wowhead | Wowhead Forever tooltips (`nether.wowhead.com/forever/tooltip`) | read 10 Oct 2026 |
| blizzard | [Hunter and Druid deep dive](https://worldofwarcraft.blizzard.com/en-us/news/24301515) (30 Sep), [beta development notes](https://us.forums.blizzard.com/en/wow/t/wow-forever-beta-development-notes-%E2%80%93-updated-october-1/2360696) posts 1 (24 Sep), 4 (1 Oct), 5 (8 Oct) | |
| magey | [magey/forever-warrior](https://github.com/magey/forever-warrior) #1 attack table, #3 rage (includes a level-14 bear), #24 armor | |
| bugs | [forever-bugs](https://github.com/ClassicWoWCommunity/forever-bugs) #20, #54, #86, #121, #125, #127, #151, #208, #220, #307 and others | replies by "AidanZMoon" read like a developer but are not flagged as Blizzard |
| miao.tips | Feral site with a cat practice page | **Not read**: its robots.txt and ai.txt opt out of AI agents. Only the values you quoted are used, and every one of them matches the sources above |

Note on Wowhead: for spells that scale with level, the "Level 60" tooltip prints the value at the rank's maximum scaling level (Dire Bear 210 AP and 1,560 health, Starfire 364-426, Moonfire 136-157, Demoralizing Roar 207). The sims use the value at character level 60 (180, 1,240, 350-412, 128-151, 204).

## Confidence labels

- **confirmed-forever**: Forever client data, a Wowhead Forever tooltip, Blizzard, or an in-game beta measurement. Most measurements were taken at levels 8-30; level-60 numbers are datamined or extrapolated.
- **sim-provisional**: a choice made by one or both sims with no Forever source, or where the sims disagree.
- **classic-fallback**: Forever says nothing, so the Classic value is kept.

## Core rules

| Rule | Value | Confidence |
|---|---|---|
| Cat GCD | 1.0 s on every cat attack (Shred, Claw, Rake, Rip, Bite, Ravage, Pounce, Cower), not hasted | confirmed |
| Bear GCD | 1.5 s (Swipe, Primal Bite, Lacerate, Demoralizing Roar, Bash, Frenzied Regeneration), not hasted. Maul is on next swing | confirmed |
| Spell GCD | 1.5 s; non-physical spell GCDs scale with casting haste to a 1.0 s floor; Nature's Grace -10% | confirmed (haste rule provisional) |
| Shapeshift GCD | 1.5 s for Cat, Dire Bear and Moonkin Form, not hasted. Leaving a form is free and off the GCD in the sims | confirmed |
| Off the GCD | Berserk, Enrage, Dash, Prowl, Growl, Feral Charge, Maul | confirmed (client rows) |
| Shapeshift cost | Cat and Dire Bear 55% of base mana (684), Moonkin 35% (435). Natural Shapeshifter -10% per point (also Shifting Power) | confirmed |
| Melee table vs +3 | Same as the rogue sheet: 8% miss (no hit suppression in game; sims 9%), 6.5% dodge, 14% parry and 5% block from the front only, 40% glancing on white hits, crit -4.8%. Forms never dual wield | confirmed |
| Spell table vs +3 | 17% miss before hit, 1% floor (cap +16% hit); no spell crit suppression in gs; non-binary spells (Wrath, Starfire, Moonfire) lose ~6% on average to level-based partial resists; Insect Swarm and Hurricane are binary | classic-fallback |
| Crit damage | Physical 2.0x, abilities 2.2x with Natural Instinct 2/2 (not white hits). Spells 1.5x, 2.0x with Vengeance 5/5 | confirmed |
| Armor | A/(A + 5500) for your attacks. 3731 = 40.4%, 3226 with Faerie Fire = 37.0% | confirmed |
| Bleeds | Rake, Rip, Lacerate and Pounce ticks ignore armor | classic-fallback |
| Periodic crits | Client flag on Rake, Rip, Pounce, Lacerate, Moonfire, Insect Swarm: ticks can crit and re-read AP / spell power every tick | confirmed |
| Gear hit and crit | Count for melee and spells alike (14 rating per 1%) | confirmed |
| Stats | AP = -20 + 2 x Str (+1 x Agi in Cat only); 20 Agi = 1% crit and 1% dodge; 60 Int = 1% spell crit; base crit 0.9% melee, 1.8% spell, 0.9% dodge; 15 mana per Int; base mana 1,244, base health 1,483 | classic-fallback |
| Threat | Cat x0.71; Bear/Dire Bear x1.5 (8 Oct, was 1.3); 5 threat per Rage gained | confirmed |
| Forms | Immune to Disarm (1 Oct); potions, Thistle Tea, Rage potions, weapon enchants/procs and racials work in form; mana potions fixed in form (8 Oct) | confirmed |
| Druid races | Night Elf, High Order (Alliance); Tauren, Windshaper (Horde) | confirmed |

## Forms

| Form | Id | Icon | Cost | Gives |
|---|---|---|---|---|
| Caster | - | classicon_druid | - | Spells and heals; casting one in an animal form cancels the form |
| Cat Form | 768 | ability_druid_catform | 684 mana, 1.5 s GCD | 120 AP (12 + 2/level) + 1 AP per Agility + item Feral AP + Predatory Strikes; threat x0.71; Energy bar; Faerie Fire free with a 6 s cooldown and 1.0 s GCD |
| Dire Bear Form | 9634 | ability_racial_bearform | 684 mana, 1.5 s GCD | 180 AP, 1,240 health, item armor x4.6 (+360%); threat x1.5; Rage bar; Faerie Fire free with a 6 s cooldown. No parry, no block |
| Moonkin Form | 24858 | spell_nature_forceofnature | 435 mana | Item armor +360%, 3% crit aura to the party (all attacks and spells, not with Leader of the Pack), Omen of Clarity chance x2; no healing; every non-healing spell castable |

Shifting into Cat sets Energy to 0 (Furor changes this, see below). Shifting into Bear sets Rage to 0, then Furor gives 10 Rage at 20% per point. Bear Form (5487) is the level-10 version (+180% armor) replaced by Dire Bear at 40.

---

## Feral Cat

### Energy

| Rule | Value | Confidence |
|---|---|---|
| Max / regen | 100 / 10 per second, smooth (beta reports; gs integrates every 100 ms). Haste effect unknown | confirmed (timing provisional) |
| Shifting Power | +40 Energy (+5 Wolfshead), 684 mana, 16/12/8 s cooldown (0/1/2 Improved Shifting Power), Howling Idol -1 s, full Tier 1 cat set -1 s, 1.0 s GCD, not at full Energy | confirmed |
| Refunds | 80% of the paid Energy when a builder misses or is dodged. Rip and Ferocious Bite: gs 0%, fs 80% (the client flags them too) | provisional |
| Clearcasting | Next Shred, Claw, Rake, Rip, Ferocious Bite, Ravage or Pounce is free (not Shifting Power, not Faerie Fire) | confirmed |
| Furor 5/5 | Shifting into Cat returns 100% of the Energy you left with + 10 per second out of form, up to 100 (20%, 2/s, 20 cap per point). Bear Form wipes it | confirmed |
| Thistle Tea | +100 Energy, usable by druids; the gs list drinks it at <= 10 Energy | confirmed |
| Mana | 684 per Shifting Power every 8 s is ~85 mana per second. A cat goes dry within a minute without Judgement of Wisdom, potions or runes (the gs ranked cat spends ~28,400 mana per 300 s on it, about half refunded by Judgement of Wisdom) | provisional |

gs ranked cat, Energy per 300 s: natural regen 3,011, Shifting Power 1,661 (41 casts), refunds 214; spent on Shred 4,122, Rip 688, Ferocious Bite 241.

### Damage model

- **White hit**: weapon DPS x 1.0 + AP/14, every 1.0 s (gs; Blizzard deep dive). fs still uses the Classic paw (43.84-65.76 + AP/14). Example: Mithril Warhammer (32.6 DPS) gives 26-39 + AP/14.
- **AP in Cat**: -20 + 2 x Str + Agi + 120 + item AP/Feral AP + 90 (Predatory Strikes 3/3). Heart of the Wild +2% Str per point in Cat.
- **Crit**: 0.9% + Agi/20 + gear + Sharpened Claws 6% + Nature's Majesty 4% + Leader of the Pack 3%, minus 4.8% vs the boss.
- **Modifiers**: Savage Fury +5/10% (Claw, Rake, Shred, Maul, Swipe; Forever adds Shred), Rend and Tear +2% per point vs a bleeding target, Naturalist +1% per point to everything, Natural Instinct +10/20% ability crit damage. No Tiger's Fury.

### Abilities (max rank at 60)

Costs, cooldowns, GCDs and combo points come from the client rows and Wowhead and are **confirmed-forever** unless the note says otherwise.

| Ability | Id | Icon | Energy | Cooldown | GCD | CP | Damage / effect (as the sims implement it) |
|---|---|---|---|---|---|---|---|
| Shred r5 | 9830 | spell_shadow_vampiricaura | 60 (42 Shredding Attacks 3/3) | - | 1.0 | +1 | (weapon + 80) x 1.55. Behind only. Tooltip still prints Classic's "plus 180" |
| Claw | 9850 | ability_druid_rake | 45 (-1 per Ferocity point) | - | 1.0 | +1 | (weapon + 115) x 1.10. Any side |
| Rake r4 | 9904 | ability_druid_disembowel | 40 (-1 per Ferocity point) | - | 1.0 | +1 | 61 + 34 every 3 s for 9 s (163). No AP in the client or the sims (deep dive says AP scaling). Ticks crit, ignore armor |
| Rip r6 | 9896 | ability_ghoulfrenzy | 30 | - | 1.0 | spends | 6 ticks over 12 s, each 15 + 25.5 x CP + AP x 1% x min(CP, 4). Totals without AP 243/396/549/702/855. Ticks crit, ignore armor, AP re-read each tick |
| Ferocious Bite r5 | 31018 | ability_druid_ferociousbite | 35 + all the rest | - | 1.0 | spends | 52-112 + 147 x CP + 3% AP x CP + 2.7 per extra Energy (extra only spent if it lands). 5 CP = 787-847 + 15% AP |
| Shifting Power (talent) | 1322605 | spell_druid_displacement | 684 mana | 16 s (8 talented) | 1.0 | - | +40 Energy (+5 Wolfshead) |
| Berserk (31-pt talent) | 417141 | ability_druid_berserk | 0 | 3 min | none | - | 15 s: +100% crit on builders (Claw, Rake, Shred, Ravage, Pounce), so with Blood Frenzy 2/2 every builder gives 2 CP; also Primal Bite changes; Fear immunity |
| Faerie Fire (in Cat) | 9907 | spell_nature_faeriefire | free | 6 s | 1.0 (client) | - | -505 armor, 40 s |
| Ravage r4 | 9867 | ability_druid_ravage | 60 | - | 1.0 | +1 | (weapon + 98) x 3.5. Prowl + behind (opener only; gs omits it) |
| Pounce r3 | 9827 | ability_druid_supriseattack | 50 | - | 1.0 | +1 | Stun 2 s, 150 over 18 s. Prowl + behind (neither sim) |
| Prowl r3 | 9913 | ability_ambush | 0 | 10 s | none | - | Stealth, -30% speed |
| Cower r3 | 9892 | ability_druid_cower | 20 | 10 s | 1.0 | - | -1,200 threat (doubled in Forever) |
| Dash r2 | 9821 | ability_druid_dash | 0 | 5 min | none | - | +60% speed 15 s |
| Feral Charge (Cat) | 1238122 | ability_hunter_pet_bear | ? | 30 s | none | - | Leap behind the target. No root, interrupt or Daze; breaks Prowl |
| ~~Tiger's Fury~~ | 5217 | ability_mount_jungletiger | - | - | - | - | **Removed 1 Oct** (was +15% physical damage 6 s, 30 s; King of the Jungle +60 Energy, also removed) |

Notes:

- **Ferocious Bite rank 5** came from an AQ-era book in Classic. Fallback: rank 4 (22829), 45-95 + 128 per CP, 2.5 per extra Energy.
- **Not in Forever**: Mangle (Cat), Faerie Fire (Feral), Savage Roar, Thrash. Mangle became the bear-only Primal Bite.
- Rake's initial hit: gs ignores armor, fs applies it (sims disagree; miao.tips treats bleeds and Rake as armor-ignoring).

### Procs and passives

| Name | Value | Notes |
|---|---|---|
| Clearcasting (Omen of Clarity 16864 / 16870) | Next costed attack free, 15 s, 1 charge, 10 s ICD | Rate: fs 2 PPM = 2 x 1.0 / 60 = 3.3% per cat hit (white or special); gs 100% on the first hit after the ICD. A developer-like reply (forever-bugs #220) says the chance wrongly used the weapon's speed instead of the form's, which supports a speed-based (PPM) chance. **Use 2 PPM, 10 s ICD** |
| Blood Frenzy (Feral 2) | 50/100%: a non-periodic crit from a builder adds 1 combo point | Classic Blood Frenzy + Primal Fury merged (24 Sep) |
| Furor (Resto 5) | See Energy | Intended: Bear wipes saved Energy (#127) |
| Wolfshead Helm (8345) | +5 Energy from Shifting Power, +5 Rage from Enrage | 8 Oct (was +20 Energy on 1 Oct; Classic +20 on shift) |
| Howling Idol (272427) | Shifting Power -1 s | It used to shorten Tiger's Fury |
| Idol of the Dream (220606) | Rip +2 s (one more tick) | gs UI default relic |
| Leader of the Pack (Feral 1) | 3% crit to the party, all attack types | Not with Moonkin Aura |

---

## Feral Bear

### Rage

| Item | Value | Confidence |
|---|---|---|
| Max | 100 | confirmed |
| White swing (measured, level 14) | **11.25 per landed swing** = 3.46 x 2.5 x 1.3: the bear gets the two-hand rate (4.5 per second of swing) at a fixed 2.5 s swing. Damage, AP and armor do not matter. 4.5 Rage per second unhasted | confirmed (level 60 extrapolated) |
| White crit | Build 70170: +8.65 (the base without the 1.3, ~+77%); 1 Oct notes +75%; **8 Oct notes +100%**: use **22.5** | confirmed (exact form open) |
| Miss, dodge, parry | 0 (warrior measurement; assumed for the normalized bear swing) | confirmed for warriors |
| Maul swing | 0 (the queued Maul replaces the white swing) | confirmed |
| gs model | Classic: damage x 7.5 / 230.6, dodges/parries pay Classic rage, crit x2 of the non-crit rage. ~5.7 Rage per swing for the modeled bear, half the measured value | provisional |
| Damage taken | 8 Oct model shared with warriors: expected creature health (4,365 at 60), reference armor ~39%, crits and crushes count, absorbs ignored. ~6.2 Rage per normal boss hit (12.4 crit, 9.3 crushing) | provisional |
| Enrage | +10 now + 2/s for 10 s (30), +5 Wolfshead, 60 s, off GCD; base armor -16% (Dire Bear) for 10 s | confirmed |
| Blood Frenzy | 50/100% for 5 Rage on any crit in Bear | confirmed |
| Natural Reaction | 20% per point for 5 Rage on a dodge (+1% dodge per point) | confirmed |
| Furor | 20% per point for 10 Rage on shifting into Bear | confirmed |
| Refunds | 80% when Maul, Primal Bite, Lacerate or Bash is avoided; Swipe none | provisional |

**Practice-yard recommendation:** 11.25 per landed white hit (22.5 crit, glancing full), 0 for avoided swings and Maul swings, ~6.2 per landed boss hit. gs ranked bear (damage-based model) per 300 s: white 895, damage taken 808, Blood Frenzy 541; spent Lacerate 1,254, Maul 844, Primal Bite 743. With normalized rage the white share roughly doubles.

### Abilities (max rank at 60)

| Ability | Id | Icon | Rage | Cooldown | GCD | Damage / effect | Threat (before x1.5) |
|---|---|---|---|---|---|---|---|
| Maul r7 | 9881 | ability_druid_maul | 15 (-1 per Ferocity point) | - | next swing | Weapon (2.5 s) + 128, Savage Fury | x1.75 (classic) |
| Primal Bite r4 (talent) | 1238073 | ability_racial_cannibalize | 20 (-1 per Ferocity) | 6 s | 1.5 | 100% weapon + 77. Berserk: no cooldown, 3 targets | gs x3.0 / fs x1.5 ("roughly doubled" 1 Oct) |
| Lacerate r3 | 1235827 | ability_druid_lacerate | 15 (-1 per Shredding Attacks) | - | 1.5 | Bleed 15 per stack every 3 s for 15 s, 5 stacks (75/tick); hit = 10% weapon damage per existing stack. Ticks crit, ignore armor, no AP | x3.33 (SoD) |
| Swipe r5 | 9908 | inv_misc_monsterclaw_03 | 20 (-1 per Ferocity) | - | 1.5 | 83 + 3% AP to 3 targets (AP part added 1 Oct; tooltip lags); Feral Instinct +10%/point | x2.0 (SoD) |
| Demoralizing Roar r5 | 9898 | ability_druid_demoralizingroar | 10 | - | 1.5 | -204 boss melee AP (Wowhead 207), 30 s; same as Demoralizing Shout at 60 | ~100 per target |
| Faerie Fire (in Bear) | 9907 | spell_nature_faeriefire | free | 6 s | 1.5 | -505 armor, 40 s | 108 in gs; 0 in game today (bug) |
| Enrage | 5229 | ability_druid_enrage | +30 | 60 s | none | See Rage | rage threat |
| Frenzied Regeneration | 22842 | ability_bullrush | converts | 3 min | 1.5 | 10 s: each second up to 10 Rage -> 1% max health per Rage (100% total) | - |
| Barkskin | 22812 | spell_nature_stoneclawtotem | 0 | 60 s | 1.5 | -20% physical damage taken, 15 s, any form | - |
| Bash r3 | 8983 | ability_druid_bash | 10 | 60 s | 1.5 | Stun 4 s (Brutal Impact longer, shorter cooldown) | - |
| Feral Charge (Bear) | 1238122 | ability_hunter_pet_bear | 5 | 15 s | none | 8-25 yd charge, root + interrupt 4 s | - |
| Growl | 6795 | ability_physical_taunt | 0 | 8 s | none | Taunt 3 s | - |
| Challenging Roar | 5209 | ability_druid_challangingroar | 15 | 10 min | 1.5 | AoE taunt 6 s | - |
| Berserk | 417141 | ability_druid_berserk | 0 | 3 min | none | 15 s: Primal Bite no cooldown, 3 targets; Fear immunity | - |

Only the 1.5 form multiplier is Blizzard-sourced; the ability threat multipliers are inherited Classic / Season of Discovery values. Feral Instinct no longer adds threat.

### Can a bear be practiced on a dummy?

**Yes, if the dummy hits back.** Damage-taken Rage, Natural Reaction (dodges), Frenzied Regeneration and Barkskin all need incoming swings. The loop is simpler than the warrior's because there is no block or parry: Primal Bite on cooldown, Lacerate to 5 stacks and refresh, Demoralizing Roar and Faerie Fire up, Maul with spare Rage, Swipe on 2+ targets.

What differs from the warrior dummy in `warrior_forever.md`:

1. **Boss table vs a bear**: miss 4.4% (+0.04% per Defense above 300), dodge (bear dodge - 0.6%), **no parry, no block**, crit 5.6% (-0.04% per Defense), **crushing 15% always** (it would take 85% miss + dodge + crit to push it off), hit.
2. **No parry haste caused by the bear.** The boss still parries 14% and blocks 5% of the bear's frontal attacks; boss parries haste the boss's next swing.
3. **Mitigation**: armor A/(A+5755), Barkskin x0.8 physical. No Shield Block/Wall. No crit-immunity talent (no Survival of the Fittest), so the bear takes crits below 440 Defense.
4. **Reactions per boss swing**: incoming Rage (~6.2 / 12.4 / 9.3), Natural Reaction on dodge, health bar with healing (gs: 1,500 HPS) for Frenzied Regeneration.
5. **Threat meter** with x1.5 and the table above. Reference: the gs ranked bear makes ~1,869 TPS, 544 DPS and takes ~700-715 DTPS against the 3,000-base stress boss.

Typical bear (our calculation from the gs ranked modeled gear, Night Elf, talents 1/40/10, no enchants or buffs): Str 183, Agi 258, Sta 298, health ~5,520, armor ~6,790, dodge 18.8%, crit 33.1%, hit 16.7%, AP 701; weapon 187-281 @ 3.8 -> ~279 raw per bear swing. Suggested round demo sheet: 6,500 health, 7,000 armor, 17% dodge, 25% crit, 6% hit, 900 AP.

Open beta bugs to ignore: the bear armor multiplier also applies to buff/consumable armor (#20); Thick Hide is lost on a direct Cat <-> Bear shift (#151).

---

## Balance

### Mana

| Item | Value | Confidence |
|---|---|---|
| Pool | 964 + 15 x Int (e.g. 204 Int = 4,024) | classic-fallback |
| Spirit regen | 6.25 + Spirit/8 per second in 2 s ticks, only outside the five-second rule (gs Forever model; Classic druid 7.5 + Spirit/10) | provisional |
| While casting | Reflection 17/33/50% of Spirit regen | confirmed |
| MP5 | MP5/5 per second in the sims; the beta currently pays MP5 per **second** (bug #54) | provisional |
| Innervate | 62 mana, 6 min, 20 s: +400% regen and 100% while casting | confirmed |
| Costs with 38/0/13 | Wrath 30 (Improved Wrath -50% and Moonglow -25% add up), Starfire 255, Moonfire 281, Insect Swarm 120, Hurricane 1,121, Faerie Fire 115, Moonkin Form 435 | provisional (stacking rule) |
| Burn rate | W-S-S loop ~83 mana/s + DoTs ~27/s = ~110 mana/s vs 10-20 regen. The gs ranked moonkin lives on raid regen, Judgement of Wisdom (+4,588/300 s), a Demonic Rune and a Major Mana Potion | provisional |

### Spells (max rank at 60)

| Spell | Id | Icon | Mana | Cast | Damage at 60 | Coefficient |
|---|---|---|---|---|---|---|
| Wrath r8 | 9912 | spell_nature_abolishmagic | 120 | 2.0 s (1.5 with Improved Wrath 5/5) | 92-102 Nature, 20 yd/s missile | 0.571 |
| Starfire r7 | 25298 | spell_arcane_starfire | 340 | 3.5 s (3.0 Improved Starfire; 2.5 with Eclipse) | 350-412 Arcane (Wowhead 364-426) | 1.0 |
| Moonfire r10 | 9835 | spell_nature_starfall | 375 | instant | 128-151 + 60 every 3 s for 12 s (240; 15 s / 5 ticks with Nature's Splendor) | 0.15 direct, 0.13 per tick |
| Insect Swarm r5 (16-pt talent) | 24977 | spell_nature_insectswarm | 160 | instant | 31 every 2 s for 12 s (186), target -2% hit; binary | 0.158 per tick |
| Hurricane r3 | 17402 | spell_nature_cyclone | 1,495 | 10 s channel | 132 per second per target, -20% attack speed; **no cooldown** | 0.03 per tick |
| Faerie Fire r4 | 9907 | spell_nature_faeriefire | 115 | instant | -505 armor 40 s | - |
| Innervate | 29166 | spell_nature_lightning | 62 | instant | See Mana | - |
| Barkskin | 22812 | spell_nature_stoneclawtotem | 0 | instant | -20% physical damage 15 s, 60 s | - |
| Moonkin Form | 24858 | spell_nature_forceofnature | 435 | instant | See Forms | - |

All on a 1.5 s GCD (hasted to 1.0 s). Wrath never consumes Clearcasting. **Starfire rank 7** came from an AQ-era book in Classic; fallback rank 6 (9876): 313-370, 315 mana. Starsurge, Sunfire and Starfall exist in the client and on Wowhead Forever (Season of Discovery leftovers, "Requires level 1") but nothing teaches them: treat as unavailable.

### Procs and passives

| Name | Value | Notes |
|---|---|---|
| Nature's Grace (1 point) | Any non-periodic spell crit: +10% cast speed, -10% GCD, 3 s | Forever redesign (Classic: -0.5 s on the next cast). Wrath triggers it at cast end (gs). Whether both GCD reductions stack is open |
| Eclipse (3 ranks) | Each Wrath gives 2 charges (max 4, 15 s); each Starfire spends one and is 0.17/0.33/**0.5 s** faster | Wowhead's talent text prints "0.03 sec" (template bug); the buff says 0.5 s |
| Clearcasting | Next Starfire, Moonfire, Insect Swarm or Hurricane free; 10 s ICD | fs: 2 PPM by cast time (instants 1.5 s), x2 in Moonkin, ICD 5 s in Moonkin; gs: first direct spell after the ICD. Blizzard confirms only "double chance" in Moonkin |
| Moonkin Aura | 3% crit, all attack types, party | Not with Leader of the Pack |
| Vengeance (5) | Spell crit bonus +20% per point (1.5x -> 2.0x) | All damaging spells |
| Moonfury (5) | +2% Arcane and Nature damage per point | Was Balance spells only |
| Improved Moonfire (2) | +5/10% damage and crit | Now 2 points |
| Genesis (5, new) | +1% periodic damage per point | Also helps bleeds |
| Nature's Splendor (1, new) | Moonfire +3 s, Insect Swarm +2 s (one tick each) | |
| Relics | Idol of the Moon +33 Moonfire damage; Swarming Idol +2 s Insect Swarm; Mystic Mushroom +5% Spirit (gs default) | Tier 1 Balance 5-piece: Insect Swarm +3 s |

---

## Talents

Order used by talent strings (gs, client 70170, post-1-October tree): Balance 16, Feral Combat 20, Restoration 16. **New in Forever** in bold. Rank values, icons, prerequisites and every talent's Forever change are in the JSON under `talents`.

- **Balance**: Improved Wrath 5 (-0.1 s and -10% mana per point), **Genesis** 5 (+1% periodic), Moonglow 3 (-8/17/25% mana), Improved Moonfire 2 (+5/10% damage and crit), **Nature's Majesty** 2 (+2/4% crit), Nature's Reach 2 (+10/20% range, +2/4% hit), Improved Entangling Roots 3, **Nature's Splendor** 1, Insect Swarm 1 (moved from Resto), Vengeance 5 (+20% crit bonus per point), Improved Starfire 5 (-0.1 s, 3% stun per point), **Overgrowth** 2, Nature's Grace 1, **Eclipse** 3, Moonfury 5 (+2% per point), Moonkin Form 1.
- **Feral Combat**: Ferocity 5 (-1 cost per point: Maul, Primal Bite, Swipe, Claw, Rake), Heart of the Wild 5 (+2% Int, +4% bear Sta, +2% cat Str per point), Feral Swiftness 2 (cat speed, +2/4% dodge in all forms), Feral Instinct 3 (+10% Swipe damage per point), Brutal Impact 2, Thick Hide 3 (armor per level and per Defense point, multiplied by the form), Shredding Attacks 3 (-6 Shred Energy, -1 Lacerate Rage per point), Savage Fury 2 (+5/10%), Feral Charge 1, Sharpened Claws 2 (+3/6% crit in forms), **Shifting Power** 1, **Primal Bite** 1 (ex-Mangle), Predatory Strikes 3 (+50/100/150% of level as AP), Blood Frenzy 2 (merged Primal Fury), **Improved Shifting Power** 2, Leader of the Pack 1, **Natural Instinct** 2 (+10/20% melee crit damage; ex-Predatory Instincts), **Natural Reaction** 5, **Rend and Tear** 5 (+2% per point vs bleeding targets), **Berserk** 1.
- **Restoration**: Nature's Focus 5, Furor 5 (reworked), Naturalist 5 (+1% all damage per point; ex-Improved Healing Touch), Subtlety 3, Natural Shapeshifter 3 (-10% shapeshift mana per point, moved from Balance), Reflection 3 (17/33/50%), Gift of Nature 5, **Gift of the Earthmother** 1, Tranquil Spirit 5, Improved Rejuvenation 3, Swiftmend 1, Nature's Swiftness 1, **Living Spirit** 3, Improved Tranquility 2, Improved Regrowth 5, **Wild Growth** 1.

Removed: Nature's Grasp, Natural Weapons, Improved Thorns, Omen of Clarity (baseline), Feral Aggression (baseline), Faerie Fire (Feral), Improved Mark of the Wild, Improved Enrage, Improved Healing Touch, and King of the Jungle (added in beta, removed 1 Oct).

**Warning:** foreversim's Feral tree is the pre-1-October one (King of the Jungle, no Shifting Power, Shredding Attacks in a different slot). fs Feral strings do not decode on the current tree; Balance and Restoration strings do.

## Builds

| Build | Split | Talent string (gs order) | gs ranked result |
|---|---|---|---|
| **Feral Cat** (gs default, ranked) | 9/34/8 | `050022-35210032021032212041-053` | 720-728 DPS (Tauren 720, Night Elf 728) |
| Feral alternative (gs "Feral") | 0/38/13 | `-55210032021132212051-05503` | - |
| **Bear tank** (gs ranked) | 1/40/10 | `01-50022332120132012551-055` | 1,869 TPS, 544 DPS, ~700-715 DTPS |
| **Moonkin** (gs default, ranked) | 38/0/13 | `5232220115501351--505003` | 708-712 DPS |
| Balance (gs/fs "Balance") | 36/0/15 | `5532220115001351--505302` | - |

- **Feral Cat 9/34/8**: Genesis 5, Nature's Majesty 2, Nature's Reach 2 / Ferocity 3, Heart of the Wild 5, Feral Swiftness 2, Feral Instinct 1, Shredding Attacks 3, Savage Fury 2, Sharpened Claws 2, Shifting Power 1, Predatory Strikes 3, Blood Frenzy 2, Improved Shifting Power 2, Leader of the Pack 1, Natural Instinct 2, Rend and Tear 4, Berserk 1 / Furor 5, Naturalist 3. Shred 42, Claw 42, Rake 37 Energy; Shifting Power 684 mana every 8 s.
- **Feral 0/38/13**: adds Ferocity 5, Primal Bite, Rend and Tear 5, Naturalist 5 and **Natural Shapeshifter 3** (Shifting Power and Cat Form 479 mana); drops the Balance dip.
- **Bear 1/40/10**: Genesis 1 / Ferocity 5, Feral Instinct 2, Brutal Impact 2, Thick Hide 3, Shredding Attacks 3, Savage Fury 2, Feral Charge 1, Sharpened Claws 2, Primal Bite 1, Predatory Strikes 3, Blood Frenzy 2, Leader of the Pack 1, Natural Instinct 2, Natural Reaction 5, Rend and Tear 5, Berserk 1 / Furor 5, Naturalist 5. Maul 10, Swipe and Primal Bite 15, Lacerate 12 Rage.
- **Moonkin 38/0/13**: Improved Wrath 5, Genesis 2, Moonglow 3, Improved Moonfire 2, Nature's Majesty 2, Nature's Reach 2, Nature's Splendor 1, Insect Swarm 1, Vengeance 5, Improved Starfire 5, Nature's Grace 1, Eclipse 3, Moonfury 5, Moonkin Form 1 / Nature's Focus 5, Naturalist 5, Reflection 3.
- fs legacy strings (old Feral tree): Feral Cat 9/35/7 `050022-5500002123032213051-052`, Bear 0/31/20 `-5003232120132010501-0550325`, Moonkin `5502220115501351--055003`. They must be rebuilt on the current tree.
- miao.tips has its own talent and gear guides, but they were not read (AI opt-out).

## Suggested ability (priority lists)

The sims check "fight time left". For an endless dummy, drop those checks.

### Cat (gs ranked; recommended for the hint)

1. Thistle Tea if Energy <= 10.
2. Cooldowns when ready (Berserk, trinkets, racials).
3. (Fight ending: Ferocious Bite at 3+ CP in the last 4 s.)
4. **Ferocious Bite** if 5 CP and Rip has >= 5 s left.
5. **Rip** if 4+ CP and no Rip on the target.
6. **Shifting Power** if Energy <= 60.
7. **Shred**.

No Rake, no Faerie Fire (gs charges mana for it and assumes another armor debuff), no Tiger's Fury. The bite goes before Shifting Power so it eats the Energy, then Shifting Power refills.

Our hint version for the practice yard: opener Prowl -> Ravage; Berserk when ready; Faerie Fire if missing and nobody else keeps it (free in Cat); Rip at 5 CP (4 acceptable) when missing; Ferocious Bite at 5 CP with Rip >= 5 s; Shifting Power at <= 60 Energy; Shred (Claw from the front). A Clearcasting proc means the next Shred is free.

Older lists: gs "p1" (Rip at 5 CP if missing, Bite at 5 CP, Rake if missing, Shred) and the fs default (Tiger's Fury, Ravage opener, cancel-form powershifting with Furor), which no longer applies in Forever.

### Bear (gs ranked)

1. Frenzied Regeneration if health < 30%.
2. Barkskin on cooldown.
3. Cooldowns when ready (Berserk, Enrage, trinkets).
4. Demoralizing Roar if <= 4 s left.
5. Faerie Fire if <= 3 s left.
6. **Primal Bite**.
7. Swipe if 2+ targets and Rage >= 15.
8. **Lacerate** if < 5 stacks or <= 4.5 s left.
9. **Maul** (queue) if Rage >= 25.
10. Lacerate (filler).

### Balance (gs and fs "Launch"; gs ranked)

0. Moonkin Form before the pull.
1. Cooldowns when ready. (fs: Innervate at <= 500 mana.)
2. **Insect Swarm** if not on the target.
3. **Moonfire** if not on the target.
4. **Starfire** if Eclipse charges >= 1.
5. **Wrath**.

This gives Wrath - Starfire - Starfire (1.5 + 2.5 + 2.5 s). Starfire is still ~58% of the damage (gs: Starfire 413, Moonfire 106, Insect Swarm 97, Wrath 94 DPS). Alternatives: gs "Default Balance" (Moonfire + Starfire spam), fs default (Moonfire, Insect Swarm, Starfire; Innervate at 30%).

## Default stats

No real level-60 Forever gear is confirmed. gs's rankings use modeled item-level-65 items; its UI defaults use real Forever item ids; fs defaults to Classic pre-BiS.

| Preset | Gear | Our derived unbuffed sheet |
|---|---|---|
| gs UI default cat (Night Elf, 9/34/8) | Outlaw's Collar, Dawn Armor, Warbear Woolies, Mongoose Boots... Mithril Warhammer 91-137 @ 3.5 (32.6 DPS), Idol of the Dream. Items: Str 96, Agi 192, Sta 120, AP 34, hit 3.9%, crit 2.5% | Str 174, Agi 257, **AP 829**, crit 26.3% (21.5% vs boss), hit 7.9%, cat swing ~92 |
| gs UI default moonkin (Night Elf, 38/0/13) | Bloodvine set, Ironfeather Leggings, Belt of the Archmage, Persuader, Truesilver Conduit, Mystic Mushroom. Items: Int 104, spell power 164 + 41 damage (+10 Nature), MP5 9, hit 7.9%, crit 5% | Int 204, mana 4,024, spell power 205 (215 Nature), crit 14.2% (17.2% with Moonkin Aura), hit 11.9% (5.1% miss), Spirit 123 |
| gs ranked cat / bear / moonkin | Modeled ilvl 65 leather (Agi/crit/hit or Int/SP/crit/hit), two-hand mace 187-281 @ 3.8 with Crusader, physical or spell idol; raid buffs | Bear sheet in the Bear section |
| miao.tips practice (as quoted by you) | 809 AP, "Level 60 set" | Matches the gs UI default cat (829 AP) closely |

Druid level-60 base: health 1,483, mana 1,244, Str 65, Agi 60, Sta 70, Int 100, Spi 110 (Night Elf Agi 65, Str 62; Tauren Str 70, Agi 55).

## Worked examples

Our own sanity checks (gs UI default sheets, boss armor 3,731 with Faerie Fire = 63.0% damage taken):

- **Cat swing**: 32.57 + 829/14 = 91.8 (57.8 after armor).
- **Shred**: (91.8 + 80) x 1.55 = 266; x1.10 Savage Fury x1.08 Rend and Tear x1.03 Naturalist = 326 -> **205** after armor, crit 452.
- **Rip 5 CP**: 15 + 127.5 + 4% x 829 = 176 per tick, 1,054 over 12 s (about 1,140 with Genesis and Naturalist), no armor.
- **Ferocious Bite 5 CP + 30 extra Energy**: 82 + 735 + 124 + 81 = 1,022 -> 1,137 with talents -> **717** after armor, crit 1,577.
- **Energy budget**: 10/s + 5/s from Shifting Power = 15/s, one 42-Energy Shred every 2.8 s; 85 mana/s for Shifting Power.
- **Bear swing**: 61.6 DPS x 2.5 + 701/14 x 2.5 = 279 raw. Rage 11.25 (normalized) vs ~5.7 (gs model). Maul (279 + 128) x 1.10 = 448 raw, 282 after armor.
- **Starfire**: (381 + 205) x 1.10 x 1.05 = 677 average (crit 1,354), before ~6% partial resists. **Wrath**: (97 + 0.571 x 215) x 1.155 = 254. **Moonfire**: 216 direct + 5 ticks of ~112.

## What changed from Classic 1.12

- Form auto attacks and weapon-damage abilities use the equipped weapon's DPS at 1.0 s / 2.5 s.
- Tiger's Fury and King of the Jungle removed; Shifting Power and Improved Shifting Power added (1 Oct).
- Furor: Cat Energy carried over / regenerated out of form, wiped by Bear; no 40-Energy powershift.
- Wolfshead Helm: +5 Energy on Shifting Power, +5 Rage on Enrage.
- Smooth Energy (10/s).
- Shred 155% (was 225%), Claw 110% (100%), Rake 61 + 3 x 34, Rip 15 + 25.5/CP per tick.
- Bleeds and DoTs crit and update every tick.
- Savage Fury covers Shred (5%/point). Shredding Attacks also lowers Lacerate. Sharpened Claws and Improved Moonfire cost 2 points.
- No Mangle (Cat), no Faerie Fire (Feral); Primal Bite replaces Mangle for bears; Faerie Fire free with a 6 s cooldown in Cat/Bear.
- New: Berserk, Lacerate (baseline at 42), Natural Reaction, Rend and Tear, Natural Instinct, Genesis, Nature's Majesty, Nature's Splendor, Overgrowth, Eclipse, Living Spirit, Gift of the Earthmother, Wild Growth.
- Bear rage normalized (11.25 per swing, crit +100%); damage-taken rage uses an expected creature health.
- Bear threat x1.5; Feral Instinct now Swipe damage; Swipe gains 3% AP.
- Enrage +10 Rage up front; Frenzied Regeneration up to 100% health; Growl 8 s; Cower threat doubled; Demoralizing Roar = Demoralizing Shout at 60; Barkskin physical-only and usable in forms.
- Thick Hide based on Defense; Feral Swiftness dodge in all forms; Heart of the Wild smaller Int/Str.
- Forms immune to Disarm; consumables, weapon procs and racials work in forms.
- Omen of Clarity and Nature's Grasp baseline; Clearcasting never used by Wrath; Moonkin doubles Omen's chance.
- Wrath cheap (120 mana, 30 talented) and weak (92-102); Starfire ~30% weaker; Moonfire full coefficients at every rank; Insect Swarm 186; Hurricane no cooldown; Nature's Grace a 3 s haste/GCD buff; Moonfury and Vengeance cover all damaging spells.
- Moonkin Form and Leader of the Pack give 3% crit to everything and do not stack.
- Hit suppression gone (8% melee cap vs +3); gear hit/crit shared by melee and spells.

## Provisional values (use them, but expect changes)

- Omen of Clarity's proc rate (2 PPM recommended) and the Moonkin cooldown halving.
- Bear outgoing Rage at level 60 and the exact crit bonus; the incoming-Rage coefficient (~6.2 per boss hit).
- AP shares missing from the client: Rip 1% per CP per tick (cap 4), Ferocious Bite 3% per CP; Rake has none in the sims although Blizzard says it scales.
- Refunds on Rip and Ferocious Bite (0% gs vs 80% fs); builder refunds 80%.
- Faerie Fire's GCD in Cat (1.0 vs 1.5 s) and its threat.
- Spirit regen formula, MP5 behaviour, Moonglow + Improved Wrath stacking (Wrath 30 mana).
- All bear ability threat multipliers.
- Spell crit suppression (none) and partial resists (6%) vs +3.
- Default gear and the priority lists: the sims' best guesses.

## Open questions

1. Omen of Clarity: 2 PPM on form/cast speed (fs) or 100% after the 10 s ICD (gs)? Does Moonkin halve the ICD or only double the chance?
2. Bear Rage at 60: still 11.25 per swing? Crit +100% of 11.25 (22.5) or of the base 8.65 (19.9)? Avoided bear swings give 0?
3. Incoming Rage coefficient after 8 Oct (shared with the warrior sheet).
4. Rake: does it scale with AP as the deep dive says? Does its initial hit ignore armor?
5. Rip and Ferocious Bite AP shares (Classic 1% / 3% per CP) and refunds when avoided.
6. Faerie Fire in Cat Form: 1.0 or 1.5 s GCD; threat (0 today, bug); cooldown leaking into caster form (bug #307).
7. Shifting Power: does it start the five-second rule? Can Clearcasting make it free? Cost with Natural Shapeshifter (479?).
8. Does haste speed up Energy? Does Nature's Grace's -10% GCD stack with haste-based GCD scaling?
9. Form weapon damage range: Blizzard states only DPS; gs scales the weapon's own min-max.
10. Launch availability of Ferocious Bite rank 5 and Starfire rank 7 (fallbacks: Bite rank 4, Starfire rank 6).
11. Threat values: Primal Bite (x3 vs x1.5), Lacerate x3.33, Swipe x2, Maul x1.75, Demoralizing Roar per target; resource threat looks lower than 5 per Rage in game (bug #278).
12. Druid Spirit regen at 60; MP5 per second bug (#54).
13. Spell crit suppression and level-based partial resists vs +3.
14. Wowhead "Level 60" tooltips vs the sims' level-60 values (Dire Bear 210 vs 180 AP, 1,560 vs 1,240 health; Starfire 364-426 vs 350-412).
15. Lacerate's direct hit: stacks before or after the new application; any AP term.
16. Pounce and Ravage: worth modelling for a one-time opener on an endless dummy?
17. Moonkin Omen ICD and the low-rank proc penalty (1 Oct) in numbers.
18. Feral Charge (Cat) cost; open bug putting the bear charge on 30 s.
19. Bear armor bugs (#20 buff armor multiplied, #151 Thick Hide lost on Cat <-> Bear): ignore for the practice yard.
