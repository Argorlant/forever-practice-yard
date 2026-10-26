// Spell and weapon effects: glowing particles, projectiles, lightning, weapon
// trails, shock waves, ground glows and the auras around the player. All of
// it is short-lived and drawn from two particle buffers (light and smoke), so
// a busy rotation stays cheap on a phone.
import * as THREE from 'three';
import type { VfxStyle } from '../engine/types';

export type { VfxStyle };

/** The bright core of a missile and the colours its particles pick from. */
export const STYLES: Record<VfxStyle, { core: number; colors: number[] }> = {
  fire: { core: 0xffd27a, colors: [0xffb030, 0xff7a18, 0xff4a08] },
  frost: { core: 0xd8f4ff, colors: [0x9ad8ff, 0x5ab0ff, 0xd0f0ff] },
  shadow: { core: 0xc890ff, colors: [0x9a40f0, 0x6a20b0, 0xc080ff] },
  arcane: { core: 0xffd8ff, colors: [0xff8cff, 0xc890ff, 0xffffff] },
  holy: { core: 0xfff6cc, colors: [0xffe680, 0xffcf40, 0xffffff] },
  nature: { core: 0xe0ffb0, colors: [0x9af060, 0x5ac838, 0xe8ff9a] },
  lightning: { core: 0xffffff, colors: [0xb8e4ff, 0x7ac4ff, 0xe8f6ff] },
  arrow: { core: 0xfff0d0, colors: [0xe8d8b0, 0xffffff] },
  earth: { core: 0xffe2a8, colors: [0xd0a050, 0xa07838, 0xf0d090] },
  physical: { core: 0xffffff, colors: [0xffffff, 0xfff0c8, 0xffd890] },
  bleed: { core: 0xff5050, colors: [0xc01414, 0xe02828, 0x800a0a] },
  poison: { core: 0xd0ff70, colors: [0x70d838, 0xa8ff48, 0x48a028] },
};

/** A colour hint for missiles that do not name a style (old data, pets). */
export function styleOfColor(color: number): VfxStyle {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const h = hsl.h * 360;
  if (hsl.s < 0.3) return 'arrow';
  if (h < 45) return 'fire';
  if (h < 70) return 'holy';
  if (h < 160) return 'nature';
  if (h < 215) return 'frost';
  if (h < 275) return 'shadow';
  return 'arcane';
}

