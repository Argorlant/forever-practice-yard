import type { Combat } from './combat';

export type School = 'physical' | 'nature' | 'fire' | 'frost' | 'arcane' | 'shadow' | 'holy';
export type Outcome = 'hit' | 'crit' | 'miss' | 'dodge' | 'parry' | 'glance' | 'resist' | 'block' | 'crush';
export type WeaponType = 'dagger' | 'sword' | 'mace' | 'fist' | 'axe' | 'polearm' | 'staff' | 'bow' | 'gun' | 'crossbow';
export type Hand = 'main' | 'off';

export interface Weapon {
  name: string;
  type: WeaponType;
  /** Two-handed (Arms): drawn longer, held in the main hand. */
  twoHand?: boolean;
  min: number;
  max: number;
  speed: number;
}

/** Defensive sheet of a tank, used when the dummy attacks you. */
export interface TankStats {
  health: number;
  armor: number;
  defense: number;    // total defense skill (300 base at 60)
  dodge: number;      // % on the character sheet
  parry: number;      // %
  block: number;      // % (0 without a shield)
  blockValue: number; // damage a block absorbs
}

/** What the player sets in Settings (gear; talents are added on top). */
export interface Stats {
  attackPower: number;
  crit: number;      // melee crit % on the character sheet
  hit: number;       // hit % from gear and talents
  spellCrit: number; // spell crit % (poisons for rogues; gear and Intellect for casters)
  /** Spell power from gear (casters). */
  spellPower?: number;
  /** Extra spell power for one school only (Shadow or Holy gear, Elixir of Shadow Power). */
  spellPowerBySchool?: Partial<Record<School, number>>;
  mainHand: Weapon;
  offHand: Weapon | null;
  /** Only for tank specs: the sheet the attacking dummy rolls against. */
  tank?: TankStats;
  /** Maximum health when it is not a tank sheet (self-damage, Life Tap). */
  health?: number;
  /** A shield in the off hand (Protection). */
  shield?: boolean;
  /** Hunters: the ranged weapon, its ammo (DPS added per shot) and ranged attack power. */
  ranged?: Weapon;
  ammoDps?: number;
  rangedAttackPower?: number;
  /** Quiver or ammo pouch: ranged attack speed multiplier (1.15 = +15 %). */
  rangedHaste?: number;
}

/** Attack table against the target's level. All values in %. */
export interface AttackRules {
  specialMiss: number;     // special attack miss with 0 % hit
  spellMiss: number;       // spell and poison miss with 0 % hit
  spellCritMultiplier: number;
  dualWieldMiss: number;   // white hit miss while dual wielding
  dodge: number;
  parryFromFront: number;  // only when the player stands in front
  glanceChance: number;
  glanceMin: number;       // fraction of damage, e.g. 0.55
  glanceMax: number;
  critSuppression: number; // subtracted from crit against this level
  critMultiplier: number;  // physical crit damage
  offHandMultiplier: number; // 0.5 without talents
}

export interface Aura {
  id: string;
  name: string;
  icon: string;
  start: number;
  end: number;          // Infinity if it never expires
  duration: number;
  stacks?: number;
  value?: number;
  period?: number;
  nextTick?: number;
  onTick?: (c: Combat, a: Aura) => void;
  onRemove?: (c: Combat, a: Aura, expired: boolean) => void;
  /** Armor removed from the target while active. */
  armor?: number;
  /** Attack speed increase (0.2 = +20 %). */
  haste?: number;
  /** Resource regeneration multiplier (e.g. Adrenaline Rush doubles energy). */
  regen?: number;
  /** Movement speed multiplier (Sprint, Stealth). */
  speed?: number;
  /** On the player: extra attack power (Battle Shout). */
  attackPower?: number;
  /** On the player: extra crit in percentage points (Berserker Stance, Recklessness, Moonkin Aura). */
  crit?: number;
  /** On the player: damage done multiplier (Death Wish, Defensive Stance). */
  damageDone?: number;
  /** On the player: damage taken multiplier (stances, Shield Wall). */
  damageTaken?: number;
  /** On the player: threat multiplier (stances). */
  threat?: number;
  /** On an attacking dummy: attack power removed (Demoralizing Shout). */
  apReduction?: number;
  /** On an attacking dummy: slower swings, 0.2 = 20 % longer (Thunder Clap). */
  attackSlow?: number;
  /** On the player: faster casts, 0.1 = +10 % (Nature's Grace). */
  castHaste?: number;
  /** On the player: global cooldown multiplier for spells (Nature's Grace 0.9). */
  gcdMult?: number;
  /** On a target: a bleed (Rend and Tear counts bleeding targets). */
  bleed?: boolean;
  /** Armor debuffs in the same slot do not stack (Sunder and Expose Armor); different slots add up. */
  armorSlot?: string;
  /** On a target: your melee hits can restore mana (Judgement of Wisdom). */
  manaOnHit?: { chance: number; mana: number };
  /** On a target: damage taken multiplier per school (Curse of the Elements). */
  schoolTaken?: Partial<Record<School, number>>;
  /** On the player: mana per second (Blessing of Wisdom). */
  manaPerSecond?: number;
  /** On the player: Windfury Totem's extra attacks. */
  windfury?: boolean;
  /** On the player: extra spell crit in percentage points (Moonkin Aura). */
  spellCrit?: number;
  /** On the player: armor multiplier (a druid's Enrage lowers it). */
  playerArmor?: number;
  /** On the player: ranged attack speed increase (0.3 = +30 %, Quick Shots). */
  rangedHaste?: number;
  /** On the player: extra ranged attack power (Aspect of the Hawk, Trueshot Aura). */
  rangedAttackPower?: number;
  /** On a target: ranged attack power for everyone shooting it (Hunter's Mark). */
  rangedApTaken?: number;
  /** On the player: threat multiplier for one school (Righteous Fury: Holy x1.6). */
  schoolThreat?: Partial<Record<School, number>>;
  /** On the player: damage this shield still absorbs (Templar's Bulwark, Seal of Fury). Removed when used up. */
  absorb?: number;
  /** On a target: flat bonus damage taken per school, scaled by each spell's coefficient (Judgement of the Crusader). */
  schoolBonusTaken?: Partial<Record<School, number>>;
  hidden?: boolean;
}

