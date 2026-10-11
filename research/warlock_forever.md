# Warlock data sheet for WoW Forever (level 60 vs a level 63 dummy)

Research date: 11 Oct 2026. The machine-readable version is `warlock_forever.json` in this folder. Every number there has a source link and a confidence label. It covers Affliction, Demonology (Demonic Pact) and Destruction (Shadow and Flame / Incinerate), the DS/Ruin hybrid, the alternative builds both sims carry, and the demons. **Forever has no tank warlock**: Metamorphosis, Felguard and Fel Armor survive only as Season of Discovery records in the client, with no way to learn them.

## The five things that matter most

1. **Curses and Banes are two separate slots.** Curse of Agony and Curse of Doom are now **Banes**: one Bane per warlock per target (Agony, Doom or the new Havoc), plus one Curse (Elements, Recklessness, Weakness, Tongues, Exhaustion). **Curse of Shadow is gone; Curse of the Elements covers every magic school** (-75 resistances, +10% magic damage taken, 5 min, 200 mana). Bane of Doom hits for **1742 + 4.0 x spell power** after 60 s (60 s cooldown, 300 mana), so on an endless dummy it beats Bane of Agony and owns the Bane slot.
2. **Life Tap scales with Spirit, not spell power.** At 60 it turns **(424 + Spirit) x (1 + 10% per Improved Life Tap point)** health into the same amount of mana (667 on our DS/Ruin sheet, about 26% of its health), instant, 1.5 s GCD, no threat. The health cost really is paid (bug #51). gs treats that health as healed by the raid; fs takes it off your health bar. Every build spends ~9,000 mana/min and gets ~4,400-4,900/min from Life Tap, so **the yard needs a health bar with a "raid healing" setting**, or Life Tap becomes a death sentence after two minutes.
3. **DoTs crit and stay dynamic; two talents double crit damage.** Periodic damage can crit in Forever and follows your current stats (no snapshot). Spell crits deal 1.5x; **Ruin 5/5 makes every Destruction spell 2.0x** (Shadow Bolt, Immolate including its ticks, Incinerate, Conflagrate, Shadowburn, Searing Pain, Soul Fire). **Pandemic 3/3 makes Corruption, Bane of Agony, Bane of Doom, Drain Life, Drain Soul, Siphon Life and Wrack 2.0x.** Improved Shadow Bolt is now a **personal** +4%/point (20%) Shadow debuff for 12 s with no charges, refreshed by your Shadow Bolt crits; Malevolence adds +1%/point Shadow crit.
4. **The trees are rebuilt (17/19/16 talents) around new 31-point talents.** Affliction ends in **Wrack** (6 s channel, +10% to your Corruption and Agony), Demonology in **Demonic Pact** (keep a Demonic Sacrifice buff while another demon is out), Destruction in **Incinerate** (2.5 s, 201-233 + 0.714 SP, +25% on Immolate). Demonic Sacrifice pairings are reversed: **Imp = +15% Shadow**, Succubus = +15% Fire, Voidwalker = 2% mana per 4 s, Felhunter = 3% health per 4 s, all lasting 2 hours. **Shadow and Flame 5/5** keeps Immolate when you Conflagrate and refunds Shadowburn's shard.
5. **Four real builds, all close.** gs (modeled ilvl-65 gear, 300 s, raid buffs) ranks **Demonic Pact 2/31/18 at ~916 DPS** (Orc; 930 Undead), Affliction 31/0/20 at ~826, Shadow and Flame 13/5/33 at ~813 and DS/Ruin 21/11/19 at ~791. MythicSim (secondary, 2-minute fight) ranks Demonology #5 of 23 DPS specs (778), Affliction #12 (669) and Destruction #19 (641). Pets matter: the Succubus deals 70-80 DPS and Demonic Brand another ~80 in the Pact build. Pets now inherit owner stats and cannot be buffed.

## Sources

| Id | Source | Version read |
|---|---|---|
| gs | [gunba/wow-forever-sim](https://github.com/gunba/wow-forever-sim) (MIT) | commit `9c05fc8`, 9 Oct 2026: `sim/warlock`, `sim/core`, `ui/warlock`, `ui/core/talents/trees/warlock.json`, `docs/` (beta-pass/warlock.md, modelled_build_reviews.md, uncertainties.md WL-001 to WL-010) |
| fs | [laurencestokes/foreversim](https://github.com/laurencestokes/foreversim) (MIT) | commit `255df16`, 1 Oct 2026; **same talent order as gs, so all its strings decode** |
| client | Beta client rows in fs `sim/core/spelldata/spells_auto_gen.go` | build 1.60.1.70124 |
| wowhead | Wowhead Forever tooltips (`nether.wowhead.com/forever/tooltip/spell/<id>`) | 220 spell ids requested 11 Oct 2026, 176 found (Dark Pact, Fel Armor's 28176, Felguard's 30146 and old talent rank ids are gone), with icon names |
| blizzard | [Development notes](https://us.forums.blizzard.com/en/wow/t/2360696) posts 1 (24 Sep), 4 (1 Oct), 5 (8 Oct, the latest); [Rogue and Warlock deep dive](https://worldofwarcraft.blizzard.com/en-us/news/24310968) (7 Oct) | no posts after 8 Oct |
| bugs | [forever-bugs](https://github.com/ClassicWoWCommunity/forever-bugs) #303, #311, #302, #95, #51, #35, #27 | "AidanZMoon" replies read like a developer but are not flagged as Blizzard |
| mythicsim | [mythicsim.com tier list](https://mythicsim.com/wow-forever/tier-list) (**secondary**) | robots.txt allows Claude agents except `/sims/`, `/api/` and a few account pages; `ai.txt` returns 404. Simmed 10 Oct on a wowsims Forever fork (`8361dcc`); build pages render client-side and could not be read |
| secondary | [Warcraft Tavern](https://www.warcrafttavern.com/forever/guides/warlock/) (level-20/30 beta, Sep), [wow.gg Demonology](https://wow.gg/guides/warlock-demonology-forever-overview) (19 Sep, demo-era, some talent names wrong) | Icy Veins returned 403; classicwow.gg and Kami Labs have no build numbers. **miao.tips not read** (AI opt-out) |

Wowhead **talent** tooltips print stale raw values: Malediction 10% (tree and Blizzard: 5%), Shadow Mastery 2% at rank 1 (tree 1%/point), Improved Bane of Agony 2% (tree 5/10%), Improved Life Tap and Improved Shadow Bolt 0%, Decimation 0% damage, Demonic Brand "3 attacks" at rank 3 (tree 6, Blizzard "2"). This sheet uses gs's tree, which follows the client trait curves. Wowhead **spell** tooltips print each rank at its maximum scaling level (Shadow Bolt 263-292, Life Tap 430 + Spirit, Death Coil 472); the sheet uses the level-60 values.

## Confidence labels

- **confirmed-forever**: Forever client data, a Wowhead Forever tooltip, Blizzard, or an in-game beta measurement (mostly at levels 10-30).
- **sim-provisional**: a choice made by one or both sims with no Forever source, or where sources disagree.
- **classic-fallback**: Forever says nothing, so the Classic 1.12 value is kept.

## Core rules

| Rule | Value | Confidence |
|---|---|---|
| Spell table vs +3 | **17% miss**, 1% floor, so the hit cap is +16%. Gear hit counts for spells (Forever pays item hit into every pool); Suppression +1%/point. DoTs and curses roll hit once when applied; ticks never miss. No spell crit suppression in gs | classic-fallback / sim-provisional |
| Partial resists | Level-based only (boss resistances 0): average **6%** on non-binary damage, rolled per hit or tick as 0% (81.8%), 25% (13.2%), 50% (4.3%) or 75% (0.7%). Binary in gs (miss or full damage): Immolate, Shadowburn, Death Coil, Siphon Life. Curse of the Elements' -75 resistance does nothing against a 0-resistance dummy | sim-provisional |
| Crit | Base 1.7% + Int/60.6 + gear. Spell crits 1.5x; Ruin and Pandemic 2.0x (see five things). **Periodic ticks crit**; beta bug #303: Siphon Life never crits | confirmed |
| DoTs | Dynamic: every tick uses current spell power, multipliers and debuffs (gs CORE-008). Recasting replaces the old one (gs APLs recast when remaining <= cast time) | confirmed (community) / sim-provisional |
| GCD | 1.5 s; magic GCDs shrink with casting speed down to 1.0 s (gs CORE-004). Off the GCD: Amplify Curse, Fel Domination, Demonic Sacrifice, racials, potions | confirmed / haste provisional |
| Haste | Casting speed: Spellstone +2%, Troll Berserking +10% (10 s / 3 min). In gs they speed casts and GCDs but **not channels**; only the separate spell haste stat (none on current gear) shortens channel ticks (CORE-005) | sim-provisional |
| Moving | No cast or channel while moving. Instants castable on the move: Banes, Curses, Corruption at 5/5 Improved Corruption (1.2 s cast at the 2/5 most builds take), Siphon Life, Shadowburn, Conflagrate, Death Coil, Life Tap and a Shadow Trance Shadow Bolt | classic-fallback |
| Channels | Cost paid at the start; ticks evenly spaced; moving or starting another spell ends it (Drain Soul fixed 1 Oct). gs UI uses a 150 ms channel clip delay. Drain ticks feed Nightfall | confirmed / clip delay sim-provisional |
| Mana | Pool **1093 + 15 x Int** (base mana 1373, the value "% of base mana" costs use); Fel Vitality +5%/point and Gnome Expansive Mind +5% multiply the pool. Spirit regen **6.25 + Spi/8 per s** only outside the five-second rule; MP5/5 per s always. Life Tap costs no mana, so it does not restart the five-second rule | classic-fallback / regen sim-provisional |
| Health | **1234 + 10 x Sta** (base 1414 with 65 Sta). Demonic Embrace +3%/point Stamina | classic-fallback |
| Soul Shards | Exist. Reagent for Soul Fire, Shadowburn, every summon but the Imp, Healthstone, Spellstone, Firestone. Drain Soul ticks have a **progressive chance** to give a shard (Blizzard); Shadowburn gives one if the target dies within 8 s; Shadow and Flame refunds Shadowburn's shard 20%/point; a Decimation proc makes Soul Fire free. Neither sim counts shards (WL-007) | confirmed / inventory not modeled |
| Threat | Searing Pain x2; Suppression -4%/point; Curse of the Elements and Recklessness +156 flat; Bane of Doom +160; Life Tap none; Demonic Brand Shadow hits high threat (x3 in gs) | classic-fallback / client |
| Races | Alliance Human, Gnome; Horde Orc, Troll, Undead. Orc Blood Fury +10% spell power 15 s / 2 min; Troll Berserking; Undead Touch of the Grave (10% per spell, 1 s ICD, drains 5% of your max health, ~7-9 DPS in fs); Gnome Eureka! (3 charges: -10% mana, +10% damage, 2 min) and +5% mana; Human +2% crit with a sword | confirmed |
| Pets | Inherit owner stats (Blizzard); cannot be buffed by anyone (#27, by design). Old demon is stunned while you summon a new one (8 Oct) | confirmed |

## Abilities (max rank at 60)

Costs, cast times, cooldowns and ranges are **confirmed-forever** (client rows and Wowhead). Damage is the level-60 client value; "+0.857" is the spell power coefficient. All are 1.5 s GCD unless noted.

| Ability | Id | Icon | Mana | Cast / CD | Effect at 60 | Notes |
|---|---|---|---|---|---|---|
| Shadow Bolt r10 | 25307 | spell_shadow_shadowbolt | 380 | 3 s (2.5 with Bane 5/5) | 253-283 Shadow +0.857 | Projectile 20 yd/s, 30 yd. r9 11661: 370 mana, 237-265. Halved from Classic |
| Immolate r8 | 25309 | spell_fire_immolation | 380 | 2 s (1.5) | 158 Fire +0.2, then 5 x 55 +0.13 every 3 s (15 s) | Aftermath +10%/point to the direct part only |
| Corruption r7 | 25311 | spell_shadow_abominationexplosion | 340 | 2 s (-0.4 s per Improved Corruption point) | 6 x 73 Shadow +0.2 every 3 s (18 s) | Improved Corruption also +2%/point damage |
| Bane of Agony r6 (was Curse of Agony) | 11713 | spell_shadow_curseofsargeras | 215 | instant | 552 over 24 s: 12 ticks every 2 s, base 23 / 46 / 69 per 4-tick block, +0.133 SP every tick | Bane slot. Amplify Curse +50% base |
| Bane of Doom (was Curse of Doom) | 603 | spell_shadow_auraofdarkness | 300 | instant / 60 s | **1742 + 4.0 SP** Shadow after 60 s (one tick) | Bane slot. Doomguard chance only if it kills (never on a dummy) |
| Bane of Havoc (Destro 21) | 1225228 | ability_warlock_baneofhavoc | 5% base (69) | instant | 15% of your damage to other targets copied to it, 5 min, 1 target | Bane slot; useless single-target |
| Curse of the Elements r4 | 1311680 | warlock_curse_shadow | 200 | instant | All magic schools: -75 resistance, **+10% damage taken**, 5 min | Curse slot; also a raid debuff |
| Curse of Recklessness r4 | 11717 | spell_shadow_unholystrength | 115 | instant | -505 armor 2 min (no +AP in Forever); shares the minor-armor slot with Faerie Fire | Curse slot |
| Curse of Weakness r6 / Tongues r2 / Exhaustion | 11708 / 11719 / 18223 | spell_shadow_curseofmannoroth / spell_shadow_curseoftounges / spell_shadow_grimward | 175 / 110 / 8% base | instant | -37 physical damage 2 min / +60% cast time 30 s / -30% speed 12 s (talent) | Curse slot; utility |
| Siphon Life r4 (Affli 21) | 18881 | spell_shadow_requiem | 365 | instant | 10 x 41 +0.05 every 3 s (30 s), heals you the damage | Binary in gs. Beta: never crits (#303) |
| Drain Life r6 | 11700 | spell_shadow_lifedrain02 | 300 | 5 s channel | 5 x 51 +0.1 per 1 s, heals the damage | 20 yd |
| Drain Soul r4 | 11675 | spell_shadow_haunting | 290 | 15 s channel | 5 x 84 +0.1 every 3 s | Shard chance per tick; no execute bonus in Forever |
| Wrack (Affli 31) | 1316697 | ability_deathknight_hemorrhagicfever | 200 | 6 s channel | 6 x 36 +0.143 per 1 s; your Corruption and Bane of Agony take **+10%** while it runs | Client mask: Corruption + Agony only; Blizzard text: "other Shadow DoTs" |
| Searing Pain r6 | 17923 | spell_fire_soulburn | 168 | 1.5 s | 107-126 Fire +0.429 | **2x threat**. Lights Demonic Brand and Decimation |
| Soul Fire r2 | 17924 | spell_fire_fireball02 | 335 + shard | 6 s (4 with Bane) / 60 s | 390-487 Fire +1.0 | Decimation: 6 s cooldown, and in execute -40% cast time and no shard |
| Incinerate r3 (Destro 31) | 1293813 | spell_fire_burnout | 325 | 2.5 s (2.0) | 201-233 Fire +0.714; **+25% if your Immolate is up** | gs scales only the base (WL-002) |
| Conflagrate r6 (Destro 16) | 18932 | spell_fire_fireball | 255 | instant / 10 s | 251-313 Fire +0.429 | Needs your Immolate; consumes it unless Shadow and Flame (20%/point) |
| Shadowburn r6 (Destro 11) | 18871 | spell_shadow_scourgebuild | 365 + shard | instant / 15 s | 258-288 Shadow +0.429 | Shard back if the target dies in 8 s |
| Death Coil r3 | 17926 | spell_shadow_deathcoil | 600 | instant / 2 min | 460 Shadow +0.214, heals you 100%, 3 s horror | Projectile 24 yd/s. Bosses ignore the horror |
| Hellfire r3 | 11684 | spell_fire_incinerate | 1300 | 15 s channel | 15 x 210 Fire +0.022 to you and to all nearby enemies | Crits since 1 Oct. Bug #311: Malediction raises only the self-damage. Not in gs |
| Rain of Fire r4 | 11678 | spell_shadow_rainoffire | 1185 | 8 s channel | 4 x 221 Fire +0.083 every 2 s, 8 yd area | Each tick is its own spell (1282385) |
| Life Tap r6 | 11689 | spell_shadow_burningspirit | 0 | instant | (424 + Spirit) x (1 + 0.1 x ILT) health to mana | See rules. Pet gets 50/100% with Demonic Energies |
| Amplify Curse (Affli 11) | 18288 | spell_shadow_contagion | 0 | off GCD / 3 min | next Bane of Agony or Curse of Weakness +50%, Exhaustion +20%, 30 s | Does not touch Doom or Elements |
| Demon Armor r5 / Demon Skin r2 | 11735 / 696 | spell_shadow_ragingscream | 1580 / 120 | instant | +570 armor, +15 Shadow res, 15 HP per 5 s / +120 armor, 5 HP per 5 s; 30 min | Demonic Aegis +15%/point. **Fel Armor: not available** |
| Demonic Sacrifice (Demo 11) | 18788 | spell_shadow_psychicscream | 0 | off GCD | Kills your demon: Imp **Burning Shadow** +15% Shadow; Succubus/Incubus **Touch of Fire** +15% Fire; Voidwalker **Fel Energy** 2% mana / 4 s; Felhunter **Fel Stamina** 3% health / 4 s; 2 h | Summoning any demon cancels it (Demonic Pact: only the same demon) |
| Soul Link (Demo 21) | 19028 | spell_shadow_gathershadows | 20% base (275) | instant | 30% of your damage taken goes to the demon; you and it +3% damage | Bug #302 below level 30 only |
| Fel Domination (Demo 16) | 18708 | spell_nature_removecurse | 0 | off GCD / 5 min | next summon -5.5 s cast, -50% mana | Classic 15 min |
| Summon Imp / Voidwalker / Succubus / Incubus / Felhunter | 688 / 697 / 712 / 713 / 691 | spell_shadow_summonimp / summonvoidwalker / summonsuccubus / ability_warlock_incubus / summonfelhunter | 80% / 100% base | 10 s cast | | Shard for all but the Imp. Master Summoner -2 s and -20% per point |
| Healthstone (Major) | 11730 / 11732 | inv_stone_04 | 1120 to make | 3 s to make | restores 1440 health | Improved Healthstone removed |
| Spellstone / Firestone (Major) | 17728 / 17953 | inv_misc_gem_sapphire_01 / inv_misc_gem_bloodstone_02 | 1000 / 1100 to make | | weapon imbue: +2% spell haste and +21 Shadow (gs: Fire too) / +2% spell crit and +21 Fire | **Stack with Wizard Oil** in Forever. gs: +20-28 DPS |

**Removed or unavailable:** Curse of Shadow, Dark Pact, Felguard, Fel Armor, Metamorphosis (all SoD records with no learning path), Improved Firebolt, Improved Lash of Pain, Devastation, Emberstorm, Improved Immolate, Grim Reach, Fel Intellect, Fel Stamina. Drain Mana (11704, 5 s channel, 140 mana/s) is still in the client; the dummy has no mana.

## Procs, debuffs and passives

| Name | Value | Notes |
|---|---|---|
| Nightfall (Affli, 2) | 2%/point per tick of Corruption, Drain Life, Drain Soul and Wrack: **Shadow Trance** (17941, spell_shadow_twilight), next Shadow Bolt instant, 10 s | 4%/tick at 2/2 = ~22% per Corruption |
| Improved Shadow Bolt (Destro, 5) | Shadow Bolt crit: **Shadow Vulnerability** (17794, spell_shadow_shadowbolt) on the target, +4%/point to **your** Shadow damage (bolts and DoT ticks), 12 s, no charges, refreshed by each crit | Personal, not a raid debuff |
| Ruin (Destro, 5) | crit damage bonus +20%/point on Destruction spells (2.0x at 5/5) | |
| Pandemic (Affli, 3) | crit damage bonus +33/67/100% on Corruption, Agony, Doom, Drain Life, Drain Soul, Siphon Life, Wrack | |
| Malevolence / Malediction / Shadow Mastery | +1%/point Shadow crit / +1%/point all your periodic damage / +1%/point Shadow damage (all 5 ranks) | Shadow Mastery was 2%/point |
| Agonizing Flames (Destro, 3) | +3/7/10% Destruction damage and Searing Pain crit | |
| Bane (Destro, 5) | -0.1 s per point on Shadow Bolt, Immolate, Incinerate; -0.4 s on Soul Fire | |
| Shadow and Flame (Destro, 5) | Conflagrate hit: **Shadow** buff (1293816) +2%/point Shadow damage 20 s; Shadowburn hit: **Flame** (426311) +2%/point Fire 20 s; 20%/point to keep Immolate and to refund the shard | Both near 100% uptime on cooldown |
| Fire and Brimstone (Destro, 3) | Conflagrate +8/17/25% crit | |
| Decimation (Demo, 2) | Soul Fire cooldown -45/90%. Shadow Bolt or Searing Pain on a target **below 35%**: +3/6% damage and a 10 s buff (440873) giving Soul Fire -20/40% cast time and no shard | Execute only. The yard's 15%-health start can show it |
| Demonic Brand (Demo, 3) | Searing Pain brands the target 10 s (1293696): your pet's next 2/4/6 attacks add **65-68 + 0.078 x your school power** (Shadow for melee demons, high threat; Fire for the Imp) | Brand count conflicts (Wowhead 3, Blizzard 2) |
| Demonic Knowledge (Demo, 3) | +33/67/100% of your level as spell power (20/40/60 at 60) for you **and** the demon while it is out | Blizzard article: "up to 33%" (WL-009) |
| Master Demonologist (Demo, 5) | you and the demon, 2%/point: Imp +Fire damage, Succubus +Shadow damage, Voidwalker -physical taken, Felhunter -magic taken | |
| Unholy Power / Improved Imp / Improved Sayaad | demon damage +2%/point / Firebolt +10%/point / Lash of Pain +10%/point | |
| Soul Harvest (Affli, 2) | a kill under Drain Soul: +50/100% mana regen and 50/100% regen while casting for 10 s | Never on a dummy |
| Demonic Energies (Demo, 2) | heals your demon 8/15% of your spell damage; demon gets 50/100% of Life Tap mana | |
| Improved Drains / Soul Siphon | Drain Life, Drain Soul, Wrack +7/13/20% / +4%/point per other Affliction effect on the target, max 3 | |
| Curse of the Elements (raid) | +10% magic damage taken | Any warlock can provide it; it uses that warlock's Curse slot |

Not raid debuffs any more: Improved Shadow Bolt (personal). Shadow Weaving buffs the priest, not the target. Gnome Eureka! currently also boosts DoTs already ticking (#35, changed 1 Oct).

## Pets

**gs model:** every demon at 60 has Str 129, Agi 85, Sta 234, Int 70, Spi 150, mana 1066 (Imp: Str 122, Agi 35, Sta 86, Int 264, Spi 260, mana 576). Melee AP = 2 x Str - 20 + **10% of max(owner AP, owner RAP, owner spell power + best school power)**; pet spell power = 10% of that spell power; plus 100% of the owner's melee and spell hit and crit, 30% of armor and 2 health per owner Stamina (shared beta-wiki assumption, T29). Melee crit = 3.27% + Agi/20 + owner melee crit. Pets take no external buffs. fs (1 Oct) gives demons **no** inheritance; Blizzard's 7 Oct article says they scale.

| Demon | Attack | Ability | Notes |
|---|---|---|---|
| Imp | none | **Firebolt r7** 11763: 2 s cast, 1 s pet GCD, 115 mana, 30 yd; gs 41.5-46.5 (fs 42.4-47.6) + 0.571 x pet SP Fire. gs adds a 0.2 s recast gap | **Blood Pact** (11767) party +54 Stamina. Fire Shield 13 per hit taken. Regen Spi/5 per s outside the five-second rule, so it pauses when dry (gs) |
| Succubus / Incubus | 95-131 @ 2.0 s | **Lash of Pain r6** 11780: 50 + 0.429 x pet SP Shadow, 160 mana, 12 s, melee range | Default DPS demon (gs and fs say it beats the Imp without pet talents). Seduction / Soothing Kiss are utility |
| Felhunter | 70-97 @ 2.0 s | Spell Lock, Devour Magic, Tainted Blood, Paranoia | Utility. Sacrifice = 3% health / 4 s |
| Voidwalker | 31-46 @ 2.0 s | Torment, Suffering, Sacrifice (absorb 1943, 30 s), Consume Shadows | Sacrifice = 2% mana / 4 s (Demonic Pact gs preset) |
| Doomguard, Infernal | | | Not usable on a raid boss: Doom must kill, Inferno is outdoors-only (1 h), Ritual of Doom needs 5 players |

**Practice-yard pet model:** one generic pet with its own mana bar, a 2.0 s melee swing (Succubus, Felhunter, Voidwalker) on the melee table from behind (miss 8% minus owner hit, dodge 6.5%, glancing 40% at 0.65, crit 3.3% + 4.25% + owner melee crit - 4.8%), and a spell queue: the Imp casts Firebolt back to back (2.0 s + 0.2 s) while it has 115 mana; the Succubus casts Lash of Pain every 12 s. Swing damage = (113 + petAP/7) x Unholy Power x Soul Link; armor applies. Multipliers: Unholy Power 1.02/point, Soul Link 1.03, Master Demonologist on its school, Demonic Knowledge adds to pet SP. Demonic Brand: a target aura with N charges; each landed pet attack spends one and adds 65-68 + 0.078 x owner Shadow (or Fire) power as a separate magic hit that can crit.

## Talents

Talent strings use gs's order (`ui/core/talents/trees/warlock.json` = `proto/warlock.proto`, `TalentTreeSizes = {17, 19, 16}` = fs): **Affliction 17, Demonology 19, Destruction 16**. A row needs 5 points per row above it; prerequisites must be maxed; the 31-point talents sit on row 7. **New in Forever** in bold, renamed in italics. Per-rank values, icons and Forever spell ids are in the JSON with `talents.tsSnippet`.

- **Affliction**: improvedLifeTap 2, suppression 5, improvedCorruption 5, **malediction** 5, *soulHarvesting* 2, **improvedDrains** 3, *improvedBaneOfAgony* 2, felConcentration 3, amplifyCurse 1, **pandemic** 3, **malevolence** 5, nightfall 2, curseOfExhaustion 1 (needs Amplify Curse), siphonLife 1, **soulSiphon** 3, shadowMastery 5, **wrack** 1 (needs Siphon Life).
- **Demonology**: improvedHealthFunnel 2, improvedImp 3, demonicEmbrace 5, unholyPower 5, **demonicAegis** 2, improvedVoidwalker 3, **felVitality** 3, **demonicEnergies** 2, *improvedSayaad* 3, demonicSacrifice 1, masterSummoner 2, **decimation** 2, felDomination 1 (needs Master Summoner), **demonicBrand** 3, **improvedFelhunter** 3, soulLink 1 (needs Demonic Sacrifice), **demonicKnowledge** 3, masterDemonologist 5, **demonicPact** 1 (needs Soul Link).
- **Destruction**: destructiveReach 2, improvedShadowBolt 5, bane 5, **moltenSkin** 5, cataclysm 3, aftermath 5, ruin 5, shadowburn 1, intensity 3, **agonizingFlames** 3, conflagrate 1, pyroclasm 2 (needs Intensity), **baneOfHavoc** 1, **fireAndBrimstone** 3 (needs Conflagrate), **shadowAndFlame** 5, **incinerate** 1 (needs Bane of Havoc).

Talent values that change the rotation or the numbers (per rank, from gs's tree):

| Talent | Per rank | At max | Effect |
|---|---|---|---|
| Improved Life Tap | 10% | 20% | Life Tap health and mana (gs applies it to both) |
| Suppression | 1% hit, -4% threat | 5% / -20% | |
| Improved Corruption | -0.4 s, +2% | instant, +10% | builds stop at 1-3 points (1.2-2.0 s casts) |
| Malediction / Malevolence / Shadow Mastery | 1% | 5% | periodic damage / Shadow crit / Shadow damage |
| Pandemic | +33/67/100% crit bonus | 2.0x | listed DoTs and drains |
| Nightfall | 2% per tick | 4% | Shadow Trance |
| Improved Bane of Agony | 5% | 10% | Agony base damage |
| Improved Shadow Bolt | 4%, 12 s | 20% | personal Shadow debuff on a Shadow Bolt crit |
| Bane | -0.1 s (Soul Fire -0.4 s) | -0.5 / -2.0 s | |
| Cataclysm | 3/6/10% | 10% | Destruction mana cost |
| Aftermath | +10% Immolate direct | +50% | Conflagrate daze 20%/point |
| Ruin | +20% crit bonus | 2.0x | Destruction spells |
| Agonizing Flames | 3/7/10% | 10% | Destruction damage and Searing Pain crit |
| Fire and Brimstone | 8/17/25% | 25% | Conflagrate crit |
| Shadow and Flame | 2% / 20% | 10% / 100% | buffs; keep Immolate; refund shard |
| Demonic Embrace / Fel Vitality | 3% Sta / 5% pet health, mana and your mana | 15% | |
| Unholy Power / Improved Imp / Improved Sayaad | 2% / 10% / 10% | 10% / 30% / 30% | demon damage |
| Master Demonologist | 2% | 10% | per demon |
| Demonic Knowledge | 33/67/100% of level | +60 SP | you and the demon while it is out |
| Decimation | -45% Soul Fire CD, +3%, -20% cast | 90% / 6% / 40% | execute |
| Demonic Brand | 17/33/50% less Searing Pain threat, 2/4/6 charges | 6 | |

## Builds

| Build | Split | Talent string (gs order) | Demon | Sim result |
|---|---|---|---|---|
| **gs Demonic Pact** (ranked) | 2/31/18 | `011-0005003221220311351-0550005003` | Succubus out, Voidwalker sacrificed, Spellstone | Orc 916, Troll 906, **Undead 930**, Human 923, Gnome 911 DPS |
| **gs Affliction** (ranked) | 31/0/20 | `2525000013520105--0550015103` | Succubus, Spellstone | Orc 826, Troll 816, Undead 827, **Human 835**, Gnome 815 |
| **gs Destruction / Shadow and Flame** (ranked) | 13/5/33 | `2521000003-0005-0050355103101351` | Succubus, Firestone | Orc 813, Troll 817, Undead 820, **Human 820**, Gnome 806 |
| **gs DS/Ruin** (ranked, UI default) | 21/11/19 | `252200001351-0025003001-0550005103` | Imp sacrificed (+15% Shadow), Spellstone | Orc 791, Troll 780, Undead 802, **Human 805**, Gnome 790 |
| fs Demonic Pact (= gs test string) | 5/31/15 | `113-0005003221220311351-0550005` | Succubus + Imp sacrificed | fs 492.7 (Orc, pre-raid, 180 s); gs golden 556 |
| fs Deep Affliction | 35/0/16 | `2535002013521105--05000551` | Succubus | fs 468.0 |
| gs test Affliction (Bane instead of Aftermath) | 35/0/16 | `2535002013521105--05500051` | Succubus | gs golden 554 |
| fs DS/Ruin Pandemic (= gs test) | 24/11/16 | `25220010135201-0025003001-05500051` | Imp sacrificed | fs 468.5; gs golden 492 |
| fs Shadow and Flame (= gs test) | 13/11/27 | `25501-0025003001-055035510010002` | Imp sacrificed | fs 443.2; gs golden 472 |
| fs older presets | 5/31/15, 36/0/15, 24/11/16 | `203-0055003221201001351-0550005`, `2435002013520135--0500055`, `233500201332-0340003001-0550105` | | none |

gs ranked results: 300 s, modeled ilvl-65 cloth, full raid buffs and consumables (`docs/modelled_build_reviews.md`), 0 mana-limited seconds for all four. gs goldens and fs use pre-raid PvP or pre-BiS gear and are only relative. fs labels its Pact build "2/31/18", but the string decodes as 5/31/15. **All 15 strings decode cleanly on gs's tree** (row and prerequisite checks pass). Contents:
- **Pact 2/31/18**: Suppression 1, Improved Corruption 1 / Unholy Power 5, Fel Vitality 3, Demonic Energies 2, Improved Sayaad 2, Demonic Sacrifice, Master Summoner 2, Decimation 2, Demonic Brand 3, Improved Felhunter 1, Soul Link, Demonic Knowledge 3, Master Demonologist 5, Demonic Pact / Improved Shadow Bolt 5, Bane 5, Ruin 5, Agonizing Flames 3. fs prefers an Imp sacrifice (+15% Shadow, "~7% better"); gs sacrifices the Voidwalker for mana.
- **Affliction 31/0/20**: Improved Life Tap 2, Suppression 5, Improved Corruption 2, Malediction 5, Amplify Curse, Pandemic 3, Malevolence 5, Nightfall 2, Siphon Life, Shadow Mastery 5 / Improved Shadow Bolt 5, Bane 5, Aftermath 1, Ruin 5, Shadowburn, Agonizing Flames 3. No Wrack.
- **Shadow and Flame 13/5/33**: Improved Life Tap 2, Suppression 5, Improved Corruption 2, Malediction 1, Pandemic 3 / Unholy Power 5 / Bane 5, Cataclysm 3, Aftermath 5, Ruin 5, Shadowburn, Agonizing Flames 3, Conflagrate, Bane of Havoc, Fire and Brimstone 3, Shadow and Flame 5, Incinerate.
- **DS/Ruin 21/11/19**: Improved Life Tap 2, Suppression 5, Improved Corruption 2, Malediction 2, Amplify Curse, Pandemic 3, Malevolence 5, Nightfall 1 / Demonic Embrace 2, Unholy Power 5, Fel Vitality 3, Demonic Sacrifice / Improved Shadow Bolt 5, Bane 5, Ruin 5, Shadowburn, Agonizing Flames 3.

**Alternative and experimental:** no sim casts **Wrack** (gs T07: implemented, zero casts); Hellfire and Rain of Fire AoE are unranked (gs lacks Hellfire); Bane of Havoc only pays with two targets; Searing Pain "tank" play has no build. **No tank warlock**: no Metamorphosis, no Felguard, no tank row on MythicSim.

## Suggested ability (priority lists)

gs APLs (all four): potion at <= 75% mana, Demonic Rune at <= 60% (both with >= 15 s left), cooldowns, **Life Tap at < 10% mana**, **Curse of the Elements if missing**, then:
- **Affliction**: Amplify Curse on cooldown; **Bane of Doom** if not ticking (>= 61 s left); Bane of Agony if Doom is not up and Agony has <= its cast time left; Corruption, Siphon Life, Immolate each when remaining <= cast time (>= 12 s left); Shadow Bolt. Pre-pull Amplify Curse at -5 s. Execute: Searing Pain at <= 3.5 s left, Shadowburn at <= 1.5 s.
- **DS/Ruin**: Demonic Sacrifice (Imp) and Amplify Curse at -5 s; the Affliction list without Siphon Life.
- **Shadow and Flame**: Immolate at <= cast time left; **Conflagrate** when Immolate has <= 15 s (always, since 5/5 keeps it); Doom; Agony if no Doom; Corruption; **Shadowburn on cooldown**; Incinerate.
- **Demonic Pact**: Soul Link at -1 s; Life Tap at <= 10%; Curse of the Elements; **Searing Pain when the target has no Demonic Brand charges**; Doom (>= 61 s); Agony if neither is up (>= 16 s); Corruption (>= 12 s); Immolate (>= 8 s); **Soul Fire during Decimation**; Shadow Bolt.
- **fs** (1 Oct): no Bane of Doom anywhere (Agony refreshed instead), no Searing Pain or Soul Fire in Pact, and its "Shadow and Flame" list is Shadowburn + Shadow Bolt with **no Incinerate or Conflagrate**. DS/Ruin and Destruction Life Tap at -1.5 s.

**Practice-yard hints** (no fight-length checks; the dummy never dies):
- **Every spec**: Curse of the Elements up (skip it if a raid warlock provides it); **Bane of Doom on cooldown**, Agony only if Doom missed; refresh a DoT when its remaining time is <= its cast time (Corruption 1.2 s, Immolate 1.5 s; instants when they drop). Use a Shadow Trance instant Shadow Bolt right away, or save it for movement. Life Tap below ~15% mana and while moving, never below ~30% health unless "raid healing" is on.
- **Affliction**: Corruption, Siphon Life, Immolate, Doom, then Shadow Bolt. Amplify Curse only helps Agony, so skip it with Doom.
- **DS/Ruin**: sacrifice the Imp before the pull; Corruption, Immolate, Doom, Shadow Bolt.
- **Shadow and Flame**: Immolate once, Conflagrate and Shadowburn on cooldown (keeps both 10% buffs up; Immolate only needs refreshing at its end), Corruption, Doom, Incinerate filler.
- **Demonic Pact**: Voidwalker sacrifice, then Succubus and Soul Link; Searing Pain whenever the Brand is spent; Soul Fire during Decimation (execute only); Shadow Bolt filler.

## Default stats

There is no confirmed level-60 Forever gear. gs's UI default gear (DS/Ruin, Affliction and Pact): Bloodvine Goggles, Vest and Leggings, Chains of the Lich, Mantle of the Timbermaw, Fel Cape, Runecloth Cuffs, Gloves of Spell Mastery, Belt of the Archmage, Earthen Silk Slippers, Blackstone Ring, Electrocutioner Lagnut, Frozen and Molten Heart of the Mountain, Sageblade 58-109 @ 1.8, Truesilver Conduit, **Brilliant Wand 33-62 @ 1.2**: Sta 58, Int 89, Spi 14, SP 189, Shadow +15, MP5 9, hit 7.9%, crit 6%. Destruction swaps in Hide of the Wild, Netherflame Cuffs and Searing Golden Blade: Int 97, SP 192, Fire +52, hit 6.9%, crit 5%. Race Orc (`sim.ts`). Warlock base at 60: health 1414, mana 1373, Str 45, Agi 50, Sta 65, Int 110, Spi 115 (Orc +3/-3/+2/-3/+3, Undead -1/-2/+1/-2/+5, Gnome -5/+3/-1/+3/0, Troll +1/+2/+1/-4/+1). Wands no longer gain spell damage (24 Sep).

| Preset (Orc, our derived unbuffed sheet incl. talents and stone) | Shadow SP | Fire SP | Crit (Shadow) | Hit (miss) | Int / Spi / Sta | Mana | Health |
|---|---|---|---|---|---|---|---|
| DS/Ruin 21/11/19 (+Burning Shadow x1.15) | 225 | 210 | 10.9% (15.9%) | 12.9% (4.1%) | 196 / 132 / 132.5 | 4,638 | 2,559 |
| Affliction 31/0/20 | 225 | 210 | 10.9% (15.9%) | 12.9% (4.1%) | 196 / 132 / 125 | 4,033 | 2,484 |
| Shadow and Flame 13/5/33 (Firestone) | 192 | 265 | 12.1% | 11.9% (5.1%) | 204 / 137 / 110 | 4,153 | 2,334 |
| Demonic Pact 2/31/18 (incl. +60 Demonic Knowledge) | 285 | 270 | 10.9% | 8.9% (8.1%) | 196 / 132 / 125 | 4,638 | 2,484 |

MP5 9 on every sheet; Spirit regen 22.75 mana/s outside the five-second rule. Succubus on the Affliction sheet: AP 260.5, melee crit 17.9% (13.1% vs the boss), pet SP 22.5. gs defaults add Arcane Brilliance, Divine Spirit, Gift of the Wild, Fortitude, Mana Spring, Moonkin Aura, Kings, Wisdom, Judgement of Wisdom, Flask of Supreme Power, Greater Arcane Elixir, Elixir of Shadow Power, Brilliant Wizard Oil, Mageblood, Major Mana Potion and Demonic Rune.

**Suggested round demo sheets (provisional, raid-buffed):** **Affliction / DS/Ruin** Shadow power 450, Fire 420, crit 14% (+5% Shadow), hit 13%, Spirit 180, mana 5,800, health 3,600. **Shadow and Flame** Fire 480, Shadow 400, crit 16%, hit 12%. **Pact** Shadow 500, crit 14%, hit 10%, Succubus AP 300.

## Worked examples

DS/Ruin Orc sheet (Shadow 225, Fire 210; Burning Shadow x1.15; Agonizing Flames +10% on Destruction spells; Malediction 2/5; Improved Corruption 2/5; Shadow crit 15.9%, Fire crit 10.9%; miss 4.1%; average partial resist 6%):
- **Shadow Bolt**: 268 + 0.857 x 225 = 460.8 -> x1.10 x1.15 = **583**; with Improved Shadow Bolt **700**; with Curse of the Elements too **770** (crit 1,539 at 2.0x). Expected ~804 per 2.45 s cast.
- **Corruption tick**: 73 + 0.2 x 225 = 118 -> x1.06 x1.15 = **144**; with ISB and Elements **190** (crit 380, Pandemic); 1,139 over 18 s before crits.
- **Bane of Agony** (Amplify Curse adds +276 base): ticks 23/46/69 + 29.9 -> x1.02 x1.15 = **62 / 89 / 116** per 4-tick block, 1,069 over 24 s (1,411 with ISB and Elements). **Bane of Doom**: 1742 + 900 = 2,642 -> **3,099** (4,091 with ISB and Elements, crit 8,182) every 60 s, ~74 DPS.
- **Immolate**: direct 158 + 42 = 200 -> x1.10 = **220** (242 with Elements, crit 484); tick 55 + 27.3 = 82.3 -> x1.12 = **92** (101 with Elements), 5 ticks.
- **Life Tap**: (424 + 132) x 1.2 = **667 health -> 667 mana** (556 without Improved Life Tap), 26% of 2,559 health; 7 taps refill an empty 4,638 pool.
- **Destruction sheet** (Fire 265): **Incinerate** on Immolate (gs base-only bonus) 217 x 1.25 + 0.714 x 265 = 460.5 -> x1.10 = **507** (557 with Elements, 613 with the Flame buff; 559 if the bonus covers the whole hit). **Conflagrate** 282 + 113.7 -> **435**, crit chance 37% with Fire and Brimstone. **Shadowburn** 273 + 82 -> **391**.
- **Pet swing** (Affliction Succubus, AP 260.5): 113 + 260.5/7 = **150** raw -> **89.5** after 3,731 armor (x0.596); crit 13% vs the boss. **Lash of Pain** 50 + 0.429 x 22.5 = **60** every 12 s. **Firebolt** 44 + 0.571 x 22.5 = **57** (74 with Improved Imp 3/3).
- **Mana per minute** (gs ranked, Human/Undead, 300 s logs / 5): Affliction spends **9,330** (Shadow Bolt 5,880, Immolate 1,316, Corruption 1,046, Siphon Life 689) against Life Tap +4,930, potion +1,070, rune +721, Judgement of Wisdom +664, regen +619. DS/Ruin spends **9,212** (Life Tap +4,477). Shadow and Flame spends **8,985** (Incinerate 3,884, Immolate 1,339, Conflagrate 1,270, Shadowburn 1,131; Life Tap +4,379). Pact spends **~8,940** (Life Tap +2,414, Fel Energy +2,372). **Solo on the dummy** without potions or Judgement of Wisdom, mana comes only from Life Tap: ~13 taps (~9,000 health, ~150 HPS of healing) and ~20 s of GCDs per minute.

## Life Tap, health and mana in the yard (the decision)

**The problem:** a warlock spends ~9,000 mana per minute and its pool is 4,000-4,600. In a raid, Life Tap (~4,400-4,900/min), Major Mana Potions, Demonic Runes, Judgement of Wisdom and regen cover it, and healers cover Life Tap's health. gs models that by not charging Life Tap's health to a DPS warlock at all; fs charges it and has no healing.

**Recommendation:** charge the health and give the player a choice.
1. **Health bar always on for the warlock** (`playerHealthLocked = false`). Life Tap removes `(424 + Spirit) x (1 + 0.1 x ILT)` health and adds the same mana (x1.2 mana only with Tier 1 five-piece); it is refused if it would leave you at 0.
2. **"Raid healing" setting**: Off / 100 / 150 / 250 HPS, applied whether or not the dummy attacks. Default 150 HPS: enough for Life Tap-only sustain (~9,000 health per minute).
3. **Self-healing that already exists in the kit**: Siphon Life (~18 HPS on our sheet), Drain Life (100% of damage), Death Coil (460+), Major Healthstone (1,440), Demon Armor (3 HP/s), Felhunter sacrifice (3% max health per 4 s), Undead Touch of the Grave.
4. **Consumables**: Major Mana Potion (1,350-2,250 mana; potion timer) and Demonic Rune (900-1,500 mana for 600-1,000 health; shares the Healthstone timer, category 30) on the bar; the client rows list 60 s category cooldowns where Classic items used 2 min, so keep 2 min until confirmed; a "raid Judgement of Wisdom" toggle (~660-870 mana/min in gs).
5. **Review lines**: Life Taps cast (and how many while moving, which is free time), health spent, time below 30% health, GCDs spent tapping, mana wasted at full, mana-starved time.

Cues: "Tap now" when mana < 15% or you are moving with nothing better to cast; "Stop tapping" below 35% health without raid healing.

## Raid buffs and debuffs for the yard list

Warlock-relevant entries: Curse of the Elements (+10% magic damage; mark it as "from another warlock" so the player can spend the Curse slot elsewhere), Judgement of Wisdom (mana), Moonkin Aura (+3% spell crit), Arcane Brilliance, Prayer of Spirit / Divine Spirit (Spirit feeds Life Tap 1:1), Blessing of Kings, Blessing of Wisdom, Mana Spring, Fortitude and Mark of the Wild, Blood Pact (from your own Imp: +54 Stamina to the party). Physical debuffs (Sunder Armor, Faerie Fire, Curse of Recklessness) matter only to the demon's melee. Improved Shadow Bolt and Shadow Weaving are not raid debuffs in Forever.

## What the practice yard engine still needs

The engine already has casts with haste, a hasted 1.0 s-floor GCD, interruption on movement, crit-capable DoT ticks, the spell table, procs, mana with the five-second rule, a player health bar, absorbs, projectiles, raid buffs and debuffs, per-school damage-taken debuffs, a generic `channel` ability (cost up front, evenly spaced ticks, moving ends it, a new spell clips it) and a hunter pet. For the warlock it is missing:
1. **Health as a resource**: Life Tap and Demonic Rune spend health (cannot cast if it would kill), and a "raid healing HPS" setting that works without an attacking dummy. Healing to the player from Siphon Life, Drain Life, Death Coil, Healthstone, Demon Armor, Fel Stamina; Touch of the Grave.
2. **Per-school spell power** (generic + Shadow + Fire) and **per-spell crit multipliers** (1.5x, 2.0x with Ruin or Pandemic); `Stats` has one `spellPower` and `AttackRules` one `spellCritMultiplier`.
3. **Partial resists** (0/25/50/75%, 6% average vs +3) and **binary spells**; today a spell either resists or lands.
4. **DoT slots and exclusivity**: dynamic ticks; one Curse slot and one Bane slot per caster; Bane of Agony's ramp; Bane of Doom's single 60 s tick; Conflagrate consuming Immolate (unless Shadow and Flame); Wrack's +10% on two specific DoTs; refresh rules; "your" debuffs separate from raid debuffs (ISB, Elements).
5. **Channel details**: per-tick crit and partial resist, drain healing per tick, Nightfall rolls per tick, Hellfire self-damage, channel speed ignoring casting-speed buffs, a 0.15 s clip delay.
6. **A generic caster pet**: own mana and regen, cast times and a pet GCD, cooldown abilities, a melee swing, owner stat inheritance, summoning (10 s cast, stuns the old pet), Fel Domination, Demonic Sacrifice turning the pet into a 2-hour buff, Demonic Pact, Soul Link, Master Demonologist auras, Blood Pact, Demonic Brand charges, Demonic Energies (pet heal, Life Tap mana share), Demonic Knowledge.
7. **Proc and buff hooks**: Shadow Trance making the next Shadow Bolt instant, ISB on Shadow Bolt crits, Decimation below 35% (the 15%-health start already exists), Shadow and Flame buffs, Amplify Curse's next-curse buff.
8. **Soul Shard counter** (Soul Fire, Shadowburn, summons; Drain Soul's progressive chance; Shadow and Flame refund) and **weapon imbues** (Spellstone casting speed, Firestone crit) that stack with oils.
9. **Threat modifiers**: Searing Pain x2, Suppression -20%, Brand high threat.

## What changed from Classic 1.12

- Curses split into Curses and Banes; Curse of Agony and Doom are Banes; Curse of Shadow removed; Curse of the Elements covers all magic; Recklessness gives no attack power.
- Almost every damage rank roughly halved (Shadow Bolt 253-283, Searing Pain 107-126, Soul Fire 390-487, Conflagrate 251-313, Corruption 438, Agony 552) while coefficients rose (Corruption 0.2 per tick, Agony 0.133, Immolate 0.2/0.13, drains 0.1); Bane of Doom 1742 + 4.0 SP; downranking penalties removed on low ranks.
- Life Tap scales with Spirit; DoTs crit and are dynamic; Drain Soul gives shards per tick; Conflagrate has 6 ranks; Fel Domination 5 min; stones are weapon imbues that stack with oils; pets inherit stats and cannot be buffed.
- New: Incinerate, Wrack, Bane of Havoc, Demonic Pact, Demonic Brand, Decimation, Demonic Knowledge, Pandemic, Malevolence, Malediction, Soul Siphon, Improved Drains, Fel Vitality, Demonic Energies, Demonic Aegis, Molten Skin, Agonizing Flames, Fire and Brimstone, Shadow and Flame, Improved Felhunter; Incubus as a Succubus alternative.
- Demonic Sacrifice reversed and lasts 2 h; Improved Shadow Bolt personal and charge-free; Shadow Mastery halved; Ruin and Pandemic double crit damage; Dark Pact, Devastation, Emberstorm, Improved Firebolt and others removed.

## Where the sources disagree

| Topic | gs (9 Oct) | fs (1 Oct) | Other |
|---|---|---|---|
| Life Tap health | not charged to a DPS warlock (raid healing assumed) | removed from your health | bug #51: real cost = mana gained |
| Demon stats | inherit 10% of SP into AP and SP, full hit and crit | inherit nothing | Blizzard (7 Oct): demons scale from the summoner |
| Bane of Doom | in every APL (owns the Bane slot) | never cast | |
| Destruction rotation | Incinerate + Conflagrate + Shadowburn (13/5/33) | Shadow Bolt + Shadowburn (13/11/27, no Incinerate) | MythicSim: Destruction 641, below Affliction |
| Demonic Pact sacrifice | Voidwalker (mana) | Imp (+15% Shadow, "~7% better") | |
| Firebolt at 60 | mean 44 (no level growth) | 45.2 (44 + 0.6 per level above 58) | Wowhead 45-50 at level 63 |
| Demonic Knowledge 3/3 | 100% of level (+60) | same curve | Blizzard: "up to 33%" |
| Demonic Brand charges | 2/4/6 | 2/4/6 | Wowhead 3 at rank 3; Blizzard "next 2 attacks" |
| Wrack | Corruption and Agony only (client mask) | same | Blizzard: "your other Shadow DoTs" |
| Siphon Life crits | yes (Pandemic) | yes | beta: never (#303) |

Race value (fs, pre-BiS, 180 s, vs an Orc without Blood Fury): Human +9-12 DPS (sword), Undead +7-9 (Touch of the Grave), Gnome +7-9 (Eureka!), Orc +2-3 (Blood Fury), Troll +1-2 (Berserking). gs's ranked tables agree: Human or Undead on top, Gnome and Troll last.

## Provisional values (use them, but expect changes)

- Pet inheritance coefficients (10% of SP into AP and SP, full hit and crit) and Firebolt's level scaling (gs 44, fs 45.2 mean).
- Demonic Knowledge 100% vs "33%" of level; Demonic Brand 2/4/6 charges and the 65-68 + 0.078 formula; Incinerate's +25% on base only or the whole hit.
- Wrack's scope (client: Corruption and Agony; Blizzard: all your Shadow DoTs); Spellstone's Fire+Shadow mask and whether its haste shortens channels.
- Partial resist distribution, 17% spell miss and no spell crit suppression (Classic rules kept); Spirit regen 6.25 + Spi/8; the 1.0 s magic GCD floor.
- Siphon Life never critting (#303), Malediction and Hellfire (#311), Eureka! on DoTs (#35).
- All default gear, priority lists and DPS values; AQ-era top ranks (Shadow Bolt r10, Immolate r8, Corruption r7) assumed available at launch.

## Open questions

1. Will Siphon Life ticks crit (#303), and does Malediction reach Hellfire's enemy damage (#311)?
2. Demonic Knowledge: 33% or 100% of level at 3/3 (WL-009)? Demonic Brand: 2, 3 or 6 charges?
3. Does Wrack amplify Bane of Doom, Siphon Life and the drains, or only Corruption and Agony (WL-003)?
4. Does Incinerate's 25% multiply the whole hit (WL-002)?
5. How strongly do demons inherit warlock spell power and Intellect (T29)? Do they update live or on summon?
6. Are Shadow Bolt rank 10, Immolate rank 8 and Corruption rank 7 trainable at 60 or book drops as in Classic?
7. Does the Spellstone's 2% "spell haste" shorten channels and GCDs, and does Berserking shorten channels?
8. Soul Shard bag limits and how often Drain Soul's progressive chance pays out at 60.
9. Is the Voidwalker (mana) or the Imp (+15% Shadow) the better Demonic Pact sacrifice? gs and fs disagree.
10. Will Metamorphosis, Felguard or Fel Armor ever get a learning path (gs WL-005)?
