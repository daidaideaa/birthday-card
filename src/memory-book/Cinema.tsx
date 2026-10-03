import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../utils/assetUrl';
import './cinema.css';

export interface CinemaProps {
  reducedMotion: boolean;
  muted: boolean;
  active?: boolean;
  onComplete: () => void;
  onPlaybackChange?: (playing: boolean) => void;
}
interface Atlas { src: string; frameWidth: number; frameHeight: number; columns: number; frames: number; durations: number[] }
interface Character { image: HTMLImageElement; atlas: Atlas }
interface Scenery { background: HTMLImageElement; foreground: HTMLCanvasElement; horses: Character; lions: Character }
type Playback = 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';
const LENGTH = 20;
const WIDTH = 1280;
const HEIGHT = 720;
const cap = (n: number) => Math.max(0, Math.min(1, n));
const blend = (time: number, start: number, end: number) => {
  const k = cap((time - start) / (end - start));
  return k * k * (3 - 2 * k);
};
const starPositions = Array.from({ length: 72 }, (_, i) => ({ x: ((i * 173 + 97) % 1210) + 35, y: ((i * 137 + 43) % 330) + 32, r: .65 + (i % 5) * .28, phase: i * .76 }));

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load ${src}`));
    image.src = assetUrl(src);
  });
}
async function loadCharacter(name: string, signal: AbortSignal): Promise<Character> {
  const response = await fetch(assetUrl(`memory-book/films/${name}.json`), { signal });
  if (!response.ok) throw new Error('Character animation is unavailable');
  const atlas = await response.json() as Atlas;
  if (!atlas.frames || !atlas.frameWidth || !atlas.frameHeight || !atlas.columns || !Array.isArray(atlas.durations) || atlas.durations.length !== atlas.frames) throw new Error('Invalid character animation');
  return { image: await loadImage(atlas.src), atlas };
}
function grassForeground(background: HTMLImageElement) {
  const layer = document.createElement('canvas'); layer.width = WIDTH; layer.height = HEIGHT;
  const ctx = layer.getContext('2d')!;
  ctx.drawImage(background, -12, -7, WIDTH + 24, HEIGHT + 14);
  ctx.globalCompositeOperation = 'destination-in';
  const mask = ctx.createLinearGradient(0, 558, 0, 615);
  mask.addColorStop(0, 'rgba(0,0,0,0)'); mask.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = mask; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  return layer;
}
function star(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, alpha: number) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#fff1c5'; ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.quadraticCurveTo(x + radius * .18, y - radius * .18, x + radius * .7, y);
  ctx.quadraticCurveTo(x + radius * .18, y + radius * .18, x, y + radius);
  ctx.quadraticCurveTo(x - radius * .18, y + radius * .18, x - radius * .7, y);
  ctx.quadraticCurveTo(x - radius * .18, y - radius * .18, x, y - radius);
  ctx.fill(); ctx.restore();
}
/** Draw the source's real frame timing once, then hold its final pose. */
function character(ctx: CanvasRenderingContext2D, actor: Character, seconds: number, x: number, y: number, width: number, opacity: number) {
  if (opacity <= 0) return;
  const { atlas, image } = actor;
  let remaining = Math.max(0, seconds * 1000);
  let frame = 0;
  while (frame < atlas.frames - 1 && remaining >= atlas.durations[frame]) { remaining -= atlas.durations[frame]; frame++; }
  ctx.save(); ctx.globalAlpha = opacity;
  ctx.drawImage(image, (frame % atlas.columns) * atlas.frameWidth, Math.floor(frame / atlas.columns) * atlas.frameHeight, atlas.frameWidth, atlas.frameHeight, x, y, width, width * atlas.frameHeight / atlas.frameWidth);
  ctx.restore();
}
function paint(ctx: CanvasRenderingContext2D, art: Scenery, time: number, still: boolean, wish: number) {
  const night = blend(time, 4, 10);
  const drift = still ? 0 : Math.sin(time / 9) * 6;
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(art.background, -12 + drift, -7, WIDTH + 24, HEIGHT + 14);
  const light = ctx.createLinearGradient(0, 30, 0, HEIGHT);
  light.addColorStop(0, `rgba(18,29,66,${.04 + night * .4})`);
  light.addColorStop(.64, `rgba(255,185,88,${.19 * (1 - night)})`);
  light.addColorStop(1, `rgba(9,22,42,${night * .6})`);
  ctx.fillStyle = light; ctx.fillRect(0, 0, WIDTH, HEIGHT);
  const stars = .12 + blend(time, 4, 11) * .84;
  for (const point of starPositions) {
    const twinkle = still ? .85 : .68 + Math.sin(time * .8 + point.phase) * .2;
    ctx.globalAlpha = stars * twinkle; ctx.fillStyle = '#fce2ab'; ctx.beginPath(); ctx.arc(point.x, point.y, point.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  // New layers, camera placement and choreography surround the extracted original motion.
  const horseOpacity = blend(time, .3, 1) * (1 - blend(time, 4.8, 6.8));
  const lionOpacity = blend(time, 7, 8.3) * (1 - blend(time, 16, 19.7) * .42);
  ctx.save(); ctx.globalAlpha = horseOpacity * .16; ctx.fillStyle = '#241b22'; ctx.beginPath(); ctx.ellipse(660, 605, 275, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  character(ctx, art.horses, still ? .8 : time - 1, 235 + drift, 360, 820, horseOpacity);
  character(ctx, art.lions, still ? .72 : time - 8.3, 310 - drift * .35, 330, 660, lionOpacity);
  // The original shot already hides the hooves in grass; the new field continues that occlusion.
  ctx.save(); ctx.globalAlpha = horseOpacity; ctx.drawImage(art.foreground, drift, 0); ctx.restore();
  // Low foreground grasses hide only the naturally cropped lower edge of the close-up.
  const earth = ctx.createLinearGradient(0, 608, 0, HEIGHT);
  earth.addColorStop(0, 'rgba(15,25,32,0)'); earth.addColorStop(.5, `rgba(14,27,34,${.6 + night * .24})`); earth.addColorStop(1, '#0d1b29');
  ctx.fillStyle = earth; ctx.fillRect(0, 608, WIDTH, HEIGHT - 608);
  for (let i = 0; i < 116; i++) {
    const x = i * 12 - 35; const bottom = 724 + (i % 4) * 4; const height = 35 + ((i * 19) % 70);
    const bend = still ? 9 : 8 + Math.sin(time * 1.1 + i * .24) * (8 + wish * 7);
    ctx.strokeStyle = i % 3 === 0 ? `rgba(199,168,100,${.26 - night * .1})` : 'rgba(19,34,39,.84)'; ctx.lineWidth = i % 3 === 0 ? 1.2 : 2.1;
    ctx.beginPath(); ctx.moveTo(x, bottom); ctx.quadraticCurveTo(x - 8, bottom - height * .5, x + bend, bottom - height); ctx.stroke();
  }
  const wind = blend(time, 3, 4.5) * (1 - blend(time, 7, 9.5)) + wish * .65;
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `rgba(246,215,152,${wind * (.08 + (i % 2) * .04)})`; ctx.lineWidth = .9 + (i % 2) * .5; ctx.beginPath();
    const y = 545 + i * 13 - Math.sin(time * .6 + i) * 10;
    ctx.moveTo(-80, y); ctx.bezierCurveTo(390, y + 55, 680, y - 250, 1390, y - 340); ctx.stroke();
  }
  for (let i = 0; i < 38; i++) {
    const progress = still ? (i % 10) / 10 : ((time * .075 + i * .037) % 1);
    const x = -60 + progress * 1390; const y = 582 - Math.sin(progress * Math.PI * .73) * 370 + Math.sin(i * 14.2) * 31;
    star(ctx, x, y, 1.4 + (i % 4), cap(wind) * Math.sin(progress * Math.PI) * .8);
  }
  const constellation = blend(time, 11, 15);
  const nodes = [[559, 137], [525, 99], [478, 108], [468, 151], [557, 211], [645, 151], [635, 108], [590, 99], [559, 137]];
  ctx.strokeStyle = `rgba(239,215,165,${constellation * .45})`; ctx.lineWidth = 1; ctx.beginPath();
  nodes.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
  nodes.slice(0, -1).forEach(([x, y], i) => star(ctx, x, y, 3 + (i % 2), constellation * .9));
  const falling = blend(time, 15, LENGTH); const sx = 1030 - falling * 190; const sy = 119 + falling * falling * 488;
  const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, 53);
  glow.addColorStop(0, `rgba(254,215,130,${.27 + wish * .15})`); glow.addColorStop(1, 'rgba(254,215,130,0)');
  ctx.fillStyle = glow; ctx.fillRect(sx - 53, sy - 53, 106, 106); star(ctx, sx, sy, 9 + wish * 3, .93);
  if (falling > 0) { ctx.strokeStyle = `rgba(249,220,163,${.45 * (1 - falling)})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(1030, 119); ctx.quadraticCurveTo(950, 155, sx, sy); ctx.stroke(); }
}

