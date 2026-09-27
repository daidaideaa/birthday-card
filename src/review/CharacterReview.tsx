import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { LionReference } from './LionReference';

type Actor = 'pair' | 'snow' | 'rain';
type Pose = 'neutral' | 'smile' | 'turn' | 'hands' | 'sitting';
type Framing = 'portrait' | 'full' | 'hands';
type Angle = 'front' | 'three-quarter' | 'side';
type Light = 'neutral' | 'dusk';
interface ViewOptions { actor: Actor; pose: Pose; framing: Framing; angle: Angle; light: Light }
interface Studio { update: (options: ViewOptions) => void; dispose: () => void }

function disposeModel(model: THREE.Object3D) {
  const textures = new Set<THREE.Texture>();
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.geometry.dispose();
    for (const mat of Array.isArray(node.material) ? node.material : [node.material]) {
      for (const value of Object.values(mat)) if (value instanceof THREE.Texture) textures.add(value);
      mat.dispose();
    }
  });
  textures.forEach((texture) => texture.dispose());
}

function createStudio(host: HTMLDivElement, onState: (message: string, ready: boolean) => void): Studio {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .92;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.setAttribute('aria-label', '可旋转的人物三维检查视图');
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d7d5cf');
  scene.fog=new THREE.Fog('#d7d5cf',4,14);
  const environmentScene = new RoomEnvironment();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(environmentScene, .04);
  scene.environment = environment.texture; scene.environmentIntensity = .35;
  environmentScene.dispose(); pmrem.dispose();
  const camera = new THREE.PerspectiveCamera(31, 1, .01, 30);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .13;
  controls.minDistance = .24;
  controls.maxDistance = 7;
  controls.maxPolarAngle = Math.PI * .84;
  const hemi = new THREE.HemisphereLight('#f7f6ef', '#737273', 2);
  scene.add(hemi);
  const key = new THREE.DirectionalLight('#fff2df', 3.2);
  key.position.set(-2, 3.5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -2; key.shadow.camera.right = 2;
  key.shadow.camera.top = 3; key.shadow.camera.bottom = -1;
  key.shadow.normalBias = .008; key.shadow.bias = -.0003;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#d8e7ff', 1.2); fill.position.set(3, 2, 1); scene.add(fill);
  const rim = new THREE.DirectionalLight('#fff4db', 2); rim.position.set(0, 3, -3); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#d7d5cf', roughness: .96 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -.009; floor.receiveShadow = true; scene.add(floor);
  const loader = new GLTFLoader();
  const actors = new THREE.Group(); scene.add(actors);
  const benches = new THREE.Group(); scene.add(benches);
  for (const [name,height] of [['snow',.325],['rain',.365]] as const) {
    const bench=new THREE.Group();bench.name=name;bench.position.z=-.21;
    const material=new THREE.MeshStandardMaterial({color:'#665641',roughness:.8});
    const seat=new THREE.Mesh(new THREE.BoxGeometry(.55,.035,.32),material);seat.position.y=height;bench.add(seat);
    for (const x of [-.235,.235]) for (const z of [-.12,.12]) {
      const leg=new THREE.Mesh(new THREE.BoxGeometry(.032,height,.032),material);leg.position.set(x,height/2,z);bench.add(leg);
    }
    bench.traverse((node) => { if (node instanceof THREE.Mesh) { node.castShadow=true;node.receiveShadow=true; } });
    bench.visible=false;benches.add(bench);
  }
  let current: ViewOptions | undefined;
  let request = 0;
  let disposed = false;
  let frame = 0;
  let visible = true;
  let loadSignature = '';
  const resize = () => {
    camera.aspect = host.clientWidth / Math.max(1, host.clientHeight);
    camera.updateProjectionMatrix();
    renderer.setSize(host.clientWidth, host.clientHeight);
    if (current) compose(current);
  };
  const compose = (options: ViewOptions) => {
    const pair = options.actor === 'pair';
    const female = options.actor === 'rain';
    const seated = options.pose === 'sitting';
    let y = options.framing === 'portrait' ? (pair ? 1.43 : female ? 1.40 : 1.54) : options.framing === 'hands' ? (female ? 1.0 : 1.12) : .91;
    if (seated) y -= .32;
    const distance = options.framing === 'portrait' ? (pair ? Math.max(2.05,1.3/(2*Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*camera.aspect)) : 1.18) : options.framing === 'hands' ? (pair ? 2.3 : 1.45) : (pair ? 4.15 : 3.8);
    const a = options.angle === 'front' ? 0 : options.angle === 'side' ? Math.PI / 2 : .55;
    const mobileFactor = camera.aspect < .9 ? (pair ? 1.43 : 1.12) : 1;
    controls.target.set(0, y, options.framing === 'hands' ? .22 : .025);
    camera.position.set(Math.sin(a) * distance * mobileFactor, y + (options.framing === 'full' ? .14 : .015), Math.cos(a) * distance * mobileFactor);
    controls.update();
  };
  const update = (options: ViewOptions) => {
    const previous = current; current = options;
    for (const bench of benches.children) {
      bench.visible=options.pose==='sitting' && (options.actor==='pair' || options.actor===bench.name);
      bench.position.x=options.actor==='pair' ? (bench.name==='snow' ? -.4 : .4) : 0;
    }
    const dusk = options.light === 'dusk';
    scene.background = new THREE.Color(dusk ? '#282a42' : '#d7d5cf');
    (scene.fog as THREE.Fog).color.copy(scene.background);
    floor.material.color.set(dusk ? '#393847' : '#d7d5cf');
    hemi.color.set(dusk ? '#aaaecd' : '#f7f6ef'); hemi.intensity = dusk ? 1.2 : 1.5;
    key.color.set(dusk ? '#ffd7a3' : '#fff2df'); key.intensity = dusk ? 2.8 : 2.4;
    fill.color.set(dusk ? '#929ce9' : '#d8e7ff'); fill.intensity = dusk ? 1.6 : 1.2;
    rim.color.set(dusk ? '#f0c4ae' : '#fff4db');
    if (!previous || ['actor','pose','framing','angle'].some((key) => previous[key as keyof ViewOptions] !== options[key as keyof ViewOptions])) compose(options);
    const signature = `${options.actor}/${options.pose}`;
    if (signature === loadSignature) return;
    loadSignature = signature;
    const id = ++request;
    onState('正在打开人物…', false);
    const names = options.actor === 'pair' ? ['snow','rain'] : [options.actor];
    Promise.allSettled(names.map(async (name) => {
      const gltf = await loader.loadAsync(`${import.meta.env.BASE_URL}review-assets/characters-v1/${name}-${options.pose}.glb`);
      const model = gltf.scene;
      model.name = name;
      model.position.x = options.actor === 'pair' ? (name === 'snow' ? -.40 : .40) : 0;
      model.traverse((node) => { if (node instanceof THREE.Mesh) { node.castShadow = true; node.receiveShadow = true; } });
      return model;
    })).then((results) => {
      const models=results.flatMap((result) => result.status==='fulfilled' ? [result.value] : []);
      const failure=results.find((result) => result.status==='rejected');
      if (failure?.status==='rejected') { models.forEach(disposeModel); throw failure.reason; }
      if (disposed || id !== request) { models.forEach(disposeModel); return; }
      for (const old of [...actors.children]) { actors.remove(old); disposeModel(old); }
      actors.add(...models);
      onState('拖动旋转 · 滚轮或双指缩放', true);
    }).catch((error: unknown) => {
      if (disposed || id !== request) return;
      loadSignature = '';
      onState(`人物加载失败：${error instanceof Error ? error.message : '未知错误'}`, false);
    });
  };
  const loop = () => {
    frame = 0;
    if (disposed || document.hidden || !visible) return;
    controls.update(); renderer.render(scene, camera);
    frame = requestAnimationFrame(loop);
  };
  const resume = () => { if (!frame && !disposed && !document.hidden && visible) loop(); };
  document.addEventListener('visibilitychange', resume);
  const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); }); intersection.observe(host);
  const observer = new ResizeObserver(resize); observer.observe(host);
  resize(); loop();
  return { update, dispose() {
    disposed = true; ++request; cancelAnimationFrame(frame);
    observer.disconnect(); intersection.disconnect(); document.removeEventListener('visibilitychange', resume);
    controls.dispose(); disposeModel(actors); disposeModel(floor);disposeModel(benches);environment.dispose();
    renderer.dispose(); renderer.domElement.remove();
  } };
}

