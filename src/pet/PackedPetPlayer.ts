import * as THREE from "three";
import { petMedia, type PetAction, type PetVariant } from "./petMedia";

type Clip = { video: HTMLVideoElement; texture: THREE.VideoTexture; action: PetAction };

/** RGB occupies the left half; the right half is a linear opacity mask.
 * Source RGB must be straight alpha with edge colours extended into transparency.
 * Blend premultiplied linear colours, then unpremultiply before Three's sRGB output.
 */
const fragmentShader = `
  uniform sampler2D currentMap;
  uniform sampler2D previousMap;
  uniform float blend;
  varying vec2 vUv;
  vec3 linearRGB(vec3 c) {
    return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
  }
  vec4 samplePet(sampler2D source, vec2 uv) {
    // Stay within the corresponding half, including at the outermost texel.
    vec2 p = clamp(uv, vec2(0.5 / 384.0), vec2(1.0 - 0.5 / 384.0));
    vec3 rgb = linearRGB(texture2D(source, vec2(p.x * 0.5, p.y)).rgb);
    float alpha = texture2D(source, vec2(0.5 + p.x * 0.5, p.y)).r;
    alpha = smoothstep(0.012, 0.988, alpha);
    return vec4(rgb * alpha, alpha);
  }
  void main() {
    vec4 colour = mix(samplePet(previousMap, vUv), samplePet(currentMap, vUv), blend);
    gl_FragColor = vec4(colour.rgb / max(colour.a, 0.0001), colour.a);
    #include <colorspace_fragment>
  }
`;

export class PackedPetPlayer {
  private renderer: THREE.WebGLRenderer;
  private material: THREE.ShaderMaterial;
  private geometry = new THREE.PlaneGeometry(2, 2);
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
  private current?: Clip;
  private previous?: Clip;
  private abortPending?: () => void;
  private pendingAction?: PetAction;
  private generation = 0;
  private active = false;
  private disposed = false;
  private frame = 0;
  private lastPaint = 0;
  private transitionAt = 0;
  private resizeObserver: ResizeObserver;
  private readonly lost: (event: Event) => void;

  constructor(
    private host: HTMLElement,
    private variant: PetVariant,
    private onComplete: (action: PetAction) => void,
    private onError: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.material = new THREE.ShaderMaterial({
      uniforms: { currentMap: { value: null }, previousMap: { value: null }, blend: { value: 1 } },
      vertexShader: "varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
      fragmentShader, transparent: true, depthWrite: false, toneMapped: false,
    });
    this.scene.add(new THREE.Mesh(this.geometry, this.material));
    this.host.appendChild(this.renderer.domElement);
    const resize = () => {
      const size = Math.max(1, this.host.clientWidth);
      this.renderer.setSize(size, size, false);
      if (this.current) this.renderer.render(this.scene, this.camera);
    };
    this.resizeObserver = new ResizeObserver(resize);
    this.resizeObserver.observe(host);
    resize();
    this.lost = (event) => { event.preventDefault(); this.setActive(false); this.onError(); };
    this.renderer.domElement.addEventListener("webglcontextlost", this.lost);
  }

  setActive(active: boolean): void {
    if (this.disposed) return;
    this.active = active;
    cancelAnimationFrame(this.frame);
    if (!active) {
      delete this.host.dataset.ready;
      this.current?.video.pause();
      this.previous?.video.pause();
      // Discard pending actions rather than playing a stale touch when returning.
      this.abortPending?.();
      this.abortPending = undefined;
      this.pendingAction = undefined;
      this.generation++;
    } else if (this.current && petMedia.loops(this.current.action)) {
      void this.current.video.play().catch(() => { /* Still frame remains usable. */ });
      this.frame = requestAnimationFrame(this.render);
    }
  }

  play(action: PetAction): void {
    if (!this.active || this.disposed || this.pendingAction === action) return;
    // A newer intent can return to the already playing loop while another clip
    // is still loading. Cancel that obsolete clip before reusing the loop.
    this.abortPending?.();
    this.abortPending = undefined;
    this.pendingAction = undefined;
    const ticket = ++this.generation;
    if (this.current?.action === action && !this.current.video.ended) return;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.loop = petMedia.loops(action);
    video.setAttribute("playsinline", "");
    this.pendingAction = action;
    let settled = false;
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener("loadeddata", ready);
      video.removeEventListener("error", failed);
    };
    const abort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    const failed = () => {
      abort();
      if (ticket !== this.generation || this.disposed) return;
      this.pendingAction = undefined;
      this.abortPending = undefined;
      // Keep the previously displayed frame; the poster remains below the canvas.
      if (petMedia.loops(action)) this.onError();
      else this.onComplete(action);
    };
    const ready = () => {
      if (settled || video.readyState < 2) return;
      if (ticket !== this.generation || this.disposed || !this.active) { abort(); return; }
      settled = true;
      cleanup();
      this.abortPending = undefined;
      this.pendingAction = undefined;
      this.release(this.previous);
      this.previous = this.current;
      this.previous?.video.pause();
      const texture = new THREE.VideoTexture(video);
      texture.colorSpace = THREE.NoColorSpace;
      texture.minFilter = texture.magFilter = THREE.LinearFilter;
      this.current = { video, texture, action };
      this.material.uniforms.currentMap.value = texture;
      this.material.uniforms.previousMap.value = this.previous?.texture ?? texture;
      this.material.uniforms.blend.value = this.previous ? 0 : 1;
      this.transitionAt = performance.now();
      video.onended = () => {
        if (this.current?.video === video && this.active) this.onComplete(action);
      };
      video.onerror = () => {
        if (this.current?.video === video) this.onError();
      };
      void video.play().catch(() => { /* A blocked autoplay still presents a decoded frame. */ });
      cancelAnimationFrame(this.frame);
      this.frame = requestAnimationFrame(this.render);
    };
    const timeout = window.setTimeout(failed, 12000);
    this.abortPending = abort;
    video.addEventListener("loadeddata", ready);
    video.addEventListener("error", failed);
    video.src = petMedia.clip(this.variant, action);
    video.load();
  }

  private render = (now: number) => {
    if (!this.active || this.disposed || !this.current) return;
    this.frame = requestAnimationFrame(this.render);
    if (now - this.lastPaint < 1000 / 30) return;
    this.lastPaint = now;
    const blend = Math.min(1, (now - this.transitionAt) / 140);
    this.material.uniforms.blend.value = blend;
    this.renderer.render(this.scene, this.camera);
    this.host.dataset.ready = "true";
    this.host.dataset.action = this.current.action;
    if (blend === 1 && this.previous) {
      this.release(this.previous);
      this.previous = undefined;
      this.material.uniforms.previousMap.value = this.current.texture;
    }
  };

  private release(clip?: Clip): void {
    if (!clip) return;
    clip.video.onended = clip.video.onerror = null;
    clip.video.pause();
    clip.video.removeAttribute("src");
    clip.video.load();
    clip.texture.dispose();
  }

  dispose(): void {
    this.setActive(false);
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.release(this.current);
    this.release(this.previous);
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.domElement.removeEventListener("webglcontextlost", this.lost);
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
