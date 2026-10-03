import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { PianoFingerLayer, pianoFingering } from '../src/scene/PianoFingerLayer';

test('key flex restores the authored pose and never accumulates across repeated notes', () => {
  const root = new THREE.Group();
  const bones = [1, 2, 3].map(i => {
    const bone = new THREE.Bone(); bone.name = `DEF-Finger_Index${i}.R`;
    bone.position.set(1, .04 * i, .03); bone.rotation.set(.2, .1, 0); root.add(bone); return bone;
  });
  const positions = bones.map(b => b.position.clone()), rotations = bones.map(b => b.quaternion.clone());
  const layer = new PianoFingerLayer(root);
  for (let i = 0; i < 8; i++) {
    layer.apply([64], 1);
    assert.ok(bones[2].position.distanceTo(positions[2]) > .0001);
    assert.ok(bones[0].position.distanceTo(positions[0]) < 1e-10, 'the knuckle stays attached');
    layer.restore();
    bones.forEach((bone, j) => {
      assert.deepEqual(bone.position.toArray(), positions[j].toArray());
      assert.deepEqual(bone.quaternion.toArray(), rotations[j].toArray());
    });
  }
  layer.apply([64], 12);
  bones.forEach((bone, i) => assert.deepEqual(bone.position.toArray(), positions[i].toArray()));
});

test('three adjacent semitones always have distinct fingers on one hand', () => {
  for (let note = 62; note <= 67; note++) {
    const fingering = pianoFingering([note, note + 1, note + 2]);
    assert.equal(fingering.size, 3);
    assert.equal(new Set(fingering.values()).size, 3);
  }
});
