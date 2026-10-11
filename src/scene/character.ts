// The player character: the Quaternius mannequin (CC0) dressed in code
// (hood, mask, pauldrons, belt, weapons) and an animator that layers
// upper-body attacks over leg locomotion, so it can strike while moving.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { CharacterLook, WeaponType } from '../engine/types';

/** Bones that belong to the upper-body layer. */
const UPPER = /^(spine_0[1-3]|neck_01|Head|clavicle_|upperarm_|lowerarm_|hand_|index_|middle_|pinky_|ring_|thumb_)/;

export type Locomotion = 'idle' | 'ready' | 'walk' | 'run' | 'back' | 'sprint' | 'sneak' | 'sneakMove' | 'air' | 'cast';

/** Clip and natural ground speed (m/s) of each locomotion state. */
const LOCOMOTION: Record<Locomotion, { clip: string; speed?: number }> = {
  idle: { clip: 'Idle_Loop' },
  ready: { clip: 'Sword_Idle' },
  walk: { clip: 'Walk_Loop', speed: 1.0 },
  run: { clip: 'Jog_Fwd_Loop', speed: 6.4 },
  back: { clip: 'Jog_Fwd_Loop', speed: -6.4 },
  sprint: { clip: 'Sprint_Loop', speed: 9.5 },
  sneak: { clip: 'Crouch_Idle_Loop' },
  sneakMove: { clip: 'Crouch_Fwd_Loop', speed: 1.6 },
  air: { clip: 'Jump_Loop' },
  cast: { clip: 'Spell_Simple_Idle_Loop' },
};

/** Upper-body one-shots: clip, playback rate, and where to cut it (s). */
export const ACTIONS = {
  strike1: { clip: 'Sword_Regular_A', rate: 1.15 },
  strike2: { clip: 'Sword_Regular_B', rate: 1.15 },
  slash: { clip: 'Sword_Regular_C', rate: 2.4, end: 1.1 },
  stab: { clip: 'Sword_Attack', rate: 2.2 },
  hook: { clip: 'Melee_Hook', rate: 1.1 },
  jab: { clip: 'Punch_Jab', rate: 1.7 },
  cross: { clip: 'Punch_Cross', rate: 1.8 },
  drink: { clip: 'Consume', rate: 1.4 },
  throw: { clip: 'OverhandThrow', rate: 1.8 },
  block: { clip: 'Sword_Block', rate: 1.7 },
  hitReact: { clip: 'Hit_Chest', rate: 1.1 },
  cast: { clip: 'Spell_Simple_Shoot', rate: 1.0 },
} satisfies Record<string, { clip: string; rate: number; end?: number }>;
export type ActionName = keyof typeof ACTIONS;

interface LocoPair { lower: THREE.AnimationAction; upper: THREE.AnimationAction; weight: number; target: number; natural?: number }
interface OneShot { action: THREE.AnimationAction; elapsed: number; length: number; weight: number }

function splitClip(clip: THREE.AnimationClip): { upper: THREE.AnimationClip; lower: THREE.AnimationClip } {
  const upper = clip.tracks.filter((t) => UPPER.test(t.name.split('.')[0]));
  const lower = clip.tracks.filter((t) => !UPPER.test(t.name.split('.')[0]));
  return {
    upper: new THREE.AnimationClip(clip.name + '_upper', clip.duration, upper),
    lower: new THREE.AnimationClip(clip.name + '_lower', clip.duration, lower),
  };
}

export class Character {
  readonly root = new THREE.Group();
  /** Rotates the model inside root, for strafing. */
  private body = new THREE.Group();
  private mixer!: THREE.AnimationMixer;
  private loco = new Map<Locomotion, LocoPair>();
  private shot: OneShot | null = null;
  private clips = new Map<string, THREE.AnimationClip>();
  private current: Locomotion = 'idle';
  private bodyYaw = 0;
  private bodyYawTarget = 0;
  private swingToggle = false;
  private handR: THREE.Object3D | null = null;
  private handL: THREE.Object3D | null = null;
  private weapons: THREE.Group[] = [];
  private mats!: { metal: THREE.Material; grip: THREE.Material; gold: THREE.Material };
  private forearmL: THREE.Object3D | null = null;
  private cloth: THREE.Material | null = null;
  private attachToBone: ((b: THREE.Object3D, build: (g: THREE.Group) => void) => THREE.Group) | null = null;

