import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { CinematicDirector } from "../cinematic/CinematicDirector";
import { JAZZ_DURATION, jazzNotes } from "../cinematic/timelines/jazzTimeline";
const JazzStage = lazy(() =>
  import("./JazzStage").then((m) => ({ default: m.JazzStage })),
);
const PrideRockScene = lazy(() =>
  import("./PrideRockScene").then((m) => ({ default: m.PrideRockScene })),
);
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
  const [dancing, setDancing] = useState(false);
  const [pressed, setPressed] = useState<number | null>(null);
  const [beat, setBeat] = useState(0);
  const [ready, setReady] = useState(false);
  const [director] = useState(() => new CinematicDirector(JAZZ_DURATION));
  const root = useRef<HTMLElement>(null);
  const autoNotes = useRef(true);
  const callbacks = useRef({ onPlay, onComplete });
  callbacks.current = { onPlay, onComplete };
  useEffect(() => {
    const host = root.current!;
    jazzNotes.forEach((midi, index) =>
      director.timeline.call(
        () => {
          if (!autoNotes.current) return;
          callbacks.current.onPlay(midi);
          setPressed(midi);
          setBeat((value) => value + 1);
        },
        [],
        index * 0.5 + 0.001,
      ),
    );
    director.timeline.call(
      () => {
        setDancing(false);
        setPressed(null);
        callbacks.current.onComplete?.();
      },
      [],
      JAZZ_DURATION,
    );
    const caption = host.querySelector<HTMLElement>(".night-caption");
    if (caption && !reducedMotion())
      director.timeline.fromTo(
        caption,
        { opacity: 0, y: 4 },
        { opacity: 1, y: 0, duration: 1.1 },
        0.2,
      );
    const detach = director.attach(host);
    const review = (event: Event) => {
      director.pause();
      director.seek((event as CustomEvent<number>).detail);
    };
    if (import.meta.env.DEV || import.meta.env.MODE === "visual-review")
      host.addEventListener("cinema-review-seek", review);
    return () => {
      host.removeEventListener("cinema-review-seek", review);
      detach();
      director.dispose();
    };
  }, [director]);
  const play = (note?: number) => {
    autoNotes.current = note === undefined;
    if (note !== undefined) {
      callbacks.current.onPlay(note);
      setPressed(note);
      setBeat((value) => value + 1);
    }
    setDancing(true);
    director.play(note === undefined || !director.playing);
  };
  return (
    <aside
      ref={root}
      className={"piano-nook cinema-piano " + (dancing ? "is-dancing" : "")}
      aria-label="暮色中的双人舞与钢琴"
    >
      <div className="piano-night">
        <div className="night-lamplight" key={beat} />
        <Suspense fallback={<p role="status">舞台正在点亮…</p>}>
          <JazzStage
            dancing={dancing}
            note={pressed}
            beat={beat}
            director={director}
            onReady={() => setReady(true)}
          />
        </Suspense>
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
              disabled={!ready}
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
        <button className="piano-play" disabled={!ready} onClick={() => play()}>
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
  const cancelMontage = useRef<() => void>(() => {});
  const onRoarRef = useRef(onRoar);
  onRoarRef.current = onRoar;
  const clear = useCallback(() => {
    cancelMontage.current();
  }, []);
  useEffect(() => {
    if (!ready) return;
    clear();
    setPhase("dawn");
    setAction(reducedMotion() ? "idle" : "walk");
    setPlaying(!reducedMotion());
    if (reducedMotion()) return clear;
    const director = new CinematicDirector(17.7);
    const after = (seconds: number, run: () => void) =>
      director.timeline.call(run, [], seconds);
    after(3.4, () => setAction("idle"));
    after(6.5, () => setPhase("stars"));
    after(11, () => {
      setPhase("return");
      setAction("walk");
    });
    after(14.4, () => {
      setAction("roar");
      setRoarSerial((value) => value + 1);
      onRoarRef.current();
    });
    after(17.7, () => {
      setAction("idle");
      setPlaying(false);
    });
    const detach = director.attach(section.current!);
    cancelMontage.current = () => {
      detach();
      director.dispose();
    };
    director.play(true);
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
    const director = new CinematicDirector(3.3);
    director.timeline.call(() => setAction("idle"), [], 3.3);
    const detach = director.attach(section.current!);
    cancelMontage.current = () => {
      detach();
      director.dispose();
    };
    director.play();
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
      <Suspense fallback={<p role="status">晨光正在点亮…</p>}>
        <PrideRockScene
          phase={phase}
          action={action}
          celebrating={celebrating}
          onReady={() => setReady(true)}
          roarSerial={roarSerial}
        />
      </Suspense>
      <div className="pride-caption" aria-live="polite" aria-atomic="true">
        <h3>{caption.title}</h3>
        <p>{caption.body}</p>
      </div>
      <div className="pride-controls">
        <button
          onClick={() => {
            if (reducedMotion()) {
              setPhase(
                phase === "dawn"
                  ? "stars"
                  : phase === "stars"
                    ? "return"
                    : "dawn",
              );
            } else {
              setSerial((value) => value + 1);
            }
          }}
          disabled={!ready}
        >
          {reducedMotion()
            ? "看下一个画面 →"
            : playing
              ? "从清晨再看一次"
              : "重温这段时光 ↺"}
        </button>
        <button onClick={roar} disabled={!ready || action === "roar"}>
          {action === "roar" ? "这一声，献给勇敢的你" : "听辛巴的吼声"}
        </button>
      </div>
    </section>
  );
}
