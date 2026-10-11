// Combat engine shared by every class: a clock with an event queue,
// resources, cooldowns, auras, auto attacks and the attack table.
// It knows nothing about the 3D scene: the scene reports positions and the
// engine emits events (damage, errors, abilities used) to animate and draw.
import { UI } from '../strings';
import { RAID_EFFECTS, WINDFURY } from './raid';
import type {
  Ability, AttackRules, Aura, Hand, Hit, Outcome, Spec, Stats, Unit,
} from './types';

/** A swing of the attacking dummy against the player. */
export interface Incoming {
  attacker: Unit;
  outcome: Outcome;   // miss, dodge, parry, block, crit, crush or hit
  /** Damage before armor, block and other reductions, x2 on a crit, x1.5 on a crushing blow (rage from damage taken uses it). 0 when avoided. */
  raw: number;
  /** Damage after armor, block and reductions. */
  amount: number;
  blocked: number;
  /** Damage soaked by absorb shields. */
  absorbed: number;
}

export const YARD = 0.9144;
/** Melee range between centers, as in the game (5 yards). */
export const MELEE_RANGE = 5 * YARD;
/** Ranged attacks: 8 to 35 yards; between melee and 8 yards is the dead zone. */
export const RANGED_MIN = 8 * YARD;
export const RANGED_MAX = 35 * YARD;
/** Spell queue window: a press up to 0.4 s before the GCD ends is queued. */
const QUEUE_WINDOW = 0.4;
const LEAVE_COMBAT_AFTER = 5;

interface QueuedEvent { t: number; n: number; fn: () => void; alive: boolean }
export interface Scheduled { cancel(): void }

export interface Player {
  x: number; z: number; facing: number;
  moving: boolean;
  /** Energy, rage or mana. */
  resource: number; maxResource: number;
  /** Passive regeneration per second. Energy in WoW Forever is smooth (10/s), not Classic's 20-per-2-s ticks; rage has none. */
  regenPerSecond: number;
  /** Lost per second out of combat (rage). */
  decayPerSecond: number;
  /** A second pool for classes that also spend mana (a cat's Shifting Power). */
  mana: number; maxMana: number; manaPerSecond: number;
  comboPoints: number; comboTarget: Unit | null;
  gcdStart: number; gcdEnd: number;
  cooldowns: Map<string, { start: number; end: number }>;
  auras: Map<string, Aura>;
  inCombat: boolean; lastCombat: number;
  autoAttacking: boolean;
  health: number; maxHealth: number;
}

export interface Modifiers {
  hit: number;
  crit: number;
  /** Extra crit per ability, in percentage points. */
  critFor: Record<string, number>;
  /** Damage multiplier per ability. */
  damageFor: Record<string, number>;
  /** Crit damage multiplier per ability (instead of rules.critMultiplier). */
  critMultiplierFor: Record<string, number>;
  physicalDamage: number;
  natureDamage: number;
  offHand: number;
  /** Lowers the target's dodge and parry, in percentage points. */
  expertise: number;
  /** Fraction of the target's armor ignored, per damage source. */
  armorIgnoreFor: Record<string, number>;
  /** Fraction of the target's armor ignored by every physical attack. */
  armorIgnore: number;
  /** Threat per point of damage (talents such as Defiance; stances come from auras). */
  threat: number;
  /** Threat multiplier per damage source (Execute x1.25, Revenge…). */
  threatFor: Record<string, number>;
  /** Extra hit for the off hand only (Furious Precision). */
  hitOff: number;
  /** Damage taken multiplier (Defensive Stance). */
  damageTaken: number;
  /** Extra block chance in % (Shield Block sets it while active). */
  block: number;
  /** Spell crit from talents, in percentage points. */
  spellCrit: number;
  /** Damage multiplier for arcane spells (Moonfury). */
  arcaneDamage: number;
  /** Extra physical damage against a bleeding target (Rend and Tear), 0.1 = +10 %. */
  vsBleeding: number;
  /** Your own Windfury Weapon (shamans): it turns the totem off for you and gives two extra main-hand attacks with this much extra AP. */
  windfuryWeapon: { ap: number; source: string } | null;
}

export interface MeterRow {
  id: string; name: string; icon: string;
  total: number; hits: number; crits: number; misses: number; glances: number;
}

type Listener<T> = (data: T) => void;
interface EventMap {
  damage: Hit;
  error: string;
  ability: { id: string; animation?: string };
  swing: { hand: Hand; outcome: Outcome };
  death: Unit;
  reset: void;
  /** The attacking dummy swung at the player. */
  incoming: Incoming;
  playerDeath: void;
  cast: { id: string; done: boolean };
  /** Charge and Intercept: the player rushes to this unit. */
  dash: Unit;
  /** Short text near the player: a resource gain or a proc the player should notice. */
  note: { text: string; kind: 'resource' | 'proc' };
  /** An Auto Shot or a shot leaves the bow. */
  shot: Unit;
  /** The pet attacks (a swing or one of its abilities). */
  petAttack: { kind: string };
  /** A projectile to draw for one tick of a channel (each Arcane Missile); `from` a point instead of your hands (a totem). */
  bolt: { target: Unit; color: number; speed?: number; from?: { x: number; z: number; totem?: string } };
  /** A totem goes down in an element slot (`id` null: the slot is empty again). `facing` is the player's at the drop. */
  totem: { slot: string; id: string | null; x: number; z: number; facing: number };
  /** A burst of flame around a point (Fire Nova, Magma Totem), radius in yards. */
  nova: { x: number; z: number; radius: number; color: number; totem?: string };
}

const freshModifiers = (): Modifiers => ({
  hit: 0, crit: 0, critFor: {}, damageFor: {}, critMultiplierFor: {},
  physicalDamage: 1, natureDamage: 1, offHand: 1, expertise: 0, armorIgnoreFor: {}, armorIgnore: 0,
  threat: 1, threatFor: {}, hitOff: 0, damageTaken: 1, block: 0, spellCrit: 0, arcaneDamage: 1, vsBleeding: 0,
  windfuryWeapon: null,
});

const SOURCE_NAMES: Record<string, string> = {
  melee_mh: 'Melee (main hand)',
  melee_oh: 'Melee (off hand)',
};
const SOURCE_ICONS: Record<string, string> = { melee_mh: 'melee', melee_oh: 'melee' };