  async load(url: string, look: CharacterLook): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(url);
    const model = gltf.scene;
    model.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        m.material = mats.map((mat) => {
          const std = (mat as THREE.MeshStandardMaterial).clone();
          // Joints only a shade darker, so it reads less like a mannequin.
          std.color.setHex(look.leatherColor);
          if (std.name === 'M_Joints') std.color.multiplyScalar(0.8);
          std.roughness = 0.75;
          std.metalness = 0.05;
          return std;
        });
        if ((m.material as THREE.Material[]).length === 1) m.material = (m.material as THREE.Material[])[0];
      }
    });
    this.body.add(model);
    this.root.add(this.body);
    model.updateMatrixWorld(true);
    this.dress(model, look);

    this.mixer = new THREE.AnimationMixer(model);
    for (const clip of gltf.animations) this.clips.set(clip.name, clip);
    for (const [state, def] of Object.entries(LOCOMOTION) as [Locomotion, { clip: string; speed?: number }][]) {
      const clip = this.clips.get(def.clip);
      if (!clip) continue;
      const parts = splitClip(clip);
      const lower = this.mixer.clipAction(parts.lower);
      const upper = this.mixer.clipAction(parts.upper);
      for (const a of [lower, upper]) { a.play(); a.setEffectiveWeight(0); }
      this.loco.set(state, { lower, upper, weight: state === 'idle' ? 1 : 0, target: state === 'idle' ? 1 : 0, natural: def.speed });
    }
  }

  // ------------------------------------------------------------- the outfit
  private dress(model: THREE.Object3D, look: CharacterLook): void {
    const bone = (name: string) => model.getObjectByName(name)!;
    const cloth = new THREE.MeshStandardMaterial({ color: look.clothColor, roughness: 0.9 });
    const leather = new THREE.MeshStandardMaterial({ color: look.leatherColor, roughness: 0.7 });
    const darkLeather = new THREE.MeshStandardMaterial({ color: 0x1d1612, roughness: 0.6 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.3 });

    /** Attaches a group to a bone with axes given in world space at bind pose. */
    const attach = (b: THREE.Object3D, build: (g: THREE.Group) => void, offsetWorld = new THREE.Vector3()) => {
      const g = new THREE.Group();
      build(g);
      // The group's +Y is world up and +Z is world forward, whatever the bone axes are.
      const inv = b.getWorldQuaternion(new THREE.Quaternion()).invert();
      g.quaternion.copy(inv);
      g.position.copy(offsetWorld.clone().applyQuaternion(inv));
      b.add(g);
      return g;
    };
    const shadowed = (m: THREE.Mesh) => { m.castShadow = true; return m; };

    if (look.hood) {
      attach(bone('Head'), (g) => {
        // Hood: a sphere open at the face, with a point at the back.
        const hood = shadowed(new THREE.Mesh(
          new THREE.SphereGeometry(0.135, 20, 14, Math.PI * 0.82, Math.PI * 1.36, 0, Math.PI * 0.72),
          cloth,
        ));
        hood.position.set(0, 0.105, -0.005);
        hood.scale.set(1, 1.12, 1.08);
        g.add(hood);
        const tip = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10), cloth));
        tip.position.set(0, 0.17, -0.12);
        tip.rotation.x = -2.1;
        g.add(tip);
        // Mask over the lower face.
        const mask = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.098, 0.088, 0.085, 18, 1, true, -Math.PI * 0.62, Math.PI * 1.24), darkLeather));
        mask.material = darkLeather.clone();
        (mask.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        mask.position.set(0, 0.06, 0.012);
        g.add(mask);
        // Eyes: a faint glow inside the hood.
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffd27a });
        for (const s of [-1, 1]) {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 4), eyeMat);
          eye.position.set(s * 0.034, 0.118, 0.093);
          g.add(eye);
        }
        // Mantle over the shoulders.
        const mantle = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 0.14, 18, 1, true), cloth));
        mantle.material = cloth.clone();
        (mantle.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        mantle.position.set(0, -0.06, -0.02);
        g.add(mantle);
      });
    }

    if (look.robe) {
      attach(bone('pelvis'), (g) => {
        // A robe: an open cone from the waist to the shins.
        const robe = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.3, 0.72, 16, 1, true), cloth));
        robe.material = cloth.clone();
        (robe.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
        robe.position.set(0, -0.3, 0.01);
        g.add(robe);
      });
    }

    if (look.plate) {
      attach(bone('Head'), (g) => {
        // Helmet: a dome with a nose guard and a crest.
        const dome = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.128, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), metal));
        dome.position.set(0, 0.1, -0.005);
        dome.scale.set(1, 1.08, 1.1);
        g.add(dome);
        const rim = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.012, 6, 24), metal));
        rim.rotation.x = Math.PI / 2;
        rim.position.set(0, 0.075, -0.005);
        g.add(rim);
        const nose = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.07, 0.012), metal));
        nose.position.set(0, 0.06, 0.122);
        g.add(nose);
        const crest = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.04, 0.2), cloth));
        crest.position.set(0, 0.235, -0.01);
        g.add(crest);
      });
      attach(bone('pelvis'), (g) => {
        // Tabard panels front and back.
        for (const z of [0.12, -0.12]) {
          const panel = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.42, 0.012), cloth));
          panel.position.set(0, -0.12, z);
          g.add(panel);
        }
      });
    }

    for (const side of ['l', 'r'] as const) {
      const s = side === 'l' ? 1 : -1;
      attach(bone(`upperarm_${side}`), (g) => {
        const pad = shadowed(new THREE.Mesh(new THREE.SphereGeometry(look.plate ? 0.105 : 0.085, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), look.plate ? metal : leather));
        pad.scale.set(1.15, 0.8, 1.05);
        pad.position.set(s * 0.02, 0.035, 0);
        g.add(pad);
        const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), metal);
        rivet.position.set(s * 0.03, 0.08, 0.03);
        g.add(rivet);
      });
      attach(bone(`lowerarm_${side}`), (g) => {
        const bracer = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.14, 12), look.plate ? metal : darkLeather));
        bracer.rotation.z = Math.PI / 2;
        bracer.position.set(s * 0.17, 0, 0);
        g.add(bracer);
      });
    }

    attach(bone('pelvis'), (g) => {
      const belt = shadowed(new THREE.Mesh(new THREE.TorusGeometry(0.165, 0.022, 6, 28), darkLeather));
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(1, 0.78, 1);
      belt.position.set(0, 0.09, 0.0);
      g.add(belt);
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.012), new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.8, roughness: 0.35 }));
      buckle.position.set(0, 0.09, 0.133);
      g.add(buckle);
      for (const [x, z] of look.plate ? [] : [[0.12, 0.09], [-0.14, 0.05], [0.0, -0.14]]) {
        const pouch = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.035), leather));
        pouch.position.set(x, 0.05, z);
        pouch.lookAt(0, 0.05, 0);
        g.add(pouch);
      }
    });

    this.handR = bone('hand_r');
    this.handL = bone('hand_l');
    this.forearmL = bone('lowerarm_l');
    this.attachToBone = attach;
    this.cloth = cloth;
    this.mats = { metal, grip: darkLeather, gold: new THREE.MeshStandardMaterial({ color: 0xc9a050, metalness: 0.8, roughness: 0.35 }) };
  }

  /** Swaps the weapon models to match the gear in Settings. */
  setWeapons(main: WeaponType, off: WeaponType | null, opts: { twoHand?: boolean; shield?: boolean } = {}): void {
    for (const w of this.weapons) w.removeFromParent();
    this.weapons = [];
    if (!this.handR) return;
    this.weapons.push(this.buildWeapon(this.handR, 'r', main, opts.twoHand ? 1.6 : 1));
    if (opts.shield && this.forearmL && this.attachToBone) {
      this.weapons.push(this.attachToBone(this.forearmL, (g) => this.buildShield(g)));
    } else if (off && this.handL) {
      this.weapons.push(this.buildWeapon(this.handL, 'l', off));
    }
  }

  /** A kite shield strapped to the left forearm, its face out of the back of the arm. */
  private buildShield(g: THREE.Group): void {
    const { metal } = this.mats;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.26);
    shape.quadraticCurveTo(0.2, 0.24, 0.2, 0.05);
    shape.quadraticCurveTo(0.17, -0.2, 0, -0.32);
    shape.quadraticCurveTo(-0.17, -0.2, -0.2, 0.05);
    shape.quadraticCurveTo(-0.2, 0.24, 0, 0.26);
    const face = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.01, bevelSegments: 1 }), this.cloth ?? metal);
    face.castShadow = true;
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), metal);
    boss.position.z = 0.03;
    const s = new THREE.Group();
    s.add(face, boss);
    // In the bind pose the left forearm points along +X with the back of the arm up (+Y).
    s.rotation.set(-Math.PI / 2, 0, -Math.PI / 2);
    s.position.set(0.15, 0.07, 0);
    g.add(s);
  }

  private buildWeapon(hand: THREE.Object3D, side: 'l' | 'r', kind: WeaponType, scale = 1): THREE.Group {
    const pos = (name: string) => (hand.getObjectByName(`${name}_${side}`) as THREE.Object3D).position.clone();
    // Hand-local axes from the finger joints: the handle runs across the
    // knuckles and the blade comes out on the thumb side.
    const index = pos('index_01'), pinky = pos('pinky_01'), middle = pos('middle_01'), thumb = pos('thumb_01');
    const fingers = middle.clone().normalize();
    const across = index.clone().sub(pinky).normalize();
    const palm = thumb.clone()
      .sub(fingers.clone().multiplyScalar(thumb.dot(fingers)))
      .sub(across.clone().multiplyScalar(thumb.dot(across)))
      .normalize();
    const blade = across.clone().add(fingers.clone().multiplyScalar(-0.15)).normalize();
    const side3 = new THREE.Vector3().crossVectors(blade, palm).normalize();
    const basis = new THREE.Matrix4().makeBasis(side3, blade, new THREE.Vector3().crossVectors(side3, blade));

    const { metal, grip, gold } = this.mats;
    const w = new THREE.Group();
    const add = (m: THREE.Mesh, y: number) => { m.position.y = y; m.castShadow = true; w.add(m); return m; };
    // The handle sits in the fist; +Y points out of the thumb side.
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, kind === 'mace' || kind === 'axe' ? 0.34 : 0.12, 8), grip),
      kind === 'mace' || kind === 'axe' ? 0.1 : 0);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), metal), -0.065);

    if (kind === 'sword' || kind === 'dagger') {
      const long = kind === 'sword' ? 0.72 : 0.32;
      const width = kind === 'sword' ? 0.024 : 0.02;
      const shape = new THREE.Shape();
      shape.moveTo(-width, 0);
      shape.lineTo(width, 0);
      shape.lineTo(width * 0.85, long * 0.82);
      shape.lineTo(0, long);
      shape.lineTo(-width * 0.85, long * 0.82);
      shape.closePath();
      const b = add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 1 }), metal), 0.07);
      b.position.z = -0.006;
      add(new THREE.Mesh(new THREE.BoxGeometry(kind === 'sword' ? 0.16 : 0.09, 0.022, 0.03), gold), 0.06);
    } else if (kind === 'mace') {
      const head = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), metal), 0.3);
      head.scale.set(1, 1.3, 1);
      for (let i = 0; i < 6; i++) {
        const flange = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.05), metal);
        flange.rotation.y = (i / 6) * Math.PI;
        flange.position.y = 0.3;
        w.add(flange);
      }
      add(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 6), metal), 0.39);
    } else if (kind === 'staff') {
      // A long staff with a glowing crystal at the top.
      const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.6, 8), new THREE.MeshStandardMaterial({ color: 0x5a3d22, roughness: 0.9 })), 0.35);
      pole.castShadow = true;
      const crystal = add(new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), new THREE.MeshStandardMaterial({ color: 0x9fe0ff, emissive: 0x3aa0ff, emissiveIntensity: 1.2 })), 1.2);
      crystal.scale.set(1, 1.6, 1);
      for (const a of [0, 2.1, 4.2]) {
        const prong = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.16, 4), grip);
        prong.position.set(Math.cos(a) * 0.04, 1.14, Math.sin(a) * 0.04);
        prong.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
        w.add(prong);
      }
    } else if (kind === 'axe') {
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.06);
      shape.quadraticCurveTo(0.17, -0.1, 0.17, 0.0);
      shape.quadraticCurveTo(0.17, 0.1, 0, 0.06);
      shape.closePath();
      const head = add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: false }), metal), 0.26);
      head.position.z = -0.005;
    } else {
      // Fist weapon: three short claws over the knuckles.
      for (const dx of [-0.025, 0, 0.025]) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.16, 4), metal);
        claw.position.set(dx, 0.13, 0);
        w.add(claw);
      }
      add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.02), gold), 0.05);
    }

    w.scale.setScalar(scale);
    w.quaternion.setFromRotationMatrix(basis);
    // Grip center: between index and pinky knuckles, pushed into the palm.
    w.position.copy(index.clone().add(pinky).multiplyScalar(0.46).add(palm.clone().multiplyScalar(0.03)));
    hand.add(w);
    return w;
  }

  // ------------------------------------------------------------- animation
  /** Picks the leg/body loop; speed in m/s scales the playback. */
  setLocomotion(state: Locomotion, groundSpeed = 0): void {
    if (state !== this.current) {
      for (const [k, pair] of this.loco) pair.target = k === state ? 1 : 0;
      this.current = state;
    }
    const pair = this.loco.get(state);
    if (pair?.natural) {
      const rate = groundSpeed / pair.natural;
      pair.lower.timeScale = pair.upper.timeScale = Math.max(-2.5, Math.min(2.5, rate || 1));
    }
  }

  /** Turns the model inside its root (strafing runs at an angle). */
  setBodyYaw(yaw: number): void { this.bodyYawTarget = yaw; }

  play(name: string): void {
    const def: { clip: string; rate: number; end?: number } | undefined = ACTIONS[name as ActionName];
    if (!def) return;
    const clip = this.clips.get(def.clip);
    if (!clip || !this.mixer) return;
    const upper = splitClip(clip).upper;
    if (this.shot) this.shot.action.stop();
    const action = this.mixer.clipAction(upper);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = def.rate;
    action.play();
    this.shot = { action, elapsed: 0, length: (def.end ?? clip.duration) / def.rate, weight: 0 };
  }

  /** Auto attack swing: alternates two short slashes. */
  swing(): void {
    this.swingToggle = !this.swingToggle;
    this.play(this.swingToggle ? 'strike1' : 'strike2');
  }

  update(dt: number): void {
    if (!this.mixer) return;
    const fade = Math.min(1, dt / 0.15);
    let shotWeight = 0;
    if (this.shot) {
      const s = this.shot;
      s.elapsed += dt;
      const fadeIn = Math.min(1, s.elapsed / 0.06);
      const fadeOut = Math.min(1, Math.max(0, (s.length - s.elapsed) / 0.14));
      shotWeight = Math.min(fadeIn, fadeOut);
      s.action.setEffectiveWeight(shotWeight);
      if (s.elapsed >= s.length) {
        s.action.stop();
        this.shot = null;
        shotWeight = 0;
      }
    }
    for (const pair of this.loco.values()) {
      pair.weight += (pair.target - pair.weight) * fade;
      if (pair.weight < 0.002) pair.weight = 0;
      pair.lower.setEffectiveWeight(pair.weight);
      pair.upper.setEffectiveWeight(pair.weight * (1 - shotWeight));
    }
    this.bodyYaw += (this.bodyYawTarget - this.bodyYaw) * Math.min(1, dt * 12);
    this.body.rotation.y = this.bodyYaw;
    this.mixer.update(dt);
  }
}
