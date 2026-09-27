import * as THREE from "three";

/** The existing actor moves from the bench into the shared dance; no second actor. */
export class PianistPose {
  private bones: THREE.Bone[] = [];
  private saved = new Map<THREE.Object3D, THREE.Quaternion>();
  private point = new THREE.Vector3();
  private joint = new THREE.Vector3();
  private child = new THREE.Vector3();
  private direction = new THREE.Vector3();
  private delta = new THREE.Quaternion();
  private parent = new THREE.Quaternion();
  private world = new THREE.Quaternion();
  private lastPosition: THREE.Vector3;
  private lastRotation: THREE.Quaternion;
  constructor(private actor: THREE.Object3D, private piano: THREE.Object3D, private keys: ReadonlyMap<number,THREE.Mesh>) {
    actor.traverse(node => { if (node instanceof THREE.Bone) this.bones.push(node); });
    this.lastPosition = actor.position.clone();
    this.lastRotation = actor.quaternion.clone();
  }
  private bone(name: string) { return this.bones.find(b => b.name === name); }
  private aim(name: string, childName: string, target: THREE.Vector3) {
    const bone = this.bone(name), child = this.bone(childName);
    if (!bone || !child || !bone.parent) return;
    this.actor.updateWorldMatrix(true,true);
    bone.getWorldPosition(this.joint); child.getWorldPosition(this.child);
    this.child.sub(this.joint).normalize(); this.direction.copy(target).sub(this.joint).normalize();
    this.delta.setFromUnitVectors(this.child,this.direction);
    bone.getWorldQuaternion(this.world); bone.parent.getWorldQuaternion(this.parent);
    bone.quaternion.copy(this.parent.invert().multiply(this.delta).multiply(this.world));
  }
  private target(x:number,y:number,z:number) { return this.piano.localToWorld(new THREE.Vector3(x,y,z)); }
  restore() {
    for (const [bone, rotation] of this.saved) bone.quaternion.copy(rotation);
    this.actor.position.copy(this.lastPosition);
    this.actor.quaternion.copy(this.lastRotation);
  }
  apply(weight: number, held: readonly number[]) {
    // Restore the actor transform before each sample; these nodes may have no root track.
    this.actor.position.copy(this.lastPosition); this.actor.quaternion.copy(this.lastRotation);
    if (weight < .001) return;
    this.saved.clear(); this.bones.forEach(bone=>this.saved.set(bone,bone.quaternion.clone()));
    this.actor.quaternion.setFromAxisAngle(new THREE.Vector3(0,1,0),this.piano.rotation.y-Math.PI/2);
    const pelvis = this.bone("pelvis");
    if (!pelvis || !this.actor.parent) return;
    this.actor.updateWorldMatrix(true,true);
    const seat=this.target(8.5,4.05,.2);
    pelvis.getWorldPosition(this.point);
    const offset=seat.sub(this.point);
    this.actor.position.add(offset); // actor's parent has translation only.
    for (const [side,z] of [["l",-.6],["r",1]] as const) {
      this.aim(`thigh_${side}`,`calf_${side}`,this.target(5.7,3.7,z));
      this.aim(`calf_${side}`,`foot_${side}`,this.target(5.7,.6,z));
    }
    const note = held.length ? held.reduce((sum,n)=>sum+n,0)/held.length : 65;
    const keyZ = -.62 + Math.max(0,Math.min(4,(note-62)/1.75))*.33;
    const target=this.target(5.9,held.length ? 5.40 : 5.7,keyZ);
    // Bounded CCD on just the playing arm. The free hand rests by the knee.
    for(let i=0;i<5;i++) {
      this.aim("lowerarm_r","hand_r",target);
      this.aim("upperarm_r","hand_r",target);
    }
    const rest=this.target(6.1,3.95,-.65);
    for(let i=0;i<4;i++) { this.aim("lowerarm_l","hand_l",rest);this.aim("upperarm_l","hand_l",rest); }
    for(const name of ["index_01_r","middle_01_r","ring_01_r"]) {
      const finger=this.bone(name);if(finger)finger.rotateX(held.length ? -.25 : .12);
    }
    // Each held pitch gets its own finger target, in the same space as the visible key.
    held.slice(0,3).sort((a,b)=>a-b).forEach((pitch,index)=>{
      const key=this.keys.get(pitch);if(!key)return;
      const target=key.getWorldPosition(new THREE.Vector3());target.y+=.012;
      const finger=["index","middle","ring"][index];
      for(let pass=0;pass<3;pass++)
        for(const joint of ["03","02","01"])
          this.aim(`${finger}_${joint}_r`,`${finger}_04_leaf_r`,target);
    });
    this.actor.position.lerp(this.lastPosition,1-weight);
    this.actor.quaternion.slerp(this.lastRotation,1-weight);
    for(const bone of this.bones) bone.quaternion.slerp(this.saved.get(bone)!,1-weight);
    this.actor.updateWorldMatrix(true,true);
  }
}
