# Forever Practice Yard

A browser practice yard for **World of Warcraft: Forever** rotations. You stand next to a
training dummy and play your class with real keybinds: energy, combo points, the global
cooldown, positional requirements, procs and auras follow the game rules, and every hit shows
a damage number. It works with keyboard and mouse or on a phone.

The first class is the **Combat Rogue**, with WoW Forever's numbers and rules: smooth energy
regeneration (10 per second), the attack table measured on the beta, bleeds and poisons that
can crit, the Forever talent build (Hack and Slash, Flawless Execution) and Forever's ability
values. Every number and its source is in [`research/rogue_forever.md`](research/rogue_forever.md);
values marked provisional there are still unconfirmed for Forever.

Pick a talent build from the WoW Forever sims in Settings: Combat Swords (both sims), Combat with
Improved Expose Armor, Combat Backstab, Mutilate (both sims) and Subtlety Hemorrhage (both sims).
Each build brings its talents, weapons, action bar and the sims' priority list for the "next
ability" glow. Raid options: keep Expose Armor up (when no warrior applies Sunder Armor) and
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
level 63 boss. Its hits give rage, blocks and dodges open Revenge, Shield Block works, and the
meter shows threat per second. Your health is locked by default; unlock it to practice Shield Wall
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
- **Protection** (`?class=paladin-prot`): the dummy attacks you. Righteous Fury (Holy threat x1.6), Holy Shield
  (+30 % block, 4 charges, Holy damage per block), Redoubt, Reckoning, Shield Specialization mana on blocks,
  Templar's Bulwark (an absorb shield) and Swift Judgement.
- **Shockadin** (`?class=paladin-shock`): a melee paladin with Holy Shock on a 10 s cooldown, Divine Favor and
  Divine Precision. No sim models it yet, so the build (31/0/20) is our proposal.

Exorcism needs an Undead or Demon dummy (Settings → Options); Hammer of Wrath works below 20 % health.

The **Hunter** comes as three specs (sources in [`research/hunter_forever.md`](research/hunter_forever.md)). Auto
Shot fires every weapon swing, divided by ranged haste (quiver, Quick Shots, Rapid Fire). Each shot has a 0.5 s windup in
which you must stand still; the HUD bar turns red during it. Ranged attacks work from 8 to 35 yards, and closer is the dead zone.
By default Auto Shot keeps firing while you cast (Forever's intent); Settings has the Classic rule, where a cast clips the shot:

- **Marksmanship** (`?class=hunter-mm`): gunba's petless Lone Wolf build (+20% damage), Aimed Shot (baseline, 2 s
  cast), Sniper Shot, Arcane Shot and Serpent Sting with ranged AP scaling, Mortal Shots. You start 12 yards back.
- **Beast Mastery** (`?class=hunter-bm`): a cat pet with its own swing timer and Focus (Bite on cooldown, Claw with
  spare Focus), up to two hawks from Summon Hawk, Bestial Wrath, Intimidation and Frenzy.
- **Survival** (`?class=hunter-sv`): a melee spec in Forever. Dual wield, Aspect of the Beast, Raptor Strike, Strider
  Kick, Mongoose Bite opened by Expose Prey on your own Hunter's Mark, Lacerating Strikes and Immolation Trap.

Melee weaving is left for later as an optional advanced mode. In the beta a melee swing resets the Auto Shot timer
(an open bug), and neither sim models weaving.

The **Priest** comes as two damage specs (sources in [`research/priest_forever.md`](research/priest_forever.md)); pure healers are out of scope:

- **Shadow** (`?class=priest-shadow`): Shadowform (+10% Shadow damage, half-cost Shadow spells, 2.0x Shadow crits)
  and personal Shadow Weaving stacks (+2% of your Shadow damage, 5 stacks). Mind Flay is a channel with one hit
  roll: the hint waits for two ticks before clipping. Also Shadow Word: Pain, Devouring Plague (baseline, 1 min),
  and Shadow Word: Death, which costs you 10% of your health on a dummy (the health bar shows it).