export class Combat {
  t = 0;
  readonly spec: Spec;
  stats: Stats;
  rules: AttackRules;
  options: Record<string, number | boolean | string>;
  mod: Modifiers = freshModifiers();
  player: Player;
  targets: Unit[] = [];
  target: Unit | null = null;
  healthLocked = false;
  /** Health the dummies start at, as a fraction (0.15 to practice Execute). */
  startHealth = 1;
  /** On-hit effects (poisons, talents). Rebuilt on prepare. */
  onHit: Array<(h: Hit) => void> = [];
  /** Runs after every damage event, landed or not (e.g. Blade Flurry). Rebuilt on prepare. */
  afterDamage: Array<(h: Hit) => void> = [];
  meter = { start: null as number | null, end: 0, total: 0, threat: 0, rows: new Map<string, MeterRow>() };
  /** Ability waiting in the queue for the GCD to end. */
  queued: string | null = null;
  /** On-next-swing ability waiting for the main-hand swing (Heroic Strike). */
  queuedSwing: string | null = null;
  /** The cast in progress (Slam). */
  casting: { id: string; start: number; end: number; ev: Scheduled } | null = null;
  /** The channel in progress (Mind Flay): ticks left and their events. */
  channeling: { id: string; start: number; end: number; ticks: number; done: number; events: Scheduled[] } | null = null;
  /** Incoming swings from the attacking dummy (tank practice). */
  enemyAttacks = { on: false, speed: 2, damage: 3000, ap: 805, healing: 1500 };
  /** The player's health does not drop (damage still counts for rage). */
  playerHealthLocked = true;
  /** Mana is never spent (practice option). */
  manaLocked = false;
  /** When mana was last spent, for the five-second rule. */
  lastSpend = -Infinity;
  /** Auto Shot is on (hunters). It and the melee auto attack exclude each other. */
  autoShooting = false;
  /** Auto Shot's windup in progress: you must stand still until it ends. */
  windup: { start: number; end: number; ev: Scheduled } | null = null;
  /** Classic rule: Auto Shot and cast shots wait for each other (a cast clips the shot). Forever: autos fire during casts. */
  classicAutoShot = false;
  /** The pet the spec controls; the scene reads it to draw the animal. */
  pet = { out: false, attacking: false };
  private rangedEv: Scheduled | null = null;
  private rangedNextAt = 0;
  private windupStartedAt = -Infinity;
  /** Raid buffs and dummy debuffs switched on in Settings (ids from engine/raid.ts). */
  raid = new Set<string>();
  /** Attack power added to the swing in progress (Windfury's extra attack). */
  private bonusAp = 0;
  private lastWindfury = -Infinity;
  /** Runs for every swing of the attacking dummy (rage from damage, Revenge…). Rebuilt on prepare. */
  onIncoming: Array<(i: Incoming) => void> = [];
  /** Cost paid for the ability being used, for refunds. */
  costPaid = 0;
  /** Random number in [0, 1); tests can replace it. */
  random: () => number = Math.random;
  /**
   * Practice counters since the pull (procs, finishers…), cleared with the
   * meter. The engine adds `combatTime` and `resourceWasted` (regeneration
   * lost at full resource); specs add their own.
   */
  counters: Record<string, number> = {};
  /** Player auras whose uptime in combat is counted in `counters['uptime:<id>']`. */
  trackedAuras: string[] = [];
  /** Auras on the current target, counted in `counters['uptime:target:<id>']`. */
  trackedTargetAuras: string[] = [];

  private queue: QueuedEvent[] = [];
  private counter = 0;
  /** Time up to which resource regeneration has been paid. */
  private regenAt = 0;
  private enemySwing: Scheduled | null = null;
  private nextEnemySwing = 0;
  private swingMH: Scheduled | null = null;
  private swingOH: Scheduled | null = null;
  private nextSwing: Record<Hand, number> = { main: 0, off: 0 };
  private listeners = new Map<keyof EventMap, Set<Listener<never>>>();
  private abilitiesById: Map<string, Ability>;
  private expirations = new Map<Aura, Scheduled>();
  private ticks = new Map<Aura, Scheduled>();

  constructor(spec: Spec, options?: Record<string, number | boolean | string>) {
    this.spec = spec;
    this.stats = structuredClone(spec.stats);
    this.rules = { ...spec.rules };
    this.options = { ...(spec.defaultOptions ?? {}), ...(options ?? {}) };
    this.abilitiesById = new Map(spec.abilities.map((a) => [a.id, a]));
    this.player = this.newPlayer();
    this.reset();
  }

