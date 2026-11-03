# Forever Rotations

Rotation practice in the browser for **World of Warcraft: Forever**. You stand next to a
training dummy and play your class with real keybinds: energy, combo points, the global
cooldown, positional requirements, procs and auras follow the game rules, and a rotation panel
counts your hits and crits and reviews your habits. There is no DPS meter on purpose: until anyone has
played Forever at level 60, a DPS number would only mislead. It works with keyboard and mouse or on a phone.

**Play it online:** https://argorlant.github.io/forever-practice-yard/

Builds, gear and priority lists follow [WoWSims Forever](https://www.wowsims.com/forever/) as of 2 November 2026 (commit
`bac92db`; `npm run gear` works out the sheets, listed with their items in
[`research/wowsims_gear.md`](research/wowsims_gear.md); some numbers still come from the older sims): spells at the last trainer rank (the Ahn'Qiraj books need raids, which open on
9 December), raid buffs too; a boss without resistances resists no spell partly; the Mage's Frost tree without Piercing
Ice; Human Ruthless at 1 % and no Orc Savage in the race sheets. The live hotfix of October 30 rebuilt the Druid, Mage
and Paladin trees (and moved or renamed a Hunter and a Priest talent); the site's trees and their tooltips were read then
from Wowhead's WoW Forever calculator (`tools/wowhead_trees.mjs`, data in `research/wowhead/`), and they match WoWSims
Forever's talent order. Builds marked **community** have no equivalent there: they come from older sims, re-spent where the
trees changed, and stay for whoever practises them.
> **Speculative, built on the sims.** This site was made before WoW Forever's launch on 4 November 2026. The talents,
> builds, rotations and numbers here follow the community sims ([WoWSims Forever](https://www.wowsims.com/forever/), our main source; the
> builds marked community and some older numbers come from [foreversim](https://github.com/laurencestokes/foreversim) and gunba's retired
> [wow-forever-sim](https://github.com/gunba/wow-forever-sim)) and our own reading of the beta, so they
> may not match the live game, and classes can still change as players reach level 60. Use it as a practice tool: learn a rotation's rhythm and get a feel for how a class might play at max
> level. That's why it shows no DPS: the damage in the floating combat text is only a rough guide. Spotted something wrong? Feedback is very welcome in the
> [issues](https://github.com/Argorlant/forever-practice-yard/issues).

The first class is the **Combat Rogue**, with WoW Forever's numbers and rules: smooth energy
regeneration (10 per second), the attack table measured on the beta, bleeds and poisons that
can crit, the Forever talent build (Hack and Slash, Flawless Execution) and Forever's ability
values. Every number and its source is in [`research/rogue_forever.md`](research/rogue_forever.md);
values marked provisional there are still unconfirmed for Forever.

Pick a talent build from the WoW Forever sims in Settings: Combat Sinister Strike,
Combat Backstab, Mutilate (Assassination and Combat), Subtlety Hemorrhage and Subtlety Backstab from WoWSims Forever, and older community builds.
Each build brings its talents, weapons, action bar and the sims' priority list for the "next
ability" glow (the rotation helper: the Helper button turns it off to play from memory). Raid options: keep Expose Armor up (when no warrior applies Sunder Armor) and
whether to use Thistle Tea.

The **Warrior** follows Forever's normalized rage: each landed white swing gives a fixed amount
from the weapon's speed (3.46 per second of speed one-handed, 4.5 two-handed, half off hand,
doubled on a crit; nothing for misses, dodges, parries or Heroic Strike swings). Builds: Fury dual
wield (also keeping Sunder Armor up), Arms two-hander, two-hand Bloodthirst and two Protection
builds. Stances, Heroic Strike and Cleave on the next swing, Slam's cast, Overpower and Revenge
windows, Execute below 20 % health, Flurry, Deep Wounds, Unbridled Wrath, Weaponmaster and the rest
are in. Sources in [`research/warrior_forever.md`](research/warrior_forever.md).

For **Protection** the dummy hits back (Settings → "The dummy attacks you"): it turns to face you
and rolls miss, dodge, parry, block, crit and crushing blows against your tank sheet, like the sims'
level 63 boss. Its hits give rage (the rule wowsims/forever fitted to Forever logs: 2.5 x (1 - 40 %) x the hit before
armor and blocks / 243.6 for a level 63 attacker), blocks and dodges open Revenge, and Shield Block works.
Your health is locked by default; unlock it to practice Shield Wall
and Last Stand. To practice Execute, start the dummy at 15 % health and lock it.

The **Druid** comes as three specs (sources in [`research/druid_forever.md`](research/druid_forever.md)):

- **Feral Cat** (`?class=druid-cat`): smooth energy, combo points and a 1.0 s GCD. Shifting Power is
  Forever's powershift: +40 energy for mana, without leaving Cat Form. Mana is a second bar, with
  options for the pool, its regeneration, Wolfshead Helm, Howling Idol and a lock. Omen of Clarity
  is baseline (2 procs per minute, 10 s cooldown). Blood Frenzy and Predatory Discipline (Ferocious Bite
  keeps the extra energy) are in, plus the Prowl → Ravage/Pounce opener and Rip and Rake ticks that can crit.
  Berserk and Improved Shifting Power are gone since Oct 30; Shifting Power has an 8 s cooldown.
- **Feral Bear** (`?class=druid-bear`): treated like Protection, so the dummy attacks you.
  Normalized rage (11.25 per landed swing, 22.5 on a crit), rage from hits taken, Natural Reaction
  on dodges, Lacerate stacks (a Feral talent since Oct 30), Primal Bite, Maul on the next swing, Enrage, Frenzied Regeneration,
  Barkskin, threat x1.5 and a Mighty Rage Potion.
- **Balance** (`?class=druid-balance`): the Wrath → Starfire → Starfire loop. Eclipse charges make
  Starfire faster; Nature's Grace gives haste on spell crits. Moonfire and Insect Swarm ticks can
  crit. Spells show visible projectiles. Mana follows the five-second rule (Spirit, Reflection, MP5,
  Innervate) and runs out, as it does in Forever. Judgement of Wisdom, Blessing of Wisdom and Mana
  Spring Totem are on by default; when Starfire is out of reach, the hint falls back to Wrath.

The **Paladin** comes as three specs (sources in [`research/paladin_forever.md`](research/paladin_forever.md)).
In WoW Forever, Judgement is off the global cooldown and keeps the seal; damage Judgements, seal procs and the new
baseline Holy Strike roll on the melee table:

- **Retribution** (`?class=paladin-ret`): a slow two-hander with Seal of Command (7 procs per minute, 1 s cooldown)
  and Seal of Righteousness. Since Oct 30 Unsealed Wrath replaces Twist of Light: each landed swing stores a copy
  of your seal (up to 3), and the first swing with another seal releases them, so the hint swings three times with
  Command and once with Righteousness. Vengeance and Vindication are in, and the review counts the released seals.
- **Protection** (`?class=paladin-prot`): the dummy attacks you. Righteous Fury (Holy threat x1.9), Holy Shield
  (+30 % block, 4 charges, Holy damage per block), Redoubt, Reckoning (up to 4 charges your next swing fires),
  Shield Specialization mana on blocks, Shieldsworn (Holy Strike every 6 s, triggering Holy Shield and Shield
  Specialization), Templar's Bulwark (an absorb shield) and Swift Judgement, a second Judgement since Oct 30.
- **Shockadin** (`?class=paladin-shock`): a melee paladin with Holy Shock on a 10 s cooldown, Divine Favor and
  Divine Precision: WoWSims Forever's 23/0/28 list. Light's Vigil only works on allies since Oct 30, so our Vigil builds are gone.

Exorcism needs an Undead or Demon dummy (Settings → Options); Hammer of Wrath works below 20 % health.

The **Hunter** comes as three specs (sources in [`research/hunter_forever.md`](research/hunter_forever.md)). Auto
Shot fires every weapon swing, divided by ranged haste (quiver, Quick Shots, Rapid Fire). Each shot has a 0.5 s windup in
which you must stand still; the HUD bar turns red during it. Ranged attacks work from 8 to 35 yards, and closer is the dead zone.
By default Auto Shot keeps firing while you cast (Forever's intent); Settings has the Classic rule, where a cast clips the shot:

The hunter carries a bow, gun or crossbow (Settings → Character → Ranged weapon): slung on the back, it comes out to aim and
fire while Auto Shot is on or a shot is cast, and the melee weapon is put away.

- **Marksmanship** (`?class=hunter-mm`): WoWSims Forever's petless Lone Wolf build (+20% damage), Aimed Shot (baseline, 2 s
  cast), Sniper Shot, Arcane Shot and Serpent Sting with ranged AP scaling, Mortal Shots. You start 12 yards back.
- **Beast Mastery** (`?class=hunter-bm`): a cat pet with its own swing timer and Focus (Bite on cooldown, Claw with
  spare Focus), up to two hawks from Summon Hawk, Bestial Wrath, Intimidation and Frenzy.
- **Survival** (`?class=hunter-sv`): a melee spec in Forever. Dual wield, Aspect of the Beast, Raptor Strike, Strider
  Kick, Mongoose Bite opened by Expose Prey on your own Hunter's Mark, Lacerating Strikes and Immolation Trap.

**Melee weaving** works on every hunter build: Auto Shot and the
melee swing of your two-handed glaive run on separate timers, and the distance decides which one fires. It is really
ranged weaving: use your ranged cooldowns at range, step in, press what you can, step back out. Rings on the ground mark
melee range and Auto Shot's minimum range on all of them. The weaving helper in Settings (off by default, on in the weave builds) adds a cue above the bar that says when to step in, which melee attack to press
(Raptor Strike first, off the global cooldown, then Strider Kick, Mongoose Bite, Immolation Trap and Wing Clip) and when to step out; weaving drops Aimed Shot for Arcane
Shot and Multi-Shot at range. A
third setting picks what a melee swing does to Auto Shot: Classic keeps the two timers separate (the default, assumed until it can be checked in the live game), the Forever
beta restarted Auto Shot (reported as a bug), Wrath links them both ways. The review counts weaves, the Auto Shot time they cost and
the net damage. WoWSims Forever's SV Weave and MM Weave builds, in Settings, shoot from
12 yards and step to 5 while the next Auto Shot is more than 1.5 s away, with no pet; BM Weave keeps its pet. SV Weave carries a two-hander for this;
melee Survival prefers two weapons for its white swings.

The **Priest** comes as two damage specs (sources in [`research/priest_forever.md`](research/priest_forever.md)); pure healers are out of scope:

- **Shadow** (`?class=priest-shadow`): Shadowform (+10% Shadow damage, half-cost Shadow spells, 2.0x Shadow crits)
  and personal Shadow Weaving stacks (+2% of your Shadow damage, 5 stacks). Mind Flay is a channel with one hit
  roll, channelled in full (Improved Mind Flay makes each tick stronger). Also Shadow Word: Pain, Devouring Plague
  (baseline, 24 s),
  and Shadow Word: Death, which costs you 10% of your health on a dummy (the health bar shows it).
- **Smite (experimental)** (`?class=priest-smite`): Holy Fire and Shadow Word: Pain for Power in Light, Smite, Penance (a
  channel with a bolt at 0, 1 and 2 s), Mind Blast, Power Infusion and Inner Focus. Judgement of the Crusader is
  on by default.

The **Mage** comes as three specs, with the sims' hybrids as builds (sources in [`research/mage_forever.md`](research/mage_forever.md)):

- **Arcane** (`?class=mage-arcane`): Arcane Blast stacks (15% of your Intellect as spell damage each, 15 s from the
  first, +175% to its own cost), Arcane Wrath, Arcane Missiles on Missile Barrage and as the filler (each missile rolls
  its own hit and crit; since Oct 21 they proc neither Clearcasting nor Missile Barrage), Arcane Power and Presence of Mind.
- **Fire** (`?class=mage-fire`): Heating Up (direct crits and every Fire Blast make the next Pyroblast up to 1.5 s), rolling Ignite, Fire Power,
  personal Fire Vulnerability from Scorch, Fire Blast and Combustion; Scorch, Fireball or Frostfire Bolt as the filler.
- **Frost** (`?class=mage-frost`): Frostbolt, Fingers of Frost charges for Ice Lance x3 and Shatter, Winter's Chill
  stacks (from Frostbolt and Fingers of Frost Ice Lances) for Cone of Cold within 10 yards, Ice Barrier and Frigid Power
  (+3% Frost damage each), and Arcane Missiles and Arcane Blast for the Arcane-Frost build.

Mage Armor and Arcane Meditation keep Spirit regen while casting; Evocation, Mana Ruby and potions are on the bar.

The **Warlock** comes as three specs (sources in [`research/warlock_forever.md`](research/warlock_forever.md)). In WoW Forever
Agony and Doom are Banes (one per target, apart from your Curse), Bane of Doom hits for 1742 + 4x spell power after 60 sec,
and Curse of the Elements covers every magic school. Life Tap turns health into mana; your health bar is shown and raid
healers keep up with you (each second they heal 20% of the health you are missing, in Settings):

- **Affliction** (`?class=warlock-affliction`): Corruption with Nightfall (Shadow Trance: an instant Shadow Bolt), Siphon
  Life, Immolate, Pandemic crits at 2.0x and a personal Improved Shadow Bolt debuff. Wrack and Drain Life are on the bar.
- **Demonology** (`?class=warlock-demonology`): Demonic Pact keeps your Demonic Sacrifice buff while another demon fights
  at your side (summoning the sacrificed one again cancels it). Demonic Brand from Searing Pain, Soul Link, Master
  Demonologist and Soul Fire during Decimation. The Succubus runs to the dummy; the Imp stays by you and throws Firebolts
  (both drawn on the character model with horns, wings and a tail).
- **Destruction** (`?class=warlock-destruction`): Shadow and Flame (Conflagrate and Shadowburn keep a +10% buff up for
  each school and keep Immolate burning), Incinerate as the filler; the DS/Ruin builds sacrifice a demon (the Imp in the
  sims) and cast Shadow Bolt, with no demon left at your side.

In Settings, every warlock picks the demon at their side (Succubus or Imp) and, with Demonic Sacrifice, the demon to give
up: Imp (+15% Shadow), Succubus (+15% Fire), Voidwalker (2% mana every 4 sec) or Felhunter (3% health every 4 sec).

**Pets** (the hunter's beast, the warlock's demon) work as in WoW: they wait at your side, run to the dummy at running speed
and only hit once they are in reach (melee, or 30 yards for the Imp). The pet bar has Attack, Follow and Stay, and the pet
mode is in Settings: Assist (default: it joins in when you use an attack), Defensive (only on your order or when something
hits you, the Classic default) or Passive (only on your order).

The **Shaman** comes as two specs and an experiment (sources in [`research/shaman_forever.md`](research/shaman_forever.md)).
Totems sit in four element slots (a new one replaces the old; Searing Totem attacks, buff totems last 5 min, a 1.0 s
global cooldown), Earth, Flame and Frost Shock share one cooldown, and Clearcasting makes the next damage spell free:

- **Elemental** (`?class=shaman-elemental`): Lightning Bolt (2.0 s), Lava Burst for 20% more on your own Flame Shock,
  Elemental Mastery (0.5 s faster Lightning Bolt and Lava Burst, Chain Lightning off cooldown), Chain Lightning on Clearcasting, Lightning Overload copies and 2.0x crits from Elemental Fury. Mana runs out, as in the
  sims; the Stormcaller hybrids are builds of this spec.
- **Enhancement** (`?class=shaman-enhancement`): one two-hander (no dual wield in Forever) with Windfury Weapon (two extra
  attacks; it turns a raid Windfury Totem off for you) or Flametongue, Stormstrike's personal charge for your next Lightning
  Bolt or Earth Shock, Maelstrom Weapon (5 stacks: an instant, free Lightning Bolt), Flurry, Fire Nova around your Searing
  Totem and Rage of the Farseer. Weapon Mastery (+10%, disputed) is an option, off by default.
- **Off-tank (experimental)** (`?class=shaman-tank`): Forever has no tank shaman; this is our 17/34/0 proposal with
  Rockbiter, Lightning Shield orbs, Stoneskin Totem and Stormstrike resets on dodge and parry, against the attacking dummy.

Totems stand where you dropped them (a carved post per element, with a flame, stones, wings or an orb on top); Searing
Totem's bolts and Fire Nova's ring start from your Fire totem.

Channeled spells are part of the engine: cost and GCD at the start, ticks over time, interrupted by moving and
clipped by the next spell.

**Raid buffs and debuffs** add what the rest of the raid brings, when it changes how a rotation
plays. Pick them on the welcome screen or later in Settings:

- Buffs: Windfury Totem (20 % on main-hand attacks for an extra attack with +246 AP, 1.5 s
  cooldown; cats and bears too), Battle Shout, Blessing of Might, Leader of the Pack (melee and ranged crit), Moonkin Aura (spell crit),
  Blessing of Wisdom and Mana Spring Totem (in Forever both factions get paladin and shaman buffs).
- Dummy debuffs: Judgement of Wisdom (mana back on your hits and direct spells), Sunder Armor, Faerie Fire, Curse of Recklessness, Curse of the Elements (in Forever +10% to every magic school),
  Demoralizing Shout and Thunder Clap.
- Cats and Balance start with Judgement of Wisdom, Blessing of Wisdom and Mana Spring Totem on:
  their mana runs out, as in Forever, and these are what a raid gives them.
- Armor debuffs in the same slot do not stack (Sunder and Expose Armor share one); different slots
  add up.

The first screen picks the class (WoW's class icons) and then a build, grouped by spec, with its three talent trees drawn
like the game's talent frame (hover a talent for what it does). `?class=warrior` opens a class directly; Settings shows the
current build's trees and links back to the first screen. `npm run talents` rebuilds the tree layouts from gunba's retired sim
(`tools/talent_layout.mjs`); `node tools/wowhead_trees.mjs` then lays the Oct 30 trees from Wowhead over them, and
`npm run icons` fetches their icons.

**Your own talents.** In Settings, *Edit talents* turns the build's talent frame into a calculator: left click adds a
point, right click (or *Remove* on a touch screen) takes one back, under the game's rules (51 points, five per row,
prerequisites at full rank). Your talents replace the build's, which keeps its gear, action bar and priority list; the
priority list reads your talents, and abilities a talent unlocks get a button. *Copy link* shares the class, build and
talents (`?class=…&build=…&talents=…`).

**Talent planner.** `?planner=<class>` (the *Talent planner* button on the first screen, or *Planner* on a build) is a
talent calculator for every class with the same rules, and it keeps the order you spend points in: the leveling order lists
the level each point comes at (one a level from 10, 51 at 60), and taking a point back moves the later points that needed
it until they fit again. The tooltips give each rank's text, what a talent needs, and what WoW Forever changed in it
(★ marks the talents new in Forever); a panel lists the new talents the build takes and the Classic talents the trees no
longer have. Start from one of the sims' builds (its order is made up: main tree from the top, then the others) or compare
with one (the other build's rank shows on every talent where they differ). The link (`?planner=<class>&o=…`) holds the
order, one letter per point; *Practise as …* opens practice with the nearest of the sims' builds (its gear and action bar)
and your talents. The notes come from the research sheets: `node tools/talent_notes.mjs` rebuilds
`src/ui/talent-notes.json`.

**Action bars and keys.** Up to four rows of 8 buttons (2 to 4 shown, in Settings or the Spellbook). Rows 3 and 4 start with
the build's abilities that have no other button (Charge and Intercept for a warrior, and what the Helper may ask for), row 3 on Shift+1-8. The Spellbook lists
the class's whole book to drag onto a button, under Rotation, Racial and More spells; dragging a button off the bar clears it.
Your race decides your racials (from WoWSims Forever), and the combat ones take an empty button by themselves. More spells stay off the bar until you
drag them there: their damage, heals and shields are real, with the client's level 60 numbers, crowd control says Immune against
a dummy, and the rest only run their timers (the tooltip says which). An ability from a talent has a button only on a build with that talent.
The Keys button turns on key binding: hover a
button and press a key or turn the mouse wheel (Backspace clears it). The wheel binds like in WoW: up and down are two
keys, Shift, Ctrl and Alt combine with them, and a bound direction no longer zooms the camera. In Settings, × unbinds any key, movement included, and a key does one thing,
as in WoW: binding it somewhere unbinds it elsewhere (bind A and D to strafe and they stop turning). Holding both mouse
buttons runs forward. As in WoW, a press in the last 0.4 s of a cast or the global cooldown is queued and goes off the
moment it ends. On-next-swing attacks (Heroic Strike, Cleave, Maul, Raptor Strike) keep a gold frame with a light
running around it from the press until the swing lands, and the button flashes when it does; as in Forever, pressing
one again does not cancel it.

**Spell effects.** Spells and blows have their own look: fire, frost, shadow, arcane, holy and nature missiles
with trails and impacts that show the crit, Lightning Bolt as a real bolt, arrows and gun tracers, weapon trails
(claws for cats and bears), Thunder Clap, shouts, Whirlwind, Consecration on the ground, light gathering in your
hands while you cast, the Drain Life and Mind Flay streams, and the auras you wear (Lightning Shield's orbs, Holy
Shield, Shadowform). It is all particles (`src/scene/vfx.ts`) driven by the engine's events (`src/combat-vfx.ts`).

**Published models and your own models.** The online site loads the owner's exported characters (with race and sex
selection), forms, companions, training dummy, training area and Onyxia's lair automatically. Alliance races practice
in Stormwind's Command Center courtyard; Horde races practice in Orgrimmar's Valley of Honor. Changing race changes
the area with it. Each faction keeps its own saved dummy position. Onyxia's lair and dragons arrive the first time you go to her or open Settings. The scene waits for the rest of its WoW models, showing how much has arrived and using the site's own if nothing arrives for 20 seconds, before its first
frame, and the fallback mannequin is loaded only if the character model is unavailable or switched off. Shared animation buffers and textures
avoid repeating the same data for every equipment set; the original exports are unchanged. Settings → "Your own models"
can replace these with personal files: your character, the druid's Cat and Bear Forms, the training dummy, the training area itself and Onyxia's lair. Export them with
[wow.export](https://github.com/Kruithne/wow.export), which reads your own game files (open your WoW folder in it), as
GLB from the arrow next to its Export button:
- **Your character:** the Characters tab (Item Sets equips a whole tier set), with Export animations ticked.
- **Cat and Bear Form:** the Models tab, `creature/druidcat/druidcat.m2` and `creature/druidbear/druidbear.m2` (Tauren:
  `druidcattauren.m2`, `druidbeartauren.m2`).
- **Training dummy:** `creature/object/woodendummy.m2`; it plays its own wounds when hit, a bigger one on a crit.
- **Training area:** a zone or a building. For a zone, Shift+click map tiles in the Maps tab (Goldshire is Azeroth 31, 49)
  and Export OBJ, then press Load a map folder… and pick wow.export's export folder (your browser may call it an
  upload; nothing leaves your computer). The terrain, its trees and props and its buildings with their furniture are
  placed as wow.export's Blender importer places them, trees and props drawn as instances; a whole city such as
  Stormwind is left out (too big for a browser), and only the files the zone uses are kept. For a building, an arena or
  a raid room, export a WMO from the Models tab as GLB, such as `stranglegladiatorarena.wmo` (the Gurubashi Arena).
  You walk on the ground and the floors (stairs and ramps too); where a building has none, such as an arena pit that is
  the map's ground, the grass stands in. In a place with its own ground, walls, cliffs, big drops and the end of its
  floors stop you, and the camera stays on your side of a wall. Walk to a spot and press Put the dummy here to set the
  dummies there.
- **Onyxia's lair:** `world/wmo/dungeon/kl_onyxiaslair/kl_onyxiaslair.wmo`, drawn for the Onyxia fight only: the training area
  stays around the dummies. Without it, the fight happens in your training area.

WoW's animation names (wow.export's "Run (ID 5 variation 0)", Attack1H, SpellCastDirected, AttackBow…, or their
AnimationData numbers) are matched to what you do; abilities with an animation of their own use it (Claw, Rake, Rip,
Ravage, Pounce, Maul, Swipe, Bash, Whirlwind, Shield Bash, Kick, the shouts and roars). Attacks and casts play on the
upper body while you run, wow.export's helmets and shoulder pads (left at the feet in its glTF) go back on their
attachment bones, models are turned to face forward, and Turn 90° fixes any other export. The files stay in your
browser (IndexedDB): imports by visitors are never uploaded or shared. The owner's published selection supplies the defaults.

**Models on your own computer (`npm run dev` only).** The development server can also read your wow.export folder:
`~/wow.export/yard-models.json` maps names to files in it. A slot's key draws that slot (`dummy`, `yard`, `onyxia-lair`,
`onyxia`, `onyxian-whelp`), and a few names cover what has no slot in Settings: a hunter's pet (`pet:hunter-bm`), a
warlock's demon (`minion:imp`), a totem (`totem:searingTotem`) and the raid at Onyxia (`raid:tank`, `raid:healer`,
`raid:whelpTank`). Your character goes per spec, talent tree and race (`hunter-bm@nightelf-f`, `warrior:Fury@human-m`), and
`@races:hunter` with `@default:hunter` fill a menu of races at the top right. A druid's forms go per race (`form-cat@tauren`, `form-bear@highorder`, plain `form-cat` for the
Night Elf). Night Elf and Tauren use the original SD Cat, Bear and Moonkin models. Skyborne keeps its HD Cat,
Bear, Moonkin and Travel models while its SD versions are unavailable. The Druid forms selector also previews
Dire Bear, Travel, Aquatic and Tree, pausing practice until you return to automatic. Moonkin in Balance follows
its actual ability and talent; Tree and Aquatic are model previews. A race with no model gets the available fallback. See
`research/druid_forms.md` for exact source IDs and preparation. A zone is `map:` and the folders holding
its files (`map:maps,world,tileset`). To update the online selection, run `npm run export:wow` (optionally followed by
`-- <export-folder>`), then build and deploy. This prepares `public/wow/manifest.json`, compressed model descriptions,
shared binary resources and map files. Ordinary builds use these prepared assets and do not read the machine's export folder.
The published map uses one compressed archive containing only its referenced models and textures; terrain textures are
prepared at the same 2048px size already used by the renderer. `npm run export:wow -- --maps-only` refreshes that archive
without reprocessing the character exports. `npm run export:wow -- --forms-only` publishes the druid form
keys from the local selection. Personal map anchors and rotation are kept when the hosted assets update.
The default faction areas are smaller selected WMO exports, prepared with
`node tools/prepare_training_area.mjs <export.glb> alliance` (or `horde`). See `research/training_areas.md` for source groups.

