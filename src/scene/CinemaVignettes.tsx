import { useEffect, useRef, useState } from "react";
import { AnimatedAtlas } from "./AnimatedAtlas";
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

export function PianoDance({ onPlay }: { onPlay: (note?: number) => void }) {
  const [dancing, setDancing] = useState(false),
    [pressed, setPressed] = useState<number | null>(null),
    [beat, setBeat] = useState(0);
  const timers = useRef<number[]>([]);
  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
    },
    [],
  );
  const play = (note?: number) => {
    clear();
    setDancing(true);
    const notes =
      note === undefined ? [60, 64, 67, 71, 69, 67, 64, 62, 60] : [note];
    notes.forEach((midi, i) => {
      const strike = () => {
        onPlay(midi);
        setPressed(midi);
        setBeat((b) => b + 1);
      };
      if (i === 0) strike();
      else timers.current.push(window.setTimeout(strike, i * 470));
    });
    timers.current.push(
      window.setTimeout(() => setPressed(null), notes.length * 470),
    );
    timers.current.push(
      window.setTimeout(() => setDancing(false), notes.length * 470 + 800),
    );
  };
  return (
    <aside
      className={"piano-nook cinema-piano " + (dancing ? "is-dancing" : "")}
      aria-label="暮色中的双人舞与钢琴"
    >
      <div className="piano-night">
        <div className="night-perspective" />
        <div className="night-lamplight" key={beat} />
        <div className="dance-floor-shadow" />
        <AnimatedAtlas
          src="images/dance-atlas.webp"
          columns={4}
          rows={2}
          frames={dancing ? [0, 1, 2, 3, 4, 5, 6, 7] : [0]}
          fps={4.26}
          playing={dancing}
          className="film-dancers"
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
        <span className="night-caption">今晚，星光也为你伴奏。</span>
      </div>
      <div className="piano-console" data-navigation-lock>
        <div className="piano-console-label">
          <span>一首，送给你的夜曲</span>
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
          {dancing ? "♫ 再弹一次，让舞步继续" : "♫ 点亮夜色，弹一段小夜曲"}
        </button>
      </div>
    </aside>
  );
}

export function SavannaLife({
  onRoar,
  celebrating = false,
}: {
  onRoar: () => void;
  celebrating?: boolean;
}) {
  const [action, setAction] = useState<"run" | "idle" | "roar">(
    reducedMotion() ? "idle" : "run",
  );
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    timer.current = window.setTimeout(() => setAction("idle"), 3600);
    return () => clearTimeout(timer.current);
  }, []);
  const roar = () => {
    clearTimeout(timer.current);
    setAction("roar");
    onRoar();
    timer.current = window.setTimeout(() => setAction("idle"), 1600);
  };
  return (
    <div
      className={
        "savanna-life cinema-savanna lion-" +
        action +
        (celebrating ? " lion-celebrates" : "")
      }
    >
      <div className="savanna-grass" aria-hidden="true">
        {Array.from({ length: 17 }, (_, i) => (
          <i
            key={i}
            style={{
              left: i * 6 + "%",
              height: 30 + ((i * 17) % 60) + "px",
              animationDelay: -i * 0.31 + "s",
            }}
          />
        ))}
      </div>
      <div className="lion-stage">
        <div className="lion-contact-shadow" />
        <button
          className="lion-character"
          onClick={roar}
          disabled={action === "roar"}
          aria-label="让狮子仰头吼叫，为生日送上勇气"
        >
          <AnimatedAtlas
            src="images/lion-atlas.webp"
            columns={4}
            rows={3}
            frames={
              action === "run"
                ? [0, 1, 2, 3, 4, 5, 6, 7]
                : action === "roar"
                  ? [9, 10, 10, 11]
                  : [8]
            }
            fps={action === "roar" ? 2.5 : 12}
            playing={action !== "idle"}
            className="film-lion"
          />
        </button>
        <div className="lion-dust" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <i key={i} style={{ animationDelay: i * 0.13 + "s" }} />
          ))}
        </div>
      </div>
      <div className="lion-controls">
        <button onClick={roar} disabled={action === "roar"}>
          {action === "roar" ? "把勇气，送给你。" : "听一声，勇敢的祝福"}
        </button>
        <button
          onClick={() => {
            clearTimeout(timer.current);
            setAction("run");
            timer.current = window.setTimeout(() => setAction("idle"), 3600);
          }}
          disabled={action === "run"}
        >
          再跑一圈 ↗
        </button>
      </div>
    </div>
  );
}
