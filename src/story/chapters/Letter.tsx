import { useEffect, useRef, useState } from "react";
import { DuetSequence } from "./DuetSequence";
import type { StoryLetter } from "../../content/storyTypes";
import { enforceMediaMute, registerMediaAudio } from "../../cinematic/mediaAudio";
import { assetUrl } from "../../utils/assetUrl";
export function Letter({
  data,
  name,
  open,
  onOpen,
  onNext,
  onNoteOn,
  onNoteOff,
}: {
  /** 按下 / 松开独立；琴音立即发声，不等动画。 */
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  data: StoryLetter;
  name: string;
  open: boolean;
  onOpen: () => void;
  onNext: () => void;
}) {
  const [danceFinished, setDanceFinished] = useState(false);
  const reading = useRef<HTMLDivElement>(null);
  const envelope = useRef<HTMLButtonElement>(null);
  const recording = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    const element = recording.current;
    if (!element) return;
    const unregister = registerMediaAudio(element, true);
    const pause = () => { if (document.hidden) element.pause(); };
    document.addEventListener("visibilitychange", pause);
    return () => { element.pause(); unregister(); document.removeEventListener("visibilitychange", pause); };
  }, [open, data.recording]);
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
            <span className="kicker">暮色、灯光，还有你</span>
            <h2 tabIndex={-1}>
              先和你<em>跳一支舞</em>
            </h2>
            <p>按住琴键就能弹；弹上几个音，他会起身邀她。</p>
          </div>
          <DuetSequence
            onNoteOn={onNoteOn}
            onNoteOff={onNoteOff}
            onSettled={() => setDanceFinished(true)}
            onSkip={openLetter}
          />
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
              {data.recording?.trim() && <div className="letter-recording" data-navigation-lock>
                <p>听听这封信</p>
                <audio ref={recording} controls preload="none" src={assetUrl(data.recording)} onVolumeChange={event => enforceMediaMute(event.currentTarget)} aria-label="信件真人录音" />
              </div>}
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