**Encounters: Onyxia.** The menu at the top right switches from the training dummies to Onyxia, Classic's three-phase
fight practiced alone (`src/encounters/onyxia.ts`): a simulated tank holds her (you hold her yourself as a tank spec or
build), a simulated healer heals you, and the rest of the raid wears her down, so the fight takes a few minutes and you
practice what happens around your rotation:
- **Phase 1:** Flame Breath in front of her and Tail Sweep behind (it throws you aside): stand at her sides.
- **Phase 2 (65 %):** she flies; fireballs, whelps pouring out of both caves (kill them: they bite you), and Deep
  Breath: "Onyxia takes in a deep breath..." and the fire rolls across the room (a red band on the floor shows the line;
  in it you are hit five or six times).
- **Phase 3 (40 %):** she lands; Bellowing Roar makes you flee (Berserker Rage, Fear Ward and Will of the Forsaken stop
  it) and right after, lava spews from the floor's cracks.

Pull with PULL or by hitting her. At the end a review says how often each mechanic hit you, with a tip for each, and no
damage numbers. The mechanics follow warcraft.wiki.gg's Onyxia (Classic) page; where it gives no number (her health,
most timers, the whelps), the numbers are ours and the code says so. The lair, Onyxia and her whelps are built in code;
with your own models (Settings → Your own models: `creature/dragon/dragononyxia.m2`, `creature/dragonwhelp/dragonwhelp.m2`
and, as Onyxia's lair, `world/wmo/dungeon/kl_onyxiaslair/kl_onyxiaslair.wmo`) it is her and her real lair, with her own
animations (asleep in her bed, Lift Off, Hover, Fly, DragonTail, EmoteRoar, Death).

The engine is shared, so more specs plug in as data.

## Run it

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:5180.

- `npm run build`: type-checks and builds the static site into `dist/`, then `npm run seo` (`tools/seo_pages.ts`) writes
  one page per spec (`dist/<spec>/`: its rotation, builds and a link into the practice) and `dist/sitemap.xml` for search engines.
- `npm run export:wow`: prepares the owner's `~/wow.export/yard-models.json` selection in `public/wow/` for publication.
- `npm test`: plays the suggested rotation headless for 5 minutes and prints DPS and a breakdown.
- `npm run model -- <folder>`: rebuilds `public/models/human.glb` from the Quaternius downloads (or set `QUATERNIUS_DIR`; default `./downloads`).
- `npm run icons`: downloads the ability icons into `public/icons` (names in `src/ui/wow-icons.json`,
  taken from Wowhead's WoW Forever tooltips) and the dummy portrait into `src/ui/icons.gen.ts`.

## How it is built

| Folder | What lives there |
| --- | --- |
| `src/engine` | The combat engine, shared by every class: event clock, smooth regeneration, GCD and spell queue, casts, cooldowns, auras, dual-wield auto attacks, attack and spell tables, armor, the attacking dummy, raid buffs and debuffs (`raid.ts`). |
| `src/specs/<class>` | One class (`rogue`, `warrior`, `druid`, `paladin`, `hunter`, `priest`, `mage`, `warlock`, `shaman`): `data.ts` holds every number with its source; `talents.ts` the sims' builds; the spec files define abilities, procs and the priority list. |
| `src/scene` | The 3D scene (three.js): world, dummy, character, WoW-style controls and spell effects; `custom-model.ts`, `custom-place.ts` and `wow-map.ts` draw models, places and zones of your own (wired in `src/own-model.ts`). |
| `src/encounters` | Boss encounters: their rules, without drawing (`onyxia.ts`); `src/encounter-view.ts` draws them (`scene/dragon.ts`, `scene/lair.ts`). |
| `src/ui` | HUD, action bar, floating combat text, rotation panel and settings; the first screen (`picker.ts`) and the talent planner (`planner.ts`). |
| `research` | Sourced notes on each spec's WoW Forever mechanics. |

### Adding a spec

1. Create `src/specs/<class>/data.ts` with the attack rules, default stats and ability numbers.
2. Create `src/specs/<class>/index.ts` exporting a `Spec`: abilities (`use` gets the engine),
   `prepare` (talents and procs), `suggest` (priority list) and the default action bar.
3. Add it to `SPECS` in `src/specs/index.ts`; it appears in the class picker in Settings.

## Credits

- Inspired by the practice tools at [miao.tips/practice](https://www.miao.tips/practice): the feral practice by Elspeth
  (elspethbado), where the idea for this site came from, and the hunter practice by Neteyes.
- Character model and animations: [Quaternius](https://quaternius.com), Universal Animation
  Library 1 and 2 (CC0).
- Onyxia and her whelps (`public/models/onyxia.glb`, the black texture) and the swords and shields
  (`public/models/weapons.glb`): [Cethiel's Dragon 3D](https://opengameart.org/content/cethiels-dragon-3d) and
  [Cethiel's Weapons 3D](https://opengameart.org/content/cethiels-weapons-3d) by Cethiel and Drummyfish (CC0),
  exported from their .blend files to glTF (the dragon's actions renamed Stand, Walk, AttackUnarmed and Death;
  the weapons normalized: swords grip at the origin and blade along +Y, shields face along +Z, one unit long)
  with `tools/blender_dragon.py` and `tools/blender_weapons.py`.
- Ability icons © Blizzard Entertainment, used so the buttons look as they do in the game. Spellbook icons that are not in
  `public/icons` load in your browser from Wowhead's image server (wow.zamimg.com).
- Published wow.export character, creature and environment assets © Blizzard Entertainment; these game assets are not covered by the code's MIT license.
- Dummy portrait: [game-icons.net](https://game-icons.net) by Lorc (CC BY 3.0).
- Floors of your own places: [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) (MIT).
- Combat formulas and racials follow [WoWSims Forever](https://www.wowsims.com/forever/)
  ([source](https://github.com/wowsims/forever), MIT), our main source. Builds marked community and some older numbers come from
  [foreversim](https://github.com/laurencestokes/foreversim) and the retired
  [wow-forever-sim](https://github.com/gunba/wow-forever-sim), both built on [WoWSims Classic](https://github.com/wowsims/classic) (MIT).
- The rest of each class's spellbook (`tools/spellbook.mjs`): a roster kept by hand, with its numbers from foreversim's client
  spell table and its icon names from wow-forever-sim.

## Support

It is free and fan-made, and it stays complete for everyone. If it helped your rotation, you can buy me a
coffee on Ko-fi: [ko-fi.com/argorlant](https://ko-fi.com/argorlant) (or directly on PayPal:
[paypal.me/argorlant](https://paypal.me/argorlant)).

## License

The code is MIT licensed (see [LICENSE](LICENSE)). The ability icons, the character model and the dummy portrait keep
their own terms (above).

Fan-made practice tool. Not affiliated with or endorsed by Blizzard Entertainment. World of
Warcraft is a trademark of Blizzard Entertainment, Inc.
