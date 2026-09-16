import * as THREE from "three";
export class CandleBackground {
  group = new THREE.Group();
  light = new THREE.PointLight("#ffc28c", 2, 16, 2);
  private glow: THREE.Sprite[] = [];
  private texture: THREE.CanvasTexture;
  private dust: THREE.Points;
  boost = 0;
  constructor() {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext("2d")!;
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,216,153,.65)");
    g.addColorStop(0.13, "rgba(250,185,113,.3)");
    g.addColorStop(1, "rgba(230,155,100,0)");
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    this.texture = new THREE.CanvasTexture(canvas);
    for (const [x, y, z, s] of [
      [-4, 0.7, -2, 1.2],
      [4, 0.9, -3, 1.4],
      [-3.2, 0.4, -3, 0.5],
      [3.7, 0.7, 0, 0.55],
    ]) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this.texture,
          transparent: true,
          depthWrite: false,
          color: "#ffcc99",
        }),
      );
      sprite.position.set(x, y, z);
      sprite.scale.setScalar(s);
      this.group.add(sprite);
      this.glow.push(sprite);
    }
    this.light.position.set(-3, 4, 1);
    this.group.add(this.light);
    const geometry = new THREE.BufferGeometry();
    const points = new Float32Array(90);
    for (let i = 0; i < 90; i++) points[i] = (Math.random() - 0.5) * 12;
    geometry.setAttribute("position", new THREE.BufferAttribute(points, 3));
    this.dust = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        color: "#d0a98a",
        size: 0.015,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    this.group.add(this.dust);
  }
  update(time: number, dt: number) {
    this.boost *= Math.exp(-dt * 1.5);
    this.light.intensity = 2 + Math.sin(time * 1.7) * 0.1 + this.boost * 0.7;
    this.glow.forEach(
      (g, i) =>
        (g.material.opacity =
          0.7 + Math.sin(time * 0.7 + i) * 0.07 + this.boost * 0.05),
    );
    this.dust.rotation.y = time * 0.012;
  }
  dispose() {
    this.texture.dispose();
    this.glow.forEach((g) => g.material.dispose());
    this.dust.geometry.dispose();
    (this.dust.material as THREE.Material).dispose();
  }
}