export interface Unit {
  id: number;
  name: string;
  level: number;
  health: number;
  maxHealth: number;
  armor: number;
  auras: Map<string, Aura>;
  x: number;
  z: number;
  facing: number;  // forward = (sin facing, cos facing)
  radius: number;  // meters
}

export interface Hit {
  target: Unit;
  source: string;        // ability id, 'melee_mh' or 'melee_oh'
  outcome: Outcome;
  school: School;
  amount: number;
  white: boolean;        // auto attack
  hand?: Hand;
  periodic?: boolean;
  /** Weapon strike that can trigger poisons and on-hit effects. */
  weaponStrike?: boolean;
  /** A direct spell hit (Judgement of Wisdom can restore mana on it). */
  spell?: boolean;
  /** A ranged attack (Auto Shot and shots): never Windfury. */
  ranged?: boolean;
  /** The amount is final: damage-taken debuffs are already in it (Ignite comes from a crit that had them). */
  final?: boolean;
}

export interface Ability {
  id: string;
  name: string;
  icon: string;
  description: (c: Combat) => string;
  cost?: (c: Combat) => number;
  cooldown?: number | ((c: Combat) => number);
  /** Shared cooldown, e.g. all potions. */
  cooldownGroup?: string;
  /** Global cooldown in seconds; 0 if it does not trigger it. */
  gcd: number;
  target: 'enemy' | 'self';
  range?: 'melee' | number;
  /** Requires facing the target (default true for enemy abilities). */
  needsFacing?: boolean;
  requirements?: (c: Combat, t: Unit | null) => string | null;
  use: (c: Combat, t: Unit | null) => void;
  /** Glow like the game does (e.g. Riposte after a parry). */
  highlight?: (c: Combat) => boolean;
  /** Cannot be pressed right now even with enough resource (e.g. Ambush without stealth). */
  usable?: (c: Combat) => boolean;
  animation?: string;
  /** Does not break stealth when used. */
  keepsStealth?: boolean;
  /** A pet order (the pet bar): it neither attacks nor starts combat or the auto attack. */
  petCommand?: boolean;
  /** Values not yet confirmed for Forever. */
  provisional?: boolean;
  /**
   * Replaces the next main-hand swing (Heroic Strike, Cleave): pressing it
   * queues it, pressing again cancels; the cost is paid when the swing lands.
   */
  onNextSwing?: boolean;
  /** Cast time in seconds (Slam). Moving interrupts it. */
  castTime?: number | ((c: Combat) => number);
  /** Restarts the main-hand swing when the cast finishes (Slam). */
  resetsSwing?: boolean;
  /** Mana spent on top of the main resource (a cat's Shifting Power). */
  manaCost?: (c: Combat) => number;
  /** A spell: its global cooldown shrinks with casting haste, down to 1 s. */
  hastedGcd?: boolean;
  /** A visible spell flying from the player (or falling from the sky) to the target; speed in yards per second. */
  projectile?: { color: number; fromSky?: boolean; speed?: number };
  /** Casting it at an enemy does not start the auto attack (spells). */
  noAutoAttack?: boolean;
  /** A ranged shot: it starts Auto Shot instead of the melee auto attack. */
  ranged?: boolean;
  /** Minimum range in yards (the hunter's dead zone). */
  minRange?: number;
  /**
   * A channeled spell: cost, GCD and cooldown are paid at the start, then
   * `onTick` runs `ticks` times over `duration`. Moving interrupts it;
   * another spell after the GCD clips it. `onStart` can roll the hit once
   * and return false to stop the ticks (a resisted Mind Flay); `tickAtStart`
   * puts the first tick at 0 s (Penance); `hasted` lets casting haste
   * shorten it (off in the Forever sims).
   */
  channel?: {
    duration: number | ((c: Combat) => number);
    ticks: number;
    onTick: (c: Combat, t: Unit | null, tick: number) => void;
    onStart?: (c: Combat, t: Unit | null) => boolean;
    tickAtStart?: boolean;
    hasted?: boolean;
  };
}

