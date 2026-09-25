import { useEffect, useRef, useState } from "react";
import { CinematicFilm } from "../cinematic/CinematicFilm";
import type { CinematicFilmHandle } from "../cinematic/CinematicFilm";
import { lionPhaseAt } from "../cinematic/media";
import type { LionPhase } from "../cinematic/media";
import { reducedMotion } from "../utils/device";

export function MagicWand({ onCast, active }: { onCast: () => void; active: boolean }) {
  const [casting, setCasting] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <div className={"wand-scene " + (casting || active ? "wand-lit" : "")}>
      <svg className="wand-trail" viewBox="0 0 500 300" aria-hidden="true">
        <path d="M60 260 C120 80 350 290 410 115 S310 20 245 105" />
        <circle cx="245" cy="105" r="4" />
      </svg>
      <button className="magic-wand" aria-label="挥动魔杖，点亮贺卡" onClick={() => {
        setCasting(true);
        onCast();
        clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCasting(false), 2200);
      }}>
        <span className="wand-stick" /><span className="wand-tip" />
        <span className="wand-label">挥一下，施个小魔法</span>
      </button>
    </div>
  );
}

export function PianoDance({ onPlay, onComplete }: {
  onPlay: (note?: number) => void;
  onComplete?: () => void;
}) {
  const [dancing, setDancing] = useState(false);
  const [pressed, setPressed] = useState<number | null>(null);
  const [beat, setBeat] = useState(0);
  const film = useRef<CinematicFilmHandle>(null);
  const release = useRef<number | undefined>(undefined);
  useEffect(() => () => clearTimeout(release.current), []);
  const playNote = (note: number) => {
    onPlay(note);
    setPressed(note);
    setBeat((value) => value + 1);
    clearTimeout(release.current);
    release.current = window.setTimeout(() => setPressed(null), 320);
  };
  return (
    <aside className={"piano-nook cinema-piano film-piano " + (dancing ? "is-dancing" : "")}
      aria-label="暮色中的双人舞与钢琴">
      <div className="piano-night">
        <CinematicFilm ref={film} id="duet" onPlayingChange={setDancing} onComplete={onComplete} />
        <div className="film-note-light" key={beat} data-lit={pressed !== null} aria-hidden="true" />
        <span className="night-caption">暮色里，和你跳一支舞。</span>
      </div>
      <div className="piano-console" data-navigation-lock>
        <div className="piano-console-label"><span>山顶的夜曲 · 送给你</span><span aria-hidden="true">♫</span></div>
        <div className="piano-keys" aria-label="可弹奏的钢琴">
          {[60, 62, 64, 65, 67, 69, 71, 72].map((note, i) => (
            <button key={note} className={pressed === note ? "pressed" : ""} onClick={() => playNote(note)}
              aria-label={"弹奏" + ["哆", "来", "咪", "发", "嗦", "拉", "西", "高音哆"][i]}>
              <span>{["C", "D", "E", "F", "G", "A", "B", "C"][i]}</span>
            </button>
          ))}
          {[0, 1, 3, 4, 5].map((i) => <span className="black-key" key={i} style={{ left: (i + 1) * 12.5 - 3.4 + "%" }} aria-hidden="true" />)}
        </div>
        <button className="piano-play" onClick={() => film.current?.play({ restart: true })}>
          {dancing ? "♫ 从头再跳一支舞" : "♫ 开始我们的双人舞"}
        </button>
      </div>
    </aside>
  );
}

const lionCaptions: Record<LionPhase, { title: string; body: string }> = {
  dawn: { title: "荣耀石上的清晨", body: "木法沙与小辛巴并肩，望向阳光照耀的荣耀国。" },
  stars: { title: "记住，你是谁。", body: "长大的路上，父亲的爱与叮嘱，依然留在星空里。" },
  return: { title: "带着勇气，重新出发。", body: "成年辛巴重返荣耀石。师宝宝，愿你也一直勇敢、一直被爱。" },
};

export function SavannaLife({ onRoar, celebrating = false, onComplete, onPlaybackStart }: {
  onRoar: () => void;
  celebrating?: boolean;
  onComplete?: () => void;
  onPlaybackStart?: () => void;
}) {
  const [phase, setPhase] = useState<LionPhase>("dawn");
  const [playing, setPlaying] = useState(false);
  const film = useRef<CinematicFilmHandle>(null);
  const caption = lionCaptions[phase];
  const nextFrame = () => {
    const next = phase === "dawn" ? 8 : phase === "stars" ? 14.5 : 0;
    film.current?.showFrame(next);
  };
  const roar = () => {
    if (reducedMotion()) {
      onRoar();
      film.current?.showFrame(15.2);
    } else film.current?.play({ restart: true, time: 14.4 });
  };
  return (
    <section className={`pride-story film-pride phase-${phase}${celebrating ? " pride-celebrates" : ""}`}
      aria-label="狮子王：父子时光、星空记忆与辛巴归来" data-navigation-lock>
      <div className="pride-story-heading">
        <span className="pride-eyebrow">狮子王 · 生命与勇气</span>
        <span className="pride-story-progress" aria-hidden="true">
          {["dawn", "stars", "return"].map((part) => <i key={part} className={phase === part ? "active" : ""} />)}
        </span>
      </div>
      <CinematicFilm ref={film} id="pride" autoPlay onTime={(time) => setPhase(lionPhaseAt(time))}
        onComplete={onComplete} onPlayingChange={(active) => {
          setPlaying(active);
          if (active) onPlaybackStart?.();
        }} />
      <div className="pride-caption" aria-live="polite" aria-atomic="true">
        <h3>{caption.title}</h3><p>{caption.body}</p>
      </div>
      <div className="pride-controls">
        <button onClick={() => reducedMotion() ? nextFrame() : film.current?.play({ restart: true })}>
          {reducedMotion() ? "看下一个画面 →" : playing ? "从清晨再看一次" : "重温这段时光 ↺"}
        </button>
        <button onClick={roar}>听辛巴的吼声</button>
      </div>
    </section>
  );
}
