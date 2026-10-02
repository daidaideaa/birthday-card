import * as THREE from 'three';

/** Small key-driven flex layered over the baked seated performance. */
export class PianoFingerLayer {
  private chains = new Map<string, THREE.Bone[]>();
  private restorePose: { bone: THREE.Bone; position: THREE.Vector3; rotation: THREE.Quaternion }[] = [];
  constructor(root: THREE.Object3D) {
    root.traverse(object => {
      if (!(object instanceof THREE.Bone)) return;
      const match = /^DEFFinger(Index|Middle|Ring|Pinky)([1-4])([LR])$/.exec(object.name.replace(/[^a-z0-9]/gi, ''));
      if (!match) return;
      const key = `${match[1]}${match[3]}`;
      const chain = this.chains.get(key) ?? [];
      chain[Number(match[2]) - 1] = object;
      this.chains.set(key, chain);
    });
  }
  restore() {
    for (const saved of this.restorePose) {
      saved.bone.position.copy(saved.position); saved.bone.quaternion.copy(saved.rotation);
    }
    this.restorePose = [];
  }
  apply(notes: readonly number[], time: number) {
    if (time >= 3.2) return;
    const noteFinger: Record<number, string> = { 62: 'RingR', 63: 'MiddleR', 64: 'IndexR', 65: 'IndexL', 66: 'MiddleL', 67: 'RingL', 68: 'PinkyL', 69: 'PinkyL' };
    for (const id of new Set(notes.map(n => noteFinger[n]).filter(Boolean))) {
      const chain = this.chains.get(id), base = chain?.[0];
      if (!chain || !base) continue;
      const pivot = base.position.clone();
      const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(base.quaternion).normalize();
      const rotation = new THREE.Quaternion().setFromAxisAngle(axis, .1);
      // The export uses independent deform bones. Rotate the distal positions
      // around the knuckle as well as their orientations so the chain stays joined.
      for (const bone of chain.filter(Boolean)) {
        this.restorePose.push({ bone, position: bone.position.clone(), rotation: bone.quaternion.clone() });
        bone.position.sub(pivot).applyQuaternion(rotation).add(pivot);
        bone.quaternion.premultiply(rotation);
      }
    }
  }
}