  // ----------------------------------------------------------------- events
  on<K extends keyof EventMap>(type: K, fn: Listener<EventMap[K]>): () => void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(fn as Listener<never>);
    return () => set.delete(fn as Listener<never>);
  }
  emit<K extends keyof EventMap>(type: K, data: EventMap[K]): void {
    this.listeners.get(type)?.forEach((fn) => (fn as Listener<EventMap[K]>)(data));
  }

  schedule(at: number, fn: () => void): Scheduled {
    const ev: QueuedEvent = { t: at, n: this.counter++, fn, alive: true };
    // Sorted insert: the queue stays short (tens of events).
    let i = this.queue.length;
    while (i > 0 && (this.queue[i - 1].t > ev.t || (this.queue[i - 1].t === ev.t && this.queue[i - 1].n > ev.n))) i--;
    this.queue.splice(i, 0, ev);
    return { cancel: () => { ev.alive = false; } };
  }

  /** Advances the clock dt seconds, running each event at its exact time. */
  update(dt: number): void {
    const end = this.t + dt;
    while (this.queue.length && this.queue[0].t <= end) {
      const ev = this.queue.shift()!;
      if (!ev.alive) continue;
      this.settleRegen(ev.t);
      this.t = Math.max(this.t, ev.t);
      ev.fn();
      this.runQueued();
    }
    this.settleRegen(end);
    this.t = end;
    this.runQueued();
    const p = this.player;
    // Moving interrupts a cast or a channel, and Auto Shot's windup (it tries again 0.5 s later).
    if (this.casting && p.moving) this.cancelCast(UI.interrupted);
    if (this.channeling && p.moving) this.stopChannel(UI.interrupted);
    if (this.windup && p.moving) {
      this.windup.ev.cancel();
      this.windup = null;
      this.count('autoShotsInterrupted');
      this.scheduleRanged(this.t + 0.5);
    }
    if (this.enemyAttacks.on && !this.enemySwing && this.target && this.target.health > 0) this.scheduleEnemySwing(this.t + 0.5);
    if (p.inCombat && !p.autoAttacking && !this.autoShooting && this.t - p.lastCombat > LEAVE_COMBAT_AFTER
      && !this.targets.some((u) => [...u.auras.values()].some((a) => a.period))) {
      p.inCombat = false;
    }
  }

  private runQueued(): void {
    if (this.queued && this.t >= this.player.gcdEnd && !this.casting) {
      const id = this.queued;
      this.queued = null;
      this.use(id);
    }
  }

  // ------------------------------------------------------------------ reset
  private newPlayer(): Player {
    return {
      x: 0, z: -3.2, facing: 0, moving: false,
      resource: 100, maxResource: 100, regenPerSecond: 10, decayPerSecond: 0,
      mana: 0, maxMana: 0, manaPerSecond: 0,
      comboPoints: 0, comboTarget: null,
      gcdStart: 0, gcdEnd: 0,
      cooldowns: new Map(), auras: new Map(),
      inCombat: false, lastCombat: -99, autoAttacking: false,
      health: 1, maxHealth: 1,
    };
  }

  /** Movement speed multiplier from auras (Sprint, Stealth…). */
  moveSpeed(): number {
    let m = 1;
    for (const a of this.player.auras.values()) if (a.speed) m *= a.speed;
    return m;
  }

  /** Back to the start: full resources, no auras or cooldowns. */
  reset(): void {
    const prev = this.player;
    this.queue = [];
    this.expirations.clear();
    this.ticks.clear();
    this.swingMH = this.swingOH = null;
    this.enemySwing = null;
    this.nextSwing = { main: 0, off: 0 };
    this.queued = null;
    this.queuedSwing = null;
    this.casting = null;
    this.channeling = null;
    this.t = 0;
    this.regenAt = 0;
    this.lastSpend = -Infinity;
    this.autoShooting = false;
    this.windup = null;
    this.rangedEv = null;
    this.rangedNextAt = 0;
    this.windupStartedAt = -Infinity;
    this.classicAutoShot = false;
    this.pet = { out: false, attacking: false };
    this.player = this.newPlayer();
    // The scene owns the position: keep it.
    Object.assign(this.player, { x: prev.x, z: prev.z, facing: prev.facing });
    for (const u of this.targets) {
      u.auras.clear();
      u.health = Math.max(1, Math.round(u.maxHealth * this.startHealth));
    }
    this.mod = freshModifiers();
    this.onHit = [];
    this.afterDamage = [];
    this.onIncoming = [];
    this.trackedAuras = [];
    this.trackedTargetAuras = [];
    const tank = this.stats.tank;
    this.player.maxHealth = this.player.health = tank?.health ?? this.stats.health ?? 4000;
    this.clearMeter();
    this.spec.prepare(this);
    this.lastWindfury = -Infinity;
    this.applyRaid();
    // prepare sets the cap (e.g. Vigor). Energy starts full, rage empty.
    this.player.resource = this.spec.resource === 'rage' ? 0 : this.player.maxResource;
    this.player.mana = this.player.maxMana;
    this.emit('reset', undefined);
  }

  clearMeter(): void {
    this.meter = { start: null, end: 0, total: 0, threat: 0, rows: new Map() };
    this.counters = {};
  }

  /** Regeneration per second right now, with regeneration auras (e.g. Adrenaline Rush). */
  regenRate(): number {
    let mult = 1;
    for (const a of this.player.auras.values()) if (a.regen) mult *= a.regen;
    const base = this.spec.regen ? this.spec.regen(this) : this.player.regenPerSecond;
    return base * mult;
  }

  /**
   * Pays the regeneration owed up to `to`. It runs before every event, so a
   * rate change (an aura starting or ending) applies from its exact moment.
   */
  private settleRegen(to: number): void {
    if (to <= this.regenAt) return;
    const dt = to - this.regenAt;
    const p = this.player;
    const gain = this.regenRate() * dt;
    if (p.inCombat && this.meter.start !== null) {
      this.count('combatTime', dt);
      if (this.spec.lowMana && !this.manaLocked && p.resource < this.spec.lowMana(this)) this.count('lowMana', dt);
      for (const id of this.trackedAuras) if (p.auras.has(id)) this.count(`uptime:${id}`, dt);
      for (const id of this.trackedTargetAuras) if (this.target?.auras.has(id)) this.count(`uptime:target:${id}`, dt);
    }
    this.addResource(gain);
    if (!p.inCombat && p.decayPerSecond) this.addResource(-p.decayPerSecond * dt);
    let buffMana = 0;
    for (const a of p.auras.values()) if (a.manaPerSecond) buffMana += a.manaPerSecond;
    if (p.maxMana) p.mana = Math.min(p.maxMana, p.mana + (p.manaPerSecond + buffMana) * dt);
    else if (this.spec.resource === 'mana' && buffMana) this.addResource(buffMana * dt);
    // External healing while the dummy attacks and your health is not locked.
    if ((this.enemyAttacks.on || this.spec.showHealth) && !this.playerHealthLocked && p.health > 0) {
      p.health = Math.min(p.maxHealth, p.health + this.enemyAttacks.healing * dt);
    }
    this.regenAt = to;
  }

  /** Adds to a practice counter. */
  count(key: string, n = 1): void { this.counters[key] = (this.counters[key] ?? 0) + n; }

  addResource(n: number): void {
    const p = this.player;
    // What does not fit is wasted (energy at full, rage at 100).
    if (n > 0 && p.inCombat && this.meter.start !== null) this.count('resourceWasted', Math.max(0, p.resource + n - p.maxResource));
    p.resource = Math.max(0, Math.min(p.maxResource, p.resource + n));
  }

  // -------------------------------------------------------------- abilities
  ability(id: string): Ability | undefined { return this.abilitiesById.get(id); }

  cost(a: Ability): number {
    // Locked mana: a caster's spells are free.
    if (this.manaLocked && this.spec.resource === 'mana') return 0;
    return a.cost ? Math.max(0, a.cost(this)) : 0;
  }

  cooldownLeft(id: string): { left: number; total: number } {
    const a = this.ability(id);
    const key = a?.cooldownGroup ?? id;
    const cd = this.player.cooldowns.get(key);
    if (!cd || cd.end <= this.t) return { left: 0, total: 0 };
    return { left: cd.end - this.t, total: cd.end - cd.start };
  }

  startCooldown(id: string, seconds: number): void {
    const a = this.ability(id);
    this.player.cooldowns.set(a?.cooldownGroup ?? id, { start: this.t, end: this.t + seconds });
  }

  clearCooldown(id: string): void {
    const a = this.ability(id);
    this.player.cooldowns.delete(a?.cooldownGroup ?? id);
  }

  distance(u: Unit): number {
    return Math.hypot(u.x - this.player.x, u.z - this.player.z);
  }
  inRange(u: Unit, range: 'melee' | number = 'melee'): boolean {
    const max = range === 'melee' ? MELEE_RANGE + u.radius * 0.5 : range * YARD + u.radius;
    return this.distance(u) <= max;
  }
  /** The target is inside the player's front 180° arc. */
  facingTarget(u: Unit): boolean {
    const p = this.player;
    const dx = u.x - p.x, dz = u.z - p.z;
    return Math.sin(p.facing) * dx + Math.cos(p.facing) * dz >= 0;
  }
  /** The player stands in the target's back half. */
  behind(u: Unit): boolean {
    const dx = this.player.x - u.x, dz = this.player.z - u.z;
    return Math.sin(u.facing) * dx + Math.cos(u.facing) * dz < 0;
  }

  /** Why the ability cannot be used now, or null. Ignores the GCD. */
  blocker(a: Ability, u: Unit | null = this.target): string | null {
    if (this.cooldownLeft(a.id).left > 0) return UI.notReady;
    if (a.target === 'enemy') {
      if (!u) return UI.noTarget;
      if (u.health <= 0) return UI.targetDead;
      if (a.range && !this.inRange(u, a.range)) return UI.outOfRange;
      if (a.minRange && this.distance(u) < a.minRange * YARD + u.radius) return UI.tooClose;
      if (a.needsFacing !== false && !this.facingTarget(u)) return UI.facingWrong;
    }
    const castTime = typeof a.castTime === 'function' ? a.castTime(this) : a.castTime ?? 0;
    if ((castTime > 0 || a.channel) && this.player.moving) return UI.cantWhileMoving;
    const r = a.requirements?.(this, u);
    if (r) return r;
    if (this.cost(a) > this.player.resource) return UI.notEnough(this.spec.resource);
    if (a.manaCost && !this.manaLocked && a.manaCost(this) > this.player.mana) return UI.notEnough('mana');
    return null;
  }

  /** A key press on an ability. Returns true if it was used. */
  use(id: string): boolean {
    const a = this.ability(id);
    if (!a) return false;
    const p = this.player;
    if (a.onNextSwing) return this.queueSwing(a);
    if (this.casting && a.gcd > 0) {
      this.emit('error', UI.notReady);
      return false;
    }
    if (a.gcd > 0 && this.t < p.gcdEnd) {
      if (p.gcdEnd - this.t <= QUEUE_WINDOW) this.queued = id;
      else this.emit('error', UI.notReady);
      return false;
    }
    const u = a.target === 'enemy' ? this.target : null;
    const reason = this.blocker(a, u);
    if (reason) {
      this.emit('error', reason);
      return false;
    }
    // A new spell after the GCD clips the channel in progress.
    if (this.channeling && a.gcd > 0) this.stopChannel();
    const castTime = typeof a.castTime === 'function' ? a.castTime(this) : a.castTime ?? 0;
    if (castTime > 0) {
      // Classic rule: a cast started during Auto Shot's windup clips the shot.
      if (this.classicAutoShot && this.windup) {
        this.windup.ev.cancel();
        this.windup = null;
        this.count('autoShotsClipped');
        this.scheduleRanged(this.t + castTime);
      }
      // The GCD starts with the cast; cost, cooldown and effect come at the end.
      if (a.gcd > 0) { p.gcdStart = this.t; p.gcdEnd = this.t + this.gcdOf(a); }
      const end = this.t + castTime;
      this.casting = { id: a.id, start: this.t, end, ev: this.schedule(end, () => this.finishCast()) };
      this.emit('cast', { id: a.id, done: false });
      return true;
    }
    this.costPaid = this.cost(a);
    p.resource -= this.costPaid;
    if (this.costPaid > 0 && this.spec.resource === 'mana') this.lastSpend = this.t;
    if (a.manaCost && !this.manaLocked) p.mana -= a.manaCost(this);
    if (a.gcd > 0) { p.gcdStart = this.t; p.gcdEnd = this.t + this.gcdOf(a); }
    const cd = typeof a.cooldown === 'function' ? a.cooldown(this) : a.cooldown;
    if (cd) this.startCooldown(a.id, cd);
    if (!a.keepsStealth) this.breakStealth();
    a.use(this, u);
    if (a.channel) this.startChannel(a, u);
    // Attacks start the auto attack (shots start Auto Shot); stealthy abilities (Premeditation) and spells do not.
    if (a.target === 'enemy' && u && !a.keepsStealth) {
      if (a.noAutoAttack) this.enterCombat(); else if (a.ranged) this.startAutoShot(); else this.startAutoAttack();
    }
    this.emit('ability', { id: a.id, animation: a.animation });
    return true;
  }

  /** Queues or cancels an on-next-swing ability (Heroic Strike, Cleave). */
  private queueSwing(a: Ability): boolean {
    if (this.queuedSwing === a.id) {
      this.queuedSwing = null;
      return true;
    }
    const reason = this.blocker(a, this.target);
    if (reason) {
      this.emit('error', reason);
      return false;
    }
    this.queuedSwing = a.id;
    this.startAutoAttack();
    return true;
  }

  private finishCast(): void {
    const cast = this.casting;
    if (!cast) return;
    this.casting = null;
    const a = this.ability(cast.id)!;
    const u = a.target === 'enemy' ? this.target : null;
    const reason = this.blocker(a, u);
    if (reason) {
      this.emit('error', reason);
      return;
    }
    this.costPaid = this.cost(a);
    this.player.resource -= this.costPaid;
    if (this.costPaid > 0 && this.spec.resource === 'mana') this.lastSpend = this.t;
    const cd = typeof a.cooldown === 'function' ? a.cooldown(this) : a.cooldown;
    if (cd) this.startCooldown(a.id, cd);
    this.breakStealth();
    a.use(this, u);
    if (a.resetsSwing && this.player.autoAttacking) {
      this.swingMH?.cancel();
      this.scheduleSwing('main', this.t + this.weaponSpeed('main'));
    }
    if (a.target === 'enemy' && u) {
      if (a.noAutoAttack) this.enterCombat(); else if (a.ranged) this.startAutoShot(); else this.startAutoAttack();
    }
    this.emit('cast', { id: a.id, done: true });
    this.emit('ability', { id: a.id, animation: a.animation });
  }

  /** Starts a channel: ticks evenly spread over its duration (casting haste shortens it). */
  private startChannel(a: Ability, u: Unit | null): void {
    const ch = a.channel!;
    // The duration is read before onStart, which may spend what sets it (Missile Barrage).
    const duration = (typeof ch.duration === 'function' ? ch.duration(this) : ch.duration) / (ch.hasted ? this.castHaste() : 1);
    if (ch.onStart && !ch.onStart(this, u)) return;
    // Ticks spread evenly; with tickAtStart the first one lands at once (Penance: 0, 1, 2 s).
    const step = ch.tickAtStart ? duration / Math.max(1, ch.ticks - 1) : duration / ch.ticks;
    const channel = { id: a.id, start: this.t, end: this.t + duration, ticks: ch.ticks, done: 0, events: [] as Scheduled[] };
    this.channeling = channel;
    for (let i = 1; i <= ch.ticks; i++) {
      const at = this.t + step * (ch.tickAtStart ? i - 1 : i);
      channel.events.push(this.schedule(at, () => {
        if (this.channeling !== channel) return;
        channel.done = i;
        if (u && u.health <= 0) { this.stopChannel(); return; }
        ch.onTick(this, u, i);
        if (i === ch.ticks) { this.channeling = null; this.emit('cast', { id: a.id, done: true }); }
      }));
    }
    this.emit('cast', { id: a.id, done: false });
  }

  /** Ends the channel early (moving, or clipping it with another spell). */
  stopChannel(reason?: string): void {
    const ch = this.channeling;
    if (!ch) return;
    for (const ev of ch.events) ev.cancel();
    this.channeling = null;
    if (ch.done < ch.ticks) this.count(`clipped:${ch.id}`);
    this.emit('cast', { id: ch.id, done: true });
    if (reason) this.emit('error', reason);
  }

  cancelCast(reason?: string): void {
    if (!this.casting) return;
    this.casting.ev.cancel();
    this.emit('cast', { id: this.casting.id, done: true });
    this.casting = null;
    if (reason) this.emit('error', reason);
  }

  /** Gives back part of the resource spent (misses and dodges). */
  refund(fraction: number): void { this.addResource(this.costPaid * fraction); }

  // ----------------------------------------------------------- combo points
  addComboPoints(u: Unit, n: number): void {
    const p = this.player;
    if (p.comboTarget !== u) { p.comboTarget = u; p.comboPoints = 0; }
    p.comboPoints = Math.min(5, p.comboPoints + n);
  }
  comboPointsOn(u: Unit | null): number {
    return u && this.player.comboTarget === u ? this.player.comboPoints : 0;
  }
  spendComboPoints(): number {
    const n = this.player.comboPoints;
    this.player.comboPoints = 0;
    return n;
  }

  // ------------------------------------------------------------------ auras
  applyAura(u: Unit | Player, data: Omit<Aura, 'start' | 'end'>): Aura {
    const old = u.auras.get(data.id);
    if (old) this.cancelAuraEvents(old);
    const hasteBefore = this.haste();
    const aura: Aura = { ...data, start: this.t, end: this.t + data.duration };
    u.auras.set(aura.id, aura);
    if (Number.isFinite(aura.end)) {
      this.expirations.set(aura, this.schedule(aura.end, () => this.removeAura(u, aura.id, true)));
    }
    if (aura.period && aura.onTick) this.scheduleTick(u, aura);
    if (u === this.player) this.rescaleSwings(hasteBefore);
    return aura;
  }

  private scheduleTick(u: Unit | Player, aura: Aura): void {
    aura.nextTick = this.t + aura.period!;
    // A tick that lands exactly on the expiry still happens (see removeAura).
    if (aura.nextTick > aura.end + 1e-6) return;
    this.ticks.set(aura, this.schedule(aura.nextTick, () => {
      if (u.auras.get(aura.id) !== aura) return;
      aura.onTick!(this, aura);
      this.scheduleTick(u, aura);
    }));
  }

  private cancelAuraEvents(a: Aura): void {
    this.expirations.get(a)?.cancel();
    this.ticks.get(a)?.cancel();
    this.expirations.delete(a);
    this.ticks.delete(a);
  }

  removeAura(u: Unit | Player, id: string, expired = false): void {
    const a = u.auras.get(id);
    if (!a) return;
    // The last tick can fall on the same instant as the expiry.
    if (expired && a.period && a.onTick && a.nextTick !== undefined && Math.abs(a.nextTick - this.t) < 1e-6) {
      a.onTick(this, a);
    }
    const hasteBefore = this.haste();
    this.cancelAuraEvents(a);
    u.auras.delete(id);
    a.onRemove?.(this, a, expired);
    if (u === this.player) this.rescaleSwings(hasteBefore);
  }

  aura(u: Unit | Player | null, id: string): Aura | undefined {
    return u?.auras.get(id);
  }

  /** Moves an aura's end time (e.g. talents that extend it). */
  setAuraEnd(u: Unit | Player, id: string, end: number): void {
    const a = u.auras.get(id);
    if (!a) return;
    this.expirations.get(a)?.cancel();
    a.end = end;
    a.duration = end - a.start;
    this.expirations.set(a, this.schedule(a.end, () => this.removeAura(u, a.id, true)));
  }

  // ---------------------------------------------------------------- stealth
  stealthed(): boolean { return this.player.auras.has('stealth'); }
  breakStealth(): void {
    if (this.stealthed()) this.removeAura(this.player, 'stealth');
  }

  // ------------------------------------------------------------ auto attack
  haste(): number {
    let h = 1;
    for (const a of this.player.auras.values()) if (a.haste) h *= 1 + a.haste;
    return h;
  }

  weaponSpeed(hand: Hand): number {
    const w = hand === 'main' ? this.stats.mainHand : this.stats.offHand;
    return (w?.speed ?? 2) / this.haste();
  }

  startAutoAttack(): void {
    const p = this.player;
    this.enterCombat();
    if (this.autoShooting) this.stopAutoShot();
    if (p.autoAttacking) return;
    p.autoAttacking = true;
    // The main hand swings at once; the off hand half a swing later.
    this.scheduleSwing('main', Math.max(this.t, this.nextSwing.main));
    if (this.stats.offHand) {
      this.scheduleSwing('off', Math.max(this.t + this.weaponSpeed('off') / 2, this.nextSwing.off));
    }
  }

  stopAutoAttack(): void {
    this.player.autoAttacking = false;
    this.swingMH?.cancel();
    this.swingOH?.cancel();
    this.swingMH = this.swingOH = null;
  }

  private scheduleSwing(hand: Hand, at: number): void {
    this.nextSwing[hand] = at;
    const s = this.schedule(at, () => this.swing(hand));
    if (hand === 'main') this.swingMH = s; else this.swingOH = s;
  }

  /** When haste changes, the rest of each swing is rescaled. */
  private rescaleSwings(before: number): void {
    const now = this.haste();
    if (!this.player.autoAttacking || Math.abs(now - before) < 1e-9) return;
    for (const hand of ['main', 'off'] as Hand[]) {
      const s = hand === 'main' ? this.swingMH : this.swingOH;
      if (!s) continue;
      s.cancel();
      const left = Math.max(0, this.nextSwing[hand] - this.t) * before / now;
      this.scheduleSwing(hand, this.t + left);
    }
  }

  // -------------------------------------------------------------- Auto Shot
  /** Ranged attack speed multiplier: quiver x auras (Quick Shots, Rapid Fire). */
  rangedHaste(): number {
    let h = this.stats.rangedHaste ?? 1;
    for (const a of this.player.auras.values()) if (a.rangedHaste) h *= 1 + a.rangedHaste;
    return h;
  }

  /** Ranged attack power with auras (Aspect of the Hawk, Trueshot) and the target's Hunter's Mark. */
  rangedAttackPower(u: Unit | null = this.target): number {
    let ap = this.stats.rangedAttackPower ?? 0;
    for (const a of this.player.auras.values()) if (a.rangedAttackPower) ap += a.rangedAttackPower;
    if (u) for (const a of u.auras.values()) if (a.rangedApTaken) ap += a.rangedApTaken;
    return ap;
  }

  /** Between 8 and 35 yards (measured to the target's edge). */
  inRangedRange(u: Unit): boolean {
    const d = this.distance(u);
    return d >= RANGED_MIN + u.radius && d <= RANGED_MAX + u.radius;
  }

  startAutoShot(): void {
    if (!this.stats.ranged) return;
    this.enterCombat();
    if (this.player.autoAttacking) this.stopAutoAttack();
    if (this.autoShooting) return;
    this.autoShooting = true;
    this.scheduleRanged(Math.max(this.t, this.rangedNextAt));
  }

  stopAutoShot(): void {
    this.autoShooting = false;
    this.rangedEv?.cancel();
    this.rangedEv = null;
    if (this.windup) { this.windup.ev.cancel(); this.windup = null; }
  }

  private scheduleRanged(at: number): void {
    this.rangedEv?.cancel();
    this.rangedEv = this.schedule(at, () => this.rangedAttempt());
  }

  /**
   * Starts Auto Shot's windup (0.5 s / ranged haste, standing still, 8-35 yd,
   * facing the target). If it cannot start, it tries again: 0.5 s after
   * moving, 0.2 s otherwise. The cycle runs windup start to windup start.
   */
  private rangedAttempt(): void {
    this.rangedEv = null;
    const u = this.target;
    const p = this.player;
    if (!this.autoShooting || this.windup) return;
    const blocked = !u || u.health <= 0 || !this.inRangedRange(u) || !this.facingTarget(u) || (this.classicAutoShot && !!this.casting);
    if (blocked || p.moving) {
      const retry = p.moving ? 0.5 : this.classicAutoShot && this.casting ? Math.max(0.05, this.casting.end - this.t) : 0.2;
      this.scheduleRanged(this.t + retry);
      return;
    }
    const wind = 0.5 / this.rangedHaste();
    this.windupStartedAt = this.t;
    this.windup = { start: this.t, end: this.t + wind, ev: this.schedule(this.t + wind, () => this.rangedFire()) };
  }

  private rangedFire(): void {
    this.windup = null;
    const u = this.target;
    const w = this.stats.ranged;
    if (!this.autoShooting || !u || !w) return;
    // Ranged table: miss, then crit; never dodged, parried or glancing.
    const outcome = this.rollRanged(u, 'autoShot');
    const base = w.min + this.random() * (w.max - w.min) + (this.stats.ammoDps ?? 0) * w.speed + (this.rangedAttackPower(u) / 14) * w.speed;
    const amount = this.physicalDamage(u, 'autoShot', base, outcome);
    this.count('autoShots');
    this.emit('shot', u);
    this.deal({ target: u, source: 'autoShot', outcome, school: 'physical', amount, white: true, ranged: true, weaponStrike: true });
    this.rangedNextAt = this.windupStartedAt + w.speed / this.rangedHaste();
    if (this.autoShooting) this.scheduleRanged(Math.max(this.t, this.rangedNextAt));
  }

  /** Ranged attacks: miss (8 % minus hit), then crit. */
  rollRanged(u: Unit, source: string): Outcome {
    void u;
    if (this.random() * 100 < Math.max(0, this.rules.specialMiss - this.totalHit())) return 'miss';
    return this.random() * 100 < this.critChance(source) ? 'crit' : 'hit';
  }

  /** Seconds until the next Auto Shot windup starts (0 while it is winding up). */
  timeToWindup(): number {
    if (!this.autoShooting || this.windup) return 0;
    return Math.max(0, this.rangedNextAt - this.t);
  }

  /** Auto Shot's timer for the HUD: time to the next shot and whether the windup is on. */
  rangedLeft(): { left: number; total: number; winding: boolean } {
    const w = this.stats.ranged;
    if (!this.autoShooting || !w) return { left: 0, total: 0, winding: false };
    const total = w.speed / this.rangedHaste();
    if (this.windup) return { left: this.windup.end - this.t, total, winding: true };
    return { left: Math.max(0, this.rangedNextAt + 0.5 / this.rangedHaste() - this.t), total, winding: false };
  }

  /** Time until each hand's next swing (for the swing timer). */
  swingLeft(hand: Hand): { left: number; total: number } {
    if (!this.player.autoAttacking) return { left: 0, total: 0 };
    return { left: Math.max(0, this.nextSwing[hand] - this.t), total: this.weaponSpeed(hand) };
  }

  private swing(hand: Hand): void {
    // This event is being consumed: anything that reschedules the swing while
    // it runs (an extra attack, a haste change) owns the next one.
    if (hand === 'main') this.swingMH = null; else this.swingOH = null;
    const u = this.target;
    if (!this.player.autoAttacking || !u) return;
    if (u.health <= 0 || !this.inRange(u) || !this.facingTarget(u)) {
      // Out of range the swing waits, ready, and lands as soon as you are back.
      this.scheduleSwing(hand, this.t + 0.1);
      this.nextSwing[hand] = this.t;
      return;
    }
    const queued = hand === 'main' && this.queuedSwing ? this.ability(this.queuedSwing) : undefined;
    this.queuedSwing = hand === 'main' ? null : this.queuedSwing;
    if (queued && !this.blocker(queued, u)) {
      // The queued ability takes the place of the white hit.
      this.costPaid = this.cost(queued);
      this.player.resource -= this.costPaid;
      if (this.costPaid > 0 && this.spec.resource === 'mana') this.lastSpend = this.t;
      const cd = typeof queued.cooldown === 'function' ? queued.cooldown(this) : queued.cooldown;
      if (cd) this.startCooldown(queued.id, cd);
      queued.use(this, u);
      this.emit('ability', { id: queued.id, animation: queued.animation });
    } else {
      this.whiteHit(hand, u);
    }
    const next = hand === 'main' ? this.swingMH : this.swingOH;
    if (!next && this.player.autoAttacking) this.scheduleSwing(hand, this.t + this.weaponSpeed(hand));
  }

  /** An extra main-hand swing (e.g. Sword Specialization); it resets the swing timer. */
  extraAttack(u: Unit): void {
    this.whiteHit('main', u);
    if (!this.player.autoAttacking) return;
    this.swingMH?.cancel();
    this.scheduleSwing('main', this.t + this.weaponSpeed('main'));
  }

  whiteHit(hand: Hand, u: Unit): void {
    const source = hand === 'main' ? 'melee_mh' : 'melee_oh';
    const outcome = this.rollWhite(u, source);
    const amount = this.physicalDamage(u, source, this.weaponDamage(hand), outcome);
    this.emit('swing', { hand, outcome });
    this.deal({ target: u, source, outcome, school: 'physical', amount, white: true, hand, weaponStrike: true });
  }

  // ------------------------------------------------------------ attack table
  totalHit(): number { return this.stats.hit + this.mod.hit; }

  dodgeChance(): number { return Math.max(0, this.rules.dodge - this.mod.expertise); }
  parryChance(u: Unit): number { return this.behind(u) ? 0 : Math.max(0, this.rules.parryFromFront - this.mod.expertise); }

  critChance(source: string): number {
    let auraCrit = 0;
    for (const a of this.player.auras.values()) if (a.crit) auraCrit += a.crit;
    return Math.max(0, this.stats.crit + this.mod.crit + auraCrit + (this.mod.critFor[source] ?? 0)
      - this.rules.critSuppression);
  }

  /** Chance in % of each outcome for an auto attack. */
  whiteTable(u: Unit, source = 'melee_mh') {
    const r = this.rules;
    // In Forever a queued Heroic Strike no longer removes the dual-wield penalty (1 Oct).
    const dual = !!this.stats.offHand;
    const offHit = source === 'melee_oh' ? this.mod.hitOff : 0;
    const miss = Math.max(0, (dual ? r.dualWieldMiss : r.specialMiss) - this.totalHit() - offHit);
    return { miss, dodge: this.dodgeChance(), parry: this.parryChance(u), glance: r.glanceChance, crit: this.critChance(source) };
  }

  rollWhite(u: Unit, source: string): Outcome {
    const p = this.whiteTable(u, source);
    let x = this.random() * 100;
    if ((x -= p.miss) < 0) return 'miss';
    if ((x -= p.dodge) < 0) return 'dodge';
    if ((x -= p.parry) < 0) return 'parry';
    if ((x -= p.glance) < 0) return 'glance';
    if ((x -= p.crit) < 0) return 'crit';
    return 'hit';
  }

  /**
   * Special attacks roll twice, as in WoWSims: first miss, dodge and parry
   * (no glancing, no dual-wield penalty), then crit on a landed attack.
   */
  rollSpecial(u: Unit, source: string, opts: { noDodge?: boolean; forceCrit?: boolean } = {}): Outcome {
    let x = this.random() * 100;
    if ((x -= Math.max(0, this.rules.specialMiss - this.totalHit())) < 0) return 'miss';
    if (!opts.noDodge && (x -= this.dodgeChance()) < 0) return 'dodge';
    if (!opts.noDodge && (x -= this.parryChance(u)) < 0) return 'parry';
    if (opts.forceCrit) return 'crit';
    return this.random() * 100 < this.critChance(source) ? 'crit' : 'hit';
  }

  /** Spell table (poisons): resist chance with a 1 % floor, then crit from spell crit. */
  rollSpell(extraCrit = 0): Outcome {
    const miss = Math.max(1, this.rules.spellMiss - this.totalHit());
    if (this.random() * 100 < miss) return 'resist';
    return this.random() * 100 < this.stats.spellCrit + extraCrit ? 'crit' : 'hit';
  }

  /** Roll for a periodic tick that can crit (Forever: bleeds and poisons can). */
  rollTickCrit(chance: number): boolean { return this.random() * 100 < chance; }

  /** Casting speed multiplier from auras (Nature's Grace). */
  castHaste(): number {
    let h = 1;
    for (const a of this.player.auras.values()) if (a.castHaste) h *= 1 + a.castHaste;
    return h;
  }

  /** Global cooldown of an ability: spells shrink with casting haste, never under 1 s. */
  gcdOf(a: Ability): number {
    if (!a.hastedGcd || a.gcd <= 0) return a.gcd;
    let mult = 1;
    for (const x of this.player.auras.values()) if (x.gcdMult) mult *= x.gcdMult;
    return Math.max(1, (a.gcd / this.castHaste()) * mult);
  }

  /** Spell crit chance: gear and talents plus spell crit auras (no suppression vs +3 in the sims). */
  spellCritChance(extra = 0): number {
    let auraCrit = 0;
    for (const a of this.player.auras.values()) if (a.spellCrit) auraCrit += a.spellCrit;
    return this.stats.spellCrit + this.mod.spellCrit + auraCrit + extra;
  }

  /** Attack power with buffs (Battle Shout). */
  attackPower(): number {
    let ap = this.stats.attackPower + this.bonusAp;
    for (const a of this.player.auras.values()) if (a.attackPower) ap += a.attackPower;
    return ap;
  }

  /** Product of a multiplier carried by the player's auras. */
  auraProduct(key: 'damageDone' | 'damageTaken' | 'threat'): number {
    let m = 1;
    for (const a of this.player.auras.values()) if (a[key] !== undefined) m *= a[key]!;
    return m;
  }

  /** Weapon damage with attack power, Classic style. */
  weaponDamage(hand: Hand, opts: { normalizedSpeed?: number } = {}): number {
    const w = hand === 'main' ? this.stats.mainHand : this.stats.offHand;
    if (!w) return 0;
    const base = w.min + this.random() * (w.max - w.min);
    const speed = opts.normalizedSpeed ?? w.speed;
    const total = base + (this.attackPower() / 14) * speed;
    return hand === 'off' ? total * this.rules.offHandMultiplier * this.mod.offHand : total;
  }

  armorReduction(u: Unit, ignoreFraction = 0): number {
    // Armor debuffs in one slot (Expose Armor, Sunder) do not stack: the strongest wins.
    // Different slots (Faerie Fire, Curse of Recklessness) add up.
    const slots = new Map<string, number>();
    for (const a of u.auras.values()) {
      if (!a.armor) continue;
      const slot = a.armorSlot ?? a.id;
      slots.set(slot, Math.max(slots.get(slot) ?? 0, a.armor));
    }
    let removed = 0;
    for (const v of slots.values()) removed += v;
    const armor = Math.max(0, u.armor - removed) * (1 - ignoreFraction);
    return Math.min(0.75, armor / (armor + 400 + 85 * 60));
  }

  /** Applies crit, glancing, armor and multipliers to physical damage. */
  physicalDamage(u: Unit, source: string, base: number, outcome: Outcome, opts: { ignoreArmor?: boolean } = {}): number {
    if (outcome === 'miss' || outcome === 'dodge' || outcome === 'parry' || outcome === 'resist') return 0;
    let d = base * this.mod.physicalDamage * this.auraProduct('damageDone') * (this.mod.damageFor[source] ?? 1);
    if (this.mod.vsBleeding && [...u.auras.values()].some((a) => a.bleed)) d *= 1 + this.mod.vsBleeding;
    if (outcome === 'crit') d *= this.mod.critMultiplierFor[source] ?? this.rules.critMultiplier;
    if (outcome === 'glance') {
      const r = this.rules;
      d *= r.glanceMin + this.random() * (r.glanceMax - r.glanceMin);
    }
    const ignore = 1 - (1 - this.mod.armorIgnore) * (1 - (this.mod.armorIgnoreFor[source] ?? 0));
    if (!opts.ignoreArmor) d *= 1 - this.armorReduction(u, ignore);
    return Math.max(1, Math.round(d));
  }

  // ----------------------------------------------------------------- damage
  enterCombat(): void {
    const p = this.player;
    if (!p.inCombat) {
      p.inCombat = true;
      this.breakStealth();
    }
    p.lastCombat = this.t;
  }

  deal(h: Hit): void {
    const u = h.target;
    // Magic damage taken debuffs (Curse of the Elements) apply to every non-physical hit.
    if (h.school !== 'physical' && h.amount > 0 && !h.final) h.amount = Math.round(h.amount * this.schoolTaken(u, h.school));
    // Damage keeps you in combat but does not break stealth by itself: your
    // own bleeds and poisons tick on after Vanish. Attacking breaks it.
    this.player.inCombat = true;
    this.player.lastCombat = this.t;
    if (this.meter.start === null) this.meter.start = this.t;
    this.meter.end = this.t;
    const row = this.meterRow(h.source);
    if (h.outcome === 'miss' || h.outcome === 'dodge' || h.outcome === 'parry' || h.outcome === 'resist') row.misses++;
    else {
      row.hits++;
      if (h.outcome === 'crit') row.crits++;
      if (h.outcome === 'glance') row.glances++;
    }
    row.total += h.amount;
    this.meter.total += h.amount;
    this.meter.threat += h.amount * this.mod.threat * this.auraProduct('threat') * (this.mod.threatFor[h.source] ?? 1) * this.schoolThreat(h.school);
    // When the attacking dummy parries you, its next swing comes 40 % sooner (at least 20 % left).
    if (h.outcome === 'parry' && this.enemySwing && this.enemyAttacks.on) {
      const speed = this.enemySwingTime(u);
      const left = this.nextEnemySwing - this.t;
      const next = Math.max(0.2 * speed, left - 0.4 * speed);
      if (next < left) {
        this.enemySwing.cancel();
        this.scheduleEnemySwing(this.t + next);
      }
    }
    if (!this.healthLocked && u.health > 0) {
      u.health = Math.max(0, u.health - h.amount);
      if (u.health === 0) {
        this.emit('death', u);
        if (this.target === u) this.stopAutoAttack();
        this.schedule(this.t + 3, () => { u.health = Math.max(1, Math.round(u.maxHealth * this.startHealth)); u.auras.clear(); this.applyRaid('debuff'); });
      }
    }
    this.emit('damage', h);
    for (const fn of this.afterDamage) fn(h);
    const connected = h.outcome !== 'miss' && h.outcome !== 'dodge' && h.outcome !== 'parry' && h.outcome !== 'resist';
    if (connected && !h.periodic && (h.weaponStrike || h.spell)) {
      for (const a of u.auras.values()) {
        if (a.manaOnHit && this.random() * 100 < a.manaOnHit.chance) {
          this.gainMana(a.manaOnHit.mana);
          this.count('manaOnHit', a.manaOnHit.mana);
        }
      }
    }
    if (h.weaponStrike && connected) {
      this.windfuryCheck(h);
      for (const fn of this.onHit) fn(h);
    }
  }

  /** Adds a stack to an aura (or creates it) and refreshes its duration (Shadow Weaving). */
  addStack(u: Unit | Player, data: Omit<Aura, 'start' | 'end'>, max: number): Aura {
    const stacks = Math.min(max, (u.auras.get(data.id)?.stacks ?? 0) + 1);
    return this.applyAura(u, { ...data, stacks });
  }

  /** Spell power for one school: general spell power plus school-only gear. */
  spellPowerFor(school: Hit['school']): number {
    return (this.stats.spellPower ?? 0) + (this.stats.spellPowerBySchool?.[school] ?? 0);
  }

  /** Flat bonus damage a target takes for a school, scaled by each spell's coefficient (Judgement of the Crusader). */
  bonusTaken(u: Unit, school: Hit['school']): number {
    let n = 0;
    for (const a of u.auras.values()) n += a.schoolBonusTaken?.[school] ?? 0;
    return n;
  }

  /** Puts the raid buffs and debuffs chosen in Settings on the player and the dummies. */
  applyRaid(side?: 'buff' | 'debuff'): void {
    for (const e of RAID_EFFECTS) if (this.raid.has(e.id) && (!side || e.side === side)) e.apply(this);
  }

  /** Mana into the second pool (cats) or the main one (casters). */
  gainMana(n: number): void {
    const p = this.player;
    if (p.maxMana) p.mana = Math.min(p.maxMana, p.mana + n);
    else if (this.spec.resource === 'mana') this.addResource(n);
  }

  /**
   * Windfury Totem: a landed main-hand attack (white or special, never the off hand) can give an extra main-hand attack with more AP.
   * A shaman's own Windfury Weapon replaces it: the same chance and cooldown, two extra attacks.
   */
  private windfuryCheck(h: Hit): void {
    if ((h.hand ?? 'main') !== 'main' || h.ranged || this.bonusAp) return;
    const weapon = this.mod.windfuryWeapon;
    if (!weapon && ![...this.player.auras.values()].some((a) => a.windfury)) return;
    if (this.t - this.lastWindfury < WINDFURY.icd || this.random() * 100 >= WINDFURY.chance) return;
    this.lastWindfury = this.t;
    this.count('windfury');
    this.emit('note', { text: 'Windfury!', kind: 'proc' });
    if (weapon) {
      // gs: two attacks on the special table (no glancing) that keep the swing timer.
      this.bonusAp = weapon.ap;
      for (let i = 0; i < 2; i++) {
        const outcome = this.rollSpecial(h.target, weapon.source);
        const amount = this.physicalDamage(h.target, weapon.source, this.weaponDamage('main'), outcome);
        this.deal({ target: h.target, source: weapon.source, outcome, school: 'physical', amount, white: false, hand: 'main', weaponStrike: true });
      }
      this.bonusAp = 0;
      return;
    }
    this.bonusAp = WINDFURY.ap;
    this.extraAttack(h.target);
    this.bonusAp = 0;
  }

  /** Threat multiplier the player's auras give one school (Righteous Fury). */
  schoolThreat(school: Hit['school']): number {
    let m = 1;
    for (const a of this.player.auras.values()) m *= a.schoolThreat?.[school] ?? 1;
    return m;
  }

  /** Damage multiplier a target takes for a school (Curse of the Elements). deal() applies it to magic hits. */
  schoolTaken(u: Unit, school: Hit['school']): number {
    let m = 1;
    for (const a of u.auras.values()) m *= a.schoolTaken?.[school] ?? 1;
    return m;
  }

  /** Flat threat from an ability (Sunder Armor, Revenge, Shield Slam…), with stance modifiers. */
  addThreat(n: number, opts: { ignoreStance?: boolean } = {}): void {
    if (this.meter.start === null) this.meter.start = this.t;
    this.meter.end = this.t;
    // Cower can lower threat, never below zero.
    this.meter.threat = Math.max(0, this.meter.threat + (opts.ignoreStance ? n : n * this.mod.threat * this.auraProduct('threat')));
  }

  tps(): number {
    const m = this.meter;
    if (m.start === null) return 0;
    return m.threat / Math.max(1, this.t - m.start);
  }

  // ------------------------------------------------------ attacking dummy
  private scheduleEnemySwing(at: number): void {
    this.nextEnemySwing = at;
    this.enemySwing = this.schedule(at, () => this.enemyHit());
  }

  /** The attacking dummy's swing time, slowed by Thunder Clap. */
  enemySwingTime(attacker: Unit): number {
    let slow = 0;
    for (const a of attacker.auras.values()) if (a.attackSlow) slow = Math.max(slow, a.attackSlow);
    return this.enemyAttacks.speed * (1 + slow);
  }

  /** The player's armor reduction against a level 63 attacker: A/(A + 400 + 85 x 63), verified on the beta. */
  playerArmorReduction(): number {
    let armor = this.stats.tank?.armor ?? 0;
    for (const a of this.player.auras.values()) if (a.playerArmor) armor *= a.playerArmor;
    return Math.min(0.75, armor / (armor + 5755));
  }

  /** Chances in % of each outcome when the level 63 dummy swings at you. */
  enemyTable(attacker: Unit) {
    const tank = this.stats.tank;
    const p = this.player;
    // Boss weapon skill 315 vs your defense: 0.04 % per point.
    const skill = (tank?.defense ?? 300) - 315;
    const dx = attacker.x - p.x, dz = attacker.z - p.z;
    const facing = Math.sin(p.facing) * dx + Math.cos(p.facing) * dz >= 0;
    const miss = Math.max(0, 5 + skill * 0.04);
    const dodge = Math.max(0, (tank?.dodge ?? 5) - 0.6);
    const parry = facing ? Math.max(0, (tank?.parry ?? 5) - 0.6) : 0;
    const block = facing && tank?.block ? Math.max(0, tank.block + this.mod.block - 0.6) : 0;
    const crit = Math.max(0, 5 - skill * 0.04);
    const crush = 15;
    return { miss, dodge, parry, block, crit, crush };
  }

  private enemyHit(): void {
    this.enemySwing = null;
    const u = this.target;
    if (!this.enemyAttacks.on || !u || u.health <= 0) return;
    const p = this.player;
    if (this.distance(u) > MELEE_RANGE + u.radius) {
      this.scheduleEnemySwing(this.t + 0.2);
      return;
    }
    // A single roll: miss, dodge, parry, block, crit, crushing blow, hit.
    const tbl = this.enemyTable(u);
    let x = this.random() * 100;
    let outcome: Outcome = 'hit';
    if ((x -= tbl.miss) < 0) outcome = 'miss';
    else if ((x -= tbl.dodge) < 0) outcome = 'dodge';
    else if ((x -= tbl.parry) < 0) outcome = 'parry';
    else if ((x -= tbl.block) < 0) outcome = 'block';
    else if ((x -= tbl.crit) < 0) outcome = 'crit';
    else if ((x -= tbl.crush) < 0) outcome = 'crush';
    // The sims' boss: 3000 x (U(1, 1.333) + AP / 2478); Demoralizing Shout lowers its AP.
    let ap = this.enemyAttacks.ap;
    let lower = 0;
    for (const a of u.auras.values()) if (a.apReduction) lower = Math.max(lower, a.apReduction);
    ap -= lower;
    const base = this.enemyAttacks.damage * (1 + this.random() / 3 + Math.max(0, ap) / 2478);
    let raw = 0, amount = 0, blocked = 0;
    if (outcome !== 'miss' && outcome !== 'dodge' && outcome !== 'parry') {
      raw = base * (outcome === 'crit' ? 2 : outcome === 'crush' ? 1.5 : 1);
      // Block value first, then armor, then stances and cooldowns.
      let d = raw;
      if (outcome === 'block') {
        blocked = Math.min(d, this.stats.tank?.blockValue ?? 0);
        d -= blocked;
      }
      amount = d * (1 - this.playerArmorReduction()) * this.mod.damageTaken * this.auraProduct('damageTaken');
      amount = Math.round(amount);
    }
    // Absorb shields soak what is left; a used-up shield goes away.
    let absorbed = 0;
    for (const a of [...p.auras.values()]) {
      if (!a.absorb || absorbed >= amount) continue;
      const n = Math.min(a.absorb, amount - absorbed);
      a.absorb -= n;
      absorbed += n;
      if (a.absorb <= 0) this.removeAura(p, a.id);
    }
    amount -= absorbed;
    p.inCombat = true;
    p.lastCombat = this.t;
    if (!this.playerHealthLocked && amount > 0) {
      p.health = Math.max(0, p.health - amount);
      if (p.health === 0) this.emit('playerDeath', undefined);
    }
    const hit: Incoming = { attacker: u, outcome, raw: Math.round(raw), amount, blocked: Math.round(blocked), absorbed: Math.round(absorbed) };
    this.count('incomingSwings');
    if (outcome === 'block') this.count('blocks');
    this.emit('incoming', hit);
    for (const fn of this.onIncoming) fn(hit);
    this.scheduleEnemySwing(this.t + this.enemySwingTime(u));
  }

  private meterRow(source: string): MeterRow {
    let row = this.meter.rows.get(source);
    if (!row) {
      const a = this.ability(source);
      row = {
        id: source,
        name: a?.name ?? SOURCE_NAMES[source] ?? source,
        icon: a?.icon ?? SOURCE_ICONS[source] ?? 'melee',
        total: 0, hits: 0, crits: 0, misses: 0, glances: 0,
      };
      this.meter.rows.set(source, row);
    }
    return row;
  }

  /** Name and icon for damage sources that are not abilities (poisons…). */
  registerSource(id: string, name: string, icon: string): void {
    SOURCE_NAMES[id] = name;
    SOURCE_ICONS[id] = icon;
  }

  dps(): number {
    const m = this.meter;
    if (m.start === null) return 0;
    return m.total / Math.max(1, m.end - m.start);
  }

  /** State of an action bar button, for drawing it. */
  buttonState(id: string) {
    const a = this.ability(id)!;
    const p = this.player;
    const cd = this.cooldownLeft(id);
    const gcd = a.gcd > 0 && p.gcdEnd > this.t
      ? { left: p.gcdEnd - this.t, total: p.gcdEnd - p.gcdStart } : { left: 0, total: 0 };
    const u = a.target === 'enemy' ? this.target : null;
    const cost = this.cost(a);
    return {
      ability: a,
      cost,
      cooldown: cd.left > gcd.left ? cd : gcd,
      noResource: cost > p.resource || (!!a.manaCost && !this.manaLocked && a.manaCost(this) > p.mana),
      outOfRange: a.target === 'enemy' && !!a.range && !!u && !this.inRange(u, a.range),
      usable: a.usable ? a.usable(this) : true,
      highlight: (a.highlight?.(this) ?? false) || this.queuedSwing === a.id,
    };
  }
}
