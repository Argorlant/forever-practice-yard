// Dragons built in code for the Onyxia encounter (no third-party models), in
// the yard's low-poly style: Onyxia and her whelps share the build at two
// sizes. Poses (asleep in her bed, on the ground, hovering, flying, dead) blend
// into each other; acts (Flame Breath, Tail Sweep, Bellowing Roar, a bite) play
// over them. A model of the player's own can stand in (ModelDragon, below).
import * as THREE from 'three';
import type { CustomModel } from './custom-model';
import type { EnemyView } from './enemy';

export type DragonPose = 'asleep' | 'ground' | 'hover' | 'fly' | 'dead';
export type DragonAct = 'breath' | 'spit' | 'spitFly' | 'tail' | 'roar' | 'liftoff' | 'land' | 'bite' | 'wound';

export interface DragonFigure extends EnemyView {
  setPose(p: DragonPose): void;
  act(a: DragonAct): void;
  /** Where breath and fireballs leave from. */
  mouth(out?: THREE.Vector3): THREE.Vector3;
  dispose(): void;
}

export interface DragonLook { scales: number; belly: number; wing: number; horn: number; eyes: number }
export const ONYXIA_LOOK: DragonLook = { scales: 0x35303d, belly: 0x7a5434, wing: 0x5c2430, horn: 0xcbb994, eyes: 0xffa23a };
export const WHELP_LOOK: DragonLook = { scales: 0x3a3442, belly: 0x6a4630, wing: 0x52202a, horn: 0xb8a684, eyes: 0xff8a2a };

const ACT_LENGTH: Record<DragonAct, number> = {
  breath: 2.6, spit: 0.8, spitFly: 3.5, tail: 0.9, roar: 1.6, liftoff: 1.2, land: 1.0, bite: 0.45, wound: 0.3,
};

interface Leg { hip: THREE.Group; knee: THREE.Group; front: boolean; side: 1 | -1 }
interface Wing { root: THREE.Group; side: 1 | -1 }

