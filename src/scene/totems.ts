// Shaman totems in the yard: a carved wooden post per element slot, with the
// element's colour and a top that tells them apart (a flame for Fire, stones
// for Earth, wings for Air, an orb for Water). They pop up where you dropped
// them, around your feet, and sink away when they expire or are replaced.
import * as THREE from 'three';

type Top = 'flame' | 'stone' | 'wings' | 'orb';
interface Style { band: number; glow: number; top: Top; big?: boolean }

const STYLES: Record<string, Style> = {
  searingTotem: { band: 0xc8501e, glow: 0xff7a1a, top: 'flame' },
  magmaTotem: { band: 0x8a1e10, glow: 0xff3a10, top: 'flame', big: true },
  strengthOfEarthTotem: { band: 0x6a8a2a, glow: 0xa8d04a, top: 'stone' },
  stoneskinTotem: { band: 0x7a7a70, glow: 0xc8c8b8, top: 'stone' },
  graceOfAirTotem: { band: 0x5ac8c8, glow: 0xa0ffff, top: 'wings' },
  windfuryTotem: { band: 0xd8e8ff, glow: 0xe8f4ff, top: 'wings' },
  manaSpringTotem: { band: 0x2a6ad0, glow: 0x5aa0ff, top: 'orb' },
};

/** Where each slot stands around your feet: [sideways, forward] in metres, turned with your facing at the drop. */
const SPOTS: Record<string, [number, number]> = { fire: [1.05, 0.6], earth: [-1.05, 0.6], air: [1.5, -0.2], water: [-1.5, -0.2] };

interface Live { group: THREE.Group; animated: THREE.Object3D[]; top: Top; age: number; dying: number; phase: number }

const wood = new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 0.9 });
const darkWood = new THREE.MeshStandardMaterial({ color: 0x3a2614, roughness: 0.9 });
const earth = new THREE.MeshStandardMaterial({ color: 0x4a3a24, roughness: 1 });

export class Totems {
  private live = new Map<string, Live>();
  private leaving: Live[] = [];

  constructor(private scene: THREE.Scene) {}

  /** Puts a totem in a slot (or empties it with `id` null). */
  set(slot: string, id: string | null, x: number, z: number, facing: number): void {
    const old = this.live.get(slot);
    if (old) {
      this.live.delete(slot);
      old.dying = 0.001;
      this.leaving.push(old);
    }
    const style = id ? STYLES[id] : undefined;
    if (!style) return;
    const [side, fwd] = SPOTS[slot] ?? [0, 0];
    const sin = Math.sin(facing), cos = Math.cos(facing);
    const t = this.build(style);
    // Forward is (sin f, cos f); sideways is (cos f, -sin f).
    t.group.position.set(x + fwd * sin + side * cos, 0, z + fwd * cos - side * sin);
    t.group.rotation.y = facing;
    t.group.scale.setScalar(0.001);
    this.scene.add(t.group);
    this.live.set(slot, t);
  }

  /** The head of your totem in a slot, where its attacks and novas start; the drop point if the slot is empty. */
  head(slot: string, x: number, z: number): THREE.Vector3 {
    const t = this.live.get(slot);
    return t ? t.group.position.clone().setY(0.95) : new THREE.Vector3(x, 0.95, z);
  }

  /** Removes every totem at once (a reset). */
  clear(): void {
    for (const t of [...this.live.values(), ...this.leaving]) this.dispose(t);
    this.live.clear();
    this.leaving = [];
  }

  update(dt: number, elapsed: number): void {
    for (const t of this.live.values()) {
      t.age += dt;
      // Pop up over a quarter second with a small overshoot.
      const k = Math.min(1, t.age / 0.25);
      t.group.scale.setScalar(k < 1 ? 1.1 * Math.sin((k * Math.PI) / 2) : 1);
      this.animate(t, elapsed);
    }
    for (let i = this.leaving.length - 1; i >= 0; i--) {
      const t = this.leaving[i];
      t.dying += dt;
      const k = Math.min(1, t.dying / 0.3);
      t.group.position.y = -0.9 * k;
      t.group.scale.setScalar(1 - 0.5 * k);
      if (k >= 1) {
        this.dispose(t);
        this.leaving.splice(i, 1);
      }
    }
  }

