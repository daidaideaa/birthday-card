import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createModelLoader } from "../utils/modelLoader";
import type { CinematicDirector } from "../cinematic/CinematicDirector";
import { choreographJazz, jazzLook } from "../cinematic/timelines/jazzTimeline";
import { CinemaPost } from "../cinematic/CinemaPost";
import { qualityPolicy } from "../cinematic/quality";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import "./JazzStage.css";
import { createJazzEnvironment } from "./JazzEnvironment";
import { injectFuzz, toPhysical } from "../utils/characterPolish";

/** Silk, cotton and skin read differently under stage light; upgrade each. */
function polishDancerMaterial(material: THREE.Material): THREE.Material {
  const physical =
    material instanceof THREE.MeshPhysicalMaterial
      ? material
      : toPhysical(material);
  const name = physical.name.toLowerCase();
  physical.envMapIntensity = 0.75;
  if (/dress|skirt|cloth|fabric|yellow/.test(name)) {
    // Flowing silk dress: strong sheen catching the lamp.
    physical.sheen = 1;
    physical.sheenRoughness = 0.42;
    physical.sheenColor = new THREE.Color("#ffe9b8");
    physical.roughness = 0.62;
    injectFuzz(physical, { color: "#ffcf8e", strength: 0.22, power: 3 });
  } else if (/shirt|white|cotton|pants|trouser/.test(name)) {
    physical.sheen = 0.55;
    physical.sheenRoughness = 0.6;
    physical.sheenColor = new THREE.Color("#dfe8ff");
    physical.roughness = Math.min(0.8, physical.roughness);
  } else if (/skin|face|hand|arm|leg|body/.test(name)) {
    // Soft subsurface warmth rather than flat plastic.
    physical.roughness = 0.55;
    physical.sheen = 0.35;
    physical.sheenRoughness = 0.5;
    physical.sheenColor = new THREE.Color("#ffc9a3");
    injectFuzz(physical, { color: "#ff9d6e", strength: 0.14, power: 3.2 });
  } else if (/hair/.test(name)) {
    physical.roughness = 0.42;
    physical.sheen = 0.5;
    physical.sheenColor = new THREE.Color("#8a6a4a");
  } else if (/shoe|leather|heel/.test(name)) {
    physical.roughness = 0.3;
    physical.clearcoat = 0.6;
    physical.clearcoatRoughness = 0.25;
  } else {
    // Fallback: keep the original colour, add gentle stage softness.
    physical.roughness = Math.min(0.85, physical.roughness ?? 0.8);
    physical.sheen = 0.3;
    physical.sheenRoughness = 0.55;
    physical.sheenColor = new THREE.Color("#e8d9ff");
  }
  return physical;
}

type JazzProps = {
  dancing: boolean;
  note: number | null;
  beat: number;
  director: CinematicDirector;
  onReady: () => void;
};