function Choices<T extends string>({ label, value, items, onChange }: { label: string; value: T; items: [T, string][]; onChange: (value: T) => void }) {
  return <fieldset><legend>{label}</legend><div className="choices">{items.map(([key, text]) => <button key={key} aria-pressed={value === key} onClick={() => onChange(key)}>{text}</button>)}</div></fieldset>;
}

export function CharacterReview() {
  const mount = useRef<HTMLDivElement>(null);
  const studio = useRef<Studio | null>(null);
  const [options, setOptions] = useState<ViewOptions>(() => ({ actor: matchMedia('(max-width:550px)').matches ? 'snow' : 'pair', pose: 'neutral', framing: 'portrait', angle: 'front', light: 'neutral' }));
  const [status, setStatus] = useState({ message: '正在准备工作室…', ready: false });
  const [tab, setTab] = useState<'people' | 'lions'>('people');
  useEffect(() => {
    if (!mount.current || tab !== 'people') return;
    try { studio.current = createStudio(mount.current, (message, ready) => setStatus({ message, ready })); }
    catch { setStatus({ message: '此浏览器暂时无法建立 WebGL 视图，请使用支持 WebGL 的浏览器。', ready: false }); }
    return () => { studio.current?.dispose(); studio.current = null; };
  }, [tab]);
  useEffect(() => { studio.current?.update(options); }, [options, tab]);
  const change = <K extends keyof ViewOptions>(key: K, value: ViewOptions[K]) => setOptions((o) => ({ ...o, [key]: value, ...(key === 'pose' && value === 'hands' ? { framing: 'hands' as const } : {}) }));
  return <main className="review-app">
    <header className="studio-header"><a href="./character-review.html" className="wordmark">生日故事 <span>／角色工作室</span></a><span className="preview-pill"><i />独立预览 · 未发布</span></header>
    <div className="review-heading"><div><p className="eyebrow">CHARACTER STUDIES — 01</p><h1>先让角色，值得靠近。</h1><p>在中性光下看清造型，再把他们放进暮色里。</p></div><nav aria-label="角色章节"><button aria-pressed={tab === 'people'} onClick={() => setTab('people')}>第三章 · 人物</button><button aria-pressed={tab === 'lions'} onClick={() => setTab('lions')}>第四章 · 角色稿</button></nav></div>
    {tab === 'people' ? <div className="studio-layout">
      <section className={`viewport-shell ${options.light}`} aria-label="人物检查工作室">
        <div className="viewport" ref={mount} data-ready={status.ready} data-pose={options.pose} />
        <div className="viewport-title"><span>{options.light === 'neutral' ? '01 / 中性柔光' : '02 / 暮色舞台光'}</span><span>Snow & Rain · 造型候选</span></div>
        <p className="viewport-status" role="status">{status.message}</p>
      </section>
      <aside className="review-controls">
        <Choices label="角色" value={options.actor} items={[[ 'pair','两人'],['snow','男角色'],['rain','女角色']]} onChange={(v) => change('actor',v)} />
        <Choices label="观察距离" value={options.framing} items={[[ 'portrait','脸与肩颈'],['full','全身'],['hands','手部']]} onChange={(v) => change('framing',v)} />
        <Choices label="角度" value={options.angle} items={[[ 'front','正面'],['three-quarter','四分之三'],['side','侧面']]} onChange={(v) => change('angle',v)} />
        <Choices label="检查姿态" value={options.pose} items={[[ 'neutral','自然站姿'],['smile','微笑'],['turn','转头'],['hands','抬手'],['sitting','坐姿']]} onChange={(v) => change('pose',v)} />
        <Choices label="灯光" value={options.light} items={[[ 'neutral','中性光'],['dusk','暮色光']]} onChange={(v) => change('light',v)} />
        <div className="review-note"><span>本轮看什么</span><p>脸部亲和力、眼睑、发型轮廓、肩颈衔接、手指，以及白衬衫与黄裙的形状。</p><p className="subtle">这里展示造型与检查姿态。完整编舞在造型确认后制作。</p></div>
      </aside>
    </div> : <LionReference />}
    <footer className="studio-footer"><span>造型确认 → 动作样章 → 整章检查 → 发布</span><span>角色基础：<a href="https://studio.blender.org/characters/" target="_blank" rel="noreferrer">Blender Studio</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a></span><span>第一、二章与线上版本保持原样</span></footer>
  </main>;
}
