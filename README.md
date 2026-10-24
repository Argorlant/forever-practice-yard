# Forever Practice Yard

A browser practice yard for **World of Warcraft: Forever** rotations. You stand next to a
training dummy and play your class with real keybinds: energy, combo points, the global
cooldown, positional requirements, procs and auras follow the game rules, and a rotation panel
counts your hits and crits and reviews your habits. There is no DPS meter on purpose: with the game
in beta, a DPS number would only mislead. It works with keyboard and mouse or on a phone.

**Play it online:** https://argorlant.github.io/forever-practice-yard/

Up to date with the October 15 beta update (client 1.60.1.70425): talent trees, builds and numbers follow the two sims'
updates for it.
> **Speculative, built on the sims.** WoW Forever is still in beta. The talents, builds, rotations and numbers here follow the
> community sims ([wow-forever-sim](https://github.com/gunba/wow-forever-sim) and [foreversim](https://github.com/laurencestokes/foreversim))
> and our own reading of the beta, so they may not match the live game, and classes can change a lot before launch and before
> anyone reaches level 60. Use it as a practice tool: learn a rotation's rhythm and get a feel for how a class might play at max
> level. That's why the yard shows no DPS: the damage in the floating combat text is only a rough guide. Spotted something wrong? Feedback is very welcome in the
> [issues](https://github.com/Argorlant/forever-practice-yard/issues).

The first class is the **Combat Rogue**, with WoW Forever's numbers and rules: smooth energy
regeneration (10 per second), the attack table measured on the beta, bleeds and poisons that
can crit, the Forever talent build (Hack and Slash, Flawless Execution) and Forever's ability
values. Every number and its source is in [`research/rogue_forever.md`](research/rogue_forever.md);
values marked provisional there are still unconfirmed for Forever.

Pick a talent build from the WoW Forever sims in Settings: Combat Swords (both sims), Combat with
Improved Expose Armor, Combat Backstab, Mutilate (both sims) and Subtlety Hemorrhage (both sims).
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
level 63 boss. Its hits give rage, blocks and dodges open Revenge, and Shield Block works.
Your health is locked by default; unlock it to practice Shield Wall
and Last Stand. To practice Execute, start the dummy at 15 % health and lock it.

The **Druid** comes as three specs (sources in [`research/druid_forever.md`](research/druid_forever.md)):

- **Feral Cat** (`?class=druid-cat`): smooth energy, combo points and a 1.0 s GCD. Shifting Power is
  Forever's powershift: +40 energy for mana, without leaving Cat Form. Mana is a second bar, with
  options for the pool, its regeneration, Wolfshead Helm, Howling Idol and a lock. Omen of Clarity
  is baseline (2 procs per minute, 10 s cooldown). Blood Frenzy and Berserk are in, plus the Prowl →
  Ravage/Pounce opener, Rip and Rake ticks that can crit, and Ferocious Bite spending the extra
  energy.
- **Feral Bear** (`?class=druid-bear`): treated like Protection, so the dummy attacks you.
  Normalized rage (11.25 per landed swing, 22.5 on a crit), rage from hits taken, Natural Reaction
  on dodges, Lacerate stacks, Primal Bite, Maul on the next swing, Enrage, Frenzied Regeneration,
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
  and Seal of Righteousness. With Twist of Light, replacing a seal leaves an Echo that your next swing also
  applies, so the hint swaps seals once per swing. Vengeance and Vindication are in, and the review counts
  swings that carried both seals.
- **Protection** (`?class=paladin-prot`): the dummy attacks you. Righteous Fury (Holy threat x1.9), Holy Shield
  (+30 % block, 4 charges, Holy damage per block), Redoubt, Reckoning (up to 4 charges your next swing fires),
  Shield Specialization mana on blocks,
  Templar's Bulwark (an absorb shield) and Swift Judgement.
- **Shockadin** (`?class=paladin-shock`): a melee paladin with Holy Shock on a 10 s cooldown, Divine Favor,
  Divine Precision and Light's Vigil (the marked Holy Shock triggers no cooldown, so you Shock twice). No sim
  models it yet, so the build (31/0/20) is our proposal.

Exorcism needs an Undead or Demon dummy (Settings → Options); Hammer of Wrath works below 20 % health.

The **Hunter** comes as three specs (sources in [`research/hunter_forever.md`](research/hunter_forever.md)). Auto
Shot fires every weapon swing, divided by ranged haste (quiver, Quick Shots, Rapid Fire). Each shot has a 0.5 s windup in
which you must stand still; the HUD bar turns red during it. Ranged attacks work from 8 to 35 yards, and closer is the dead zone.
By default Auto Shot keeps firing while you cast (Forever's intent); Settings has the Classic rule, where a cast clips the shot:

The hunter carries a bow, gun or crossbow (Settings → Character → Ranged weapon): slung on the back, it comes out to aim and
fire while Auto Shot is on or a shot is cast, and the melee weapon is put away.

- **Marksmanship** (`?class=hunter-mm`): gunba's petless Lone Wolf build (+20% damage), Aimed Shot (baseline, 2 s
  cast), Sniper Shot, Arcane Shot and Serpent Sting with ranged AP scaling, Mortal Shots. You start 12 yards back.
- **Beast Mastery** (`?class=hunter-bm`): a cat pet with its own swing timer and Focus (Bite on cooldown, Claw with
  spare Focus), up to two hawks from Summon Hawk, Bestial Wrath, Intimidation and Frenzy.
- **Survival** (`?class=hunter-sv`): a melee spec in Forever. Dual wield, Aspect of the Beast, Raptor Strike, Strider
  Kick, Mongoose Bite opened by Expose Prey on your own Hunter's Mark, Lacerating Strikes and Immolation Trap.

**Melee weaving** is an advanced option for Marksmanship and Beast Mastery (Settings, off by default): Auto Shot and the
melee swing of your two-handed glaive run together, and the distance decides which one fires. Rings on the ground mark
melee range and Auto Shot's minimum range, and a cue above the bar says when to step in, Raptor Strike and step out. A
third setting picks what a melee swing does to Auto Shot: Classic keeps the two timers independent (the default), the Forever
beta restarts Auto Shot (what it does today, reported as a bug), Wrath links them both ways. The review counts weaves, the Auto Shot time they cost and
the net damage. Neither sim models weaving, and with the beta rule it gains little.

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
  its own hit, crit and procs), Clearcasting, Arcane Power and Presence of Mind.
- **Fire** (`?class=mage-fire`): Heating Up (direct crits and every Fire Blast make the next Pyroblast up to 1.5 s), rolling Ignite, Fire Power,
  personal Fire Vulnerability from Scorch, Fire Blast and Combustion; Scorch, Fireball or Frostfire Bolt as the filler.
- **Frost** (`?class=mage-frost`): Frostbolt, Fingers of Frost charges for Ice Lance x3 and Shatter, Winter's Chill
  stacks for Cone of Cold within 10 yards, and Arcane Missiles and Arcane Blast for the Arcane-Frost build.

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
current build's trees and links back to the first screen. `npm run talents` rebuilds the tree layouts from gunba's sim
(`tools/talent_layout.mjs`), and `npm run icons` fetches their icons.

**Your own talents.** In Settings, *Edit talents* turns the build's talent frame into a calculator: left click adds a
point, right click (or *Remove* on a touch screen) takes one back, under the game's rules (51 points, five per row,
prerequisites at full rank). Your talents replace the build's, which keeps its gear, action bar and priority list; the
priority list reads your talents, and abilities a talent unlocks get a button. *Copy link* shares the class, build and
talents (`?class=…&build=…&talents=…`).

**Action bars and keys.** Up to four rows of 8 buttons (2 to 4 shown, in Settings or the Spellbook). Rows 3 and 4 start with
the build's abilities that have no other button (Charge and Intercept for a warrior), row 3 on Shift+1-8. The Spellbook lists
every ability to drag onto a button; dragging a button off the bar clears it. The Keys button turns on key binding: hover a
button and press a key or turn the mouse wheel (Backspace clears it). The wheel binds like in WoW: up and down are two
keys, Shift, Ctrl and Alt combine with them, and a bound direction no longer zooms the camera. In Settings, × unbinds any key, movement included, and a key does one thing,
as in WoW: binding it somewhere unbinds it elsewhere (bind A and D to strafe and they stop turning). Holding both mouse
buttons runs forward. As in WoW, a press in the last 0.4 s of a cast or the global cooldown is queued and goes off the
moment it ends. On-next-swing attacks (Heroic Strike, Cleave, Maul, Raptor Strike) keep a gold frame with a light
running around it from the press until the swing lands, and the button flashes when it does.

**Spell effects.** Spells and blows have their own look: fire, frost, shadow, arcane, holy and nature missiles
with trails and impacts that show the crit, Lightning Bolt as a real bolt, arrows and gun tracers, weapon trails
(claws for cats and bears), Thunder Clap, shouts, Whirlwind, Consecration on the ground, light gathering in your
hands while you cast, the Drain Life and Mind Flay streams, and the auras you wear (Lightning Shield's orbs, Holy
Shield, Shadowform). It is all particles (`src/scene/vfx.ts`) driven by the engine's events (`src/combat-vfx.ts`).

The engine is shared, so more specs plug in as data.

## Run it

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:5180.

- `npm run build`: type-checks and builds the static site into `dist/`.
- `npm test`: plays the suggested rotation headless for 5 minutes and prints DPS and a breakdown.
- `npm run model -- <folder>`: rebuilds `public/models/human.glb` from the Quaternius downloads (or set `QUATERNIUS_DIR`; default `./downloads`).
- `npm run icons`: downloads the ability icons into `public/icons` (names in `src/ui/wow-icons.json`,
  taken from Wowhead's WoW Forever tooltips) and the dummy portrait into `src/ui/icons.gen.ts`.

## How it is built

| Folder | What lives there |
| --- | --- |
| `src/engine` | The combat engine, shared by every class: event clock, smooth regeneration, GCD and spell queue, casts, cooldowns, auras, dual-wield auto attacks, attack and spell tables, armor, the attacking dummy, raid buffs and debuffs (`raid.ts`). |
| `src/specs/<class>` | One class (`rogue`, `warrior`, `druid`, `paladin`, `hunter`, `priest`, `mage`, `warlock`, `shaman`): `data.ts` holds every number with its source; `talents.ts` the sims' builds; the spec files define abilities, procs and the priority list. |
| `src/scene` | The 3D yard (three.js): world, dummy, character, WoW-style controls and spell effects. |
| `src/ui` | HUD, action bar, floating combat text, rotation panel and settings. |
| `research` | Sourced notes on each spec's WoW Forever mechanics. |

### Adding a spec

1. Create `src/specs/<class>/data.ts` with the attack rules, default stats and ability numbers.
2. Create `src/specs/<class>/index.ts` exporting a `Spec`: abilities (`use` gets the engine),
   `prepare` (talents and procs), `suggest` (priority list) and the default action bar.
3. Add it to `SPECS` in `src/specs/index.ts`; it appears in the class picker in Settings.

## Credits

- Inspired by the practice tools at [miao.tips/practice](https://www.miao.tips/practice): the feral practice by Elspeth
  (elspethbado), where the idea for this yard came from, and the hunter practice by Neteyes.
- Character model and animations: [Quaternius](https://quaternius.com), Universal Animation
  Library 1 and 2 (CC0).
- Ability icons © Blizzard Entertainment, used so the buttons look as they do in the game.
- Dummy portrait: [game-icons.net](https://game-icons.net) by Lorc (CC BY 3.0).
- Combat formulas follow [WoWSims](https://github.com/wowsims/classic) (MIT) and its WoW Forever
  forks [foreversim](https://github.com/laurencestokes/foreversim) and
  [wow-forever-sim](https://github.com/gunba/wow-forever-sim).

## Support

The practice yard is free and fan-made, and it stays complete for everyone. If it helped your rotation, you can buy me a
coffee on Ko-fi: [ko-fi.com/argorlant](https://ko-fi.com/argorlant) (or directly on PayPal:
[paypal.me/argorlant](https://paypal.me/argorlant)).

## License

The code is MIT licensed (see [LICENSE](LICENSE)). The ability icons, the character model and the dummy portrait keep
their own terms (above).

Fan-made practice tool. Not affiliated with or endorsed by Blizzard Entertainment. World of
Warcraft is a trademark of Blizzard Entertainment, Inc.
