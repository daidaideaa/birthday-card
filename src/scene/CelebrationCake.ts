import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** 可实时旋转的双层奶油蛋糕，装饰、烛光与熄灭后的烟雾均为三维几何。 */
export class CelebrationCake {
  readonly root = new THREE.Group();
  private flame = new THREE.Group();
  private candleLight = new THREE.PointLight("#ffb653", 3, 6, 2);
  private smoke: THREE.Points;
  private extinguished = -1;
  private time = 0;
  constructor() {
    const cream = new THREE.MeshPhysicalMaterial({
      color: "#fff0d6",
      roughness: 0.72,
      sheen: 0.45,
      sheenColor: new THREE.Color("#ffe5d5"),
    });
    const rose = new THREE.MeshStandardMaterial({
      color: "#dba1a0",
      roughness: 0.8,
    });
    const gold = new THREE.MeshStandardMaterial({
      color: "#c9a15b",
      metalness: 0.65,
      roughness: 0.3,
    });
    const ceramic = new THREE.MeshPhysicalMaterial({
      color: "#eee1ca",
      roughness: 0.24,
      clearcoat: 0.6,
    });
    const add = (
      g: THREE.BufferGeometry,
      m: THREE.Material,
      p: number[],
      parent = this.root,
    ) => {
      const o = new THREE.Mesh(g, m);
      o.position.fromArray(p);
      o.castShadow = true;
      o.receiveShadow = true;
      parent.add(o);
      return o;
    };
    const stand = new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.65, 0),
        new THREE.Vector2(0.67, 0.055),
        new THREE.Vector2(0.3, 0.12),
        new THREE.Vector2(0.2, 0.33),
        new THREE.Vector2(0.23, 0.41),
        new THREE.Vector2(1.25, 0.44),
        new THREE.Vector2(1.3, 0.49),
        new THREE.Vector2(1.28, 0.53),
        new THREE.Vector2(0, 0.53),
      ],
      80,
    );
    add(stand, ceramic, [0, 0, 0]);
    const rim = add(
      new THREE.TorusGeometry(1.27, 0.012, 8, 96),
      gold,
      [0, 0.505, 0],
    );
    rim.rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(1.0, 1.01, 0.59, 80), rose, [0, 0.825, 0]);
    add(
      new THREE.CylinderGeometry(1.015, 1.015, 0.045, 80),
      cream,
      [0, 1.135, 0],
    );
    add(new THREE.CylinderGeometry(0.66, 0.68, 0.48, 72), cream, [0, 1.39, 0]);
    add(
      new THREE.CylinderGeometry(0.66, 0.66, 0.026, 72),
      cream,
      [0, 1.639, 0],
    );
    // 连续裱花垂幔与底边珍珠。
    for (const [radius, y, n] of [
      [1.018, 1.02, 12],
      [0.686, 1.55, 9],
    ]) {
      for (let i = 0; i < n; i++) {
        const points = [];
        for (let j = 0; j <= 14; j++) {
          const a = ((i + j / 14) / n) * Math.PI * 2;
          points.push(
            new THREE.Vector3(
              Math.cos(a) * radius,
              y - Math.sin((j / 14) * Math.PI) * 0.12,
              Math.sin(a) * radius,
            ),
          );
        }
        add(
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(points),
            16,
            0.019,
            5,
            false,
          ),
          cream,
          [0, 0, 0],
        );
      }
    }
    const pearl = new THREE.SphereGeometry(0.036, 9, 7);
    for (const [radius, y, n] of [
      [1.015, 0.565, 55],
      [0.69, 1.178, 38],
    ])
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        add(pearl, cream, [Math.cos(a) * radius, y, Math.sin(a) * radius]);
      }
    const berry = new THREE.SphereGeometry(1, 20, 16);
    const vertices = berry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      const y = vertices.getY(i),
        factor = 0.72 + (0.24 * (y + 1)) / 2;
      vertices.setXYZ(
        i,
        vertices.getX(i) * 0.12 * factor,
        y * 0.18,
        vertices.getZ(i) * 0.12 * factor,
      );
    }
    berry.computeVertexNormals();
    const red = new THREE.MeshPhysicalMaterial({
      color: "#b93a40",
      roughness: 0.4,
      clearcoat: 0.3,
    });
    const leafMat = new THREE.MeshStandardMaterial({
      color: "#617b41",
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2,
        group = new THREE.Group();
      group.position.set(Math.cos(a) * 0.49, 1.77, Math.sin(a) * 0.49);
      group.rotation.z = Math.sin(a) * 0.2;
      this.root.add(group);
      add(berry, red, [0, 0, 0], group);
      for (let j = 0; j < 5; j++) {
        const leaf = add(
          new THREE.SphereGeometry(1, 8, 5),
          leafMat,
          [Math.cos(j * 1.256) * 0.035, 0.17, Math.sin(j * 1.256) * 0.035],
          group,
        );
        leaf.scale.set(0.027, 0.007, 0.068);
        leaf.rotation.y = -j * 1.256;
      }
      const seeds = new THREE.InstancedMesh(
          new THREE.SphereGeometry(1, 5, 4),
          new THREE.MeshStandardMaterial({ color: "#efb976", roughness: 0.7 }),
          38,
        ),
        o = new THREE.Object3D();
      for (let j = 0; j < 38; j++) {
        const y = 1 - (2 * (j + 0.5)) / 38,
          r = Math.sqrt(1 - y * y),
          angle = j * 2.39996,
          f = 0.72 + (0.24 * (y + 1)) / 2;
        o.position.set(
          Math.cos(angle) * r * 0.122 * f,
          y * 0.18,
          Math.sin(angle) * r * 0.122 * f,
        );
        o.scale.set(0.006, 0.011, 0.004);
        o.rotation.y = -angle + Math.PI / 2;
        o.updateMatrix();
        seeds.setMatrixAt(j, o.matrix);
      }
      group.add(seeds);
    }
    // 螺旋奶油玫瑰，保留真实起伏而不是平面装饰。
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        pts = [];
      for (let j = 0; j <= 60; j++) {
        const t = j / 60,
          r = 0.095 * (1 - t);
        pts.push(
          new THREE.Vector3(
            Math.cos(a) * 0.86 + Math.cos(t * 15) * r,
            1.18 + t * 0.105,
            Math.sin(a) * 0.86 + Math.sin(t * 15) * r,
          ),
        );
      }
      add(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(pts),
          60,
          0.027,
          6,
          false,
        ),
        cream,
        [0, 0, 0],
      );
    }
    const wax = new THREE.MeshStandardMaterial({
      color: "#ddbb79",
      roughness: 0.6,
    });
    add(new THREE.CylinderGeometry(0.035, 0.037, 0.48, 18), wax, [0, 1.89, 0]);
    add(
      new THREE.CylinderGeometry(0.006, 0.006, 0.045, 8),
      new THREE.MeshBasicMaterial({ color: "#483326" }),
      [0, 2.148, 0],
    );
    this.flame.position.set(0, 2.225, 0);
    this.root.add(this.flame);
    const glowMat = new THREE.MeshBasicMaterial({
      color: "#ffc04f",
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
    });
    const outer = add(
      new THREE.SphereGeometry(1, 20, 16),
      glowMat,
      [0, 0, 0],
      this.flame,
    );
    outer.scale.set(0.056, 0.12, 0.046);
    const inner = add(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({ color: "#fff4c3" }),
      [0, -0.027, 0.012],
      this.flame,
    );
    inner.scale.set(0.028, 0.065, 0.03);
    this.candleLight.position.set(0, 2.23, 0);
    this.root.add(this.candleLight);
    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(new Float32Array(60 * 3), 3),
    );
    this.smoke = new THREE.Points(
      smokeGeo,
      new THREE.ShaderMaterial({
        uniforms: { opacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        vertexShader: `void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_PointSize=min(20.0,80.0/-p.z);gl_Position=projectionMatrix*p;}`,
        fragmentShader: `uniform float opacity;void main(){float r=length(gl_PointCoord-0.5)*2.0;float a=exp(-r*r*4.0)*(1.0-smoothstep(0.6,1.0,r));if(a<0.01)discard;gl_FragColor=vec4(0.85,0.8,0.73,a*opacity);}`,
      }),
    );
    this.root.add(this.smoke);
    // Bake opaque decorations into three batches: many details, few draw calls.
    this.root.updateMatrixWorld(true);
    for (const material of [cream, leafMat, red]) {
      const pieces: THREE.BufferGeometry[] = [];
      const meshes: THREE.Mesh[] = [];
      const originals = new Set<THREE.BufferGeometry>();
      this.root.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          !(object instanceof THREE.InstancedMesh) &&
          object.material === material
        ) {
          pieces.push(object.geometry.clone().applyMatrix4(object.matrixWorld));
          originals.add(object.geometry);
          meshes.push(object);
        }
      });
      const merged = mergeGeometries(pieces, false);
      pieces.forEach((geometry) => geometry.dispose());
      if (merged) {
        meshes.forEach((mesh) => mesh.removeFromParent());
        originals.forEach((geometry) => geometry.dispose());
        add(merged, material, [0, 0, 0]);
      }
    }
  }
  extinguish() {
    if (this.extinguished < 0) this.extinguished = 0;
  }
  update(dt: number, still = false) {
    this.time += dt;
    const t = this.time;
    if (this.extinguished >= 0) this.extinguished += dt;
    const light =
      this.extinguished < 0 ? 1 : Math.max(0, 1 - this.extinguished * 3.5);
    this.flame.visible = light > 0;
    this.flame.scale.set(
      light,
      light * (still ? 1 : 1 + Math.sin(t * 16) * 0.1),
      light,
    );
    this.flame.rotation.z = still ? 0 : Math.sin(t * 8) * 0.11;
    this.candleLight.intensity =
      light * (3 + (still ? 0 : Math.sin(t * 17) * 0.35));
    const mat = this.smoke.material as THREE.ShaderMaterial;
    mat.uniforms.opacity.value =
      this.extinguished < 0
        ? 0
        : Math.max(0, 0.22 * (1 - this.extinguished / 2.3));
    if (this.extinguished >= 0) {
      const p = this.smoke.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const a = this.extinguished + i * 0.009;
        p.setXYZ(
          i,
          Math.sin(a * 3 + i * 0.8) * a * 0.08,
          2.17 + a * 0.35,
          Math.cos(a * 2 + i) * a * 0.055,
        );
      }
      p.needsUpdate = true;
    }
  }
  dispose() {
    const gs = new Set<THREE.BufferGeometry>(),
      ms = new Set<THREE.Material>();
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        gs.add(o.geometry);
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          ms.add(m),
        );
      }
    });
    gs.forEach((g) => g.dispose());
    ms.forEach((m) => m.dispose());
  }
}
