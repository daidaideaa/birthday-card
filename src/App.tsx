import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { MagicWand } from "./scene/CinemaVignettes";
import { BirthdayScene } from "./scene/BirthdayScene";
import { AudioController } from "./scene/AudioController";
import type { CardState } from "./scene/CardMotion";
import { useGesture } from "./hooks/useGesture";
import { story } from "./content/story";
import { StoryController } from "./story/StoryController";
import { MemoryBook } from "./story/MemoryBook";
import { PetCompanion, type SceneCue } from "./pet/PetCompanion";
import { CinematicAtmosphere } from "./scene/CinematicAtmosphere";
import { assetUrl } from "./utils/assetUrl";
import { reducedMotion } from "./utils/device";
import "./story/story.css";

export default function App() {
  const [book] = useState(() => new StoryController(story));
  const snapshot = useSyncExternalStore(book.subscribe, book.getSnapshot);
  const inBook = snapshot.index > 0;
  const chapter = book.chapters[snapshot.index].id;
  const pianoAllowed = useRef(false);
  pianoAllowed.current = chapter === "letter" && !snapshot.letterOpen;
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BirthdayScene | null>(null);
  const audio = useRef<AudioController | null>(null);
  const transitionTimer = useRef<number | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<CardState>("CLOSED");
  const [muted, setMuted] = useState(false);
  const [hiddenPreview, setHiddenPreview] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [storyReady, setStoryReady] = useState(false);
  const [entering, setEntering] = useState(false);
  const [credits, setCredits] = useState(false);
  const [cue, setCue] = useState<SceneCue>({ kind: "magic", serial: 0 });
  const emit = (kind: SceneCue["kind"]) =>
    setCue((previous) => ({ kind, serial: previous.serial + 1 }));
  useEffect(() => {
    if (state === "OPENING") emit("magic");
  }, [state]);
  useEffect(() => {
    if (snapshot.finalState === "extinguishing") emit("wish");
  }, [snapshot.finalState]);
  const creditsRef = useRef<HTMLDialogElement>(null);
  const gesture = useGesture((open) => {
    if (!inBook && !entering) scene.current?.setOpen(open);
  }, !inBook && started);

  useEffect(() => {
    scene.current?.setActive(!inBook);
    audio.current?.setVolume(
      chapter === "letter"
        ? snapshot.letterOpen
          ? 0.08
          : 0.28
        : inBook
          ? 0.38
          : 0.7,
    );
  }, [inBook, chapter, snapshot.letterOpen]);
  useEffect(() => {
    setStoryReady(false);
    if (state !== "OPEN" || inBook) return;
    const timer = window.setTimeout(
      () => setStoryReady(true),
      reducedMotion() ? 100 : 650,
    );
    return () => clearTimeout(timer);
  }, [state, inBook]);
  useEffect(() => {
    let disposed = false;
    audio.current = new AudioController();
    audio.current.setVolume(0.7);
    const init = async () => {
      try {
        await document.fonts.load('500 48px "Birthday Serif"').catch(() => []);
        if (disposed || !host.current) return;
        scene.current = new BirthdayScene(
          host.current,
          audio.current!,
          setState,
          () => setSceneError(true),
        );
        setReady(true);
      } catch {
        if (!disposed) setSceneError(true);
      }
    };
    void init();
    return () => {
      disposed = true;
      clearTimeout(transitionTimer.current);
      scene.current?.dispose();
      audio.current?.dispose();
      scene.current = null;
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    if (credits) {
      const previous = document.activeElement as HTMLElement | null;
      creditsRef.current?.showModal();
      return () => {
        previous?.focus();
      };
    }
  }, [credits]);
  const unlock = () => {
    void audio.current
      ?.unlock()
      .then(() => setAudioError(false))
      .catch(() => setAudioError(true));
  };
  const start = (camera: boolean) => {
    unlock();
    setStarted(true);
    if (camera) {
      scene.current?.setOpen(false);
      gesture.start();
    } else {
      gesture.stop();
      scene.current?.setOpen(true);
    }
  };
  const enterBook = () => {
    if (entering) return;
    setEntering(true);
    transitionTimer.current = window.setTimeout(
      () => {
        book.go(1);
        setEntering(false);
      },
      reducedMotion() ? 0 : 900,
    );
  };
  const replay = () =>
    book.replay(() => {
      clearTimeout(transitionTimer.current);
      setEntering(false);
      setStarted(false);
      setStoryReady(false);
      scene.current?.reset();
    });
  const open = state === "OPEN" || state === "OPENING";
  const names = ["生日邀请", "小小美好", "一封心意", "生日愿望"];
  return (
    <main
      data-cinema-cue={cue.kind}
      onPointerMove={(event) => {
        if (reducedMotion() || event.pointerType === "touch") return;
        event.currentTarget.style.setProperty(
          "--view-x",
          `${(event.clientX / innerWidth - 0.5) * 14}px`,
        );
        event.currentTarget.style.setProperty(
          "--view-y",
          `${(event.clientY / innerHeight - 0.5) * 10}px`,
        );
      }}
      className={
        "experience chapter-" +
        chapter +
        (inBook ? " book-experience" : "") +
        (entering ? " entering-book" : "")
      }
    >
      <div className="world-background" aria-hidden="true">
        <img
          className="castle-background"
          src={assetUrl("images/castle-night.webp")}
          alt=""
        />
        <img
          className="savanna-background"
          src={assetUrl("images/savanna-cinema.webp")}
          alt=""
        />
        <img
          className="jazz-background"
          src={assetUrl("images/jazz-night.webp")}
          alt=""
        />
        <div className="world-shade" />
        <div className="world-glow" />
      </div>
      <div className="grain" aria-hidden="true" />
      <CinematicAtmosphere chapter={chapter} cue={cue} />
      <div
        key={cue.serial}
        className={"scene-response cue-" + cue.kind}
        aria-hidden="true"
      />
      {(chapter === "birthday" || chapter === "moments") && (
        <div className="floating-candles" aria-hidden="true">
          {Array.from({ length: 9 }, (_, i) => (
            <i
              key={i}
              style={{
                left: 8 + i * 10.5 + "%",
                top: 8 + ((i * 17) % 30) + "%",
                animationDelay: -i * 1.7 + "s",
              }}
            >
              <b />
            </i>
          ))}
        </div>
      )}
      <header className="site-header">
        <button className="wordmark" onClick={replay} aria-label="回到生日邀请">
          <span className="brand-spark" aria-hidden="true">
            ✦
          </span>
          <span>
            {story.person.name}
            <small>的生日奇遇</small>
          </span>
        </button>
        <div className="chapter-progress" aria-label="生日故事进度">
          {book.chapters.map((c, i) => (
            <span
              key={c.id}
              className={
                i === snapshot.index
                  ? "current"
                  : i < snapshot.index
                    ? "visited"
                    : ""
              }
              aria-current={i === snapshot.index ? "step" : undefined}
            >
              <b>{String(i + 1).padStart(2, "0")}</b>
              <span>{c.label}</span>
            </span>
          ))}
        </div>
        <span className="header-dedication">一份只属于你的惊喜</span>
      </header>
      <div className="invitation-stage" hidden={inBook}>
        {!inBook && (
          <section className="hero-copy" aria-label="生日邀请">
            <p className="eyebrow">
              <span /> 今天的魔法，为你而来
            </p>
            <h1>
              亲爱的
              <br />
              <em>{story.person.name}</em>
              <span className="title-dot">，</span>
            </h1>
            <p className="hero-wish">生日快乐。</p>
            <p className="hero-description">
              把一点魔法、一点温柔，
              <br />
              和满满的喜欢，都藏进这份礼物里。
            </p>
            <div className="hero-actions">
              {sceneError ? (
                <>
                  <p className="fallback-note" role="status">
                    贺卡正在休息，心意一样在这里。
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      setStarted(true);
                      unlock();
                      enterBook();
                    }}
                  >
                    打开生日故事 <span>→</span>
                  </button>
                </>
              ) : !started ? (
                <>
                  <button
                    className="primary"
                    disabled={!ready}
                    onClick={() => start(false)}
                  >
                    {ready ? "打开这份惊喜" : "正在点亮烛光…"} <span>↗</span>
                  </button>
                  <button
                    className="text-button camera-start"
                    disabled={!ready}
                    onClick={() => start(true)}
                  >
                    也可以用手势打开 <span aria-hidden="true">✧</span>
                  </button>
                </>
              ) : (
                <>
                  {storyReady ? (
                    <button
                      className="primary"
                      disabled={entering}
                      onClick={enterBook}
                    >
                      翻开{book.chapters[1].label} <span>→</span>
                    </button>
                  ) : (
                    <button
                      className="primary"
                      disabled={entering}
                      onClick={() => {
                        unlock();
                        scene.current?.setOpen(
                          !scene.current.motion.targetOpen,
                        );
                      }}
                    >
                      {open ? "合上贺卡" : "打开贺卡"}{" "}
                      <span>{open ? "−" : "+"}</span>
                    </button>
                  )}
                  {storyReady && (
                    <button
                      className="text-button"
                      disabled={entering}
                      onClick={() => scene.current?.setOpen(false)}
                    >
                      再看看封面
                    </button>
                  )}
                  {gesture.mode === "ready" && !storyReady && (
                    <p className="gesture-hint" aria-live="polite">
                      张开手掌，打开惊喜；握拳，合上贺卡。
                    </p>
                  )}
                  {gesture.mode === "loading" && (
                    <>
                      <p className="gesture-hint">正在准备手势识别…</p>
                      <button
                        className="text-button"
                        onClick={() => start(false)}
                      >
                        直接点击打开
                      </button>
                    </>
                  )}
                  {gesture.mode === "fallback" &&
                    gesture.status.startsWith("暂时") && (
                      <p className="fallback-note" role="status">
                        {gesture.status}
                      </p>
                    )}
                </>
              )}
            </div>
            <p className="hero-footnote">
              <span aria-hidden="true">✧</span> 不着急，今天的时间都属于你。
            </p>
          </section>
        )}
        <div
          ref={host}
          className="scene"
          hidden={inBook || sceneError}
          data-card-state={state}
          aria-label="可以拖动旋转的立体生日贺卡"
        />
        {!inBook && !sceneError && (
          <span className="scene-caption">轻轻拖动，换个角度看看</span>
        )}
      </div>
      {inBook && (
        <MemoryBook
          key={snapshot.session}
          controller={book}
          snapshot={snapshot}
          onReplay={replay}
          onPiano={(note) => {
            emit("piano");
            void audio.current
              ?.unlock()
              .then(() => {
                if (pianoAllowed.current) audio.current?.playPiano(note);
              })
              .catch(() => setAudioError(true));
          }}
          onRoar={() => {
            emit("roar");
            void audio.current
              ?.unlock()
              .then(() => audio.current?.roar())
              .catch(() => setAudioError(true));
          }}
          onEnding={() => {
            emit("wish");
            unlock();
            audio.current?.setVolume(0.7);
            audio.current?.playEnding();
          }}
        />
      )}
      {!inBook && !sceneError && (
        <MagicWand
          active={entering}
          onCast={() => {
            emit("magic");
            unlock();
            setStarted(true);
            scene.current?.castSpell();
          }}
        />
      )}
      <PetCompanion
        chapter={chapter}
        celebrating={snapshot.finalState === "complete"}
        cardOpen={open}
        session={snapshot.session}
        cue={cue}
      />
      <aside
        className={
          "camera " +
          (gesture.mode === "ready" && !hiddenPreview && !inBook
            ? "visible"
            : "")
        }
        aria-label="手势摄像头预览"
        aria-hidden={inBook || hiddenPreview || gesture.mode !== "ready"}
      >
        <video
          ref={gesture.videoRef}
          playsInline
          muted
          aria-label="摄像头画面"
        />
        <div className="camera-caption">{gesture.status}</div>
        <button
          className="hide-camera"
          onClick={() => setHiddenPreview(true)}
          aria-label="隐藏摄像头画面"
        >
          ×
        </button>
      </aside>
      <footer className="site-footer">
        <span className="footer-note">
          {inBook ? "把喜欢的日子，慢慢收藏。" : "烛光会亮，小狗也在等你。"}
        </span>
        <div className="footer-controls">
          {gesture.mode === "ready" && (
            <>
              <button onClick={gesture.stop}>关闭摄像头</button>
              {!inBook && (
                <button onClick={() => setHiddenPreview(!hiddenPreview)}>
                  {hiddenPreview ? "显示画面" : "隐藏画面"}
                </button>
              )}
            </>
          )}
          {started && (
            <button
              aria-pressed={!muted}
              onClick={() => {
                unlock();
                audio.current?.setMuted(!muted);
                setMuted(!muted);
              }}
            >
              {muted ? "♫ 声音关" : "♫ 声音开"}
            </button>
          )}
          <button onClick={() => setCredits(true)}>关于这份礼物</button>
        </div>
      </footer>
      {audioError && (
        <p className="audio-note" role="status">
          暂时无法播放音乐，你可以继续翻阅。
        </p>
      )}
      {credits && (
        <dialog
          ref={creditsRef}
          className="credits-dialog"
          onCancel={() => setCredits(false)}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCredits(false);
          }}
        >
          <button
            className="dialog-close"
            onClick={() => setCredits(false)}
            aria-label="关闭说明"
          >
            ×
          </button>
          <p className="eyebrow">这份小小的心意</p>
          <h2>给{story.person.name}的生日奇遇</h2>
          <p>
            四个片段：{names.join("、")}
            。魔法烛光、爵士夜色与荣耀石，来自对《哈利波特》《爱乐之城》和《狮子王》的喜爱。
          </p>
          {story.preview && (
            <p>
              当前相册风景和祝福文字用于效果预览，尚未放入真实的个人照片与共同回忆。
            </p>
          )}
          <p>
            风景照片来自
            Unsplash，场景背景为生成绘画。幼狮与钢琴使用公开授权模型，作者与许可见项目素材说明。
          </p>
          <p>
            幼狮：
            <a
              href="https://sketchfab.com/3d-models/baby-lion-c9599625dc474262aab754d7b63841f5"
              target="_blank"
              rel="noreferrer"
            >
              kenchoo
            </a>
            （
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 4.0
            </a>
            ）； 钢琴：
            <a
              href="https://poly.pizza/m/7U-93vxPOER"
              target="_blank"
              rel="noreferrer"
            >
              jeremy
            </a>
            （
            <a
              href="https://creativecommons.org/licenses/by/3.0/"
              target="_blank"
              rel="noreferrer"
            >
              CC BY 3.0
            </a>
            ）。
            本项目调整了材质，制作成年狮衍生与新动作。舞者基础网格与服装来自
            Quaternius（CC0）。
          </p>
          <p>
            两只泰迪为本项目制作的三维角色，点击可以摸摸。摄像头只用于本地手势识别，不会上传画面。
          </p>
          <button className="primary" onClick={() => setCredits(false)}>
            继续这场奇遇
          </button>
        </dialog>
      )}
    </main>
  );
}
