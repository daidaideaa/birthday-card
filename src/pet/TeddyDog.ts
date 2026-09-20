import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export type PuppyMood = "welcome" | "curious" | "sleepy" | "happy";

class Curl extends THREE.Curve<THREE.Vector3> {
  constructor() {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * Math.PI * 2.8;
    return target.set(Math.cos(a) * 0.7, Math.sin(a) * 0.7, (t - 0.5) * 1.4);
  }
}

/** 自建骨骼泰迪：身体蒙皮与卷毛共用关节，动画不依赖远端模型。 */
export class TeddyDog {
  readonly root = new THREE.Group();
  readonly bones: THREE.Bone[] = [];
  readonly body: THREE.SkinnedMesh;
  private spine: THREE.Bone;
  private neck: THREE.Bone;
  private ears: THREE.Bone[] = [];
  private legs: THREE.Bone[] = [];
  private ankles: THREE.Bone[] = [];
  private tail: THREE.Bone;
  private eyes: THREE.Mesh[] = [];
  private furMaterial = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness: 0.92,
  });
  private curlGeometry = new THREE.TubeGeometry(new Curl(), 8, 0.23, 3, false);
  private geometries: THREE.BufferGeometry[] = [];
  private skinParts: THREE.BufferGeometry[] = [];
  private seed = 723;
  private time = 0;
  private moodTime = 0;
  private delight = 0;
  private walkTime = 0;
  private sleep = 0;
  private sit = 0;
  private mood: PuppyMood = "welcome";

  constructor(lowDetail = false) {
    this.spine = this.bone("spine", this.root, [0, 0, 0]);
    this.neck = this.bone("neck", this.spine, [0, 1.48, 0.45]);
    this.tail = this.bone("tail", this.spine, [0, 1.05, -0.62]);
    const density = lowDetail ? 0.52 : 1;
    this.coat(
      this.spine,
      [0, 0.99, -0.02],
      [0.43, 0.49, 0.65],
      Math.round(2100 * density),
    );
    this.coat(
      this.spine,
      [0, 1.1, 0.42],
      [0.31, 0.42, 0.3],
      Math.round(640 * density),
    );
    this.coat(
      this.neck,
      [0, 0.08, 0],
      [0.36, 0.38, 0.32],
      Math.round(1300 * density),
    );
    this.coat(
      this.neck,
      [0, -0.1, 0.29],
      [0.245, 0.19, 0.235],
      Math.round(540 * density),
      "#d3a16c",
    );
    for (const side of [-1, 1]) {
      const ear = this.bone(side < 0 ? "earL" : "earR", this.neck, [
        side * 0.32,
        0.1,
        -0.02,
      ]);
      this.ears.push(ear);
      this.coat(
        ear,
        [side * 0.018, -0.25, 0.025],
        [0.145, 0.34, 0.19],
        Math.round(700 * density),
        "#a96e3c",
      );
      for (const front of [true, false]) {
        const upper = this.bone((front ? "front" : "back") + side, this.spine, [
          side * 0.265,
          front ? 0.96 : 0.9,
          front ? 0.42 : -0.43,
        ]);
        this.legs.push(upper);
        this.coat(
          upper,
          [0, -0.23, front ? 0 : -0.025],
          [front ? 0.13 : 0.18, 0.3, front ? 0.15 : 0.21],
          Math.round(410 * density),
        );
        const lower = this.bone(
          "ankle" + this.bones.length,
          upper,
          [0, -0.46, 0],
        );
        this.ankles.push(lower);
        this.coat(
          lower,
          [0, -0.17, 0.01],
          [0.115, 0.23, 0.13],
          Math.round(280 * density),
        );
        this.coat(
          lower,
          [0, -0.35, 0.07],
          [0.15, 0.105, 0.2],
          Math.round(240 * density),
          "#bf8c55",
        );
      }
      const eye = this.smooth(
        this.neck,
        [side * 0.17, 0.15, 0.284],
        [0.064, 0.067, 0.048],
        "#20130c",
        0.1,
      );
      this.eyes.push(eye);
      this.smooth(
        eye,
        [-0.23, 0.31, 0.85],
        [0.24, 0.28, 0.17],
        "#fff0d8",
        0.15,
      );
    }
    this.coat(
      this.tail,
      [0, 0.19, -0.08],
      [0.1, 0.23, 0.105],
      Math.round(340 * density),
    );
    this.smooth(
      this.neck,
      [0, -0.035, 0.505],
      [0.105, 0.073, 0.078],
      "#271911",
      0.23,
    );
    for (const side of [-1, 1])
      this.smooth(
        this.neck,
        [side * 0.044, -0.044, 0.565],
        [0.016, 0.012, 0.009],
        "#070604",
        0.35,
      );
    this.smooth(
      this.neck,
      [0, -0.18, 0.465],
      [0.07, 0.023, 0.03],
      "#39241e",
      0.8,
    );
    // 细丝绒项圈和小小的金色吊牌。
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.29, 0.028, 8, 40),
      new THREE.MeshStandardMaterial({ color: "#6c3336", roughness: 0.75 }),
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 1.34, 0.43);
    this.spine.add(collar);
    this.smooth(
      this.spine,
      [0, 1.24, 0.725],
      [0.068, 0.082, 0.018],
      "#c3a164",
      0.4,
      0.6,
    );
    this.root.updateMatrixWorld(true);
    const merged = mergeGeometries(this.skinParts);
    this.body = new THREE.SkinnedMesh(
      merged,
      new THREE.MeshStandardMaterial({ color: "#aa7545", roughness: 0.96 }),
    );
    this.body.add(this.spine);
    this.root.add(this.body);
    this.body.bind(new THREE.Skeleton(this.bones));
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.skinParts.forEach((g) => g.dispose());
  }
  private random() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  private bone(name: string, parent: THREE.Object3D, position: number[]) {
    const b = new THREE.Bone();
    b.name = name;
    b.position.fromArray(position);
    parent.add(b);
    this.bones.push(b);
    return b;
  }
  private coat(
    bone: THREE.Bone,
    center: number[],
    radii: number[],
    count: number,
    color = "#bc8a55",
  ) {
    const core = new THREE.SphereGeometry(1, 24, 18);
    core.scale(radii[0], radii[1], radii[2]);
    core.translate(center[0], center[1], center[2]);
    this.root.updateMatrixWorld(true);
    core.applyMatrix4(bone.matrixWorld);
    const weights = [],
      joints = [];
    for (let i = 0; i < core.attributes.position.count; i++) {
      joints.push(this.bones.indexOf(bone), 0, 0, 0);
      weights.push(1, 0, 0, 0);
    }
    core.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(joints, 4));
    core.setAttribute(
      "skinWeight",
      new THREE.Float32BufferAttribute(weights, 4),
    );
    this.skinParts.push(core);
    const curls = new THREE.InstancedMesh(
      this.curlGeometry,
      this.furMaterial,
      count,
    );
    const object = new THREE.Object3D();
    const normal = new THREE.Vector3();
    const tint = new THREE.Color();
    const base = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const y = 1 - (2 * (i + 0.5)) / count;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.399963229728653;
      const x = Math.cos(a) * r,
        z = Math.sin(a) * r;
      object.position.set(
        center[0] + x * radii[0],
        center[1] + y * radii[1],
        center[2] + z * radii[2],
      );
      normal.set(x / radii[0], y / radii[1], z / radii[2]).normalize();
      object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
      object.rotateZ(this.random() * Math.PI * 2);
      const size = 0.017 + this.random() * 0.013;
      object.scale.set(size, size * (0.9 + this.random() * 0.5), size * 1.3);
      object.updateMatrix();
      curls.setMatrixAt(i, object.matrix);
      tint.copy(base).multiplyScalar(0.85 + this.random() * 0.32);
      curls.setColorAt(i, tint);
    }
    curls.castShadow = !count || count < 2000;
    curls.receiveShadow = true;
    bone.add(curls);
  }
  private smooth(
    parent: THREE.Object3D,
    position: number[],
    scale: number[],
    color: string,
    roughness: number,
    metalness = 0,
  ) {
    const geometry = new THREE.SphereGeometry(1, 20, 14);
    this.geometries.push(geometry);
    const m = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color, roughness, metalness }),
    );
    m.position.fromArray(position);
    m.scale.fromArray(scale);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  setMood(mood: PuppyMood) {
    if (this.mood !== mood) {
      this.mood = mood;
      this.moodTime = 0;
      this.walkTime = mood === "sleepy" ? 0 : 2.4;
    }
  }
  pet() {
    this.delight = 1;
  }
  reset() {
    this.mood = "welcome";
    this.delight = 0;
    this.walkTime = 0;
    this.time = 0;
    this.moodTime = 0;
  }
  update(dt: number, still = false) {
    this.time += dt;
    this.moodTime += dt;
    const t = this.time;
    const k = 1 - Math.exp(-dt * 3);
    this.sleep += ((this.mood === "sleepy" ? 1 : 0) - this.sleep) * k;
    this.sit += ((this.mood === "welcome" ? 1 : 0) - this.sit) * k;
    this.delight *= Math.exp(-dt * 0.6);
    this.walkTime = Math.max(0, this.walkTime - dt);
    const walking = !still && this.walkTime > 0;
    const happy = this.mood === "happy" ? 0.7 : this.delight;
    const breath = Math.sin(t * 2.2) * (still ? 0 : 0.009);
    this.spine.position.y =
      -this.sleep * 0.5 -
      this.sit * 0.18 +
      breath +
      (walking ? Math.abs(Math.sin(t * 8)) * 0.028 : 0);
    this.spine.rotation.x = -this.sit * 0.3;
    this.spine.scale.y = 1 + breath * 0.55;
    this.neck.rotation.set(
      this.sleep * 0.33 - happy * 0.12,
      still ? 0 : Math.sin(t * 0.55) * 0.12 + happy * Math.sin(t * 2) * 0.11,
      happy * 0.16,
    );
    this.neck.position.y = 1.48 - this.sleep * 0.18;
    for (let i = 0; i < this.legs.length; i++) {
      const rear = i % 2 === 1;
      this.legs[i].rotation.x =
        this.sleep * (rear ? -1.2 : -1.1) +
        this.sit * (rear ? -0.95 : 0.14) +
        (walking
          ? Math.sin(t * 8 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.36
          : 0);
      this.ankles[i].rotation.x = rear ? this.sit * 1.4 : 0;
      this.legs[i].rotation.z = this.sleep * (i < 2 ? -0.16 : 0.16);
    }
    this.ears.forEach((e, i) => {
      e.rotation.z =
        (i ? -1 : 1) * 0.08 +
        (still
          ? 0
          : Math.sin(t * (walking ? 8 : 2) + i) * (walking ? 0.09 : 0.012));
    });
    this.tail.rotation.z = still
      ? 0
      : Math.sin(t * (5 + happy * 9)) *
        (0.15 + happy * 0.55) *
        (1 - this.sleep * 0.8);
    const blink = !still && t % 4.7 > 4.5 ? 0.12 : 1;
    this.eyes.forEach((e) => {
      e.scale.y =
        0.067 * (this.sleep > 0.85 && this.delight < 0.2 ? 0.17 : blink);
    });
    this.root.rotation.y =
      -0.22 +
      (walking ? Math.sin(((2.4 - this.walkTime) * Math.PI) / 2.4) * 0.35 : 0);
    this.root.position.x = walking
      ? Math.sin(((2.4 - this.walkTime) * Math.PI * 2) / 2.4) * 0.15
      : 0;
    if (!still && happy > 0.6 && this.mood === "happy" && this.moodTime < 1.2)
      this.root.position.y =
        0.07 + Math.max(0, Math.sin((this.moodTime * Math.PI) / 1.2)) * 0.12;
    else this.root.position.y = 0.07;
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.body.skeleton.dispose();
  }
}