  private animate(t: Live, elapsed: number): void {
    const s = elapsed + t.phase;
    if (t.top === 'flame') {
      for (const [i, o] of t.animated.entries()) {
        const f = 1 + 0.12 * Math.sin(s * 11 + i * 2.1) + 0.06 * Math.sin(s * 23 + i);
        o.scale.set(1 / Math.sqrt(f), f, 1 / Math.sqrt(f));
      }
    } else if (t.top === 'wings') {
      t.animated.forEach((o, i) => { o.rotation.z = (i === 0 ? 1 : -1) * (0.35 + 0.25 * Math.sin(s * 4)); });
    } else if (t.top === 'orb') {
      for (const o of t.animated) o.position.y = 1.16 + 0.04 * Math.sin(s * 2.5);
    }
  }

  private build(style: Style): Live {
    const g = new THREE.Group();
    const shadowed = (m: THREE.Mesh) => { m.castShadow = true; return m; };
    const band = new THREE.MeshStandardMaterial({ color: style.band, roughness: 0.6 });
    const glow = new THREE.MeshBasicMaterial({ color: style.glow, transparent: true, opacity: 0.85 });
    const h = style.big ? 1.1 : 1;

    // A mound of earth, the post, two coloured bands and a carved head.
    const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.08, 12), earth);
    mound.position.y = 0.04;
    mound.receiveShadow = true;
    g.add(mound);
    const post = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.085, 0.82 * h, 10), wood));
    post.position.y = 0.41 * h;
    g.add(post);
    for (const y of [0.3, 0.62]) {
      const ring = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.06, 12), band));
      ring.position.y = y * h;
      g.add(ring);
    }
    const head = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.24, 0.17), wood));
    head.position.y = 0.9 * h;
    g.add(head);
    // The face: brow, eyes that glow in the element's colour, an open mouth.
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.05), darkWood);
    brow.position.set(0, 0.96 * h, 0.08);
    g.add(brow);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.03, 0.02), glow);
      eye.position.set(s * 0.05, 0.92 * h, 0.088);
      g.add(eye);
    }
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.02), darkWood);
    mouth.position.set(0, 0.84 * h, 0.088);
    g.add(mouth);
    // A soft ring of the element's colour on the ground.
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.22, 0.32, 24), new THREE.MeshBasicMaterial({ color: style.glow, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.012;
    g.add(halo);

    const animated: THREE.Object3D[] = [];
    const top = 1.02 * h;
    if (style.top === 'flame') {
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 10), new THREE.MeshBasicMaterial({ color: style.glow, transparent: true, opacity: 0.8 }));
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
      for (const [m, y] of [[outer, 0.13], [inner, 0.08]] as const) {
        m.geometry.translate(0, y, 0);
        m.position.y = top;
        g.add(m);
        animated.push(m);
      }
    } else if (style.top === 'stone') {
      const stone = new THREE.MeshStandardMaterial({ color: style.band, roughness: 1 });
      const a = shadowed(new THREE.Mesh(new THREE.DodecahedronGeometry(0.075, 0), stone));
      a.position.set(-0.05, top + 0.05, 0);
      const b = shadowed(new THREE.Mesh(new THREE.DodecahedronGeometry(0.06, 0), stone));
      b.position.set(0.06, top + 0.04, 0.02);
      g.add(a, b);
    } else if (style.top === 'wings') {
      const feather = new THREE.MeshStandardMaterial({ color: style.glow, roughness: 0.5, side: THREE.DoubleSide });
      for (const s of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(s * 0.1, 0.92 * h, -0.02);
        const wing = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.012), feather));
        wing.position.x = s * 0.15;
        pivot.add(wing);
        g.add(pivot);
        animated.push(pivot);
      }
    } else {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshStandardMaterial({ color: style.glow, emissive: style.glow, emissiveIntensity: 0.8, transparent: true, opacity: 0.85 }));
      orb.position.y = top + 0.14;
      g.add(orb);
      animated.push(orb);
    }
    return { group: g, animated, top: style.top, age: 0, dying: 0, phase: Math.random() * 10 };
  }

  private dispose(t: Live): void {
    this.scene.remove(t.group);
    t.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      for (const mat of Array.isArray(m.material) ? m.material : [m.material]) if (mat !== wood && mat !== darkWood && mat !== earth) mat.dispose();
    });
  }
}