function disposeObject(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
    for (const material of Array.isArray(object.material)
      ? object.material
      : [object.material]) {
      materials.add(material);
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  skeletons.forEach((skeleton) => skeleton.dispose());
}

/** Both dancers and the piano live in the same lit, shadowed 3D stage. */
export function JazzStage({
  dancing,
  note,
  beat,
  director,
  onReady,
}: JazzProps) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ dancing, note, beat, onReady });
  state.current = { dancing, note, beat, onReady };
  const synchronize = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

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
      state.current.onReady();
      return;
    }
    renderer.setPixelRatio(quality.pixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = quality.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    scene.add(createJazzEnvironment());
    scene.fog = new THREE.FogExp2("#473c56", 0.026);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(1.4, 2.2, 7.4);
    camera.lookAt(-0.05, 1.0, 0.1);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(environment, 0.04);
    environment.dispose();
    pmrem.dispose();
    scene.environment = env.texture;
    scene.environmentIntensity = 0.3;
    const warm = new THREE.DirectionalLight("#ffdbad", 2.0);
    warm.position.set(-3, 4, 2);
    warm.castShadow = true;
    warm.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    warm.shadow.camera.left = -4;
    warm.shadow.camera.right = 4;
    warm.shadow.camera.top = 4;
    warm.shadow.camera.bottom = -4;
    warm.shadow.normalBias = 0.035;
    warm.shadow.bias = -0.0002;
    scene.add(warm, new THREE.HemisphereLight("#c3c9f6", "#252033", 0.8));
    const rim = new THREE.DirectionalLight("#91b9ee", 2.8);
    rim.position.set(2, 3, -3);
    scene.add(rim);
    // Cool back wash keeps the dancers separated from the black piano.
    const separation = new THREE.DirectionalLight("#b9c8f2", 1.5);
    separation.position.set(0.6, 2.6, -4.2);
    scene.add(separation);
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
    const post = new CinemaPost(renderer, scene, camera, quality.bloom);
    const look = jazzLook();
    choreographJazz(director, look);
    const keyMaterial = new THREE.MeshStandardMaterial({
      color: "#fff0c9",
      roughness: 0.4,
      emissive: "#e2a347",
      emissiveIntensity: 0,
    });
    const noteKeys: THREE.Mesh[] = [];
    let mixer: THREE.AnimationMixer | null = null;
    let duet: THREE.Object3D | null = null;
    let action: THREE.AnimationAction | null = null;
    let disposed = false;
    let failed = false;
    let visible = true;
    let noteEnvelope = 0;
    let lastNote: number | null = null;
    let lastBeat = -1;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = new THREE.Vector2();
    const eased = new THREE.Vector2();

    const render = (dt: number) => {
      noteEnvelope = Math.max(0, noteEnvelope - dt * 2.4);
      eased.lerp(pointer, 1 - Math.exp(-dt * 4));
      if (mixer && action) {
        action.paused = false;
        mixer.setTime(media.matches ? 0 : director.time);
      }
      // 与舞步使用同一时钟，手机保留全身构图，镜头缓缓推进后停留。
      const approach = media.matches ? 0 : look.approach;
      const turn = media.matches ? 0 : look.turn;
      renderer.toneMappingExposure = look.exposure;
      warm.intensity = look.key;
      rim.intensity = look.rim;
      // Handheld micro sway keeps the frame breathing between beats.
      const t = director.time;
      const swayX = media.matches ? 0 : Math.sin(t * 0.5) * 0.045;
      const swayY = media.matches ? 0 : Math.sin(t * 0.34 + 1.2) * 0.028;
      const portrait = camera.aspect < 1;
      const distance = portrait ? Math.max(5.6, 4.0 / camera.aspect) : 7.2;
      camera.position.set(
        (portrait ? 0.85 : 1.35) -
          approach * 0.3 +
          turn * 0.2 +
          eased.x * 0.08 +
          swayX,
        1.95 - approach * 0.06 + eased.y * 0.04 + swayY,
        distance - approach * 0.35,
      );
      camera.lookAt(portrait ? 0.2 : -0.22, 1.25 + approach * 0.05, 0.05);

      glow.intensity = media.matches ? 0 : noteEnvelope * 1.6;
      noteKeys.forEach((key, index) => {
        const active =
          [60, 62, 64, 65, 67, 69, 71, 72][index] === state.current.note;
        key.position.y =
          5.263 - (active ? 0.1 * (media.matches ? 1 : noteEnvelope) : 0);
        const material = key.material as THREE.MeshStandardMaterial;
        material.emissiveIntensity = active
          ? 0.9 * (media.matches ? 0.4 : noteEnvelope)
          : 0;
      });
      post.render(media.matches ? 0 : look.bloom);
      mount.dataset.time = director.time.toFixed(3);
    };
    const resume = () => {
      if (!disposed && !failed && visible && !document.hidden) render(0);
    };
    let renderDelta = 0;
    const unsubscribe = director.subscribe((_time, dt) => {
      renderDelta += dt;
      if (
        !disposed &&
        !failed &&
        visible &&
        !document.hidden &&
        (dt === 0 || renderDelta >= (quality.tier === "high" ? 1 / 60 : 1 / 30))
      ) {
        render(renderDelta);
        renderDelta = 0;
      }
    });
    const sync = () => {
      if (state.current.note !== lastNote || state.current.beat !== lastBeat) {
        lastNote = state.current.note;
        lastBeat = state.current.beat;
        if (lastNote !== null) noteEnvelope = 1;
      }
      resume();
    };
    synchronize.current = sync;
    const { loader, dispose: disposeLoader } = createModelLoader(renderer);
    const load = async () => {
      try {
        const results = await Promise.allSettled([
          loader.loadAsync(runtimeAssetUrl('models/grand-piano.glb')),
          loader.loadAsync(runtimeAssetUrl('models/jazz-duo.glb')),
        ]);
        if (
          disposed ||
          failed ||
          results.some((result) => result.status === "rejected")
        ) {
          results.forEach((result) => {
            if (result.status === "fulfilled")
              disposeObject(result.value.scene);
          });
          if (!disposed) {
            setStatus("error");
            state.current.onReady();
          }
          return;
        }
        const pianoResult = results[0];
        const duoResult = results[1];
        if (
          pianoResult.status !== "fulfilled" ||
          duoResult.status !== "fulfilled"
        )
          return;
        const piano = pianoResult.value.scene;
        piano.scale.setScalar(0.135);
        piano.position.set(-1.8, 0.025, -1.45);
        piano.rotation.y = -0.55;
        piano.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.castShadow = true;
          object.receiveShadow = true;
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => {
            if (!(material instanceof THREE.MeshStandardMaterial)) return;
            if (material.color.getHex() < 0x333333) {
              material.roughness = 0.22;
              material.metalness = 0.18;
            }
          });
        });
        scene.add(piano);
        for (let index = 0; index < 8; index++) {
          const key = new THREE.Mesh(
            new THREE.BoxGeometry(0.9, 0.047, 0.16),
            keyMaterial.clone(),
          );
          key.position.set(5.49, 5.263, -0.65 + index * 0.19);
          piano.add(key);
          noteKeys.push(key);
        }
        // A upholstered adjustable bench beside the keyboard, in piano-local coordinates.
        const benchMaterial = new THREE.MeshStandardMaterial({
          color: "#171717",
          roughness: 0.32,
        });
        const seat = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.42, 4.0),
          benchMaterial,
        );
        seat.position.set(8.5, 3.5, 0.2);
        seat.castShadow = true;
        piano.add(seat);
        for (const x of [8.0, 9.0])
          for (const z of [-1.3, 1.7]) {
            const leg = new THREE.Mesh(
              new THREE.CylinderGeometry(0.12, 0.09, 3.1, 8),
              benchMaterial,
            );
            leg.position.set(x, 1.76, z);
            leg.castShadow = true;
            piano.add(leg);
          }
        duet = duoResult.value.scene;
        duet.position.set(0.3, 0, 0.75);
        duet.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
            // Fabric sheen and warm skin stop the dancers reading as plastic.
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material];
            object.material = Array.isArray(object.material)
              ? materials.map(polishDancerMaterial)
              : polishDancerMaterial(materials[0]);
          }
        });
        scene.add(duet);
        mixer = new THREE.AnimationMixer(duet);

        const clips = duoResult.value.animations;
        if (clips.length) {
          const clip =
            THREE.AnimationClip.findByName(clips, "Scene") || clips[0];
          action = mixer.clipAction(clip);
          action.setLoop(THREE.LoopOnce, 1);
          action.clampWhenFinished = true;
          action.play();
          mixer.setTime(0);
        }
        setStatus("ready");
        state.current.onReady();
        sync();
      } catch {
        if (!disposed) {
          setStatus("error");
          state.current.onReady();
        }
      }
    };
    void load();
    const resize = () => {
      if (disposed || failed) return;
      const bounds = mount.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      post.resize(bounds.width, bounds.height);
      camera.aspect = bounds.width / bounds.height;
      // Prioritize both dancers' full bodies; the piano sits behind them on phones.
      camera.fov = camera.aspect < 1 ? 43 : 34;
      camera.updateProjectionMatrix();
      resume();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch" || media.matches) return;
      const b = mount.getBoundingClientRect();
      pointer.set(
        (event.clientX - b.left) / b.width - 0.5,
        0.5 - (event.clientY - b.top) / b.height,
      );
    };
    const leave = () => pointer.set(0, 0);
    const motionChange = () => resume();
    const contextLost = (event: Event) => {
      event.preventDefault();
      failed = true;
      state.current.onReady();
      setStatus("error");
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        resume();
      },
      { threshold: 0.05 },
    );
    intersection.observe(mount);
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", motionChange);
    mount.addEventListener("pointermove", move);
    mount.addEventListener("pointerleave", leave);
    renderer.domElement.addEventListener("webglcontextlost", contextLost);
    resize();
    return () => {
      disposed = true;
      synchronize.current = null;

      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", motionChange);
      mount.removeEventListener("pointermove", move);
      mount.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      unsubscribe();
      post.dispose();
      disposeLoader();
      mixer?.stopAllAction();
      if (duet) mixer?.uncacheRoot(duet);
      disposeObject(scene);
      keyMaterial.dispose();
      env.dispose();
      warm.shadow.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [director]);

  useEffect(() => synchronize.current?.(), [dancing, note, beat]);

  return (
    <div className={`jazz-stage jazz-stage--${status}`}>
      <div className="jazz-stage__viewport" ref={host} />
      <p className="jazz-stage__accessible">
        暮色山顶的路灯下，黄裙女孩与白衬衫男孩并肩侧步、轻踢、牵手转身，三角钢琴在身后伴奏。
      </p>
      {status !== "ready" && (
        <p className="jazz-stage__status" role="status">
          {status === "loading"
            ? "舞台正在点亮…"
            : "舞台暂时无法显示，仍可弹奏下面的琴键。"}
        </p>
      )}
    </div>
  );
}
import { runtimeAssetUrl } from '../utils/runtimeAssetUrl';
