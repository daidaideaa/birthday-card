import * as THREE from 'three';

const FINGERS = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
const IDEAL: Record<number, number> = { 62: 0, 63: .6, 64: 1, 65: 2, 66: 2.6, 67: 3, 68: 3.6, 69: 4 };

/** Distinct fingers for adjacent black/white notes as well as wide chords. */
export function pianoFingering(notes: readonly number[]): Map<number, string> {
  const sorted = [...new Set(notes)].filter(note => Object.hasOwn(IDEAL, note)).sort((a, b) => a - b).slice(0, 5);
  let best: number[] = [], score = Infinity;
  const choose = (indices: number[], start: number) => {
    if (indices.length === sorted.length) {
      const cost = indices.reduce((sum, finger, i) => sum + (finger - IDEAL[sorted[i]]) ** 2, 0);
      if (cost < score) { score = cost; best = indices; }
      return;
    }
    for (let i = start; i < 5; i++) choose([...indices, i], i + 1);
  };
  choose([], 0);
  return new Map(sorted.map((note, i) => [note, FINGERS[best[i]]]));
}

/** Reversible right-hand layer on the independent exported deform bones. */
export class PianoFingerLayer {
  private chains = new Map<string, THREE.Bone[]>();
  private saved: { bone: THREE.Bone; position: THREE.Vector3; rotation: THREE.Quaternion }[] = [];
  constructor(root: THREE.Object3D) {
    root.traverse(object => {
      if (!(object instanceof THREE.Bone)) return;
      const match = /^DEFFinger(Thumb|Index|Middle|Ring|Pinky)([1-4])R$/.exec(object.name.replace(/[^a-z0-9]/gi, ''));
      if (!match) return;
      const chain = this.chains.get(match[1]) ?? [];
      chain[Number(match[2]) - 1] = object;
      this.chains.set(match[1], chain);
    });
  }
  restore() {
    for (const saved of this.saved) {
      saved.bone.position.copy(saved.position); saved.bone.quaternion.copy(saved.rotation);
    }
    this.saved = [];
  }
  apply(notes: readonly number[], time: number, targets?: ReadonlyMap<number, THREE.Vector3>) {
    if (time >= 3.2) return;
    for (const [note, finger] of pianoFingering(notes)) {
      const chain = this.chains.get(finger)?.filter(Boolean);
      if (!chain?.length) continue;
      for (const bone of chain) this.saved.push({ bone, position: bone.position.clone(), rotation: bone.quaternion.clone() });
      const rotate = (joint: number, rotation: THREE.Quaternion) => {
        const pivot = chain[joint].position.clone();
        for (let i = joint; i < chain.length; i++) {
          chain[i].position.sub(pivot).applyQuaternion(rotation).add(pivot);
          chain[i].quaternion.premultiply(rotation);
        }
      };
      const target = targets?.get(note);
      if (target && chain[0].parent) {
        chain[0].parent.updateWorldMatrix(true, false);
        const localTarget = chain[0].parent.worldToLocal(target.clone());
        const last = chain.at(-1)!;
        const tipOffset = new THREE.Vector3(0, finger === 'Thumb' ? .033 : .028, 0);
        for (let iteration = 0; iteration < 7; iteration++) {
          for (let joint = chain.length - 1; joint >= 0; joint--) {
            const tip = tipOffset.clone().applyQuaternion(last.quaternion).add(last.position);
            const from = tip.sub(chain[joint].position).normalize();
            const to = localTarget.clone().sub(chain[joint].position).normalize();
            const turn = new THREE.Quaternion().setFromUnitVectors(from, to);
            const angle = 2 * Math.acos(THREE.MathUtils.clamp(turn.w, -1, 1));
            if (angle > .24) turn.slerp(new THREE.Quaternion(), 1 - .24 / angle);
            rotate(joint, turn);
          }
        }
      } else {
        const axis = new THREE.Vector3(1, 0, 0).applyQuaternion(chain[0].quaternion).normalize();
        rotate(0, new THREE.Quaternion().setFromAxisAngle(axis, .1));
      }
    }
  }
}
