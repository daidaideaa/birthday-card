import { useEffect, useRef } from 'react';

/** A short optical dissolve: ink closes the old scene while its light carries on. */
export default function ChapterTransition({ kind, reducedMotion }: { kind: string; reducedMotion: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (reducedMotion || !canvas.current) return;
    const element = canvas.current;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    const width = window.innerWidth, height = window.innerHeight;
    const ratio = Math.min(devicePixelRatio, 1.5);
    element.width = width * ratio; element.height = height * ratio;
    ctx.scale(ratio, ratio);
    let frame = 0;
    const start = performance.now();
    const render = (now: number) => {
      const p = Math.min(1, (now - start) / 1800);
      const envelope = Math.pow(Math.sin(p * Math.PI), 1.5);
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';
      // Fine suspended particles follow a page curl, a sand ribbon, wind, or a falling star.
      for (let i = 0; i < 135; i++) {
        const seed = ((i * 137.508) % 100) / 100;
        const travel = p * 1.4 - seed * .4;
        let x = width * travel, y = height * (.52 + Math.sin(travel * 4 + seed * 3) * .15);
        if (kind === 'book' || kind === 'return') {
          x = width * (.75 - p * .55) + Math.sin(seed * Math.PI) * width * .15 * Math.sin(p * Math.PI);
          y = height * (.12 + seed * .78);
        } else if (kind === 'sand') {
          x = width * (.2 + seed * .6) + Math.sin(p * 6 + i) * p * 150;
          y = height * (.55 - p * .35) + Math.cos(seed * 8) * 60;
        } else if (kind === 'star') {
          x = width * (.76 - p * .27) + Math.sin(i * 8) * 45 * (1 - p);
          y = height * (.13 + p * p * .54) - seed * 100 * (1 - p);
        }
        ctx.globalAlpha = envelope * (.16 + seed * .64);
        ctx.fillStyle = i % 4 === 0 ? '#fff5d5' : '#c99b52';
        ctx.beginPath(); ctx.arc(x, y, .5 + seed * 1.7, 0, Math.PI * 2); ctx.fill();
      }
      if (kind === 'book' || kind === 'return') {
        for (let i = 0; i < 4; i++) {
          ctx.globalAlpha = envelope * (.16 - i * .025); ctx.strokeStyle = '#ebd8b2'; ctx.lineWidth = .8;
          const x = width * (.78 - p * .7) + i * 12;
          ctx.beginPath(); ctx.moveTo(x, height * .1);
          ctx.bezierCurveTo(x + width * .25, height * .2, x + width * .15, height * .7, x, height * .9); ctx.stroke();
        }
      }
      if (kind === 'star') {
        const x = width * (.76 - p * .27), y = height * (.13 + p * p * .54);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 70);
        glow.addColorStop(0, '#f6d29170'); glow.addColorStop(1, '#b6803300');
        ctx.globalAlpha = envelope; ctx.fillStyle = glow; ctx.fillRect(x - 70, y - 70, 140, 140);
      }
      if (p < 1) frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [kind, reducedMotion]);
  return <div className={`chapter-transition transition-${kind}`} aria-hidden="true"><div className="transition-ink"/><canvas ref={canvas}/></div>;
}
