// Onyxia, practiced alone: Classic's three phases with a simulated tank and
// healer, and the rest of the raid as steady damage on her. Mechanics follow
// warcraft.wiki.gg's "Onyxia (Classic)" page; where it gives no number (most
// timers, whelp health, the fear's length, her health), the numbers here are
// ours and the comments say so. Meters from the room's center, her bed; she
// faces +Z, where the tank holds her. No drawing here: the yard's view reads
// the state and listens to the events (src/encounter-view.ts).
import type { Combat } from '../engine/combat';
import type { Unit } from '../engine/types';

export interface Point { x: number; z: number }

export interface Whelp {
  unit: Unit;
  /** Its next bite. */
  swingAt: number;
  diedAt: number | null;
  /** Held by the whelp tank at this cave (ROOM.holders), or null: it got loose and comes at you. */
  holder: number | null;
}

export type Pose = 'asleep' | 'ground' | 'takeoff' | 'flying' | 'landing' | 'dead';

export interface Review {
  won: boolean;
  time: number;
  phase: number;
  /** Times each mechanic hit you. */
  flameBreath: number;
  tailSweep: number;
  deepBreath: number;
  fireball: number;
  lava: number;
  fears: number;
  whelpsSpawned: number;
  whelpsKilled: number;
  /** Whelps that got loose and came at you, and how many of those you killed. */
  whelpsAtYou: number;
  whelpsAtYouKilled: number;
  whelpBites: number;
}

interface Events {
  yell: string;
  emote: string;
  phase: number;
  /** Flame Breath: `windup` as she rears up, then the fire. */
  breath: { windup: boolean };
  tailSweep: void;
  /** A fireball leaves her mouth and lands in `flight` seconds: on you, or on someone else in the raid. */
  fireball: { flight: number; atYou: boolean; at: Point };
  /** Deep Breath: the warning, then her flight across with the fire behind her. */
  deepBreath: { from: Point; to: Point; warn: boolean; duration: number };
  whelps: Whelp[];
  bite: Whelp;
  roar: void;
  lava: boolean;
  /** Tail Sweep throws you sideways: where to, in meters. */
  knockback: Point;
  /** You run in terror for this long. */
  fear: number;
  heal: number;
  end: Review;
}

/** The room (ours, sized for the practice): walls, the whelps' caves, where the tank and healer stand, where you start. */
export const ROOM = {
  radius: 44,
  caves: [{ x: 41, z: 2 }, { x: -41, z: 2 }] as Point[],
  tank: { x: 0, z: 11 },
  /** Where the whelp tanks hold the whelps, at each cave's mouth (the raid's whelp groups). */
  holders: [{ x: 35, z: 2 }, { x: -35, z: 2 }] as Point[],
  healer: { x: -16, z: -24 },
  start: { x: -20, z: 1 },
  /** Where she hovers in phase 2: six spots around the room (the wiki's six positions). */
  hover: 22,
  altitude: 12,
};

/** The floor's cracks (ours, drawn by the view): lava spews from them after each fear. Segments in meters. */
export const CRACKS: [Point, Point][] = ([
  [{ x: 11, z: 14 }, { x: 19, z: 24 }], [{ x: -12, z: 15 }, { x: -21, z: 22 }],
  [{ x: 16, z: 2 }, { x: 28, z: 6 }], [{ x: -17, z: -3 }, { x: -29, z: -1 }],
  [{ x: 12, z: -14 }, { x: 22, z: -21 }], [{ x: -10, z: -15 }, { x: -17, z: -26 }],
  [{ x: 2, z: -18 }, { x: -3, z: -30 }], [{ x: 4, z: 18 }, { x: 0, z: 29 }],
  [{ x: 22, z: 12 }, { x: 30, z: 15 }], [{ x: -23, z: 10 }, { x: -30, z: 13 }],
  [{ x: 24, z: -9 }, { x: 31, z: -14 }], [{ x: -24, z: -12 }, { x: -29, z: -18 }],
] as [Point, Point][]).map(([a, b]) => [{ x: a.x * 1.3, z: a.z * 1.3 }, { x: b.x * 1.3, z: b.z * 1.3 }]);

// Ours: her health for one player and a raid's steady damage, so the fight takes about four minutes.
const HEALTH = 300_000;
const RAID_DPS: Record<number, number> = { 1: 1100, 2: 550, 3: 1100 };
/** Ours: the whelp groups' area damage on each whelp their tank holds (about fifteen seconds to kill one). */
const WHELP_AOE = 110;
// Wiki: phase two at 65 %, phase three at 40 %.
const PHASE_2 = 0.65;
const PHASE_3 = 0.40;

