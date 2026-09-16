import { useEffect, useRef, useState } from "react";
import type { StoryStat } from "../../content/storyTypes";
import { reducedMotion } from "../../utils/device";
function Count({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  const element = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (reducedMotion()) return;
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const animate = (now: number) => {
        const t = Math.min(1, (now - start) / 750);
        setShown(value * (1 - (1 - t) ** 3));
        if (t < 1) frame = requestAnimationFrame(animate);
      };
      frame = requestAnimationFrame(animate);
    });
    if (element.current) observer.observe(element.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);
  return (
    <span ref={element} aria-label={String(value)}>
      <span aria-hidden="true">
        {new Intl.NumberFormat("en", {
          maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
        }).format(shown)}
      </span>
    </span>
  );
}
export function Numbers({ data }: { data: StoryStat[] }) {
  return (
    <article>
      <span className="chapter-kicker">BY THE NUMBERS</span>
      <h2 tabIndex={-1}>A few things that add up.</h2>
      <dl className="story-numbers">
        {data.map((stat, index) => (
          <div key={index}>
            <dt>{stat.label}</dt>
            <dd>
              {Number.isFinite(stat.value) ? (
                <Count value={stat.value!} />
              ) : (
                stat.text
              )}
            </dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
