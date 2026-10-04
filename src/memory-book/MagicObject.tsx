import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { assetUrl } from '../utils/assetUrl';

type Props = {
  kind: 'book' | 'cake';
  open?: boolean;
  extinguished?: boolean;
  reducedMotion?: boolean;
  onOpen?: () => void;
};

function flameTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 10, 0, 164);
  gradient.addColorStop(0, '#fff6bb'); gradient.addColorStop(.3, '#ffdb7a');
  gradient.addColorStop(.7, '#ff9d37'); gradient.addColorStop(1, '#f3691300');
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.moveTo(48, 10); ctx.bezierCurveTo(16, 88, 7, 140, 48, 157);
  ctx.bezierCurveTo(87, 140, 76, 78, 48, 10); ctx.fill();
  ctx.fillStyle = '#fffce6'; ctx.beginPath(); ctx.moveTo(48, 69); ctx.bezierCurveTo(31, 114, 31, 144, 48, 146); ctx.bezierCurveTo(65, 144, 64, 112, 48, 69); ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function floorTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#362519'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 360; i++) {
    const shade = 27 + (i * 31 % 24);
    ctx.strokeStyle = `rgba(${shade * 1.8},${shade},${shade * .6},.22)`;
    ctx.lineWidth = .5 + i % 3;
    ctx.beginPath(); ctx.moveTo(0, i * .74);
    ctx.bezierCurveTo(70, i * .74 + Math.sin(i) * 8, 150, i * .74 - 8, 256, i * .74 + 2); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2, 2);
  return texture;
}

function leatherTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 768;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(768, 768);
  let seed = 761;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const x = (i / 4) % 768, y = Math.floor(i / 4 / 768);
    const folds = Math.sin(x * .058 + Math.sin(y * .038) * 3) * 18 + Math.sin(y * .17 + Math.cos(x * .089)) * 9;
    const value = 117 + ((seed >>> 24) % 68) + folds;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2, 2);
  return texture;
}

function hideTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 768;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(768, 768);
  let seed = 1747;
  for (let y = 0; y < 768; y++) for (let x = 0; x < 768; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const grain = (seed >>> 24) / 255;
    const mottle = Math.sin(x * .019 + Math.sin(y * .013) * 2) * 4 + Math.cos(y * .028 + x * .007) * 3;
    const edge = Math.pow(1 - Math.min(x, y, 767 - x, 767 - y) / 384, 9) * 25;
    const i = (y * 768 + x) * 4;
    pixels.data[i] = 54 + mottle + grain * 11 + edge;
    pixels.data[i + 1] = 24 + mottle * .5 + grain * 5 + edge * .58;
    pixels.data[i + 2] = 18 + mottle * .4 + grain * 4 + edge * .31;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  // Short worn creases stop at the binding instead of a uniform noise overlay.
  ctx.strokeStyle = '#be945d13'; ctx.lineWidth = .7;
  for (let i = 0; i < 120; i++) {
    const x = (Math.sin(i * 34.1) * .5 + .5) * 768;
    const y = (Math.cos(i * 23.4) * .5 + .5) * 768;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 9, y - 2, x + 18 + i % 20, y + 2); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#fff8df'); gradient.addColorStop(.15, '#ffe0a8cc'); gradient.addColorStop(.42, '#ffc87435'); gradient.addColorStop(1, '#ffc87400');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function pageEdgeTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 384;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#b7a17b'; ctx.fillRect(0, 0, 512, 384);
  for (let i = 0; i < 92; i++) {
    const y = i * 4.18;
    ctx.strokeStyle = i % 4 ? '#5e48262b' : '#eed6a44a'; ctx.lineWidth = .65;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(140, y + Math.sin(i * 8) * .6, 360, y - .5, 512, y + .4); ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

/** The softly lit room is geometry too: the camera can move past the table. */
function libraryRoom(scene: THREE.Scene, woodMap: THREE.Texture) {
  const darkWood = new THREE.MeshStandardMaterial({ color: 0x24190f, roughness: .83, map: woodMap });
  const stone = new THREE.MeshStandardMaterial({ color: 0x303137, roughness: .91 });
  const gold = new THREE.MeshStandardMaterial({ color: 0x735536, metalness: .65, roughness: .42 });
  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, material: THREE.Material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); mesh.receiveShadow = true; scene.add(mesh); return mesh;
  };
  addBox(20, 11, .5, 0, 4.7, -6.3, stone);
  // Tall shelves on either side of an arched leaded-glass window.
  const bookColors = [0x473021, 0x29322e, 0x403040, 0x6b4931, 0x303842];
  const bookGeometry = new THREE.BoxGeometry(1, 1, 1);
  const bookSets = bookColors.map(color => {
    const mesh = new THREE.InstancedMesh(bookGeometry, new THREE.MeshStandardMaterial({ color, roughness: .78, metalness: .03 }), 28);
    scene.add(mesh); return mesh;
  });
  const counts = bookColors.map(() => 0), dummy = new THREE.Object3D();
  for (const side of [-1, 1]) {
    const cx = side * 4.1;
    addBox(3.5, 6.3, .5, cx, 2.8, -5.78, darkWood);
    for (const dx of [-1.8, 1.8]) addBox(.17, 6.6, .8, cx + dx, 2.9, -5.4, darkWood);
    for (let row = 0; row < 4; row++) {
      const y = row * 1.38 + .1;
      addBox(3.6, .1, .8, cx, y, -5.32, darkWood);
      addBox(3.65, .028, .08, cx, y - .08, -4.92, gold);
      for (let i = 0; i < 16; i++) {
        const id = (i + row * 3 + (side + 1) * 2) % 5;
        const height = .72 + ((i * 17 + row * 11) % 8) * .055;
        dummy.position.set(cx - 1.59 + i * .207, y + .05 + height / 2, -5.13);
        dummy.scale.set(.15 + (i % 3) * .015, height, .38); dummy.rotation.z = Math.sin(i * 1.8 + row) * .04; dummy.updateMatrix();
        bookSets[id].setMatrixAt(counts[id]++, dummy.matrix);
      }
    }
  }
  bookSets.forEach((mesh, i) => { mesh.count = counts[i]; mesh.instanceMatrix.needsUpdate = true; });
  const windowShape = new THREE.Shape(); windowShape.moveTo(-1.36, 0); windowShape.lineTo(-1.36, 3.7);
  windowShape.quadraticCurveTo(-1.36, 5.12, 0, 5.9); windowShape.quadraticCurveTo(1.36, 5.12, 1.36, 3.7); windowShape.lineTo(1.36, 0); windowShape.closePath();
  const glass = new THREE.Mesh(new THREE.ShapeGeometry(windowShape), new THREE.MeshStandardMaterial({ color: 0x223347, emissive: 0x33445d, emissiveIntensity: .65, roughness: .7 }));
  glass.position.set(0, .35, -5.96); scene.add(glass);
  for (const x of [-1.46, 0, 1.46]) addBox(x === 0 ? .09 : .20, 4.4, .17, x, 2.5, -5.75, stone);
  for (const y of [1.35, 2.65, 3.95]) addBox(2.8, .075, .08, 0, y, -5.73, stone);
  const archPoints: THREE.Vector3[] = [];
  for (let i = 0; i <= 60; i++) { const t = i / 60 * Math.PI; archPoints.push(new THREE.Vector3(Math.cos(t) * 1.48, 4.08 + Math.sin(t) * 2.12, -5.76)); }
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 60, .12, 6, false), stone));
  // A few closed volumes on the table anchor its scale.
  for (let i = 0; i < 3; i++) {
    const stack = new THREE.Group(); stack.position.set(2.5, -.06 + i * .16, -1.8); stack.rotation.y = -.25 + i * .13;
    const pages = new THREE.Mesh(new THREE.BoxGeometry(.73, .10, 1.0), new THREE.MeshStandardMaterial({ color: 0x827051, roughness: .94 })); stack.add(pages);
    for (const y of [-.065, .065]) { const cover = new THREE.Mesh(new THREE.BoxGeometry(.80, .033, 1.06), darkWood); cover.position.y = y; stack.add(cover); }
    scene.add(stack);
  }
}

