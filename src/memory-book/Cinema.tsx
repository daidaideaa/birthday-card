import { useEffect, useRef, useState } from 'react';
import { assetUrl } from '../utils/assetUrl';
import './cinema.css';
import { paintCinema, type Atlas, type Character, type Scenery } from './cinemaScene';

export interface CinemaProps {
  reducedMotion: boolean;
  muted: boolean;
  active?: boolean;
  onComplete: () => void;
  onPlaybackChange?: (playing: boolean) => void;
}
type Playback = 'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'error';
const LENGTH = 20;
const WIDTH = 1280;
const HEIGHT = 720;
const cap = (n: number) => Math.max(0, Math.min(1, n));
const blend = (time: number, start: number, end: number) => {
  const k = cap((time - start) / (end - start));
  return k * k * (3 - 2 * k);
};

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
export default function Cinema({ reducedMotion, active = true, onComplete, onPlaybackChange }: CinemaProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const theater = useRef<HTMLDivElement>(null);
  const time = useRef(0);
  const wishUntil = useRef(0);
  const [art, setArt] = useState<Scenery | null>(null);
  const [state, setState] = useState<Playback>('loading');
  const [position, setPosition] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [wishCount, setWishCount] = useState(0);
  const [framing, setFraming] = useState({ width: WIDTH, height: HEIGHT, x: 0, y: 0 });
  const resumeAfterOcclusion = useRef(false);
  const completeRef = useRef(onComplete);
  useEffect(() => { completeRef.current = onComplete; }, [onComplete]);
  useEffect(() => {
    if (state !== 'ended' || !active || reducedMotion) return;
    const timer = window.setTimeout(() => completeRef.current(), 2600);
    return () => clearTimeout(timer);
  }, [state, active, reducedMotion]);
  useEffect(() => { onPlaybackChange?.(state === 'playing' && active && !reducedMotion); return () => onPlaybackChange?.(false); }, [state, active, reducedMotion, onPlaybackChange]);
  useEffect(() => {
    const abort = new AbortController(); let cancelled = false; setState('loading');
    Promise.all([loadImage('memory-book/wind-and-stars.webp'), loadCharacter('spirit-pair', abort.signal), loadCharacter('lion-nuzzle', abort.signal)])
      .then(([background, horses, lions]) => { if (!cancelled) { setArt({ background, horses, lions }); setState('ready'); } })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; abort.abort(); };
  }, [attempt]);
  useEffect(() => {
    if (!active && state === 'playing') { resumeAfterOcclusion.current = true; setState('paused'); }
    if (active && !document.hidden && !reducedMotion && (state === 'ready' || resumeAfterOcclusion.current)) { resumeAfterOcclusion.current = false; setState('playing'); }
  }, [active, state, reducedMotion]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setState((value) => { if (value === 'playing') { resumeAfterOcclusion.current = true; return 'paused'; } return value; });
      else if (active && !reducedMotion) setState(value => {
        if (value === 'ready' || resumeAfterOcclusion.current) { resumeAfterOcclusion.current = false; return 'playing'; }
        return value;
      });
    };
    document.addEventListener('visibilitychange', pause);
    return () => document.removeEventListener('visibilitychange', pause);
  }, [active, reducedMotion]);
  useEffect(() => {
    if (!art || !canvas.current) return;
    const element = canvas.current; const ctx = element.getContext('2d'); if (!ctx) return;
    let raf = 0; let last = performance.now(); let lastReport = 0;
    const render = () => {
      const ratio = element.width / Math.max(1, element.clientWidth); ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const sceneTime = state === 'ready' ? 1 : time.current;
      const wish = reducedMotion ? 0 : cap((wishUntil.current - performance.now()) / 2100);
      paintCinema(ctx, art, sceneTime, reducedMotion, wish, element.clientWidth, element.clientHeight);
    };
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, element.clientWidth < 700 ? 1.5 : 1.75);
      element.width = Math.round(element.clientWidth * ratio); element.height = Math.round(element.clientHeight * ratio);
      const bounds = element.getBoundingClientRect(), parent = theater.current?.getBoundingClientRect();
      if (parent) {
        const width = bounds.width, height = bounds.height;
        setFraming({width,height,x:bounds.left-parent.left+(bounds.width-width)/2,y:bounds.top-parent.top+(bounds.height-height)/2});
      }
      render();
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const tick = (now: number) => {
      if (state === 'playing' && active && !reducedMotion && !document.hidden) {
        time.current = Math.min(LENGTH, time.current + Math.min((now - last) / 1000, .1));
        if (now - lastReport > 100) { setPosition(time.current); lastReport = now; }
        if (time.current >= LENGTH) { setPosition(LENGTH); setState('ended'); }
      }
      last = now; render();
      if (state === 'playing' && active && !reducedMotion && !document.hidden) raf = requestAnimationFrame(tick);
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
  const makeWish = () => { wishUntil.current = performance.now() + 2100; setWishCount((n) => n + 1); if (state === 'ready') start(); };
  const finish = () => { onPlaybackChange?.(false); onComplete(); };
  const caption = position < 5 ? '愿你有奔向旷野的自由。' : position < 8 ? '风走过很远的路，终于遇见了星光。' : position < 15 ? '也有停下时，可以安心靠近的温柔。' : '今晚，把最亮的一颗，留给你。';
  const starFall = blend(position, 15, LENGTH);
  const starStyle = { left: framing.x + (.73 - starFall * .12) * framing.width, top: framing.y + (.16 + starFall * starFall * .44) * framing.height };
  const loading = state === 'loading';
  return <section className={`memory-cinema${reducedMotion ? ' memory-cinema--still' : ''}${position > 15 ? ' memory-cinema--night' : ''}`} data-cinema-state={state} aria-labelledby="memory-cinema-title">
    <header className="memory-cinema__intro"><p className="memory-cinema__eyebrow">IV · A WISH IN THE WIND</p><h2 id="memory-cinema-title">风与星光</h2></header>
    <div className="memory-cinema__theater" ref={theater}>
      <canvas ref={canvas} className="memory-cinema__canvas" role="img" aria-label="金色旷野里，小马王与雨亲昵嬉戏。风带着光点经过，暮色下辛巴与娜娜相依，星光为你亮起。" />
      <div className="memory-cinema__vignette" aria-hidden="true" />
      {(loading || state === 'error') && <div className="memory-cinema__waiting" role="status"><span aria-hidden="true">✧</span><p>{loading ? '风正把这一页，轻轻吹开……' : '这一页暂时没展开，再轻轻试一次。'}</p></div>}
      {!loading && state !== 'error' && <button className="memory-cinema__wish" style={starStyle} type="button" onClick={makeWish} aria-label="轻触星星，送出一阵祝福" title="轻触星星，送出一阵祝福"><span aria-hidden="true">✧</span></button>}
    </div>
    <div className="memory-cinema__caption" data-pet-obstacle aria-live="polite"><p key={caption}>{caption}</p><small>{state === 'paused' && !reducedMotion ? '停在这里，也很好。' : wishCount > 0 ? '你的祝福，星星已经听见了。' : '让风替你收藏，自由与温柔。'}</small></div>
    <div className="memory-cinema__actions" data-pet-obstacle>
      <button type="button" className="memory-cinema__quiet-button" onClick={start} disabled={loading}>{state === 'error' ? '再展开一次' : reducedMotion ? state === 'ended' ? '回到旷野' : '下一幅星光' : state === 'playing' ? '停留片刻' : state === 'ended' ? '再赴一场奇遇' : '让风继续'}</button>
      <button type="button" className={`memory-cinema__next${state === 'ended' ? ' is-ready' : ''}`} onClick={finish}>{state === 'ended' ? '把星光，变成你的生日烛光' : '跟着星光走'} <span aria-hidden="true">→</span></button>
    </div>
  </section>;
}
