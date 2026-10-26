// Onyxia's Lair built in code (no third-party models): a cavern of dark rock
// under a vault, the floor's glowing cracks where the lava spews (at the
// fight's own crack positions), and two egg-filled caves the whelps pour out
// of. With a place of the player's own as the yard, only the cracks are drawn.
import * as THREE from 'three';
import { CRACKS, ROOM } from '../encounters/onyxia';
import { seeded } from './world';

function rockTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const rnd = seeded(5);
  g.fillStyle = '#2a2420';
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1800; i++) {
    const v = rnd();
    g.fillStyle = v < 0.5 ? 'rgba(15,12,11,0.5)' : v < 0.85 ? 'rgba(60,48,40,0.45)' : 'rgba(110,50,25,0.25)';
    g.beginPath();
    g.arc(rnd() * 256, rnd() * 256, 1 + rnd() * 5, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Lair {
  readonly root = new THREE.Group();
  /** What only the built-in lair has (floor, walls, vault, caves); the cracks stay over a place of your own. */
  private cave = new THREE.Group();
  private cracks: THREE.Mesh[] = [];
  private crackMat: THREE.MeshBasicMaterial;
  private lights: THREE.PointLight[] = [];
  private lava = 0;
  private lavaOn = false;

  constructor() {
    const rnd = seeded(91);
    const rock = rockTexture();
    rock.repeat.set(10, 10);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(ROOM.radius + 6, 64),
      new THREE.MeshStandardMaterial({ map: rock, roughness: 1, color: 0x8a7c70 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.005;
    floor.receiveShadow = true;
    this.cave.add(floor);

    // The wall: a ring of rock, jagged, leaning in; the vault closes it overhead.
    const wallRock = rockTexture();
    wallRock.repeat.set(12, 3);
    const wallGeo = new THREE.CylinderGeometry(ROOM.radius + 3, ROOM.radius + 9, 34, 72, 6, true);
    const pos = wallGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i);
      const k = 1 + (rnd() - 0.5) * 0.08 + Math.sin(Math.atan2(x, z) * 7 + y * 0.2) * 0.03;
      pos.setXYZ(i, x * k, y, z * k);
    }
    wallGeo.computeVertexNormals();
    const wall = new THREE.Mesh(wallGeo, new THREE.MeshStandardMaterial({ map: wallRock, roughness: 1, side: THREE.BackSide, color: 0x6e6058, flatShading: true }));
    wall.position.y = 16;
    this.cave.add(wall);
    const vault = new THREE.Mesh(
      new THREE.SphereGeometry(ROOM.radius + 9, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: wallRock, roughness: 1, side: THREE.BackSide, color: 0x3a322d }),
    );
    vault.scale.y = 0.55;
    vault.position.y = 32;
    this.cave.add(vault);
    // Stalagmites along the wall.
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3d342e, roughness: 1, flatShading: true });
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2;
      const d = ROOM.radius - 2 + rnd() * 5;
      const h = 2 + rnd() * 6;
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.8 + rnd() * 1.4, h, 6), stoneMat);
      m.position.set(Math.sin(a) * d, h / 2, Math.cos(a) * d);
      m.castShadow = m.receiveShadow = true;
      this.cave.add(m);
    }
    // The caves: dark mouths in the wall, eggs heaped in front.
    const dark = new THREE.MeshBasicMaterial({ color: 0x050404 });
    const eggMat = new THREE.MeshStandardMaterial({ color: 0x2b2026, roughness: 0.6, metalness: 0.1, flatShading: true });
    for (const cave of ROOM.caves) {
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(6, 20, 0, Math.PI), dark);
      mouth.position.set(cave.x * 1.08, 0.02, cave.z);
      mouth.rotation.y = Math.atan2(-cave.x, -cave.z);
      this.cave.add(mouth);
      for (let i = 0; i < 26; i++) {
        const egg = new THREE.Mesh(new THREE.SphereGeometry(0.45, 7, 5), eggMat);
        egg.scale.y = 1.35;
        egg.position.set(cave.x * (0.88 + rnd() * 0.12) + (rnd() - 0.5) * 3, 0.55, cave.z + (rnd() - 0.5) * 9);
        egg.castShadow = true;
        this.cave.add(egg);
      }
      const glow = new THREE.PointLight(0x9a5cff, 14, 18, 2);
      glow.position.set(cave.x * 0.9, 2.5, cave.z);
      this.cave.add(glow);
    }
    this.root.add(this.cave);

    // The cracks: thin glowing seams, jagged, at the fight's own positions.
    this.crackMat = new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0.75 });
    for (const [a, b] of CRACKS) {
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const pieces = Math.ceil(len / 1.6);
      for (let i = 0; i < pieces; i++) {
        const k0 = i / pieces, k1 = (i + 1) / pieces;
        const jitter = () => (rnd() - 0.5) * 0.7;
        const x0 = a.x + (b.x - a.x) * k0 + jitter(), z0 = a.z + (b.z - a.z) * k0 + jitter();
        const x1 = a.x + (b.x - a.x) * k1 + jitter(), z1 = a.z + (b.z - a.z) * k1 + jitter();
        const seg = new THREE.Mesh(new THREE.PlaneGeometry(0.45 + rnd() * 0.35, Math.hypot(x1 - x0, z1 - z0) + 0.3), this.crackMat);
        seg.rotation.x = -Math.PI / 2;
        seg.rotation.z = -Math.atan2(x1 - x0, z1 - z0);
        seg.position.set((x0 + x1) / 2, 0.03, (z0 + z1) / 2);
        this.root.add(seg);
        this.cracks.push(seg);
      }
      const light = new THREE.PointLight(0xff6a20, 6, 9, 2);
      light.position.set((a.x + b.x) / 2, 0.8, (a.z + b.z) / 2);
      this.root.add(light);
      this.lights.push(light);
    }
  }

  /** The built-in cavern on or off (a place of your own instead); the cracks always show. */
  setCave(on: boolean): void { this.cave.visible = on; }

  /** Lays the cracks on a place's own floor (uneven, unlike the built-in one); null for the flat floor. */
  setFloor(ground: ((x: number, z: number) => number) | null): void {
    for (const m of this.cracks) m.position.y = (ground ? ground(m.position.x, m.position.z) : 0) + 0.04;
    for (const l of this.lights) l.position.y = (ground ? ground(l.position.x, l.position.z) : 0) + 0.8;
  }

  setLava(on: boolean): void { this.lavaOn = on; }

  update(dt: number, t: number): void {
    this.lava += ((this.lavaOn ? 1 : 0) - this.lava) * Math.min(1, dt * 6);
    const flicker = 0.85 + Math.sin(t * 7) * 0.08 + Math.sin(t * 17) * 0.05;
    this.crackMat.opacity = 0.55 + 0.45 * this.lava;
    this.crackMat.color.setHex(this.lava > 0.5 ? 0xffb040 : 0xff5a14);
    for (const l of this.lights) l.intensity = (6 + 30 * this.lava) * flicker;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      const mat = m.material as THREE.MeshStandardMaterial;
      mat.map?.dispose();
      mat.dispose();
    });
  }
}