function dedicationTexture(manuscript = false) {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 900;
  const ctx = canvas.getContext('2d')!;
  const paper = ctx.createRadialGradient(320, 430, 110, 320, 450, 540);
  paper.addColorStop(0, '#d7c296'); paper.addColorStop(.73, '#c9ad79'); paper.addColorStop(1, '#9e753e');
  ctx.fillStyle = paper; ctx.fillRect(0, 0, 640, 900);
  for (let i = 0; i < 800; i++) {
    const x = (Math.sin(i * 91.9) * .5 + .5) * 640, y = (Math.cos(i * 57.1) * .5 + .5) * 900;
    ctx.fillStyle = i % 3 ? '#6148200b' : '#f4e3b416'; ctx.fillRect(x, y, 1 + i % 3, 1);
  }
  ctx.strokeStyle = '#947044'; ctx.lineWidth = 2; ctx.strokeRect(36, 40, 568, 820);
  ctx.lineWidth = 1; ctx.strokeRect(45, 49, 550, 802);
  ctx.textAlign = 'center'; ctx.fillStyle = '#382516';
  if (manuscript) {
    ctx.strokeStyle = '#665033'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(298, 718); ctx.bezierCurveTo(337, 532, 276, 360, 339, 226); ctx.stroke();
    for (let i = 0; i < 11; i++) {
      const y = 670 - i * 37, side = i % 2 ? 1 : -1, x = 312 + Math.sin(i * .6) * 15;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + side * 45, y - 52, x + side * 115, y - 51, x + side * 127, y - 67);
      ctx.bezierCurveTo(x + side * 96, y - 7, x + side * 48, y + 7, x, y); ctx.stroke();
      ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + side * 127, y - 67); ctx.stroke(); ctx.lineWidth = 2;
    }
    ctx.strokeStyle = '#846b4266'; ctx.lineWidth = 1;
    for (let i = 0; i < 16; i++) {
      const y = 172 + i * 36;
      ctx.beginPath(); ctx.moveTo(88, y); for (let j = 0; j < 8; j++) ctx.lineTo(88 + j * 8, y + Math.sin(j * 4 + i) * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(463, y + 13); for (let j = 0; j < 9; j++) ctx.lineTo(463 + j * 8, y + 13 + Math.sin(j * 3 + i) * 2); ctx.stroke();
    }
    ctx.font = '48px Georgia'; ctx.fillStyle = '#98753a'; ctx.fillText('✧', 320, 160); ctx.fillText('❧', 320, 790);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }
  ctx.font = '28px Georgia'; ctx.fillStyle = '#795623'; ctx.fillText('THE STORY OF YOU', 320, 150); ctx.fillStyle = '#382516';
  ctx.font = '64px GiftSerif, SimSun, serif'; ctx.fillText('师宝宝', 320, 330);
  ctx.font = '32px GiftSerif, SimSun, serif'; ctx.fillStyle = '#25180f';
  ['每一段走过的路，', '都值得被温柔收藏。', '', '而这一页，', '只为你打开。'].forEach((text, i) => ctx.fillText(text, 320, 447 + i * 53));
  ctx.font = '65px Georgia'; ctx.fillStyle = '#ae8139'; ctx.fillText('✧', 320, 786);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Blender geometry, rendered and animated in the browser; no image-plane object. */
