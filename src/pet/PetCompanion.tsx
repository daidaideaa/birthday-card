import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { TeddyDog, type PuppyMood, type PuppyCue } from "./TeddyDog";
import type { ChapterId } from "../content/storyTypes";
import { qualityPolicy } from "../cinematic/quality";
import { isMobile, reducedMotion } from "../utils/device";
import { makeGlowTexture } from "../utils/characterPolish";
import "./pet.css";
export type SceneCue = { kind: PuppyCue; serial: number };

export function PetCompanion({
  chapter,
  celebrating,
  cardOpen,
  session,
  cue,
}: {
  chapter: ChapterId;
  celebrating: boolean;
  cardOpen: boolean;
  session: number;
  cue: SceneCue;
}) {
  const host = useRef<HTMLDivElement>(null),
    dogs = useRef<TeddyDog[]>([]);
  const [failed, setFailed] = useState(false),
    [petted, setPetted] = useState<number | null>(null);
  const timer = useRef<number | undefined>(undefined);
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
    dogs.current.forEach((d) => d.setMood(mood));
  }, [mood]);
  useEffect(() => {
    dogs.current.forEach((d) => d.react(cue.kind));
  }, [cue.kind, cue.serial]);
  useEffect(() => {
    dogs.current.forEach((d) => {
      d.reset();
      d.setMood(moodRef.current);
    });
    setPetted(null);
    clearTimeout(timer.current);
  }, [session]);
  useEffect(() => {
    if (!host.current) return;
    const el = host.current,
      mobile = isMobile();
    const quality = qualityPolicy();
    let visible = false;
    let renderer: THREE.WebGLRenderer | undefined,
      frame = 0,
      last = 0,
      stopped = false;
    let observer: ResizeObserver | undefined;
    const world = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(29, 1, 0.1, 30);
    camera.position.set(0.4, 1.8, 4.7);
    camera.lookAt(0, 0.86, 0);
    const render = (now: number) => {
      if (stopped || document.hidden || !visible || !renderer) return;
      frame = requestAnimationFrame(render);
      if (last && now - last < (quality.tier === "high" ? 20 : 32)) return;
      const dt = last ? Math.min((now - last) / 1000, 0.06) : 0;
      last = now;
      dogs.current.forEach((d) => d.update(dt, reducedMotion()));
      renderer.render(world, camera);
    };
    const visibility = () => {
      last = 0;
      cancelAnimationFrame(frame);
      if (!document.hidden && !stopped && visible)
        frame = requestAnimationFrame(render);
    };
    const lost = (e: Event) => {
      e.preventDefault();
      stopped = true;
      cancelAnimationFrame(frame);
      setFailed(true);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visibility();
    });
    intersection.observe(el);
    const pointer = (e: PointerEvent) => {
      dogs.current.forEach((d) =>
        d.lookAt(
          (e.clientX / innerWidth - 0.5) * 2,
          (0.5 - e.clientY / innerHeight) * 2,
        ),
      );
    };
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: quality.tier === "high",
        powerPreference: "low-power",
      });
      renderer.setPixelRatio(Math.min(quality.pixelRatio, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.12;
      renderer.shadowMap.enabled = !mobile && quality.shadows;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.domElement.setAttribute("aria-hidden", "true");
      renderer.domElement.addEventListener("webglcontextlost", lost);
      el.appendChild(renderer.domElement);
      // Soft studio reflections give the plush coat its gentle sheen.
      const room = new RoomEnvironment();
      const pmrem = new THREE.PMREMGenerator(renderer);
      const envMap = pmrem.fromScene(room, 0.04);
      room.dispose();
      pmrem.dispose();
      world.environment = envMap.texture;
      world.environmentIntensity = 0.5;
      world.add(new THREE.HemisphereLight("#fff2dc", "#5c4a5e", 1.15));
      const key = new THREE.DirectionalLight("#ffdcae", 2.9);
      key.position.set(-2.6, 4.6, 4.4);
      key.castShadow = !mobile && quality.shadows;
      key.shadow.mapSize.set(512, 512);
      key.shadow.camera.left = -3;
      key.shadow.camera.right = 3;
      key.shadow.camera.top = 3;
      key.shadow.camera.bottom = -2;
      key.shadow.bias = -0.001;
      key.shadow.radius = 4;
      world.add(key);
      const rim = new THREE.DirectionalLight("#ffc98f", 2.6);
      rim.position.set(1.8, 3.4, -3.6);
      world.add(rim);
      const fill = new THREE.DirectionalLight("#b9ccf5", 0.65);
      fill.position.set(3.2, 1.6, 2.6);
      world.add(fill);
      dogs.current = [
        new TeddyDog(mobile, 0, renderer),
        new TeddyDog(mobile, 1, renderer),
      ];
      void Promise.all(dogs.current.map((dog) => dog.ready))
        .then(() => {
          if (!stopped) el.dataset.ready = "true";
        })
        .catch(() => {
          if (!stopped) {
            stopped = true;
            cancelAnimationFrame(frame);
            setFailed(true);
          }
        });
      dogs.current.forEach((dog, i) => {
        const place = new THREE.Group();
        place.position.set(i ? 0.53 : -0.52, 0, i ? -0.09 : 0.06);
        place.scale.setScalar(i ? 0.89 : 1);
        dog.setMood(moodRef.current);
        place.add(dog.root);
        world.add(place);
      });
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(6, 6),
        new THREE.ShadowMaterial({ opacity: 0.22 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      world.add(ground);
      // Soft blob shadows keep the dogs grounded where real shadows are off.
      const blobTexture = makeGlowTexture(
        128,
        "rgba(24,12,8,0.85)",
        "rgba(24,12,8,0.4)",
        "rgba(24,12,8,0)",
      );
      for (const [x, z, s] of [
        [-0.52, 0.06, 1.15],
        [0.53, -0.09, 1.02],
      ] as const) {
        const blob = new THREE.Mesh(
          new THREE.PlaneGeometry(1.05 * s, 0.62 * s),
          new THREE.MeshBasicMaterial({
            map: blobTexture,
            transparent: true,
            opacity: 0.34,
            depthWrite: false,
          }),
        );
        blob.rotation.x = -Math.PI / 2;
        blob.position.set(x, 0.004, z + 0.08);
        world.add(blob);
      }
      const resize = () => {
        const w = el.clientWidth,
          h = el.clientHeight;
        if (!w || !h || !renderer) return;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      observer = new ResizeObserver(resize);
      observer.observe(el);
      document.addEventListener("visibilitychange", visibility);
      window.addEventListener("pointermove", pointer, { passive: true });
      frame = requestAnimationFrame(render);
    } catch {
      setFailed(true);
    }
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer.current);
      observer?.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pointermove", pointer);
      dogs.current.forEach((d) => d.dispose());
      dogs.current = [];
      world.children.forEach((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      renderer?.domElement.removeEventListener("webglcontextlost", lost);
      world.traverse((o) => {
        if (o instanceof THREE.DirectionalLight) o.shadow.dispose();
      });
      world.environment?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    };
  }, []);
  if (failed)
    return <aside className="pet-unavailable">两位小伙伴在这里陪着你 ♡</aside>;
  const pet = (i: number) => {
    dogs.current[i]?.pet();
    dogs.current[1 - i]?.react("magic");
    setPetted(i);
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPetted(null), 2800);
  };
  return (
    <aside
      className={
        "pet-companion pet-duo pet-" +
        mood +
        (petted !== null ? " is-petted" : "")
      }
      aria-label="杏色与奶油色的两只泰迪"
    >
      <div ref={host} className="pet-canvas" />
      <div className="pet-touch-zones">
        <button
          type="button"
          aria-label="摸摸杏色泰迪"
          onClick={() => pet(0)}
        />
        <button
          type="button"
          aria-label="摸摸奶油色泰迪"
          onClick={() => pet(1)}
        />
      </div>
      <div className="pet-dialogue" aria-live="polite">
        {petted !== null
          ? petted === 2
            ? "你一跳，我也跟着跳 ♡"
            : petted === 0
              ? "摸摸收到啦！旁边那位也想要 ♡"
              : "喜欢你！蝴蝶结也跟着开心 ♡"
          : celebrating
            ? "两份喜欢，都给你！"
            : mood === "sleepy"
              ? "嘘，我们陪你听。"
              : "摸摸我们，陪你一起过生日"}
      </div>
      <button
        type="button"
        className="pet-play"
        onClick={() => {
          dogs.current.forEach((d) => d.react("play"));
          setPetted(2);
          clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setPetted(null), 2800);
        }}
      >
        一起玩 <span aria-hidden="true">↗</span>
      </button>
      <span
        className={"pet-heart " + (petted !== null ? "visible" : "")}
        aria-hidden="true"
      >
        ♡
      </span>
    </aside>
  );
}
