// A place of the player's own as the yard: a building, an arena or a raid room
// exported from their own WoW install (src/own-model.ts). The yard is set on
// one spot of it, the anchor, where the dummies stand; you walk on its floors.
import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';
import type { ModelSource } from './custom-model';

/** How high a floor can be above your feet and still be stepped onto (stairs, ramps). */
const STEP = 1.2;

export class CustomPlace {
  readonly root = new THREE.Group();
  /** The model, scaled to meters and moved so the anchor sits on the yard's center. */
  private inner = new THREE.Group();
  private floors: THREE.Mesh[] = [];
  private ray = new THREE.Raycaster();
  private scale: number;
  /** The spot of the model under the dummies, in the model's own units. */
  anchor: THREE.Vector3;
  readonly triangles: number;

  constructor(source: ModelSource, anchor: number[] | null, quarterTurns: number) {
    const scene = source.scene.clone();
    let triangles = 0;
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      const index = m.geometry.index;
      triangles += (index ? index.count : m.geometry.attributes.position.count) / 3;
      if ((m as THREE.SkinnedMesh).isSkinnedMesh) return;
      // Floors to walk on: a bounding volume tree makes each look-down a few microseconds.
      if (!m.geometry.boundsTree) m.geometry.boundsTree = new MeshBVH(m.geometry);
      m.raycast = acceleratedRaycast;
      this.floors.push(m);
    });
    this.triangles = Math.round(triangles);
    // WoW units are yards.
    this.scale = source.fromWowExport ? 0.9144 : 1;
    this.inner.scale.setScalar(this.scale);
    this.inner.add(scene);
    this.root.add(this.inner);
    this.root.rotation.y = quarterTurns * (Math.PI / 2);
    this.ray.firstHitOnly = true;
    this.anchor = anchor ? new THREE.Vector3().fromArray(anchor) : this.middle(scene);
    this.placeAnchor();
  }

  /**
   * First guess for the anchor: the floor under the middle of the model. With none there (an arena
   * whose pit is the map's ground, not part of the building), the lowest floor around the middle, so
   * the yard's ground stands in for the missing one.
   */
  private middle(scene: THREE.Object3D): THREE.Vector3 {
    this.placeAnchor(new THREE.Vector3());
    const box = new THREE.Box3().setFromObject(scene);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const down = (x: number, z: number) => this.hit(new THREE.Vector3(x, box.max.y + 1, z), size.y + 2);
    let world = down(c.x, c.z);
    if (!world) {
      let lowest: THREE.Vector3 | null = null;
      for (let i = -3; i <= 3; i++) {
        for (let j = -3; j <= 3; j++) {
          const h = down(c.x + (i / 6) * size.x * 0.5, c.z + (j / 6) * size.z * 0.5);
          if (h && (!lowest || h.y < lowest.y)) lowest = h.clone();
        }
      }
      world = new THREE.Vector3(c.x, lowest?.y ?? box.min.y, c.z);
    }
    return this.inner.worldToLocal(world.clone());
  }

  private placeAnchor(a = this.anchor): void {
    this.inner.position.copy(a).multiplyScalar(-this.scale);
    this.root.updateMatrixWorld(true);
  }

  setQuarterTurns(n: number): void {
    this.root.rotation.y = n * (Math.PI / 2);
    this.root.updateMatrixWorld(true);
  }

  private hit(origin: THREE.Vector3, far: number): THREE.Vector3 | null {
    this.ray.set(origin, new THREE.Vector3(0, -1, 0));
    this.ray.far = far;
    const hits = this.ray.intersectObjects(this.floors, false);
    return hits.length ? hits[0].point : null;
  }

  /** The floor under (x, z) that someone standing at height y can reach, or null over the void. */
  groundAt(x: number, z: number, y: number): number | null {
    return this.hit(new THREE.Vector3(x, y + STEP, z), STEP + 40)?.y ?? null;
  }

  /** Makes the floor under (x, z) the yard's center, where the dummies stand. Returns the new anchor. */
  centerOn(x: number, z: number, y: number): number[] {
    const p = this.hit(new THREE.Vector3(x, y + STEP, z), STEP + 40) ?? new THREE.Vector3(x, y, z);
    this.anchor = this.inner.worldToLocal(p.clone());
    this.placeAnchor();
    return this.anchor.toArray();
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
