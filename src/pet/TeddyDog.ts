import * as THREE from "three";
import { createModelLoader } from "../utils/modelLoader";
import { assetUrl } from "../utils/assetUrl";
import {
  Spring,
  injectFuzz,
  makeGlowTexture,
  toPhysical,
} from "../utils/characterPolish";

export type PuppyMood = "welcome" | "curious" | "sleepy" | "happy";
export type PuppyCue = "magic" | "piano" | "roar" | "wish" | "play";

const FUR_MATERIALS = new Set([
  "Apricot velvet",
  "Cream velvet",
  "Soft ear fleece",
]);
const FUZZ_TINT: [string, string] = ["#ff9d5c", "#ffe4b8"];

/** Upgrade the plush, eyes and nose so the sculpt reads as a living puppy. */
function polishMaterial(
  material: THREE.Material,
  variant: number,
): THREE.Material {
  const name = material.name;
  if (FUR_MATERIALS.has(name)) {
    const fur =
      material instanceof THREE.MeshPhysicalMaterial
        ? material
        : toPhysical(material);
    fur.sheen = 0.85;
    fur.sheenRoughness = 0.5;
    fur.sheenColor = new THREE.Color(variant ? "#fff0d4" : "#ffb37c");
    fur.roughness = Math.min(0.95, fur.roughness);
    injectFuzz(fur, {
      color: FUZZ_TINT[variant],
      strength: 0.3,
      power: 2.4,
    });
    return fur;
  }
  if (name === "Warm dark eyes") {
    const eyes =
      material instanceof THREE.MeshPhysicalMaterial
        ? material
        : toPhysical(material);
    eyes.color.set("#2a1408");
    eyes.roughness = 0.12;
    eyes.clearcoat = 1;
    eyes.clearcoatRoughness = 0.06;
    return eyes;
  }
  if (name === "Eye glint") {
    const glint = material as THREE.MeshStandardMaterial;
    glint.emissive = new THREE.Color("#fff6e2");
    glint.emissiveIntensity = 1.5;
    return glint;
  }
  if (name === "Soft charcoal nose") {
    const nose =
      material instanceof THREE.MeshPhysicalMaterial
        ? material
        : toPhysical(material);
    nose.clearcoat = 0.9;
    nose.clearcoatRoughness = 0.12;
    nose.roughness = 0.3;
    return nose;
  }
  if (name === "Rose tongue") {
    const tongue =
      material instanceof THREE.MeshPhysicalMaterial
        ? material
        : toPhysical(material);
    tongue.roughness = 0.32;
    tongue.clearcoat = 0.55;
    tongue.clearcoatRoughness = 0.2;
    return tongue;
  }
  if (name === "Sage ribbon" || name === "Berry collar") {
    const fabric =
      material instanceof THREE.MeshPhysicalMaterial
        ? material
        : toPhysical(material);
    fabric.sheen = 0.6;
    fabric.sheenRoughness = 0.6;
    fabric.sheenColor = new THREE.Color("#ffe9c9");
    return fabric;
  }
  if (name === "Brass tag") {
    const tag =
      material instanceof THREE.MeshPhysicalMaterial
        ? material
        : toPhysical(material);
    tag.metalness = 0.92;
    tag.roughness = 0.32;
    return tag;
  }
  return material;
}

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
  private earBones: THREE.Bone[] = [];
  private earSprings: Spring[] = [];
  private catchlights: THREE.Sprite[] = [];
  private squash = new Spring(130, 10);
  private hop = new Spring(150, 12);
  private disposed = false;
  private pending?: { cue: PuppyCue; delay: number };
  private loaderDispose: () => void;
  private time: number;
  private mood: PuppyMood = "welcome";
  private cue: PuppyCue = "magic";
  private reaction = 0;
  private look = new THREE.Vector2();
  private lookTarget = new THREE.Vector2();

  constructor(
    lowDetail = false,
    readonly variant = 0,
    renderer: THREE.WebGLRenderer,
  ) {
    this.time = variant * 1.73;
    this.root.rotation.y = variant ? -0.16 : 0.16;
    const { loader, dispose } = createModelLoader(renderer);
    this.loaderDispose = dispose;
    this.ready = loader
      .loadAsync(assetUrl(`models/teddy-${variant ? "cream" : "apricot"}.glb`))
      .then((gltf) => {
        this.model = gltf.scene;
        if (this.disposed) {
          this.releaseModel();
          return;
        }
        this.model.traverse((object) => {
          if (object instanceof THREE.Bone) {
            if (object.name === "Head") {
              this.head = object;
              this.headPose.copy(object.quaternion);
            }
            if (object.name === "EarL" || object.name === "EarR") {
              this.earBones.push(object);
              this.earSprings.push(new Spring(120, 8));
            }
          }
          if (object instanceof THREE.Mesh) {
            if (object.name === "Tongue") this.tongue = object;
            object.castShadow = !lowDetail;
            object.receiveShadow = true;
            object.frustumCulled = false;
            object.material = Array.isArray(object.material)
              ? object.material.map((m) => polishMaterial(m, this.variant))
              : polishMaterial(object.material, this.variant);
            if (object.morphTargetDictionary?.Blink !== undefined)
              this.blinkMeshes.push(object);
          }
        });
        this.root.add(this.model);
        this.addCatchlights();
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

  /**
   * Bright sprite catchlights parented to the head bone. They sit just above
   * the cornea and shrink with the blink morph, so the eyes stay alive
   * through every head turn.
   */
  private addCatchlights() {
    if (!this.head || !this.model) return;
    // Walk the parent chain so the offset is correct whenever the GLB lands.
    this.head.updateWorldMatrix(true, false);
    const inverse = this.head.matrixWorld.clone().invert();
    const texture = makeGlowTexture(48);
    for (const side of [-1, 1]) {
      // Cornea surface, lifted towards the key light (model faces -Y).
      const world = new THREE.Vector3(side * 0.132, -0.603, 1.322);
      const local = world.applyMatrix4(inverse);
      const material = new THREE.SpriteMaterial({
        map: texture,
        color: "#fff9ea",
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sprite = new THREE.Sprite(material);
      sprite.position.copy(local);
      sprite.scale.setScalar(0.055);
      sprite.userData.baseScale = 0.055;
      this.head.add(sprite);
      this.catchlights.push(sprite);
    }
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
    // 第二只在同一可见场景时钟中错峰，后台不会积压定时器。
    this.pending = { cue, delay: this.variant ? 0.24 : 0 };
  }
  private respond(cue: PuppyCue) {
    this.cue = cue;
    this.reaction = cue === "play" || cue === "wish" ? 3.0 : 2.5;
    this.earSprings.forEach((spring, i) =>
      spring.impulse((i ? -1 : 1) * (cue === "play" ? 2.4 : 1.5)),
    );
    if (cue === "play" || cue === "wish") this.hop.impulse(1.9);
    this.selectAnimation();
  }
  pet() {
    this.pending = undefined;
    this.squash.impulse(-2.6);
    this.respond("play");
  }
  lookAt(x: number, y: number) {
    this.gazeUntil = this.time + 2.5;
    this.lookTarget.set(
      THREE.MathUtils.clamp(x, -1, 1),
      THREE.MathUtils.clamp(y, -1, 1),
    );
  }
  reset() {
    this.pending = undefined;
    this.mood = "welcome";
    this.reaction = 0;
    this.lookTarget.set(0, 0);
    this.selectAnimation();
  }
  update(dt: number, still = false) {
    if (!this.mixer) return;
    this.time += dt;
    if (this.pending) {
      this.pending.delay -= dt;
      if (still || this.pending.delay <= 0) {
        const cue = this.pending.cue;
        this.pending = undefined;
        this.respond(cue);
      }
    }
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
        this.gazeAngles.set(-this.look.y * 0.1, 0, this.look.x * 0.16);
        this.gazePose.setFromEuler(this.gazeAngles);
        this.head.quaternion.multiply(this.gazePose);
      }
    }
    // Ear jiggle follows the same post-mixer pass so clips never fight it.
    this.earBones.forEach((bone, i) => {
      const sway = this.earSprings[i].update(still ? 0 : dt);
      if (!still && sway) {
        this.gazeAngles.set(0, 0, sway * 0.09 * (i ? -1 : 1));
        this.gazePose.setFromEuler(this.gazeAngles);
        bone.quaternion.multiply(this.gazePose);
      }
    });
    if (this.tongue)
      this.tongue.visible = this.reaction > 0 || this.mood === "happy";
    const blinkPhase = this.time % (this.variant ? 5.7 : 4.9);
    const blink =
      !still && blinkPhase > 4.55 && blinkPhase < 4.76
        ? Math.sin(((blinkPhase - 4.55) / 0.21) * Math.PI)
        : 0;
    const lid = this.mood === "sleepy" && this.reaction === 0 ? 0.7 : blink;
    for (const eye of this.blinkMeshes) {
      const index = eye.morphTargetDictionary?.Blink;
      if (index !== undefined && eye.morphTargetInfluences)
        eye.morphTargetInfluences[index] = lid;
    }
    for (const light of this.catchlights) {
      const open = 1 - lid * 0.92;
      light.scale.setScalar(light.userData.baseScale * Math.max(0.08, open));
      (light.material as THREE.SpriteMaterial).opacity = 0.95 * open;
    }
    // Breathing plus squash-and-stretch keep the plush body alive.
    const squashAmount = this.squash.update(still ? 0 : dt);
    const hopAmount = this.hop.update(still ? 0 : dt);
    const breath = still ? 0 : Math.sin(this.time * 2.4 + this.variant) * 0.006;
    if (this.model) {
      this.model.scale.set(
        1 - squashAmount * 0.05 - breath * 0.4,
        1 + squashAmount * 0.09 + breath,
        1 - squashAmount * 0.05 - breath * 0.4,
      );
    }
    this.root.position.y = 0.015 + Math.max(0, hopAmount) * 0.05;
  }
  private releaseModel() {
    for (const sprite of this.catchlights) {
      sprite.material.map?.dispose();
      sprite.material.dispose();
      sprite.removeFromParent();
    }
    this.catchlights = [];
    this.model?.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.geometry.dispose();
      if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
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
    this.loaderDispose();
    this.mixer?.stopAllAction();
    if (this.model) this.mixer?.uncacheRoot(this.model);
    this.releaseModel();
  }
}
