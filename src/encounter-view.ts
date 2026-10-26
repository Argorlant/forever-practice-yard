// The Onyxia encounter on screen (the rules are in src/encounters/onyxia.ts):
// her and the whelps (built in code, or models of the player's own), the
// lair, the simulated tank and healer, Flame Breath, the fireballs, the Deep
// Breath's fire with its warning on the floor, the lava, her yells and emotes.
import * as THREE from 'three';
import type { Combat } from './engine/combat';
import type { CharacterLook, Unit } from './engine/types';
import { CRACKS, FIRE_LINGERS, ROOM, type OnyxiaFight, type Point, type Review, type Whelp } from './encounters/onyxia';
import { Character } from './scene/character';
import type { Controls } from './scene/controls';
import type { ModelSource } from './scene/custom-model';
import { ModelDragon, ONYXIA_LOOK, ProceduralDragon, WHELP_LOOK, type DragonFigure, type DragonPose } from './scene/dragon';
import type { EnemyView } from './scene/enemy';
import { Lair } from './scene/lair';
import type { Vfx } from './scene/vfx';
import type { Floaters } from './ui/floaters';
import type { Hud } from './ui/hud';

export interface ViewDeps {
  scene: THREE.Scene;
  camera: THREE.Camera;
  vfx: Vfx;
  hud: Hud;
  floaters: Floaters;
  controls: Controls;
  combat: Combat;
  /** The yard's list of what it fights: targeting, clicks and floating text read it. */
  enemies: { dummy: EnemyView; unit: Unit }[];
  modelUrl: string;
  /** The tank's look, or null when you are the tank. */
  tankLook: CharacterLook | null;
  healerLook: CharacterLook;
  playerPos(): THREE.Vector3;
  /** The floor's height at (x, z): flat in the built-in lair, the place's own floors in yours. */
  groundAt(x: number, z: number): number;
  /** The fight is over: show the review. */
  onEnd(review: Review): void;
}

/** Her model is thirty yards long: drawn at this share of it to fit the room (ours). */
const ONYXIA_SCALE = 0.55;
/** The dragon built in code: Onyxia's length and a whelp's, in meters. */
const ONYXIA_LENGTH = 17;
const WHELP_LENGTH = 2.2;

const v3 = (p: Point, y = 0) => new THREE.Vector3(p.x, y, p.z);

export class OnyxiaView {
  readonly lair = new Lair();
  private boss: DragonFigure;
  private whelps = new Map<Whelp, DragonFigure>();
  private tank: Character | null = null;
  private healer = new Character();
  private stripe: THREE.Mesh | null = null;
  private deepBreath: { from: Point; to: Point; start: number; end: number; laid: number } | null = null;
  private breathFire = 0;
  private landings: { at: number; pos: () => THREE.Vector3 }[] = [];
  private shake = 0;
  private t = 0;
  private lastPose = '';
  private tankSwing = 0;
  private healerCast = 0;
  private sources: { onyxia: ModelSource | null; whelp: ModelSource | null } = { onyxia: null, whelp: null };

  constructor(private fight: OnyxiaFight, private d: ViewDeps) {
    d.scene.add(this.lair.root);
    this.boss = this.newBoss();
    this.healer.load(d.modelUrl, d.healerLook).then(() => {
      this.healer.setWeapons('mace', null);
      d.scene.add(this.healer.root);
    }).catch(() => { /* the fight goes on without the drawing */ });
    if (d.tankLook) {
      const tank = new Character();
      this.tank = tank;
      tank.load(d.modelUrl, d.tankLook).then(() => {
        tank.setWeapons('sword', null, { shield: true });
        d.scene.add(tank.root);
      }).catch(() => { /* idem */ });
    }
    this.listen();
    this.syncEnemies();
  }

