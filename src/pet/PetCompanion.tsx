import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { TeddyDog, type PuppyMood } from "./TeddyDog";
import type { ChapterId } from "../content/storyTypes";
import { isMobile, reducedMotion } from "../utils/device";

export function PetCompanion({
  chapter,
  celebrating,
  cardOpen,
  session,
}: {
  chapter: ChapterId;
  celebrating: boolean;
  cardOpen: boolean;
  session: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const dog = useRef<TeddyDog | null>(null);
  const [failed, setFailed] = useState(false);
  const [petted, setPetted] = useState(false);
  const petTimer = useRef<number | undefined>(undefined);
  const mood: PuppyMood = celebrating
    ? "happy"
    : chapter === "letter"
      ? "sleepy"
      : chapter !== "birthday" || cardOpen
        ? "curious"
        : "welcome";
  const moodRef = useRef(mood);
  moodRef.current = mood;
  useEffect(() => {
    dog.current?.setMood(mood);
  }, [mood]);
  useEffect(() => {
    dog.current?.reset();
    setPetted(false);
    clearTimeout(petTimer.current);
  }, [session]);
  useEffect(() => {
    if (!host.current) return;
    const el = host.current;
    let renderer: THREE.WebGLRenderer | undefined;
    let puppy: TeddyDog | undefined;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let last = 0;
    let stopped = false;
    const mobile = isMobile();
    const loseContext = (e: Event) => {
      e.preventDefault();
      stopped = true;
      cancelAnimationFrame(frame);
      setFailed(true);
    };
    const visibility = () => {
      last = 0;
      cancelAnimationFrame(frame);
      if (!document.hidden && !stopped) frame = requestAnimationFrame(render);
    };
    const world = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 30);
    camera.position.set(2.8, 2.1, 4.7);
    camera.lookAt(0, 0.95, 0);
    const render = (now: number) => {
      if (stopped || document.hidden || !renderer || !puppy) return;
      frame = requestAnimationFrame(render);
      if (last && now - last < (mobile ? 32 : 16)) return;
      const dt = last ? Math.min((now - last) / 1000, 0.06) : 0;
      last = now;
      puppy.update(dt, reducedMotion());
      renderer.render(world, camera);
    };
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: !mobile,
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.6));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.3;
      renderer.shadowMap.enabled = !mobile;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.addEventListener("webglcontextlost", loseContext);
      el.appendChild(renderer.domElement);
      world.add(new THREE.HemisphereLight("#fff1dc", "#6b5660", 2.5));
      const key = new THREE.DirectionalLight("#ffe2bf", 3.1);
      key.position.set(-3, 5, 4);
      key.castShadow = !mobile;
      key.shadow.mapSize.set(512, 512);
      key.shadow.camera.left = -2;
      key.shadow.camera.right = 2;
      key.shadow.camera.top = 3;
      key.shadow.camera.bottom = -2;
      key.shadow.bias = -0.001;
      world.add(key);
      const rim = new THREE.DirectionalLight("#e3d4fa", 1.5);
      rim.position.set(3, 3, -3);
      world.add(rim);
      puppy = new TeddyDog(mobile);
      dog.current = puppy;
      puppy.setMood(moodRef.current);
      world.add(puppy.root);
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 6),
        new THREE.ShadowMaterial({ opacity: 0.23 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0.005;
      ground.receiveShadow = true;
      world.add(ground);
      observer = new ResizeObserver(() => {
        const w = el.clientWidth,
          h = el.clientHeight;
        if (!w || !h || !renderer) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      observer.observe(el);
      document.addEventListener("visibilitychange", visibility);
      frame = requestAnimationFrame(render);
    } catch {
      setFailed(true);
    }
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      clearTimeout(petTimer.current);
      document.removeEventListener("visibilitychange", visibility);
      observer?.disconnect();
      puppy?.dispose();
      dog.current = null;
      world.children.forEach((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      renderer?.domElement.removeEventListener("webglcontextlost", loseContext);
      renderer?.dispose();
      renderer?.domElement.remove();
    };
  }, []);
  if (failed)
    return (
      <aside className="pet-unavailable">小狗去歇一会儿，祝福继续 ♡</aside>
    );
  return (
    <aside
      className={"pet-companion pet-" + mood}
      aria-label="陪伴你的杏棕色泰迪"
    >
      <div ref={host} className="pet-canvas" />
      <button
        className="pet-touch"
        aria-label="摸摸泰迪小狗"
        onClick={() => {
          dog.current?.pet();
          setPetted(true);
          clearTimeout(petTimer.current);
          petTimer.current = window.setTimeout(() => setPetted(false), 3000);
        }}
      >
        <span>
          {petted
            ? "最喜欢你啦 ♡"
            : celebrating
              ? "生日快乐，汪！"
              : mood === "sleepy"
                ? "安静陪着你"
                : "摸摸小狗"}
        </span>
      </button>
      <span
        className={"pet-heart " + (petted ? "visible" : "")}
        aria-hidden="true"
      >
        ♡
      </span>
      <span className="sr-only" role="status">
        {petted ? "泰迪抬头看着你，开心地摇尾巴。" : ""}
      </span>
    </aside>
  );
}
