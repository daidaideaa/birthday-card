import { useEffect, useRef, type CSSProperties } from 'react';
import { assetUrl } from '../utils/assetUrl';

export type TransitionKind = 'book' | 'sand' | 'wind' | 'star' | 'return';
const durations: Record<TransitionKind, number> = { book: 2600, sand: 2500, wind: 2600, star: 2800, return: 1700 };
export const transitionDuration = (kind: TransitionKind) => durations[kind];
const lines: Record<TransitionKind, string> = { book: '每一段来路，都藏着一束光。', sand: '后来，平凡的日子也值得收藏。', wind: '把自由与温柔，都留给你。', star: '这一颗星光，落在你的生日。', return: '' };
const cap = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => { const v = cap(x); return v * v * (3 - 2 * v); };
const between = (p: number, a: number, b: number) => ease((p - a) / (b - a));
const noise = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };

/** Optical bridges cover the lens at the same midpoint as MemoryGift's scene cut. */
export default function ChapterTransition({ kind, reducedMotion, photo }: { kind: TransitionKind; reducedMotion: boolean; photo: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (reducedMotion || !canvas.current) return;
    const element = canvas.current, ctx = element.getContext('2d');
    if (!ctx) return;
    let width = window.innerWidth, height = window.innerHeight;
    const picture = new Image(); picture.src = kind === 'book' || kind === 'return' ? assetUrl('memory-book/manuscript-leaf.webp') : kind === 'wind' ? assetUrl('memory-book/wind-and-stars.webp') : photo;
    const resize = () => {
      width = window.innerWidth; height = window.innerHeight;
      const ratio = Math.min(devicePixelRatio || 1, 1.5);
      element.width = width * ratio; element.height = height * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    resize(); window.addEventListener('resize', resize);
    let frame = 0;
    const start = performance.now();
    const paintPicture = (x: number, y: number, w: number, h: number) => {
      if (!picture.complete || !picture.naturalWidth) return;
      const scale = Math.max(w / picture.width, h / picture.height);
      const sw = w / scale, sh = h / scale;
      ctx.drawImage(picture, (picture.width - sw) / 2, (picture.height - sh) / 2, sw, sh, x, y, w, h);
    };
    const render = (now: number) => {
      const p = cap((now - start) / durations[kind]);
      const opacity = between(p, 0, .36) * (1 - between(p, .66, 1));
      ctx.clearRect(0, 0, width, height); ctx.globalAlpha = 1;
      if (kind === 'book' || kind === 'return') {
        // A curved, inked folio passes across the lens and releases its paper dust.
        const travel = ease(p);
        ctx.save(); if (kind === 'return') { ctx.translate(width, 0); ctx.scale(-1, 1); }
        const x = width * (1.2 - 3.65 * travel), sheet = width * 2.25;
        ctx.beginPath(); ctx.moveTo(x + width * .13, -30);
        ctx.bezierCurveTo(x - width * .12, height * .35, x + width * .18, height * .72, x, height + 30);
        ctx.lineTo(x + sheet, height + 30); ctx.lineTo(x + sheet, -30); ctx.closePath();
        ctx.shadowColor = '#000b'; ctx.shadowBlur = 55; ctx.fillStyle = '#27231b'; ctx.fill(); ctx.shadowBlur = 0; ctx.clip();
        const vellum = ctx.createLinearGradient(x, 0, x + sheet, 0);
        vellum.addColorStop(0, '#655844'); vellum.addColorStop(.09, '#afa083'); vellum.addColorStop(.18, '#b2a187'); vellum.addColorStop(.38, '#918269'); vellum.addColorStop(1, '#262218');
        ctx.fillStyle = vellum; ctx.fillRect(x - width * .2, 0, sheet * 1.2, height);
        for (let i = 0; i < 900; i++) {
          ctx.fillStyle = i % 3 ? '#0d100c17' : '#f0dbaa12';
          ctx.fillRect(x + noise(i) * sheet, noise(i + 2200) * height, .7 + noise(i + 10), .6);
        }
        const cx = x + sheet * .44, cy = height * .47, r = Math.min(width * .26, height * .29);
        if (picture.complete && picture.naturalWidth) {
          ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .78;
          const ph = height * 1.12, pw = ph * picture.width / picture.height;
          ctx.drawImage(picture, cx - pw / 2, -height * .06, pw, ph); ctx.restore();
        }
        ctx.strokeStyle = '#251f1860'; ctx.lineWidth = 1;
        for (const scale of [.83, 1, 1.03]) { ctx.beginPath(); ctx.ellipse(cx, cy, r * scale, r * scale, -.2, 0, Math.PI * 2); ctx.stroke(); }
        ctx.beginPath(); ctx.ellipse(cx, cy, r, r * .35, -.5, 0, Math.PI * 2); ctx.stroke();
        for (let i = 0; i < 45; i++) {
          const a = i * 2.39996, distance = Math.sqrt(noise(i + 303)) * r * .76;
          ctx.fillStyle = '#32271a'; ctx.fillRect(cx + Math.cos(a) * distance, cy + Math.sin(a) * distance, 1.5, 1.5);
        }
        ctx.restore();
        if (p > .58) {
          const release = between(p, .58, 1);
          for (let i = 0; i < 180; i++) {
            ctx.globalAlpha = (1 - release) * .6; ctx.fillStyle = '#c8ad79';
            ctx.fillRect(width * (.1 + noise(i) * .85), height * (noise(i + 700) + release * .17), .8, .8);
          }
        }
      } else if (kind === 'sand' || kind === 'wind') {
        ctx.globalAlpha = opacity; ctx.fillStyle = kind === 'sand' ? '#141512' : '#10151c'; ctx.fillRect(0, 0, width, height);
        const grow = between(p, .3, .87);
        const w = kind === 'wind' ? width * (.45 + grow * .68) : Math.min(width * .7, 640) * (.86 + grow * .14);
        const h = kind === 'wind' ? height * (.45 + grow * .68) : w * .64;
        ctx.save(); ctx.translate(width * .5, height * .47); ctx.rotate((1 - grow) * -.045);
        ctx.globalAlpha = opacity * between(p, .18, .46);
        ctx.shadowColor = '#0008'; ctx.shadowBlur = 45; ctx.fillStyle = '#b9aa8e';
        ctx.fillRect(-w / 2 - 7, -h / 2 - 7, w + 14, h + 14); ctx.shadowBlur = 0;
        ctx.globalAlpha *= between(p, .25, .6); paintPicture(-w / 2, -h / 2, w, h);
        ctx.restore();
        const gather = between(p, .02, .54), scatter = between(p, .62, 1);
        for (let i = 0; i < 700; i++) {
          const side = i % 4, f = noise(i + 11);
          const tx = width * .5 + (side < 2 ? (f - .5) * w : (side === 2 ? -w / 2 : w / 2));
          const ty = height * .47 + (side < 2 ? (side ? h / 2 : -h / 2) : (f - .5) * h);
          const x = noise(i + 89) * width * (1 - gather) + tx * gather + Math.sin(i * 1.3) * scatter * width * .3;
          const y = noise(i + 188) * height * (1 - gather) + ty * gather - scatter * height * .3;
          ctx.globalAlpha = Math.sin(p * Math.PI) * (.2 + noise(i) * .6) * (1 - scatter); ctx.fillStyle = i % 5 ? '#c5ad7c' : '#e4d4ad';
          const size = 1 + noise(i + 1); ctx.fillRect(x, y, size, size);
        }
      } else {
        ctx.globalAlpha = opacity; ctx.fillStyle = '#09111e'; ctx.fillRect(0, 0, width, height);
        const fall = between(p, .04, .65), light = between(p, .44, .7);
        const sx = width * (.7 - fall * .2), sy = height * (.17 + fall * fall * .38);
        for (let i = 0; i < 64; i++) {
          ctx.globalAlpha = opacity * (1 - light) * (.15 + noise(i) * .65); ctx.fillStyle = '#e7d7b2';
          ctx.fillRect(noise(i) * width, noise(i + 200) * height * .8, 1.2, 1.2);
        }
        ctx.globalAlpha = opacity * (1 - light); ctx.strokeStyle = '#e1c79188'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(width * .7, height * .17); ctx.quadraticCurveTo(width * .54, height * .2, sx, sy); ctx.stroke();
        ctx.globalAlpha = opacity;
        const radius = 35 + light * Math.min(width * .37, 290);
        const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
        glow.addColorStop(0, '#ffc97665'); glow.addColorStop(.13, '#db922124'); glow.addColorStop(1, '#b0711800');
        ctx.fillStyle = glow; ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);
        ctx.save(); ctx.translate(sx, sy); ctx.fillStyle = '#fff0c0'; ctx.beginPath();
        const tip = 7 + light * 19; ctx.moveTo(0, -tip);
        ctx.bezierCurveTo(-3 - light * 3, -3, -8, 8, 0, 10); ctx.bezierCurveTo(8, 8, 4, -2, 0, -tip); ctx.fill(); ctx.restore();
      }
      ctx.globalAlpha = 1;
      if (p < 1) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, [kind, reducedMotion, photo]);
  return <div className={`chapter-transition transition-${kind}`} style={{ '--bridge-duration': `${durations[kind]}ms` } as CSSProperties} aria-hidden="true"><canvas ref={canvas}/>{lines[kind] && <p className="transition-whisper">{lines[kind]}</p>}</div>;
}