/** Seconds the Deep Breath's fire keeps burning where it has passed (ours). */
export const FIRE_LINGERS = 2.8;

const deg = Math.PI / 180;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** Is p within `half` radians of the direction `facing` from `from`, and within `range`? */
function inCone(from: Point, facing: number, p: Point, half: number, range: number): boolean {
  const dx = p.x - from.x, dz = p.z - from.z;
  const d = Math.hypot(dx, dz);
  if (d > range) return false;
  if (d < 0.01) return true;
  const cos = (dx * Math.sin(facing) + dz * Math.cos(facing)) / d;
  return cos >= Math.cos(half);
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const vx = b.x - a.x, vz = b.z - a.z;
  const len2 = vx * vx + vz * vz || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.z - a.z) * vz) / len2));
  return Math.hypot(p.x - (a.x + vx * t), p.z - (a.z + vz * t));
}

const spotOf = (i: number): Point => {
  const a = (((i % 6) + 6) % 6) * 60 * deg;
  return { x: Math.sin(a) * ROOM.hover, z: Math.cos(a) * ROOM.hover };
};

export class OnyxiaFight {
  readonly boss: Unit;
  whelps: Whelp[] = [];
  pose: Pose = 'asleep';
  phase = 0;
  /** Seconds since the pull. */
  t = 0;
  /** Phase two: the spot she hovers at (0 to 5) and her flight between spots. */
  spot = 3;
  flight: { from: Point; to: Point; start: number; end: number; alt: [number, number] } | null = null;
  /** The Deep Breath's fire: it rolls from her spot to the far wall. */
  fire: { from: Point; to: Point; start: number; end: number } | null = null;
  /** Lava spews from the cracks until then. */
  lavaUntil = -1;
  /** Flame Breath goes off then (she rears up before). */
  breathAt: number | null = null;
  review: Review = OnyxiaFight.emptyReview();
  over = false;

  private listeners = new Map<string, Set<(d: never) => void>>();
  private next: Record<string, number> = {};
  private fireballs = 0;
  private fireTick = 0;
  private lavaHit = false;
  private healAt = 0;
  private roars = 0;

  /** `tankBot`: a simulated tank holds her (you are not a tank). */
  constructor(private combat: Combat, readonly tankBot: boolean) {
    this.boss = {
      id: 100, name: 'Onyxia', level: 63, health: HEALTH, maxHealth: HEALTH, armor: 3731,
      auras: new Map(), x: 0, z: 0, facing: 0, radius: 5, stayDead: true,
    };
  }

  static emptyReview(): Review {
    return {
      won: false, time: 0, phase: 0, flameBreath: 0, tailSweep: 0, deepBreath: 0, fireball: 0, lava: 0, fears: 0,
      whelpsSpawned: 0, whelpsKilled: 0, whelpsAtYou: 0, whelpsAtYouKilled: 0, whelpBites: 0,
    };
  }

