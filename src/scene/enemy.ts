// What the yard needs from anything it fights: the straw dummy, an encounter's
// boss and its adds. Floating combat text, spell effects, clicking and Tab all
// work through this.
import type * as THREE from 'three';

export interface EnemyView {
  readonly root: THREE.Object3D;
  /** Meshes a click selects it by. */
  readonly pickables: THREE.Object3D[];
  /** Above its head, for floating combat text. */
  readonly headPosition: THREE.Vector3;
  setSelected(on: boolean): void;
  /** A blow landed; `from` is the attacker, a crit is stronger. */
  hit(from: THREE.Vector3, strength?: number): void;
  /** It swings at the player. */
  attack(): void;
  update(dt: number, t: number): void;
}
