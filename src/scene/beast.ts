// Druid forms: a cat and a bear built in code (no third-party models), with
// procedural animation: a trot whose stride follows the ground speed, a low
// prowl, paw swipes and bites, a jump pose, breathing and a swaying tail.
// Same interface as the humanoid Character, so the scene can swap them.
import * as THREE from 'three';
import type { Locomotion } from './character';

export interface BeastLook {
  kind: 'cat' | 'bear';
  fur: number;
  belly: number;
  eyes: number;
}

interface Leg { hip: THREE.Group; knee: THREE.Group; front: boolean; side: 1 | -1; phase: number }
interface Shot { name: string; t: number; length: number }

/** Body proportions per form, in meters. */
const SHAPES = {
  cat: { length: 0.98, radius: 0.25, height: 0.74, upper: 0.35, lower: 0.33, legRadius: 0.075, head: 0.2, tail: 8, tailLength: 0.13, stride: 1.45 },
  bear: { length: 0.82, radius: 0.32, height: 0.78, upper: 0.32, lower: 0.3, legRadius: 0.1, head: 0.21, tail: 2, tailLength: 0.07, stride: 1.05 },
};

export class Beast {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private tail: THREE.Group[] = [];
  private legs: Leg[] = [];
  private shape: (typeof SHAPES)['cat'];
  private gait = 0;
  private state: Locomotion = 'idle';
  private speed = 0;
  private crouch = 0;
  private air = 0;
  private shot: Shot | null = null;
  private swingToggle = false;
  private bodyYaw = 0;
  private bodyYawTarget = 0;
  private time = 0;

  constructor(private look: BeastLook) {
    this.shape = SHAPES[look.kind];
    this.build();
    this.root.add(this.body);
  }