  on<K extends keyof Events>(type: K, fn: (d: Events[K]) => void): void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(fn as (d: never) => void);
  }
  private emit<K extends keyof Events>(type: K, data: Events[K]): void {
    this.listeners.get(type)?.forEach((fn) => (fn as (d: Events[K]) => void)(data));
  }

  /** Everything the player can target: her and the whelps still alive (or just dead). */
  get units(): Unit[] { return [this.boss, ...this.whelps.map((w) => w.unit)]; }

  /** Asleep in her bed again, full health, no whelps. */
  reset(): void {
    Object.assign(this.boss, { health: HEALTH, x: 0, z: 0, facing: 0, altitude: 0 });
    this.boss.auras.clear();
    this.whelps = [];
    this.pose = 'asleep';
    this.phase = 0;
    this.t = 0;
    this.spot = 3;
    this.flight = this.fire = null;
    this.lavaUntil = -1;
    this.breathAt = null;
    this.review = OnyxiaFight.emptyReview();
    this.over = false;
    this.next = {};
    this.fireballs = 0;
    this.roars = 0;
    this.combat.targets = this.units;
  }

  /** The pull: she wakes up and the tank takes her. */
  start(): void {
    if (this.phase) return;
    this.phase = 1;
    this.pose = 'ground';
    this.emit('yell', 'How fortuitous. Usually, I must leave my lair in order to feed.');
    this.emit('phase', 1);
    // Ours: the first breath and sweep come a little after the pull.
    this.next = { breath: 12, tail: 7 };
    this.healAt = 0;
  }

  private get you(): Point { return { x: this.combat.player.x, z: this.combat.player.z }; }

  private hurt(what: 'flameBreath' | 'tailSweep' | 'deepBreath' | 'fireball' | 'lava', amount: number, source: string): void {
    this.review[what]++;
    this.combat.hurtPlayer(Math.round(amount), source);
  }

  update(dt: number): void {
    if (!this.phase || this.over) return;
    this.t += dt;
    const c = this.combat;
    const b = this.boss;
    const you = this.you;
    if (c.player.health <= 0) { this.finish(false); return; }

    // The rest of the raid wears her down (ours).
    if (b.health > 0 && this.pose !== 'takeoff' && this.pose !== 'landing') c.damageUnit(b, RAID_DPS[this.phase] * dt);
    if (b.health <= 0) { this.pose = 'dead'; this.finish(true); return; }

    const pct = b.health / b.maxHealth;
    if (this.phase === 1 && pct <= PHASE_2) this.takeOff();
    else if (this.phase === 2 && pct <= PHASE_3 && this.pose === 'flying' && !this.flight) this.land();

    this.moveBoss(dt);
    if (this.pose === 'ground') this.groundPhase(you);
    if (this.pose === 'flying' && this.phase === 2) this.airPhase();
    this.burn(you, dt);
    this.lava(you);
    this.moveWhelps(dt, you);
    this.healer();
  }

  // ------------------------------------------------------------ phases
  /** Phase one and three: Flame Breath in front, Tail Sweep behind; in three, Bellowing Roar and the lava. */
  private groundPhase(you: Point): void {
    const b = this.boss;
    const t = this.t;
    if (this.breathAt !== null && t >= this.breathAt) {
      this.breathAt = null;
      this.emit('breath', { windup: false });
      // Wiki: "upwards of 4000" to everyone in front, far to the sides. The cone is ours.
      if (inCone(b, b.facing, you, 42 * deg, 32)) this.hurt('flameBreath', rand(3600, 4100), 'Flame Breath');
    }
    if (t >= this.next.breath && this.breathAt === null) {
      // Ours: every 15 seconds, after rearing up for 1.5.
      this.breathAt = t + 1.5;
      this.next.breath = t + 15;
      this.emit('breath', { windup: true });
    }
    if (t >= this.next.tail) {
      this.next.tail = t + rand(10, 13);
      this.emit('tailSweep', undefined);
      // Wiki: "very little damage (about 300) but sends the target flying sideways." Reach behind her is ours.
      if (inCone(b, b.facing + Math.PI, you, 50 * deg, 15)) {
        this.hurt('tailSweep', rand(270, 330), 'Tail Sweep');
        const side = Math.sign((you.x - b.x) * Math.cos(b.facing) - (you.z - b.z) * Math.sin(b.facing)) || 1;
        // Sideways (her right or left, whichever you were on) and a little back: 11 meters.
        const sx = Math.cos(b.facing) * side, sz = -Math.sin(b.facing) * side;
        const bx = -Math.sin(b.facing) * 0.4, bz = -Math.cos(b.facing) * 0.4;
        this.emit('knockback', { x: (sx + bx) * 11, z: (sz + bz) * 11 });
      }
    }
    if (this.phase === 3) {
      if (this.next.roar === undefined) this.next.roar = t + 4;
      if (t >= this.next.roar) this.roar();
      // Wiki: "small groups" of "five or so" whelps, usually early in phase three.
      if (this.next.p3whelps !== undefined && t >= this.next.p3whelps) {
        delete this.next.p3whelps;
        this.spawnWhelps(5, 2);
      }
    }
  }

  /** Bellowing Roar: everyone flees; when the fear ends, lava spews from the cracks. */
  private roar(): void {
    // Wiki: "Sometimes there are 30 seconds between fears and sometimes as little as 10."
    this.next.roar = this.t + rand(10, 30);
    this.roars++;
    this.emit('roar', undefined);
    const c = this.combat;
    const immune = ['berserkerRage', 'fearWard', 'willOfTheForsaken'].some((id) => c.player.auras.has(id));
    // Ours: three seconds of fear (the wiki says "a few seconds").
    const fear = 3;
    if (!immune) {
      this.review.fears++;
      c.fearedUntil = c.t + fear;
      this.emit('fear', fear);
    }
    // Wiki: lava "immediately after the fear effect ends", for "a few seconds" (ours: three).
    this.next.lava = this.t + fear;
  }

  private lava(you: Point): void {
    if (this.next.lava !== undefined && this.t >= this.next.lava) {
      delete this.next.lava;
      this.lavaUntil = this.t + 3;
      this.lavaHit = false;
      this.emit('lava', true);
    }
    if (this.lavaUntil < 0) return;
    if (this.t >= this.lavaUntil) {
      this.lavaUntil = -1;
      this.emit('lava', false);
      return;
    }
    // Wiki: "about 1,500 points of fire damage (unresisted)" to anyone on a crack; once per eruption.
    if (!this.lavaHit && CRACKS.some(([a, b]) => distToSegment(you, a, b) < 1.8)) {
      this.lavaHit = true;
      this.hurt('lava', rand(1400, 1600), 'Lava');
    }
  }

  /** At 65 %: she walks to the south end and takes off (wiki); whelps pour out of both caves. */
  private takeOff(): void {
    this.phase = 2;
    this.emit('yell', "This meaningless exertion bores me. I'll incinerate you all from above!");
    this.emit('phase', 2);
    this.pose = 'takeoff';
    this.breathAt = null;
    this.spot = 3;
    this.flight = { from: { x: this.boss.x, z: this.boss.z }, to: spotOf(3), start: this.t, end: this.t + 4, alt: [0, ROOM.altitude] };
    this.combat.enemyAttacks.on = false;
    // Wiki: "a large spawn" from each pit at the phase start, then "periodically" small ones (counts and timer ours).
    // The whelp tanks at the caves take most of them; a few get loose and come at you.
    this.spawnWhelps(8, 3);
    this.next.whelps = this.t + 25;
    this.next.fireball = this.t + 5.5;
    this.fireballs = 0;
  }

  /** Phase two: fireballs at you, five from each spot; then she moves on, and across the room she breathes. */
  private airPhase(): void {
    const t = this.t;
    if (t >= this.next.whelps) {
      this.next.whelps = t + 25;
      this.spawnWhelps(4, 1);
    }
    if (this.flight) return;
    if (t >= this.next.fireball && this.fireballs < 5) {
      this.fireballs++;
      // Ours: one every 3.5 seconds, a second in the air.
      this.next.fireball = t + 3.5;
      // Wiki: on "random players"; alone with the raid around you, two in five come at you (ours).
      const atYou = Math.random() < 0.4;
      const a = rand(0, Math.PI * 2), r = rand(6, 26);
      this.emit('fireball', { flight: 1, atYou, at: atYou ? this.you : { x: Math.sin(a) * r, z: Math.cos(a) * r } });
      if (atYou) this.next.fireballLands = t + 1;
    }
    if (this.next.fireballLands !== undefined && t >= this.next.fireballLands) {
      delete this.next.fireballLands;
      // Wiki: "up to 3000" to the target.
      this.hurt('fireball', rand(2200, 2900), 'Fireball');
    }
    if (this.fireballs >= 5 && t >= this.next.fireball) this.moveOn();
  }

  /** To the next spot, either way round, or across the room: a Deep Breath. */
  private moveOn(): void {
    const r = Math.random();
    const from = spotOf(this.spot);
    if (r < 1 / 3) {
      // Wiki: the emote, then a few seconds later she flies across and the fire rolls to the opposite wall.
      const to = spotOf(this.spot + 3);
      const wall = { x: (to.x / ROOM.hover) * ROOM.radius, z: (to.z / ROOM.hover) * ROOM.radius };
      this.emit('emote', 'Onyxia takes in a deep breath...');
      this.emit('deepBreath', { from, to: wall, warn: true, duration: 3 });
      const go = this.t + 3;
      this.spot += 3;
      this.flight = { from, to, start: go, end: go + 3.5, alt: [ROOM.altitude, ROOM.altitude] };
      this.fire = { from, to: wall, start: go, end: go + 3.5 * (ROOM.radius + ROOM.hover) / (2 * ROOM.hover) };
      this.next.breathGo = go;
    } else {
      this.spot += r < 2 / 3 ? 1 : -1;
      this.flight = { from, to: spotOf(this.spot), start: this.t, end: this.t + 3, alt: [ROOM.altitude, ROOM.altitude] };
    }
    this.fireballs = 0;
    this.next.fireball = (this.flight?.end ?? this.t) + 2;
  }

  /** At 40 %: she lands in the middle of the room; the tank takes her back. */
  private land(): void {
    this.phase = 3;
    this.emit('yell', "It seems you'll need another lesson, mortals!");
    this.emit('phase', 3);
    this.pose = 'landing';
    this.flight = { from: { x: this.boss.x, z: this.boss.z }, to: { x: 0, z: 0 }, start: this.t, end: this.t + 4, alt: [ROOM.altitude, 0] };
    this.next.breath = this.t + 14;
    this.next.tail = this.t + 9;
    this.next.p3whelps = this.t + 12;
    delete this.next.roar;
  }

  private moveBoss(dt: number): void {
    const b = this.boss;
    const f = this.flight;
    if (this.next.breathGo !== undefined && this.t >= this.next.breathGo) {
      delete this.next.breathGo;
      this.emit('deepBreath', { from: this.fire!.from, to: this.fire!.to, warn: false, duration: this.fire!.end - this.fire!.start });
    }
    if (f && this.t >= f.start) {
      const k = Math.min(1, (this.t - f.start) / (f.end - f.start));
      const s = k * k * (3 - 2 * k);
      b.x = f.from.x + (f.to.x - f.from.x) * s;
      b.z = f.from.z + (f.to.z - f.from.z) * s;
      b.altitude = f.alt[0] + (f.alt[1] - f.alt[0]) * s;
      const dx = f.to.x - f.from.x, dz = f.to.z - f.from.z;
      if (Math.hypot(dx, dz) > 0.5) b.facing = Math.atan2(dx, dz);
      if (k >= 1) {
        this.flight = null;
        if (this.pose === 'takeoff') this.pose = 'flying';
        if (this.pose === 'landing') {
          this.pose = 'ground';
          b.altitude = 0;
          if (!this.tankBot) this.combat.enemyAttacks.on = true;
        }
      }
    }
    if (this.pose === 'flying' && !f) {
      // Hovering: she faces the middle of the room.
      b.facing = Math.atan2(-b.x, -b.z);
    }
    if (this.pose === 'ground') {
      // The tank holds her facing the north wall; with you tanking, she turns to you.
      const want = this.tankBot ? Math.atan2(ROOM.tank.x - b.x, ROOM.tank.z - b.z)
        : Math.atan2(this.combat.player.x - b.x, this.combat.player.z - b.z);
      let d = want - b.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      b.facing += Math.sign(d) * Math.min(Math.abs(d), 1.4 * dt);
    }
  }

  /** The Deep Breath's fire: standing in it hurts every half second, five or six times on the way through (wiki). */
  private burn(you: Point, dt: number): void {
    const f = this.fire;
    if (!f || this.t < f.start) return;
    // The front rolls to the wall; each stretch burns a while after it passes (ours: long enough for the wiki's five or six hits).
    const k = (this.t - f.start) / (f.end - f.start);
    if (k > 1 + FIRE_LINGERS / (f.end - f.start)) { this.fire = null; return; }
    const len = Math.hypot(f.to.x - f.from.x, f.to.z - f.from.z);
    const ux = (f.to.x - f.from.x) / len, uz = (f.to.z - f.from.z) / len;
    const along = (you.x - f.from.x) * ux + (you.z - f.from.z) * uz;
    const across = Math.abs((you.x - f.from.x) * uz - (you.z - f.from.z) * ux);
    const front = Math.min(1, k) * len;
    const tail = front - (FIRE_LINGERS / (f.end - f.start)) * len;
    this.fireTick -= dt;
    // Ours: the fire is 14 meters wide.
    if (across < 7 && along >= Math.max(0, tail) && along <= front && this.fireTick <= 0) {
      this.fireTick = 0.5;
      this.hurt('deepBreath', rand(1250, 1450), 'Deep Breath');
    }
  }

  // ------------------------------------------------------------ whelps
  /** `n` whelps from both caves; `loose` of them come at you, the rest go to their cave's whelp tank. */
  private spawnWhelps(n: number, loose: number): void {
    const list: Whelp[] = [];
    // Which of them get loose: any, at random.
    const order = Array.from({ length: n }, (_, i) => i).sort(() => Math.random() - 0.5);
    const atYou = new Set(order.slice(0, loose));
    for (let i = 0; i < n; i++) {
      const side = i % 2;
      const cave = ROOM.caves[side];
      const unit: Unit = {
        id: 200 + this.review.whelpsSpawned, name: 'Onyxian Whelp', level: 60,
        // Ours: the wiki gives no whelp numbers.
        health: 1600, maxHealth: 1600, armor: 1200, auras: new Map(),
        x: cave.x + rand(-2, 2), z: cave.z + rand(-3, 3), facing: 0, radius: 0.7, stayDead: true,
      };
      const w: Whelp = { unit, swingAt: this.t + rand(0.5, 1.5), diedAt: null, holder: atYou.has(i) ? null : side };
      this.whelps.push(w);
      list.push(w);
      this.review.whelpsSpawned++;
      if (w.holder === null) this.review.whelpsAtYou++;
    }
    this.combat.targets = this.units;
    this.emit('whelps', list);
  }

  /**
   * Whelps fly at whoever they are after: the loose ones at you, biting; the others at their whelp tank,
   * whose group's area damage wears them down. The dead ones fall and go.
   */
  private moveWhelps(dt: number, you: Point): void {
    let changed = false;
    for (const w of this.whelps) {
      const u = w.unit;
      if (u.health <= 0) {
        if (w.diedAt === null) {
          w.diedAt = this.t;
          this.review.whelpsKilled++;
          if (w.holder === null) this.review.whelpsAtYouKilled++;
        }
        continue;
      }
      // Around their tank they spread out a little, each at its own spot.
      const goal = w.holder === null ? you : {
        x: ROOM.holders[w.holder].x + Math.sin(u.id * 2.4) * 1.6,
        z: ROOM.holders[w.holder].z + Math.cos(u.id * 2.4) * 1.6,
      };
      const dx = goal.x - u.x, dz = goal.z - u.z;
      const d = Math.hypot(dx, dz);
      const reach = w.holder === null ? 1.4 : 0.3;
      if (d > reach) {
        // Ours: they fly at a run (6 m/s).
        const step = Math.min(d - reach, 6 * dt);
        u.x += (dx / d) * step;
        u.z += (dz / d) * step;
        u.facing = Math.atan2(dx, dz);
      } else if (w.holder !== null) {
        const h = ROOM.holders[w.holder];
        u.facing = Math.atan2(h.x - u.x, h.z - u.z);
        this.combat.damageUnit(u, WHELP_AOE * dt);
        if (this.t >= w.swingAt) { w.swingAt = this.t + 1.5; this.emit('bite', w); }
      } else if (this.t >= w.swingAt) {
        w.swingAt = this.t + 1.5;
        this.review.whelpBites++;
        this.combat.hurtPlayer(Math.round(rand(140, 180)), 'Onyxian Whelp');
        this.emit('bite', w);
      }
    }
    // The dead go after three seconds.
    const before = this.whelps.length;
    this.whelps = this.whelps.filter((w) => w.diedAt === null || this.t - w.diedAt < 3);
    if (this.whelps.length !== before) changed = true;
    if (changed) {
      this.combat.targets = this.units;
      if (this.combat.target && !this.combat.targets.includes(this.combat.target)) this.combat.target = null;
    }
  }

  /** The healer: a heal when you are missing enough health (ours: a quarter of your health every 1.5 seconds). */
  private healer(): void {
    const p = this.combat.player;
    if (this.t < this.healAt || p.health <= 0) return;
    const missing = p.maxHealth - p.health;
    if (missing < 250) return;
    this.healAt = this.t + 1.5;
    const n = Math.round(Math.min(missing, p.maxHealth * 0.25 + rand(0, 120)));
    this.combat.healPlayer(n);
    this.emit('heal', n);
  }

  private finish(won: boolean): void {
    if (this.over) return;
    this.over = true;
    this.review.won = won;
    this.review.time = this.t;
    this.review.phase = this.phase;
    this.combat.enemyAttacks.on = false;
    this.combat.fearedUntil = -Infinity;
    // A win: the raid finishes the whelps still flying.
    if (won) {
      for (const w of this.whelps) {
        if (w.unit.health <= 0) continue;
        w.unit.health = 0;
        w.diedAt = this.t;
        this.review.whelpsKilled++;
      }
    }
    if (!won) this.emit('yell', 'Learn your place, mortal!');
    this.emit('end', this.review);
  }
}
