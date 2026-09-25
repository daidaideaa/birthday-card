import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createModelLoader } from "../utils/modelLoader";
import { qualityPolicy } from "../cinematic/quality";
import { CinemaPost } from "../cinematic/CinemaPost";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";
import { runtimeAssetUrl as assetUrl } from "../utils/runtimeAssetUrl";
import {
  injectFuzz,
  makeGlowTexture,
  makeShaftTexture,
  toPhysical,
} from "../utils/characterPolish";
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
  // A promontory: flat walkable top for the lions, nose jutting towards the
  // sunrise side, and six craggy strata breaking the silhouette below.
  const outline = [
    [-2.3, 0.9],
    [-1.4, 1.45],
    [-0.2, 1.6],
    [1.2, 1.35],
    [2.2, 0.75],
    [2.85, -0.05],
    [2.2, -0.85],
    [1.0, -1.25],
    [-0.4, -1.35],
    [-1.6, -1.15],
    [-2.35, -0.5],
  ];
  const layers = [
    { y: 0, scale: 1, jitter: 0 },
    { y: -0.24, scale: 0.97, jitter: 0.05 },
    { y: -0.52, scale: 0.91, jitter: 0.1 },
    { y: -0.84, scale: 0.83, jitter: 0.16 },
    { y: -1.18, scale: 0.72, jitter: 0.21 },
    { y: -1.55, scale: 0.58, jitter: 0.27 },
  ];
  const palette = [
    "#8f6f4b",
    "#7a5f43",
    "#624c3a",
    "#4c3a2f",
    "#3a2d24",
    "#2a211a",
  ];
  const hash = (a: number, b: number) => {
    const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return s - Math.floor(s) - 0.5;
  };
  const vertices: number[] = [],
    colors: number[] = [],
    indices: number[] = [],
    uv: number[] = [];
  const n = outline.length;
  for (let layer = 0; layer < layers.length; layer++) {
    const { y, scale, jitter } = layers[layer];
    for (let i = 0; i < n; i++) {
      const [x, z] = outline[i];
      const jx = layer ? hash(i * 3.1, layer * 7.7) * jitter * 2 : 0;
      const jz = layer ? hash(i * 5.3, layer * 3.9) * jitter * 2 : 0;
      const jy = layer ? hash(i * 7.7, layer * 5.1) * jitter * 0.7 : 0;
      vertices.push(x * scale + jx, y + jy, z * scale + jz);
      uv.push((x + 3) / 6, (z + 2) / 4);
      const color = new THREE.Color(palette[layer]);
      colors.push(color.r, color.g, color.b);
      if (layer < layers.length - 1) {
        const a = layer * n + i,
          b = layer * n + ((i + 1) % n);
        indices.push(a, a + n, b, b, a + n, b + n);
      }
    }
  }
  // Cap the walkable top and close the crag underside.
  for (let i = 1; i < n - 1; i++) indices.push(0, i, i + 1);
  const bottomStart = (layers.length - 1) * n;
  const bottomCenter = vertices.length / 3;
  vertices.push(0.4, -1.78, 0.1);
  uv.push(0.5, 0.5);
  colors.push(0.16, 0.12, 0.09);
  for (let i = 0; i < n; i++)
    indices.push(bottomStart + i, bottomStart + ((i + 1) % n), bottomCenter);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3),
  );
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const pixels = new Uint8Array(128 * 128 * 4);
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      const offset = (y * 128 + x) * 4;
      const grain = Math.sin(x * 1.7 + y * 0.6) * Math.cos(y * 2.3 - x * 0.8);
      const seam = Math.pow(
        Math.max(0, Math.cos(y * 0.36 + Math.sin(x * 0.085) * 0.8)),
        18,
      );
      const value = 188 + grain * 12 - seam * 35;
      pixels.set([value, value, value, 255], offset);
    }
  const stone = new THREE.DataTexture(pixels, 128, 128);
  stone.needsUpdate = true;
  stone.wrapS = stone.wrapT = THREE.RepeatWrapping;
  stone.repeat.set(3, 2);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: stone,
      flatShading: true,
      roughness: 0.94,
      bumpMap: stone,
      bumpScale: 0.05,
      side: THREE.DoubleSide,
    }),
  );
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  const group = new THREE.Group();
  group.add(mesh);
  // A few weathered boulders at the back of the ledge break the flat top.
  const boulderSpots: [number, number, number, number][] = [
    [-1.65, 0.16, 1.02, 0.34],
    [-2.02, 0.12, -0.3, 0.26],
    [-0.85, 0.1, 1.3, 0.22],
  ];
  for (const [bx, by, bz, size] of boulderSpots) {
    const boulder = new THREE.Mesh(
      new THREE.IcosahedronGeometry(size, 1),
      new THREE.MeshStandardMaterial({
        color: palette[2],
        flatShading: true,
        roughness: 0.96,
        map: stone,
        bumpMap: stone,
        bumpScale: 0.04,
      }),
    );
    const position = boulder.geometry.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const px = position.getX(i),
        py = position.getY(i),
        pz = position.getZ(i);
      const wobble =
        1 + hash(px * 9.1 + bx, pz * 7.3 + py) * 0.44;
      position.setXYZ(i, px * wobble, py * wobble * 0.72, pz * wobble);
    }
    boulder.geometry.computeVertexNormals();
    boulder.position.set(bx, by, bz);
    boulder.castShadow = true;
    boulder.receiveShadow = true;
    group.add(boulder);
  }
  return group;
}

