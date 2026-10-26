// Straw training dummy on a post, built in code. It wobbles when hit. A model
// of the player's own can stand in for it (Settings → Your own models).
import * as THREE from 'three';
import type { CustomModel } from './custom-model';

export class Dummy {
  readonly root = new THREE.Group();
  /** Meshes for click picking. */
  readonly pickables: THREE.Object3D[] = [];
  private sway = new THREE.Group();
  private ring: THREE.Mesh;
  private wobble = 0;
  private wobbleVel = 0;
  private wobbleAxis = new THREE.Vector3(1, 0, 0);
  /** The parts built in code, hidden while a model of your own stands in. */
  private built: THREE.Object3D[] = [];
  private builtPickables: THREE.Object3D[] = [];
  private model: CustomModel | null = null;

  constructor() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.9, flatShading: true });
    const burlap = new THREE.MeshStandardMaterial({ color: 0xb79a6b, roughness: 1, flatShading: true });
    const rope = new THREE.MeshStandardMaterial({ color: 0x7a5f3b, roughness: 1 });
    const straw = new THREE.MeshStandardMaterial({ color: 0xd6b45c, roughness: 1, flatShading: true });
    const paint = new THREE.MeshStandardMaterial({ color: 0x8e2222, roughness: 0.9 });
    const cast = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; return m; };

    // Base: two crossed beams.
    for (const r of [0, Math.PI / 2]) {
      const beam = cast(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.14, 0.16), wood));
      beam.position.y = 0.07;
      beam.rotation.y = r + Math.PI / 4;
      this.root.add(beam);
    }
    const post = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.0, 8), wood));
    post.position.y = 0.55;
    this.root.add(post);

    this.sway.position.y = 1.0;
    this.root.add(this.sway);
    const torso = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.85, 10), burlap));
    torso.position.y = 0.45;
    this.sway.add(torso);
    for (const y of [0.15, 0.75]) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.025, 6, 20), rope);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      this.sway.add(band);
    }
    // Painted target on the chest (front is +Z).
    for (const [r, color] of [[0.17, 0x8e2222], [0.11, 0xe8dcc0], [0.05, 0x8e2222]] as const) {
      const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 20), r === 0.11 ? new THREE.MeshStandardMaterial({ color, roughness: 0.9 }) : paint);
      disc.position.set(0, 0.5, 0.287 + (0.17 - r) * 0.02);
      this.sway.add(disc);
    }
    const head = cast(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 9), burlap));
    head.position.y = 1.08;
    head.scale.set(1, 1.1, 0.95);
    this.sway.add(head);
    // Stitched eyes.
    const thread = new THREE.MeshBasicMaterial({ color: 0x2a1d12 });
    for (const s of [-1, 1]) {
      for (const r of [0.7, -0.7]) {
        const st = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.012, 0.01), thread);
        st.position.set(s * 0.07, 1.12, 0.185);
        st.rotation.z = r;
        this.sway.add(st);
      }
    }
    const neck = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.03, 6, 14), rope);
    neck.rotation.x = Math.PI / 2;
    neck.position.y = 0.9;
    this.sway.add(neck);
    // Arms: a crossbar with straw tufts.
    const arms = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8), wood));
    arms.rotation.z = Math.PI / 2;
    arms.position.y = 0.72;
    this.sway.add(arms);
    for (const s of [-1, 1]) {
      const tuft = cast(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.22, 7), straw));
      tuft.rotation.z = s * Math.PI / 2;
      tuft.position.set(s * 0.72, 0.72, 0);
      this.sway.add(tuft);
    }
    // Wooden shield on the left arm.
    const shield = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 14), wood));
    shield.rotation.x = Math.PI / 2;
    shield.position.set(0.45, 0.62, 0.12);
    this.sway.add(shield);

    this.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) this.pickables.push(o); });
    this.built = [...this.root.children];
    this.builtPickables = [...this.pickables];

    // Selection ring on the ground, red for an enemy.
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.72, 40),
      new THREE.MeshBasicMaterial({ color: 0xd8321e, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.03;
    this.ring.visible = false;
    this.root.add(this.ring);
  }

  setSelected(on: boolean): void { this.ring.visible = on; }

  /** A model of your own instead of the straw dummy, or null for the straw one. */
  setModel(model: CustomModel | null): void {
    this.model?.dispose();
    this.model = model;
    for (const o of this.built) o.visible = !model;
    this.pickables.length = 0;
    if (model) {
      this.root.add(model.root);
      model.setLocomotion('idle');
      model.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) this.pickables.push(o); });
    } else {
      this.pickables.push(...this.builtPickables);
    }
  }

  /** A lunge forward when it swings at the player. */
  attack(): void {
    this.wobbleAxis.set(1, 0, 0);
    this.wobbleVel += 3.2;
    this.model?.play('strike1');
  }

  /** Kicks the wobble; from = world position of the attacker. */
  hit(from: THREE.Vector3, strength = 1): void {
    // A model of your own plays its own wound (a crit has a bigger one).
    this.model?.play(strength > 1.2 ? 'critReact' : 'hitReact');
    const local = this.root.worldToLocal(from.clone());
    // Lean away from the attacker: axis perpendicular to the push.
    this.wobbleAxis.set(local.z, 0, -local.x).normalize().negate();
    this.wobbleVel += 2.2 * strength;
  }

  /** Head height, for floating combat text. */
  get headPosition(): THREE.Vector3 {
    return this.root.localToWorld(new THREE.Vector3(0, this.model ? this.model.height + 0.3 : 2.35, 0));
  }

  update(dt: number, t: number): void {
    // Damped spring.
    this.wobbleVel += (-60 * this.wobble - 7 * this.wobbleVel) * dt;
    this.wobble += this.wobbleVel * dt;
    this.sway.quaternion.setFromAxisAngle(this.wobbleAxis, this.wobble * 0.25);
    this.model?.update(dt);
    const ring = this.ring.material as THREE.MeshBasicMaterial;
    ring.opacity = 0.7 + Math.sin(t * 4) * 0.15;
  }
}
