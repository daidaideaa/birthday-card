import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { BirthdayCard } from "./BirthdayCard";
import { CardMotion, type CardState } from "./CardMotion";
import { CardParticles } from "./CardParticles";
import { CandleBackground } from "./CandleBackground";
import { AudioController } from "./AudioController";
import { isMobile } from "../utils/device";
import { clamp } from "../utils/easing";
export class BirthdayScene {
  readonly motion: CardMotion;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 60);
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private card = new BirthdayCard();
  private particles = new CardParticles(isMobile());
  private candles = new CandleBackground();
  private frame = 0;
  private active = true;
  private lost = false;
  private last = 0;
  private time = 0;
  private cameraDistance = 8.7;
  private observer: ResizeObserver;
  private drag: { id: number; x: number; y: number } | null = null;
  private yaw = -0.08;
  private tilt = 0;
  constructor(
    private host: HTMLElement,
    private audio: AudioController,
    onState: (s: CardState) => void,
    private onError: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: !isMobile(),
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(
      Math.min(devicePixelRatio, isMobile() ? 1.5 : 2),
    );
    this.renderer.shadowMap.enabled = !isMobile();
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.setAttribute(
      "aria-label",
      "A three-dimensional birthday card for Han. Drag to rotate.",
    );
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    host.appendChild(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight("#fff4e1", "#746063", 1.25));
    const key = new THREE.DirectionalLight("#fff0d9", 1.65);
    key.position.set(-2, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(isMobile() ? 512 : 1024, isMobile() ? 512 : 1024);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -5;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight("#ddc4d8", 0.7);
    fill.position.set(3, 4, -2);
    this.scene.add(fill);
    this.scene.add(this.card.root, this.particles.group, this.candles.group);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.14;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      isMobile() ? 0.12 : 0.2,
      0.55,
      3.0,
    );
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.motion = new CardMotion(() => {
      this.card.root.updateWorldMatrix(true, false);
      const origin = this.card.root.localToWorld(new THREE.Vector3(0, 0.13, 0));
      this.particles.burst(origin);
      this.audio.play();
      this.candles.boost = 1;
    }, onState);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
    this.resize();
    host.addEventListener("pointerdown", this.pointerDown);
    host.addEventListener("pointermove", this.pointerMove);
    host.addEventListener("pointerup", this.pointerUp);
    host.addEventListener("pointercancel", this.pointerUp);
    document.addEventListener("visibilitychange", this.visibility);
    this.frame = requestAnimationFrame(this.animate);
  }
  setActive(active: boolean) {
    this.active = active;
    cancelAnimationFrame(this.frame);
    this.last = 0;
    this.drag = null;
    if (active && !document.hidden && !this.lost) {
      this.resize();
      this.frame = requestAnimationFrame(this.animate);
    }
  }
  reset() {
    this.motion.reset();
    this.card.update(0);
    this.particles.clear();
    this.candles.boost = 0;
    this.audio.fadeOut();
    this.yaw = -0.08;
    this.tilt = 0;
    this.card.root.rotation.set(0, this.yaw, 0);
    this.last = 0;
  }
  setOpen(open: boolean) {
    if (!open && this.motion.targetOpen) this.audio.fadeOut();
    this.motion.setTarget(open);
  }
  private resize = () => {
    const w = this.host.clientWidth,
      h = this.host.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    const distance = Math.max(8.7, 5.7 / this.camera.aspect);
    this.cameraDistance = distance;
    this.camera.position.set(0, distance * 0.77, distance * 0.68);
    this.camera.lookAt(0, 0.65, -0.15);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
  };
  private pointerDown = (e: PointerEvent) => {
    if (this.drag) return;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
    this.host.setPointerCapture(e.pointerId);
  };
  private pointerMove = (e: PointerEvent) => {
    if (!this.drag || e.pointerId !== this.drag.id) return;
    this.yaw = clamp(this.yaw + (e.clientX - this.drag.x) * 0.004, -0.5, 0.5);
    this.tilt = clamp(
      this.tilt + (e.clientY - this.drag.y) * 0.002,
      -0.15,
      0.18,
    );
    this.drag.x = e.clientX;
    this.drag.y = e.clientY;
  };
  private pointerUp = (e: PointerEvent) => {
    if (this.drag?.id !== e.pointerId) return;
    this.drag = null;
    if (this.host.hasPointerCapture(e.pointerId))
      this.host.releasePointerCapture(e.pointerId);
  };
  private contextLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    cancelAnimationFrame(this.frame);
    this.onError();
  };
  private visibility = () => {
    cancelAnimationFrame(this.frame);
    this.last = 0;
    if (document.hidden) this.audio.fadeOut();
    else if (this.active && !this.lost)
      this.frame = requestAnimationFrame(this.animate);
  };
  private animate = (now: number) => {
    if (!this.active || this.lost || document.hidden) return;
    const elapsed = this.last ? (now - this.last) / 1000 : 0;
    const dt = Math.min(elapsed, 0.05);
    this.last = now;
    this.time += dt;
    this.motion.update(elapsed);
    const distance = this.cameraDistance + this.motion.progress * 0.8;
    this.camera.position.set(0, distance * 0.77, distance * 0.68);
    this.camera.lookAt(
      0,
      0.35 + this.motion.progress * 0.85,
      -0.15 - this.motion.progress * 0.35,
    );
    this.card.update(this.motion.progress);
    const damping = 1 - Math.exp(-dt * 8);
    this.card.root.rotation.y +=
      (this.yaw - this.card.root.rotation.y) * damping;
    this.card.root.rotation.x +=
      (this.tilt - this.card.root.rotation.x) * damping;
    this.particles.update(dt);
    this.candles.update(this.time, dt);
    this.composer.render();
    this.frame = requestAnimationFrame(this.animate);
  };
  dispose() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.visibility);
    this.host.removeEventListener("pointerdown", this.pointerDown);
    this.host.removeEventListener("pointermove", this.pointerMove);
    this.host.removeEventListener("pointerup", this.pointerUp);
    this.host.removeEventListener("pointercancel", this.pointerUp);
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.particles.dispose();
    this.candles.dispose();
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        materials.forEach((m: THREE.MeshStandardMaterial) => {
          m.map?.dispose();
          m.dispose();
        });
      }
    });
    this.composer.passes.forEach((p) => p.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