export interface Binding { id: string | null; key: string }

/** The action bar has 16 slots; slots after them form the stance bar (warriors). */
export const ACTION_BAR_SLOTS = 16;

export interface SettingField {
  key: string;
  name: string;
  kind: 'number' | 'toggle' | 'choice';
  choices?: { value: string; label: string }[];
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface Spec {
  id: string;
  className: string;
  specName: string;
  resource: 'energy' | 'rage' | 'mana';
  /** Show threat per second in the meter (tanks). */
  showThreat?: boolean;
  /** Draw the combo point pips (rogues). */
  comboPoints?: boolean;
  /** Druid forms: which animal model to show right now (null: the humanoid). */
  form?: (c: Combat) => 'cat' | 'bear' | null;
  forms?: { cat?: BeastLookSpec; bear?: BeastLookSpec };
  /** Turn on the attacking dummy by default (tank builds). */
  tank?: boolean;
  /** Default damage per hit of the attacking dummy, before armor. */
  tankDamage?: number;
  abilities: Ability[];
  bar: Binding[];
  stats: Stats;
  rules: AttackRules;
  /** Help text in Settings: controls and class rules. */
  help: string;
  welcome: string;
  /** Resource regeneration per second, when it depends on the moment (a caster's five-second rule). */
  regen?: (c: Combat) => number;
  /** Labels for the character sheet in Settings; false hides a field. */
  sheet?: Partial<Record<'attackPower' | 'crit' | 'hit' | 'spellCrit' | 'spellPower' | 'mainHand' | 'offHand', string | false>>;
  /** Sets up talents, poisons and passive effects on start and reset. */
  prepare: (c: Combat) => void;
  /** Next recommended ability from the priority list. */
  suggest?: (c: Combat) => string | null;
  /** Live chances shown in Settings, so the player learns how often things happen. */
  chances?: (c: Combat) => { title: string; rows: [string, string][] }[];
  /** Short rotation review under the damage meter. `good` colors the value. */
  review?: (c: Combat) => { label: string; value: string; good?: boolean }[];
  /** Extra class options (talents that can be toggled, poisons…). */
  options?: SettingField[];
  defaultOptions?: Record<string, number | boolean | string>;
  /** Gear presets the player can load in Settings. */
  presets?: { name: string; stats: Stats }[];
  /** Talent builds to pick from; the chosen id lives in options.build. */
  builds?: SpecBuild[];
  /** Raid buffs and debuffs on by default (e.g. Judgement of Wisdom for a cat). */
  defaultRaid?: string[];
  /** Casters: the mana the main spell costs; time below it counts as out of mana in counters.lowMana. */
  lowMana?: (c: Combat) => number;
  /** Show the player's health bar even when the dummy does not attack (self-damage, Life Tap, Shadow Word: Death). */
  showHealth?: boolean;
  /** Where the player starts, in yards behind the dummy (ranged specs stand back). */
  startDistance?: number;
  /** A pet: the animal model that fights next to the player (hunters). */
  pet?: BeastLookSpec;
  /** A movement cue shown above the action bar (melee weaving: step in, hit, step out). */
  cue?: (c: Combat) => { text: string; tone: 'go' | 'hit' | 'back' } | null;
  /** Range rings drawn on the ground around the target, radius in metres from its centre (weaving: melee and Auto Shot). */
  rings?: (c: Combat) => { radius: number; color: number }[];
  /** A humanoid companion for the current build (a warlock's demon); it shows while `pet.out` is on. */
  minion?: (c: Combat) => MinionLook | null;
  /** Raise it when the spec's defaults change, so settings saved in the browser start over. */
  prefsRevision?: number;
  look: CharacterLook;
  sources: { label: string; url: string }[];
}

export interface SpecBuild {
  id: string;
  label: string;
  /** Short name (Fury, dual wield), the sim it comes from, and its talent string (gunba's tree order) for the talent trees drawn in the UI. */
  name?: string;
  source?: string;
  talentString?: string;
  /** Gear that suits the build (e.g. daggers for Backstab). */
  stats: Stats;
  bar: Binding[];
  /** Points per tree, for the Settings summary. */
  trees: { tree: string; points: number; talents: string[] }[];
  /** Options the build turns on when picked (e.g. Expose Armor duty). */
  options?: Record<string, number | boolean | string>;
  /** The dummy attacks you by default with this build (tanks). */
  tank?: boolean;
}

export interface BeastLookSpec { fur: number; belly: number; eyes: number }

export interface CharacterLook {
  clothColor: number;
  leatherColor: number;
  hood: boolean;
  /** Plate: helmet, tabard and metal pauldrons instead of hood and pouches. */
  plate?: boolean;
  /** A long robe from the waist (casters). */
  robe?: boolean;
  /** A demon (a warlock's Succubus): horns, bat wings, a tail and glowing eyes; leatherColor is the skin. */
  demon?: { horns: number; wings: number; tail: boolean; eyes: number };
}

/** A humanoid companion drawn with the character model (a warlock's demon). */
export interface MinionLook {
  id: string;
  look: CharacterLook;
  scale: number;
}
