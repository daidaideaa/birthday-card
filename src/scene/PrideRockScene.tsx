import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { assetUrl } from "../utils/assetUrl";
import "./pride-rock.css";

type Phase = "dawn" | "stars" | "return";
type Props = {
  action: "walk" | "roar" | "idle";
  celebrating: boolean;
  phase?: Phase;
  roarSerial?: number;
  onReady?: () => void;
};
type Actor = {
  root: THREE.Group;
  mixer: THREE.AnimationMixer;
  clips: Map<string, THREE.AnimationAction>;
  materials: THREE.MeshStandardMaterial[];
  mane: THREE.MeshStandardMaterial[];
  current?: THREE.AnimationAction;
  opacity: number;
};

function makeRock() {
  const geometry = new THREE.BufferGeometry();
  // A weathered projecting ledge, with a broad safe surface for the two lions.
  const vertices = [
    [-2.5, 0, 1.55],
    [2.2, 0, 1.4],
    [2.65, 0, -0.15],
    [1.7, 0, -1.1],
    [-2.15, 0, -1.3],
    [-1.8, -0.78, 1.3],
    [1.95, -0.72, 1.05],
    [2.1, -1.02, -0.12],
    [1.55, -0.87, -0.95],
    [-1.8, -0.75, -1.15],
  ];
  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 4],
    [0, 5, 6],
    [0, 6, 1],
    [1, 6, 7],
    [1, 7, 2],
    [2, 7, 8],
    [2, 8, 3],
    [3, 8, 9],
    [3, 9, 4],
    [4, 9, 5],
    [4, 5, 0],
  ];
  const positions: number[] = [];
  const colors: number[] = [];
  faces.forEach((face, index) => {
    const color = new THREE.Color(
      index < 3 ? "#927556" : index % 2 ? "#675140" : "#534536",
    );
    face.forEach((vertex) => {
      positions.push(...vertices[vertex]);
      colors.push(color.r, color.g, color.b);
    });
  });
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 1,
      side: THREE.DoubleSide,
    }),
  );
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

function makeActor(gltf: GLTF, scale: number): Actor {
  const root = new THREE.Group();
  root.add(gltf.scene);
  root.scale.setScalar(scale);
  const materials: THREE.MeshStandardMaterial[] = [];
  const mane: THREE.MeshStandardMaterial[] = [];
  gltf.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.frustumCulled = false;
    const source = Array.isArray(object.material)
      ? object.material
      : [object.material];
    const copies = source.map((material) => {
      const next = material.clone() as THREE.MeshStandardMaterial;
      next.transparent = true;
      next.roughness = Math.max(0.7, next.roughness ?? 0.7);
      next.metalness = 0;
      if (next.map) next.map.anisotropy = 4;
      materials.push(next);
      if (next.name.startsWith("Mane")) mane.push(next);
      return next;
    });
    object.material = Array.isArray(object.material) ? copies : copies[0];
  });
  const mixer = new THREE.AnimationMixer(gltf.scene);
  const clips = new Map(
    gltf.animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
  );
  return { root, mixer, clips, materials, mane, opacity: 1 };
}

function play(actor: Actor, name: string, restart = false) {
  const next = actor.clips.get(name) ?? actor.clips.get("Idle");
  if (!next || (next === actor.current && !restart)) return;
  const previous = actor.current;
  next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1);
  next.setLoop(
    name === "Roar" || name === "Bow" ? THREE.LoopOnce : THREE.LoopRepeat,
    Infinity,
  );
  next.clampWhenFinished = true;
  next.fadeIn(0.35).play();
  if (previous && previous !== next) previous.fadeOut(0.35);
  actor.current = next;
}

function disposeTree(root: THREE.Object3D) {
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points))
      return;
    object.geometry.dispose();
    (Array.isArray(object.material)
      ? object.material
      : [object.material]
    ).forEach((material) => {
      materials.add(material);
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) textures.add(value);
      });
    });
  });
  textures.forEach((texture) => texture.dispose());
  materials.forEach((material) => material.dispose());
}

