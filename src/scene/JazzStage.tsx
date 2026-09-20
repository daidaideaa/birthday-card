import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import "./JazzStage.css";

type JazzProps = {
  dancing: boolean;
  note: number | null;
  beat: number;
  performance: number;
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
export function JazzStage({ dancing, note, beat, performance }: JazzProps) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ dancing, note, beat, performance });
  state.current = { dancing, note, beat, performance };
  const synchronize = useRef<(() => void) | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "low-power",
      });
    } catch {
      setStatus("error");
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 35);
    camera.position.set(4.8, 3.7, 8);
    camera.lookAt(0, 0.85, 0.15);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(environment, 0.04);
    environment.dispose();
    pmrem.dispose();
    scene.environment = env.texture;
    scene.environmentIntensity = 0.45;
    const warm = new THREE.DirectionalLight("#ffe0a4", 2.4);
    warm.position.set(-3, 5, 4);
    warm.castShadow = true;
    warm.shadow.mapSize.set(1024, 1024);
    warm.shadow.camera.left = -4;
    warm.shadow.camera.right = 4;
    warm.shadow.camera.top = 4;
    warm.shadow.camera.bottom = -4;
    warm.shadow.normalBias = 0.035;
    warm.shadow.bias = -0.0002;
    scene.add(warm, new THREE.HemisphereLight("#d9e1f6", "#282332", 0.95));
    const rim = new THREE.DirectionalLight("#91b9ee", 2.8);
    rim.position.set(2, 3, -3);
    scene.add(rim);
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
    const noteKeys: THREE.Mesh[] = [];
    let mixer: THREE.AnimationMixer | null = null;
    let duet: THREE.Object3D | null = null;
    let action: THREE.AnimationAction | null = null;
    let disposed = false;
    let failed = false;
    let visible = true;
    let frame = 0;
    let previous = 0;
    let noteEnvelope = 0;
    let lastNote: number | null = null;
    let lastBeat = -1;
    let lastPerformance = -1;
    let lastDancing = false;
    let moving = false;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = new THREE.Vector2();
    const eased = new THREE.Vector2();

    const render = (dt: number) => {
      noteEnvelope = Math.max(0, noteEnvelope - dt * 2.4);
      eased.lerp(pointer, 1 - Math.exp(-dt * 4));
      if (!media.matches) {
        mixer?.update(dt);
        camera.position.x = 4.8 + eased.x * 0.15;
        camera.position.y = 3.7 + eased.y * 0.09;
        camera.lookAt(0, 0.85, 0.15);
      }
      if (action && action.time >= action.getClip().duration) moving = false;
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
      renderer.render(scene, camera);
    };
    const canAnimate = () =>
      !disposed &&
      !failed &&
      visible &&
      !document.hidden &&
      !media.matches &&
      (moving || noteEnvelope > 0);
    const tick = (now: number) => {
      frame = 0;
      if (!canAnimate()) return;
      if (!previous || now - previous >= 32) {
        const dt = previous ? Math.min((now - previous) / 1000, 0.075) : 0;
        previous = now;
        render(dt);
      }
      if (canAnimate()) frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (disposed || failed || !visible || document.hidden) return;
      render(0);
      if (canAnimate()) frame = requestAnimationFrame(tick);
    };
    const sync = () => {
      if (state.current.note !== lastNote || state.current.beat !== lastBeat) {
        lastNote = state.current.note;
        lastBeat = state.current.beat;
        if (lastNote !== null) noteEnvelope = 1;
      }
      if (
        state.current.dancing &&
        (!lastDancing || state.current.performance !== lastPerformance) &&
        action
      ) {
        action.reset().play();
        if (media.matches) mixer?.setTime(0);
        moving = !media.matches;
      }
      lastPerformance = state.current.performance;
      lastDancing = state.current.dancing;
      resume();
    };
    synchronize.current = sync;
    const loader = new GLTFLoader();
    const load = async () => {
      try {
        const results = await Promise.allSettled([
          loader.loadAsync(`${import.meta.env.BASE_URL}models/grand-piano.glb`),
          loader.loadAsync(`${import.meta.env.BASE_URL}models/jazz-duo.glb`),
        ]);
        if (
          disposed ||
          results.some((result) => result.status === "rejected")
        ) {
          results.forEach((result) => {
            if (result.status === "fulfilled")
              disposeObject(result.value.scene);
          });
          if (!disposed) setStatus("error");
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
        piano.scale.setScalar(0.165);
        piano.position.set(-1.45, 0.025, -0.4);
        piano.rotation.y = -0.35;
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
        duet.position.set(1.1, 0, 0.7);
        duet.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
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
          moving = state.current.dancing && !media.matches;
          if (!moving) action.paused = true;
        }
        setStatus("ready");
        lastDancing = false;
        sync();
      } catch {
        if (!disposed) setStatus("error");
      }
    };
    void load();
    const resize = () => {
      if (disposed || failed) return;
      const bounds = mount.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      renderer.setSize(bounds.width, bounds.height, false);
      camera.aspect = bounds.width / bounds.height;
      // Preserve the full stage on narrow displays without clipping the piano.
      camera.fov = camera.aspect < 1.3 ? 39 : 32;
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
    const motionChange = () => {
      if (media.matches) {
        mixer?.setTime(0);
        moving = false;
      } else if (state.current.dancing && action) {
        action.reset().play();
        moving = true;
      }
      resume();
    };
    const contextLost = (event: Event) => {
      event.preventDefault();
      failed = true;
      cancelAnimationFrame(frame);
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
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", motionChange);
      mount.removeEventListener("pointermove", move);
      mount.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
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
  }, []);

  useEffect(() => synchronize.current?.(), [dancing, note, beat, performance]);

  return (
    <div className={`jazz-stage jazz-stage--${status}`}>
      <div className="jazz-stage__viewport" ref={host} />
      <p className="jazz-stage__accessible">
        黑色三角钢琴旁，黄裙女孩与白衬衫男孩轻轻侧步，牵手转身，回到彼此身边。
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
