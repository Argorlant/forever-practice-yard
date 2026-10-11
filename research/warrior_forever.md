# Warrior data sheet for WoW Forever (level 60 vs a level 63 dummy)

Research date: 10 Oct 2026. The machine-readable version is `warrior_forever.json` in this folder. Every number there has a source link and a confidence label. Covers Fury (dual wield), Arms (two-hand) and Protection (tank).

## Rage in Forever

Blizzard: "We have fully-normalized this Rage. Rage gained is now based on the speed of the weapon that dealt the damage" (class deep dive, 30 Sep). Critical strikes were re-added at +75% on 30 Sep and raised to **+100%** on 1 Oct.

### Rage from your white hits (confirmed in game, levels 8-22)

Each **landed** auto attack gives a fixed amount. Damage, attack power, glancing and target armor do not matter.

| Swing | Rage per landed swing | Rage per second of auto attacking |
|---|---|---|
| One-hand main hand (any one-hander, incl. daggers and fists) | 3.46 x weapon speed | 3.46 |
| Two-hander | 4.5 x weapon speed (1.3x the one-hand rate) | 4.5 |
| Off hand | 1.73 x weapon speed (half), plus Dual Wield Specialization | 1.73 (2.6 with DWS 5/5 in gs) |
| Critical white hit | x2 (gs). See note | |
| Miss, dodge, parry | **0** (Classic paid rage for dodges and parries) | |
| Heroic Strike / Cleave swing | **0** (the queued attack replaces the white swing) | |
| Abilities (yellow hits, yellow crits) | 0 | |

- **Weapon speed** is the item's listed speed, not the hasted interval. A hasted swing still gives full rage, so **haste and Flurry raise rage per second**.
- Rage per second does not depend on weapon speed: a slow weapon gives more per swing but swings less.
- **Crit detail.** On the 30 Sep build a crit added the base amount once more, without the two-hand factor: one-hander x2.0, two-hander x1.77 (measured). Blizzard then raised the bonus to 100% on 1 Oct. gs uses x2 for every white crit, fs still uses x1.75 (it predates the change). **Use x2.**
- The "rage conversion" (230.6 at level 60) is no longer used for outgoing rage.
- Not TBC's formula. TBC kept a damage term plus a hit factor. Forever has no damage term at all, like Cataclysm/MoP normalized rage, with a separate higher two-hand rate.
- Community extrapolation to level 60: Forever gives **more** white rage than Classic (about 5.2/s dual wield vs 3.5, 4.5/s two-hand vs 2.4, before talents), but it no longer grows with weapon damage.

### Rage modifiers and other sources

| Source | Value | Confidence |
|---|---|---|
| Max rage | 100 (Boundless Rage was removed on 1 Oct) | confirmed |
| Unbridled Wrath | 12% per point (60% at 5/5), 1 rage per landed white swing, either hand, never Heroic Strike/Cleave, not PPM. Two-handers no longer get 2. Beta ran at ~7.5%/point until the 1 Oct fix | confirmed |
| Dual Wield Specialization | Off-hand rage +10% per point in gs (client curve). Wowhead rank 1 shows +5%. Blizzard removed the old +20%/point | provisional |
| Anger Management | 1 rage every 3 s in combat; -30% out-of-combat rage loss | confirmed |
| Bloodrage | 10 now + 1/s for 10 s (20 total), 60 s cooldown, off the GCD, costs 20% of base health. Improved Bloodrage +25/50% of all of it (30 total) | confirmed |
| Berserker Rage | Extra rage when taking damage, amount unknown (gs: +2 per landed melee hit). Improved Berserker Rage +5/+10 instantly | value provisional |
| Charge | 15 rage (Improved Charge +3/+6), out of combat only | confirmed |
| Shield Specialization | 20% per point to gain 5 rage on a block (Classic 1) | confirmed |
| Master of Defense (new) | 50% per point to gain 5 rage on a dodge or parry with a shield | confirmed |
| Tactical Mastery | Baseline: keep 10 rage on a stance change. Improved Tactical Mastery +3/point (25 max) | confirmed |
| Stance swap | 1 s cooldown, no GCD, rage above the retained amount is lost | confirmed |
| Refund on miss/dodge/parry | 80% of the paid cost (not Cleave, Whirlwind, Thunder Clap, shouts). Execute loses its extra rage | provisional |
| Gnome Eureka | Next 3 rage abilities -10% | confirmed |
| Out-of-combat decay | ~1 rage/s (Classic figure), not modelled. Lingering Rage (new) delays it 2-10 s | classic-fallback |
| Threat from rage | 5 threat per rage from non-damage sources, not modified by stance (fixed on 8 Oct) | confirmed |

### Rage from damage taken

What Blizzard said:

- 30 Sep: same old formula, but **armor is ignored** ("as if you always had 50% damage reduction from Armor") and absorbs are ignored.
- 8 Oct: it now uses an **expected creature's health instead of your own health** (Stamina no longer lowers rage). Crits and crushing blows now count. Absorbs are ignored. Rage is balanced around **20-40% armor by level** instead of 50%. "The typical Warrior or Druid should be gaining more Rage."

What was measured before the 8 Oct fix: `rage = preArmorDamage x 10 / yourMaxHealth`. Misses, dodges and parries gave nothing. A blocked hit gave the rage of the unblocked amount.

Level-60 client baseline (ExpectedStat): creature health **4,365**, reference armor 3566/(3566+5500) = **39.3%**.

