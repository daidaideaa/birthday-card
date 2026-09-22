import { useEffect, useRef } from "react";
import type { ChapterId } from "../content/storyTypes";
import type { SceneCue } from "../pet/PetCompanion";

/** 角色与环境共用交互时刻：魔法扩散、琴音上升、吼声起风、许愿星雨。 */
export function CinematicAtmosphere({
  chapter,
  cue,
}: {
  chapter: ChapterId;
  cue: SceneCue;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    signal = useRef({ cue, time: 0 }),
    current = useRef(chapter);
  current.current = chapter;
  useEffect(() => {
    signal.current = { cue, time: performance.now() };
  }, [cue]);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext("2d");
    if (!ctx) return;
    let w = 0,
      h = 0,
      frame = 0,
      last = 0,
      time = 0;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const count = innerWidth < 700 ? 40 : 75;
    const stars = Array.from({ length: count }, (_, i) => ({
      x: (i * 0.618034) % 1,
      y: (i * 0.38197) % 1,
      depth: 0.3 + (i % 7) / 8,
      size: 0.7 + (i % 3) * 0.65,
      phase: i * 2.39996,
    }));
    const resize = () => {
      w = element.clientWidth;
      h = element.clientHeight;
      const d = Math.min(devicePixelRatio, 1.5);
      element.width = w * d;
      element.height = h * d;
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const draw = (now: number) => {
      if (document.hidden || media.matches) {
        frame = 0;
        ctx.clearRect(0, 0, w, h);
        return;
      }
      frame = requestAnimationFrame(draw);
      if (last && now - last < 32) return;
      time += last ? Math.min((now - last) / 1000, 0.08) : 0;
      last = now;
      ctx.clearRect(0, 0, w, h);
      const age = (now - signal.current.time) / 1000,
        kind = signal.current.cue.kind,
        pulse = Math.max(0, 1 - age / 3);
      const city = current.current === "letter";
      const savanna = current.current === "finalWish";
      const album = current.current === "moments";
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if ((city || album) && i % 2) continue;
        let x =
            (s.x * w + Math.sin(time * 0.11 + s.phase) * 22 * s.depth + w) % w,
          y = (s.y * h - time * (3 + s.depth * 7) + h * 100) % h;
        let alpha = 0.15 + Math.sin(time * 0.7 + s.phase) ** 2 * 0.35;
        if (city) {
          // 城市灯光停在远处，不让满屏漂浮的魔法粒子穿过书信。
          x = s.x * w;
          y = h * (0.65 + s.y * 0.29);
          alpha *= 0.55;
        } else if (savanna) {
          x = (s.x * w + time * (2 + s.depth * 5)) % w;
          y = s.y * h;
          alpha *= 0.75;
        } else if (album) alpha *= 0.35;
        if (savanna && kind === "roar" && pulse) {
          x = (x + age * 220 * s.depth) % w;
          y += Math.sin(age * 3 + s.phase) * pulse * 14;
        }
        if (city && kind === "piano" && pulse) alpha += pulse * 0.14;
        if (
          ((current.current === "birthday" && kind === "magic") ||
            (savanna && kind === "wish")) &&
          pulse &&
          i < 32
        ) {
          const a = s.phase,
            r = age * (60 + s.depth * 100);
          x =
            w * (current.current === "birthday" ? 0.68 : 0.5) + Math.cos(a) * r;
          y =
            h * 0.49 +
            Math.sin(a) * r * 0.7 +
            age * age * (kind === "wish" ? 13 : 0);
          alpha = Math.min(0.85, pulse);
        }
        ctx.globalAlpha = alpha;
        ctx.fillStyle = city
          ? i % 4
            ? "#ead9ff"
            : "#ffd49c"
          : savanna && s.y < 0.4
            ? "#eee4da"
            : "#ffe2a8";
        ctx.shadowColor = city ? "#bba5dc" : "#f4c676";
        ctx.shadowBlur = i % 4 === 0 ? 9 : 0;
        ctx.beginPath();
        ctx.arc(x, y, s.size * (1 + pulse * 0.2), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (media.matches) ctx.clearRect(0, 0, w, h);
      else if (!document.hidden) frame = requestAnimationFrame(draw);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();
    resume();
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
    };
  }, []);
  return (
    <canvas ref={canvas} className="cinema-atmosphere" aria-hidden="true" />
  );
}
