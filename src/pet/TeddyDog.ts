import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { assetUrl } from "../utils/assetUrl";

export type PuppyMood = "welcome" | "curious" | "sleepy" | "happy";
export type PuppyCue = "magic" | "piano" | "roar" | "wish" | "play";

/** Original sculpted, skinned poodle assets with authored Blender animations. */
export class TeddyDog {
  readonly root = new THREE.Group();
  readonly ready: Promise<void>;
  private model?: THREE.Group;
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current?: THREE.AnimationAction;
  private head?: THREE.Bone;
  private headPose = new THREE.Quaternion();
  private gazePose = new THREE.Quaternion();
  private gazeAngles = new THREE.Euler();
  private gazeUntil = 0;
  private tongue?: THREE.Mesh;
  private blinkMeshes: THREE.Mesh[] = [];
  private disposed = false;
  private time: number;
  private mood: PuppyMood = "welcome";
  private cue: PuppyCue = "magic";
  private reaction = 0;
  private look = new THREE.Vector2();
  private lookTarget = new THREE.Vector2();

  constructor(
    lowDetail = false,
    readonly variant = 0,
  ) {
    this.time = variant * 1.73;
    this.root.rotation.y = variant ? -0.16 : 0.16;
    this.ready = new GLTFLoader()
      .loadAsync(assetUrl(`models/teddy-${variant ? "cream" : "apricot"}.glb`))
      .then((gltf) => {
        this.model = gltf.scene;
        if (this.disposed) {
          this.releaseModel();
          return;
        }
        this.model.traverse((object) => {
          if (object instanceof THREE.Bone && object.name === "Head") {
            this.head = object;
            this.headPose.copy(object.quaternion);
          }
          if (object instanceof THREE.Mesh) {
            if (object.name === "Tongue") this.tongue = object;
            object.castShadow = !lowDetail;
            object.receiveShadow = true;
            object.frustumCulled = false;
            if (object.morphTargetDictionary?.Blink !== undefined)
              this.blinkMeshes.push(object);
          }
        });
        this.root.add(this.model);
        this.mixer = new THREE.AnimationMixer(this.model);
        for (const clip of gltf.animations) {
          const name = ["Idle", "Curious", "Happy", "Rest"].find((value) =>
            clip.name.includes(value),
          );
          if (name) this.actions.set(name, this.mixer.clipAction(clip));
        }
        this.selectAnimation(true);
      });
  }

  private selectAnimation(immediate = false) {
    const name =
      this.reaction > 0
        ? this.cue === "play" || this.cue === "wish"
          ? "Happy"
          : "Curious"
        : this.mood === "happy"
          ? "Happy"
          : this.mood === "sleepy"
            ? "Rest"
            : this.mood === "curious"
              ? "Curious"
              : "Idle";
    const next = this.actions.get(name) ?? this.actions.get("Idle");
    if (!next || next === this.current) return;
    next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
    next.time = this.variant * 0.23;
    if (this.current && !immediate)
      next.crossFadeFrom(this.current, 0.38, false);
    else this.current?.stop();
    this.current = next;
  }

  setMood(mood: PuppyMood) {
    this.mood = mood;
    this.selectAnimation();
  }
  react(cue: PuppyCue) {
    this.cue = cue;
    this.reaction = cue === "play" || cue === "wish" ? 3.0 : 2.5;
    this.selectAnimation();
  }
  pet() {
    this.react("play");
  }
  lookAt(x: number, y: number) {
    this.gazeUntil = this.time + 2.5;
    this.lookTarget.set(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1),
    );
  }
  reset() {
    this.mood = "welcome";
    this.reaction = 0;
    this.lookTarget.set(0, 0);
    this.selectAnimation();
  }
  update(dt: number, still = false) {
    if (!this.mixer) return;
    this.time += dt;
    const previousReaction = this.reaction;
    this.reaction = Math.max(0, this.reaction - dt);
    if (previousReaction > 0 && this.reaction === 0) this.selectAnimation();
    // 先还原上一帧的骨骼姿态，避免静态动作上的注视偏移逐帧累积。
    this.head?.quaternion.copy(this.headPose);
    this.mixer.update(still ? 0 : dt);
    if (this.time > this.gazeUntil) {
      this.lookTarget.set(
        Math.sin(this.time * 0.43 + this.variant * 2) * 0.32,
        Math.sin(this.time * 0.27) * 0.14,
      );
    }
    this.look.lerp(this.lookTarget, 1 - Math.exp(-dt * 4));
    if (this.head) {
      this.headPose.copy(this.head.quaternion);
      if (!still) {
        this.gazeAngles.set(-this.look.y * 0.07, 0, this.look.x * 0.12);
        this.gazePose.setFromEuler(this.gazeAngles);
        this.head.quaternion.multiply(this.gazePose);
      }
    }
    if (this.tongue) this.tongue.visible = this.reaction > 0 || this.mood === "happy";
    const blinkPhase = this.time % (this.variant ? 5.7 : 4.9);
    const blink =
      !still && blinkPhase > 4.55 && blinkPhase < 4.76
        ? Math.sin(((blinkPhase - 4.55) / 0.21) * Math.PI)
        : 0;
    for (const eye of this.blinkMeshes) {
      const index = eye.morphTargetDictionary?.Blink;
      if (index !== undefined && eye.morphTargetInfluences)
        eye.morphTargetInfluences[index] =
          this.mood === "sleepy" && this.reaction === 0 ? 0.7 : blink;
    }
    this.root.position.y = 0.015;
  }
  private releaseModel() {
    this.model?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];
      for (const material of materials) {
        for (const value of Object.values(material))
          if (value instanceof THREE.Texture) value.dispose();
        material.dispose();
      }
    });
    this.model?.removeFromParent();
    this.model = undefined;
  }
  dispose() {
    this.disposed = true;
    this.mixer?.stopAllAction();
    if (this.model) this.mixer?.uncacheRoot(this.model);
    this.releaseModel();
  }
}