- **Smite (experimental)** (`?class=priest-smite`): Holy Fire kept burning for Power in Light, Smite, Penance (a
  channel with a bolt at 0, 1 and 2 s), Mind Blast, Power Infusion and Inner Focus. Judgement of the Crusader is
  on by default.

Channeled spells are part of the engine: cost and GCD at the start, ticks over time, interrupted by moving and
clipped by the next spell.

**Raid buffs and debuffs** add what the rest of the raid brings, when it changes how a rotation
plays. Pick them on the welcome screen or later in Settings:

- Buffs: Windfury Totem (20 % on main-hand attacks for an extra attack with +246 AP, 1.5 s
  cooldown; cats and bears too), Battle Shout, Blessing of Might, Leader of the Pack / Moonkin Aura,
  Blessing of Wisdom and Mana Spring Totem (in Forever both factions get paladin and shaman buffs).
- Dummy debuffs: Judgement of Wisdom (mana back on your hits and direct spells), Sunder Armor, Faerie Fire, Curse of Recklessness, Curse of the Elements (in Forever +10% to every magic school),
  Demoralizing Shout and Thunder Clap.
- Cats and Balance start with Judgement of Wisdom, Blessing of Wisdom and Mana Spring Totem on:
  their mana runs out, as in Forever, and these are what a raid gives them.
- Armor debuffs in the same slot do not stack (Sunder and Expose Armor share one); different slots
  add up.

Pick the class in Settings (or open the page with `?class=warrior`).

The engine is shared, so more specs plug in as data.

## Run it

```bash
npm install
npm run dev
```

Then open http://127.0.0.1:5180.

- `npm run build`: type-checks and builds the static site into `dist/`.
- `npm test`: plays the suggested rotation headless for 5 minutes and prints DPS and a breakdown.
- `npm run model`: rebuilds `public/models/human.glb` from the Quaternius downloads.
- `npm run icons`: downloads the ability icons into `public/icons` (names in `src/ui/wow-icons.json`,
  taken from Wowhead's WoW Forever tooltips) and the dummy portrait into `src/ui/icons.gen.ts`.

## How it is built

| Folder | What lives there |
| --- | --- |
| `src/engine` | The combat engine, shared by every class: event clock, smooth regeneration, GCD and spell queue, casts, cooldowns, auras, dual-wield auto attacks, attack and spell tables, armor, the attacking dummy, raid buffs and debuffs (`raid.ts`). |
| `src/specs/<class>` | One class (`rogue`, `warrior`, `druid`, `paladin`, `hunter`): `data.ts` holds every number with its source; `talents.ts` the sims' builds; the spec files define abilities, procs and the priority list. |
| `src/scene` | The 3D yard (three.js): world, dummy, character and WoW-style controls. |
| `src/ui` | HUD, action bar, floating combat text, damage meter and settings. |
| `research` | Sourced notes on each spec's WoW Forever mechanics. |

### Adding a spec

1. Create `src/specs/<class>/data.ts` with the attack rules, default stats and ability numbers.
2. Create `src/specs/<class>/index.ts` exporting a `Spec`: abilities (`use` gets the engine),
   `prepare` (talents and procs), `suggest` (priority list) and the default action bar.
3. Add it to `SPECS` in `src/specs/index.ts`; it appears in the class picker in Settings.

## Credits

- Character model and animations: [Quaternius](https://quaternius.com), Universal Animation
  Library 1 and 2 (CC0).
- Ability icons © Blizzard Entertainment, used so the buttons look as they do in the game.
- Dummy portrait: [game-icons.net](https://game-icons.net) by Lorc (CC BY 3.0).
- Combat formulas follow [WoWSims](https://github.com/wowsims/classic) (MIT) and its WoW Forever
  forks [foreversim](https://github.com/laurencestokes/foreversim) and
  [wow-forever-sim](https://github.com/gunba/wow-forever-sim).

Fan-made practice tool. Not affiliated with or endorsed by Blizzard Entertainment. World of
Warcraft is a trademark of Blizzard Entertainment, Inc.