/** Warm / cool rim on the coat so silhouettes read as fur, not plastic. */
function polishLionMaterial(material: THREE.Material): THREE.Material {
  const physical =
    material instanceof THREE.MeshPhysicalMaterial
      ? material
      : toPhysical(material);
  const name = physical.name;
  if (/eye/i.test(name)) {
    physical.emissive = new THREE.Color("#ffdf9e");
    physical.emissiveIntensity = 0.55;
    physical.clearcoat = 1;
    physical.clearcoatRoughness = 0.08;
    return physical;
  }
  physical.sheen = 0.65;
  physical.sheenRoughness = 0.55;
  physical.sheenColor = new THREE.Color("#ffcf96");
  injectFuzz(physical, {
    color: name.startsWith("Mane") ? "#ff9e50" : "#ffc98a",
    strength: name.startsWith("Mane") ? 0.42 : 0.26,
    power: 2.5,
  });
  return physical;
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
      const next = polishLionMaterial(material) as THREE.MeshStandardMaterial;
      next.transparent = true;
      next.roughness = Math.max(0.62, next.roughness ?? 0.7);
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
    if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
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

function makeRingTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.strokeStyle = "rgba(255,240,210,0.9)";
  ctx.lineWidth = 7;
  ctx.filter = "blur(3px)";
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
  ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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
    const quality = qualityPolicy();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: quality.tier === "high",
        powerPreference: "high-performance",
      });
    } catch {
      setStatus("error");
      readyCallback.current?.();
      return;
    }
    renderer.setPixelRatio(quality.pixelRatio);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = quality.shadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
    const ambient = new THREE.HemisphereLight("#ffe3b0", "#615254", 1.4);
    const sun = new THREE.DirectionalLight("#ffd095", 3.3);
    sun.position.set(-3, 5, -2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    sun.shadow.camera.left = -4;
    sun.shadow.camera.right = 4;
    sun.shadow.camera.top = 4;
    sun.shadow.camera.bottom = -3;
    sun.shadow.normalBias = 0.02;
    const faceLight = new THREE.DirectionalLight("#ffe9ce", 2.2);
    faceLight.position.set(3, 3, 6);
    scene.add(ambient, sun, faceLight, makeRock());

    // --- Atmosphere: sun glow, light shafts, horizon haze -------------------
    const glowTexture = makeGlowTexture(96);
    const sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color(1.5, 1.02, 0.5),
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    sunGlow.position.set(4.6, 2.9, -7);
    sunGlow.scale.setScalar(2.6);
    scene.add(sunGlow);
    const moonGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: new THREE.Color(0.62, 0.72, 1.35),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    moonGlow.position.set(3.6, 3.8, -7);
    moonGlow.scale.setScalar(1.9);
    scene.add(moonGlow);
    const shaftTexture = makeShaftTexture();
    const shafts: THREE.Mesh[] = [];
    for (let i = 0; i < 2; i++) {
      const shaft = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5 + i * 0.9, 5.5),
        new THREE.MeshBasicMaterial({
          map: shaftTexture,
          color: "#ffcf8e",
          transparent: true,
          opacity: 0.05,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        }),
      );
      shaft.position.set(2.7 - i * 1.6, 2.5, -3.2 - i * 0.5);
      shaft.rotation.z = -0.38;
      shaft.renderOrder = 1;
      shafts.push(shaft);
      scene.add(shaft);
    }
    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 3.4),
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: "#f7b46a",
        transparent: true,
        opacity: 0.13,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    haze.position.set(0, 0.55, -4.5);
    scene.add(haze);

    // --- Dust / stars with two sizes for depth ------------------------------
    const dustMaterial = new THREE.PointsMaterial({
      color: "#ffe3a2",
      size: 0.023,
      transparent: true,
      opacity: 0.13,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const makeDust = (size: number, count: number, spread: number) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = Math.sin(i * 2.399) * (1 + (i % 9) * 0.3) * spread;
        positions[i * 3 + 1] = 0.4 + ((i * 17) % 35) / 10;
        positions[i * 3 + 2] = -1.5 - ((i * 11) % 25) / 10;
      }
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      const material = dustMaterial.clone();
      material.size = size;
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      return { points, material };
    };
    const dustFine = makeDust(
      0.02,
      Math.round(60 * quality.particleScale),
      1,
    );
    const dustBold = makeDust(
      0.055,
      Math.round(26 * quality.particleScale),
      1.2,
    );

    // --- Soft contact shadows ------------------------------------------------
    const blobTexture = makeGlowTexture(
      128,
      "rgba(20,10,6,0.9)",
      "rgba(20,10,6,0.45)",
      "rgba(20,10,6,0)",
    );
    const blobMaterial = new THREE.MeshBasicMaterial({
      map: blobTexture,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
    });
    const fatherBlob = new THREE.Mesh(
      new THREE.PlaneGeometry(1.9, 1.1),
      blobMaterial,
    );
    fatherBlob.rotation.x = -Math.PI / 2;
    fatherBlob.position.y = 0.012;
    const cubBlob = new THREE.Mesh(
      new THREE.PlaneGeometry(1.1, 0.7),
      blobMaterial.clone(),
    );
    cubBlob.rotation.x = -Math.PI / 2;
    cubBlob.position.y = 0.012;
    scene.add(fatherBlob, cubBlob);

    // --- Roar shockwave ring --------------------------------------------------
    const ring = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: makeRingTexture(),
        color: "#ffe9c2",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    ring.position.set(0.4, 1.1, 0.9);
    scene.add(ring);

    const post = new CinemaPost(renderer, scene, camera, quality.bloom);

    let disposed = false;
    let failed = false;
    let visible = true;
    let frame = 0;
    let last = 0;
    let time = 0;
    let phaseAge = 0;
    let shake = 0;
    let ringAge = -1;
    let lastPhase: Phase | undefined;
    let lastAction = "";
    let lastRoar = -1;
    let actors: { father: Actor; cub: Actor } | undefined;
    const baseCamera = new THREE.Vector3();
    const baseTarget = new THREE.Vector3(0.1, 0.82, 0);
    const size = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      post.resize(width, height);
      camera.aspect = width / height;
      // Low hero angle: lions read large against the painted savanna sky.
      const distance = Math.max(5.1, 4.5 / camera.aspect);
      baseCamera.set(distance * 0.46, distance * 0.2, distance * 0.86);
      camera.position.copy(baseCamera);
      camera.lookAt(baseTarget);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(size);
    observer.observe(container);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const fatherDawn = new THREE.Vector3(0.05, 0.005, -0.18);
    const cubDawn = new THREE.Vector3(1.3, 0.005, 0.5);
    const fatherReturn = new THREE.Vector3(0.68, 0.005, 0.24);
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
          if (repeat) {
            shake = 1;
            ringAge = 0;
          }
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
        fatherBlob.position.x = father.root.position.x;
        fatherBlob.position.z = father.root.position.z + 0.1;
        (
          fatherBlob.material as THREE.MeshBasicMaterial
        ).opacity = 0.32 * father.opacity;
        cubBlob.position.x = cub.root.position.x;
        cubBlob.position.z = cub.root.position.z + 0.1;
        (cubBlob.material as THREE.MeshBasicMaterial).opacity =
          0.32 * cub.opacity;
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
      // Sun and moon breathe with the phase; shafts only matter in daylight.
      const glowTarget = starPhase ? 0 : props.phase === "return" ? 1 : 0.85;
      (sunGlow.material as THREE.SpriteMaterial).opacity =
        THREE.MathUtils.damp(
          (sunGlow.material as THREE.SpriteMaterial).opacity,
          glowTarget,
          2,
          dt,
        );
      (moonGlow.material as THREE.SpriteMaterial).opacity =
        THREE.MathUtils.damp(
          (moonGlow.material as THREE.SpriteMaterial).opacity,
          starPhase ? 0.9 : 0,
          2,
          dt,
        );
      shafts.forEach((shaft, i) => {
        const material = shaft.material as THREE.MeshBasicMaterial;
        material.opacity = still
          ? 0
          : (starPhase ? 0.008 : 0.035) +
            Math.sin(time * 0.5 + i * 1.7) * 0.008;
      });
      (haze.material as THREE.MeshBasicMaterial).opacity =
        THREE.MathUtils.damp(
          (haze.material as THREE.MeshBasicMaterial).opacity,
          starPhase ? 0.07 : 0.16,
          2,
          dt,
        );
      (haze.material as THREE.MeshBasicMaterial).color.lerp(
        new THREE.Color(starPhase ? "#5a6fb0" : "#f7b46a"),
        still ? 1 : dt * 1.8,
      );
      for (const [set, base] of [
        [dustFine, 0.13],
        [dustBold, 0.1],
      ] as const) {
        set.material.opacity = still
          ? 0
          : THREE.MathUtils.damp(
              set.material.opacity,
              starPhase ? 0.85 : props.celebrating ? 0.6 : base,
              2,
              dt,
            );
        set.points.rotation.y = still ? 0 : Math.sin(time * 0.08) * 0.12;
        set.points.position.y = still ? 0 : Math.sin(time * 0.21) * 0.06;
      }
      // Roar shockwave ring expands and fades.
      if (ringAge >= 0) {
        ringAge += dt;
        const t = ringAge / 1.15;
        if (t >= 1) {
          ringAge = -1;
          (ring.material as THREE.MeshBasicMaterial).opacity = 0;
        } else {
          ring.scale.setScalar(0.4 + t * 3.4);
          (ring.material as THREE.MeshBasicMaterial).opacity =
            0.75 * (1 - t) * (1 - t);
          if (actors) {
            ring.position
              .set(0.9, 1.05, 0.9)
              .add(actors.father.root.position)
              .add(new THREE.Vector3(0, 0, 0.4));
          }
        }
      }
      // Camera: slow push-in per phase, micro drift, roar shake.
      // baseCamera only changes in size(), so drift never accumulates.
      shake = Math.max(0, shake - dt * 1.4);
      const push = still ? 0 : Math.min(phaseAge * 0.014, 0.32);
      const driftX = still ? 0 : Math.sin(time * 0.16) * 0.06;
      const driftY = still ? 0 : Math.sin(time * 0.11 + 1.3) * 0.035;
      const shakeX = shake * Math.sin(time * 61) * 0.035 * shake;
      const shakeY = shake * Math.cos(time * 53) * 0.03 * shake;
      camera.position.set(
        baseCamera.x + driftX + shakeX,
        baseCamera.y + driftY + shakeY - push * 0.2,
        baseCamera.z - push,
      );
      if (!still && starPhase) {
        camera.lookAt(Math.sin(phaseAge * 0.3) * 0.08, 0.65, 0);
      } else camera.lookAt(0, 0.55, 0);
      post.render(starPhase ? 0.22 : props.celebrating ? 0.18 : 0.1);
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
    const { loader, dispose: disposeLoader } = createModelLoader(renderer);
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
      if (actors)
        for (const actor of [actors.father, actors.cub])
          actor.mixer.uncacheRoot(actor.root.children[0]);
      disposeLoader();
      sun.shadow.dispose();
      post.dispose();
      disposeTree(scene);
      renderer.dispose();
      renderer.forceContextLoss();
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
