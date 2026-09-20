import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { CelebrationCake } from "./CelebrationCake";
import "./cake.css";

type CakeState = "lit" | "extinguishing" | "complete";

/** 轻量实时蛋糕场景，许愿状态统一由故事控制器管理。 */
export function CakeViewport({
  state,
  onExtinguish,
}: {
  state: CakeState;
  onExtinguish: () => void;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const current = useRef({ state, onExtinguish });
  current.current = { state, onExtinguish };
  const syncState = useRef<(() => void) | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const host = mount.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setUnavailable(true);
      return;
    }
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 30);
    const aim = new THREE.Vector3(0, 1.2, 0);
    const cake = new CelebrationCake();
    scene.add(cake.root);
    scene.add(new THREE.HemisphereLight("#ffe8cc", "#5e4459", 2.1));
    const key = new THREE.DirectionalLight("#ffddae", 3.5);
    key.position.set(-3, 5, 4);
    const fill = new THREE.DirectionalLight("#c0d6ef", 1.6);
    fill.position.set(3, 3, -2);
    scene.add(key, fill);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.88;
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = new THREE.Vector2();
    const eased = new THREE.Vector2();
    let visible = true;
    let disposed = false;
    let contextLost = false;
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    let wasExtinguished = false;

    const render = (dt: number) => {
      elapsed += dt;
      eased.lerp(pointer, 1 - Math.exp(-dt * 5));
      const still = media.matches;
      camera.position.set(
        still ? 0.35 : 0.35 + eased.x * 0.24,
        still ? 2.9 : 2.9 + eased.y * 0.13,
        5.5,
      );
      camera.lookAt(aim);
      cake.root.rotation.y = still
        ? -0.12
        : -0.12 + Math.sin(elapsed * 0.19) * 0.16;
      cake.update(dt, still);
      renderer.render(scene, camera);
    };
    const shouldRun = () =>
      !disposed &&
      !contextLost &&
      visible &&
      !document.hidden &&
      !media.matches;
    const tick = (now: number) => {
      frame = 0;
      if (!shouldRun()) return;
      // 小尺寸装饰场景限制到 30 fps，降低移动端负担。
      if (!previous || now - previous >= 32) {
        const dt = previous ? Math.min((now - previous) / 1000, 0.08) : 0;
        previous = now;
        render(dt);
      }
      frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (disposed || contextLost || !visible || document.hidden) return;
      render(0);
      if (shouldRun()) frame = requestAnimationFrame(tick);
    };
    const updateState = () => {
      if (current.current.state !== "lit" && !wasExtinguished) {
        wasExtinguished = true;
        cake.extinguish();
        // 减少动态效果时直接熄灭，不播放移动烟雾。
        if (media.matches) cake.update(2.4, true);
      }
      resume();
    };
    syncState.current = updateState;
    const resize = () => {
      const { width, height } = host.getBoundingClientRect();
      if (!width || !height || disposed || contextLost) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      resume();
    };
    const onMove = (event: PointerEvent) => {
      if (media.matches || event.pointerType === "touch") return;
      const bounds = canvas.getBoundingClientRect();
      pointer.set(
        (event.clientX - bounds.left) / bounds.width - 0.5,
        0.5 - (event.clientY - bounds.top) / bounds.height,
      );
    };
    const onLeave = () => pointer.set(0, 0);
    let pointerStart: { x: number; y: number } | null = null;
    const onDown = (event: PointerEvent) => {
      pointerStart = { x: event.clientX, y: event.clientY };
    };
    const onTap = (event: PointerEvent) => {
      if (!pointerStart || current.current.state !== "lit") return;
      const travel = Math.hypot(
        event.clientX - pointerStart.x,
        event.clientY - pointerStart.y,
      );
      pointerStart = null;
      if (travel > 12) return;
      const bounds = canvas.getBoundingClientRect();
      const candle = new THREE.Vector3(0, 2.17, 0).project(camera);
      const x = bounds.left + (candle.x * 0.5 + 0.5) * bounds.width;
      const y = bounds.top + (0.5 - candle.y * 0.5) * bounds.height;
      if (Math.hypot(event.clientX - x, event.clientY - y) < 40)
        current.current.onExtinguish();
    };
    const onCancel = () => {
      pointerStart = null;
    };
    const onMotionChange = () => {
      if (media.matches && wasExtinguished) cake.update(2.4, true);
      resume();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
      setUnavailable(true);
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry.isIntersecting;
              resume();
            },
            { threshold: 0.05 },
          )
        : null;
    observer?.observe(host);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", onMotionChange);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onTap);
    canvas.addEventListener("pointercancel", onCancel);
    canvas.addEventListener("webglcontextlost", onContextLost);
    resize();
    updateState();

    return () => {
      disposed = true;
      syncState.current = null;
      cancelAnimationFrame(frame);
      observer?.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", onMotionChange);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onTap);
      canvas.removeEventListener("pointercancel", onCancel);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      cake.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, []);

  useEffect(() => syncState.current?.(), [state]);

  return (
    <div
      className={`cinema-cake cinema-cake--${state}${unavailable ? " cinema-cake--fallback" : ""}`}
    >
      <div className="cinema-cake__stage" ref={mount}>
        <span className="cinema-cake__description">
          双层草莓奶油蛋糕，陶瓷金边高脚盘，一支金色生日蜡烛。
        </span>
        {unavailable && (
          <div className="cinema-cake__fallback" aria-hidden="true">
            <span>✦</span>
            <p>{state === "lit" ? "为你点亮今晚的星光" : "愿望已经出发"}</p>
          </div>
        )}
      </div>
      <button
        type="button"
        className="cinema-cake__extinguish"
        disabled={state !== "lit"}
        onClick={onExtinguish}
        aria-label="许下愿望，轻轻熄灭生日蜡烛"
      >
        {state === "lit" ? "许好了，吹灭蜡烛" : "愿你所愿，都能实现"}
      </button>
    </div>
  );
}
