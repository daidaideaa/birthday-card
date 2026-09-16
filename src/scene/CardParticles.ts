import * as THREE from "three";
import { reducedMotion } from "../utils/device";
interface Particle {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  velocity: THREE.Vector3;
  spin: THREE.Vector3;
  age: number;
  life: number;
}
export class CardParticles {
  group = new THREE.Group();
  private particles: Particle[] = [];
  private geometries: THREE.BufferGeometry[];
  constructor(private mobile: boolean) {
    const h = new THREE.Shape();
    h.moveTo(0, -0.08);
    h.bezierCurveTo(-0.18, 0.025, -0.13, 0.15, 0, 0.065);
    h.bezierCurveTo(0.13, 0.15, 0.18, 0.025, 0, -0.08);
    const ribbon = new THREE.PlaneGeometry(0.045, 0.42, 1, 8);
    const p = ribbon.attributes.position;
    for (let i = 0; i < p.count; i++)
      p.setZ(i, Math.sin(p.getY(i) * 20) * 0.045);
    ribbon.computeVertexNormals();
    this.geometries = [
      new THREE.ShapeGeometry(h),
      ribbon,
      new THREE.OctahedronGeometry(0.028),
    ];
  }
  burst(origin: THREE.Vector3) {
    const colors = ["#e99bab", "#eaaa95", "#bba8d5", "#99bacc", "#d9b974"];
    const count = reducedMotion() ? 14 : this.mobile ? 42 : 76;
    for (let i = 0; i < count; i++) {
      const material = new THREE.MeshStandardMaterial({
        color: colors[i % 5],
        roughness: 0.5,
        metalness: i % 3 === 2 ? 0.55 : 0.12,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        emissive: colors[i % 5],
        emissiveIntensity: i % 3 === 2 ? 0.75 : 0.04,
      });
      const mesh = new THREE.Mesh(this.geometries[i % 3], material);
      mesh.position
        .copy(origin)
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.65,
            0.05,
            (Math.random() - 0.5) * 0.4,
          ),
        );
      mesh.rotation.set(
        Math.random() * 3,
        Math.random() * 3,
        Math.random() * 3,
      );
      this.group.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.7,
          2 + Math.random() * 1.8,
          (Math.random() - 0.5) * 1.4,
        ),
        spin: new THREE.Vector3(
          Math.random() * 3,
          Math.random() * 3,
          Math.random() * 3,
        ),
        age: 0,
        life: this.mobile ? 2.7 : 3.7,
      });
    }
  }
  update(dt: number) {
    this.particles = this.particles.filter((p) => {
      p.age += dt;
      if (p.age > p.life) {
        this.group.remove(p.mesh);
        p.mesh.material.dispose();
        return false;
      }
      p.velocity.y -= 1.9 * dt;
      p.velocity.multiplyScalar(Math.exp(-0.3 * dt));
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += p.spin.x * dt;
      p.mesh.rotation.y += p.spin.y * dt;
      p.mesh.rotation.z += p.spin.z * dt;
      p.mesh.material.opacity = Math.min(1, (p.life - p.age) / 0.85);
      return true;
    });
  }
  clear() {
    for (const p of this.particles) p.mesh.material.dispose();
    this.particles = [];
    this.group.clear();
  }
  dispose() {
    this.clear();
    for (const g of this.geometries) g.dispose();
    this.particles = [];
    this.group.clear();
  }
}