| Model | Formula | Rage per average boss hit* |
|---|---|---|
| gs (unverified scenario) | (damage after all mitigation + absorbed) x 10 / 4365 / (1 - 0.393) = damage / 264.8 | 6.4 |
| Our reading of Blizzard's text | rawDamage (x2 crit, x1.5 crush, blocked part and absorbs ignored) x (1 - 0.393) x C / 4365, C = 10 | 6.2 |
| fs (pre-8-Oct measurement) | preArmorDamage x 10 / your max health | superseded |
| Classic | 2.5 x damage after armor / 243.6 | 17.5 |

*gs default boss: average raw hit 4,475; tank with 7,858 armor in Defensive Stance takes 1,702.

**Practice-yard recommendation:** about **6.2 rage per landed normal hit** (12.4 crit, 9.3 crushing blow), full rage for blocked hits, 0 for misses, dodges and parries. Expose the coefficient C as a setting (10-20). Both readings agree for a typical tank. Forever pays roughly a third of Classic per hit.

### How rage flows in the sims (300 s, gs, hypothetical gear)

| Spec | Rage in | Main sinks |
|---|---|---|
| Fury DW | Main hand 1,324, off hand 1,271, Unbridled Wrath 176, potion 159, refunds 116, Anger Management 100 (~10.5/s) | Bloodthirst 1,007, Execute 825, Heroic Strike 662, Whirlwind 473 |
| Arms 2H | White 2,196, potion 141, refunds 103, Anger Management 99, Bloodrage 85 | Mortal Strike 1,086, Execute 648, Heroic Strike 243, Overpower 180 |
| Protection | White 909, damage taken 527, blocks (Shield Spec) 428, refunds 248, dodge/parry (Master of Defense) 162 (~7.6/s) | Heroic Strike 733, Shield Slam 687, Shield Block 511, Sunder 190 |

## Sources

