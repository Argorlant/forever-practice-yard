// A player's own model, drawn instead of the yard's: a glTF exported from
// their own WoW install (wow.export or a similar tool), with its animations.
// Nothing here ships with the site; the files come from the player and stay in
// their browser (src/ui/model-store.ts). WoW's animation names (AnimationData)
// are matched to the yard's states, and the yard's own names work too.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Locomotion } from './character';

export interface ModelFile { name: string; data: Blob }

/** Each locomotion state's animations, best first. */
const LOCO: Record<Locomotion, string[]> = {
  idle: ['stand', 'idleloop', 'idle'],
  ready: ['ready1h', 'ready2h', 'ready2hl', 'readyunarmed', 'swordidle', 'stand', 'idleloop'],
  walk: ['walk', 'walkloop'],
  run: ['run', 'jogfwdloop', 'runloop', 'jog'],
  back: ['walkbackwards', 'walkback', 'run', 'jogfwdloop'],
  sprint: ['sprint', 'sprintloop', 'run', 'jogfwdloop'],
  sneak: ['stealthstand', 'crouchidleloop', 'stand', 'idleloop'],
  sneakMove: ['stealthwalk', 'crouchfwdloop', 'walk', 'walkloop'],
  air: ['jump', 'fall', 'jumploop', 'jumpstart'],
  cast: ['readyspelldirected', 'readyspellomni', 'channelcastdirected', 'spellsimpleidleloop', 'stand', 'idleloop'],
  aim: ['readybow', 'readyrifle', 'readycrossbow', 'pistolaimneutral', 'stand', 'idleloop'],
};
/** Ground speed (m/s) each moving loop was made for: WoW runs 7 yards a second, walks 2.5 and backpedals 4.5. */
const CLIP_SPEED: Record<string, number> = {
  walk: 2.29, run: 6.4, walkbackwards: -4.1, walkback: -4.1, sprint: 9.5, stealthwalk: 2.29,
  walkloop: 1.0, jogfwdloop: 6.4, runloop: 6.4, jog: 6.4, sprintloop: 9.5, crouchfwdloop: 1.6,
};
/** The yard's one-shot actions, best first, with a playback rate. */
const ACTIONS: Record<string, { names: string[]; rate: number }> = {
  strike1: { names: ['attack1h', 'attack2h', 'attackunarmed', 'swordregulara'], rate: 1.2 },
  strike2: { names: ['attackoff', 'attack1h', 'attack2h', 'attackunarmed', 'swordregularb'], rate: 1.2 },
  slash: { names: ['special1h', 'special2h', 'attack1h', 'attack2h', 'swordregularc'], rate: 1.6 },
  stab: { names: ['attack1hpierce', 'special1h', 'attack1h', 'swordattack'], rate: 1.6 },
  hook: { names: ['attackunarmed', 'attackoff', 'attack1h', 'meleehook'], rate: 1.2 },
  jab: { names: ['attackunarmed', 'attack1h', 'punchjab'], rate: 1.5 },
  cross: { names: ['attackoff', 'attackunarmed', 'attack1h', 'punchcross'], rate: 1.5 },
  drink: { names: ['emoteeat', 'eat', 'usestanding', 'consume'], rate: 1.3 },
  throw: { names: ['attackthrown', 'throw', 'overhandthrow'], rate: 1.5 },
  block: { names: ['shieldblock', 'parry1h', 'parryunarmed', 'block', 'swordblock'], rate: 1.5 },
  hitReact: { names: ['combatwound', 'wound', 'hitchest'], rate: 1.1 },
  cast: { names: ['spellcastdirected', 'spellcastomni', 'spellcast', 'spellsimpleshoot'], rate: 1 },
  shoot: { names: ['firebow', 'attackbow', 'attackrifle', 'firecrossbow', 'pistolshoot'], rate: 1.4 },
};
/** AnimationData ids, for exports that name animations by number. */
const IDS: Record<number, string> = {
  0: 'stand', 4: 'walk', 5: 'run', 9: 'combatwound', 13: 'walkbackwards', 16: 'attackunarmed', 17: 'attack1h', 18: 'attack2h',
  21: 'parry1h', 24: 'shieldblock', 25: 'readyunarmed', 26: 'ready1h', 27: 'ready2h', 29: 'readybow', 32: 'spellcast',
  37: 'jumpstart', 38: 'jump', 39: 'jumpend', 40: 'fall', 46: 'attackbow', 47: 'firebow', 48: 'readyrifle', 49: 'attackrifle',
  51: 'readyspelldirected', 52: 'readyspellomni', 53: 'spellcastdirected', 54: 'spellcastomni', 57: 'special1h', 58: 'special2h',
  61: 'emoteeat',
};

