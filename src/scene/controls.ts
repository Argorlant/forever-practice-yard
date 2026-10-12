// WoW-style movement and camera.
// Keys: forward/back, turn, strafe, Space to jump. Left mouse drag orbits the
// camera; right mouse drag steers the character; both buttons run forward.
// Wheel zooms. On touch: a joystick to move and one-finger drag to steer.
import * as THREE from 'three';
import { YARD } from '../engine/combat';

export interface MoveBindings {
  forward: string; back: string;
  turnLeft: string; turnRight: string;
  strafeLeft: string; strafeRight: string;
}

export const DEFAULT_MOVE: MoveBindings = {
  forward: 'KeyW', back: 'KeyS', turnLeft: 'KeyA', turnRight: 'KeyD', strafeLeft: 'KeyQ', strafeRight: 'KeyE',
};

const RUN = 7 * YARD;        // m/s
const BACKPEDAL = 4.5 * YARD;
const TURN = Math.PI;        // rad/s with the keyboard
const JUMP_SPEED = 7.28;
const GRAVITY = 17.6;
const ARENA_RADIUS = 14.2;
const PLAYER_RADIUS = 0.35;

export interface MoveState {
  moving: boolean;
  backwards: boolean;
  speed: number;        // m/s along the ground
  airborne: boolean;
  bodyYaw: number;      // model turn for strafing
}

export class Controls {
  x = 0; z = -3.2; y = 0; facing = 0;
  private vy = 0;
  camYaw = 0;           // camera offset from the facing
  camPitch = 0.32;
  camDist = 6.5;
  private keys = new Set<string>();
  private lmb = false;
  private rmb = false;
  private dragged = 0;
  /** Both buttons were held during this press: running, not a click. */
  private chord = false;
  private touchSteer: { id: number; x: number; y: number } | null = null;
  private joy = { x: 0, y: 0 };
  bindings: MoveBindings = { ...DEFAULT_MOVE };
  /** Speed multiplier from auras (Sprint, stealth). */
  speedMultiplier: () => number = () => 1;
  obstacles: { x: number; z: number; r: number }[] = [];
  /** A click or tap that did not drag; button 0 left, 2 right. */
  onClick: (clientX: number, clientY: number, button: number) => void = () => {};
  /** Keys that the UI is using right now (e.g. while rebinding). */
  paused = false;

