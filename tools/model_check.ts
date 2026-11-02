import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CustomModel } from '../src/scene/custom-model';
import { unpackMapBundle } from '../src/scene/model-bundle';

// Exercise the published rig and animations. Images are omitted only in this
// headless test; browser QA checks the original materials and their appearance.
(globalThis as unknown as { self: typeof globalThis }).self = globalThis;
(globalThis as unknown as { ProgressEvent: unknown }).ProgressEvent ??= class {};
const json = JSON.parse(gunzipSync(fs.readFileSync('public/wow/yard-gear/hunter-bm/nightelf-f.gltf.gz')).toString());
for (const buffer of json.buffers) buffer.uri = `data:application/octet-stream;base64,${fs.readFileSync(`public/wow/${buffer.uri}`).toString('base64')}`;
delete json.images; delete json.textures;
json.materials = json.materials.map((m: { name?: string }) => ({ name: m.name }));
const gltf = await new GLTFLoader().parseAsync(JSON.stringify(json), '');
const model = new CustomModel(gltf.scene, gltf.animations, 3, { yards: true });
const left = gltf.scene.getObjectByName('bone_HandL')!;
const right = gltf.scene.getObjectByName('bone_HandR')!;
assert(left && right);
const melee: THREE.Object3D[] = [];
gltf.scene.traverse((o) => { if (/^(Main.hand|Off.hand)_Item/.test(o.name)) melee.push(o); });
assert(melee.length > 0);
assert(melee.every((item) => {
  let parent = item.parent;
  while (parent && parent !== left && parent !== right) parent = parent.parent;
  return !!parent;
}), 'Melee equipment must be attached to a hand');
for (const kind of ['bow', 'gun', 'crossbow'] as const) {
  model.setRanged(kind);
  model.setRangedMode(true);
  const weapon = model.root.getObjectByName('yard-ranged-hand')!;
  assert(weapon?.visible, `${kind} is visible while shooting`);
  assert.equal(weapon.parent, kind === 'bow' ? left : right, `${kind} uses the correct hand`);
  assert(melee.every((item) => !item.visible), 'Melee items are hidden while shooting');
  model.setLocomotion('aim'); model.play('shoot'); model.update(0.05);
  model.root.updateMatrixWorld(true);
  const before = weapon.getWorldPosition(new THREE.Vector3());
  model.update(0.1); model.root.updateMatrixWorld(true);
  assert(before.distanceTo(weapon.getWorldPosition(new THREE.Vector3())) > 0.00001, `${kind} follows its animated hand`);
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(weapon.getWorldQuaternion(new THREE.Quaternion()));
  const direction = left.getWorldPosition(new THREE.Vector3()).sub(right.getWorldPosition(new THREE.Vector3())).normalize();
  assert(forward.dot(direction) > 0.999, `${kind} aims along the animated hands`);
  model.setRangedMode(false);
  assert(!weapon.visible);
  assert(model.root.getObjectByName('yard-ranged-back')!.visible);
  assert(melee.every((item) => item.visible));
}
model.dispose();
assert(!model.root.getObjectByName('yard-ranged-hand'));

const manifest = JSON.parse(fs.readFileSync('public/wow/manifest.json', 'utf8'));
const archive = Object.values(manifest.archives)[0];
const data = new Blob([gunzipSync(fs.readFileSync(`public/wow/${archive}`))]);
const files = await unpackMapBundle(data);
assert(files.some((f) => /adt_31_49\.obj$/.test(f.name)));
assert(files.some((f) => /tex_31_49\.png$/.test(f.name)));
assert(files.every((f) => f.data.size > 0));
await assert.rejects(unpackMapBundle(data.slice(0, data.size - 1)), /Incomplete map file/);
console.log(`Published hunter: bow, gun, crossbow and melee attachments checked; ${files.length} map files decoded and truncated archives rejected.`);
