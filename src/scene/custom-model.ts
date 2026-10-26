// A player's own model, drawn instead of the yard's: a glTF exported from
// their own WoW install (wow.export or a similar tool), with its animations.
// Nothing here ships with the site; the files come from the player and stay in
// their browser (src/ui/model-store.ts). WoW's animation names (AnimationData)
// are matched to the yard's states, and the yard's own names work too.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Locomotion } from './character';

export interface ModelFile { name: string; type?: string; data: Blob }

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
  critReact: { names: ['combatcritical', 'combatwound', 'wound', 'hitchest'], rate: 1.1 },
  cast: { names: ['spellcastdirected', 'spellcastomni', 'spellcast', 'spellsimpleshoot', 'battleroar'], rate: 1 },
  shoot: { names: ['firebow', 'attackbow', 'attackrifle', 'firecrossbow', 'pistolshoot'], rate: 1.4 },
};
/** Abilities WoW gives an animation of their own, tried before the yard's generic one (cat and bear forms too). */
const ABILITY_ANIMS: Record<string, string[]> = {
  claw: ['druidcatclaw'], shred: ['druidcatclaw'], rake: ['druidcatrake'], rip: ['druidcatrip'], ferociousBite: ['druidcatrip'],
  ravage: ['druidcatravage'], pounce: ['druidcatpounce'], cower: ['druidcatcower'],
  maul: ['druidbearmaul'], swipe: ['druidbearswipe'], bash: ['druidbearbash'], primalBite: ['druidbearbite'],
  demoralizingRoar: ['battleroar'], battleShout: ['battleroar'], demoralizingShout: ['battleroar'],
  whirlwind: ['whirlwind'], shieldBash: ['shieldbash'], kick: ['kick'], pummel: ['kick'],
};
/** What Settings reports as found or missing. */
const MOMENTS: Record<string, string[]> = {
  stand: LOCO.idle, run: LOCO.run, 'run backwards': ['walkbackwards', 'walkback'], attack: ACTIONS.strike1.names,
  cast: ACTIONS.cast.names, shoot: ACTIONS.shoot.names, jump: LOCO.air, wound: ACTIONS.hitReact.names,
};
/** AnimationData ids, for exports that name animations by number. */
const IDS: Record<number, string> = {
  0: 'stand', 4: 'walk', 5: 'run', 9: 'combatwound', 13: 'walkbackwards', 16: 'attackunarmed', 17: 'attack1h', 18: 'attack2h',
  21: 'parry1h', 24: 'shieldblock', 25: 'readyunarmed', 26: 'ready1h', 27: 'ready2h', 29: 'readybow', 32: 'spellcast',
  37: 'jumpstart', 38: 'jump', 39: 'jumpend', 40: 'fall', 46: 'attackbow', 47: 'firebow', 48: 'readyrifle', 49: 'attackrifle',
  51: 'readyspelldirected', 52: 'readyspellomni', 53: 'spellcastdirected', 54: 'spellcastomni', 57: 'special1h', 58: 'special2h',
  61: 'emoteeat',
};

/**
 * "Walk (ID 4 variation 0)" (wow.export), "Attack1H_0", "Run (5)", "Stand_0_0", "17_0", "Sword_Regular_A"
 * → "walk", "attack1h", "run", "stand", "attack1h", "swordregulara".
 */
export function animKey(name: string): string {
  const n = name.trim();
  const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tagged = n.match(/^(.*?)\s*\(ID\s*(\d+)(?:\s*variation\s*\d+)?\)$/i);
  if (tagged) return tagged[1] ? squash(tagged[1]) : IDS[Number(tagged[2])] ?? `id${tagged[2]}`;
  const id = n.match(/^(?:anim(?:ation)?[\s_-]*)?(\d+)(?:[\s_-]+\d+)*$/i);
  if (id) return IDS[Number(id[1])] ?? `id${id[1]}`;
  return squash(n.replace(/(?:[\s_-]*[([]?\d+[)\]]?)+$/, ''));
}

/** Loads a .glb, or a .gltf with its .bin and textures, from the player's files. */
export async function loadModelSource(files: ModelFile[]): Promise<ModelSource> {
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
    return new ModelSource(gltf.scene, gltf.animations, /wow\.export/i.test(String(gltf.asset?.generator ?? '')), [...new Set(lost)]);
  } finally {
    for (const u of urls.values()) URL.revokeObjectURL(u);
  }
}