// ----------------------------------------------------------- particle buffer
const VERT = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aAlpha <= 0.0 ? 0.0 : aSize * uScale / -mv.z;
  gl_Position = projectionMatrix * mv;
  vAlpha = aAlpha;
  vColor = aColor;
}`;
const FRAG_GLOW = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.0, 1.0, r)) * vAlpha;
  // A white-hot centre, the colour around it. Additive blending multiplies by alpha.
  vec3 col = mix(vColor, vec3(1.0), (1.0 - smoothstep(0.0, 0.3, r)) * 0.4);
  gl_FragColor = vec4(col, a);
}`;
const FRAG_SMOKE = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = (1.0 - smoothstep(0.2, 1.0, r)) * vAlpha;
  gl_FragColor = vec4(vColor, a);
}`;

export interface Emit {
  at: THREE.Vector3;
  count: number;
  colors: number[];
  /** Spawn anywhere within this distance of `at` (metres). */
  radius?: number;
  /** Spawn on a horizontal circle of this radius instead (rings, novas). */
  ring?: number;
  speed?: [number, number];
  /** Direction bias; without one particles fly every way. */
  dir?: THREE.Vector3;
  /** 0: exactly along `dir`; 1: any direction. */
  spread?: number;
  life?: [number, number];
  /** Size at birth and at death, in metres. */
  size?: [number, number];
  /** Metres per second squared, down; negative rises. */
  gravity?: number;
  /** Fraction of speed lost per second. */
  drag?: number;
  alpha?: number;
  /** Velocity added to every particle (a missile's own motion). */
  carry?: THREE.Vector3;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)];
const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();
// Scratch for Particles.emit only: callers often pass `tmp` as the spawn point.
const off = new THREE.Vector3();
const dir = new THREE.Vector3();
const axis = new THREE.Vector3();

function randomUnit(out: THREE.Vector3): THREE.Vector3 {
  const z = rand(-1, 1), a = rand(0, Math.PI * 2), r = Math.sqrt(1 - z * z);
  return out.set(r * Math.cos(a), z, r * Math.sin(a));
}

class Particles {
  readonly points: THREE.Points;
  private readonly max: number;
  private pos: Float32Array;
  private col: Float32Array;
  private alpha: Float32Array;
  private size: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private span: Float32Array;
  private size0: Float32Array;
  private size1: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private peak: Float32Array;
  private next = 0;
  private geometry: THREE.BufferGeometry;
  readonly material: THREE.ShaderMaterial;

  constructor(max: number, smoke: boolean) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.alpha = new Float32Array(max);
    this.size = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.span = new Float32Array(max);
    this.size0 = new Float32Array(max);
    this.size1 = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.peak = new Float32Array(max);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 } },
      vertexShader: VERT,
      fragmentShader: smoke ? FRAG_SMOKE : FRAG_GLOW,
      transparent: true,
      depthWrite: false,
      blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = smoke ? 1 : 2;
  }

  emit(o: Emit): void {
    const c = new THREE.Color();
    const ax = o.at.x, ay = o.at.y, az = o.at.z;
    const spread = o.spread ?? 0.3;
    if (o.dir) axis.copy(o.dir).normalize();
    for (let n = 0; n < o.count; n++) {
      const i = this.next;
      this.next = (this.next + 1) % this.max;
      // Where it starts.
      if (o.ring !== undefined) {
        const a = rand(0, Math.PI * 2);
        off.set(Math.cos(a) * o.ring, 0, Math.sin(a) * o.ring);
      } else if (o.radius) {
        randomUnit(off).multiplyScalar(o.radius * Math.cbrt(Math.random()));
      } else off.set(0, 0, 0);
      this.pos[i * 3] = ax + off.x;
      this.pos[i * 3 + 1] = ay + off.y;
      this.pos[i * 3 + 2] = az + off.z;
      // Where it goes: any way, or close to `dir`.
      randomUnit(dir);
      if (o.dir) dir.multiplyScalar(spread).addScaledVector(axis, 1 - spread).normalize();
      const speed = o.speed ? rand(o.speed[0], o.speed[1]) : 0;
      this.vel[i * 3] = dir.x * speed + (o.carry?.x ?? 0);
      this.vel[i * 3 + 1] = dir.y * speed + (o.carry?.y ?? 0);
      this.vel[i * 3 + 2] = dir.z * speed + (o.carry?.z ?? 0);
      const life = o.life ? rand(o.life[0], o.life[1]) : 0.5;
      this.life[i] = life;
      this.span[i] = life;
      this.size0[i] = o.size?.[0] ?? 0.15;
      this.size1[i] = o.size?.[1] ?? 0.02;
      this.size[i] = this.size0[i];
      this.grav[i] = o.gravity ?? 0;
      this.drag[i] = o.drag ?? 0;
      this.peak[i] = o.alpha ?? 1;
      this.alpha[i] = 0.001;
      // Colours are written as sRGB: the shader outputs them as they are.
      c.setHex(pick(o.colors), THREE.LinearSRGBColorSpace);
      this.col[i * 3] = c.r;
      this.col[i * 3 + 1] = c.g;
      this.col[i * 3 + 2] = c.b;
    }
  }

  update(dt: number): void {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const k = 1 - Math.max(0, this.life[i]) / this.span[i]; // 0 at birth, 1 at death
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= d;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.size0[i] + (this.size1[i] - this.size0[i]) * k;
      // Quick to appear, slow to fade.
      this.alpha[i] = this.life[i] <= 0 ? 0 : this.peak[i] * Math.min(1, k * 8) * (1 - k * k);
    }
    for (const name of ['position', 'aColor', 'aAlpha', 'aSize']) this.geometry.getAttribute(name).needsUpdate = true;
  }

  clear(): void { this.life.fill(0); }
}

// ------------------------------------------------------------- textures
function glowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.75)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

/** A ground glow: bright rim, softer middle (Consecration). */
function discTexture(): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.35)');
  grad.addColorStop(0.75, 'rgba(255,255,255,0.45)');
  grad.addColorStop(0.92, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// ------------------------------------------------------------- geometry
/** A crescent that is thick in the middle and sharp at both ends: a weapon trail. */
function crescentGeometry(radius: number, width: number, arc: number, segments = 28): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = -arc / 2 + arc * t;
    const w = Math.sin(Math.PI * t) * width;
    // The leading end is brighter: the blade just passed there.
    const glow = Math.sin(Math.PI * t) * (0.35 + 0.65 * t);
    pos.push(Math.cos(a) * (radius - w * 0.3), Math.sin(a) * (radius - w * 0.3), 0, Math.cos(a) * (radius + w * 0.7), Math.sin(a) * (radius + w * 0.7), 0);
    col.push(glow * 0.35, glow * 0.35, glow * 0.35, glow, glow, glow);
    if (i < segments) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/** A straight streak, sharp at both ends (thrusts and claws). */
function streakGeometry(length: number, width: number, segments = 12): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const x = -length / 2 + length * t;
    const w = Math.sin(Math.PI * t) * width;
    const glow = Math.sin(Math.PI * t);
    pos.push(x, -w / 2, 0, x, w / 2, 0);
    col.push(glow, glow, glow, glow, glow, glow);
    if (i < segments) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// --------------------------------------------------------------- effects
/** Something drawn for a while: it updates itself and says when it is done. */
interface Live { update(dt: number): boolean; dispose(): void }

export interface Missile {
  readonly style: VfxStyle;
  /** The hit it carries, once known: the impact shows the crit, or a fizzle for a resist. */
  outcome?: string;
}

export type StrikeKind = 'arc' | 'wide' | 'thrust' | 'claw' | 'smash';

export class Vfx {
  private glow = new Particles(2600, false);
  private smoke = new Particles(500, true);
  private lives: Live[] = [];
  private glowTex = glowTexture();
  private discTex = discTexture();
  private arcGeo = crescentGeometry(0.75, 0.32, 2.3);
  private wideGeo = crescentGeometry(1.25, 0.4, 3.0);
  private streakGeo = streakGeometry(1.2, 0.12);
  private ringGeo = new THREE.RingGeometry(0.86, 1, 64);
  private sphereGeo = new THREE.SphereGeometry(1, 24, 16);
  private arrowGeo: THREE.BufferGeometry;
  private auraEmit = new Map<string, number>();
  /** Slow motion for checking effects by eye (the debug handle); 1 in play. */
  timeScale = 1;

  constructor(private scene: THREE.Scene) {
    scene.add(this.smoke.points, this.glow.points);
    // An arrow along +Z: the shaft, then the head.
    const shaft = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 5).rotateX(Math.PI / 2);
    const head = new THREE.ConeGeometry(0.035, 0.12, 5).rotateX(Math.PI / 2).translate(0, 0, 0.41);
    this.arrowGeo = mergeGeometries([shaft, head]);
  }

  // ------------------------------------------------------------ basics
  emit(o: Emit): void { this.glow.emit(o); }
  puff(o: Emit): void { this.smoke.emit(o); }

  /** A soft light that blooms and fades where something landed. */
  flash(at: THREE.Vector3, color: number, size = 1, duration = 0.25): void {
    const mat = new THREE.SpriteMaterial({ map: this.glowTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    const s = new THREE.Sprite(mat);
    s.position.copy(at);
    s.renderOrder = 3;
    this.scene.add(s);
    let t = 0;
    this.lives.push({
      update: (dt) => {
        t += dt / duration;
        s.scale.setScalar(size * (0.6 + 0.6 * Math.min(1, t * 3)));
        mat.opacity = Math.max(0, 1 - t);
        return t < 1;
      },
      dispose: () => { this.scene.remove(s); mat.dispose(); },
    });
  }

  // ---------------------------------------------------------- impacts
  /** Where a spell or a blow lands: a burst in the style's colours. Crits are bigger. */
  impact(at: THREE.Vector3, style: VfxStyle, opts: { crit?: boolean; small?: boolean } = {}): void {
    const s = STYLES[style];
    const k = (opts.crit ? 1.6 : 1) * (opts.small ? 0.45 : 1);
    const n = (x: number) => Math.max(1, Math.round(x * k));
    switch (style) {
      case 'fire':
        this.flash(at, 0xff9a30, 1.6 * k);
        this.emit({ at, count: n(26), colors: s.colors, radius: 0.15, speed: [1.2, 3.4], life: [0.35, 0.7], size: [0.32, 0.05], gravity: -2, drag: 2.5 });
        this.emit({ at, count: n(12), colors: [0xffd060, 0xffffff], speed: [2.5, 5], life: [0.4, 0.8], size: [0.06, 0.02], gravity: 6, drag: 0.5 });
        this.puff({ at, count: n(6), colors: [0x2a2420, 0x3a3028], radius: 0.2, speed: [0.3, 0.8], life: [0.6, 1.1], size: [0.3, 0.7], gravity: -1, alpha: 0.35 });
        break;
      case 'frost':
        this.flash(at, 0xbfe8ff, 1.3 * k);
        this.emit({ at, count: n(22), colors: s.colors, speed: [2.2, 4.5], life: [0.25, 0.5], size: [0.13, 0.02], gravity: 5, drag: 1.5 });
        this.puff({ at, count: n(8), colors: [0xdff4ff, 0xc0e4ff], radius: 0.25, speed: [0.2, 0.6], life: [0.7, 1.2], size: [0.35, 0.8], alpha: 0.35 });
        break;
      case 'shadow':
        this.flash(at, 0x8a30e0, 1.4 * k);
        this.emit({ at, count: n(22), colors: s.colors, radius: 0.1, speed: [1.5, 3.2], life: [0.35, 0.7], size: [0.28, 0.06], gravity: -1.2, drag: 3 });
        this.puff({ at, count: n(8), colors: [0x1a0828, 0x2a1040], radius: 0.25, speed: [0.3, 0.9], life: [0.6, 1.0], size: [0.3, 0.7], gravity: -0.8, alpha: 0.5 });
        break;
      case 'arcane':
        this.flash(at, 0xff90ff, 1.4 * k);
        this.emit({ at, count: n(24), colors: s.colors, speed: [2, 4.2], life: [0.3, 0.65], size: [0.16, 0.03], drag: 2.5 });
        this.emit({ at, count: n(8), colors: [0xffffff, 0xffc8ff], radius: 0.5, life: [0.4, 0.8], size: [0.1, 0.0] });
        break;
      case 'holy':
        this.flash(at, 0xffe070, 1.6 * k);
        this.emit({ at, count: n(20), colors: s.colors, speed: [1.8, 3.6], life: [0.3, 0.6], size: [0.2, 0.03], drag: 2.5 });
        // A short column of light through the target.
        this.emit({ at: tmp.copy(at).setY(0.1), count: n(16), colors: [0xfff0b0, 0xffffff], radius: 0.25, speed: [3, 6], dir: new THREE.Vector3(0, 1, 0), spread: 0.05, life: [0.3, 0.55], size: [0.18, 0.03] });
        break;
      case 'nature':
        this.flash(at, 0x9af060, 1.3 * k);
        this.emit({ at, count: n(20), colors: s.colors, speed: [1.5, 3.4], life: [0.35, 0.7], size: [0.18, 0.03], gravity: 1.5, drag: 2.5 });
        this.emit({ at, count: n(8), colors: [0x6ad040, 0xa8e860], radius: 0.4, speed: [0.3, 1], life: [0.8, 1.3], size: [0.1, 0.06], gravity: 0.8, drag: 1 });
        break;
      case 'lightning':
        this.flash(at, 0xcfeeff, 1.7 * k, 0.18);
        this.emit({ at, count: n(22), colors: s.colors, speed: [3.5, 7], life: [0.12, 0.3], size: [0.1, 0.02], drag: 3 });
        break;
      case 'earth':
        this.flash(at, 0xffd080, 1.1 * k);
        this.emit({ at, count: n(14), colors: s.colors, speed: [2, 4], life: [0.4, 0.7], size: [0.12, 0.05], gravity: 9, drag: 0.5 });
        this.puff({ at, count: n(10), colors: [0x7a6448, 0x9a8060], radius: 0.25, speed: [0.5, 1.3], life: [0.6, 1.1], size: [0.3, 0.8], gravity: -0.4, alpha: 0.45 });
        break;
      case 'bleed':
        this.emit({ at, count: n(10), colors: s.colors, radius: 0.15, speed: [1, 2.6], life: [0.4, 0.7], size: [0.09, 0.05], gravity: 9 });
        break;
      case 'poison':
        this.emit({ at, count: n(10), colors: s.colors, radius: 0.3, speed: [0.3, 0.9], dir: new THREE.Vector3(0, 1, 0), spread: 0.6, life: [0.5, 0.9], size: [0.1, 0.16], alpha: 0.8 });
        break;
      case 'arrow':
      case 'physical':
        if (opts.crit) this.flash(at, 0xfff0d0, 0.9, 0.15);
        this.emit({ at, count: n(9), colors: s.colors, speed: [3, 6], life: [0.1, 0.25], size: [0.07, 0.01], gravity: 8, drag: 2 });
        break;
    }
  }

  /** A resisted spell: a little fizzle instead of the burst. */
  fizzle(at: THREE.Vector3, style: VfxStyle): void {
    this.emit({ at, count: 6, colors: STYLES[style].colors, radius: 0.25, speed: [0.3, 0.8], life: [0.3, 0.5], size: [0.1, 0.0], alpha: 0.6 });
  }

  /** A damage-over-time tick: a small puff of its school. */
  tick(at: THREE.Vector3, style: VfxStyle): void {
    if (style === 'bleed') {
      this.emit({ at, count: 5, colors: STYLES.bleed.colors, radius: 0.25, speed: [0.3, 1], life: [0.4, 0.7], size: [0.07, 0.05], gravity: 9 });
      return;
    }
    const s = STYLES[style];
    this.emit({ at, count: 8, colors: s.colors, radius: 0.35, speed: [0.3, 1.1], dir: new THREE.Vector3(0, 1, 0), spread: 0.7, life: [0.4, 0.8], size: [0.16, 0.03], gravity: style === 'fire' || style === 'shadow' ? -1 : 0 });
  }

  // ---------------------------------------------------------- weapons
  /**
   * A weapon's trail where a blow lands, facing the striker: an arc for a
   * swing, a long one for a cleave, a streak for a thrust, three for claws.
   */
  strike(at: THREE.Vector3, from: THREE.Vector3, color: number, kind: StrikeKind = 'arc', crit = false): void {
    const group = new THREE.Group();
    group.position.copy(at);
    group.lookAt(tmp.copy(from).setY(at.y));
    const mats: THREE.MeshBasicMaterial[] = [];
    const add = (geo: THREE.BufferGeometry, setup: (m: THREE.Mesh) => void) => {
      const mat = new THREE.MeshBasicMaterial({ color, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const m = new THREE.Mesh(geo, mat);
      setup(m);
      group.add(m);
      mats.push(mat);
    };
    const tilt = rand(-0.9, 0.9);
    if (kind === 'claw') {
      for (let i = -1; i <= 1; i++) add(this.streakGeo, (m) => { m.rotation.z = -0.9 + rand(-0.1, 0.1); m.position.set(i * 0.16, i * 0.12, 0.05); m.scale.set(0.8, 1, 1); });
    } else if (kind === 'thrust') {
      // A short stab, slightly askew, with a flash where the point goes in.
      add(this.streakGeo, (m) => { m.rotation.z = rand(-0.5, 0.5); m.position.z = 0.15; m.scale.set(0.75, 1.8, 1); });
      this.flash(at, color, 0.7, 0.15);
    } else if (kind === 'wide') {
      // Flat, centred on the striker's side: the blade's path around them, through the target.
      add(this.wideGeo, (m) => { m.rotation.x = -Math.PI / 2; m.rotation.z = Math.PI / 2; m.position.z = 1.1; });
    } else {
      add(this.arcGeo, (m) => { m.rotation.z = tilt + Math.PI / 2; m.position.z = 0.15; });
    }
    group.scale.setScalar(crit ? 1.3 : 1);
    this.scene.add(group);
    let t = 0;
    const duration = kind === 'wide' ? 0.3 : 0.22;
    const spin = kind === 'arc' ? (Math.random() < 0.5 ? -1 : 1) * 1.2 : 0;
    this.lives.push({
      update: (dt) => {
        t += dt / duration;
        const s = (crit ? 1.3 : 1) * (0.75 + 0.45 * t);
        group.scale.setScalar(s);
        if (spin) group.children[0].rotation.z += spin * dt / duration * 0.4;
        for (const m of mats) m.opacity = Math.max(0, 1 - t * t);
        return t < 1;
      },
      dispose: () => { this.scene.remove(group); for (const m of mats) m.dispose(); },
    });
    if (kind === 'smash') {
      this.puff({ at: tmp.copy(at).setY(0.1), count: 10, colors: [0x8a7a68, 0xa09080], ring: 0.4, speed: [0.6, 1.4], life: [0.5, 0.9], size: [0.3, 0.7], alpha: 0.4 });
    }
    this.emit({ at, count: crit ? 14 : 7, colors: [color, 0xffffff], speed: [2.5, 5.5], life: [0.12, 0.28], size: [0.07, 0.01], gravity: 8, drag: 2 });
    if (crit) this.flash(at, color, 1.1, 0.18);
  }

  /** Whirlwind: the blade sweeps twice around the player at waist height. */
  spin(at: THREE.Vector3, color = 0xe8e8ff): void {
    const group = new THREE.Group();
    group.position.copy(at);
    const mats: THREE.MeshBasicMaterial[] = [];
    for (const k of [0, Math.PI]) {
      const mat = new THREE.MeshBasicMaterial({ color, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const m = new THREE.Mesh(this.wideGeo, mat);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = k;
      m.scale.setScalar(1.25);
      group.add(m);
      mats.push(mat);
    }
    this.scene.add(group);
    let t = 0;
    this.lives.push({
      update: (dt) => {
        t += dt / 0.55;
        group.rotation.y -= dt * 22;
        for (const m of mats) m.opacity = Math.max(0, 1 - t * t);
        return t < 1;
      },
      dispose: () => { this.scene.remove(group); for (const m of mats) m.dispose(); },
    });
  }

  // ------------------------------------------------------- shock waves
  /** A ring that races out to `radius` metres: Thunder Clap, shouts, novas. */
  wave(at: THREE.Vector3, radius: number, color: number, opts: { duration?: number; flat?: boolean; opacity?: number } = {}): void {
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opts.opacity ?? 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const m = new THREE.Mesh(this.ringGeo, mat);
    if (opts.flat !== false) m.rotation.x = -Math.PI / 2;
    m.position.copy(at);
    m.scale.setScalar(0.3);
    this.scene.add(m);
    let t = 0;
    const duration = opts.duration ?? 0.45;
    const peak = mat.opacity;
    this.lives.push({
      update: (dt) => {
        t += dt / duration;
        const e = 1 - (1 - Math.min(1, t)) ** 3;
        m.scale.setScalar(0.3 + (radius - 0.3) * e);
        mat.opacity = peak * Math.max(0, 1 - t);
        return t < 1;
      },
      dispose: () => { this.scene.remove(m); mat.dispose(); },
    });
  }

  /** Fire Nova, Magma Totem, Holy Nova: a wave with its element along the rim. */
  nova(at: THREE.Vector3, radius: number, style: VfxStyle): void {
    const s = STYLES[style];
    this.wave(tmp2.copy(at).setY(0.15), radius, s.colors[0], { duration: 0.5 });
    const ground = new THREE.Vector3(at.x, 0.2, at.z);
    for (const r of [0.35, 0.6, 0.85]) {
      this.emit({ at: ground, count: Math.round(10 + radius * 3 * r), colors: s.colors, ring: radius * r, speed: [0.5, 1.5], dir: new THREE.Vector3(0, 1, 0), spread: 0.4, life: [0.35, 0.7], size: [0.35, 0.05], gravity: style === 'fire' ? -2 : 0 });
    }
  }

  /** Thunder Clap: dust thrown out of the ground and a crack of blue-white light. */
  thunderClap(at: THREE.Vector3, radius: number): void {
    this.wave(new THREE.Vector3(at.x, 0.12, at.z), radius, 0xcfe4ff, { duration: 0.4 });
    this.flash(new THREE.Vector3(at.x, 0.4, at.z), 0xcfe4ff, 2.2, 0.2);
    this.puff({ at: new THREE.Vector3(at.x, 0.15, at.z), count: 26, colors: [0x8a7a68, 0x9a8a78, 0x6a5e50], ring: 0.6, speed: [2, 4], dir: new THREE.Vector3(0, 0.25, 0), spread: 1, life: [0.6, 1.1], size: [0.35, 0.9], drag: 3, alpha: 0.45 });
    this.emit({ at: new THREE.Vector3(at.x, 0.3, at.z), count: 18, colors: [0xcfe4ff, 0xffffff], ring: 0.4, speed: [4, 7], life: [0.15, 0.3], size: [0.08, 0.01], drag: 2 });
  }

  /** A shout or a roar: rings at chest height, one after the other. */
  shout(at: THREE.Vector3, color: number): void {
    const chest = new THREE.Vector3(at.x, at.y + 1.3, at.z);
    this.wave(chest, 4, color, { duration: 0.5, opacity: 0.6 });
    this.lives.push(this.delay(0.12, () => this.wave(chest, 3, color, { duration: 0.45, opacity: 0.45 })));
    this.emit({ at: chest, count: 14, colors: [color, 0xffffff], radius: 0.3, speed: [2, 4], life: [0.25, 0.45], size: [0.12, 0.02], drag: 2 });
  }

  // ------------------------------------------------------------ buffs
  /** A buff taking hold: motes rising around the player. */
  buff(feet: THREE.Vector3, colors: number[]): void {
    this.emit({ at: tmp.copy(feet).setY(feet.y + 0.1), count: 34, colors, ring: 0.5, speed: [0.4, 1], dir: new THREE.Vector3(0, 1, 0), spread: 0.2, life: [0.6, 1.1], size: [0.14, 0.02], gravity: -3 });
    this.wave(tmp2.copy(feet).setY(feet.y + 0.06), 1.1, colors[0], { duration: 0.5, opacity: 0.6 });
  }

  /** Vanish, Stealth: a puff of smoke. */
  smokeBomb(feet: THREE.Vector3): void {
    this.puff({ at: tmp.copy(feet).setY(feet.y + 0.8), count: 40, colors: [0x50504a, 0x6a6a64, 0x3a3a36], radius: 0.6, speed: [0.5, 1.8], life: [0.8, 1.4], size: [0.5, 1.2], drag: 1.5, gravity: -0.3, alpha: 0.6 });
  }

  /** Light gathering in the caster's hands while a spell is cast. */
  castGlow(hand: THREE.Vector3, style: VfxStyle, dt: number): void {
    const s = STYLES[style];
    const n = Math.floor(dt * 70 + Math.random());
    for (let i = 0; i < n; i++) {
      // Spawn around the hand and fall into it.
      const off = randomUnit(new THREE.Vector3()).multiplyScalar(rand(0.2, 0.36));
      this.emit({ at: tmp.copy(hand).add(off), count: 1, colors: s.colors, carry: off.clone().multiplyScalar(-2.6), life: [0.3, 0.38], size: [0.08, 0.16] });
    }
    // The light in the palm, flickering.
    this.emit({ at: hand, count: 1, colors: [s.core, s.colors[0]], life: [0.08, 0.12], size: [rand(0.3, 0.42), 0.25], alpha: 0.9 });
  }

  /** The spell leaves the hands. */
  release(hand: THREE.Vector3, style: VfxStyle): void {
    this.flash(hand, STYLES[style].colors[0], 0.7, 0.18);
    this.emit({ at: hand, count: 8, colors: STYLES[style].colors, speed: [1, 2.4], life: [0.15, 0.3], size: [0.08, 0.01], drag: 3 });
  }

  /** A stream from one point to another (Drain Life, Mind Flay), for one frame's worth. */
  stream(from: THREE.Vector3, to: THREE.Vector3, colors: number[], dt: number, speed = 9): void {
    const d = tmp.copy(to).sub(from);
    const len = d.length();
    if (len < 0.1) return;
    d.divideScalar(len);
    const n = Math.floor(dt * 120 + Math.random());
    for (let i = 0; i < n; i++) {
      const jitter = randomUnit(new THREE.Vector3()).multiplyScalar(0.08);
      this.emit({ at: from.clone().add(jitter), count: 1, colors, carry: d.clone().multiplyScalar(speed), life: [len / speed, len / speed], size: [0.2, 0.12] });
    }
  }

  /**
   * Particles drifting around the body while an aura lasts (Shadowform,
   * Recklessness). `key` keeps the emission rate steady from frame to frame.
   */
  aura(key: string, center: THREE.Vector3, colors: number[], dt: number, rate = 10, size = 0.12, radius = 0.45): void {
    const acc = (this.auraEmit.get(key) ?? Math.random()) + dt * rate;
    const n = Math.floor(acc);
    this.auraEmit.set(key, acc - n);
    if (n > 0) this.emit({ at: center, count: n, colors, radius, speed: [0.1, 0.4], dir: new THREE.Vector3(0, 1, 0), spread: 0.5, life: [0.6, 1.1], size: [size, 0.02], gravity: -0.6 });
  }

  /** Orbs circling the player (Lightning Shield): one glow each, drawn this frame only. */
  orbs(center: THREE.Vector3, count: number, t: number, colors: number[]): void {
    for (let i = 0; i < count; i++) {
      const a = t * 2.2 + (i / count) * Math.PI * 2;
      const at = tmp.set(center.x + Math.cos(a) * 0.62, center.y + Math.sin(t * 3 + i) * 0.12, center.z + Math.sin(a) * 0.62);
      this.emit({ at, count: 1, colors: [0xffffff], life: [0.05, 0.05], size: [0.32, 0.3] });
      if (Math.random() < 0.5) this.emit({ at, count: 1, colors, speed: [0.5, 1.5], life: [0.1, 0.2], size: [0.06, 0.01] });
    }
  }

  // ------------------------------------------------------------ ground
  /** A glow on the ground for `duration` seconds, with motes rising from it (Consecration). */
  ground(at: THREE.Vector3, radius: number, style: VfxStyle, duration: number): void {
    const s = STYLES[style];
    const mat = new THREE.MeshBasicMaterial({ map: this.discTex, color: s.colors[0], transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), mat);
    m.rotation.x = -Math.PI / 2;
    // On the floor where it is (a place of your own has slopes and steps).
    m.position.set(at.x, at.y + 0.03, at.z);
    this.scene.add(m);
    let t = 0;
    const area = Math.PI * radius * radius;
    this.lives.push({
      update: (dt) => {
        t += dt;
        const fade = Math.min(1, t * 4) * Math.min(1, (duration - t) * 2);
        mat.opacity = Math.max(0, fade) * (0.32 + 0.08 * Math.sin(t * 5));
        const n = Math.floor(dt * area * 0.9 + Math.random());
        for (let i = 0; i < n; i++) {
          const a = rand(0, Math.PI * 2), r = radius * Math.sqrt(Math.random());
          this.emit({ at: tmp.set(at.x + Math.cos(a) * r, 0.05, at.z + Math.sin(a) * r), count: 1, colors: s.colors, speed: [0.6, 1.4], dir: new THREE.Vector3(0, 1, 0), spread: 0.05, life: [0.6, 1.1], size: [0.12, 0.02], alpha: Math.max(0, fade) });
        }
        return t < duration;
      },
      dispose: () => { this.scene.remove(m); m.geometry.dispose(); mat.dispose(); },
    });
  }

  /** A bubble around the player while it lasts (Holy Shield): `strength` 0 hides it. */
  private bubble: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; pulse: number } | null = null;
  shield(center: THREE.Vector3 | null, color: number, pulse = false): void {
    if (!center) {
      if (this.bubble) this.bubble.mesh.visible = false;
      return;
    }
    if (!this.bubble) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide, toneMapped: false });
      const mesh = new THREE.Mesh(this.sphereGeo, mat);
      mesh.scale.set(0.85, 1.15, 0.85);
      this.scene.add(mesh);
      this.bubble = { mesh, mat, pulse: 0 };
    }
    const b = this.bubble;
    b.mesh.visible = true;
    b.mesh.position.copy(center);
    b.mat.color.setHex(color);
    if (pulse) b.pulse = 1;
  }

  // ---------------------------------------------------------- missiles
  /**
   * A missile from `from` to a moving target point, arriving after `duration`
   * seconds. Lightning strikes at once; a spell from the sky falls fast.
   */
  missile(o: { style: VfxStyle; from: THREE.Vector3; to: () => THREE.Vector3; duration: number; size?: number; fromSky?: boolean }): Missile {
    const style = o.style;
    const s = STYLES[style];
    const m: Missile & { t: number } = { style, t: 0 };
    const size = o.size ?? 0.13;
    let core: THREE.Object3D | null = null;
    let coreMat: THREE.Material | null = null;
    if (style === 'arrow') {
      const mat = new THREE.MeshBasicMaterial({ color: 0xd8c8a8 });
      core = new THREE.Mesh(this.arrowGeo, mat);
      coreMat = mat;
    } else if (style !== 'lightning') {
      const mat = new THREE.SpriteMaterial({ map: this.glowTex, color: s.core, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
      core = new THREE.Sprite(mat);
      core.scale.setScalar(size * 5);
      coreMat = mat;
    }
    if (core) { core.position.copy(o.from); this.scene.add(core); }
    if (style === 'lightning') this.lightning(o.from, o.to(), s.colors);
    const duration = style === 'lightning' ? 0.05 : Math.max(0.05, o.duration);
    const last = o.from.clone();
    const pos = new THREE.Vector3();
    let trail = 0;
    this.lives.push({
      update: (dt) => {
        m.t += dt / duration;
        const k = Math.min(1, m.t);
        const to = o.to();
        pos.lerpVectors(o.from, to, k);
        if (core) {
          core.position.copy(pos);
          if (style === 'arrow') core.lookAt(to);
          else core.scale.setScalar(size * (4.5 + Math.sin(m.t * 40) * 0.6));
        }
        // The trail: particles left behind every few centimetres.
        trail += pos.distanceTo(last);
        last.copy(pos);
        const step = style === 'arrow' ? 0.18 : o.fromSky ? 0.12 : 0.06;
        while (trail > step && style !== 'lightning') {
          trail -= step;
          this.trail(pos, style, size);
        }
        if (k >= 1) {
          if (m.outcome === 'resist' || m.outcome === 'miss') this.fizzle(to, style);
          else this.impact(to, style, { crit: m.outcome === 'crit', small: style === 'arrow' ? false : size < 0.1 });
          return false;
        }
        return true;
      },
      dispose: () => { if (core) this.scene.remove(core); coreMat?.dispose(); },
    });
    return m;
  }

  private trail(at: THREE.Vector3, style: VfxStyle, size: number): void {
    const s = STYLES[style];
    const k = size / 0.13;
    switch (style) {
      case 'fire':
        this.emit({ at, count: 2, colors: s.colors, radius: 0.04 * k, speed: [0.2, 0.6], life: [0.14, 0.28], size: [0.24 * k, 0.04], gravity: -1.5 });
        if (Math.random() < 0.3) this.puff({ at, count: 1, colors: [0x2a2420], speed: [0.1, 0.3], life: [0.5, 0.8], size: [0.15 * k, 0.4 * k], gravity: -0.6, alpha: 0.25 });
        break;
      case 'frost':
        this.emit({ at, count: 2, colors: s.colors, radius: 0.05 * k, speed: [0.2, 0.7], life: [0.2, 0.35], size: [0.1 * k, 0.01], gravity: 1 });
        break;
      case 'shadow':
        this.emit({ at, count: 2, colors: s.colors, radius: 0.05 * k, speed: [0.2, 0.6], life: [0.18, 0.35], size: [0.22 * k, 0.05], gravity: -0.5 });
        if (Math.random() < 0.4) this.puff({ at, count: 1, colors: [0x1a0828], speed: [0.1, 0.3], life: [0.4, 0.7], size: [0.15 * k, 0.35 * k], alpha: 0.4 });
        break;
      case 'arrow':
        this.emit({ at, count: 1, colors: s.colors, life: [0.1, 0.15], size: [0.05, 0.01], alpha: 0.5 });
        break;
      default:
        this.emit({ at, count: 2, colors: s.colors, radius: 0.04 * k, speed: [0.2, 0.7], life: [0.16, 0.3], size: [0.14 * k, 0.02] });
    }
  }

  /** A jagged bolt of light between two points, with a fork or two. */
  lightning(from: THREE.Vector3, to: THREE.Vector3, colors: number[]): void {
    const path = (a: THREE.Vector3, b: THREE.Vector3, jag: number, density: number) => {
      const len = a.distanceTo(b);
      const segs = Math.max(3, Math.round(len / 0.55));
      let prev = a.clone();
      const pts: THREE.Vector3[] = [prev];
      for (let i = 1; i <= segs; i++) {
        const t = i / segs;
        const p = new THREE.Vector3().lerpVectors(a, b, t);
        if (i < segs) p.add(randomUnit(tmp).multiplyScalar(jag * Math.sin(Math.PI * t)));
        // Dense particles along each segment make the line.
        const d = p.distanceTo(prev);
        const n = Math.max(2, Math.round(d / density));
        for (let j = 0; j < n; j++) {
          tmp2.lerpVectors(prev, p, j / n);
          this.emit({ at: tmp2, count: 1, colors, life: [0.14, 0.22], size: [0.17, 0.09], alpha: 0.85 });
          // A wider, fainter halo around the bolt.
          if (j % 5 === 0) this.emit({ at: tmp2, count: 1, colors, life: [0.1, 0.16], size: [0.45, 0.35], alpha: 0.14 });
        }
        pts.push(p);
        prev = p;
      }
      return pts;
    };
    const main = path(from, to, 0.35, 0.065);
    for (let f = 0; f < 2; f++) {
      const start = main[1 + Math.floor(Math.random() * (main.length - 2))];
      const end = start.clone().add(randomUnit(new THREE.Vector3()).multiplyScalar(rand(0.6, 1.3)));
      path(start, end, 0.2, 0.09);
    }
    this.flash(from, colors[0], 0.8, 0.15);
  }

  // ------------------------------------------------------------ frame
  private delay(seconds: number, fn: () => void): Live {
    let t = 0;
    return { update: (dt) => { t += dt; if (t >= seconds) { fn(); return false; } return true; }, dispose: () => {} };
  }

  update(dt: number, camera: THREE.PerspectiveCamera, height: number): void {
    dt *= this.timeScale;
    // Size in pixels of one metre seen from one metre away.
    const scale = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    this.glow.material.uniforms.uScale.value = scale;
    this.smoke.material.uniforms.uScale.value = scale;
    for (let i = this.lives.length - 1; i >= 0; i--) {
      if (!this.lives[i].update(dt)) {
        this.lives[i].dispose();
        this.lives.splice(i, 1);
      }
    }
    if (this.bubble) {
      const b = this.bubble;
      b.pulse = Math.max(0, b.pulse - dt * 3);
      b.mat.opacity = 0.09 + 0.3 * b.pulse;
    }
    this.glow.update(dt);
    this.smoke.update(dt);
  }

  /** Everything off (a reset). */
  clear(): void {
    for (const l of this.lives) l.dispose();
    this.lives = [];
    this.glow.clear();
    this.smoke.clear();
    this.shield(null, 0);
  }
}

/** Joins non-indexed and indexed geometries with the same attributes (position and normal) into one. */
function mergeGeometries(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const parts = list.map((g) => (g.index ? g.toNonIndexed() : g));
  const count = parts.reduce((n, g) => n + g.getAttribute('position').count, 0);
  const pos = new Float32Array(count * 3);
  let o = 0;
  for (const g of parts) {
    const a = g.getAttribute('position').array as Float32Array;
    pos.set(a, o);
    o += a.length;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return out;
}