  private build(): void {
    const s = this.shape;
    const fur = new THREE.MeshStandardMaterial({ color: this.look.fur, roughness: 0.85, flatShading: true });
    const belly = new THREE.MeshStandardMaterial({ color: this.look.belly, roughness: 0.9, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 });
    const glow = new THREE.MeshBasicMaterial({ color: this.look.eyes });
    const cast = <T extends THREE.Object3D>(o: T) => { o.traverse((m) => { if ((m as THREE.Mesh).isMesh) m.castShadow = true; }); return o; };
    const bear = this.look.kind === 'bear';

    this.body.add(this.torso);
    this.torso.position.y = s.height;
    // Trunk: a capsule along +Z (forward), wider at the shoulders.
    const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(s.radius, s.length, 4, 10), fur);
    trunk.rotation.x = Math.PI / 2;
    trunk.scale.set(bear ? 1.05 : 0.95, 1, bear ? 1 : 0.9);
    this.torso.add(cast(trunk));
    const chest = new THREE.Mesh(new THREE.SphereGeometry(s.radius * 1.12, 10, 8), fur);
    chest.position.set(0, bear ? 0.08 : 0.03, s.length * 0.38);
    this.torso.add(cast(chest));
    const under = new THREE.Mesh(new THREE.CapsuleGeometry(s.radius * 0.7, s.length * 0.7, 3, 8), belly);
    under.rotation.x = Math.PI / 2;
    under.position.y = -s.radius * 0.45;
    this.torso.add(cast(under));
    if (bear) {
      // A shoulder hump.
      const hump = new THREE.Mesh(new THREE.SphereGeometry(s.radius * 0.8, 9, 7), fur);
      hump.position.set(0, s.radius * 0.75, s.length * 0.25);
      this.torso.add(cast(hump));
    } else {
      // Darker stripes along the back.
      for (let i = 0; i < 4; i++) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(s.radius * 1.9, 0.02, 0.05), dark);
        stripe.position.set(0, s.radius * 0.93, -s.length * 0.3 + i * 0.16);
        this.torso.add(stripe);
      }
    }

    // Head and neck.
    this.head.position.set(0, bear ? 0.06 : 0.14, s.length / 2 + s.radius * (bear ? 0.95 : 0.85));
    this.torso.add(this.head);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(s.head, 10, 8), fur);
    skull.scale.set(bear ? 1.05 : 1, 0.9, 1.05);
    this.head.add(cast(skull));
    const snout = new THREE.Mesh(new THREE.BoxGeometry(s.head * (bear ? 0.95 : 0.8), s.head * 0.6, s.head * (bear ? 1.0 : 0.75)), belly);
    snout.position.set(0, -s.head * 0.25, s.head * 0.85);
    this.head.add(cast(snout));
    const nose = new THREE.Mesh(new THREE.SphereGeometry(s.head * 0.18, 6, 5), dark);
    nose.position.set(0, -s.head * 0.08, s.head * 1.28);
    this.head.add(nose);
    for (const side of [-1, 1]) {
      const ear = bear
        ? new THREE.Mesh(new THREE.SphereGeometry(s.head * 0.28, 7, 5), fur)
        : new THREE.Mesh(new THREE.ConeGeometry(s.head * 0.32, s.head * 0.75, 4), fur);
      ear.position.set(side * s.head * 0.55, s.head * 0.8, -s.head * 0.1);
      ear.rotation.z = -side * 0.25;
      this.head.add(cast(ear));
      const eye = new THREE.Mesh(new THREE.SphereGeometry(s.head * 0.11, 6, 4), glow);
      eye.position.set(side * s.head * 0.42, s.head * 0.18, s.head * 0.82);
      this.head.add(eye);
    }

    // Legs: hip (pivot) -> upper -> knee (pivot) -> lower -> paw.
    const phases = { fl: 0, hr: 0, fr: 0.5, hl: 0.5 };
    for (const [front, side, key] of [[true, 1, 'fl'], [true, -1, 'fr'], [false, 1, 'hl'], [false, -1, 'hr']] as const) {
      const hip = new THREE.Group();
      hip.position.set(side * s.radius * 0.75, -s.radius * 0.35, (front ? 1 : -1) * s.length * 0.42);
      this.torso.add(hip);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(s.legRadius * (front ? 1.05 : 1.25), s.upper - s.legRadius * 2, 3, 7), fur);
      upper.position.y = -s.upper / 2;
      hip.add(cast(upper));
      const knee = new THREE.Group();
      knee.position.y = -s.upper;
      hip.add(knee);
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(s.legRadius * 0.8, s.lower - s.legRadius * 2, 3, 7), fur);
      lower.position.y = -s.lower / 2;
      knee.add(cast(lower));
      const paw = new THREE.Mesh(new THREE.SphereGeometry(s.legRadius * 1.25, 7, 5), belly);
      paw.scale.set(1, 0.6, 1.4);
      paw.position.set(0, -s.lower, s.legRadius * 0.5);
      knee.add(cast(paw));
      if (front && !bear) {
        // Claws on the front paws.
        for (const dx of [-0.02, 0, 0.02]) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 4), new THREE.MeshStandardMaterial({ color: 0xe8e2d0 }));
          claw.rotation.x = Math.PI / 2;
          claw.position.set(dx, -s.lower - 0.01, s.legRadius * 1.6);
          knee.add(claw);
        }
      }
      this.legs.push({ hip, knee, front, side, phase: phases[key] });
    }

    // Tail: a chain of segments.
    let parent: THREE.Object3D = this.torso;
    let z = -s.length / 2 - s.radius * 0.6;
    for (let i = 0; i < s.tail; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, i === 0 ? s.radius * 0.35 : 0, i === 0 ? z : -s.tailLength);
      const r = (bear ? 0.06 : 0.045) * (1 - i / (s.tail + 2));
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, s.tailLength, 2, 6), i === s.tail - 1 && !bear ? dark : fur);
      m.rotation.x = Math.PI / 2;
      m.position.z = -s.tailLength / 2;
      seg.add(cast(m));
      parent.add(seg);
      this.tail.push(seg);
      parent = seg;
      z = 0;
    }
  }

  // ------------------------------------------------------------- animation
  setLocomotion(state: Locomotion, groundSpeed = 0): void {
    this.state = state;
    this.speed = groundSpeed;
  }

  setBodyYaw(yaw: number): void { this.bodyYawTarget = yaw; }

  /** Abilities: paw swipes, bites, a pounce, a roar. */
  play(name: string): void {
    const lengths: Record<string, number> = { bite: 0.35, swipeL: 0.32, swipeR: 0.32, shred: 0.4, pounce: 0.5, roar: 0.7, maul: 0.55, hit: 0.3 };
    const mapped = ({
      strike1: 'swipeR', strike2: 'swipeL', slash: 'shred', stab: 'bite', hook: 'swipeL', jab: 'bite', cross: 'maul',
      block: 'roar', cast: 'roar', drink: 'roar', throw: 'pounce', hitReact: 'hit',
    } as Record<string, string>)[name] ?? name;
    this.shot = { name: mapped, t: 0, length: lengths[mapped] ?? 0.35 };
  }

  swing(): void {
    this.swingToggle = !this.swingToggle;
    this.play(this.look.kind === 'bear' ? (this.swingToggle ? 'swipeR' : 'swipeL') : (this.swingToggle ? 'swipeR' : 'bite'));
  }

  update(dt: number): void {
    const s = this.shape;
    this.time += dt;
    const moving = ['walk', 'run', 'back', 'sprint', 'sneakMove'].includes(this.state);
    const sneaking = this.state === 'sneak' || this.state === 'sneakMove';
    this.crouch += ((sneaking ? 1 : 0) - this.crouch) * Math.min(1, dt * 8);
    this.air += ((this.state === 'air' ? 1 : 0) - this.air) * Math.min(1, dt * 10);
    // The stride covers ground at the real speed.
    if (moving) this.gait += (Math.abs(this.speed) / s.stride) * dt * Math.sign(this.speed || 1);
    const amp = moving ? Math.min(1, Math.abs(this.speed) / 4) : 0;

    // Torso: breathing, bob while running, lower while prowling.
    const breathe = Math.sin(this.time * 2.2) * 0.012;
    const bob = Math.abs(Math.sin(this.gait * Math.PI * 2)) * 0.04 * amp;
    this.torso.position.y = s.height - this.crouch * 0.16 + bob + breathe + this.air * 0.05;
    this.torso.rotation.x = Math.sin(this.gait * Math.PI * 2) * 0.05 * amp - this.air * 0.12;

    for (const leg of this.legs) {
      const ph = (this.gait + leg.phase) * Math.PI * 2;
      let hip = Math.sin(ph) * 0.7 * amp * (leg.front ? 1 : -1);
      let knee = Math.max(0, Math.cos(ph)) * 0.9 * amp * (leg.front ? -1 : 1);
      // Prowl: bent legs; jump: tucked legs.
      hip += this.crouch * (leg.front ? -0.35 : 0.45) + this.air * (leg.front ? -0.7 : 0.8);
      knee += this.crouch * (leg.front ? 0.6 : -0.7) + this.air * (leg.front ? 1.2 : -1.3);
      leg.hip.rotation.x = hip;
      leg.knee.rotation.x = knee;
    }

    // Head: counter-bob and a slow look around while idle.
    this.head.rotation.x = -Math.sin(this.gait * Math.PI * 2) * 0.06 * amp + this.crouch * 0.15;
    this.head.rotation.y = moving ? 0 : Math.sin(this.time * 0.6) * 0.15;
    this.head.position.z = s.length / 2 + s.radius * (this.look.kind === 'bear' ? 0.95 : 0.85);

    // Tail sway.
    this.tail.forEach((seg, i) => {
      seg.rotation.y = Math.sin(this.time * (moving ? 6 : 1.6) - i * 0.5) * (moving ? 0.12 : 0.16);
      seg.rotation.x = i === 0 ? 0.5 - this.crouch * 0.5 + amp * 0.2 : -0.12;
    });

    // One-shot actions.
    if (this.shot) {
      const sh = this.shot;
      sh.t += dt;
      const k = Math.min(1, sh.t / sh.length);
      const pulse = Math.sin(k * Math.PI);
      const fl = this.legs[0], fr = this.legs[1];
      switch (sh.name) {
        case 'swipeR': fr.hip.rotation.x = -1.6 * pulse; fr.hip.rotation.z = 0.5 * pulse; fr.knee.rotation.x = 0.4 * pulse; break;
        case 'swipeL': fl.hip.rotation.x = -1.6 * pulse; fl.hip.rotation.z = -0.5 * pulse; fl.knee.rotation.x = 0.4 * pulse; break;
        case 'shred':
          fl.hip.rotation.x = -1.4 * pulse; fr.hip.rotation.x = -1.4 * Math.sin(Math.min(1, k * 1.4) * Math.PI);
          this.torso.rotation.x -= 0.15 * pulse;
          break;
        case 'bite': this.head.position.z += 0.18 * pulse; this.head.rotation.x -= 0.35 * pulse; break;
        case 'pounce':
          this.torso.position.y += 0.25 * pulse;
          this.torso.rotation.x -= 0.3 * pulse;
          fl.hip.rotation.x = fr.hip.rotation.x = -1.4 * pulse;
          break;
        case 'roar': this.head.rotation.x -= 0.5 * pulse; this.torso.rotation.x -= 0.2 * pulse; break;
        case 'maul':
          this.torso.rotation.x -= 0.45 * pulse;
          this.torso.position.y += 0.12 * pulse;
          fl.hip.rotation.x = fr.hip.rotation.x = -1.7 * pulse;
          break;
        case 'hit': this.torso.rotation.x += 0.12 * pulse; this.head.rotation.x += 0.2 * pulse; break;
      }
      if (k >= 1) this.shot = null;
    }

    this.bodyYaw += (this.bodyYawTarget - this.bodyYaw) * Math.min(1, dt * 12);
    this.body.rotation.y = this.bodyYaw;
  }
}