/** A selection ring on the ground under a creature, red for an enemy. */
function selectionRing(radius: number): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(radius * 0.9, radius, 48),
    new THREE.MeshBasicMaterial({ color: 0xd8321e, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  ring.visible = false;
  return ring;
}

export class ProceduralDragon implements DragonFigure {
  readonly root = new THREE.Group();
  readonly pickables: THREE.Object3D[] = [];
  private body = new THREE.Group();
  private torso = new THREE.Group();
  private neck: THREE.Group[] = [];
  private head = new THREE.Group();
  private jaw = new THREE.Group();
  private snout = new THREE.Object3D();
  private tail: THREE.Group[] = [];
  private wings: Wing[] = [];
  private legs: Leg[] = [];
  private ring: THREE.Mesh;
  private pose: DragonPose = 'ground';
  private current: { name: DragonAct; t: number } | null = null;
  private time = Math.random() * 10;
  private flap = 0;
  private tailSide = 1;
  // Smoothed pose values: lying down, in the air, wings open, rolled over (dead).
  private s = { crouch: 0, fly: 0, wings: 0, roll: 0, sleep: 0 };
  private H: number;
  private r: number;

  /** `length`: nose to tail tip in meters (Onyxia about 17, a whelp 2). */
  constructor(private length: number, look: DragonLook) {
    const L = length;
    this.r = 0.085 * L;
    this.H = 0.15 * L + this.r * 0.3;
    const mat = (color: number, extra: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true, ...extra });
    const scales = mat(look.scales, { metalness: 0.15 });
    const belly = mat(look.belly);
    const horn = mat(look.horn);
    const membrane = mat(look.wing, { side: THREE.DoubleSide, roughness: 0.9 });
    const eyes = new THREE.MeshBasicMaterial({ color: look.eyes });
    const add = (parent: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      this.pickables.push(mesh);
      return mesh;
    };
    const r = this.r;

    this.root.add(this.body);
    this.body.add(this.torso);
    // Trunk: an ellipsoid along Z, the belly a paler one under it.
    const trunk = add(this.torso, new THREE.SphereGeometry(1, 10, 7), scales);
    trunk.scale.set(r, r * 0.92, 0.16 * L);
    const under = add(this.torso, new THREE.SphereGeometry(1, 10, 6), belly);
    under.scale.set(r * 0.8, r * 0.7, 0.14 * L);
    under.position.set(0, -r * 0.28, 0.01 * L);
    // Spines along the back.
    for (let i = 0; i < 6; i++) {
      const spike = add(this.torso, new THREE.ConeGeometry(r * 0.14, r * 0.5, 4), horn);
      spike.position.set(0, r * 0.95, (0.1 - i * 0.045) * L);
      spike.rotation.x = -0.4;
    }

    // Neck: four segments forward and up, then the head.
    let parent: THREE.Object3D = this.torso;
    let z = 0.14 * L, y = r * 0.35;
    const seg = 0.055 * L;
    for (let i = 0; i < 4; i++) {
      const g = new THREE.Group();
      g.position.set(0, y, z);
      parent.add(g);
      const rad = r * (0.48 - i * 0.05);
      const m = add(g, new THREE.CylinderGeometry(rad * 0.85, rad, seg * 1.15, 7), scales);
      m.rotation.x = Math.PI / 2;
      m.position.z = seg / 2;
      this.neck.push(g);
      parent = g;
      z = seg;
      y = 0;
    }
    this.head.position.z = seg;
    parent.add(this.head);
    const skull = add(this.head, new THREE.CylinderGeometry(r * 0.12, r * 0.34, 0.1 * L, 5), scales);
    skull.rotation.x = Math.PI / 2;
    skull.position.set(0, r * 0.08, 0.05 * L);
    this.jaw.position.set(0, -r * 0.08, 0.005 * L);
    this.head.add(this.jaw);
    const jawMesh = add(this.jaw, new THREE.CylinderGeometry(r * 0.08, r * 0.24, 0.085 * L, 5), belly);
    jawMesh.rotation.x = Math.PI / 2;
    jawMesh.position.set(0, -r * 0.05, 0.045 * L);
    this.snout.position.set(0, 0, 0.1 * L);
    this.head.add(this.snout);
    for (const side of [1, -1]) {
      const h = add(this.head, new THREE.ConeGeometry(r * 0.08, 0.07 * L, 5), horn);
      h.position.set(side * r * 0.2, r * 0.3, -0.005 * L);
      h.rotation.set(-1.9, 0, side * 0.35);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(r * 0.055, 6, 4), eyes);
      eye.position.set(side * r * 0.2, r * 0.16, 0.035 * L);
      this.head.add(eye);
    }

    // Tail: eight segments thinning out, a spade at the end.
    parent = this.torso;
    z = -0.15 * L;
    const tseg = 0.048 * L;
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      g.position.set(0, i === 0 ? r * 0.1 : 0, z);
      parent.add(g);
      const rad = r * (0.55 - i * 0.06);
      const m = add(g, new THREE.CylinderGeometry(rad, rad * 0.85 + 0.01, tseg * 1.1, 6), scales);
      m.rotation.x = Math.PI / 2;
      m.position.z = -tseg / 2;
      this.tail.push(g);
      parent = g;
      z = -tseg;
    }
    const spade = add(parent, new THREE.ConeGeometry(r * 0.3, tseg, 3), horn);
    spade.rotation.x = -Math.PI / 2;
    spade.scale.set(1, 1, 0.25);
    spade.position.z = -tseg;

    // Legs: hip and knee joints, claws.
    for (const front of [true, false]) {
      for (const side of [1, -1] as const) {
        const hip = new THREE.Group();
        hip.position.set(side * r * 0.75, -r * 0.25, (front ? 0.09 : -0.09) * L);
        this.torso.add(hip);
        const upper = add(hip, new THREE.CylinderGeometry(r * 0.2, r * 0.15, 0.08 * L, 6), scales);
        upper.position.y = -0.04 * L;
        const knee = new THREE.Group();
        knee.position.y = -0.08 * L;
        hip.add(knee);
        const lower = add(knee, new THREE.CylinderGeometry(r * 0.14, r * 0.1, 0.075 * L, 6), scales);
        lower.position.y = -0.037 * L;
        const foot = add(knee, new THREE.ConeGeometry(r * 0.16, r * 0.4, 4), horn);
        foot.position.set(0, -0.075 * L, r * 0.12);
        foot.rotation.x = Math.PI / 2;
        this.legs.push({ hip, knee, front, side });
      }
    }

    // Wings: an arm and a membrane from the shoulder back along the body.
    for (const side of [1, -1] as const) {
      const root = new THREE.Group();
      root.position.set(side * r * 0.6, r * 0.65, 0.07 * L);
      this.torso.add(root);
      const arm = add(root, new THREE.CylinderGeometry(r * 0.09, r * 0.06, 0.46 * L, 5), scales);
      arm.rotation.z = Math.PI / 2;
      arm.position.x = side * 0.23 * L;
      const s = side * L;
      const pts = [
        [0, 0, 0], [s * 0.22, 0, 0.01 * L], [s * 0.48, 0, -0.04 * L],
        [s * 0.4, 0, -0.17 * L], [s * 0.24, 0, -0.22 * L], [s * 0.08, 0, -0.2 * L], [0, 0, -0.12 * L],
      ];
      const tris = [[0, 1, 5], [1, 2, 3], [1, 3, 4], [1, 4, 5], [0, 5, 6]];
      const pos = new Float32Array(tris.flatMap((t) => t.flatMap((i) => pts[i])));
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      add(root, geo, membrane);
      this.wings.push({ root, side });
    }

    this.ring = selectionRing(0.24 * L);
    this.root.add(this.ring);
  }

  setPose(p: DragonPose): void { this.pose = p; }

  act(a: DragonAct): void {
    if (a === 'tail') this.tailSide = -this.tailSide;
    this.current = { name: a, t: 0 };
  }

  setSelected(on: boolean): void { this.ring.visible = on; }

  hit(_from: THREE.Vector3, strength = 1): void {
    // A boss flinches at crits only; a whelp at every blow.
    if (this.length < 5 || strength >= 1.5) if (!this.current || this.current.name === 'wound') this.act('wound');
  }

  attack(): void { this.act('bite'); }

  get headPosition(): THREE.Vector3 {
    return this.torso.localToWorld(new THREE.Vector3(0, this.r * 1.3 + 0.6, 0));
  }

  mouth(out = new THREE.Vector3()): THREE.Vector3 {
    return this.snout.getWorldPosition(out);
  }

  update(dt: number, _t: number): void {
    this.time += dt;
    const L = this.length;
    const s = this.s;
    const toward = (k: keyof typeof s, v: number, rate = 3) => { s[k] += (v - s[k]) * Math.min(1, dt * rate); };
    const p = this.pose;
    toward('crouch', p === 'asleep' || p === 'dead' ? 1 : 0, 2);
    toward('sleep', p === 'asleep' ? 1 : 0, 2);
    toward('fly', p === 'hover' || p === 'fly' ? 1 : 0, 2.5);
    toward('wings', p === 'hover' || p === 'fly' ? 1 : 0, 3);
    toward('roll', p === 'dead' ? 1 : 0, 1.5);

    // The act in progress, as a 0..1 curve and its own values.
    let neckPitch = 0, jaw = 0, wingsExtra = 0, tailSwing = 0, lunge = 0, flinch = 0;
    const a = this.current;
    if (a) {
      a.t += dt;
      const len = ACT_LENGTH[a.name];
      const k = a.t / len;
      const bump = Math.sin(Math.min(1, k) * Math.PI);
      switch (a.name) {
        case 'breath': {
          // Rearing back for 1.5 seconds, then the blast forward and down.
          const w = Math.min(1, a.t / 1.5);
          neckPitch = a.t < 1.5 ? -0.35 * w : 0.3 * Math.sin(Math.min(1, (a.t - 1.5) / 1.1) * Math.PI);
          jaw = a.t < 1.5 ? 0.15 * w : 0.75;
          break;
        }
        case 'spit': case 'spitFly': neckPitch = 0.25 * bump; jaw = 0.65 * bump; break;
        case 'tail': tailSwing = this.tailSide * 1.3 * bump; break;
        case 'roar': neckPitch = -0.55 * bump; jaw = 0.85 * bump; wingsExtra = 0.6 * bump; break;
        case 'liftoff': wingsExtra = 1 * bump; break;
        case 'land': wingsExtra = 0.8 * bump; break;
        case 'bite': lunge = bump; jaw = 0.6 * bump; break;
        case 'wound': flinch = bump; break;
      }
      if (k >= 1) this.current = null;
    }

    // Body: standing on its legs, lying in its bed, or held up by its wings.
    const H = this.H, r = this.r;
    const breathe = Math.sin(this.time * 1.6) * 0.01 * L;
    this.torso.position.y = H * (1 - s.crouch) + r * 0.85 * s.crouch + breathe * (1 - s.fly) + s.fly * Math.sin(this.time * 3) * 0.015 * L;
    this.body.rotation.z = s.roll * 1.35;
    this.body.rotation.x = -flinch * 0.12 + s.fly * 0.08;

    // Legs: standing straight, folded under in the bed, tucked in flight.
    for (const leg of this.legs) {
      const fold = Math.max(s.crouch, s.fly * 0.8);
      leg.hip.rotation.x = (leg.front ? -0.9 : 1.1) * fold + (leg.front ? 0 : 0.1);
      leg.knee.rotation.x = (leg.front ? 1.8 : -1.6) * fold;
      leg.hip.rotation.z = leg.side * 0.15 * s.fly;
    }

    // Wings: folded back along the sides, or open and beating (slower when gliding across the room).
    const open = Math.min(1, s.wings + wingsExtra);
    this.flap += dt * (p === 'fly' ? 6.5 : 9) * (0.3 + open);
    const beat = Math.sin(this.flap) * 0.65 * open;
    for (const w of this.wings) {
      w.root.rotation.y = w.side * (1.35 * (1 - open) + 0.1 * open);
      w.root.rotation.z = w.side * (-0.55 * (1 - open) + beat + 0.15 * open);
      w.root.rotation.x = -0.25 * (1 - open);
    }

    // Neck: raised on the ground, low and turned aside in the bed, stretched in flight.
    const sleepCurl = s.sleep;
    this.neck.forEach((g, i) => {
      g.rotation.x = -0.28 * (1 - sleepCurl) + 0.38 * sleepCurl + (i === 0 ? neckPitch : neckPitch * 0.5) + lunge * 0.18 - s.fly * 0.12;
      g.rotation.y = sleepCurl * 0.42 + Math.sin(this.time * 0.7 + i) * 0.03;
    });
    this.head.rotation.x = 0.45 * (1 - sleepCurl) + 0.2 * sleepCurl - neckPitch * 0.4 + s.fly * 0.15;
    this.jaw.rotation.x = jaw * 0.6;

    // Tail: swaying, curled round in the bed, a sweep to one side.
    this.tail.forEach((g, i) => {
      const sway = Math.sin(this.time * 1.3 - i * 0.6) * 0.06 * (1 + s.fly);
      g.rotation.y = sway + sleepCurl * 0.32 + (tailSwing * (i + 1)) / 8;
      g.rotation.x = 0.06 * (1 - s.fly) - s.fly * 0.03;
    });
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  }
}

