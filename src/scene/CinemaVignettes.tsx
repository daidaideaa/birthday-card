import { useCallback, useEffect, useRef, useState } from "react";
import { JazzStage } from "./JazzStage";
import { PrideRockScene } from "./PrideRockScene";
import { reducedMotion } from "../utils/device";

export function MagicWand({
  onCast,
  active,
}: {
  onCast: () => void;
  active: boolean;
}) {
  const [casting, setCasting] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={"wand-scene " + (casting || active ? "wand-lit" : "")}>
      <svg className="wand-trail" viewBox="0 0 500 300" aria-hidden="true">
        <path d="M60 260 C120 80 350 290 410 115 S310 20 245 105" />
        <circle cx="245" cy="105" r="4" />
      </svg>
      <button
        className="magic-wand"
        aria-label="挥动魔杖，点亮贺卡"
        onClick={() => {
          setCasting(true);
          onCast();
          clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCasting(false), 2200);
        }}
      >
        <span className="wand-stick" />
        <span className="wand-tip" />
        <span className="wand-label">挥一下，施个小魔法</span>
      </button>
    </div>
  );
}

export function PianoDance({
  onPlay,
  onComplete,
}: {
  onPlay: (note?: number) => void;
  onComplete?: () => void;
}) {
  const [dancing, setDancing] = useState(false),
    [pressed, setPressed] = useState<number | null>(null),
    [beat, setBeat] = useState(0),
    [performance, setPerformance] = useState(0);
  const timers = useRef<number[]>([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const finish = () => {
    clear();
    setDancing(false);
    setPressed(null);
    onComplete?.();
  };
  useEffect(() => {
    const pause = () => {
      if (!document.hidden) return;
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setDancing(false);
      setPressed(null);
    };
    document.addEventListener("visibilitychange", pause);
    return () => {
      timers.current.forEach(clearTimeout);
      document.removeEventListener("visibilitychange", pause);
    };
  }, []);
  const play = (note?: number) => {
    clear();
    setDancing(true);
    if (note === undefined || !dancing) setPerformance((value) => value + 1);
    const notes =
      note === undefined
        ? [
            60, 64, 67, 71, 69, 67, 64, 62, 60, 64, 67, 72, 71, 67, 64, 60, 62,
            65, 69, 72, 71, 67, 64, 60,
          ]
        : [note];
    notes.forEach((midi, i) => {
      const strike = () => {
        onPlay(midi);
        setPressed(midi);
        setBeat((b) => b + 1);
      };
      if (i === 0) strike();
      else timers.current.push(window.setTimeout(strike, i * 500));
    });
    timers.current.push(
      window.setTimeout(() => setPressed(null), notes.length * 500),
    );
    timers.current.push(
      window.setTimeout(finish, note === undefined ? 12300 : 12000),
    );
  };
  return (
    <aside
      className={"piano-nook cinema-piano " + (dancing ? "is-dancing" : "")}
      aria-label="暮色中的双人舞与钢琴"
    >
      <div className="piano-night">
        <div className="night-lamplight" key={beat} />
        <JazzStage
          dancing={dancing}
          note={pressed}
          beat={beat}
          performance={performance}
          onFinished={finish}
        />
        <div className="night-petals" aria-hidden="true">
          {Array.from({ length: 10 }, (_, i) => (
            <i
              key={i}
              style={{
                left: 10 + i * 8 + "%",
                animationDelay: -i * 1.8 + "s",
                animationDuration: 12 + (i % 3) * 3 + "s",
              }}
            />
          ))}
        </div>
        <span className="night-caption">暮色里，和你跳一支舞。</span>
      </div>
      <div className="piano-console" data-navigation-lock>
        <div className="piano-console-label">
          <span>山顶的夜曲 · 送给你</span>
          <span aria-hidden="true">♫</span>
        </div>
        <div className="piano-keys" aria-label="可弹奏的钢琴">
          {[60, 62, 64, 65, 67, 69, 71, 72].map((note, i) => (
            <button
              key={note}
              className={pressed === note ? "pressed" : ""}
              onClick={() => play(note)}
              aria-label={
                "弹奏" + ["哆", "来", "咪", "发", "嗦", "拉", "西", "高音哆"][i]
              }
            >
              <span>{["C", "D", "E", "F", "G", "A", "B", "C"][i]}</span>
            </button>
          ))}
          {[0, 1, 3, 4, 5].map((i) => (
            <span
              className="black-key"
              key={i}
              style={{ left: (i + 1) * 12.5 - 3.4 + "%" }}
              aria-hidden="true"
            />
          ))}
        </div>
        <button className="piano-play" onClick={() => play()}>
          {dancing ? "♫ 从头再跳一支舞" : "♫ 开始我们的双人舞"}
        </button>
      </div>
    </aside>
  );
}

type LionPhase = "dawn" | "stars" | "return";
const lionCaptions: Record<LionPhase, { title: string; body: string }> = {
  dawn: {
    title: "荣耀石上的清晨",
    body: "木法沙与小辛巴并肩，望向阳光照耀的荣耀国。",
  },
  stars: {
    title: "记住，你是谁。",
    body: "长大的路上，父亲的爱与叮嘱，依然留在星空里。",
  },
  return: {
    title: "带着勇气，重新出发。",
    body: "成年辛巴重返荣耀石。师宝宝，愿你也一直勇敢、一直被爱。",
  },
};

/** A compact montage of the film's father–son legacy and Simba's return. */
export function SavannaLife({
  onRoar,
  celebrating = false,
}: {
  onRoar: () => void;
  celebrating?: boolean;
}) {
  const [phase, setPhase] = useState<LionPhase>("dawn");
  const [action, setAction] = useState<"walk" | "idle" | "roar">("idle");
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [serial, setSerial] = useState(0);
  const [roarSerial, setRoarSerial] = useState(0);
  const section = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  const cancelMontage = useRef<() => void>(() => {});
  const onRoarRef = useRef(onRoar);
  onRoarRef.current = onRoar;
  const clear = useCallback(() => {
    cancelMontage.current();
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => {
    if (!ready) return;
    clear();
    setPhase("dawn");
    setAction(reducedMotion() ? "idle" : "walk");
    setPlaying(!reducedMotion());
    if (reducedMotion()) return clear;
    const events: Array<{ at: number; run: () => void }> = [];
    const after = (delay: number, run: () => void) => events.push({ at: delay, run });
    after(3400, () => setAction("idle"));
    after(6500, () => setPhase("stars"));
    after(11000, () => {
      setPhase("return");
      setAction("walk");
    });
    after(14400, () => {
      setAction("roar");
      setRoarSerial((value) => value + 1);
      onRoarRef.current();
    });
    after(17700, () => {
      setAction("idle");
      setPlaying(false);
    });
    let frame = 0, previous = 0, elapsed = 0, next = 0;
    let visible = true, disposed = false;
    const tick = (now: number) => {
      frame = 0;
      if (disposed || document.hidden || !visible) return;
      if (previous) elapsed += Math.min(now - previous, 100);
      previous = now;
      while (next < events.length && elapsed >= events[next].at) events[next++].run();
      if (next < events.length) frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      previous = 0;
      if (!disposed && !document.hidden && visible && next < events.length)
        frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      resume();
    });
    if (section.current) observer.observe(section.current);
    document.addEventListener("visibilitychange", resume);
    cancelMontage.current = () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
    };
    resume();
    return clear;
  }, [ready, serial, clear]);
  useEffect(() => clear, [clear]);
  const caption = lionCaptions[phase];
  const roar = () => {
    clear();
    setPlaying(false);
    setPhase("return");
    setAction("roar");
    setRoarSerial((value) => value + 1);
    onRoar();
    timers.current.push(window.setTimeout(() => setAction("idle"), 3300));
  };
  return (
    <section
      ref={section}
      className={`pride-story phase-${phase}${celebrating ? " pride-celebrates" : ""}`}
      aria-label="狮子王：父子时光、星空记忆与辛巴归来"
      data-navigation-lock
    >
      <div className="pride-story-heading">
        <span className="pride-eyebrow">狮子王 · 生命与勇气</span>
        <span className="pride-story-progress" aria-hidden="true">
          {["dawn", "stars", "return"].map((part) => (
            <i key={part} className={phase === part ? "active" : ""} />
          ))}
        </span>
      </div>
      <PrideRockScene
        phase={phase}
        action={action}
        celebrating={celebrating}
        onReady={() => setReady(true)}
        roarSerial={roarSerial}
      />
      <div className="pride-caption" aria-live="polite" aria-atomic="true">
        <h3>{caption.title}</h3>
        <p>{caption.body}</p>
      </div>
      <div className="pride-controls">
        <button
          onClick={() => {
            if (reducedMotion()) {
              setPhase(phase === "dawn" ? "stars" : phase === "stars" ? "return" : "dawn");
            } else {
              setSerial((value) => value + 1);
            }
          }}
          disabled={!ready}
        >
          {reducedMotion() ? "看下一个画面 →" : playing ? "从清晨再看一次" : "重温这段时光 ↺"}
        </button>
        <button onClick={roar} disabled={!ready || action === "roar"}>
          {action === "roar" ? "这一声，献给勇敢的你" : "听辛巴的吼声"}
        </button>
      </div>
    </section>
  );
}
