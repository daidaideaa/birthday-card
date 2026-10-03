import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createModelLoader } from '../utils/modelLoader';
import { assetUrl } from '../utils/assetUrl';
import { createJazzEnvironment } from './JazzEnvironment';
import { WHITE_NOTES, BLACK_NOTES, BLACK_AFTER_WHITE } from '../audio/PianoVoices';
import type { PerformanceFrame } from '../music/PerformanceState';
import { PianoFingerLayer } from './PianoFingerLayer';
import { qualityPolicy } from '../cinematic/quality';
import './duet-stage.css';

interface Props {
  frameRef: React.RefObject<PerformanceFrame>;
  heldRef: React.RefObject<readonly number[]>;
  onReady?: (ready: boolean) => void;
  inspect?: boolean;
  view?: 'wide' | 'piano' | 'hands';
}

function disposeTree(root: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse(o => {
    if (!(o instanceof THREE.Mesh)) return;
    geometries.add(o.geometry);
    if (o instanceof THREE.SkinnedMesh) skeletons.add(o.skeleton);
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      materials.add(m);
      Object.values(m).forEach(v => { if (v instanceof THREE.Texture) textures.add(v); });
    }
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  textures.forEach(t => t.dispose()); skeletons.forEach(s => s.dispose());
}

/** Both baked actors are sampled from one clock. No runtime pose reconstruction. */
export function AuthoredDuetStage({ frameRef, heldRef, onReady, inspect = false, view = 'wide' }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const ready = useRef(onReady); ready.current = onReady;
  const viewRef = useRef(view); viewRef.current = view;
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    const mount = host.current;
    if (!mount) return;
    let dirty = true;
    const quality = qualityPolicy();
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true }); }
    catch { setStatus('error'); ready.current?.(false); return; }
    const gl = renderer.getContext(), debug = gl.getExtension('WEBGL_debug_renderer_info');
    const software = debug && /swiftshader|llvmpipe|software|basic render/i.test(String(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)));
    renderer.setPixelRatio(software ? .8 : quality.pixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = quality.shadows && !software;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(createJazzEnvironment());
    const camera = new THREE.PerspectiveCamera(36, 1, .05, 100);
    const room = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer);
    const env = generator.fromScene(room, .04); room.dispose(); generator.dispose();
    scene.environment = env.texture; scene.environmentIntensity = .35;
    const key = new THREE.DirectionalLight('#ffe4bf', 2.3); key.position.set(-3, 5, 3);
    key.castShadow = renderer.shadowMap.enabled; key.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
    Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3 });
    key.shadow.normalBias = .016; key.shadow.bias = -.0001;
    const rim = new THREE.DirectionalLight('#c0ceff', 2); rim.position.set(2, 3, -3);
    scene.add(key, rim, new THREE.HemisphereLight('#d7dcff', '#584344', 1.0));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 18), new THREE.ShadowMaterial({ opacity: .3 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -.003; floor.receiveShadow = true; scene.add(floor);
    const controls = inspect ? new OrbitControls(camera, renderer.domElement) : undefined;
    controls?.target.set(-.1, .86, .1);
    if (controls) { controls.enableDamping = true; controls.minDistance = .4; controls.maxDistance = 12; }
    const setCamera = () => {
      const distance = camera.aspect < 1 ? Math.max(4.1, 2.55 / camera.aspect) : 4.5;
      const target = new THREE.Vector3(-.15, .85, .1);
      if (viewRef.current === 'piano') {
        camera.position.set(.1, 1.85, -1.9); target.set(-.8, .75, .15);
      } else if (viewRef.current === 'hands') {
        camera.position.set(.28, 1.40, 1.02); target.set(.26, 1.12, .23);
      } else camera.position.set(1.1, 1.8, distance);
      camera.lookAt(target); controls?.target.copy(target);
      controls?.update();
    };
    const resize = () => {
      const w = mount.clientWidth, h = mount.clientHeight;
      renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); setCamera();
      dirty = true;
    };
    const ro = new ResizeObserver(resize); ro.observe(mount); resize();
    const { loader, dispose: disposeLoader } = createModelLoader(renderer);
    const actors: { root: THREE.Object3D; mixer: THREE.AnimationMixer; action: THREE.AnimationAction }[] = [];
    let fingers: PianoFingerLayer | undefined;
    const keys = new Map<number, THREE.Mesh>();
    let disposed = false, visible = true, raf = 0, last = 0;
    const load = async () => {
      const results = await Promise.allSettled([
        loader.loadAsync(assetUrl('review-assets/duet-performance-v1/snow-performance.glb')),
        loader.loadAsync(assetUrl('review-assets/duet-performance-v1/rain-performance.glb')),
        loader.loadAsync(assetUrl('models/grand-piano.glb')),
      ]);
      const invalid = results.slice(0, 2).some(r => r.status === 'fulfilled' && r.value.animations.length !== 1);
      if (disposed || invalid || results.some(r => r.status === 'rejected')) {
        results.forEach(r => { if (r.status === 'fulfilled') disposeTree(r.value.scene); });
        if (!disposed) { setStatus('error'); ready.current?.(false); }
        return;
      }
      for (let i = 0; i < 2; i++) {
        const r = results[i] as PromiseFulfilledResult<Awaited<ReturnType<typeof loader.loadAsync>>>;
        const { scene: root, animations } = r.value;
        root.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
        const mixer = new THREE.AnimationMixer(root), action = mixer.clipAction(animations[0]);
        action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; action.play(); action.paused = true;
        actors.push({ root, mixer, action }); scene.add(root);
        if (i === 0) fingers = new PianoFingerLayer(root);
      }
      const piano = (results[2] as PromiseFulfilledResult<Awaited<ReturnType<typeof loader.loadAsync>>>).value.scene;
      piano.scale.setScalar(.135); piano.rotation.y = Math.PI / 2 - .6;
      piano.position.copy(new THREE.Vector3(0, .025, 1.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), -.6).add(new THREE.Vector3(-.8, 0, -.05)));
      piano.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(piano);
      const addKey = (note: number, x: number, y: number, z: number, black: boolean) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(black ? .58 : .9, .047, black ? .16 : .3), new THREE.MeshStandardMaterial({ color: black ? '#19151b' : '#fff4da', roughness: .35, emissive: '#d4993f', emissiveIntensity: 0 }));
        mesh.position.set(x, y, z); mesh.userData.rest = y; piano.add(mesh); keys.set(note, mesh);
      };
      WHITE_NOTES.forEach((n, i) => addKey(n, 5.49, 5.263, -.62 + i * .33, false));
      BLACK_NOTES.forEach(n => addKey(n, 5.63, 5.32, -.62 + (BLACK_AFTER_WHITE[n] + .5) * .33, true));
      const bench = new THREE.Mesh(new THREE.BoxGeometry(.53, .1, .28), new THREE.MeshStandardMaterial({ color: '#332533', roughness: .65 }));
      bench.position.copy(new THREE.Vector3(0, .37, -.17).applyAxisAngle(new THREE.Vector3(0, 1, 0), -.6).add(new THREE.Vector3(-.8, 0, -.05))); bench.rotation.y = -.6; bench.castShadow = true; scene.add(bench);
      for (const x of [-.21, .21]) for (const z of [-.09, .09]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(.035, .32, .035), new THREE.MeshStandardMaterial({ color: '#332533' }));
        leg.position.set(x, -.2, z); bench.add(leg);
      }
      setStatus('ready'); ready.current?.(true); mount.dataset.ready = 'true'; dirty = true;
    };
    let sampledTime = -1;
    let heldSignature = '';
    let sampledView = viewRef.current;
    const render = (now: number) => {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = last ? Math.min(.1, (now - last) / 1000) : 1 / 60; last = now;
      const frame = frameRef.current;
      const time = frame.progress * 26;
      const signature = heldRef.current.join(',');
      if (sampledView !== viewRef.current) { sampledView = viewRef.current; setCamera(); dirty = true; }
      const cameraMoved = controls?.update() ?? false;
      let keysMoving = signature !== heldSignature;
      if (sampledTime !== time || dirty || keysMoving) {
        fingers?.restore();
        for (const actor of actors) { actor.action.time = time; actor.mixer.update(0); }
        fingers?.apply(heldRef.current, time);
      }
      for (const [note, mesh] of keys) {
        const down = heldRef.current.includes(note);
        mesh.position.y += (mesh.userData.rest - (down ? .09 : 0) - mesh.position.y) * Math.min(1, dt * 25);
        keysMoving ||= Math.abs(mesh.userData.rest - (down ? .09 : 0) - mesh.position.y) > .0001;
        (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = down ? .55 : 0;
      }
      if (dirty || sampledTime !== time || keysMoving || cameraMoved) {
        const start = performance.now(); renderer.render(scene, camera);
        if (inspect) { mount.dataset.renderMs = (performance.now() - start).toFixed(1); mount.dataset.triangles = String(renderer.info.render.triangles); }
      }
      sampledTime = time; heldSignature = signature; dirty = false;
      mount.dataset.time = (frame.progress * 26).toFixed(3); mount.dataset.mode = frame.mode;
      raf = requestAnimationFrame(render);
    };
    const sync = () => {
      if (disposed || !visible || document.hidden) { cancelAnimationFrame(raf); raf = 0; last = 0; }
      else if (!raf) raf = requestAnimationFrame(render);
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }); observer.observe(mount);
    document.addEventListener('visibilitychange', sync); void load(); sync();
    return () => {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect(); observer.disconnect();
      document.removeEventListener('visibilitychange', sync); controls?.dispose();
      actors.forEach(a => { a.mixer.stopAllAction(); a.mixer.uncacheRoot(a.root); });
      disposeTree(scene); env.dispose(); key.shadow.dispose(); disposeLoader(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [frameRef, heldRef, inspect]);
  return <div className="duet-stage authored-duet-stage" data-status={status}>
    <div className="duet-stage__viewport" ref={host} />
    {status !== 'ready' && <p className="duet-stage__status">{status === 'error' ? '人物暂时无法载入，请检查预览资源。' : '正在准备暮色舞台…'}</p>}
  </div>;
}
