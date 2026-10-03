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
  const gradient = ctx.createRadialGradient(48, 121, 0, 48, 104, 72);
  gradient.addColorStop(0, '#fffce2');
  gradient.addColorStop(.19, '#ffe3a1');
  gradient.addColorStop(.43, '#fcb254');
  gradient.addColorStop(.7, '#e9642022');
  gradient.addColorStop(1, '#dd421000');
  ctx.fillStyle = gradient;
  ctx.beginPath(); ctx.moveTo(48, 10); ctx.bezierCurveTo(16, 88, 7, 140, 48, 157);
  ctx.bezierCurveTo(87, 140, 76, 78, 48, 10); ctx.fill();
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
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(512, 512);
  let seed = 761;
  for (let i = 0; i < pixels.data.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const value = 140 + ((seed >>> 24) % 93);
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
    pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(3, 3);
  return texture;
}

function dedicationTexture() {
  const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 900;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#dfca9d'; ctx.fillRect(0, 0, 640, 900);
  ctx.strokeStyle = '#947044'; ctx.lineWidth = 2; ctx.strokeRect(36, 40, 568, 820);
  ctx.lineWidth = 1; ctx.strokeRect(45, 49, 550, 802);
  ctx.textAlign = 'center'; ctx.fillStyle = '#5a371d';
  ctx.font = '28px Georgia'; ctx.fillText('THE STORY OF YOU', 320, 150);
  ctx.font = '64px GiftSerif, SimSun, serif'; ctx.fillText('师宝宝', 320, 330);
  ctx.font = '26px GiftSerif, SimSun, serif';
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', kind === 'book' ? '可旋转、可翻开的立体魔法书' : '可旋转欣赏的立体星空蛋糕');
    renderer.domElement.style.touchAction = 'pan-y';
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(kind === 'book' ? 36 : 32, 1, .1, 50);
    cameraRef.current = camera;
    camera.position.set(...(kind === 'book' ? [3.5, 5.6, 5.8] : [3.2, 2.8, 5.4]) as [number, number, number]);
    const controls = new OrbitControls(camera, renderer.domElement); controlsRef.current = controls;
    renderer.domElement.style.touchAction = "pan-y";
    controls.target.set(kind === 'book' ? -.15 : 0, kind === 'book' ? .10 : .85, 0);
    controls.enableDamping = true; controls.dampingFactor = .065; controls.enablePan = false;
    controls.enableZoom = false; controls.rotateSpeed = .55;
    controls.minPolarAngle = kind === 'book' ? .24 : .58;
    controls.maxPolarAngle = kind === 'book' ? 1.15 : Math.PI * .47;
    controls.update(); controls.saveState();
    const env = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(env, .04); scene.environment = envTarget.texture;
    scene.environmentIntensity = .42; env.dispose(); pmrem.dispose();
    scene.add(new THREE.HemisphereLight(0xb8cbed, 0x46311b, 1.1));
    const key = new THREE.DirectionalLight(0xffdfa7, 3.2); key.position.set(-3.5, 6, 4.5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024); key.shadow.normalBias = .018;
    key.shadow.camera.left = key.shadow.camera.bottom = -5; key.shadow.camera.right = key.shadow.camera.top = 5;
    key.shadow.camera.near = .1; key.shadow.camera.far = 18; scene.add(key);
    const rim = new THREE.DirectionalLight(0x7196ff, 1.2); rim.position.set(4, 3, -4); scene.add(rim);
    const tableMap = floorTexture();
    const table = new THREE.Mesh(new THREE.CylinderGeometry(kind === 'book' ? 5 : 3.3, kind === 'book' ? 5 : 3.3, .16, 96), new THREE.MeshStandardMaterial({ color: 0x504235, map: tableMap, roughness: .72, metalness: .02 }));
    table.position.y = kind === 'book' ? -.2 : -.34; table.receiveShadow = true; scene.add(table);
    const tableRing = new THREE.Mesh(new THREE.TorusGeometry(kind === 'book' ? 4.85 : 3.17, .009, 6, 128), new THREE.MeshStandardMaterial({ color: 0x8f6630, roughness: .35, metalness: .75 }));
    tableRing.rotation.x = Math.PI / 2; tableRing.position.y = table.position.y + .082; scene.add(tableRing);
    const group = new THREE.Group(); scene.add(group);
    const dustPositions = new Float32Array(72 * 3);
    for (let i = 0; i < 72; i++) { dustPositions[i * 3] = Math.sin(i * 14.42) * 3.4; dustPositions[i * 3 + 1] = .4 + (i % 23) / 7; dustPositions[i * 3 + 2] = Math.cos(i * 29.1) * 2.9; }
    const dustGeometry = new THREE.BufferGeometry(); dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
    const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xf3c97b, size: .022, transparent: true, opacity: .48, depthWrite: false })); scene.add(dust);
    let model: THREE.Group | undefined;
    let cover: THREE.Object3D | undefined;
    let coverAngle = .025, openPhase = 0;
    const pages: THREE.Object3D[] = [];
    const paperSurfaces: Array<Array<{ mesh: THREE.Mesh; positions: Float32Array }>> = [];
    const flames: THREE.Sprite[] = [];
    const candleLights: THREE.PointLight[] = [];
    const plumeTexture = flameTexture();
    const grainTexture = leatherTexture();
    const pageTexture = dedicationTexture();
    const ambientFlames: THREE.Sprite[] = [];
    if (kind === 'book') {
      for (let i = 0; i < 2; i++) {
        const candle = new THREE.Group(); candle.position.set(i ? -2.0 : 1.85, -.10, i ? -1.55 : -2.05);
        const brass = new THREE.MeshStandardMaterial({ color: 0x9b723c, metalness: .8, roughness: .3 });
        const base = new THREE.Mesh(new THREE.CylinderGeometry(.26, .30, .06, 32), brass); base.position.y = .03; candle.add(base);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(.04, .075, .34, 24), brass); stem.position.y = .21; candle.add(stem);
        const cup = new THREE.Mesh(new THREE.CylinderGeometry(.14, .1, .07, 32), brass); cup.position.y = .40; candle.add(cup);
        const height = i ? .62 : .98;
        const wax = new THREE.Mesh(new THREE.CylinderGeometry(.074, .08, height, 32), new THREE.MeshStandardMaterial({ color: 0xd9be86, roughness: .67 })); wax.position.y = .44 + height / 2; wax.castShadow = true; candle.add(wax);
        const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: plumeTexture, depthWrite: false, blending: THREE.AdditiveBlending })); flame.position.y = .51 + height; flame.scale.set(.14, .25, 1); candle.add(flame); ambientFlames.push(flame);
        const glow = new THREE.PointLight(0xffb563, 1.6, 5, 1.5); glow.position.y = .48 + height; candle.add(glow);
        scene.add(candle);
      }
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
            if (/leather/i.test(mat.name)) { mat.bumpMap = grainTexture; mat.bumpScale = .018; mat.roughness = .64; }
            if (/buttercream/i.test(mat.name)) { mat.bumpMap = grainTexture; mat.bumpScale = .004; }
            if (object.name.startsWith('Paper')) mat.side = THREE.DoubleSide;
          } });
        }
      });
      group.add(model);
      if (kind === 'book') {
        const dedication = new THREE.Mesh(new THREE.PlaneGeometry(2.32, 3.11), new THREE.MeshStandardMaterial({ map: pageTexture, roughness: .88, side: THREE.DoubleSide }));
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
          child.geometry = child.geometry.clone(); child.frustumCulled = false;
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
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: plumeTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
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
      camera.fov = kind === 'book' ? (w < 540 ? 43 : 36) : (w < 540 ? 37 : 32);
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
        ambientFlames.forEach((flame, i) => { const f = reduced ? 1 : 1 + Math.sin(elapsed * 11 + i) * .07; flame.scale.set(.14 / f, .25 * f, 1); });
        const desired = state.current.open ? 3.02 : (reduced ? .015 : .035 + Math.sin(elapsed * 1.1) * .02);
        coverAngle = reduced ? desired : THREE.MathUtils.damp(coverAngle, desired, state.current.open ? 2.3 : 4, dt);
        if (cover) cover.rotation.z = coverAngle;
        openPhase = reduced ? (state.current.open ? 1 : 0) : THREE.MathUtils.damp(openPhase, state.current.open ? 1 : 0, 1.5, dt);
        group.scale.setScalar(1 - openPhase * .26);
        group.position.x = openPhase * .65;
        pages.forEach((page, i) => {
          const delay = .40 + i * .067;
          const turn = THREE.MathUtils.smoothstep(openPhase, delay, Math.min(1, delay + .25));
          page.rotation.z = turn * (3.01 - i * .007) + (reduced || !state.current.open ? 0 : Math.sin(elapsed * 1.7 + i * .6) * .006);
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
        if (turningRef.current && !reduced && !dragging && elapsed - lastTouch > 2) group.rotation.y += dt * .13;
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
      if (!reduced) { dust.rotation.y = elapsed * .017; dust.position.y = Math.sin(elapsed * .3) * .045; }
      controls.update(); renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('pointerdown', down); renderer.domElement.removeEventListener('pointerup', up); renderer.domElement.removeEventListener('pointercancel', cancel);
      disposeObject(scene); tableMap.dispose(); grainTexture.dispose(); pageTexture.dispose(); plumeTexture.dispose(); envTarget.dispose(); renderer.dispose(); renderer.domElement.remove();
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
  object.traverse(child => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Sprite) {
      if ('geometry' in child) child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach(material => material.dispose());
    }
  });
}
