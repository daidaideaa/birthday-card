import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { assetUrl } from "../utils/assetUrl";
import { reducedMotion } from "../utils/device";

/** 逐帧姿态只在场景可见、没有减少动态效果偏好时运行。 */
export function AnimatedAtlas({
  src,
  columns,
  rows,
  frames,
  fps = 10,
  playing = true,
  className = "",
}: {
  src: string;
  columns: number;
  rows: number;
  frames: number[];
  fps?: number;
  playing?: boolean;
  className?: string;
}) {
  const [index, setIndex] = useState(0),
    host = useRef<HTMLSpanElement>(null);
  const sequence = frames.join(",");
  useEffect(() => {
    setIndex(0);
    if (!playing) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true,
      last = 0,
      frame = 0;
    const animate = (now: number) => {
      if (document.hidden || media.matches || !visible) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(animate);
      if (now - last >= 1000 / fps) {
        setIndex((i) => i + 1);
        last = now;
      }
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      last = 0;
      if (!document.hidden && !media.matches && visible)
        frame = requestAnimationFrame(animate);
    };
    const observer = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      resume();
    });
    if (host.current) observer.observe(host.current);
    document.addEventListener("visibilitychange", resume);
    media.addEventListener("change", resume);
    resume();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      media.removeEventListener("change", resume);
    };
  }, [playing, sequence, fps]);
  const n = frames[(playing && !reducedMotion() ? index : 0) % frames.length];
  return (
    <span
      ref={host}
      className={"animated-atlas " + className}
      aria-hidden="true"
      style={
        {
          backgroundImage: `url("${assetUrl(src)}")`,
          backgroundSize: `${columns * 100}% ${rows * 100}%`,
          backgroundPosition: `${((n % columns) / (columns - 1)) * 100}% ${(Math.floor(n / columns) / (rows - 1)) * 100}%`,
        } as CSSProperties
      }
    />
  );
}