  /** Models of the player's own for her and the whelps (null: the dragons built in code). */
  setSources(onyxia: ModelSource | null, whelp: ModelSource | null): void {
    this.sources = { onyxia, whelp };
    this.boss.dispose();
    this.boss = this.newBoss();
    this.lastPose = '';
    for (const [w, fig] of this.whelps) {
      fig.dispose();
      this.whelps.set(w, this.newWhelp());
    }
    this.syncEnemies();
  }

  private newBoss(): DragonFigure {
    const src = this.sources.onyxia;
    const fig = src ? new ModelDragon(src.figure(src.defaultTurns, ONYXIA_SCALE), 5) : new ProceduralDragon(ONYXIA_LENGTH, ONYXIA_LOOK);
    this.d.scene.add(fig.root);
    return fig;
  }

  private newWhelp(): DragonFigure {
    const src = this.sources.whelp;
    const fig = src ? new ModelDragon(src.figure(src.defaultTurns), 0.9, true) : new ProceduralDragon(WHELP_LENGTH, WHELP_LOOK);
    this.d.scene.add(fig.root);
    return fig;
  }

  /** The yard's list: her, then the whelps. */
  private syncEnemies(): void {
    const list = this.d.enemies;
    list.length = 0;
    list.push({ dummy: this.boss, unit: this.fight.boss });
    for (const [w, fig] of this.whelps) list.push({ dummy: fig, unit: w.unit });
  }