/** Animation names for each pose and act, best first: Onyxia's model has Sleep, Hover, Fly, DragonTail, EmoteRoar, DragonSpit… */
const MODEL_POSES: Record<DragonPose, string[]> = {
  asleep: ['sleep', 'stand'],
  ground: ['readyunarmed', 'stand'],
  hover: ['hover', 'flystand', 'stand'],
  fly: ['fly', 'hover', 'run'],
  dead: ['death'],
};
const MODEL_ACTS: Record<DragonAct, string[]> = {
  breath: ['dragonspit', 'spellcastdirected', 'attackunarmed'],
  spit: ['dragonspithover', 'dragonspit', 'spellcastdirected'],
  spitFly: ['dragonspitfly', 'dragonspithover', 'dragonspit'],
  tail: ['dragontail', 'specialunarmed'],
  roar: ['emoteroar', 'battleroar', 'spellcastomni'],
  liftoff: ['liftoff'],
  land: ['land'],
  bite: ['attackunarmed'],
  wound: ['combatwound'],
};
/** A whelp's model flies in its Run and hovers in its Stand. */
const WHELP_POSES: Record<DragonPose, string[]> = {
  asleep: ['stand'], ground: ['stand'], hover: ['stand'], fly: ['run', 'walk'], dead: ['death'],
};