  constructor(private canvas: HTMLCanvasElement, private camera: THREE.PerspectiveCamera) {
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', (e) => this.up(e));
    canvas.addEventListener('pointercancel', (e) => this.up(e));
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.camDist = THREE.MathUtils.clamp(this.camDist * Math.exp(e.deltaY * 0.0012), 1.6, 22);
    }, { passive: false });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.lmb = this.rmb = false; });
  }

  /** Called by the key dispatcher for every keydown that is not an ability. */
  keyDown(code: string): void { if (!this.paused) this.keys.add(code); }
  isMovementKey(code: string): boolean {
    return Object.values(this.bindings).includes(code) || code === 'Space';
  }
  jump(): void {
    if (this.y <= 0 && this.vy <= 0) this.vy = JUMP_SPEED;
  }
  setJoystick(x: number, y: number): void { this.joy.x = x; this.joy.y = y; }

  private down(e: PointerEvent): void {
    this.canvas.setPointerCapture(e.pointerId);
    this.dragged = 0;
    if (e.pointerType === 'touch') {
      this.touchSteer = { id: e.pointerId, x: e.clientX, y: e.clientY };
      return;
    }
    this.chord = false;
    this.syncButtons(e);
  }

  /**
   * The mouse buttons held right now. A second button pressed while the first
   * is down fires no pointerdown, only a pointermove with new `buttons`, so
   * every mouse event reads the whole set.
   */
  private syncButtons(e: PointerEvent): void {
    const lmb = (e.buttons & 1) !== 0;
    const rmb = (e.buttons & 2) !== 0;
    if (rmb && !this.rmb) {
      // The character snaps to where the camera looks.
      this.facing += this.camYaw;
      this.camYaw = 0;
    }
    this.lmb = lmb;
    this.rmb = rmb;
    if (lmb && rmb) this.chord = true;
  }

  private move(e: PointerEvent): void {
    const k = 0.006;
    if (e.pointerType === 'touch') {
      if (!this.touchSteer || this.touchSteer.id !== e.pointerId) return;
      const dx = e.clientX - this.touchSteer.x, dy = e.clientY - this.touchSteer.y;
      this.touchSteer.x = e.clientX; this.touchSteer.y = e.clientY;
      this.dragged += Math.abs(dx) + Math.abs(dy);
      this.facing -= dx * k;
      this.camPitch = THREE.MathUtils.clamp(this.camPitch + dy * k, -0.3, 1.35);
      return;
    }
    this.syncButtons(e);
    if (!this.lmb && !this.rmb) return;
    this.dragged += Math.abs(e.movementX) + Math.abs(e.movementY);
    if (this.rmb) this.facing -= e.movementX * k;
    else this.camYaw -= e.movementX * k;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + e.movementY * k, -0.3, 1.35);
  }

  private up(e: PointerEvent): void {
    if (this.dragged < 6 && !this.chord) this.onClick(e.clientX, e.clientY, e.pointerType === 'touch' ? 0 : e.button);
    if (e.pointerType === 'touch') { this.touchSteer = null; return; }
    this.syncButtons(e);
  }

  update(dt: number): MoveState {
    const b = this.bindings;
    const on = (code: string) => this.keys.has(code);
    let fwd = 0, strafe = 0, turn = 0;
    if (on(b.forward) || (this.lmb && this.rmb)) fwd += 1;
    if (on(b.back)) fwd -= 1;
    if (on(b.strafeLeft)) strafe += 1;
    if (on(b.strafeRight)) strafe -= 1;
    // With the right button held, the turn keys strafe.
    if (on(b.turnLeft)) { if (this.rmb) strafe += 1; else turn += 1; }
    if (on(b.turnRight)) { if (this.rmb) strafe -= 1; else turn -= 1; }
    fwd += -this.joy.y;
    strafe += -this.joy.x;
    fwd = THREE.MathUtils.clamp(fwd, -1, 1);
    strafe = THREE.MathUtils.clamp(strafe, -1, 1);
    if (on('Space')) this.jump();

    this.facing += turn * TURN * dt;
    const moving = Math.hypot(fwd, strafe) > 0.05;
    // While moving, the camera swings back behind the character.
    if (moving && !this.lmb) this.camYaw *= Math.max(0, 1 - dt * 2.5);

    let speed = 0;
    let bodyYaw = 0;
    if (moving) {
      const backwards = fwd < -0.05;
      const base = backwards ? BACKPEDAL : RUN;
      speed = base * this.speedMultiplier() * Math.min(1, Math.hypot(fwd, strafe));
      // Movement direction in the character's frame (left = +X when facing +Z).
      const len = Math.hypot(fwd, strafe);
      const dirF = fwd / len, dirS = strafe / len;
      const sinF = Math.sin(this.facing), cosF = Math.cos(this.facing);
      // forward = (sin, cos); left = (cos, -sin)
      const vx = (sinF * dirF + cosF * dirS) * speed;
      const vz = (cosF * dirF - sinF * dirS) * speed;
      this.x += vx * dt;
      this.z += vz * dt;
      bodyYaw = backwards ? Math.atan2(-dirS, -dirF) : Math.atan2(dirS, dirF);
      bodyYaw = THREE.MathUtils.clamp(bodyYaw, -1.3, 1.3);
    }
    // Stay inside the fence and out of the dummies.
    const r = Math.hypot(this.x, this.z);
    if (r > ARENA_RADIUS) { this.x *= ARENA_RADIUS / r; this.z *= ARENA_RADIUS / r; }
    for (const o of this.obstacles) {
      const dx = this.x - o.x, dz = this.z - o.z;
      const d = Math.hypot(dx, dz), min = o.r + PLAYER_RADIUS;
      if (d < min && d > 1e-4) { this.x = o.x + (dx / d) * min; this.z = o.z + (dz / d) * min; }
    }
    // Jump.
    if (this.y > 0 || this.vy > 0) {
      this.vy -= GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; }
    }

    this.placeCamera(dt);
    return { moving, backwards: fwd < -0.05, speed, airborne: this.y > 0.02, bodyYaw };
  }

  private placeCamera(_dt: number): void {
    const yaw = this.facing + this.camYaw;
    const target = new THREE.Vector3(this.x, this.y + 1.55, this.z);
    const horiz = Math.cos(this.camPitch) * this.camDist;
    this.camera.position.set(
      target.x - Math.sin(yaw) * horiz,
      Math.max(0.3, target.y + Math.sin(this.camPitch) * this.camDist),
      target.z - Math.cos(yaw) * horiz,
    );
    this.camera.lookAt(target);
  }
}
