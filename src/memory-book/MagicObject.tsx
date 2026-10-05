import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { assetUrl } from '../utils/assetUrl';
import { BOOK_MECHANISMS, BOOK_SPREADS, LAST_BOOK_SPREAD, clampBookPage } from './bookPages';
import type { BookMechanism, ReadingSide } from './bookPages';
import { createBookMechanisms } from './bookMechanisms';
import type { MechanismTriggers } from './bookMechanisms';

type Props = {
  kind: 'book' | 'cake';
  open?: boolean;
  extinguished?: boolean;
  reducedMotion?: boolean;
  onOpen?: () => void;
  /** Number of leaves already turned, from 0 to 6. Omit for internal reading controls. */
  pageIndex?: number;
  onPageChange?: (index: number) => void;
  onTurningChange?: (turning: boolean) => void;
  onReadingChange?: (side: ReadingSide) => void;
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

function glowTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#fff8df'); gradient.addColorStop(.15, '#ffe0a8cc'); gradient.addColorStop(.42, '#ffc87435'); gradient.addColorStop(1, '#ffc87400');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

function contactTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const fade = ctx.createRadialGradient(64, 64, 13, 64, 64, 64);
  fade.addColorStop(0, '#080401aa'); fade.addColorStop(.48, '#08040163'); fade.addColorStop(1, '#08040100');
  ctx.fillStyle = fade; ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function dedicationTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 900;
  const ctx = canvas.getContext('2d')!;
  // Transparent ink is laid over the model's physically textured rag-paper sheet.
  ctx.strokeStyle = '#947044'; ctx.lineWidth = 2; ctx.strokeRect(36, 40, 568, 820);
  ctx.lineWidth = 1; ctx.strokeRect(45, 49, 550, 802);
  ctx.textAlign = 'center'; ctx.fillStyle = '#382516';
  ctx.font = '24px Georgia'; ctx.fillStyle = '#795623'; ctx.fillText('AD TE', 320, 150); ctx.fillStyle = '#382516';
  ctx.font = 'bold 62px STKaiti, SimSun, serif'; ctx.fillText('致师宝宝', 320, 345);
  ctx.font = 'bold 39px STKaiti, SimSun, serif'; ctx.fillStyle = '#25180f';
  ['故事，', '从这里开始。'].forEach((text, i) => ctx.fillText(text, 320, 490 + i * 75));
  ctx.font = '65px Georgia'; ctx.fillStyle = '#ae8139'; ctx.fillText('✧', 320, 786);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Blender geometry, rendered and animated in the browser; no image-plane object. */
export default function MagicObject({ kind, open = false, extinguished = false, reducedMotion = false, onOpen, pageIndex, onPageChange, onTurningChange, onReadingChange }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [internalPage, setInternalPage] = useState(0);
  const [readingSide, setReadingSide] = useState<ReadingSide>('spread');
  const [mechanismTriggers, setMechanismTriggers] = useState<MechanismTriggers>({ name: 0, veil: 0, ink: 0, note: 0 });
  const triggerMechanism = (id: BookMechanism) => setMechanismTriggers(values => ({ ...values, [id]: values[id] + 1 }));
  const activePage = clampBookPage(pageIndex ?? internalPage);
  const changePage = (index: number) => {
    const next = clampBookPage(index);
    setInternalPage(next);
    onPageChange?.(next);
  };
  const state = useRef({ open, extinguished, reducedMotion, onOpen, pageIndex: activePage, changePage, onTurningChange, readingSide, setReadingSide, mechanismTriggers, triggerMechanism });
  const controlsRef = useRef<OrbitControls | null>(null);
  const resetViewRef = useRef<(() => void) | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [turning, setTurning] = useState(true);
  const [pageTurning, setPageTurning] = useState(false);
  const turningRef = useRef(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => { state.current = { open, extinguished, reducedMotion, onOpen, pageIndex: activePage, changePage, onTurningChange, readingSide, setReadingSide, mechanismTriggers, triggerMechanism }; });
  useEffect(() => { if (!open) { setInternalPage(0); setReadingSide('spread'); setMechanismTriggers({ name: 0, veil: 0, ink: 0, note: 0 }); } }, [open]);
  useEffect(() => { if (kind === 'book') onReadingChange?.(readingSide); }, [kind, readingSide, onReadingChange]);
  useEffect(() => { turningRef.current = turning; }, [turning]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false, frame = 0, inView = true, previous = performance.now(), elapsed = 0;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch { setStatus('error'); state.current.onTurningChange?.(false); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth <= 680 ? 1.5 : 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = kind === 'book' ? 1.04 : 1.02;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', kind === 'book' ? '可旋转、可翻开的立体魔法书' : '可旋转欣赏的立体星空蛋糕');
    if (kind === 'book') { renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', '立体魔法书：拖动观察，点选纸页近读，回车打开或触发本页机关'); }
    renderer.domElement.style.touchAction = 'pan-y';
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
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
    scene.environmentIntensity = kind === 'book' ? .38 : .32; env.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xb8c6dc, 0x493226, kind === 'book' ? .62 : .75));
    const key = new THREE.DirectionalLight(0xffdec1, kind === 'book' ? 2.15 : 2.05); key.position.set(-3.5, 6, 4.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = .008; key.shadow.radius = kind === 'book' ? 4 : 6;
    key.shadow.camera.left = key.shadow.camera.bottom = -5; key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.camera.near = .1; key.shadow.camera.far = 18; scene.add(key);
    const rim = new THREE.DirectionalLight(0xabbfde, kind === 'book' ? .85 : .8); rim.position.set(3, 4, -5); scene.add(rim);
    // Transparent contact shadows blend with the photographic desk behind this canvas.
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ color: 0x0e0805, opacity: kind === 'book' ? .26 : .13 }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = kind === 'book' ? -.12 : -.205; contact.receiveShadow = true; scene.add(contact);
    const contactMap = contactTexture();
    const support = new THREE.Mesh(new THREE.PlaneGeometry(kind === 'book' ? 3.6 : 2.7, kind === 'book' ? 4.3 : 2.7), new THREE.MeshBasicMaterial({ map: contactMap, transparent: true, opacity: .48, depthWrite: false }));
    support.rotation.x = -Math.PI / 2; support.position.set(.08, kind === 'book' ? -.119 : -.204, .02); scene.add(support);
    const group = new THREE.Group(); scene.add(group);
    const awakening = new THREE.PointLight(0xffcc80, 0, 5, 2); awakening.position.set(0, 1.15, .3); scene.add(awakening);
    const dustPositions = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i++) { dustPositions[i * 3] = Math.sin(i * 14.42) * 3.4; dustPositions[i * 3 + 1] = .4 + (i % 23) / 7; dustPositions[i * 3 + 2] = Math.cos(i * 29.1) * 2.9; }
    const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dustMap = glowTexture();
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xf3c97b, map: dustMap, size: .032, transparent: true, opacity: .28, depthWrite: false, blending: THREE.AdditiveBlending })); scene.add(dust);
    let model: THREE.Group | undefined;
    let loadFailed = false;
    let paperMechanisms: ReturnType<typeof createBookMechanisms> | undefined;
    let cover: THREE.Object3D | undefined;
    let coverAngle = .025, openPhase = 0, pageProgress = 0;
    let readingViewTouched = false;
    let previousReadingSide: 'spread' | 'left' | 'right' = 'spread', previousOpen = false;
    let reportedTurning: boolean | undefined;
    resetViewRef.current = () => { readingViewTouched = false; controls.reset(); };
    const inkReveal = { value: 0 };
    let pageEdgeMaterial: THREE.LineBasicMaterial | undefined;
    let inkMotes: THREE.Points | undefined;
    const inkPositions = new Float32Array(18 * 3);
    const pages: THREE.Object3D[] = [];
    const paperSurfaces: Array<Array<{ mesh: THREE.Mesh; positions: Float32Array }>> = [];
    const paperTurns = new Array<number>(6).fill(-1);
    const flames: THREE.Sprite[] = [];
    const candleLights: THREE.PointLight[] = [];
    const plumeTexture = flameTexture();
    const pageTexture = kind === 'book' ? dedicationTexture() : null;
    if (kind === 'book') {
      const candleFill = new THREE.PointLight(0xffb67a, .8, 7, 2); candleFill.position.set(-2.8, 1.8, 1); scene.add(candleFill);
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
            mat.envMapIntensity = kind === 'book' ? .85 : .36;
            if (kind === 'book' && /paper|leaf/i.test(mat.name)) {
              mat.envMapIntensity = .18; mat.roughness = .98;
              if (mat instanceof THREE.MeshPhysicalMaterial) mat.specularIntensity = .14;
            }
            if (kind === 'cake' && /buttercream|vanilla/i.test(mat.name)) {
              mat.roughness = Math.max(.92, mat.roughness); mat.envMapIntensity = .23;
              if (mat instanceof THREE.MeshPhysicalMaterial) mat.specularIntensity = .23;
            }
            [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap].forEach(texture => { if (texture) texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); });
            // Every physical leaf has distinct recto and verso primitives.
            if (/story leaf/i.test(mat.name)) mat.side = THREE.FrontSide;
          } });
        }
      });
      group.add(model);
      if (kind === 'book') {
        const ink = new THREE.MeshStandardMaterial({ map: pageTexture, transparent: true, roughness: 1, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
        ink.onBeforeCompile = shader => {
          shader.uniforms.uInkReveal = inkReveal;
          shader.fragmentShader = 'uniform float uInkReveal;\n' + shader.fragmentShader;
          shader.fragmentShader = shader.fragmentShader.replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= smoothstep(1.0 - vMapUv.y - 0.04, 1.0 - vMapUv.y + 0.04, uInkReveal);');
        };
        ink.customProgramCacheKey = () => 'wizard-book-dedication-ink';
        const dedication = new THREE.Mesh(new THREE.PlaneGeometry(2.32, 3.11), ink);
        dedication.rotation.x = -Math.PI / 2; dedication.position.set(.02, .344, 0); model.add(dedication);
        pageEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xd3bf8c, transparent: true, opacity: 0, depthWrite: false });
        const edge = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(-1.16, .347, -1.56), new THREE.Vector3(1.18, .347, -1.56),
          new THREE.Vector3(1.18, .347, 1.56), new THREE.Vector3(-1.16, .347, 1.56),
        ]), pageEdgeMaterial);
        model.add(edge);
        const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(inkPositions, 3));
        inkMotes = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x6f4a27, size: .015, transparent: true, opacity: 0, depthWrite: false }));
        model.add(inkMotes);
      }
      cover = model.getObjectByName('CoverHinge');
      for (let i = 0; i < 6; i++) {
        const page = model.getObjectByName(`PageHinge_${i}`);
        if (!page) continue;
        pages.push(page);
        const surfaces: Array<{ mesh: THREE.Mesh; positions: Float32Array }> = [];
        page.traverse(child => {
          if (!(child instanceof THREE.Mesh) || !child.name.startsWith('Paper_')) return;
          const originalGeometry = child.geometry;
          child.geometry = originalGeometry.clone(); originalGeometry.dispose(); child.frustumCulled = false;
          const attr = child.geometry.getAttribute('position');
          const positions = new Float32Array(attr.count * 3);
          for (let v = 0; v < attr.count; v++) { positions[v * 3] = attr.getX(v); positions[v * 3 + 1] = attr.getY(v); positions[v * 3 + 2] = attr.getZ(v); }
          surfaces.push({ mesh: child, positions });
        });
        paperSurfaces.push(surfaces);
      }
      if (kind === 'book') paperMechanisms = createBookMechanisms(model, pages);
      for (let i = 0; i < 3; i++) {
        const socket = model.getObjectByName(`FlameSocket_${i}`);
        if (!socket) continue;
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: plumeTexture, transparent: true, depthWrite: false, toneMapped: false }));
        sprite.position.set(0, .085, 0); sprite.scale.set(.13, .25, 1); socket.add(sprite); flames.push(sprite);
        const light = new THREE.PointLight(0xffbe68, .60, 3, 1.6); light.position.y = .05; socket.add(light); candleLights.push(light);
        sockets.push(socket.position.clone());
      }
      setStatus('ready');
    }, undefined, () => { if (!disposed) { loadFailed = true; setStatus('error'); setPageTurning(false); state.current.onTurningChange?.(false); } });
    const resize = () => {
      const w = element.clientWidth, h = element.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.fov = kind === 'book' ? (w < 540 ? 44 : 36) : (w < 540 ? 38 : 32);
      camera.updateProjectionMatrix(); renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.innerWidth <= 680 ? 1.5 : 1.7));
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const intersection = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; }); intersection.observe(element);
    let pointerStart = { x: 0, y: 0 }, dragging = false, lastTouch = -100;
    const raycaster = new THREE.Raycaster();
    const down = (event: PointerEvent) => { pointerStart = { x: event.clientX, y: event.clientY }; dragging = true; };
    const up = (event: PointerEvent) => { dragging = false; lastTouch = elapsed;
      if (kind !== 'book') return;
      if (Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) >= 6) { readingViewTouched = true; return; }
      if (!state.current.open) { state.current.onOpen?.(); return; }
      if (!model || openPhase < .9 || Math.abs(pageProgress - state.current.pageIndex) >= .025) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
      const hit = raycaster.intersectObject(model, true).find(item => item.object.visible);
      if (!hit) return;
      const point = group.worldToLocal(hit.point.clone());
      const side = point.x < -1.15 ? 'left' : 'right';
      if (state.current.readingSide !== side) state.current.setReadingSide(side);
      else { const action = BOOK_MECHANISMS[state.current.pageIndex]; if (side === 'right' && action) state.current.triggerMechanism(action.id); }
    };
    const keydown = (event: KeyboardEvent) => {
      if (kind !== 'book' || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      if (!state.current.open) state.current.onOpen?.();
      else if (Math.abs(pageProgress - state.current.pageIndex) < .025) { const action = BOOK_MECHANISMS[state.current.pageIndex]; if (action) state.current.triggerMechanism(action.id); }
    };
    const cancel = () => { dragging = false; lastTouch = elapsed; };
    renderer.domElement.addEventListener('pointerdown', down); renderer.domElement.addEventListener('pointerup', up); renderer.domElement.addEventListener('pointercancel', cancel);
    renderer.domElement.addEventListener('keydown', keydown);
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      const dt = Math.min((now - previous) / 1000, .045); previous = now;
      if (document.hidden || !inView) return;
      elapsed += dt;
      const reduced = state.current.reducedMotion;
      if (kind === 'book') {

        const requestedPage = state.current.open ? state.current.pageIndex : 0;
        // Progress advances through one real leaf at a time, even after rapid input.
        const canTurn = openPhase > .89 || !state.current.open;
        const step = dt * (state.current.open ? .77 : 3.5);
        if (reduced) pageProgress = requestedPage;
        else if (canTurn) pageProgress += THREE.MathUtils.clamp(requestedPage - pageProgress, -step, step);
        const keepCoverOpen = state.current.open || pageProgress > .002;
        const desired = keepCoverOpen ? 3.12 : (reduced ? .015 : .035 + Math.sin(elapsed * 1.1) * .02);
        coverAngle = reduced ? desired : THREE.MathUtils.damp(coverAngle, desired, keepCoverOpen ? 1.65 : 4, dt);
        if (cover) cover.rotation.z = coverAngle;
        openPhase = reduced ? (keepCoverOpen ? 1 : 0) : THREE.MathUtils.damp(openPhase, keepCoverOpen ? 1 : 0, 1.65, dt);
        group.scale.setScalar(1.08 - openPhase * .23);
        group.position.x = openPhase * .65;
        awakening.intensity = openPhase * .48;
        inkReveal.value = reduced ? (pageProgress === LAST_BOOK_SPREAD ? 1.06 : 0) : THREE.MathUtils.smoothstep(pageProgress, 5.55, 6) * 1.06;
        const recognition = reduced ? 0 : Math.sin(THREE.MathUtils.smoothstep(openPhase, .46, 1) * Math.PI);
        if (pageEdgeMaterial) pageEdgeMaterial.opacity = recognition * .42;
        if (inkMotes) {
          (inkMotes.material as THREE.PointsMaterial).opacity = recognition * .48;
          for (let i = 0; i < 18; i++) {
            inkPositions[i * 3] = Math.sin(i * 12.34) * .82 + Math.sin(elapsed * .8 + i) * .008;
            inkPositions[i * 3 + 1] = .36 + recognition * (.02 + (i % 4) * .013);
            inkPositions[i * 3 + 2] = Math.cos(i * 7.81) * 1.15;
          }
          inkMotes.geometry.attributes.position.needsUpdate = true;
        }
        pages.forEach((page, i) => {
          const turn = THREE.MathUtils.smoothstep(pageProgress - i, 0, 1);
          // Unturned rectos sit above the endpaper; the newest verso rests atop the left stack.
          page.rotation.z = turn * (3.025 + i * .004);
          page.position.y = THREE.MathUtils.lerp(.39 - i * .006, .552 + i * .010, turn) + Math.sin(turn * Math.PI) * .08;
          const curl = Math.sin(turn * Math.PI) * .36;
          if (Math.abs(paperTurns[i] - turn) < .0001) return;
          paperTurns[i] = turn;
          paperSurfaces[i]?.forEach(({ mesh, positions }) => {
            const attribute = mesh.geometry.getAttribute('position');
            for (let v = 0; v < attribute.count; v++) {
              const x = positions[v * 3];
              attribute.setY(v, positions[v * 3 + 1] + Math.sin(Math.min(1, Math.max(0, x / 2.4)) * Math.PI) * curl);
            }
            attribute.needsUpdate = true;
            mesh.geometry.computeVertexNormals();
          });
        });
        group.rotation.y = -.1 + (reduced ? 0 : Math.sin(elapsed * .19) * .025 * (1 - openPhase));
        // A quiet, more overhead reading angle makes the printed pages legible.
        if (previousReadingSide !== state.current.readingSide || previousOpen !== state.current.open) readingViewTouched = false;
        previousReadingSide = state.current.readingSide; previousOpen = state.current.open;
        if (!readingViewTouched && !dragging) {
          const view = new THREE.Vector3().lerpVectors(new THREE.Vector3(2.65, 5.25, 6.1), new THREE.Vector3(.15, 6.65, 5.0), openPhase);
          const target = new THREE.Vector3(-.12, .23, 0);
          if (openPhase > .89 && state.current.readingSide !== 'spread') {
            const left = state.current.readingSide === 'left';
            target.set(left ? -1.37 : .65, left ? .49 : .34, left ? -.17 : 0);
            const small = element.clientWidth < 540;
            view.copy(target).add(new THREE.Vector3(.03, small ? 3.15 : 3.85, small ? 1.45 : 1.8));
          }
          camera.position.lerp(view, reduced ? 1 : 1 - Math.exp(-dt * 2));
          controls.target.lerp(target, reduced ? 1 : 1 - Math.exp(-dt * 2));
        }
        const busy = !loadFailed && (!model || Math.abs(pageProgress - requestedPage) > .001 || Math.abs(coverAngle - desired) > .025);
        paperMechanisms?.update(requestedPage, state.current.mechanismTriggers, dt, reduced, state.current.open && !busy);
        if (busy !== reportedTurning) {
          reportedTurning = busy;
          setPageTurning(busy);
          state.current.onTurningChange?.(busy);
        }
      } else {
        if (turningRef.current && !reduced && !dragging && elapsed - lastTouch > 2) group.rotation.y = THREE.MathUtils.damp(group.rotation.y, -.10 + Math.sin(elapsed * .16) * .18, 1.8, dt);
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
      renderer.domElement.removeEventListener('keydown', keydown);
      disposeObject(scene); pageTexture?.dispose(); plumeTexture.dispose(); dustMap.dispose(); contactMap.dispose(); envTarget.dispose(); renderer.dispose(); renderer.domElement.remove();
      controlsRef.current = null; cameraRef.current = null;
      resetViewRef.current = null;
      if (kind === 'book' && reportedTurning) state.current.onTurningChange?.(false);
    };
  }, [kind, retry]);

  const mechanism = BOOK_MECHANISMS[activePage];
  return <div className={`magic-object magic-object-${kind}${kind === 'book' && open && readingSide !== 'spread' ? ' is-reading' : ''}`} data-open={kind === 'book' && open} data-reading={kind === 'book' ? readingSide : undefined}>
    <div className="magic-object-canvas" ref={host} />
    {status === 'loading' && <span className="object-loading" role="status">{kind === 'book' ? '魔法书正在苏醒…' : '正在为你点亮星空…'}</span>}
    {status === 'error' && <div className="object-unavailable"><p>这一次没能打开立体画面。</p><button onClick={() => { setStatus('loading'); setRetry(n => n + 1); }}>再试一次</button></div>}
    {status === 'ready' && !(kind === 'book' && open) && <div className="object-tools"><span>{kind === 'book' ? '拖动换个角度 · 轻触翻开' : '拖动，看看每一面的星光'}</span>{kind === 'cake' && <button aria-pressed={!turning} onClick={() => setTurning(!turning)}>{turning ? '停下欣赏' : '慢慢转动'}</button>}<button onClick={() => resetViewRef.current?.()}>回到初始角度</button></div>}
    {kind === 'book' && open && status === 'ready' && <nav className="book-page-controls" aria-label="逐页翻阅魔法书" aria-busy={pageTurning}>
      <div className="book-page-row">
        <button type="button" aria-label="翻回上一页" disabled={pageTurning || activePage === 0} onClick={() => changePage(activePage - 1)}>‹</button>
        <span aria-live="polite"><small>{activePage + 1} / {BOOK_SPREADS.length}</small>{BOOK_SPREADS[activePage]}</span>
        <button type="button" aria-label="翻到下一页" disabled={pageTurning || activePage === LAST_BOOK_SPREAD} onClick={() => changePage(activePage + 1)}>›</button>
      </div>
      <div className="book-page-options"><button type="button" aria-pressed={readingSide === 'left'} onClick={() => setReadingSide(readingSide === 'left' ? 'spread' : 'left')}>{readingSide === 'left' ? '回到双页' : '近读左页'}</button><button type="button" aria-pressed={readingSide === 'right'} onClick={() => setReadingSide(readingSide === 'right' ? 'spread' : 'right')}>{readingSide === 'right' ? '回到双页' : '近读右页'}</button><button type="button" onClick={() => { changePage(0); onOpen?.(); }}>合上书</button></div>
      {mechanism && <div className="book-mechanism-row"><button type="button" disabled={pageTurning} aria-label={mechanismTriggers[mechanism.id] ? `再看一次：${mechanism.label}` : mechanism.label} onClick={() => triggerMechanism(mechanism.id)}>{mechanismTriggers[mechanism.id] ? '再看一次' : mechanism.label}<span aria-hidden="true"> ✧</span></button><p className="book-accessible-message" role="status">{mechanismTriggers[mechanism.id] ? mechanism.result : ''}</p></div>}
    </nav>}
  </div>;
}

function disposeObject(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse(child => {
    if (child instanceof THREE.Light && 'shadow' in child) (child as THREE.DirectionalLight).shadow?.dispose();
    if (child instanceof THREE.InstancedMesh) child.dispose();
    if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Sprite || child instanceof THREE.Line) {
      if ('geometry' in child) geometries.add(child.geometry);
      const assigned = Array.isArray(child.material) ? child.material : [child.material];
      assigned.forEach(material => {
        materials.add(material);
        Object.values(material).forEach(value => { if (value instanceof THREE.Texture) textures.add(value); });
      });
    }
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => { texture.dispose(); if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) texture.image.close(); });
}