  private listen(): void {
    const { hud, vfx, floaters, controls } = this.d;
    const f = this.fight;
    f.on('yell', (text) => hud.bossSay(text, 'yell', 'Onyxia'));
    f.on('emote', (text) => hud.bossSay(text, 'emote'));
    f.on('breath', ({ windup }) => {
      if (windup) this.boss.act('breath');
      else this.breathFire = 1.1;
    });
    f.on('tailSweep', () => {
      this.boss.act('tail');
      const b = f.boss;
      vfx.wave(new THREE.Vector3(b.x - Math.sin(b.facing) * 9, 0.2, b.z - Math.cos(b.facing) * 9), 7, 0xb8a080, { flat: true, opacity: 0.5 });
    });
    f.on('fireball', ({ flight, atYou, at }) => {
      this.boss.act(f.flight ? 'spitFly' : 'spit');
      const target = atYou ? () => this.d.playerPos().add(new THREE.Vector3(0, 1, 0)) : () => v3(at, 0.3);
      vfx.missile({ style: 'fire', from: this.boss.mouth(), to: target, duration: flight, size: 0.8 });
      this.landings.push({ at: this.t + flight, pos: target });
    });
    f.on('deepBreath', (b) => {
      if (b.warn) this.warnStripe(b.from, b.to);
      else this.deepBreath = { from: b.from, to: b.to, start: this.t, end: this.t + b.duration, laid: 0 };
    });
    f.on('whelps', (list) => {
      for (const w of list) {
        const fig = this.newWhelp();
        fig.root.position.set(w.unit.x, 0, w.unit.z);
        this.whelps.set(w, fig);
        vfx.flash(new THREE.Vector3(w.unit.x, 1.2, w.unit.z), 0x9a5cff, 1.5, 0.4);
      }
      this.syncEnemies();
    });
    f.on('bite', (w) => this.whelps.get(w)?.act('bite'));
    f.on('roar', () => {
      this.boss.act('roar');
      this.shake = 0.9;
    });
    f.on('lava', (on) => {
      this.lair.setLava(on);
      if (!on) return;
      for (const [a, b] of CRACKS) {
        const n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.z - a.z) / 2.5));
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          vfx.ground(this.floor(a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k), 1.6, 'fire', 3);
        }
      }
    });
    f.on('knockback', (p) => controls.throw(p.x, p.z));
    f.on('fear', (s) => {
      controls.flee(s);
      floaters.note('Feared', this.d.playerPos().add(new THREE.Vector3(0, 2.2, 0)), 'ft-avoid');
    });
    f.on('heal', (n) => {
      this.healerCast = 1.2;
      this.healer.play('cast');
      const at = this.d.playerPos();
      floaters.note(`+${n}`, at.clone().add(new THREE.Vector3(0.4, 1.9, 0)), 'ft-nature');
      vfx.buff(at, [0x9af060, 0xe8ff9a, 0xffffff]);
    });
    f.on('end', (review) => this.d.onEnd(review));
  }

  /** The Deep Breath's warning: a dark red band along her line across the room (a practice aid; WoW has the emote only). */
  private warnStripe(from: Point, to: Point): void {
    this.clearStripe();
    const len = Math.hypot(to.x - from.x, to.z - from.z);
    const geo = new THREE.PlaneGeometry(14, len);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff3010, transparent: true, opacity: 0, depthWrite: false });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(to.x - from.x, to.z - from.z);
    m.position.set((from.x + to.x) / 2, 0.06, (from.z + to.z) / 2);
    this.d.scene.add(m);
    this.stripe = m;
  }

  private clearStripe(): void {
    if (!this.stripe) return;
    this.stripe.removeFromParent();
    this.stripe.geometry.dispose();
    (this.stripe.material as THREE.Material).dispose();
    this.stripe = null;
  }

  /** A point on the floor. */
  private floor(x: number, z: number): THREE.Vector3 { return new THREE.Vector3(x, this.d.groundAt(x, z), z); }

  /** Asleep in her bed again: no whelps, no fire, the lava down. */
  reset(): void {
    for (const fig of this.whelps.values()) fig.dispose();
    this.whelps.clear();
    this.clearStripe();
    this.deepBreath = null;
    this.breathFire = 0;
    this.landings = [];
    this.lair.setLava(false);
    this.lastPose = '';
    this.syncEnemies();
  }

  update(dt: number, t: number): void {
    this.t += dt;
    const f = this.fight;
    const b = f.boss;
    const { vfx } = this.d;

    // Her: where the fight has her, in the pose it says, on the floor under her (or above it, flying).
    this.boss.root.position.set(b.x, this.d.groundAt(b.x, b.z) + (b.altitude ?? 0), b.z);
    this.boss.root.rotation.y = b.facing;
    const moving = !!f.flight && f.t >= f.flight.start;
    const pose: DragonPose = f.pose === 'asleep' ? 'asleep' : f.pose === 'dead' ? 'dead'
      : f.pose === 'ground' ? 'ground' : f.pose === 'flying' && moving ? 'fly' : 'hover';
    const key = `${f.pose}:${pose}`;
    if (key !== this.lastPose) {
      if (f.pose === 'takeoff' && !this.lastPose.startsWith('takeoff')) this.boss.act('liftoff');
      if (f.pose === 'ground' && this.lastPose.startsWith('landing')) this.boss.act('land');
      this.boss.setPose(pose);
      this.lastPose = key;
    }
    this.boss.update(dt, t);

    // Whelps: flying at you, biting, falling dead; gone with the fight's list.
    const you = this.d.playerPos();
    let changed = false;
    for (const [w, fig] of this.whelps) {
      if (!f.whelps.includes(w)) {
        fig.dispose();
        this.whelps.delete(w);
        changed = true;
        continue;
      }
      const u = w.unit;
      const dead = u.health <= 0;
      const hover = fig instanceof ProceduralDragon ? 1.3 : 0;
      fig.root.position.set(u.x, this.d.groundAt(u.x, u.z) + (dead ? 0 : hover + Math.sin(t * 5 + u.id) * 0.12), u.z);
      fig.root.rotation.y = u.facing;
      fig.setPose(dead ? 'dead' : Math.hypot(you.x - u.x, you.z - u.z) > 1.8 ? 'fly' : 'hover');
      fig.update(dt, t);
    }
    if (changed) this.syncEnemies();

    // The tank holds her nose to the wall; the healer watches you.
    if (this.tank) {
      const tk = this.tank;
      tk.root.position.set(ROOM.tank.x, this.d.groundAt(ROOM.tank.x, ROOM.tank.z), ROOM.tank.z);
      tk.root.rotation.y = Math.atan2(b.x - ROOM.tank.x, b.z - ROOM.tank.z);
      const fighting = f.pose === 'ground';
      tk.setLocomotion(fighting ? 'ready' : 'idle', 0);
      if (fighting && (this.tankSwing -= dt) <= 0) { this.tankSwing = 2; tk.swing(); }
      tk.update(dt);
    }
    this.healer.root.position.set(ROOM.healer.x, this.d.groundAt(ROOM.healer.x, ROOM.healer.z), ROOM.healer.z);
    this.healer.root.rotation.y = Math.atan2(you.x - ROOM.healer.x, you.z - ROOM.healer.z);
    this.healerCast -= dt;
    this.healer.setLocomotion(this.healerCast > 0 ? 'cast' : f.phase ? 'ready' : 'idle', 0);
    this.healer.update(dt);

    // Flame Breath: a cone of fire from her mouth for a second, setting the floor ablaze in front of her.
    if (this.breathFire > 0) {
      const before = this.breathFire;
      this.breathFire -= dt;
      const mouth = this.boss.mouth();
      for (let i = 0; i < 6; i++) {
        const a = b.facing + (Math.random() - 0.5) * 1.4;
        const reach = 10 + Math.random() * 20;
        vfx.stream(mouth, new THREE.Vector3(b.x + Math.sin(a) * reach, 0.4, b.z + Math.cos(a) * reach), [0xffd27a, 0xff9a28, 0xff5a10], dt, 26);
      }
      // A patch of burning floor every tenth of a second, farther out as the blast goes on.
      if (Math.floor(before * 10) !== Math.floor(this.breathFire * 10)) {
        const a = b.facing + (Math.random() - 0.5) * 1.3;
        const reach = 8 + (1.1 - this.breathFire) * 20;
        vfx.ground(this.floor(b.x + Math.sin(a) * reach, b.z + Math.cos(a) * reach), 3 + reach * 0.12, 'fire', 1.2);
      }
    }

    // Fireballs landing.
    this.landings = this.landings.filter((l) => {
      if (this.t < l.at) return true;
      const p = l.pos();
      vfx.impact(p, 'fire', { crit: true });
      vfx.ground(this.floor(p.x, p.z), 2.2, 'fire', 1.6);
      return false;
    });

    // The Deep Breath: the warning band fades in; then the fire rolls along it and stays a while.
    if (this.stripe) {
      const mat = this.stripe.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(0.3, mat.opacity + dt * 0.25) * (0.8 + 0.2 * Math.sin(t * 10));
    }
    const db = this.deepBreath;
    if (db) {
      const k = Math.min(1, (this.t - db.start) / (db.end - db.start));
      const len = Math.hypot(db.to.x - db.from.x, db.to.z - db.from.z);
      const front = { x: db.from.x + (db.to.x - db.from.x) * k, z: db.from.z + (db.to.z - db.from.z) * k };
      while (db.laid < k * len) {
        const s = db.laid / len;
        vfx.ground(this.floor(db.from.x + (db.to.x - db.from.x) * s, db.from.z + (db.to.z - db.from.z) * s), 7, 'fire', FIRE_LINGERS);
        db.laid += 2.4;
      }
      if (k < 1) vfx.stream(this.boss.mouth(), v3(front, 0.3), [0xffd27a, 0xff7a18, 0xff4a08], dt, 30);
      if (this.t > db.end + FIRE_LINGERS) { this.deepBreath = null; this.clearStripe(); }
    }

    // Bellowing Roar shakes the room.
    if (this.shake > 0) {
      this.shake -= dt;
      const s = this.shake * 0.25;
      this.d.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * s, (Math.random() - 0.5) * s, (Math.random() - 0.5) * s));
    }
    this.lair.update(dt, t);
  }

  dispose(): void {
    this.reset();
    this.boss.dispose();
    this.lair.dispose();
    this.tank?.root.removeFromParent();
    this.healer.root.removeFromParent();
    this.d.enemies.length = 0;
  }
}