| Id | Source | Version read |
|---|---|---|
| gs | [gunba/wow-forever-sim](https://github.com/gunba/wow-forever-sim) (MIT) | commit `9c05fc8`, 9 Oct 2026 (current tree) |
| fs | [laurencestokes/foreversim](https://github.com/laurencestokes/foreversim) (MIT) | commit `255df16`, 1 Oct 2026 (pre-1-Oct warrior tree) |
| client | Beta client spell rows in fs `sim/core/spelldata/spells_auto_gen.go` | build 1.60.1.7xxxx |
| wowhead | Wowhead Forever tooltips (`nether.wowhead.com/forever/tooltip`) | read 10 Oct 2026 |
| blizzard | [Priest and Warrior deep dive](https://worldofwarcraft.blizzard.com/en-us/news/24301514) (30 Sep), [beta development notes](https://us.forums.blizzard.com/en/wow/t/wow-forever-beta-development-notes-%E2%80%93-updated-october-1/2360696) (24 Sep, 1 Oct, 8 Oct), [Warrior updates](https://us.forums.blizzard.com/en/wow/t/2369360) (2 Oct) | |
| magey | [magey/forever-warrior](https://github.com/magey/forever-warrior) issues #1 attack table, #2 queued HS, #3 rage, #4 Unbridled Wrath, #12 Flurry, #24 armor | 21 Sep to 10 Oct 2026 |
| bugs | [forever-bugs](https://github.com/ClassicWoWCommunity/forever-bugs) #47, #63, #65, #72, #104, #105, #278 | |
| ppach | [Warrior Compendium, rage chapter](https://ppach-warriorcompendium.share.connect.posit.cloud/rage.html) | v3.1.0, 1 Oct 2026 |

## Confidence labels

- **confirmed-forever**: Forever client data, a Wowhead Forever tooltip, Blizzard, or an in-game beta measurement. Most measurements were taken at levels 8-30; level-60 numbers are datamined or extrapolated.
- **sim-provisional**: a choice made by one or both sims with no Forever source, or where the sims disagree.
- **classic-fallback**: Forever says nothing, so the Classic value is kept.

## Core rules

| Rule | Value | Confidence |
|---|---|---|
| Warrior GCD | 1.5 s on every attack, not reduced by haste. Improved Slam lowers Slam's GCD to 1.0 s | confirmed (haste rule sim-provisional) |
| Off the GCD | Heroic Strike, Cleave, Bloodrage, Shield Block, Last Stand, Sweeping Strikes, Charge, Intercept, Taunt, stances | confirmed (client rows) |
| On the GCD (notable) | Berserker Rage, Recklessness, Death Wish, Retaliation, shouts, Shield Wall (gs wrongly has none) | confirmed |
| Heroic Strike / Cleave | Queue onto the next main-hand swing; rage is spent when it lands; dropped if rage runs short. Sims add a 250 ms reaction delay | confirmed |
| Special and two-hand miss vs +3 | 8% (no hit suppression in game; sims 9%) | confirmed |
| Dual-wield white miss | 27% (sims 28%). Furious Precision -4/7/10% off hand only | classic-fallback |
| Queued HS and the off hand | Since 1 Oct the off hand **keeps** the dual-wield penalty while HS/Cleave is queued (before: 5% vs 18% miss) | confirmed |
| Dodge / parry / block / glancing / crit vs +3 | 6.5% / 14% front only / 5% front only / 40% white only / crit -4.8% (same as the rogue sheet) | confirmed |
| Tank position | A tank attacks from the front, so the boss parries and blocks its attacks; each boss parry speeds up the boss's next swing | confirmed |
| Cannot be avoided | Overpower: no dodge, parry or block. Sunder: no crit, no block | confirmed |
| Thunder Clap | Spell hit table, spell crit 1.5x, ignores armor (fs reading of logs) | provisional |
| Crit damage | 2.0x; abilities 2.2x with Impale 2/2 | classic-fallback / confirmed |
| Armor | Damage x (1 - A/(A + 400 + 85 x attacker level)): you vs boss A/(A+5500), boss vs you A/(A+5755). Verified in beta logs | confirmed |
| Bleeds | Rend and Deep Wounds ignore armor. **Rend ticks can crit** (client flag); **Deep Wounds cannot** | confirmed |
| Stats | AP = 160 + 2 x Str; 20 Agi = 1% crit and 1% dodge; base crit 0%; base parry and block 5%; block value = shield + Str/20; each defense point above 300 = 0.04% avoidance and -0.04% crit taken | classic-fallback |
| Weapon damage | Roll + AP/14 x speed; off hand x0.5 x (1 + 5% x DWS). Normalized (2.4 one-hand, 3.3 two-hand, 1.7 dagger): Mortal Strike, Whirlwind, Overpower, Spearing Strike. Not normalized: Heroic Strike, Cleave, Slam | classic-fallback / confirmed |

## Stances

| Stance | Modifiers | Only here | Also usable here |
|---|---|---|---|
| Battle (`ability_warrior_offensivestance`) | Threat x0.8 | Overpower, Charge, Mocking Blow, Retaliation, Sweeping Strikes, Spearing Strike | Execute, Hamstring, Rend, Thunder Clap, Shield Bash |
| Defensive (`ability_warrior_defensivestance`) | Damage taken x0.9, damage done x0.9, threat x1.3 (x1.495 with Defiance 3/3 and a shield) | Revenge, Shield Block, Shield Wall, Taunt, Disarm | Thunder Clap (new), Rend, Shield Bash, Charge with Vanguard |
| Berserker (`ability_racial_avatar`) | +3% crit, damage taken x1.1, threat x0.8 | Whirlwind, Pummel, Intercept, Berserker Rage, Recklessness | Execute, Hamstring |

Any stance: Heroic Strike, Cleave, Bloodthirst, Mortal Strike, Slam, Sunder, Shield Slam, shouts, Bloodrage, Death Wish, Last Stand, Concussion Blow.

Swapping: 1 s shared cooldown, no GCD, keep up to 10 rage (25 with Improved Tactical Mastery 5/5).

## Abilities (max rank at 60)

Costs, cooldowns, GCDs and stances come from the client rows and Wowhead and are **confirmed-forever** unless the note says otherwise.

| Ability | Id | Icon | Rage | Cooldown | GCD | Stance | Damage (as the sims implement it) |
|---|---|---|---|---|---|---|---|
| Heroic Strike r9 | 25286 | ability_rogue_ambush | 15 | - | next swing | any | MH weapon + 157 (r8: +138). Threat +173 |
| Cleave r5 | 20569 | ability_warrior_cleave | 20 (17 Raging Blows) | - | next swing | any | MH weapon + 50, 2 targets. Threat +100 each |
| Bloodthirst r4 (Fury 31) | 23894 | spell_nature_bloodlust | 30 | 6 s | 1.5 s | any | 45% AP + 48. +10% speed 10 s, no heal |
| Mortal Strike r4 (Arms 31) | 21553 | ability_warrior_savageblow | 30 | 6 s | 1.5 s | any | Normalized MH + 160. -50% healing 10 s |
| Whirlwind | 1680 | ability_whirlwind | 25 (22) | 10 s | 1.5 s | Berserker | Normalized MH, plus normalized OH when dual wielding (baseline since 1 Oct), up to 4 targets. Threat x1.25 |
| Slam r5 | 11605 | ability_warrior_decisivestrike | 15 | 18 s (15 with Imp. Slam) | 1.5 s (1.0) | any | 1.5 s cast (1.0). MH weapon + 87. Threat +140 |
| Execute r5 | 20662 | inv_sword_48 | 15 (10 Imp. Execute) | - | 1.5 s | Battle, Berserker | 600 + 15 per extra rage, target <= 20%. Threat x1.25 |
| Overpower r4 | 11585 | ability_meleedamage | 5 + 1 dodge charge | 5 s (shared with Revenge) | 1.5 s | Battle | Normalized MH + 35. 5 s after a dodge (or 6 s Bloodthrill). Threat x0.75 |
| Revenge r6 | 25288 | ability_warrior_revenge | 5 | 5 s | 1.5 s | Defensive | 138-168 (fs adds 25% AP). 5 s after you block, dodge or parry |
| Shield Slam r4 (Prot 31) | 23925 | inv_shield_05 | 20 | 6 s | 1.5 s | any, shield | 640-670 + block value. Threat +508 |
| Shield Block | 2565 | ability_defend | 10 | 5 s | none | Defensive, shield | +75% block for 7 s or 2 blocks |
| Sunder Armor r5 | 11597 | ability_warrior_sunder | 15 | - | 1.5 s | any | -450 armor x5 stacks, 30 s. Threat 206 + unknown AP term |
| Thunder Clap r6 | 11581 | spell_nature_thunderclap | 20 (14 Imp. TC) | 6 s | 1.5 s | Battle, Defensive | 103 (fs +2.55% AP), 4 targets, attacks 20% slower 30 s |
| Demoralizing Shout r5 | 11556 | ability_warrior_warcry | 10 | - | 1.5 s | any | -210 boss AP for 45 s |
| Battle Shout r7 | 25289 | ability_warrior_battleshout | 10 | - | 1.5 s | any | +140 AP party, 3 min |
| Bloodrage | 2687 | ability_racial_bloodrage | 20% base HP | 60 s | none | any | 10 + 10 over 10 s rage |
| Berserker Rage | 18499 | spell_nature_ancestralguardian | 0 | 30 s | 1.5 s | Berserker | Fear/incapacitate immune 10 s, extra rage when hit |
| Recklessness | 1719 | ability_criticalstrike | 0 | 30 min | 1.5 s | Berserker | +100% crit, +20% damage taken, 15 s |
| Death Wish (Fury) | 12328 | spell_shadow_deathpact | 10 | 3 min | 1.5 s | any | +20% physical damage, +5% damage taken, 30 s |
| Sweeping Strikes (Arms) | 12292 | ability_rogue_slicedice | 30 | 30 s | none | Battle | Next 5 attacks hit a second target, 20 s (gs 10 s) |
| Rend r7 | 11574 | ability_gouge | 10 | - | 1.5 s | Battle, Defensive | 21 per 3 s x7 = 147 (fs +2% AP per tick). Ticks can crit |
| Hamstring r3 | 7373 | ability_shockwave | 10 | - | 1.5 s | Battle, Berserker | 45, -50% speed 15 s |
| Pummel r2 | 6554 | inv_gauntlets_04 | 10 | 10 s | 1.5 s | Berserker | 50, interrupt 4 s |
| Shield Bash r3 | 1672 | ability_warrior_shieldbash | 10 | 12 s | 1.5 s | Battle, Defensive | 45, interrupt 6 s |
| Shield Wall | 871 | ability_warrior_shieldwall | 0 | 15 min (4 min with Imp. SW 2/2) | 1.5 s | Defensive | -60% damage taken 12 s |
| Last Stand (Prot) | 12975 | spell_holy_ashestoashes | 0 | 3 min | none | any | +30% max HP 20 s, lost after |
| Concussion Blow (Prot) | 12809 | ability_thunderbolt | 10 | 45 s | unclear | any | Stun 5 s, no damage |
| Charge r3 | 11578 | ability_warrior_charge | +15 rage | 15 s | none | Battle (Def with Vanguard) | Stun 1 s, out of combat |
| Intercept r3 | 20617 | ability_rogue_sprint | 10 | 30 s | none | Berserker | 65 damage, stun 3 s |
| Taunt | 355 | spell_nature_reincarnation | 0 | 8 s | none | Defensive | Taunt 3 s |
| Mocking Blow r5 | 20560 | ability_warrior_punishingblow | 10 | 2 min | 1.5 s | Battle | 93, taunt 6 s |
| Challenging Shout | 1161 | ability_bullrush | 5 | 10 min | 1.5 s | any | AoE taunt 6 s |
| Disarm | 676 | ability_warrior_disarm | 20 | 60 s | 1.5 s | Defensive | 10 s |
| Retaliation | 20230 | ability_warrior_challange | 0 | 15 min | 1.5 s | Battle | Counterattacks 15 s |
| Intimidating Shout | 5246 | ability_golemthunderclap | 25 | 3 min | 1.5 s | any | Fear 8 s |
| Piercing Howl (Fury) | 12323 | spell_shadow_deathscream | 10 | - | 1.5 s | any | Daze 6 s |
| **Victory Rush (new)** | 402927 | ability_warrior_devastate | 0 | 30 s | 1.5 s | any | 1 + 15% AP, heals 10%; needs a kill (never on a boss dummy) |
| **Spearing Strike (new, Arms)** | 1310222 | inv_spear_01 | 15 | 20 s | 1.5 s | Battle | 40% normalized weapon damage, +80% vs Giants/Dragonkin/mounted |

Notes:

- **Devastate** (403196) is in the client only as Season of Discovery rune data. It is not learnable in Forever.
- Heroic Strike's real cost is 15 rage **plus the rage the replaced white swing would have given** (about 10 with a 2.9 one-hander).
- Execute: all rage left after the 15 cost becomes damage. If dodged or parried, 80% of the 15 is refunded and the extra rage is lost.
- Base Slam interrupts the swing timer (Blizzard, fs); Improved Slam removes that. gs never resets the swing in Forever.
- Bloodthirst, Mortal Strike and Shield Slam share a 6 s cooldown category; Overpower and Revenge share 5 s; Pummel and Shield Bash share one too.
- Heroic Strike 9, Revenge 6 and Battle Shout 7 are AQ-era book ranks in Classic. Their launch availability is unknown (fallbacks in the open questions).

## Procs and passives

| Name | Value | Notes |
|---|---|---|
| Flurry (Fury 5) | +5/10/15/20/25% attack speed for 3 swings after any melee crit | Max 25% (Classic 30%). Each white swing (incl. HS) spends a charge; gs has no 500 ms gate. Raises rage per second |
| Deep Wounds (Arms 3) | 20/40/60% of main-hand **average weapon damage** over 12 s (4 ticks) | Any physical crit. No AP, no caster modifiers, rolls unpaid damage into the new bleed, **cannot crit**, ignores armor |
| Enrage (Fury 5) | 30% chance when hit by any damage: +2/4/6/8/10% physical damage 12 s | Never procs if the dummy does not hit you |
| Unbridled Wrath (Fury 5) | 12% per point, +1 rage per landed white swing | Not on HS/Cleave |
| Impale (Arms 2) | Ability crits +10/20% damage bonus (2.2x) | Requires Deep Wounds |
| Weaponmaster (Arms 5, new) | Per point: axe/polearm +1% crit; mace/staff ignore 3% armor; sword 1% chance of an extra attack | Replaces the four weapon specializations. Sword procs have a 200 ms ICD in gs |
| Bloodthrill (Arms 5, new) | 4/8/12/16/20% chance on main-hand hits vs your Rend target to enable Overpower for 6 s | Wowhead still shows 15% |
| Overpower window | 5 s after your attack is dodged, one cast per dodge | |
| Revenge window | 5 s after you block, dodge or parry, one cast | |
| Shield Specialization (Prot 5) | +1% block per point; 20% per point to gain 5 rage on block | |
| Master of Defense (Prot 2, new) | 50% per point to gain 5 rage on dodge/parry with a shield | |
| Defiance (Prot 3) | +5/10/15% threat in Defensive Stance with a shield (multiplies 1.3) | |
| Bastion (Prot 5, new) | +2% damage per point with a shield | |
| Focused Rage (Prot 3, new) | -1 rage per point on offensive abilities | Revenge 2, Sunder 9 with Improved Sunder |
| Blood Craze (Fury 3) | 1/2/3% max HP over 6 s after taking a crit or a hit > 20% max HP | Bloodthirst no longer triggers it |
| Gore Drinker (Fury 2, new) | After Enrage, Berserker Rage, Bloodrage, Death Wish or Bloodthirst, next 3 melee attacks heal 0.5/1% | Not simulated |
| Anger Management (Arms 1) | 1 rage / 3 s in combat | |
| Improved Overpower (Arms 2) | Overpower +25/50% crit | |
| Two-Handed Weapon Spec (Arms 3) | +1/2/3% damage with a two-hander | |

## Can Protection be practiced on a dummy?

**Yes, if the dummy hits the tank.** In the gs sim a tank gets about 40% of its rage from its own white swings, 23% from damage taken, 19% from Shield Specialization blocks, 7% from Master of Defense dodges/parries and 11% from refunds. Revenge needs a block, dodge or parry. A passive dummy leaves Revenge unusable and cuts rage by more than half, so the practice would be wrong.

The good news: the Forever tank loop is simple and very practicable. Shield Block (10 rage, 5 s cooldown, 2 blocks) plus Shield Specialization 5/5 (5 rage per block) is **rage-neutral**, and every block opens Revenge. So: Shield Block on cooldown, Revenge every 5 s, Shield Slam every 6 s, Sunder/Heroic Strike with the rest.

### What the dummy needs to simulate

1. **Swing timer**: 2.0 s, 2.4 s while Thunder Clap is on it. **Parry haste**: when the dummy parries the tank, its current swing loses 40% of its swing time (at least 20% must remain).
2. **Raw swing damage**: `3000 x (U(1, 1.333) + AP/2478)`, AP 805 (595 with Demoralizing Shout). Average 4,475 (4,220 with Demo Shout). This is gs's stress-test boss, not a real Forever boss.
3. **One attack-table roll per swing** (boss level 63 vs tank level 60, defense 300 + bonus):
   - miss 4.4% + 0.04% per defense above 300
   - dodge = tank dodge - 0.6%
   - parry = tank parry - 0.6% (tank faces the boss)
   - block = tank block - 0.6% (+75% while Shield Block has charges)
   - crit 5.6% - 0.04% per defense above 300 (x2 damage)
   - **crushing blow 15%** (x1.5). Forever keeps crushing blows (8 Oct notes). Pushed off the table only when miss + dodge + parry + block + crit >= 100%
   - hit. A blocked hit cannot crit or crush.
4. **Mitigation**: block subtracts block value; armor `A/(A+5755)`; Defensive Stance x0.9; Shield Wall x0.4; Berserker Stance x1.1, Recklessness x1.2, Death Wish x1.05.
5. **Tank reactions**: incoming rage on every landed hit including blocked ones (~6.2 per normal hit); Revenge window on block/dodge/parry; Shield Specialization on block; Master of Defense on dodge/parry; Enrage 30% roll; Blood Craze on crit or big hit.
6. **Health bar** with external healing (gs: 1,500 HPS in 3 s chunks, 6 s burst window), so Shield Wall and Last Stand can be practiced.
7. **Threat meter** (see below), with a comparison line such as a ~950 DPS Fury warrior (~760 TPS at x0.8).

### Typical tank values (hypothetical gear)

| Sheet | Health | Armor | Defense | Dodge | Parry | Block | Block value | AP |
|---|---|---|---|---|---|---|---|---|
| gs tank test (Orc, raid buffed, modeled ilvl 65) | 8,011 | 7,858 | 312 | 18.3% | 6.5% | 10.5% | 44 + Str/20 (~73) | 1,701 |
| Our suggestion for the dummy demo | 8,000 | 7,800 | 315 | 15% | 8% | 12% | 75 | 1,400 |

The gs test tank made 1,030 TPS and took 514 DTPS against the 3,000-base boss. The ranked Protection build makes 830-880 TPS and takes 465-505 DTPS.

### Threat

- Stance multipliers: Battle and Berserker x0.8; Defensive x1.3; Defensive with Defiance 3/3 and a shield x1.495 (the Forever tooltip says 49.5%).
- Rage from non-damage sources: 5 threat per rage, ignores stance.

| Ability | Threat before the stance multiplier | Confidence |
|---|---|---|
| White hit, Bloodthirst, Mortal Strike, Rend, Deep Wounds | damage x1 | classic-fallback |
| Heroic Strike | damage + 173 | classic-fallback |
| Cleave | damage + 100 per target | classic-fallback |
| Shield Slam | damage + 508 | classic-fallback |
| Revenge | gs: damage x2.25 + 270. fs (measured at rank 1): damage + 120 | sims disagree |
| Sunder Armor | 206 + unknown AP term | confirmed flat value |
| Thunder Clap | gs: damage x2.5. fs (measured): damage x1 | sims disagree |
| Demoralizing Shout | ~43 per enemy (8 Oct: "some threat") | provisional |
| Battle Shout | gs ~60 per buffed member, fs 0 | provisional |
| Execute, Whirlwind | damage x1.25 | classic-fallback |
| Hamstring | damage x1.25 + 135 | classic-fallback |
| Overpower | damage x0.75 | classic-fallback |
| Slam | damage + 140 | classic-fallback |

## Talents

Order used by talent strings (gs, client build 70170, post-1-October tree). Arms 17, Fury 17, Protection 18. **New in Forever** in bold. The full tree with rank values, icons and prerequisites is in the JSON under `talents`.

- **Arms**: Improved Heroic Strike 3 (-1 rage/pt), Deflection 5 (+1% parry/pt), Improved Rend 3 (+12/23/35%), Improved Charge 2 (+3/6 rage), Improved Tactical Mastery 5 (+3 rage kept/pt), Improved Overpower 2 (+25/50% crit), Anger Management 1, Deep Wounds 3 (20/40/60%), **Spearing Strike** 1, Two-Handed Weapon Specialization 3 (1/2/3%), Impale 2 (+10/20%), **Bloodthrill** 5 (4-20%), Sweeping Strikes 1, **Weaponmaster** 5, Improved Slam 2 (redesigned), Improved Hamstring 3 (5/10/15% root), Mortal Strike 1.
- **Fury**: Booming Voice 5 (+10-50% radius, -5-25% shout cost), Cruelty 5 (+1% crit/pt), **Lingering Rage** 5 (+2 s decay delay/pt), Unbridled Wrath 5 (12%/pt), **Furious Precision** 3 (+4/7/10% off-hand hit), Piercing Howl 1, Blood Craze 3, Dual Wield Specialization 5 (+5% OH damage, +10% OH rage per point in gs), **Raging Blows** 1 (-3 rage Cleave and Whirlwind), Enrage 5 (redesigned), Improved Execute 2 (-3/-5 rage), Improved Berserker Rage 2 (+5/10 rage), Death Wish 1, Improved Intercept 2 (-5/10 s), Flurry 5 (5-25%), **Gore Drinker** 2, Bloodthirst 1.
- **Protection**: Improved Bloodrage 2 (+25/50%), Shield Specialization 5, Iron Will 5 (-3% stun/fear duration per point), Anticipation 5 (+4 defense/pt), Improved Revenge 3 (+20/40/60% damage), Improved Thunder Clap 3 (-2/4/6 rage), Last Stand 1, **Master of Defense** 2, Improved Disarm 3 (-7/13/20 s), Defiance 3, Improved Sunder Armor 3 (-1 rage/pt), **Vanguard** 1 (Charge in Defensive Stance), Improved Shield Bash 2 (50/100% silence), Improved Shield Wall 2 (-5.5/11 min), Concussion Blow 1, **Focused Rage** 3, **Bastion** 5, Shield Slam 1.

Removed: the four weapon specializations, Improved Battle/Demoralizing Shout, Improved Shield Block, Improved Taunt (all baseline), One-Handed Weapon Specialization, and on 1 Oct Toughness, Improved Cleave, Boundless Rage and Precision.

**Warning:** foreversim's warrior tree is the pre-1-October one (Fury has Iron Will, Improved Cleave, Boundless Rage and Precision; Protection has Toughness). fs talent strings do not decode on the current tree.

## Builds

| Build | Split | Talent string (gs order) | gs ranked DPS / TPS |
|---|---|---|---|
| **Fury DW** (gs default) | 18/33/0 | `20305213002-25053005141010501` | 958 Undead, 955 Human, 952 Orc |
| Fury (Sunder), same talents, keeps 5 Sunders | 18/33/0 | `20305213002-25053005141010501` | 933 Human |
| Fury Spearing (Giants/Dragonkin) | 18/33/0 | `20305113102-25053005150010501` | |
| Fury test fixture | 17/34/0 | `20305113002-25053005151010501` | |
| **Arms 2H** (gs default) | 34/17/0 | `20305213132515001-55050000002` | 841 Human, 837 Undead |
| 2H Bloodthirst | 20/31/0 | `30304203032-55050020151010501` | 840 Orc |
| **Protection** ("Fury Prot", gs Tanky / Undead / Human) | 8/6/37 | `35-0501-251333120230021351` | 867 TPS, 465 DTPS (Undead) |
| Protection (other races, gs test) | 4/6/41 | `31-0501-255333120230021351` | 830-880 TPS |

Fury DW points: Improved Heroic Strike 2, Improved Rend 3, Improved Tactical Mastery 5, Improved Overpower 2, Anger Management 1, Deep Wounds 3, Impale 2 / Booming Voice 2, Cruelty 5, Unbridled Wrath 5, Furious Precision 3, Dual Wield Spec 5, Raging Blows 1, Enrage 4, Improved Execute 1, Death Wish 1, Flurry 5, Bloodthirst 1.

Arms points: Improved Heroic Strike 2, Improved Rend 3, Improved TM 5, Improved Overpower 2, Anger Management 1, Deep Wounds 3, Spearing Strike 1, Two-Hand Spec 3, Impale 2, Bloodthrill 5, Sweeping Strikes 1, Weaponmaster 5, Mortal Strike 1 / Booming Voice 5, Cruelty 5, Unbridled Wrath 5, Improved Execute 2. No Improved Slam. In gs, Bloodthrill + Rend make Overpower Arms' top damage source.

Protection 8/6/37 points: Improved Heroic Strike 3, Deflection 5 / Cruelty 5, Unbridled Wrath 1 / Improved Bloodrage 2, Shield Spec 5, Iron Will 1, Anticipation 3, Improved Revenge 3, Improved TC 3, Last Stand 1, Master of Defense 2, Defiance 2, Improved Sunder 3, Improved Shield Wall 2, Concussion Blow 1, Focused Rage 3, Bastion 5, Shield Slam 1.

A pure "Deep Prot" build exists only in fs on the old tree: `1--552531233331212531` (1/0/50). It must be rebuilt on the current tree.

## Suggested ability (priority lists)

The sims check "fight time left". For an endless dummy, drop those checks.

### Fury DW (gs default; recommended for the hint)

1. **Recklessness** at the start (sim: fight time left <= 300 s).
2. **Other cooldowns** when ready (Death Wish, Bloodrage, Berserker Rage, trinkets, racials).
3. **Battle Stance** if the Overpower window is up, rage <= 25, not execute phase, Recklessness not active.
4. **Overpower**.
5. **Berserker Stance** if no Overpower window.
6. **Execute** (target <= 20%).
7. **Bloodthirst**.
8. **Whirlwind**.
9. **Slam** if rage >= 30.
10. **Heroic Strike** (queue) if rage >= 30 and not execute phase.

Stance dance: only for Overpower with 25 rage or less (Tactical Mastery keeps up to 25 at 5/5), then straight back. Execute phase: Execute first, no Heroic Strike, no dancing.

Variants: Fury (Sunder) puts Sunder (fewer than 5 stacks or under 8 s left) at the top and waits 0.5 s for 15 rage if needed. Fury Spearing adds Spearing Strike after Slam and raises the HS threshold to 50. 2H Bloodthirst uses the same list with HS at 50 and no execute/Recklessness gate on the dance.

### Arms 2H (gs)

1. Battle Stance (stay in it; the sim only switches to Berserker + Recklessness in the last 15 s).
2. **Overpower** (after a dodge or a Bloodthrill proc).
3. **Rend** if not on the target (needed for Bloodthrill).
4. **Execute** (<= 20%).
5. **Mortal Strike**.
6. Whirlwind (only reachable in Berserker Stance, the last 15 s).
7. **Slam** if rage >= 15.
8. **Heroic Strike** if rage >= 70 and not execute phase.
9. **Spearing Strike** if rage >= 15.

### Protection (gs; HS/Cleave threshold 20 for Human/Undead, 30 or 45 for other races)

1. Battle Shout if < 3 s left and rage >= 10.
2. Shield Wall if health < 35%; Last Stand if health < 30%.
3. **Shield Block** if rage >= 15 and its buff has < 1 s left (or is gone).
4. Bloodrage if rage < 35 and health > 50%.
5. Sunder Armor to refresh 5 stacks with <= 8 s left.
6. Thunder Clap if its debuff has <= 3 s left.
7. Demoralizing Shout if its debuff has <= 4 s left.
8. Sunder Armor while fewer than 5 stacks.
9. Thunder Clap with 3+ targets.
10. **Revenge**, then **Shield Slam**, then Cleave (2+ targets) / **Heroic Strike** (rage >= 20): each only if Sunder is safe (5 stacks with > 8 s left) or rage covers this ability + Sunder + Shield Block.
11. Sunder Armor if rage >= 45 (filler).

Simpler fs version, good for a first hint: Defensive Stance, Shield Slam, Revenge, Thunder Clap, Sunder (< 5 stacks), Heroic Strike (rage >= 45), Sunder.

### Heroic Strike thresholds

Fury 30, Fury Spearing / 2H Bloodthirst 50, Arms 70, old fs DPS list 40 (or any rage in execute), Protection 20/30/45 with the Sunder reserve. The gs Forever lists never Heroic Strike in the execute phase.

## Default stats

No real level-60 Forever gear is confirmed.

| Preset | Race | Weapons | Notes |
|---|---|---|---|
| gs UI default Fury | Human | Ironwood Blade sword 79-148 @ 2.4 + Persuader mace 89-167 @ 2.8 | Real Forever ids (Lionheart Helm, Titanic Leggings, Chromatic Gauntlets...). Gear: Str 114, Agi 63, Sta 62, AP 156, hit 9.9%, crit 7% |
| gs UI default Arms | Human | Blackfury polearm 105-158 @ 2.1 | Gear: Str 141, Agi 63, AP 156, hit 7.9%, crit 7% |
| gs ranked Fury | 10 races | Modeled sword 109-165 @ 2.9 + modeled fist 64-97 @ 1.7 | Hypothetical item level 65, raid buffs, Windfury |
| gs ranked Arms / 2H BT | 10 races | Modeled two-hander 187-281 @ 3.8 | |
| gs ranked Protection | 10 races | Modeled sword 68-102 @ 1.8 + shield 2,468 armor, 44 block value | |
| gs DPS test | Orc | Classic pre-BiS | Raid buffed: Str 418, AP 1,396, crit 33.1%, HP 6,690; 598 DPS. Starts with 50 rage |
| fs tests | Orc | Stat-less Demon's Claw + Force Reactive Disk (tank) | Not useful for stats |

Derived unbuffed sheets (our calculation, not a sim output):

- **Fury, gs UI default, Human, Berserker Stance**: Str 234, Agi 143, Sta 172, AP 784, crit 24.2% (Agi 7.15 + gear 7 + Cruelty 5 + stance 3 + Human sword 2), hit 9.9%, HP ~3,229, armor ~2,637.
- **Arms, gs UI default, Human, Battle Stance**: Str 261, Agi 143, AP 838, crit 24.2% (Agi 7.15 + gear 7 + Cruelty 5 + Weaponmaster polearm 5), hit 7.9%.

Warrior level-60 base (Human): Str 120, Agi 80, Sta 110, Int 30, Spi 45, HP 1,689, base AP 160.

## Worked examples

Our own sanity checks:

- **Rage per swing**: Ironwood Blade 2.4 MH = 8.3 (16.6 crit). Persuader 2.8 OH with DWS 5/5 = 7.3. Modeled 2.9 sword = 10.0. Modeled 1.7 fist OH with DWS = 4.4. Modeled 3.8 two-hander = 17.1 (34.2 crit in gs, 30.3 with the 30-Sep rule). Blackfury 2.1 = 9.45.
- **Boss hit**: raw 4,475 -> 7,858 armor (57.7%) and Defensive Stance -> 1,702 taken -> 6.4 rage (gs) or 6.2 (Blizzard reading); Classic 17.5.
- **Execute** at 100 rage: 600 + 15 x 85 = 1,875 before armor (1,950 with Improved Execute 2/2).
- **Bloodthirst** at 1,400 AP: 0.45 x 1,400 + 48 = 678, 404 after 3,731 armor.
- **Shield Slam**: 655 + 73 block value = 728 before armor.

## What changed from Classic 1.12

- Outgoing rage normalized (rate x weapon speed, crit +100%, nothing for misses/dodges/parries).
- Incoming rage rescaled to expected creature health (4,365 at 60), armor and absorbs ignored, crits/crushes count; about a third of Classic per boss hit.
- Tactical Mastery (10 rage) and Victory Rush are baseline.
- Queued Heroic Strike/Cleave no longer remove the off-hand miss penalty.
- Slam has an 18 s cooldown; Improved Slam (Arms) shortens cast, GCD and cooldown and stops the swing interruption.
- Thunder Clap: Defensive Stance, 6 s cooldown, 20% slow, AP scaling, less threat. Rend: AP scaling, ticks crit.
- Sunder threat 206 + AP term; usable over a stronger Expose Armor.
- Battle Shout 140 AP for 3 min; Demoralizing Shout -210 AP for 45 s; Booming Voice discounts shouts.
- Bloodthirst 45% AP + 48, no heal, +10% speed. Shield Slam 640-670 + block value. Revenge ~70% more damage.
- Shield Block 7 s / 2 blocks and Taunt 8 s (old talents now baseline). Shield Wall 60%/12 s/15 min, Retaliation 15 min, Last Stand 3 min, no shared cooldowns with Recklessness.
- Death Wish +5% damage taken instead of armor loss. Flurry max 25%. Enrage redesigned. Unbridled Wrath 60%, 1 rage.
- Weaponmaster replaces the weapon specializations (maces ignore armor). Deep Wounds rolls, no AP, cannot crit.
- New talents: Spearing Strike, Bloodthrill, Weaponmaster, Lingering Rage, Furious Precision, Raging Blows, Gore Drinker, Master of Defense, Vanguard, Bastion, Focused Rage.
- Shield Specialization 5 rage per block; Anticipation +4 defense/point; Defiance needs a shield.
- Dual Wield Specialization keeps 5%/point off-hand damage; off-hand hit moved to Furious Precision; off-hand rage bonus reduced (gs +10%/point).
- Berserker Rage at 30 and on the GCD. Overpower spends a per-dodge charge.
- Hit suppression gone; weapon-skill racials became crit.

## Provisional values (use them, but expect changes)

- Level-60 white rage rates (measured only up to level 22) and the crit factor (x2 vs x1.77 for two-handers).
- Dual Wield Specialization off-hand rage bonus (+10%/point).
- The whole incoming-rage formula (coefficient, armor handling, level key). Recommended default: ~6.2 rage per boss hit.
- Berserker Rage extra rage (+2 per hit), rage refunds (80%), out-of-combat decay.
- AP shares of Rend, Thunder Clap and Revenge (fs fits, gs none).
- All threat values except Sunder's flat 206.
- Boss swing damage (3,000 base, 2.0 s) and healing (1,500 HPS): gs stress-test assumptions.
- Default gear and the priority lists: the sims' best guesses.

## Open questions

1. Are 3.46 and 4.5 rage per second of weapon speed still exact at level 60?
2. Crit rage after 1 Oct: x2 for all white crits, or "add the base once" (two-hander x1.77)? Does the off hand get it?
3. Dual Wield Specialization off-hand rage: +10%/point, +5%/point or none?
4. Incoming rage: coefficient 10 or 20; is actual armor ignored (Blizzard text) or kept (gs)? Which level's expected health? Do DoTs give rage?
5. Size of Berserker Rage's extra incoming rage.
6. Out-of-combat decay rate and delay.
7. AP shares missing from the client: Rend (fs 2% AP/tick), Thunder Clap (fs 2.55%), Revenge (fs 25%).
8. Threat: Revenge (x2.25 + 270 vs damage + 120), Thunder Clap (x2.5 vs x1), Shield Slam +508, Heroic Strike +173, Cleave +100, Sunder's AP term, Demoralizing Shout per target.
9. Does base Slam reset the swing (Blizzard/fs) or not (gs)?
10. Flurry charge rules at 60 (yellow crits, queued attacks, both hands).
11. Is the Unbridled Wrath 12%/point fix live?
12. Bloodthrill: 4%/point (Blizzard, gs) or 15% (Wowhead)?
13. Launch availability of Heroic Strike 9, Revenge 6 and Battle Shout 7. Fallbacks: HS 8 (+138), Revenge 5 (109-133), Battle Shout 6 (111 AP).
14. GCD of Shield Wall (client 1.5 s, gs none) and Concussion Blow; Sweeping Strikes 20 s (client) vs 10 s (gs).
15. Dual-wield white miss (19% penalty) unmeasured; glancing damage bug; two-roll specials.
16. Real Forever boss swing damage and speed.
17. Is the dummy stun-immune (Concussion Blow, Charge, Intercept)?
18. Off-hand crits and Deep Wounds payload; Weaponmaster with an off-hand mace.
19. Do extra attacks (Weaponmaster sword, Windfury) give normal swing rage?
20. Does a swing the target blocks still give rage (sims: yes)?
