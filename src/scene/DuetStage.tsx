/**
 * 暮色舞台：钢琴、两位角色与路灯在同一空间，由触摸伴奏驱动（方案 §10–§11）。
 *
 * 与旧 CinematicFilm 的区别：这里没有播放器时钟。动作相位来自
 * PerformanceState，所以“弹得快一点，舞步就快一点；停手，就自然收势”。
 * 可见琴键跟随实际按住的音高升降，指尖与琴键对应。
 */
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createModelLoader } from "../utils/modelLoader";
import { runtimeAssetUrl } from "../utils/runtimeAssetUrl";
import { qualityPolicy } from "../cinematic/quality";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { createJazzEnvironment } from "./JazzEnvironment";
import { injectFuzz, toPhysical } from "../utils/characterPolish";
import { WHITE_NOTES, BLACK_NOTES } from "../audio/PianoVoices";
import type { PerformanceFrame } from "../music/PerformanceState";
import { PianistPose } from "./PianistPose";
import "./duet-stage.css";

/** 衬衫、黄裙、皮肤与皮鞋在同一盏路灯下必须读起来不同。 */
function polishMaterial(material: THREE.Material): THREE.Material {
  const physical =
    material instanceof THREE.MeshPhysicalMaterial ? material : toPhysical(material);
  const name = physical.name.toLowerCase();
  physical.envMapIntensity = 0.7;
  if (/dress|skirt|cloth|fabric|yellow/.test(name)) {
    physical.sheen = 1;
    physical.sheenRoughness = 0.42;
    physical.sheenColor = new THREE.Color("#ffe9b8");
    physical.roughness = 0.62;
    injectFuzz(physical, { color: "#ffcf8e", strength: 0.2, power: 3 });
  } else if (/shirt|white|cotton|pants|trouser/.test(name)) {
    physical.sheen = 0.55;
    physical.sheenRoughness = 0.6;
    physical.sheenColor = new THREE.Color("#dfe8ff");
    physical.roughness = Math.min(0.8, physical.roughness);
  } else if (/skin|face|hand|arm|leg|body/.test(name)) {
    physical.roughness = 0.55;
    physical.sheen = 0.32;
    physical.sheenColor = new THREE.Color("#ffc9a3");
    injectFuzz(physical, { color: "#ff9d6e", strength: 0.12, power: 3.2 });
  } else if (/hair/.test(name)) {
    physical.roughness = 0.42;
    physical.sheen = 0.5;
    physical.sheenColor = new THREE.Color("#8a6a4a");
  } else if (/shoe|leather|heel/.test(name)) {
    physical.roughness = 0.3;
    physical.clearcoat = 0.6;
    physical.clearcoatRoughness = 0.25;
  } else {
    physical.roughness = Math.min(0.85, physical.roughness ?? 0.8);
    physical.sheen = 0.28;
    physical.sheenColor = new THREE.Color("#e8d9ff");
  }
  return physical;
}

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
  skeletons.forEach((s) => s.dispose());
}

export interface DuetStageProps {
  /** 由 PerformanceState 每帧提供；组件自己不持有播放时钟。 */
  frameRef: React.RefObject<PerformanceFrame>;
  /** 当前按住的音高，驱动可见琴键与手部目标。 */
  heldRef: React.RefObject<readonly number[]>;
  /** "piano" 看琴与手，"duet" 看全身与牵手。 */
  shot: "piano" | "duet";
  onReady?: (ok: boolean) => void;
}

