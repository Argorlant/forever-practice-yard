# Rogue data sheet for WoW Forever (level 60 vs a level 63 dummy)

Research date: 10 Oct 2026. The machine-readable version is `rogue_forever.json` in this folder. Every number there has a source link and a confidence label.

## Sources

| Id | Source | Version read |
|---|---|---|
| gs | [gunba/wow-forever-sim](https://github.com/gunba/wow-forever-sim) (MIT) | commit `9c05fc8`, 9 Oct 2026 |
| fs | [laurencestokes/foreversim](https://github.com/laurencestokes/foreversim) (MIT) | commit `255df16`, 1 Oct 2026 |
| client | Forever beta client spell rows, as stored in fs `sim/core/spelldata/spells_auto_gen.go` | build 1.60.1.x (fs data watch: no rogue changes through 70124) |
| wowhead | Wowhead Forever tooltips (`nether.wowhead.com/forever/tooltip`) | read 10 Oct 2026 |
| blizzard | [Rogue and Warlock deep dive](https://worldofwarcraft.blizzard.com/en-us/news/24310968) (7 Oct) and [beta development notes](https://us.forums.blizzard.com/en/wow/t/wow-forever-beta-development-notes-%E2%80%93-updated-october-1/2360696) (24 Sep, 1 Oct, 8 Oct) | |
| dev | [Blizzard developer reply on poison AP ratios](https://github.com/ClassicWoWCommunity/forever-bugs/issues/100#issuecomment-5804701503) | 23 Sep 2026 |
| magey | [In-game attack table measurements on the beta](https://github.com/magey/forever-warrior/issues/1) | 26 Sep to 10 Oct 2026 |

## Confidence labels

- **confirmed-forever**: from Forever client data, a Wowhead Forever tooltip, or Blizzard. The level-60 numbers are datamined. Most beta testing happened at lower levels, so they are not measured in game yet.
- **sim-provisional**: a choice made by one or both sims with no Forever source, or where the sims disagree.
- **classic-fallback**: Forever data says nothing, so the sims keep the Classic value.

## Core rules

| Rule | Value | Confidence |
|---|---|---|
| Rogue GCD | 1.0 s, not reduced by haste | confirmed (client GCDMs 1000; haste rule is sim-provisional) |
| Off-GCD | Cold Blood, Premeditation, Vanish, Stealth, Evasion, Sprint, Thistle Tea | confirmed (client) |
| Max energy | 100. Vigor +5/+10 (2 ranks). Gnome +5% | confirmed |
| Energy regen | 10 per second | confirmed (PowerType) |
| How regen arrives | gs: smooth, 1 energy per 100 ms. fs: 20.2 every 2.02 s. Beta players report continuous regen | provisional. Use continuous 10/s |
| Haste and regen | gs: general haste raises regen; Slice and Dice and Blade Flurry do not. fs: no | provisional |
| Adrenaline Rush | +100% regen (20/s) for 15 s, 5 min cooldown, triggers GCD | confirmed |
| Refund on miss/dodge/parry | Builders: 80% of the paid cost. Finishers: gs 0%, fs 80% | provisional |
| Combo points | Max 5, stored on the target. An avoided finisher keeps its points | confirmed (Blizzard fix 1 Oct) |
| Special attack miss vs +3 | 8% | confirmed (measured 7.63%) |
| Hit suppression | In game: gone, so the special hit cap is 8%. Both sims still subtract 1% (cap 9%) | confirmed in game; sims differ |
| Dual-wield white miss | 8% + 19% = 27% (sims: 28%) | classic-fallback |
| Dodge | 6.5% from any angle. Weapon Expertise -1/-2% | confirmed (measured 6.47%) |
| Parry / block | 14% / 5%, only from the front | confirmed (measured 14.31% / 4.94%) |
| Glancing (white only) | 40% chance | confirmed (measured 40.15%) |
| Glancing damage | Sims: 55-75% of a hit (avg 65%). Beta today: about 75% avg, reported as a bug | classic-fallback / provisional |
| Crit vs +3 | Sheet crit minus 4.8% (3% skill + 1.8% aura suppression) | confirmed (measured) |
| White table | One roll: miss, dodge, parry, glance, block, crit, hit. Crit is capped by what is left | classic-fallback |
| Special table | Miss (no DW penalty), dodge, parry, block. Crit rolled separately | classic-fallback (two-roll is untested) |
| Crit damage | Physical 2.0x. Lethality adds 4% per rank (2.2x at 5/5). Spells and poisons 1.5x | confirmed (Lethality curve); base classic-fallback |
| Armor | Damage x (1 - A / (A + 5500)). 3731 armor = 40.42% mitigated | classic-fallback |
| Bleeds | Rupture and Garrote ignore armor | classic-fallback |
| Dots and bleeds | Can crit, and each tick re-reads current AP and modifiers | confirmed |
| Gear hit and crit | Count for melee and spells (poisons) alike | confirmed |
| Weapon-skill racials | Gone. Human sword +2% crit, Orc axe +1%, Dwarf mace +1% | confirmed |
| Auto attack | Roll + AP/14 x speed. Off hand x0.5 x (1 + Dual Wield Spec) | classic-fallback |
| Normalized speeds | Dagger 1.7, one-hand 2.4 | classic-fallback |
| Crit per agility | 1% per 29 Agi. Rogue base melee crit 0%. Base AP = 100 + Str + Agi | classic-fallback |
| Slice and Dice | +30% attack speed, multiplicative. No regen or GCD effect | confirmed |
| Blade Flurry | +20% attack speed (x1.56 with SnD), cleave only with 2+ targets | confirmed |
| Expose vs Sunder | Do not stack, strongest wins. EA no longer blocks casting Sunder | confirmed |
| Poisons and stones | A weapon can carry a poison and a stone or oil at once | confirmed |

## Abilities (max rank at 60)

Costs, cooldowns, GCD and combo points come from the client rows and Wowhead. They are **confirmed-forever** unless a note says otherwise.

| Ability | Id | Energy | Cooldown | GCD | CP | Requirements | Damage (as the sims implement it) |
|---|---|---|---|---|---|---|---|
| Sinister Strike | 11294 | 45 (42/40 talented) | - | 1 s | +1 | Melee weapon | (normalized MH + 68) |
| Backstab | 25300 | 60 | - | 1 s | +1 | Dagger MH, behind | (normalized MH + 150) x 1.5. See open question on the 150 |
| Hemorrhage (talent) | 16511 | 35 | - | 1 s | +1 | - | Normalized MH x 1.00 (x1.45 with dagger). Debuff 15 s: your Rupture +15% |
| Mutilate (talent, new) | 1241584 | 60 | - | 1 s | +2 | Daggers in both hands | Each hand (normalized + 67) x 0.75. +20% if your Deadly or Wound Poison is on the target. One avoidance roll for both |
| Ghostly Strike (talent) | 14278 | 40 | 20 s | 1 s | +1 | - | MH weapon damage (not normalized) x 1.25 (x1.80 with dagger). +15% dodge 7 s |
| Riposte (talent) | 14251 | 10 | 6 s | none in sims | 0 | Only after you parry | MH weapon x 1.5. Never usable on a dummy that does not attack |
| Gouge | 11286 | 45 | 10 s | 1 s | +1 | Target faces you | 75 physical. Incapacitate 4 s |
| Eviscerate | 31016 | 35 (25 with Flawless Execution) | - | 1 s | spends 1-5 | CP >= 1 | 54-162 + 170 x CP + 3% AP x CP. 5 CP = 904-1012 + 15% AP |
| Slice and Dice | 6774 | 25 | - | 1 s | spends | CP >= 1 | No damage. 9/12/15/18/21 s, +30% attack speed |
| Rupture | 11275 | 25 | - | 1 s | spends | CP >= 1 | Every 2 s for 3 + CP ticks: 35 + 4.73 x CP + AP x (1/2/3/3/3%). Totals without AP 159/222/295/377/469 |
| Expose Armor | 11198 | 25 (-5/-10 talented) | - | 1 s | spends | CP >= 1 | -450 armor per CP (2250 at 5), 30 s |
| Kidney Shot | 8643 | 25 | 20 s | 1 s | spends | CP >= 1 | Stun 2-6 s. Bosses are usually immune |
| Garrote | 11290 | 50 (-10/-20 talented) | - | 1 s | +1 | Stealth, behind | 92 per 3 s x 6 = 552 + 3% AP per tick. Bleed |
| Ambush | 11269 | 60 | - | 1 s | +1 | Stealth, dagger MH, behind | (normalized MH + 116) x 2.5 (tooltip: 250% + 290) |
| Cheap Shot | 1833 | 60 (-10/-20 talented) | - | 1 s | +2 | Stealth | Stun 4 s, no damage |
| Kick | 1769 | 25 | 10 s | 1 s | 0 | - | 80 physical, interrupt |
| Feint | 25302 | 20 | 10 s | 1 s | 0 | - | Threat -4000 in the client (5x Classic). Blizzard says "doubled" |
| Evasion | 5277 | 0 | 5 min | none | - | - | +50% dodge 15 s |
| Sprint | 11305 | 0 | 5 min | none | - | - | +70% speed 15 s |
| Vanish | 1857 | 0 (Flash Powder) | 5 min | none | - | - | Stealth 10 s. Opens Ambush, Garrote, Cheap Shot, Premeditation |
| Stealth | 1787 | 0 | 10 s | none | - | Out of combat | -30% speed |
| Blade Flurry (talent) | 13877 | 25 | 2 min | 1 s | - | - | +20% attack speed 15 s |
| Adrenaline Rush (talent) | 13750 | 0 | 5 min | 1 s | - | - | +100% energy regen 15 s |
| Cold Blood (talent) | 14177 | 0 | 3 min | none | - | - | Next SS, Backstab, Ambush, Eviscerate or Mutilate (both hands) +100% crit |
| Preparation (talent) | 14185 | 0 | 10 min | 1 s | - | - | Resets other rogue cooldowns |
| Premeditation (talent) | 14183 | 0 | 2 min | none | +2 | Stealth | Points lost after 20 s if unused |
| Venom (talent, new) | 1310703 | 25 | - | 1 s | spends | CP >= 1 | Poisons +30% damage, +10% apply chance, 9/12/15/18/21 s |

Notes:

- "Normalized MH" = weapon roll + AP / 14 x 2.4 (one-hand) or 1.7 (dagger).
- Lethality (+4% crit damage per rank) applies to Sinister Strike, Gouge, Backstab, Mutilate, Ghostly Strike and Hemorrhage. It does not apply to Eviscerate or Ambush.
- Thistle Tea (item 7676): +100 energy, 5 min cooldown, off the GCD.
- Coup de Grace (1310709) is a new passive in the client and on Wowhead: Eviscerate +2% per Deadly Poison stack on the target. Neither sim has it, and no learning source was found.
- No other new rogue button exists in the Forever spellbook beyond Mutilate and Venom.

## Poisons

| Poison | Proc | Damage | AP ratio | Other |
|---|---|---|---|---|
| Instant Poison VI (item 8928) | 20% per landed hit with that weapon | 76-100 Nature (was 112-148) | 0.5% (Blizzard dev). Only gs adds it | 175 charges |
| Deadly Poison V (item 20844) | 30% | 23 per 3 s per stack, 12 s, max 5 stacks (115 per tick) | 0.45% (Blizzard dev). Placement unknown, in neither sim | Ticks can crit. 180 charges |
| Wound Poison IV | 30% | None. -165 healing per stack, 15 s, 5 stacks | - | Counts as "poisoned" for Mutilate |

- Poisons roll the spell table: 17% miss vs +3, minus hit (gear hit and Precision both count), floor 1%.
- Poison crit uses spell crit: Malice + gear crit + buffs. Agility does not count. Crits deal 1.5x.
- Modifiers: Improved Poisons +2% chance per rank, Vile Poisons +4% damage per rank, Venom +30% damage and +10% chance.
- The sims do not consume charges.
- Default setup: Instant on the main hand, Deadly on the off hand.
- Deadly Poison V, Backstab rank 9 and Eviscerate rank 9 came from AQ-era sources in Classic. Their Forever source is unconfirmed. If missing, use Deadly Poison IV (18 per tick), Backstab rank 8 (+140) and Eviscerate rank 8 (48-144 + 151 per CP).

## Talents

Every rank value comes from the beta client curves (fs `assets/confirmed_talents.json`) unless the JSON marks it classic-fallback.

**Combat build in gs (published ranking) 18/33/0: `005303103012-32003311201515231`**

| Talent | Points | Effect |
|---|---|---|
| Malice | 5 | +5% crit, attacks and poisons |
| Ruthlessness | 3 | 60% chance a finisher adds 1 CP (classic-fallback curve) |
| Improved Slice and Dice | 3 | +45% duration |
| Relentless Strikes | 1 | 20% per CP spent to gain 25 energy (classic-fallback) |
| Lethality | 3 | +12% crit damage bonus (2.12x) |
| Cold Blood | 1 | Button |
| Improved Poisons | 2 | +4% poison chance |
| Improved Eviscerate | 3 | +20% Eviscerate |
| Improved Sinister Strike | 2 | -5 energy (SS costs 40) |
| Deflection 3, Endurance 1, Riposte 1, Improved Sprint 2 | - | Path points, little or no value on a dummy |
| Precision | 3 | +3% hit, attacks and poisons |
| Flawless Execution | 1 | Eviscerate -10 energy |
| Dual Wield Specialization | 5 | Off hand +25% (Classic was +50%) |
| Blade Flurry | 1 | Button |
| Hack and Slash | 5 | Sword/axe: 5% extra MH attack (200 ms ICD). Dagger/fist: +5% crit. Mace: ignore 15% armor |
| Weapon Expertise | 2 | -2% chance to be dodged or parried |
| Aggression | 3 | +6% Sinister Strike, Backstab, Eviscerate |
| Adrenaline Rush | 1 | Button |

fs default (also gs test build): `00530310501-32003311201515231`. Same, but Lethality 5/5 instead of Lethality 3 + Improved Poisons 2.

Other presets:

- Combat Dual-Wield 15/33/3: `1053231-22530300001515231-012`
- Combat Backstab 15/33/3: `005302005-30230320201515231-102`
- IEA 19/32/0: `005303125-32003311201515131`
- Mutilate 31/20/0 (gs ranked): `0053031035140105-302303202014`
- Mutilate 32/19/0 (fs): `00530310551021051-302303202004`
- Assassination Mutilate 31/20/0: `02532010531201051-225303000005`
- Subtlety Hemo 20/0/31 (gs): `115303101104--5320003310013211501`
- Subtlety Hemo 15/0/36 (fs): `125320101--5320003310013211551`

The full tree, all 53 talents with rank values, is in the JSON under `talents`.

## Default stats

No real level-60 Forever gear is confirmed yet. Each sim uses something different:

| Preset | Race | Main hand | Off hand | Notes |
|---|---|---|---|---|
| gs UI default (`forever_combat`) | Orc | Ironwood Blade, sword 79-148 @ 2.4 | Persuader, mace 89-167 @ 2.8 | Real Forever item ids. Items give Str 141, Agi 109, AP 34, hit 7.9%, crit 4% |
| gs test character | Human | Premier High Warlord's Blade, sword 109-165 @ 2.9 | Premier High Warlord's Quickblade, sword 68-102 @ 1.8 | Raid buffed sim output: AP 1262.7, crit 32.89%, hit 7%, Agi 402.6 |
| gs published ranking | 9 races | Modelled fist 109-165 @ 2.9 | Modelled sword 68-102 @ 1.8 | Hypothetical item level 65 gear. 714 DPS Orc, 729 Undead |
| fs UI default | Dwarf | Dal'Rend's Sacred Charge, sword 81-151 @ 2.8 | Dal'Rend's Tribal Guardian, sword 52-97 @ 1.8 | Classic pre-BiS items |

Derived unbuffed sheet for the gs UI default (Orc, default talents). This is our own calculation from the sim formulas, not a sim output:

- Str 224, Agi 236, AP 594.
- Crit 17.1% on the sheet (Agi/29 + 4% gear + 5% Malice).
- Hit 10.9% (7.9% gear + 3% Precision). Dodge/parry reduction 2%.
- Hack and Slash gives the sword 5% extra attacks, and the mace makes all attacks ignore 15% armor.

Human level-60 base stats: Str 80, Agi 130, Sta 75, Int 35, Spi 50, HP 1523. Race offsets are in the JSON.

## Suggested ability (Combat Sinister Strike)

Simple priority. Both sims use it as the default. Recommended for the "next suggested ability" hint:

1. **Slice and Dice** if CP >= 1 and SnD is down, or CP = 5 and SnD has less than 3 s left.
2. **Adrenaline Rush** if energy < 59.
3. **Other cooldowns** (Blade Flurry, Cold Blood, trinkets, racials) while SnD is up.
4. **Eviscerate** if CP = 5 and (SnD is up or energy >= 79).
5. **Sinister Strike**.

The published gs "Sweaty" version, with Blade Flurry at -1 s before the pull:

1. Thistle Tea if energy <= 10.
2. Slice and Dice (same rule).
3. Adrenaline Rush if energy <= 40.
4. Other cooldowns while SnD is up.
5. Cold Blood if CP >= 3.
6. Eviscerate if CP >= 3.
7. Sinister Strike only within 0.5 s after a main-hand swing, or if energy >= 79, or in the last 6 s.

The sims also check "fight time left" (no SnD in the last 6 s). For an endless dummy, drop those checks. The Mutilate, Backstab and Hemorrhage lists are in the JSON under `apl`.

## Worked examples

Our own sanity checks with the gs default sheet (AP 594, Ironwood Blade), no buffs, 3731 armor:

- **Sinister Strike, average hit:** (113.5 + 101.8 + 68) x 1.06 x 0.5958 = **179**. A crit is about 379.
- **Eviscerate, 5 CP, average:** (958 + 89) x 1.26 x 0.5958 = **786**.
- **Rupture, 5 CP:** 8 ticks of 76.5 = **612** over 16 s. Bleeds ignore armor.

## What changed from Classic 1.12

- Energy regenerates continuously (player reports, not yet stated by Blizzard).
- Dots and bleeds crit and update every tick.
- Gear hit and crit apply to poisons. Malice and Precision cover poisons.
- Hit suppression is gone in game (cap 8%).
- Weapon-skill racials became crit. Rogues can use one-hand axes.
- Poisons deal about a third less, have more charges, stack with stones and oils, and scale a little with AP.
- Rupture per tick dropped from 60 + 8/CP to 35 + 4.73/CP.
- Expose Armor is 450 per CP. Improved Expose Armor now cuts cost and refunds CP.
- Hemorrhage is normalized, 145% with a dagger, and buffs only your Rupture.
- Ghostly Strike deals 180% with a dagger.
- New talents: Mutilate, Venom, Flawless Execution, Hack and Slash, Puncturing Wounds, Quietus, Cutthroat, Thousand Cuts.
- Lethality is 4% per rank, Dual Wield Specialization 5% per rank, and Deflection 2% per rank. Vigor has 2 ranks.
- Initiative and Setup reach 100%. The Premeditation window is 20 s. Weapon Expertise lowers dodge and parry.
- Aggression now includes Backstab. Opportunity includes Garrote and Mutilate.
- Feint threat is higher. Sap no longer breaks Stealth.

## Provisional values (use them, but expect changes)

- How energy arrives: continuous vs ticks, and whether haste speeds it up.
- Refund percentage (80%) and whether finishers refund.
- AP shares of Eviscerate (3% per CP), Rupture and Garrote. These are Classic's; the client has none.
- Relentless Strikes (20% per CP) and Ruthlessness (20% per rank) keep the Classic or demo values.
- Dual-wield miss penalty (19%) and glancing damage (65% avg).
- Hit cap: the sims use 9%, the game shows 8%.
- Default gear and stats: there is no confirmed level-60 gear.
- The APL is the sims' best guess, not a proven optimum.

## Open questions

1. Backstab: the Forever tooltip says "150% weapon damage plus 150", but Classic Era says "plus 225". The sims multiply 150 x 1.5 = 225. Is that still right?
2. Continuous energy or 2 s ticks? Does general haste raise regen?
3. Do finishers refund energy when avoided, and how much do builders refund?
4. Deadly Poison 0.45% AP: per tick or per stack? Instant Poison 0.5% is only in gs.
5. Is the dual-wield white miss still +19%? Are specials still two-roll for crit?
6. Glancing damage vs +3: ~25% reduction in the beta (bug?) vs 35% intended.
7. Can players learn Backstab 9, Eviscerate 9 and Deadly Poison V at launch?
8. Is Coup de Grace learnable, and does it work as the tooltip says?
9. Mutilate off hand: is the flat 67 halved too?
10. Does Venom boost a Deadly Poison that is already ticking?
11. Hack and Slash with mixed weapons (for example dagger + sword).
12. Is the dummy immune to stuns (Kidney Shot, Cheap Shot, Gouge)?