/** A model of the player's own as a dragon (Onyxia's dragononyxia.m2, a dragonwhelp.m2). */
export class ModelDragon implements DragonFigure {
  readonly root = new THREE.Group();
  readonly pickables: THREE.Object3D[] = [];
  private ring: THREE.Mesh;
  private pose: DragonPose | null = null;
  private mouthBone: THREE.Object3D | null = null;
  private poses: Record<DragonPose, string[]>;

  constructor(private model: CustomModel, ringRadius: number, whelp = false) {
    this.poses = whelp ? WHELP_POSES : MODEL_POSES;
    this.root.add(model.root);
    model.root.visible = true;
    model.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) this.pickables.push(o);
      if (!this.mouthBone && /_?breath$|jaw$/i.test(o.name)) this.mouthBone = o;
    });
    this.ring = selectionRing(ringRadius);
    this.root.add(this.ring);
  }

  setPose(p: DragonPose): void {
    if (p === this.pose) return;
    const was = this.pose;
    this.pose = p;
    if (p === 'dead') { this.model.playNamed(this.poses.dead, 1, true); return; }
    if (was === 'dead') this.model.release();
    this.model.setPose(this.poses[p]);
  }

  act(a: DragonAct): void { this.model.playNamed(MODEL_ACTS[a], a === 'bite' ? 1.3 : 1); }

  setSelected(on: boolean): void { this.ring.visible = on; }

  hit(_from: THREE.Vector3, strength = 1): void {
    if (this.pose !== 'dead' && (this.model.height < 4 || strength >= 1.5)) this.act('wound');
  }

  attack(): void { this.act('bite'); }

  get headPosition(): THREE.Vector3 {
    return this.root.localToWorld(new THREE.Vector3(0, Math.min(this.model.height, 9) + 0.4, 0));
  }

  mouth(out = new THREE.Vector3()): THREE.Vector3 {
    if (this.mouthBone) return this.mouthBone.getWorldPosition(out);
    return this.root.localToWorld(out.set(0, this.model.height * 0.6, this.model.height * 0.5));
  }

  update(dt: number): void { this.model.update(dt); }

  dispose(): void {
    this.root.removeFromParent();
    this.model.dispose();
  }
}