export function DuetStage({ frameRef, heldRef, shot, onReady }: DuetStageProps) {
  const host = useRef<HTMLDivElement>(null);
  const shotRef = useRef(shot);
  shotRef.current = shot;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    const quality = qualityPolicy();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: quality.tier === "high",
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setStatus("error");
      readyRef.current?.(false);
      return;
    }
    renderer.setPixelRatio(quality.pixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = quality.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");

    const scene = new THREE.Scene();
    scene.add(createJazzEnvironment());
    scene.fog = new THREE.FogExp2("#473c56", 0.026);
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(environment, 0.04);
    environment.dispose();
    pmrem.dispose();
    scene.environment = env.texture;
    scene.environmentIntensity = 0.3;

    const warm = new THREE.DirectionalLight("#ffdbad", 2);
    warm.position.set(-3, 4, 2);
    warm.castShadow = true;
    warm.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    Object.assign(warm.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
    warm.shadow.normalBias = 0.035;
    warm.shadow.bias = -0.0002;
    scene.add(warm, new THREE.HemisphereLight("#c3c9f6", "#252033", 0.8));
    const rim = new THREE.DirectionalLight("#91b9ee", 2.6);
    rim.position.set(2, 3, -3);
    scene.add(rim);
    // 冷背光把角色从黑色钢琴上分离出来。
    const separation = new THREE.DirectionalLight("#b9c8f2", 1.4);
    separation.position.set(0.6, 2.6, -4.2);
    scene.add(separation);
    // 琴键发声时的暖光，强度跟随实际按键。
    const glow = new THREE.PointLight("#ffd58a", 0, 3.5, 2);
    glow.position.set(-0.75, 1.15, 0.6);
    scene.add(glow);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.ShadowMaterial({ color: "#14131c", opacity: 0.32 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.008;
    floor.receiveShadow = true;
    scene.add(floor);

    const keyMaterial = new THREE.MeshStandardMaterial({
      color: "#fff0c9",
      roughness: 0.4,
      emissive: "#e2a347",
      emissiveIntensity: 0,
    });
    const blackKeyMaterial = new THREE.MeshStandardMaterial({
      color: "#1b1922",
      roughness: 0.32,
      emissive: "#e2a347",
      emissiveIntensity: 0,
    });
    /** note → 可见琴键网格，按下时下压并微微发光。 */
    const keyMeshes = new Map<number, THREE.Mesh>();
    const keyRest = new Map<number, number>();

    let mixer: THREE.AnimationMixer | null = null;
    let duet: THREE.Object3D | null = null;
    let action: THREE.AnimationAction | null = null;
    let clipDuration = 1;
    let pianist: PianistPose | undefined;
    let disposed = false;
    let failed = false;
    let visible = true;
    let glowLevel = 0;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    /** 镜头在琴侧与双人全身之间平滑过渡，不瞬移。 */
    let shotBlend = 0;

    const render = (dt: number) => {
      const frame = frameRef.current ?? { progress: 0, mode: "waiting", accent: 0, rate: 1, phase: 0, completed: false };
      const held = heldRef.current ?? [];
      // 有按住的音就亮，松开后自然落下。
      const target = held.length ? Math.min(1, 0.55 + held.length * 0.22) : 0;
      glowLevel += (target - glowLevel) * Math.min(1, dt * (target > glowLevel ? 14 : 5));
      glow.intensity = reduced.matches ? target * 0.6 : glowLevel * 1.7;

      for (const [note, mesh] of keyMeshes) {
        const down = held.includes(note);
        const rest = keyRest.get(note) ?? 0;
        const press = down ? 0.09 : 0;
        mesh.position.y += (rest - press - mesh.position.y) * Math.min(1, dt * 22);
        const material = mesh.material as THREE.MeshStandardMaterial;
        const wanted = down ? 0.85 : 0;
        material.emissiveIntensity += (wanted - material.emissiveIntensity) * Math.min(1, dt * 12);
      }

      // 舞步相位驱动同一段编舞；两位角色共用它，因此牵手不会错位。
      pianist?.restore();
      if (mixer && action) {
        action.paused = true;
        const time = THREE.MathUtils.clamp(frame.progress, 0, 1) * clipDuration;
        action.time = time;
        mixer.update(0);
      }

      const wantBlend = shotRef.current === "duet" ? 1 : 0;
      shotBlend += (wantBlend - shotBlend) * Math.min(1, dt * 1.8);
      pianist?.apply(1-shotBlend,held);
      const portrait = camera.aspect < 1;
      // 弹琴时靠近琴与手；舞蹈时退开保住全身与牵手范围。
      const near = portrait ? Math.max(6.4, 4.8 / camera.aspect) : 5.0;
      const far = portrait ? Math.max(7.0, 5.1 / camera.aspect) : 7.4;
      const distance = near + (far - near) * shotBlend;
      const height = 1.55 + 0.42 * shotBlend;
      const sway = reduced.matches ? 0 : Math.sin(frame.progress * 6.2) * 0.03 * shotBlend;
      camera.position.set(
        (portrait ? 0.1 + shotBlend * 0.15 : 0.95 - shotBlend * 0.25) + sway,
        height,
        distance,
      );
      camera.lookAt(portrait ? -0.05 + shotBlend * 0.2 : -0.1, 1.1 + 0.16 * shotBlend, 0.05);
      // 强调音让曝光极轻地呼吸，不做全屏闪光。
      renderer.toneMappingExposure = 1.02 + (reduced.matches ? 0 : frame.accent * 0.05);
      renderer.render(scene, camera);
      mount.dataset.phase = frame.progress.toFixed(3);
      mount.dataset.mode = frame.mode;
    };

    let raf = 0;
    let previous = 0;
    const loop = (now: number) => {
      raf = 0;
      if (disposed || failed || !visible || document.hidden) return;
      const dt = previous ? Math.min((now - previous) / 1000, 0.1) : 1 / 60;
      previous = now;
      render(dt);
      raf = requestAnimationFrame(loop);
    };
    const resume = () => {
      if (raf || disposed || failed || !visible || document.hidden) return;
      previous = 0;
      raf = requestAnimationFrame(loop);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const { loader, dispose: disposeLoader } = createModelLoader(renderer);
    const load = async () => {
      try {
        const results = await Promise.allSettled([
          loader.loadAsync(runtimeAssetUrl("models/grand-piano.glb")),
          loader.loadAsync(runtimeAssetUrl("models/jazz-duo.glb")),
        ]);
        if (disposed || results.some((r) => r.status === "rejected")) {
          results.forEach((r) => {
            if (r.status === "fulfilled") disposeObject(r.value.scene);
          });
          if (!disposed) {
            setStatus("error");
            readyRef.current?.(false);
          }
          return;
        }
        const [pianoResult, duoResult] = results as PromiseFulfilledResult<
          Awaited<ReturnType<typeof loader.loadAsync>>
        >[];
        const piano = pianoResult.value.scene;
        piano.scale.setScalar(0.135);
        piano.position.set(-1.8, 0.025, -1.45);
        piano.rotation.y = -0.55;
        piano.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
            if (material instanceof THREE.MeshStandardMaterial && material.color.getHex() < 0x333333) {
              material.roughness = 0.22;
              material.metalness = 0.18;
            }
          }
        });
        scene.add(piano);

        // 五个白键 + 三个黑键，与屏幕键盘一一对应。
        WHITE_NOTES.forEach((note, index) => {
          const key = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.047, 0.3),
            keyMaterial.clone(),
          );
          const y = 5.263;
          key.position.set(5.49, y, -0.62 + index * 0.33);
          keyRest.set(note, y);
          piano.add(key);
          keyMeshes.set(note, key);
        });
        BLACK_NOTES.forEach((note) => {
          const after = { 63: 0, 66: 2, 68: 3 }[note as 63 | 66 | 68];
          const key = new THREE.Mesh(
            new THREE.BoxGeometry(0.58, 0.05, 0.17),
            blackKeyMaterial.clone(),
          );
          const y = 5.32;
          key.position.set(5.63, y, -0.62 + after * 0.33 + 0.165);
          keyRest.set(note, y);
          piano.add(key);
          keyMeshes.set(note, key);
        });

        // 琴凳，坐姿有落点。
        const benchMaterial = new THREE.MeshStandardMaterial({ color: "#171717", roughness: 0.32 });
        const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.42, 4), benchMaterial);
        seat.position.set(8.5, 3.5, 0.2);
        seat.castShadow = true;
        piano.add(seat);
        for (const x of [8, 9])
          for (const z of [-1.3, 1.7]) {
            const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 3.1, 8), benchMaterial);
            leg.position.set(x, 1.76, z);
            leg.castShadow = true;
            piano.add(leg);
          }

        duet = duoResult.value.scene;
        duet.position.set(0.3, 0, 0.75);
        duet.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          object.material = Array.isArray(object.material)
            ? materials.map(polishMaterial)
            : polishMaterial(materials[0]);
        });
        scene.add(duet);
        const actor = duet.getObjectByName("Sebastian");
        if (actor) pianist = new PianistPose(actor,piano,keyMeshes);
        mixer = new THREE.AnimationMixer(duet);
        const clips = duoResult.value.animations;
        if (clips.length) {
          const clip = THREE.AnimationClip.findByName(clips, "Scene") || clips[0];
          clipDuration = clip.duration || 1;
          action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          mixer.setTime(0);
        }
        setStatus("ready");
        readyRef.current?.(true);
        resume();
      } catch {
        if (!disposed) {
          setStatus("error");
          readyRef.current?.(false);
        }
      }
    };
    void load();

    const resize = () => {
      if (disposed || failed) return;
      const bounds = mount.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / bounds.height;
      // 竖屏放宽视角，保证头、手、脚与琴键同时在画面里。
      camera.fov = camera.aspect < 1 ? 44 : 35;
      camera.updateProjectionMatrix();
      resume();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      failed = true;
      pause();
      setStatus("error");
      readyRef.current?.(false);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) resume();
        else pause();
      },
      { threshold: 0.05 },
    );
    intersection.observe(mount);
    const onVisibility = () => (document.hidden ? pause() : resume());
    document.addEventListener("visibilitychange", onVisibility);
    reduced.addEventListener("change", resume);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    resize();

    return () => {
      disposed = true;
      pause();
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", resume);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      disposeLoader();
      mixer?.stopAllAction();
      if (duet) mixer?.uncacheRoot(duet);
      disposeObject(scene);
      keyMaterial.dispose();
      blackKeyMaterial.dispose();
      keyMeshes.clear();
      env.dispose();
      warm.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [frameRef, heldRef]);

  return (
    <div className={`duet-stage duet-stage--${status} duet-stage--${shot}`}>
      <div className="duet-stage__viewport" ref={host} />
      <p className="duet-stage__described">
        暮色山顶的路灯下，白衬衫的他坐在三角钢琴前，黄裙的她在旁边倾听。
        你按下的每个琴键，都会让琴键下沉、让他的手指落在对应的位置。
      </p>
      {status !== "ready" && (
        <p className="duet-stage__status" role="status">
          {status === "loading" ? "舞台正在点亮…" : "舞台暂时无法显示，琴键依然可以弹奏。"}
        </p>
      )}
    </div>
  );
}
