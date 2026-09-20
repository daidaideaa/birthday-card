import * as THREE from "three";
export type PuppyMood = "welcome" | "curious" | "sleepy" | "happy";
export type PuppyCue = "magic" | "piano" | "roar" | "wish" | "play";

/** 两只独立关节驱动的小狗；细小毛簇取代旧版线圈毛发。 */
export class TeddyDog {
  readonly root = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private ears: THREE.Group[] = [];
  private legs: THREE.Group[] = [];
  private knees: THREE.Group[] = [];
  private tail = new THREE.Group();
  private eyes: THREE.Mesh[] = [];
  private tongue: THREE.Mesh;
  private mouth = new THREE.Group();
  private time: number;
  private moodTime = 0;
  private delight = 0;
  private reaction = 0;
  private reactionTime = 99;
  private cue: PuppyCue = "magic";
  private sleep = 0;
  private look = new THREE.Vector2();
  private lookTarget = new THREE.Vector2();
  private mood: PuppyMood = "welcome";
  private seed: number;
  private density: number;
  private coatColor: THREE.Color;
  private earColor: THREE.Color;
  private curl = new THREE.SphereGeometry(1, 7, 5);
  private wool = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    roughness: 0.92,
    sheen: 1,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color("#fff5df"),
  });
  constructor(
    lowDetail = false,
    readonly variant = 0,
  ) {
    this.time = variant * 1.83;
    this.seed = 7183 + variant * 121;
    this.density = lowDetail ? 0.55 : 1;
    this.coatColor = new THREE.Color(variant ? "#e8d5b1" : "#c79460");
    this.earColor = new THREE.Color(variant ? "#cbb18a" : "#ad7747");
    this.root.add(this.torso);
    this.fur(this.torso, [0, 0.8, -0.09], [0.34, 0.37, 0.49], 650);
    this.fur(this.torso, [0, 0.92, 0.25], [0.29, 0.34, 0.25], 280);
    this.head.position.set(0, 1.26, 0.32);
    this.torso.add(this.head);
    this.fur(this.head, [0, 0.12, 0], [0.38, 0.37, 0.32], 650);
    // 双侧口鼻毛团，让眼睛与嘴巴从蓬松轮廓中清楚露出。
    for (const side of [-1, 1]) {
      this.fur(
        this.head,
        [side * 0.11, -0.07, 0.29],
        [0.16, 0.13, 0.14],
        110,
        this.coatColor.clone().lerp(new THREE.Color("#ffebc9"), 0.33),
      );
      const ear = new THREE.Group();
      ear.position.set(side * 0.32, 0.18, -0.035);
      this.head.add(ear);
      this.ears.push(ear);
      this.fur(
        ear,
        [side * 0.055, -0.24, 0],
        [0.15, 0.28, 0.15],
        280,
        this.earColor,
      );
      this.ball(
        this.head,
        [side * 0.165, 0.145, 0.296],
        [0.083, 0.086, 0.049],
        variant ? "#a58b69" : "#88592f",
        0.9,
      );
      const eye = this.ball(
        this.head,
        [side * 0.165, 0.147, 0.33],
        [0.063, 0.069, 0.037],
        "#180f0b",
        0.08,
      );
      this.eyes.push(eye);
      this.ball(eye, [-0.26, 0.3, 0.83], [0.23, 0.24, 0.14], "#fff5e8", 0.15);
      this.ball(eye, [0.3, -0.28, 0.91], [0.09, 0.1, 0.07], "#c9bfac", 0.2);
      for (const front of [true, false]) {
        const leg = new THREE.Group();
        leg.position.set(side * 0.235, 0.73, front ? 0.23 : -0.39);
        this.torso.add(leg);
        this.legs.push(leg);
        this.fur(leg, [0, -0.16, 0], [0.115, 0.21, 0.14], 170);
        const knee = new THREE.Group();
        knee.position.set(0, -0.27, 0);
        leg.add(knee);
        this.knees.push(knee);
        this.fur(knee, [0, -0.14, 0.025], [0.1, 0.18, 0.12], 130);
        this.fur(knee, [0, -0.3, 0.075], [0.135, 0.1, 0.17], 135);
      }
    }
    this.tail.position.set(0, 0.96, -0.54);
    this.torso.add(this.tail);
    this.fur(this.tail, [0, 0.13, -0.035], [0.1, 0.19, 0.105], 150);
    this.ball(
      this.head,
      [0, -0.018, 0.421],
      [0.083, 0.059, 0.052],
      "#251713",
      0.18,
    );
    this.ball(
      this.head,
      [-0.023, 0.004, 0.457],
      [0.023, 0.012, 0.008],
      "#807062",
      0.28,
    );
    this.mouth.position.set(0, -0.142, 0.35);
    this.head.add(this.mouth);
    this.ball(this.mouth, [0, 0, 0], [0.083, 0.044, 0.055], "#422323", 0.78);
    this.tongue = this.ball(
      this.mouth,
      [0, -0.022, 0.055],
      [0.045, 0.06, 0.023],
      "#d58f91",
      0.65,
    );
    const collar = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.026, 8, 40),
      new THREE.MeshStandardMaterial({
        color: variant ? "#627e78" : "#803e45",
        roughness: 0.75,
      }),
    );
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 1.15, 0.31);
    this.torso.add(collar);
    this.ball(
      this.torso,
      [0, 1.05, 0.555],
      [0.045, 0.057, 0.012],
      "#d8b66f",
      0.3,
      0.65,
    );
    // 耳旁的小丝绒蝴蝶结，两只狗保留各自的辨识度。
    if (variant) {
      const bow = new THREE.Group();
      bow.position.set(-0.31, 0.31, 0.15);
      bow.rotation.z = -0.22;
      this.head.add(bow);
      this.ball(bow, [-0.062, 0, 0], [0.075, 0.047, 0.024], "#839d94", 0.95);
      this.ball(bow, [0.062, 0, 0], [0.075, 0.047, 0.024], "#839d94", 0.95);
      this.ball(bow, [0, 0, 0.015], [0.026, 0.032, 0.025], "#b4c1a2", 0.85);
    }
    this.root.rotation.y = variant ? -0.18 : 0.18;
  }
  private random() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }
  private ball(
    parent: THREE.Object3D,
    p: number[],
    s: number[],
    color: string,
    roughness = 0.9,
    metalness = 0,
  ) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        metalness,
        clearcoat: roughness < 0.3 ? 0.35 : 0,
      }),
    );
    m.position.fromArray(p);
    m.scale.fromArray(s);
    m.castShadow = true;
    parent.add(m);
    return m;
  }
  private fur(
    parent: THREE.Object3D,
    p: number[],
    r: number[],
    amount: number,
    color = this.coatColor,
  ) {
    const undercoat = this.ball(parent, p, r, "#" + color.getHexString());
    // Matching the fleece finish keeps the shallow curls part of one soft coat.
    undercoat.material.sheen = 1;
    undercoat.material.sheenRoughness = 0.8;
    undercoat.material.sheenColor.copy(this.wool.sheenColor);
    const count = Math.round(amount * this.density * 1.45);
    const mesh = new THREE.InstancedMesh(this.curl, this.wool, count);
    const o = new THREE.Object3D(),
      normal = new THREE.Vector3(),
      axis = new THREE.Vector3(0, 1, 0),
      tint = new THREE.Color();
    for (let i = 0; i < count; i++) {
      const y = THREE.MathUtils.clamp(
          1 - (2 * (i + 0.5)) / count + (this.random() - 0.5) * 0.045,
          -0.998,
          0.998,
        ),
        a = i * 2.39996323 + this.random() * 0.48,
        q = Math.sqrt(1 - y * y),
        x = q * Math.cos(a),
        z = q * Math.sin(a);
      o.position.set(p[0] + x * r[0], p[1] + y * r[1], p[2] + z * r[2]);
      normal.set(x / r[0], y / r[1], z / r[2]).normalize();
      o.position.addScaledVector(normal, -0.002);
      o.quaternion.setFromUnitVectors(axis, normal);
      o.rotateY(this.random() * 6.28);
      const size = 0.021 + this.random() * 0.008;
      o.scale.set(size * (0.9 + this.random() * 0.35), size * 0.42, size);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      tint.copy(color).multiplyScalar(0.975 + this.random() * 0.05);
      mesh.setColorAt(i, tint);
    }
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    parent.add(mesh);
  }
  setMood(mood: PuppyMood) {
    if (this.mood !== mood) {
      this.mood = mood;
      this.moodTime = 0;
    }
  }
  react(cue: PuppyCue) {
    this.cue = cue;
    this.reaction = 1;
    this.reactionTime = 0;
    if (cue === "play" || cue === "wish") this.delight = 1;
  }
  pet() {
    this.delight = 1;
    this.react("play");
  }
  lookAt(x: number, y: number) {
    this.lookTarget.set(x, y);
  }
  reset() {
    this.mood = "welcome";
    this.moodTime = 0;
    this.delight = 0;
    this.reaction = 0;
    this.reactionTime = 99;
    this.sleep = 0;
    this.lookTarget.set(0, 0);
  }
  update(dt: number, still = false) {
    this.time += dt;
    this.moodTime += dt;
    this.reactionTime += dt;
    const t = this.time,
      k = 1 - Math.exp(-dt * 4);
    this.delight *= Math.exp(-dt * 0.5);
    this.reaction = Math.max(0, this.reaction - dt * 0.26);
    this.look.lerp(this.lookTarget, k);
    this.sleep +=
      ((this.mood === "sleepy" && this.reaction < 0.2 ? 1 : 0) - this.sleep) *
      k;
    const happy = this.mood === "happy" ? 0.85 : this.delight;
    const startle =
      this.cue === "roar" ? Math.sin(this.reaction * Math.PI) * 0.7 : 0;
    const walking =
      !still &&
      this.sleep < 0.1 &&
      ((this.moodTime < 2.7 && this.mood !== "welcome") ||
        (this.cue === "play" && this.reaction > 0.4));
    const breath = still ? 0 : Math.sin(t * 2.7) * 0.008;
    const curious =
      this.cue === "magic" || this.cue === "piano" ? this.reaction : 0;
    const neighbor = !still
      ? Math.sin(t * 0.36 + (this.variant ? 1.4 : 0)) * 0.2
      : 0;
    // 先邀玩、再对望、接力小跳，两只狗共享事件时钟而保留动作差异。
    const playTime = Math.max(0, this.reactionTime - this.variant * 0.23);
    const play = !still && this.cue === "play" && this.reaction > 0;
    const bow =
      play && playTime < 0.7 ? Math.sin((playTime / 0.7) * Math.PI) : 0;
    const meet = play ? Math.sin(Math.min(1, playTime / 2.6) * Math.PI) : 0;
    const hop =
      play && playTime > 0.7 && playTime < 2.1
        ? Math.max(0, Math.sin((playTime - 0.7) * 7.5)) * 0.105
        : 0;
    const listen =
      !still && this.cue === "piano"
        ? this.reaction * Math.sin(this.reactionTime * 3.4 + this.variant * 0.5)
        : 0;
    this.torso.position.y =
      -this.sleep * 0.36 + breath - startle * 0.05 - bow * 0.045;
    this.torso.rotation.x =
      this.sleep * 0.12 + bow * 0.11 + (walking ? Math.sin(t * 10) * 0.015 : 0);
    this.torso.scale.y = 1 + breath;
    this.head.rotation.set(
      this.sleep * 0.24 - this.look.y * 0.12 - curious * 0.1 - startle * 0.08,
      this.look.x * 0.2 +
        neighbor +
        meet * (this.variant ? -0.24 : 0.24) +
        startle * (this.variant ? -0.38 : 0.38),
      this.variant ? 0.055 : -0.055,
    );
    this.head.rotation.z += still
      ? 0
      : Math.sin(t * 1.1) * 0.035 +
        happy * Math.sin(t * 2.1) * 0.085 +
        listen * 0.06;
    this.head.position.y = 1.26 - this.sleep * 0.11;
    this.legs.forEach((leg, i) => {
      const rear = i % 2 === 1;
      leg.rotation.x =
        this.sleep * (rear ? -1.18 : -1.1) +
        (walking
          ? Math.sin(t * 10 + (i === 0 || i === 3 ? 0 : Math.PI)) * 0.4
          : 0);
      leg.rotation.z = this.sleep * (i < 2 ? -0.1 : 0.1);
      this.knees[i].rotation.x =
        (walking ? Math.max(0, Math.sin(t * 10 + i * Math.PI)) * 0.25 : 0) +
        (!rear ? bow * 0.3 : 0);
    });
    this.ears.forEach((ear, i) => {
      ear.rotation.z =
        (i ? -1 : 1) * 0.09 +
        (still
          ? 0
          : Math.sin(t * (walking ? 10 : 3) + i) * 0.035 +
            startle * (i ? 0.22 : -0.22));
    });
    this.tail.rotation.z = still
      ? 0
      : Math.sin(t * (7 + happy * 7)) *
        (0.22 + happy * 0.42) *
        (1 - this.sleep * 0.8);
    const blink =
      !still &&
      t % (this.variant ? 5.3 : 4.6) > 4.42 &&
      t % (this.variant ? 5.3 : 4.6) < 4.6;
    this.eyes.forEach(
      (e) => (e.scale.y = 0.069 * (this.sleep > 0.9 ? 0.12 : blink ? 0.15 : 1)),
    );
    this.mouth.scale.y =
      0.5 + happy * 0.65 + (still ? 0 : Math.sin(t * 4) * 0.05);
    this.tongue.visible = this.sleep < 0.6;
    const chase = walking
      ? Math.sin(this.moodTime * 1.7 + this.variant) * 0.1
      : 0;
    this.root.position.x = chase + meet * (this.variant ? -0.045 : 0.045);
    this.root.position.y =
      0.055 +
      hop +
      (walking ? Math.abs(Math.sin(t * 10)) * 0.019 : 0) +
      (happy > 0.5 && !still && !play
        ? Math.max(0, Math.sin(t * 4.4)) * happy * 0.1
        : 0);
    this.root.rotation.y =
      (this.variant ? -0.18 : 0.18) +
      meet * (this.variant ? -0.1 : 0.1) +
      (walking ? Math.sin(t * 0.9) * 0.12 : 0);
  }
  dispose() {
    const geometry = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>();
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometry.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        );
      }
    });
    geometry.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
  }
}
