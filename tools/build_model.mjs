// Builds public/models/human.glb: the Universal Animation Library 1 mannequin
// by Quaternius (CC0) with only the animations the practice yard uses, plus a
// few clips from UAL2 (same skeleton, same bone names).
//
// Usage: node tools/build_model.mjs [folder with the Quaternius downloads]
import { NodeIO } from '@gltf-transform/core';
import { prune, resample, dedup } from '@gltf-transform/functions';
import path from 'node:path';
import fs from 'node:fs';

const downloads = process.argv[2]
  ?? 'C:/Users/56978/Documents/VIDEOPJ/edrik_3d/descargas';
const ual1 = path.join(downloads, 'Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb');
const ual2 = path.join(downloads, 'Universal Animation Library 2 [Standard]/Unreal-Godot/UAL2_Standard.glb');
const output = path.resolve('public/models/human.glb');

const FROM_UAL1 = [
  'Idle_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop',
  'Jump_Start', 'Jump_Loop', 'Jump_Land', 'Roll',
  'Crouch_Idle_Loop', 'Crouch_Fwd_Loop',
  'Sword_Attack', 'Sword_Idle', 'Punch_Jab', 'Punch_Cross',
  'Death01', 'Hit_Chest', 'Spell_Simple_Shoot', 'Spell_Simple_Enter', 'Spell_Simple_Idle_Loop', 'Interact',
];
const FROM_UAL2 = [
  'Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C', 'Sword_Regular_A_Rec',
  'Melee_Hook', 'Consume', 'OverhandThrow', 'Sword_Block', 'Hit_Knockback',
  'NinjaJump_Start',
];

const io = new NodeIO();
const doc = await io.read(ual1);
const other = await io.read(ual2);
const root = doc.getRoot();

// Drop the UAL1 animations the yard does not use.
// Samplers must go too, or prune keeps their accessors in the buffer.
// (Accessors can be shared between clips, so prune decides which ones go.)
const disposeAnimation = (anim) => {
  for (const s of anim.listSamplers()) s.dispose();
  for (const ch of anim.listChannels()) ch.dispose();
  anim.dispose();
};
for (const anim of root.listAnimations()) {
  if (!FROM_UAL1.includes(anim.getName())) disposeAnimation(anim);
}

// Copy the UAL2 clips onto the nodes with the same name.
const nodeByName = new Map(root.listNodes().map((n) => [n.getName(), n]));
const buffer = root.listBuffers()[0];
const copyAccessor = (a) => doc.createAccessor(a.getName())
  .setType(a.getType())
  .setArray(a.getArray().slice())
  .setNormalized(a.getNormalized())
  .setBuffer(buffer);

for (const anim of other.getRoot().listAnimations()) {
  if (!FROM_UAL2.includes(anim.getName())) continue;
  const copy = doc.createAnimation(anim.getName());
  for (const channel of anim.listChannels()) {
    const target = nodeByName.get(channel.getTargetNode()?.getName());
    if (!target) continue;
    const s = channel.getSampler();
    const sampler = doc.createAnimationSampler()
      .setInput(copyAccessor(s.getInput()))
      .setOutput(copyAccessor(s.getOutput()))
      .setInterpolation(s.getInterpolation());
    copy.addSampler(sampler).addChannel(
      doc.createAnimationChannel()
        .setTargetNode(target)
        .setTargetPath(channel.getTargetPath())
        .setSampler(sampler),
    );
  }
}

// Tracks that never move away from the bone's rest value add size and
// nothing else: most scale and translation tracks.
let dropped = 0;
for (const anim of root.listAnimations()) {
  for (const ch of anim.listChannels()) {
    const path = ch.getTargetPath();
    const node = ch.getTargetNode();
    if (path === 'rotation' || !node) continue;
    const rest = path === 'scale' ? node.getScale() : node.getTranslation();
    const values = ch.getSampler().getOutput().getArray();
    let still = true;
    for (let i = 0; i < values.length && still; i++) {
      if (Math.abs(values[i] - rest[i % 3]) > 1e-4) still = false;
    }
    if (still) {
      ch.getSampler().dispose();
      ch.dispose();
      dropped++;
    }
  }
}
console.log(`dropped ${dropped} constant tracks`);

await doc.transform(resample(), dedup(), prune());
fs.mkdirSync(path.dirname(output), { recursive: true });
await io.write(output, doc);

const names = root.listAnimations().map((a) => a.getName()).sort();
console.log(`${output}: ${(fs.statSync(output).size / 1e6).toFixed(2)} MB, ${names.length} animations`);
console.log(names.join(', '));