/** A loaded model file, from which the yard draws as many copies as it needs (one per dummy). */
export class ModelSource {
  constructor(
    readonly scene: THREE.Object3D,
    readonly animations: THREE.AnimationClip[],
    /** wow.export: WoW units (yards), models facing +X, helmets left at the feet. */
    readonly fromWowExport: boolean,
    /** Files the model asked for and was not given (textures). */
    readonly missingFiles: string[],
  ) {}

  /** Quarter turns that make it face forward: WoW models face +X; the yard looks down +Z. */
  get defaultTurns(): number { return this.fromWowExport ? 3 : 0; }

  /** A copy that moves on its own (a character, a form, a dummy); `scale` shrinks a creature to fit (Onyxia). */
  figure(quarterTurns = this.defaultTurns, scale = 1): CustomModel {
    return new CustomModel(cloneSkinned(this.scene), this.animations, quarterTurns, { yards: this.fromWowExport, scale });
  }

  dispose(): void {
    this.scene.traverse((o) => {
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
  private shot: { action: THREE.AnimationAction; elapsed: number; length: number; upperOnly: boolean; ability: boolean; hold: boolean } | null = null;
  /** An encounter's own loop (Sleep, Hover, Fly) over the locomotion, by clip, and the loops it has used. */
  private posed: THREE.AnimationClip | null = null;
  private poseLoops = new Map<THREE.AnimationClip, Loop>();
  /** A one-shot that stays at its last frame (Death). */
  private held: THREE.AnimationAction | null = null;
  private bodyYaw = 0;
  private bodyYawTarget = 0;
  private swingToggle = false;
  private moving = false;
  private hands: { l: THREE.Object3D | null; r: THREE.Object3D | null };
  /** Bones above the waist: one-shots play on them only, so the legs keep running. */
  private upperBones: Set<string> | null;
  /** Standing height in meters. */
  readonly height: number;
  /** Quarter turns it is drawn with. */
  turns = 0;
  /** Helmets and shoulder pads put back on their attachment points (see attachItems). */
  readonly attachedItems: number;
  readonly animationCount: number;

  /**
   * `yards`: a wow.export model, in yards with its feet at the origin, whatever its size (a whelp floats a
   * yard up, Onyxia is twenty tall). Otherwise it is set upright, sized as a person and stood on the ground.
   */
  constructor(scene: THREE.Object3D, animations: THREE.AnimationClip[], quarterTurns = 0, opts: { yards?: boolean; scale?: number } = {}) {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; }
    });
    this.attachedItems = attachItems(scene);
    let box = new THREE.Box3().setFromObject(scene);
    if (opts.yards) {
      scene.scale.multiplyScalar(0.9144 * (opts.scale ?? 1));
      this.holder.add(scene);
      box = new THREE.Box3().setFromObject(this.holder);
      this.height = box.max.y;
    } else {
      // Upright (some exports are Z-up), a person's size unless it already is one in yards, and on the ground.
      const size = box.getSize(new THREE.Vector3());
      if (size.y < Math.max(size.x, size.z) * 0.5) scene.rotation.x = -Math.PI / 2;
      box = new THREE.Box3().setFromObject(scene);
      const h = box.getSize(new THREE.Vector3()).y;
      scene.scale.multiplyScalar((h > 0.4 && h < 4.5 ? 0.9144 : 1.85 / Math.max(0.01, h)) * (opts.scale ?? 1));
      this.holder.add(scene);
      box = new THREE.Box3().setFromObject(this.holder);
      this.holder.position.y = -box.min.y;
      this.height = box.max.y - box.min.y;
    }
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

  /** For Settings: whether one of the yard's moments ('stand', 'run', 'attack', 'wound'…) has an animation. */
  has(moment: string): boolean {
    const names = MOMENTS[moment];
    return !!names && !!this.pick(names);
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
  setQuarterTurns(n: number): void {
    this.turns = ((n % 4) + 4) % 4;
    this.holder.rotation.y = this.turns * (Math.PI / 2);
  }

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

  /**
   * An encounter's own loop by animation names, first found (Sleep, Hover, Fly), over the locomotion;
   * null goes back to the locomotion. Returns whether the model has one of them.
   */
  setPose(names: string[] | null): boolean {
    const clip = names ? this.pick(names) : null;
    if (clip && !this.poseLoops.has(clip)) {
      const action = this.mixer.clipAction(clip);
      action.play();
      action.setEffectiveWeight(0);
      this.poseLoops.set(clip, { lower: action, upper: null, weight: 0, target: 0 });
    }
    this.posed = clip;
    return !!clip || !names;
  }

  /** A one-shot by animation names, whole body (LiftOff, DragonTail, EmoteRoar); `hold` stays on its last frame (Death). */
  playNamed(names: string[], rate = 1, hold = false): boolean {
    const clip = this.pick(names);
    if (!clip) return false;
    if (this.shot) this.shot.action.stop();
    this.held?.stop();
    this.held = null;
    const action = this.mixer.clipAction(clip);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = rate;
    action.setEffectiveWeight(0);
    action.play();
    this.shot = { action, elapsed: 0, length: clip.duration / rate, upperOnly: false, ability: true, hold };
    return true;
  }

  /** Back from a held last frame (a dead boss standing up for the next try). */
  release(): void {
    this.held?.stop();
    this.held = null;
  }

  /** An ability: WoW's own animation for it if the model has one (Maul, Claw, Whirlwind), else the yard's. */
  playAbility(id: string, animation?: string): void {
    const own = ABILITY_ANIMS[id] && this.pick(ABILITY_ANIMS[id]);
    const def = animation ? ACTIONS[animation] : undefined;
    const clip = own || (def && this.pick(def.names));
    if (clip) this.playClip(clip, own ? 1.2 : def!.rate, true);
  }

  play(name: string): void {
    const def = ACTIONS[name];
    const clip = def && this.pick(def.names);
    if (clip) this.playClip(clip, def.rate);
  }

  private playClip(clip: THREE.AnimationClip, rate: number, ability = false): void {
    // Without an upper-body split a one-shot takes the whole body: skip it on the run.
    if (!this.upperBones && this.moving) return;
    if (this.shot) this.shot.action.stop();
    const parts = this.split(clip);
    const action = this.mixer.clipAction(parts.upper ?? clip);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.timeScale = rate;
    action.setEffectiveWeight(0);
    action.play();
    this.shot = { action, elapsed: 0, length: clip.duration / rate, upperOnly: !!parts.upper, ability, hold: false };
  }

  /** Auto attack swing: alternates the main-hand and off-hand attacks. */
  swing(): void {
    // An ability's own blow is not cut short by the auto attack that lands with it.
    if (this.shot?.ability && this.shot.elapsed < this.shot.length * 0.8) return;
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
      shotWeight = s.hold ? Math.min(1, s.elapsed / 0.06) : Math.min(1, s.elapsed / 0.06, Math.max(0, (s.length - s.elapsed) / 0.14));
      s.action.setEffectiveWeight(shotWeight);
      if (s.elapsed >= s.length) {
        if (s.hold) this.held = s.action; else s.action.stop();
        this.shot = null;
        shotWeight = 0;
      }
    }
    if (this.held) shotWeight = 1;
    // A whole-body one-shot replaces the loop; an upper-body one only the arms and chest.
    // States can share an animation (Stand for standing and for stealth): their weights add up.
    const whole = this.held || (this.shot && !this.shot.upperOnly) ? 1 - shotWeight : 1;
    const sums = this.sums;
    sums.clear();
    for (const loop of this.loco.values()) {
      const target = this.posed ? 0 : loop.target;
      loop.weight += (target - loop.weight) * fade;
      if (loop.weight < 0.002) loop.weight = 0;
      sums.set(loop.lower, (sums.get(loop.lower) ?? 0) + loop.weight * whole);
      if (loop.upper) sums.set(loop.upper, (sums.get(loop.upper) ?? 0) + loop.weight * (1 - shotWeight));
    }
    for (const [clip, loop] of this.poseLoops) {
      loop.weight += ((clip === this.posed ? 1 : 0) - loop.weight) * fade;
      if (loop.weight < 0.002) loop.weight = 0;
      sums.set(loop.lower, (sums.get(loop.lower) ?? 0) + loop.weight * whole);
    }
    for (const [action, w] of sums) action.setEffectiveWeight(Math.min(1, w));
    this.bodyYaw += (this.bodyYawTarget - this.bodyYaw) * Math.min(1, dt * 10);
    this.body.rotation.y = this.bodyYaw;
    this.mixer.update(dt);
  }

  /** Takes the copy out of the scene; its geometry and textures belong to the ModelSource. */
  dispose(): void {
    this.root.removeFromParent();
    this.mixer.stopAllAction();
  }
}

/** Item models wow.export leaves loose, by mesh name, and the bone their attachment point hangs from. */
const ITEM_SLOTS: [RegExp, RegExp][] = [
  [/^Head_Item/i, /^bone_Head$/i],
  [/^Shoulder[\s_]*\(?L\)?_Item/i, /^bone_ArmL$/i],
  [/^Shoulder[\s_]*\(?R\)?_Item/i, /^bone_ArmR$/i],
];

/**
 * wow.export draws a helmet or a shoulder pad (a separate item model) around its attachment point, but
 * leaves it at the model's feet instead of on that point. The point is a bone of its own under the head
 * (or upper arm) that moves no vertices: the highest one (the arm's other one is the elbow). Each item goes
 * on its bone, so it also follows the animations. Returns how many meshes moved.
 */
function attachItems(scene: THREE.Object3D): number {
  const moved: [THREE.Object3D, RegExp][] = [];
  scene.traverse((o) => {
    const slot = (o as THREE.Mesh).isMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh && ITEM_SLOTS.find(([re]) => re.test(o.name));
    if (slot) moved.push([o, slot[1]]);
  });
  if (!moved.length) return 0;
  // Bones that move vertices.
  const used = new Set<THREE.Object3D>();
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    const index = m.geometry.getAttribute('skinIndex');
    const weight = m.geometry.getAttribute('skinWeight');
    if (!index || !weight) return;
    for (let i = 0; i < index.count; i++) {
      for (let k = 0; k < 4; k++) if (weight.getComponent(i, k) > 0) used.add(m.skeleton.bones[index.getComponent(i, k)]);
    }
  });
  scene.updateMatrixWorld(true);
  const pos = new THREE.Vector3();
  const pointUnder = (parentName: RegExp): THREE.Object3D | null => {
    let parent: THREE.Object3D | null = null;
    scene.traverse((o) => { if (!parent && (o as THREE.Bone).isBone && parentName.test(o.name)) parent = o; });
    if (!parent) return null;
    // wow.export may put each bone under a pivot node of its own (bone_104_p → bone_104).
    const bones = (parent as THREE.Object3D).children
      .map((c) => ((c as THREE.Bone).isBone ? c : c.children.find((g) => (g as THREE.Bone).isBone)))
      .filter((b): b is THREE.Object3D => !!b && !used.has(b));
    let best: THREE.Object3D | null = null;
    let bestY = -Infinity;
    for (const b of bones) {
      const y = b.getWorldPosition(pos).y;
      if (y > bestY) { best = b; bestY = y; }
    }
    return best;
  };
  let count = 0;
  for (const [mesh, parentName] of moved) {
    const point = pointUnder(parentName);
    if (!point) continue;
    point.add(mesh);
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    count++;
  }
  return count;
}

/** The bones from the chest up (a spine or chest bone and everything under it), or null if the skeleton names none. */
function upperBody(scene: THREE.Object3D): Set<string> | null {
  const find = (re: RegExp) => {
    let hit: THREE.Object3D | null = null;
    scene.traverse((o) => { if (!hit && (o as THREE.Bone).isBone && re.test(o.name)) hit = o; });
    return hit as THREE.Object3D | null;
  };
  // WoW's SpineUp, then the usual rigs' upper spine (spine_02, Spine2), chest, and any spine at all.
  const top = [/spine[\s_.-]*up/i, /spine[\s_.-]*0?[23]\b/i, /upper[\s_.-]*(body|chest)|torso/i, /chest$/i, /spine/i]
    .reduce<THREE.Object3D | null>((hit, re) => hit ?? find(re), null);
  if (!top) return null;
  const names = new Set<string>();
  top.traverse((o) => { if (o.name) names.add(o.name); });
  return names.size > 3 ? names : null;
}
