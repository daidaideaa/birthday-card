import { useEffect, useRef, useState } from "react";
import { PianoDance } from "../../scene/CinemaVignettes";
import type { StoryLetter } from "../../content/storyTypes";
export function Letter({
  data,
  name,
  open,
  onOpen,
  onNext,
  onPiano,
}: {
  onPiano: (note?: number) => void;
  data: StoryLetter;
  name: string;
  open: boolean;
  onOpen: () => void;
  onNext: () => void;
}) {
  const [danceFinished, setDanceFinished] = useState(false);
  const reading = useRef<HTMLDivElement>(null);
  const envelope = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!danceFinished || open) return;
    const frame = requestAnimationFrame(() => {
      envelope.current?.focus({ preventScroll: true });
      reading.current?.scrollIntoView({
        block: "start",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [danceFinished, open]);
  const openLetter = () => {
    onOpen();
    requestAnimationFrame(() => {
      reading.current?.focus({ preventScroll: true });
      reading.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  };
  return (
    <article
      className={
        "letter-chapter letter-sequence " + (open ? "letter-open" : "")
      }
    >
      {!open && (
        <>
          <div className="dance-introduction">
            <span className="chapter-kicker">暮色、灯光，还有你</span>
            <h2 tabIndex={-1}>
              先和你<em>跳一支舞</em>
            </h2>
            <p>把这一刻留给音乐，心意藏在下一封信里。</p>
          </div>
          <PianoDance
            onPlay={onPiano}
            onComplete={() => setDanceFinished(true)}
          />
          {!danceFinished && (
            <button className="text-button letter-skip" onClick={openLetter}>
              想先看看写给你的话 →
            </button>
          )}
        </>
      )}
      {(open || danceFinished) && (
        <div className="letter-copy" ref={reading} tabIndex={-1}>
          <span className="chapter-kicker">有些话，想慢慢说给你听</span>
          <h2 tabIndex={-1}>
            一封小小的<em>心意</em>
          </h2>
          {!open ? (
            <div className="envelope-scene">
              <button
                ref={envelope}
                className="letter-envelope"
                onClick={openLetter}
                aria-label={"打开给" + name + "的信"}
              >
                <span className="envelope-flap" />
                <span className="envelope-seal" aria-hidden="true">
                  {name.slice(0, 1)}
                </span>
                <span className="envelope-address">{name} 亲启</span>
                <span className="envelope-postmark">愿你 · 每天开心</span>
              </button>
              <button className="chapter-action" onClick={openLetter}>
                拆开这封信 <span>↗</span>
              </button>
            </div>
          ) : (
            <div className="letter-paper">
              {data.greeting && (
                <p className="letter-greeting">{data.greeting}</p>
              )}
              {data.paragraphs.map((p, i) => (
                <p className="letter-paragraph" key={i}>
                  {p}
                </p>
              ))}
              {data.ending && <p className="letter-ending">{data.ending}</p>}
              {data.signature && (
                <p className="letter-signature">{data.signature}</p>
              )}
              <button className="chapter-action" onClick={onNext}>
                最后，一起许个愿 <span>→</span>
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