export default function MagicObject({ kind, open = false, extinguished = false, reducedMotion = false, onOpen }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const state = useRef({ open, extinguished, reducedMotion, onOpen });
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [turning, setTurning] = useState(true);
  const turningRef = useRef(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => { state.current = { open, extinguished, reducedMotion, onOpen }; }, [open, extinguished, reducedMotion, onOpen]);
  useEffect(() => { turningRef.current = turning; }, [turning]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false, frame = 0, inView = true, previous = performance.now(), elapsed = 0;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { setStatus('error'); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = kind === 'book' ? 1.18 : 1.03;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', kind === 'book' ? '可旋转、可翻开的立体魔法书' : '可旋转欣赏的立体星空蛋糕');
    renderer.domElement.style.touchAction = 'pan-y';
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(kind === 'book' ? 0x101218 : 0x080f1c, kind === 'book' ? .051 : .035);
    const camera = new THREE.PerspectiveCamera(kind === 'book' ? 36 : 32, 1, .1, 50);
    cameraRef.current = camera;
    camera.position.set(...(kind === 'book' ? [2.65, 5.25, 6.10] : [2.45, 2.35, 5.7]) as [number, number, number]);
    const controls = new OrbitControls(camera, renderer.domElement); controlsRef.current = controls;
    renderer.domElement.style.touchAction = "pan-y";
    controls.target.set(kind === 'book' ? -.12 : 0, kind === 'book' ? .23 : 1.01, 0);
    controls.enableDamping = true; controls.dampingFactor = .065; controls.enablePan = false;
    controls.enableZoom = false; controls.rotateSpeed = .55;
    controls.minPolarAngle = kind === 'book' ? .24 : .58;
    controls.maxPolarAngle = kind === 'book' ? 1.15 : Math.PI * .47;
    controls.minAzimuthAngle = kind === 'book' ? -.65 : -Infinity;
    controls.maxAzimuthAngle = kind === 'book' ? .85 : Infinity;
    controls.update(); controls.saveState();
    const env = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(env, .04); scene.environment = envTarget.texture;
    scene.environmentIntensity = kind === 'book' ? .25 : .56; env.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0x9faed6, 0x402714, kind === 'book' ? .55 : .85));
    const key = new THREE.DirectionalLight(0xffdfb1, kind === 'book' ? 3.15 : 2.75); key.position.set(-3.5, 6, 4.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = .018;
    key.shadow.camera.left = key.shadow.camera.bottom = -5; key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.camera.near = .1; key.shadow.camera.far = 18; scene.add(key);
    const rim = new THREE.DirectionalLight(0x87aefc, kind === 'book' ? 1.65 : 2.1); rim.position.set(3, 4, -5); scene.add(rim);
    const tableMap = floorTexture();
    const table = new THREE.Mesh(kind === 'book' ? new THREE.BoxGeometry(11, .25, 8) : new THREE.CylinderGeometry(2.6, 2.6, .16, 96), new THREE.MeshStandardMaterial({ color: kind === 'book' ? 0x9a7956 : 0x030609, map: kind === 'book' ? tableMap : null, roughness: kind === 'book' ? .54 : .94, metalness: kind === 'book' ? .05 : .01 }));
    table.position.y = kind === 'book' ? -.2 : -.34; table.receiveShadow = true; scene.add(table);
    if (kind === 'cake') {
      const tableRing = new THREE.Mesh(new THREE.TorusGeometry(2.48, .006, 6, 128), new THREE.MeshStandardMaterial({ color: 0x604725, roughness: .6, metalness: .65 }));
      tableRing.rotation.x = Math.PI / 2; tableRing.position.y = table.position.y + .082; scene.add(tableRing);
    } else libraryRoom(scene, tableMap);
    const group = new THREE.Group(); scene.add(group);
    const awakening = new THREE.PointLight(0xffcc80, 0, 5, 2); awakening.position.set(0, 1.15, .3); scene.add(awakening);
    const dustPositions = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i++) { dustPositions[i * 3] = Math.sin(i * 14.42) * 3.4; dustPositions[i * 3 + 1] = .4 + (i % 23) / 7; dustPositions[i * 3 + 2] = Math.cos(i * 29.1) * 2.9; }
    const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMap = glowTexture();
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xf3c97b, map: dustMap, size: .065, transparent: true, opacity: .72, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(dust);
    let model: THREE.Group | undefined;
    let cover: THREE.Object3D | undefined;
    let coverAngle = .025, openPhase = 0;
    const pages: THREE.Object3D[] = [];
    const paperSurfaces: Array<Array<{ mesh: THREE.Mesh; positions: Float32Array }>> = [];
    const flames: THREE.Sprite[] = [];
    const candleLights: THREE.PointLight[] = [];
    const plumeTexture = flameTexture();
    const grainTexture = leatherTexture();
    const hideMap = kind === 'book' ? hideTexture() : null;
    const pageTexture = kind === 'book' ? dedicationTexture() : null;
    const manuscriptMap = kind === 'book' ? dedicationTexture(true) : null;
    const edgesMap = kind === 'book' ? pageEdgeTexture() : null;
    const ambientFlames: THREE.Sprite[] = [];
    if (kind === 'book') {
      for (let i = 0; i < 4; i++) {
        const candle = new THREE.Group(); candle.position.set([-2.05, 1.88, -2.75, 2.1][i], -.07, [-1.35, -2.05, -1.9, -2.7][i]);
        const brass = new THREE.MeshStandardMaterial({ color: 0x9b723c, metalness: .8, roughness: .3 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.26, .30, .06, 32), brass); base.position.y = .03; candle.add(base);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(.04, .075, .34, 24), brass); stem.position.y = .21; candle.add(stem);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(.14, .1, .07, 32), brass); cup.position.y = .40; candle.add(cup);
        const height = [.85, .66, 1.16, 1.02][i];
        const wax = new THREE.Mesh(new THREE.CylinderGeometry(.074, .08, height, 32), new THREE.MeshStandardMaterial({ color: 0xd9be86, roughness: .67 })); wax.position.y = .44 + height / 2; wax.castShadow = true; candle.add(wax);
        for (let j = 0; j < 5; j++) {
          const drip = new THREE.Mesh(new THREE.CapsuleGeometry(.013, .06 + ((j + i) % 3) * .055, 3, 6), wax.material);
          drip.position.set(Math.sin(j * 2.7) * .074, .44 + height - .065 - ((j + i) % 3) * .026, Math.cos(j * 2.7) * .074); candle.add(drip);
        }
        const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: plumeTexture, depthWrite: false, transparent: true, toneMapped: false })); flame.position.y = .56 + height; flame.scale.set(.17, .34, 1); candle.add(flame); ambientFlames.push(flame);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: dustMap, color: 0xffaf54, opacity: .34, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.y = .55 + height; halo.scale.set(.63, .63, 1); candle.add(halo);
        const glow = new THREE.PointLight(0xffb563, i < 2 ? 2.1 : .85, 5, 1.8); glow.position.y = .48 + height; candle.add(glow);
        scene.add(candle);
      }
    } else {
      // Distant pinpricks read as a night sky, while the cake remains the lit hero.
      const stars = new Float32Array(110 * 3);
      for (let i = 0; i < 110; i++) { stars[i * 3] = Math.sin(i * 7.13) * 9; stars[i * 3 + 1] = .4 + (i % 19) * .31; stars[i * 3 + 2] = -3.5 - (i % 7); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
      scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xd8dff7, map: dustMap, size: .08, transparent: true, opacity: .75, depthWrite: false, blending: THREE.AdditiveBlending })));
    }
    const smoke = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: 0xc5d1db, size: .024, transparent: true, opacity: 0, depthWrite: false }));
    const smokePositions = new Float32Array(54 * 3); smoke.geometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3)); group.add(smoke);
    const sockets: THREE.Vector3[] = [];
    let blowTime = -100, wasBlown = false;
    const loader = new GLTFLoader();
    loader.load(assetUrl(`memory-book/${kind === 'book' ? 'magic-book' : 'star-cake'}.glb`), gltf => {
      if (disposed) { disposeObject(gltf.scene); return; }
      model = gltf.scene;
      model.traverse(object => {
        if (object instanceof THREE.Mesh) { object.castShadow = true; object.receiveShadow = true;
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach(mat => { if (mat instanceof THREE.MeshStandardMaterial) {
            mat.envMapIntensity = .85;
            if (/leather/i.test(mat.name)) { mat.map = hideMap; mat.color.setHex(/inset/i.test(mat.name) ? 0xba9d86 : 0xffffff); mat.bumpMap = grainTexture; mat.bumpScale = .055; mat.roughness = .53; }
            if (/buttercream|cream/i.test(mat.name)) { mat.bumpMap = grainTexture; mat.bumpScale = .0016; mat.roughness = .64; }
            if (/gold/i.test(mat.name)) { mat.envMapIntensity = .95; if (kind === 'book') { mat.bumpMap = grainTexture; mat.bumpScale = .003; mat.roughness = .37; } }
            if (/paper/i.test(mat.name)) { object.castShadow = false; object.receiveShadow = false;
              if (/Ivory handmade paper/i.test(mat.name)) {
                mat.map = edgesMap; mat.color.setHex(0xffffff);
                const attr = object.geometry.getAttribute('position'), uv = new Float32Array(attr.count * 2);
                for (let v = 0; v < attr.count; v++) { uv[v * 2] = (attr.getX(v) + attr.getZ(v) + 3) / 6; uv[v * 2 + 1] = (attr.getY(v) + .17) / .34; }
                object.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
              }
            }
            if (object.name.startsWith('Paper')) mat.side = THREE.DoubleSide;
          } });
        }
      });
      group.add(model);
      if (kind === 'book') {
        const dedication = new THREE.Mesh(new THREE.PlaneGeometry(2.32, 3.11), new THREE.MeshBasicMaterial({ map: pageTexture, side: THREE.DoubleSide }));
        dedication.rotation.x = -Math.PI / 2; dedication.position.set(.02, .354, 0); model.add(dedication);
      }
      cover = model.getObjectByName('CoverHinge');
      for (let i = 0; i < 6; i++) {
        const page = model.getObjectByName(`PageHinge_${i}`);
        if (!page) continue;
        pages.push(page);
        const surfaces: Array<{ mesh: THREE.Mesh; positions: Float32Array }> = [];
        page.children.forEach(child => {
          if (!(child instanceof THREE.Mesh)) return;
          const originalGeometry = child.geometry;
          child.geometry = originalGeometry.clone(); originalGeometry.dispose(); child.frustumCulled = false;
          const attr = child.geometry.getAttribute('position');
          if (child.name.startsWith('Paper_')) {
            const uv = new Float32Array(attr.count * 2);
            for (let v = 0; v < attr.count; v++) { uv[v * 2] = attr.getX(v) / 2.4; uv[v * 2 + 1] = 1 - (attr.getZ(v) + 1.6) / 3.2; }
            child.geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
            child.material = new THREE.MeshBasicMaterial({ map: manuscriptMap, side: THREE.DoubleSide });
          }
          const positions = new Float32Array(attr.count * 3);
          for (let v = 0; v < attr.count; v++) { positions[v * 3] = attr.getX(v); positions[v * 3 + 1] = attr.getY(v); positions[v * 3 + 2] = attr.getZ(v); }
          surfaces.push({ mesh: child, positions });
        });
        paperSurfaces.push(surfaces);
      }
      for (let i = 0; i < 3; i++) {
        const socket = model.getObjectByName(`FlameSocket_${i}`);
        if (!socket) continue;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: plumeTexture, transparent: true, depthWrite: false, toneMapped: false }));
        sprite.position.set(0, .085, 0); sprite.scale.set(.13, .25, 1); socket.add(sprite); flames.push(sprite);
        const light = new THREE.PointLight(0xffbe68, .60, 3, 1.6); light.position.y = .05; socket.add(light); candleLights.push(light);
        sockets.push(socket.position.clone());
      }
      setStatus('ready');
    }, undefined, () => { if (!disposed) setStatus('error'); });
    const resize = () => {
      const w = element.clientWidth, h = element.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.fov = kind === 'book' ? (w < 540 ? 44 : 36) : (w < 540 ? 38 : 32);
      camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const intersection = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; }); intersection.observe(element);
    let pointerStart = { x: 0, y: 0 }, dragging = false, lastTouch = -100;
    const down = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; dragging = true; };
    const up = (event: PointerEvent) => { dragging = false; lastTouch = elapsed;
      if (kind === 'book' && Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) < 6) state.current.onOpen?.();
    };
    const cancel = () => { dragging = false; lastTouch = elapsed; };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up); renderer.domElement.addEventListener('pointercancel', cancel);
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - previous) / 1000, .045); previous = now;
      if (document.hidden || !inView) return;
      elapsed += dt;
      const reduced = state.current.reducedMotion;
      if (kind === 'book') {
        ambientFlames.forEach((flame, i) => { const f = reduced ? 1 : 1 + Math.sin(elapsed * 11 + i) * .07; flame.scale.set(.17 / f, .34 * f, 1); });
        const desired = state.current.open ? 3.02 : (reduced ? .015 : .035 + Math.sin(elapsed * 1.1) * .02);
        coverAngle = reduced ? desired : THREE.MathUtils.damp(coverAngle, desired, state.current.open ? 1.25 : 4, dt);
        if (cover) cover.rotation.z = coverAngle;
        openPhase = reduced ? (state.current.open ? 1 : 0) : THREE.MathUtils.damp(openPhase, state.current.open ? 1 : 0, 1.12, dt);
        group.scale.setScalar(1.08 - openPhase * .23);
        group.position.x = openPhase * .65;
        awakening.intensity = openPhase * 2.8;
        pages.forEach((page, i) => {
          const delay = .58 + i * .045;
          const turn = THREE.MathUtils.smoothstep(openPhase, delay, Math.min(1, delay + .19));
          // Each paper leaf follows behind the solid cover as it opens.
          const clearedAngle = Math.max(0, coverAngle - .045 - i * .002);
          page.rotation.z = Math.min(turn * (2.975 - i * .007), clearedAngle) + (reduced || !state.current.open ? 0 : Math.sin(elapsed * 1.7 + i * .6) * .004);
          // Lift the turning leaves over the thickness of the opened cover.
          page.position.y = .354 - i * .011 + turn * (.14 + i * .016);
          const curl = Math.sin(turn * Math.PI) * .36;
          paperSurfaces[i]?.forEach(({ mesh, positions }) => {
            const attribute = mesh.geometry.getAttribute('position');
            for (let v = 0; v < attribute.count; v++) {
              const x = positions[v * 3];
              attribute.setY(v, positions[v * 3 + 1] + Math.sin(Math.min(1, Math.max(0, x / 2.4)) * Math.PI) * curl);
            }
            attribute.needsUpdate = true;
          });
        });
        group.rotation.y = reduced ? -.10 : -.1 + Math.sin(elapsed * .19) * .065;
      } else {
        if (turningRef.current && !reduced && !dragging && elapsed - lastTouch > 2) group.rotation.y += dt * .065;
        if (state.current.extinguished && !wasBlown) blowTime = elapsed;
        wasBlown = state.current.extinguished;
        flames.forEach((flame, i) => {
          flame.visible = !state.current.extinguished;
          const flicker = reduced ? 1 : 1 + Math.sin(elapsed * 13 + i * 8) * .09 + Math.cos(elapsed * 7 + i) * .05;
          flame.scale.set(.12 * (2 - flicker), .24 * flicker, 1);
          flame.position.x = reduced ? 0 : Math.sin(elapsed * 4 + i * 3) * .008;
          candleLights[i].intensity = state.current.extinguished ? 0 : .60 * flicker;
        });
        const smokeAge = elapsed - blowTime;
        const smokeMat = smoke.material as THREE.PointsMaterial;
        smokeMat.opacity = !reduced && state.current.extinguished && smokeAge < 4 ? .25 * (1 - smokeAge / 4) : 0;
        if (smokeMat.opacity > 0) {
          for (let i = 0; i < 54; i++) { const s = sockets[i % Math.max(1, sockets.length)]; if (!s) continue;
            const age = smokeAge + i / 120;
            smokePositions[i * 3] = s.x + Math.sin(age * 4 + i) * .025 * age;
            smokePositions[i * 3 + 1] = s.y + age * .22 + i / 450;
            smokePositions[i * 3 + 2] = s.z + Math.cos(age * 3 + i) * .013 * age;
          }
          smoke.geometry.attributes.position.needsUpdate = true;
        }
      }
      if (!reduced) { dust.rotation.y = elapsed * .017 + openPhase * .35; dust.position.y = Math.sin(elapsed * .3) * .045 + openPhase * .3; }
      controls.update(); renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('pointercancel', cancel);
      disposeObject(scene); tableMap.dispose(); grainTexture.dispose(); hideMap?.dispose(); pageTexture?.dispose(); manuscriptMap?.dispose(); edgesMap?.dispose(); plumeTexture.dispose(); dustMap.dispose(); envTarget.dispose(); renderer.dispose(); renderer.domElement.remove();
      controlsRef.current = null; cameraRef.current = null;
    };
  }, [kind, retry]);

  return <div className={`magic-object magic-object-${kind}`}>
    <div className="magic-object-canvas" ref={host} />
    {status === 'loading' && <span className="object-loading" role="status">{kind === 'book' ? '魔法书正在苏醒…' : '正在为你点亮星空…'}</span>}
    {status === 'error' && <div className="object-unavailable"><p>这一次没能打开立体画面。</p><button onClick={() => { setStatus('loading'); setRetry(n => n + 1); }}>再试一次</button></div>}
    {status === 'ready' && <div className="object-tools"><span>{kind === 'book' ? '拖动换个角度 · 轻触翻开' : '拖动，看看每一面的星光'}</span>{kind === 'cake' && <button aria-pressed={!turning} onClick={() => setTurning(!turning)}>{turning ? '停下欣赏' : '慢慢转动'}</button>}<button onClick={() => controlsRef.current?.reset()}>回到初始角度</button></div>}
  </div>;
}

function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  object.traverse(child => {
    if (child instanceof THREE.Light && 'shadow' in child) (child as THREE.DirectionalLight).shadow?.dispose();
    if (child instanceof THREE.InstancedMesh) child.dispose();
    if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Sprite) {
      if ('geometry' in child) geometries.add(child.geometry);
      const assigned = Array.isArray(child.material) ? child.material : [child.material];
      assigned.forEach(material => materials.add(material));
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