export default function Cinema({ reducedMotion, active = true, onComplete, onPlaybackChange }: CinemaProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const time = useRef(0);
  const wishUntil = useRef(0);
  const [art, setArt] = useState<Scenery | null>(null);
  const [state, setState] = useState<Playback>('loading');
  const [position, setPosition] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const playbackCallback = useRef(onPlaybackChange);
  useEffect(() => { playbackCallback.current = onPlaybackChange; onPlaybackChange?.(false); }, [onPlaybackChange]);
  useEffect(() => {
    const abort = new AbortController(); let cancelled = false; setState('loading');
    Promise.all([loadImage('memory-book/wind-and-stars.webp'), loadCharacter('spirit-pair', abort.signal), loadCharacter('lion-nuzzle', abort.signal)])
      .then(([background, horses, lions]) => { if (!cancelled) { setArt({ background, foreground: grassForeground(background), horses, lions }); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; abort.abort(); };
  }, [attempt]);
  useEffect(() => {
    if (!active) setState((value) => value === 'playing' ? 'paused' : value);
    const pause = () => { if (document.hidden) setState((value) => value === 'playing' ? 'paused' : value); };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, [active]);
  useEffect(() => {
    if (!art || !canvas.current) return;
    const element = canvas.current; const ctx = element.getContext('2d'); if (!ctx) return;
    let raf = 0; let last = performance.now(); let lastReport = 0;
    const render = () => {
      const ratio = element.width / WIDTH; ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const sceneTime = state === 'ready' ? 1 : time.current;
      const wish = reducedMotion ? 0 : cap((wishUntil.current - performance.now()) / 2100);
      paint(ctx, art, sceneTime, reducedMotion, wish);
    };
    const resize = () => { const ratio = Math.min(window.devicePixelRatio || 1, 1.75); element.width = Math.round(element.clientWidth * ratio); element.height = Math.round(element.width * HEIGHT / WIDTH); render(); };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const tick = (now: number) => {
      if (state === 'playing' && active && !reducedMotion && !document.hidden) {
        time.current = Math.min(LENGTH, time.current + Math.min((now - last) / 1000, .1));
        if (now - lastReport > 100) { setPosition(time.current); lastReport = now; }
        if (time.current >= LENGTH) { setPosition(LENGTH); setState('ended'); }
      }
      last = now; render();
      if (state === 'playing' && !reducedMotion) raf = requestAnimationFrame(tick);
    };
    render(); if (state === 'playing' && !reducedMotion) raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); observer.disconnect(); };
  }, [art, state, reducedMotion, active, wishCount]);
  const start = () => {
    if (state === 'error') { setAttempt((value) => value + 1); return; }
    if (reducedMotion) {
      const next = time.current < 7 ? 10 : time.current < LENGTH ? LENGTH : 2;
      time.current = next; setPosition(next); setState(next === LENGTH ? 'ended' : 'paused'); setWishCount((n) => n + 1); return;
    }
    if (state === 'ended') { time.current = 0; setPosition(0); }
    setState((value) => value === 'playing' ? 'paused' : 'playing');
  };
  const replay = () => { time.current = reducedMotion ? 2 : 0; setPosition(time.current); setState(reducedMotion ? 'paused' : 'playing'); setWishCount((n) => n + 1); };
  const makeWish = () => { wishUntil.current = performance.now() + 2100; setWishCount((n) => n + 1); if (state === 'ready') start(); };
  const finish = () => { playbackCallback.current?.(false); onComplete(); };
  const caption = position < 5 ? '愿你有奔向旷野的自由。' : position < 8 ? '风走过很远的路，终于遇见了星光。' : position < 15 ? '也有停下时，可以安心靠近的温柔。' : '今晚，把最亮的一颗，留给你。';
  const starFall = blend(position, 15, LENGTH);
  const starStyle = { left: `${(1030 - starFall * 190) / WIDTH * 100}%`, top: `${(119 + starFall * starFall * 488) / HEIGHT * 100}%` };
  const loading = state === 'loading';
  return <section className={`memory-cinema${reducedMotion ? ' memory-cinema--still' : ''}`} data-cinema-state={state} aria-labelledby="memory-cinema-title">
    <header className="memory-cinema__intro"><p className="memory-cinema__eyebrow">THE WIND BROUGHT YOU HERE</p><h2 id="memory-cinema-title">风与星光，都来祝福你</h2><p>有些奇遇，走过辽阔的旷野。<br />有些温柔，最后停在你身边。</p></header>
    <div className="memory-cinema__theater">
      <canvas ref={canvas} className="memory-cinema__canvas" role="img" aria-label="金色旷野里，小马王与雨亲昵嬉戏。风带着光点经过，暮色下辛巴与娜娜相依，星光为你亮起。" />
      <div className="memory-cinema__vignette" aria-hidden="true" />
      {(loading || state === 'error') && <div className="memory-cinema__waiting" role="status"><span aria-hidden="true">✧</span><p>{loading ? '风正把这一页，轻轻吹开……' : '这一页暂时没展开，再轻轻试一次。'}</p></div>}
      {!loading && state !== 'error' && <button className="memory-cinema__wish" style={starStyle} type="button" onClick={makeWish} aria-label="轻触星星，送出一阵祝福" title="轻触星星，送出一阵祝福"><span aria-hidden="true">✧</span></button>}
      {state === 'ready' && <div className="memory-cinema__invitation"><button type="button" onClick={start}>让这页童话醒来 <span aria-hidden="true">↗</span></button></div>}
      <span className="memory-cinema__corner" aria-hidden="true">IV · A WISH IN THE WIND</span>
    </div>
    <div className="memory-cinema__caption" aria-live="polite"><p>{caption}</p><small>{state === 'paused' && !reducedMotion ? '停在这里，也很好。' : wishCount > 0 ? '你的祝福，星星已经听见了。' : '轻触画面里的星星，把祝福交给风。'}</small></div>
    <progress className="memory-cinema__progress" max={LENGTH} value={position} aria-label="风与星光的故事进度" />
    <div className="memory-cinema__actions">
      {state !== 'ready' && <button type="button" className="memory-cinema__quiet-button" onClick={start} disabled={loading}>{state === 'error' ? '再展开一次' : reducedMotion ? state === 'ended' ? '回到旷野' : '下一幅星光' : state === 'playing' ? '暂停，停留一下' : state === 'ended' ? '再看一次' : '继续这段奇遇'}</button>}
      {!loading && state !== 'error' && state !== 'ready' && state !== 'ended' && <button type="button" className="memory-cinema__quiet-button" onClick={replay}>从风吹起的地方重看</button>}
      <button type="button" className="memory-cinema__next" onClick={finish}>把星光带去下一页 <span aria-hidden="true">→</span></button>
    </div>
  </section>;
}
