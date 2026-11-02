import fs from 'node:fs';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CustomModel, ModelSource, animKey } from '../src/scene/custom-model';
import { CustomPlace } from '../src/scene/custom-place';
import { unpackMapBundle } from '../src/scene/model-bundle';
import { factionForRace, trainingAreaKeys } from '../src/scene/training-area';
import { DRUID_FORMS, druidFormKeys, formDefinition } from '../src/scene/druid-forms';

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
// A build or a choice in Settings that differs from the export: the yard's own weapon, and nothing where none is held.
model.setRanged(null);
const inRight = right.children.length, inLeft = left.children.length;
model.setMelee('polearm', null, true);
assert(melee.every((item) => !item.visible), 'A two-hander hides both exported weapons');
assert.equal(right.children.length, inRight + 1, 'The two-hander is drawn in the right hand');
assert.equal(left.children.length, inLeft, 'And nothing in the left');
model.setMelee('own', 'own');
assert(melee.every((item) => item.visible), 'The exported weapons come back');
assert.equal(right.children.length, inRight);
model.dispose();
assert(!model.root.getObjectByName('yard-ranged-hand'));

const manifest = JSON.parse(fs.readFileSync('public/wow/manifest.json', 'utf8'));
// Check every race/form mapping and animate each distinct published model.
const checkedForms = new Set<string>();
for (const race of ['nightelf', 'tauren', 'highorder', 'windshaper']) {
  for (const kind of DRUID_FORMS) {
    const file = manifest.models[`form-${kind}@${race}`];
    assert(file && manifest.gzip.includes(file), `${race} ${kind} has a published form`);
    assert.equal(manifest.models[druidFormKeys(`${race}-f`, kind)[0]], file);
    const formJSON = JSON.parse(gunzipSync(fs.readFileSync(`public/wow/${file}.gz`)).toString());
    const meta = formJSON.scenes[0].extras;
    const shared = kind === 'aquatic' || kind === 'tree' || (kind === 'travel' && ['nightelf', 'tauren'].includes(race));
    assert.equal(meta.race, shared ? 'shared' : ['highorder', 'windshaper'].includes(race) ? 'skyborne' : race);
    assert.equal(meta.form, kind === 'dire-bear' ? 'bear' : kind);
    assert.equal(meta.definition, formDefinition(race, kind), `${race} ${kind} uses the requested SD/HD version`);
    assert(/wow\.export/i.test(formJSON.asset.generator));
    assert(formJSON.images.length > 0 && formJSON.materials.every((m: { pbrMetallicRoughness?: { baseColorTexture?: unknown } }) => m.pbrMetallicRoughness?.baseColorTexture), 'Original textures are present');
    if (kind === 'tree') assert(formJSON.materials.some((m: { alphaMode?: string; doubleSided?: boolean }) => m.alphaMode === 'MASK' && m.doubleSided), 'Tree leaves use original double-sided cutouts');
    if (checkedForms.has(file)) continue;
    checkedForms.add(file);
    const names = formJSON.animations.map((a: { name: string }) => animKey(a.name));
    const required = kind === 'cat' ? ['druidcatclaw'] : kind === 'bear' ? ['druidbearmaul'] : kind === 'moonkin' ? ['spellcastdirected'] : [];
    for (const name of ['stand', kind === 'aquatic' ? 'swim' : 'run', ...required]) assert(names.includes(name), `${race} ${kind}: ${name}`);
    if (meta.definition === 'sd' && ['cat', 'bear', 'moonkin'].includes(kind)) {
      const triangles = formJSON.meshes.reduce((n: number, m: { primitives: { indices: number }[] }) => n + m.primitives.reduce((n, p) => n + formJSON.accessors[p.indices].count / 3, 0), 0);
      assert(triangles < 1800, `${race} ${kind} uses original low-poly geometry (${triangles})`);
    }
    for (const buffer of formJSON.buffers) buffer.uri = `data:application/octet-stream;base64,${fs.readFileSync(`public/wow/${buffer.uri}`).toString('base64')}`;
    for (const dep of manifest.dependencies[file]) assert(fs.statSync(`public/wow/${dep}`).size > 0);
    delete formJSON.images; delete formJSON.textures;
    delete formJSON.extensionsUsed; delete formJSON.extensionsRequired;
    formJSON.materials = formJSON.materials.map((m: { name?: string }) => ({ name: m.name }));
    const form = await new GLTFLoader().parseAsync(JSON.stringify(formJSON), '');
    const figure = new ModelSource(form.scene, form.animations, true, []).figure();
    assert(figure.height > 0.3 && figure.height < 12, `${race} ${kind}: plausible original display scale (${figure.height})`);
    figure.setLocomotion('run', 6.4); figure.update(0.5);
    if (kind === 'aquatic') figure.setPose(['swim']);
    figure.root.updateMatrixWorld(true);
    const mesh = figure.root.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh;
    assert(mesh?.skeleton.bones.length > 0);
    const before = mesh.skeleton.bones.map((bone) => bone.matrixWorld.clone());
    figure.update(0.17); figure.root.updateMatrixWorld(true);
    assert(mesh.skeleton.bones.some((bone, i) => !bone.matrixWorld.equals(before[i])), `${race} ${kind} runs with animated bones`);
    if (kind === 'cat' || kind === 'bear') figure.playAbility(kind === 'cat' ? 'claw' : 'maul');
    if (kind === 'moonkin') figure.play('cast');
    figure.update(0.2);
    figure.dispose();
  }
}
for (const kind of DRUID_FORMS) {
  assert.equal(manifest.models[`form-${kind}@highorder`], manifest.models[`form-${kind}@windshaper`], 'Both Skyborne factions share the original form');
  assert.equal(manifest.models[`form-${kind}`], manifest.models[`form-${kind}@nightelf`]);
}
for (const race of ['nightelf', 'tauren', 'highorder', 'windshaper']) assert.equal(manifest.models[`form-dire-bear@${race}`], manifest.models[`form-bear@${race}`]);
for (const race of ['human', 'dwarf', 'gnome', 'nightelf', 'orc', 'tauren', 'troll', 'undead']) {
  for (const sex of ['m', 'f']) {
    const faction = factionForRace(`${race}-${sex}`);
    assert.equal(faction, ['orc', 'tauren', 'troll', 'undead'].includes(race) ? 'horde' : 'alliance');
    assert(manifest.models[trainingAreaKeys(`${race}-${sex}`)[0]], `Training area exists for ${race}-${sex}`);
  }
}
assert.equal(factionForRace('windshaper'), 'horde');
assert.equal(factionForRace('highorder'), 'alliance');
for (const faction of ['alliance', 'horde']) {
const trainingFile = manifest.models[`yard:${faction}`];
const compressed = manifest.gzip.includes(trainingFile);
const trainingBytes = fs.readFileSync(`public/wow/${trainingFile}${compressed ? '.gz' : ''}`);
const trainingJSON = JSON.parse((compressed ? gunzipSync(trainingBytes)
  : trainingBytes.subarray(20, 20 + trainingBytes.readUInt32LE(12))).toString());
assert(/wow\.export/i.test(trainingJSON.asset.generator));
assert.equal(trainingJSON.scenes[0].extras.trainingArea, true);
// Read geometry without decoding images in Node, to check the real floor at
// the dummy, all three target positions and the hunter's starting distance.
for (const buffer of trainingJSON.buffers) {
  const bin = buffer.uri ? fs.readFileSync(`public/wow/${buffer.uri}`) : trainingBytes.subarray(28 + trainingBytes.readUInt32LE(12));
  buffer.uri = `data:application/octet-stream;base64,${bin.toString('base64')}`;
}
delete trainingJSON.images; delete trainingJSON.textures;
delete trainingJSON.extensionsUsed; delete trainingJSON.extensionsRequired;
trainingJSON.materials = trainingJSON.materials.map((m: { name?: string }) => ({ name: m.name }));
const training = await new GLTFLoader().parseAsync(JSON.stringify(trainingJSON), '');
const place = new CustomPlace(new ModelSource(training.scene, [], true, []), null, training.scene.userData.defaultRotation ?? 0);
assert(place.hasGround);
for (const [x, z] of [[0, 0], [-2.8, 0], [2.8, 0], [0, -12 * 0.9144]]) {
  const height = place.groundAt(x, z, 0);
  assert.notEqual(height, null, `Training floor exists at ${x}, ${z}`);
  assert(Math.abs(height!) < 1.2, `Training floor stays level at ${x}, ${z}`);
}
// Run straight out from the dummies, a player's step at a time: always on a floor, and never further down than a step.
for (let turn = 0; turn < 8; turn++) {
  const dx = Math.sin(turn * Math.PI / 4) * 0.2, dz = Math.cos(turn * Math.PI / 4) * 0.2;
  let x = 0, z = -3.2, y = place.groundAt(x, z, 0)!;
  for (let i = 0; i < 1500 && place.canStep(x, z, y, x + dx, z + dz); i++) {
    x += dx; z += dz;
    const floor = place.groundAt(x, z, y);
    assert.notEqual(floor, null, `A ${faction} run stays on a floor at ${x}, ${z}`);
    assert(y - floor! <= 1.2, `A ${faction} run does not fall at ${x}, ${z}`);
    y = floor!;
  }
  // Stormwind's courtyard has walls all around.
  if (faction === 'alliance') assert(Math.hypot(x, z) < 45, `Walls stop an Alliance run at ${x}, ${z}`);
}
place.dispose();
}
const archive = Object.values(manifest.archives)[0];
const data = new Blob([gunzipSync(fs.readFileSync(`public/wow/${archive}`))]);
const files = await unpackMapBundle(data);
assert(files.some((f) => /adt_31_49\.obj$/.test(f.name)));
assert(files.some((f) => /tex_31_49\.png$/.test(f.name)));
assert(files.every((f) => f.data.size > 0));
await assert.rejects(unpackMapBundle(data.slice(0, data.size - 1)), /Incomplete map file/);
console.log(`Published druid: 28 race/form choices, SD/HD policy, original geometry, textures, scale and ${checkedForms.size} animated models checked. Published hunter: ranged and melee attachments checked; both faction training floors, walls and edges and 16 race/sex choices checked; ${files.length} map files decoded and truncated archives rejected.`);