/** Real skinned assets; narrative timing remains in the parent. */
export function PrideRockScene({
  action,
  celebrating,
  phase = "dawn",
  roarSerial = 0,
  onReady,
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef({ action, celebrating, phase, roarSerial });
  const readyCallback = useRef(onReady);
  latest.current = { action, celebrating, phase, roarSerial };
  readyCallback.current = onReady;
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setStatus("error");
      readyCallback.current?.();
      return;
    }
    renderer.setPixelRatio(
      Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2),
    );
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    const ambient = new THREE.HemisphereLight("#ffe3b0", "#615254", 1.4);
    const sun = new THREE.DirectionalLight("#ffd095", 3.3);
    sun.position.set(-3, 5, -2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -4;
    sun.shadow.camera.right = 4;
    sun.shadow.camera.top = 4;
    sun.shadow.camera.bottom = -3;
    sun.shadow.normalBias = 0.02;
    const faceLight = new THREE.DirectionalLight("#ffe9ce", 2.2);
    faceLight.position.set(3, 3, 6);
    scene.add(ambient, sun, faceLight, makeRock());
    const dustGeometry = new THREE.BufferGeometry();
    const dust = new Float32Array(180);
    for (let i = 0; i < 60; i++) {
      dust[i * 3] = Math.sin(i * 2.399) * (1 + (i % 9) * 0.3);
      dust[i * 3 + 1] = 0.4 + ((i * 17) % 35) / 10;
      dust[i * 3 + 2] = -1.5 - ((i * 11) % 25) / 10;
    }
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dust, 3));
    const dustMaterial = new THREE.PointsMaterial({
      color: "#ffe3a2",
      size: 0.023,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const stars = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(stars);
    let disposed = false;
    let failed = false;
    let visible = true;
    let frame = 0;
    let last = 0;
    let time = 0;
    let phaseAge = 0;
    let lastPhase: Phase | undefined;
    let lastAction = "";
    let lastRoar = -1;
    let actors: { father: Actor; cub: Actor } | undefined;
    const size = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      const distance = Math.max(6.9, 5.9 / camera.aspect);
      camera.position.set(distance * 0.4, distance * 0.33, distance * 0.85);
      camera.lookAt(0, 0.55, 0);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(size);
    observer.observe(container);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const fatherDawn = new THREE.Vector3(-0.65, 0.005, -0.12);
    const cubDawn = new THREE.Vector3(0.64, 0.005, 0.62);
    const fatherReturn = new THREE.Vector3(0.08, 0.005, 0.32);
    const gold = new THREE.Color("#ffe5a5");
    const darkMane = new THREE.Color("#f2d4b4");
    const blue = new THREE.Color("#a3b5e7");
    const warm = new THREE.Color("#ffe3b0");
    const animate = (now: number) => {
      if (disposed || failed || document.hidden || !visible) {
        frame = 0;
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      time += dt;
      phaseAge += dt;
      const props = latest.current;
      const still = media.matches;
      if (actors) {
        const { father, cub } = actors;
        const changed = props.phase !== lastPhase;
        if (changed) {
          phaseAge = 0;
          lastPhase = props.phase;
          lastAction = "";
          if (props.phase !== "stars") {
            const target = props.phase === "dawn" ? fatherDawn : fatherReturn;
            father.root.position
              .copy(target)
              .add(
                still
                  ? new THREE.Vector3()
                  : new THREE.Vector3(-0.34, 0, -0.42),
              );
            cub.root.position
              .copy(cubDawn)
              .add(
                still
                  ? new THREE.Vector3()
                  : new THREE.Vector3(-0.22, 0, -0.25),
              );
          }
        }
        const requested = still ? "idle" : props.action;
        if (requested !== lastAction || props.roarSerial !== lastRoar) {
          const repeat = props.roarSerial !== lastRoar;
          lastAction = requested;
          lastRoar = props.roarSerial;
          play(
            father,
            requested === "walk"
              ? "Walk"
              : requested === "roar"
                ? "Roar"
                : props.phase === "dawn" && !still
                  ? "Bow"
                  : "Idle",
            repeat,
          );
          play(cub, requested === "walk" ? "Walk" : "Idle", repeat);
        }
        father.mixer.update(still ? 0 : dt);
        cub.mixer.update(still ? 0 : dt);
        const amount = still ? 1 : 1 - Math.exp(-dt * 1.25);
        father.root.position.lerp(
          props.phase === "return" ? fatherReturn : fatherDawn,
          amount,
        );
        cub.root.position.lerp(cubDawn, amount);
        father.root.rotation.y = props.phase === "return" ? 0.28 : 0.42;
        cub.root.rotation.y = -0.65;
        [father, cub].forEach((actor, index) => {
          const target =
            props.phase === "stars" || (index === 1 && props.phase === "return")
              ? 0
              : 1;
          actor.opacity = still
            ? target
            : THREE.MathUtils.damp(actor.opacity, target, 3, dt);
          actor.root.visible = actor.opacity > 0.005;
          actor.materials.forEach((material) => {
            material.opacity = actor.opacity;
            material.depthWrite = actor.opacity > 0.96;
          });
        });
        father.mane.forEach((material) =>
          material.color.lerp(
            props.phase === "return" ? gold : darkMane,
            still ? 1 : dt * 2,
          ),
        );
      }
      const starPhase = props.phase === "stars";
      ambient.color.lerp(starPhase ? blue : warm, still ? 1 : dt * 1.8);
      sun.intensity = THREE.MathUtils.damp(
        sun.intensity,
        starPhase ? 0.3 : 3.3,
        2,
        dt || 0.016,
      );
      faceLight.intensity = THREE.MathUtils.damp(
        faceLight.intensity,
        starPhase ? 0.5 : 2.2,
        2,
        dt || 0.016,
      );
      dustMaterial.opacity = still
        ? 0
        : THREE.MathUtils.damp(
            dustMaterial.opacity,
            starPhase ? 0.85 : props.celebrating ? 0.6 : 0.13,
            2,
            dt,
          );
      stars.rotation.y = still ? 0 : Math.sin(time * 0.08) * 0.12;
      if (!still && starPhase) {
        camera.lookAt(Math.sin(phaseAge * 0.3) * 0.08, 0.65, 0);
      } else camera.lookAt(0, 0.55, 0);
      renderer.render(scene, camera);
      frame = requestAnimationFrame(animate);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (!disposed && !failed && visible && !document.hidden)
        frame = requestAnimationFrame(animate);
    };
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    intersection.observe(container);
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    const lost = (event: Event) => {
      event.preventDefault();
      failed = true;
      cancelAnimationFrame(frame);
      setStatus("error");
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    size();
    resume();
    const loader = new GLTFLoader();
    Promise.allSettled([
      loader.loadAsync(assetUrl("models/lions/father-lion.glb")),
      loader.loadAsync(assetUrl("models/lions/lion-cub.glb")),
    ])
      .then((results) => {
        const [father, cub] = results;
        if (
          disposed ||
          failed ||
          father.status === "rejected" ||
          cub.status === "rejected"
        ) {
          results.forEach((result) => {
            if (result.status === "fulfilled") disposeTree(result.value.scene);
          });
          if (!disposed) {
            failed = true;
            cancelAnimationFrame(frame);
            setStatus("error");
            readyCallback.current?.();
          }
          return;
        }
        actors = {
          father: makeActor(father.value, 1.28),
          cub: makeActor(cub.value, 0.76),
        };
        scene.add(actors.father.root, actors.cub.root);
        setStatus("ready");
        readyCallback.current?.();
      })
      .catch(() => {
        if (!disposed) {
          setStatus("error");
          readyCallback.current?.();
        }
      });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      actors?.father.mixer.stopAllAction();
      actors?.cub.mixer.stopAllAction();
      disposeTree(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      className={`pride-rock-stage pride-rock-stage--${phase}`}
      aria-label="荣耀石上的父子清晨、星空回忆与辛巴归来"
    >
      <div ref={host} className="pride-rock-canvas" />
      {status === "loading" && (
        <span className="pride-rock-status" role="status">
          晨光里，他们正在走来…
        </span>
      )}
      {status === "error" && (
        <span className="pride-rock-status" role="status">
          星光里的勇气，一直都在。
        </span>
      )}
    </div>
  );
}