/** "Attack1H_0", "Run (5)", "Stand_0_0", "17_0", "Sword_Regular_A" → "attack1h", "run", "stand", "attack1h", "swordregulara". */
export function animKey(name: string): string {
  const n = name.trim();
  const id = n.match(/^(?:anim(?:ation)?[\s_-]*)?(\d+)(?:[\s_-]+\d+)*$/i);
  if (id) return IDS[Number(id[1])] ?? `id${id[1]}`;
  return n.replace(/(?:[\s_-]*[([]?\d+[)\]]?)+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Loads a .glb, or a .gltf with its .bin and textures, from the player's files. */
export async function loadCustomModel(files: ModelFile[], quarterTurns = 0): Promise<CustomModel> {
  const main = files.find((f) => /\.glb$/i.test(f.name)) ?? files.find((f) => /\.gltf$/i.test(f.name));
  if (!main) throw new Error('Choose a .glb file, or a .gltf with its .bin and textures.');
  const urls = new Map<string, string>();
  for (const f of files) urls.set(f.name.toLowerCase(), URL.createObjectURL(f.data));
  const manager = new THREE.LoadingManager();
  // Files the model refers to (its .bin, its textures) by name, whatever folder the export put them in.
  manager.setURLModifier((url) => (url.startsWith('data:') ? url : urls.get(fileName(url).toLowerCase()) ?? url));
  // A texture left out does not stop the model: it is drawn without it, and Settings says which.
  const lost: string[] = [];
  manager.onError = (url) => { lost.push(fileName(url)); };
  try {
    const gltf = await new GLTFLoader(manager).loadAsync(urls.get(main.name.toLowerCase())!);
    const model = new CustomModel(gltf.scene, gltf.animations, quarterTurns);
    model.missingFiles.push(...new Set(lost));
    return model;
  } finally {
    for (const u of urls.values()) URL.revokeObjectURL(u);
  }
}

/** "blob:…/textures/Cape%20Red.png?x" → "Cape Red.png". */
function fileName(url: string): string {
  const base = url.split('?')[0].split(/[\\/]/).pop() ?? '';
  try { return decodeURIComponent(base); } catch { return base; }
}

interface Loop { lower: THREE.AnimationAction; upper: THREE.AnimationAction | null; weight: number; target: number; natural?: number }
interface Split { upper: THREE.AnimationClip | null; lower: THREE.AnimationClip | null }

export class CustomModel {
  readonly root = new THREE.Group();
  /** Turns the model inside its root (strafing runs at an angle). */
  private body = new THREE.Group();
  /** Turns the model to face the way the yard expects (exports differ). */
  private holder = new THREE.Group();
  private mixer: THREE.AnimationMixer;
  private clips = new Map<string, THREE.AnimationClip>();
  private splits = new Map<THREE.AnimationClip, Split>();
  private loco = new Map<Locomotion, Loop>();
  private sums = new Map<THREE.AnimationAction, number>();
  private current: Locomotion = 'idle';
  private shot: { action: THREE.AnimationAction; elapsed: number; length: number; upperOnly: boolean } | null = null;
  private bodyYaw = 0;
  private bodyYawTarget = 0;
  private swingToggle = false;
  private moving = false;
  private hands: { l: THREE.Object3D | null; r: THREE.Object3D | null };
  /** Bones above the waist: one-shots play on them only, so the legs keep running. */
  private upperBones: Set<string> | null;
  /** For Settings: which of the yard's moments found an animation. */
  readonly found: string[] = [];
  readonly missing: string[] = [];
  /** Files the model asked for and was not given (textures). */
  readonly missingFiles: string[] = [];
  readonly animationCount: number;

  constructor(scene: THREE.Object3D, animations: THREE.AnimationClip[], quarterTurns = 0) {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; }
    });
    // Upright (some exports are Z-up), sized (WoW units are yards; otherwise a human's height) and on the ground.
    let box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    if (size.y < Math.max(size.x, size.z) * 0.5) scene.rotation.x = -Math.PI / 2;
    box = new THREE.Box3().setFromObject(scene);
    const h = box.getSize(new THREE.Vector3()).y;
    scene.scale.multiplyScalar(h > 0.4 && h < 4.5 ? 0.9144 : 1.85 / Math.max(0.01, h));
    this.holder.add(scene);
    box = new THREE.Box3().setFromObject(this.holder);
    this.holder.position.y = -box.min.y;
    this.setQuarterTurns(quarterTurns);
    this.body.add(this.holder);
    this.root.add(this.body);

    this.mixer = new THREE.AnimationMixer(scene);
    this.animationCount = animations.length;
    for (const clip of animations) {
      const k = animKey(clip.name);
      if (!this.clips.has(k)) this.clips.set(k, clip);
    }
    this.upperBones = upperBody(scene);
    for (const [state, names] of Object.entries(LOCO) as [Locomotion, string[]][]) {
      const clip = this.pick(names);
      if (!clip) continue;
      const parts = this.split(clip);
      const lower = this.mixer.clipAction(parts.lower ?? clip);
      const upper = parts.upper ? this.mixer.clipAction(parts.upper) : null;
      for (const a of [lower, upper]) { if (a) { a.play(); a.setEffectiveWeight(0); } }
      const on = state === 'idle' ? 1 : 0;
      this.loco.set(state, { lower, upper, weight: on, target: on, natural: CLIP_SPEED[animKey(clip.name)] });
    }
    for (const [label, names] of [['stand', LOCO.idle], ['run', LOCO.run], ['run backwards', LOCO.back.slice(0, 2)],
      ['attack', ACTIONS.strike1.names], ['cast', ACTIONS.cast.names], ['shoot', ACTIONS.shoot.names], ['jump', LOCO.air]] as [string, string[]][]) {
      (this.pick(names) ? this.found : this.missing).push(label);
    }
    const bone = (re: RegExp) => {
      let hit: THREE.Object3D | null = null;
      scene.traverse((o) => { if (!hit && re.test(o.name)) hit = o; });
      return hit;
    };
    this.hands = {
      r: bone(/hand[\s_.-]*r(ight)?\b|r(ight)?[\s_.-]*hand|handr/i),
      l: bone(/hand[\s_.-]*l(eft)?\b|l(eft)?[\s_.-]*hand|handl/i),
    };
  }

  /** The first animation found, by exact name, else by a name that ends with it ("HumanMale_Stand"). */
  private pick(names: string[]): THREE.AnimationClip | null {
    for (const n of names) {
      const clip = this.clips.get(n);
      if (clip) return clip;
    }
    for (const n of names) {
      for (const [k, clip] of this.clips) if (n.length >= 4 && k.endsWith(n)) return clip;
    }
    return null;
  }

  /** A clip cut in two by the upper-body bones; without them the clip stays whole. */
  private split(clip: THREE.AnimationClip): Split {
    const set = this.upperBones;
    if (!set) return { upper: null, lower: null };
    let parts = this.splits.get(clip);
    if (!parts) {
      const node = (t: THREE.KeyframeTrack) => THREE.PropertyBinding.parseTrackName(t.name).nodeName;
      parts = {
        upper: new THREE.AnimationClip(`${clip.name}.upper`, clip.duration, clip.tracks.filter((t) => set.has(node(t)))),
        lower: new THREE.AnimationClip(`${clip.name}.lower`, clip.duration, clip.tracks.filter((t) => !set.has(node(t)))),
      };
      this.splits.set(clip, parts);
    }
    return parts;
  }

  /** Quarter turns around the vertical, for exports that face another way. */
  setQuarterTurns(n: number): void { this.holder.rotation.y = (((n % 4) + 4) % 4) * (Math.PI / 2); }

  setLocomotion(state: Locomotion, groundSpeed = 0): void {
    const chosen = this.loco.has(state) ? state : this.loco.has('idle') ? 'idle' : null;
    this.moving = groundSpeed !== 0;
    if (!chosen) return;
    if (chosen !== this.current) {
      for (const [k, loop] of this.loco) loop.target = k === chosen ? 1 : 0;
      this.current = chosen;
    }
    // A moving loop plays at the speed you move (a run clip backwards when there is no backpedal).
    const loop = this.loco.get(chosen)!;
    if (loop.natural) {
      const rate = Math.max(-2.5, Math.min(2.5, groundSpeed / loop.natural || 1));
      loop.lower.timeScale = rate;
      if (loop.upper) loop.upper.timeScale = rate;
    }
  }

  setBodyYaw(yaw: number): void { this.bodyYawTarget = yaw; }

  play(name: string): void {
    const def = ACTIONS[name];
    const clip = def && this.pick(def.names);
    if (!clip) return;
    // Without an upper-body split a one-shot takes the whole body: skip it on the run.
    if (!this.upperBones && this.moving) return;
    if (this.shot) this.shot.action.stop();
    const parts = this.split(clip);
    const action = this.mixer.clipAction(parts.upper ?? clip);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = def.rate;
    action.setEffectiveWeight(0);
    action.play();
    this.shot = { action, elapsed: 0, length: clip.duration / def.rate, upperOnly: !!parts.upper };
  }

  /** Auto attack swing: alternates the main-hand and off-hand attacks. */
  swing(): void {
    this.swingToggle = !this.swingToggle;
    this.play(this.swingToggle ? 'strike1' : 'strike2');
  }

  handPosition(side: 'l' | 'r', out = new THREE.Vector3()): THREE.Vector3 | null {
    const hand = this.hands[side];
    return hand ? hand.getWorldPosition(out) : null;
  }

  update(dt: number): void {
    const fade = Math.min(1, dt / 0.15);
    let shotWeight = 0;
    if (this.shot) {
      const s = this.shot;
      s.elapsed += dt;
      shotWeight = Math.min(1, s.elapsed / 0.06, Math.max(0, (s.length - s.elapsed) / 0.14));
      s.action.setEffectiveWeight(shotWeight);
      if (s.elapsed >= s.length) { s.action.stop(); this.shot = null; shotWeight = 0; }
    }
    // A whole-body one-shot replaces the loop; an upper-body one only the arms and chest.
    // States can share an animation (Stand for standing and for stealth): their weights add up.
    const whole = this.shot && !this.shot.upperOnly ? 1 - shotWeight : 1;
    const sums = this.sums;
    sums.clear();
    for (const loop of this.loco.values()) {
      loop.weight += (loop.target - loop.weight) * fade;
      if (loop.weight < 0.002) loop.weight = 0;
      sums.set(loop.lower, (sums.get(loop.lower) ?? 0) + loop.weight * whole);
      if (loop.upper) sums.set(loop.upper, (sums.get(loop.upper) ?? 0) + loop.weight * (1 - shotWeight));
    }
    for (const [action, w] of sums) action.setEffectiveWeight(Math.min(1, w));
    this.bodyYaw += (this.bodyYawTarget - this.bodyYaw) * Math.min(1, dt * 10);
    this.body.rotation.y = this.bodyYaw;
    this.mixer.update(dt);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.mixer.stopAllAction();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
        for (const v of Object.values(mat)) if (v instanceof THREE.Texture) v.dispose();
        mat.dispose();
      }
    });
  }
}

/** The bones from the chest up (a spine or chest bone and everything under it), or null if the skeleton names none. */
function upperBody(scene: THREE.Object3D): Set<string> | null {
  const find = (re: RegExp) => {
    let hit: THREE.Object3D | null = null;
    scene.traverse((o) => { if (!hit && (o as THREE.Bone).isBone && re.test(o.name)) hit = o; });
    return hit as THREE.Object3D | null;
  };
  const top = find(/spine[\s_.-]*0?[2-3]|chest|upperbody|torso/i) ?? find(/spine/i);
  if (!top) return null;
  const names = new Set<string>();
  top.traverse((o) => { if (o.name) names.add(o.name); });
  return names.size > 3 ? names : null;
}
