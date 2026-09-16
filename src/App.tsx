import { useEffect, useRef, useState } from "react";
import { BirthdayScene } from "./scene/BirthdayScene";
import { AudioController } from "./scene/AudioController";
import type { CardState } from "./scene/CardMotion";
import { useGesture } from "./hooks/useGesture";
export default function App() {
  const host = useRef<HTMLDivElement>(null);
  const scene = useRef<BirthdayScene | null>(null);
  const audio = useRef<AudioController | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [state, setState] = useState<CardState>("CLOSED");
  const [muted, setMuted] = useState(false);
  const [hiddenPreview, setHiddenPreview] = useState(false);
  const [sceneError, setSceneError] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const gesture = useGesture((open) => scene.current?.setOpen(open));
  useEffect(() => {
    let disposed = false;
    audio.current = new AudioController();
    const init = async () => {
      try {
        await document.fonts.load("80px Parisienne");
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
      scene.current?.dispose();
      audio.current?.dispose();
      scene.current = null;
      audio.current = null;
    };
  }, []);
  const unlock = () => {
    void audio.current
      ?.unlock()
      .then(() => setAudioError(false))
      .catch(() => setAudioError(true));
  };
  const start = (camera: boolean) => {
    unlock();
    setStarted(true);
    scene.current?.setOpen(false);
    if (camera) gesture.start();
    else gesture.stop();
  };
  const open = state === "OPEN" || state === "OPENING";
  const toggle = () => {
    unlock();
    scene.current?.setOpen(!scene.current.motion.targetOpen);
  };
  return (
    <main className="experience">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />
      <div className="grain" />
      <header>
        <a
          className="wordmark"
          href={import.meta.env.BASE_URL}
          aria-label="For Han, home"
        >
          <span className="tiny-star">✧</span> a little birthday magic
        </a>
        <span className="dedication">MADE JUST FOR HAN</span>
      </header>
      <section className="intro" aria-label="Birthday introduction">
        <div className="eyebrow">A WISH. A SMILE. A LITTLE WONDER.</div>
        <h1>
          Some days are <em>all yours.</em>
        </h1>
        <p>A little surprise, waiting to unfold.</p>
      </section>
      <div
        ref={host}
        className="scene"
        data-card-state={state}
        aria-label="Interactive birthday card"
      />
      {sceneError ? (
        <section className="scene-error" role="alert">
          <h2>A little more magic is needed.</h2>
          <p>Please open this gift in a browser with WebGL enabled.</p>
          <button onClick={() => location.reload()}>Try Again</button>
        </section>
      ) : (
        <section className="invitation" aria-label="Card controls">
          {!started ? (
            <>
              <button
                className="primary"
                disabled={!ready}
                onClick={() => start(true)}
              >
                {ready ? "Start the Magic" : "Preparing a little magic..."}{" "}
                <span aria-hidden="true">✧</span>
              </button>
              <button
                className="text-button"
                disabled={!ready}
                onClick={() => start(false)}
              >
                Continue without camera
              </button>
            </>
          ) : (
            <>
              <p className="gesture-hint" aria-live="polite">
                {gesture.mode === "loading"
                  ? "Preparing a little magic..."
                  : gesture.mode === "ready"
                    ? "Open your hand to reveal your surprise."
                    : "Your little surprise is ready."}
              </p>
              <button className="primary compact" onClick={toggle}>
                {open ? "Close Card" : "Open Card"}{" "}
                <span aria-hidden="true">{open ? "−" : "+"}</span>
              </button>
              {gesture.mode === "loading" && (
                <button className="text-button" onClick={gesture.stop}>
                  Continue without camera
                </button>
              )}
              {gesture.mode === "fallback" &&
                gesture.status.startsWith("Camera unavailable") && (
                  <p className="fallback-note" role="status">
                    {gesture.status}
                  </p>
                )}
            </>
          )}
          <p className="drag-hint">
            DRAG TO ADMIRE <span>·</span>{" "}
            {started ? "MADE WITH LOVE" : "A MOMENT JUST FOR YOU"}
          </p>
        </section>
      )}
      <aside
        className={`camera ${gesture.mode === "ready" && !hiddenPreview ? "visible" : ""}`}
        aria-label="Camera preview"
      >
        <video
          ref={gesture.videoRef}
          playsInline
          muted
          aria-label="Your camera preview"
        />
        <div className="camera-caption">
          <i />
          {gesture.status}
        </div>
        <button
          className="hide-camera"
          onClick={() => setHiddenPreview(true)}
          aria-label="Hide camera preview"
        >
          ×
        </button>
      </aside>
      <footer>
        <span className="footer-note">
          A small gesture. A beautiful moment.
        </span>
        <div className="footer-controls">
          {gesture.mode === "ready" && (
            <>
              <button onClick={() => setHiddenPreview(!hiddenPreview)}>
                {hiddenPreview ? "Show Camera" : "Hide Camera"}
              </button>
              <button onClick={gesture.stop}>Turn Camera Off</button>
            </>
          )}
          {started && gesture.mode === "fallback" && (
            <button onClick={gesture.start}>Use Camera</button>
          )}
          {started && (
            <button
              aria-pressed={muted}
              onClick={() => {
                unlock();
                const next = !muted;
                audio.current?.setMuted(next);
                setMuted(next);
              }}
            >
              {muted ? "Sound Off" : "Sound On"}
            </button>
          )}
        </div>
      </footer>
      {audioError && (
        <p className="audio-note" role="status">
          Sound is unavailable in this browser. Your card still works.
        </p>
      )}
      <span className="privacy-note">Your camera stays with you. Always.</span>
    </main>
  );
}
