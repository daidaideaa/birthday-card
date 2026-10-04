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
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = kind === 'book' ? 1.04 : 1.02;
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', kind === 'book' ? '可旋转、可翻开的立体魔法书' : '可旋转欣赏的立体星空蛋糕');
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
    scene.environmentIntensity = kind === 'book' ? .38 : .42; env.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xb8c6dc, 0x493226, kind === 'book' ? .62 : .75));
    const key = new THREE.DirectionalLight(0xffdec1, kind === 'book' ? 2.15 : 2.05); key.position.set(-3.5, 6, 4.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = .015; key.shadow.radius = 3;
    key.shadow.camera.left = key.shadow.camera.bottom = -5; key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.camera.near = .1; key.shadow.camera.far = 18; scene.add(key);
    const rim = new THREE.DirectionalLight(0xabbfde, kind === 'book' ? .85 : 1.1); rim.position.set(3, 4, -5); scene.add(rim);
    // Transparent contact shadows blend with the photographic desk behind this canvas.
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ color: 0x0e0805, opacity: .30 }));
    contact.rotation.x = -Math.PI / 2; contact.position.y = kind === 'book' ? -.12 : -.205; contact.receiveShadow = kind === 'book'; scene.add(contact);
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
    let cover: THREE.Object3D | undefined;
    let coverAngle = .025, openPhase = 0;
    const inkReveal = { value: 0 };
    let pageEdgeMaterial: THREE.LineBasicMaterial | undefined;
    let inkMotes: THREE.Points | undefined;
    const inkPositions = new Float32Array(18 * 3);
    const pages: THREE.Object3D[] = [];
    const paperSurfaces: Array<Array<{ mesh: THREE.Mesh; positions: Float32Array }>> = [];
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
            mat.envMapIntensity = kind === 'book' ? .85 : .55;
            if (kind === 'book' && /paper|leaf/i.test(mat.name)) { object.castShadow = false; object.receiveShadow = false; }
            [mat.map, mat.normalMap, mat.roughnessMap, mat.metalnessMap].forEach(texture => { if (texture) texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy()); });
            if (object.name.startsWith('Paper')) mat.side = THREE.DoubleSide;
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
        page.children.forEach(child => {
          if (!(child instanceof THREE.Mesh)) return;
          const originalGeometry = child.geometry;
          child.geometry = originalGeometry.clone(); originalGeometry.dispose(); child.frustumCulled = false;
          const attr = child.geometry.getAttribute('position');
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

        const desired = state.current.open ? 3.02 : (reduced ? .015 : .035 + Math.sin(elapsed * 1.1) * .02);
        coverAngle = reduced ? desired : THREE.MathUtils.damp(coverAngle, desired, state.current.open ? 1.25 : 4, dt);
        if (cover) cover.rotation.z = coverAngle;
        openPhase = reduced ? (state.current.open ? 1 : 0) : THREE.MathUtils.damp(openPhase, state.current.open ? 1 : 0, 1.12, dt);
        group.scale.setScalar(1.08 - openPhase * .23);
        group.position.x = openPhase * .65;
        awakening.intensity = openPhase * .48;
        inkReveal.value = reduced ? (state.current.open ? 1.06 : 0) : THREE.MathUtils.smoothstep(openPhase, .76, .994) * 1.06;
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
      disposeObject(scene); pageTexture?.dispose(); plumeTexture.dispose(); dustMap.dispose(); contactMap.dispose(); envTarget.dispose(); renderer.dispose(); renderer.domElement.remove();
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
