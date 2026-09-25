import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { cinematicMedia, filmSource, FilmPlaybackSession, FILM_PORTRAIT_QUERY } from "./media";
import type { FilmFormat, FilmId } from "./media";
import { registerMediaAudio, setMediaSilenced } from "./mediaAudio";
import { setMediaActive } from "./mediaActivity";
import "./film.css";

export type CinematicFilmHandle = {
  play: (options?: { restart?: boolean; time?: number }) => void;
  pause: () => void;
  showFrame: (time: number) => void;
};

type Props = {
  id: FilmId;
  autoPlay?: boolean;
  onTime?: (time: number) => void;
  onComplete?: () => void;
  onPlayingChange?: (playing: boolean) => void;
};

const motionQuery = "(prefers-reduced-motion: reduce)";

/** Native decoding is the only story clock, including when buffering or offscreen. */
export const CinematicFilm = forwardRef<CinematicFilmHandle, Props>(function CinematicFilm(
  { id, autoPlay = false, onTime, onComplete, onPlayingChange }, ref,
) {
  const [format, setFormat] = useState<FilmFormat>(() => matchMedia(FILM_PORTRAIT_QUERY).matches ? "portrait" : "landscape");
  const [reduced, setReduced] = useState(() => matchMedia(motionQuery).matches);
  const [playingInstance, setPlayingInstance] = useState<symbol | null>(null);
  const [decoded, setDecoded] = useState<symbol | null>(null);
  const [failure, setFailure] = useState<symbol | null>(null);
  const [failedPoster, setFailedPoster] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [time, setTime] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const wanted = useRef(autoPlay && !reduced);
  const visible = useRef(true);
  const review = useRef(false);
  const position = useRef(0);
  const pendingSeek = useRef<number | null>(null);
  const session = useRef(new FilmPlaybackSession());
  const api = useRef<CinematicFilmHandle>({ play: () => {}, pause: () => {}, showFrame: () => {} });
  const callbacks = useRef({ onTime, onComplete, onPlayingChange });
  callbacks.current = { onTime, onComplete, onPlayingChange };
  const source = filmSource(id, format);
  const duration = cinematicMedia[id].duration;
  // A → B → A creates three decoder instances, even though the URL repeats.
  const loadInstance = useMemo(() => Symbol(source.video), [source.video]);
  const playing = playingInstance === loadInstance;

  useImperativeHandle(ref, () => ({
    play: (options) => api.current.play(options),
    pause: () => api.current.pause(),
    showFrame: (seconds) => api.current.showFrame(seconds),
  }), []);

  useEffect(() => {
    const orientation = matchMedia(FILM_PORTRAIT_QUERY);
    const motion = matchMedia(motionQuery);
    const resize = () => setFormat(orientation.matches ? "portrait" : "landscape");
    const preference = () => {
      setReduced(motion.matches);
      if (motion.matches) api.current.pause();
    };
    orientation.addEventListener("change", resize);
    motion.addEventListener("change", preference);
    return () => {
      orientation.removeEventListener("change", resize);
      motion.removeEventListener("change", preference);
    };
  }, []);

  useEffect(() => {
    const element = video.current!;
    const host = root.current!;
    const token = Symbol(id);
    callbacks.current.onPlayingChange?.(false);
    const detachAudio = registerMediaAudio(element);
    setMediaSilenced(element, review.current);
    let alive = true;
    let frame = 0;
    let fallbackFrame = 0;
    let playAttempt = 0;
    let requested = false;
    const initialPosition = position.current;

    const reportTime = () => {
      if (!alive || pendingSeek.current !== null || element.readyState < 1) return;
      position.current = element.currentTime;
      setTime(element.currentTime);
      callbacks.current.onTime?.(element.currentTime);
      host.dataset.time = element.currentTime.toFixed(3);
    };
    const markDecoded = (mediaTime = element.currentTime) => {
      if (!alive || element.readyState < 2 || element.seeking || pendingSeek.current !== null) return;
      // A queued compositor callback can still describe the frame before a seek.
      if (Math.abs(mediaTime - element.currentTime) > 0.12) return;
      setDecoded(loadInstance);
      host.dataset.frameTime = mediaTime.toFixed(3);
      reportTime();
    };
    const cancelFrameWatch = () => {
      if (frame) element.cancelVideoFrameCallback?.(frame);
      cancelAnimationFrame(fallbackFrame);
      frame = 0;
      fallbackFrame = 0;
    };
    const confirmStillFrame = () => {
      if (!alive || document.hidden || !visible.current || element.seeking || element.readyState < 2) return;
      // loadeddata/seeked with HAVE_CURRENT_DATA confirms a decoded frame.
      // Paused videos may present that frame before a new rVFC is registered.
      cancelAnimationFrame(fallbackFrame);
      fallbackFrame = requestAnimationFrame(() => {
        fallbackFrame = requestAnimationFrame(() => {
          fallbackFrame = 0;
          markDecoded();
        });
      });
    };
    const watchFrame = () => {
      if (!alive || frame || document.hidden || !visible.current) return;
      if (element.requestVideoFrameCallback) {
        frame = element.requestVideoFrameCallback((_now, metadata) => {
          frame = 0;
          markDecoded(metadata.mediaTime);
          if (!element.paused || element.seeking) watchFrame();
        });
      } else confirmStillFrame();
    };
    const applySeek = (target: number) => {
      cancelFrameWatch();
      // Register before changing currentTime; seeked may arrive after presentation.
      watchFrame();
      element.currentTime = target;
      pendingSeek.current = null;
    };
    const requestPlay = () => {
      if (!alive || !wanted.current || !visible.current || document.hidden || requested || !element.paused) return;
      requested = true;
      const attempt = ++playAttempt;
      void element.play().then(() => {
        if (attempt !== playAttempt) return;
        if (!alive || !wanted.current || !visible.current || document.hidden) element.pause();
        else setBlocked(false);
      }).catch((error: DOMException) => {
        if (alive && attempt === playAttempt && error.name !== "AbortError") {
          wanted.current = false;
          setBlocked(true);
        }
      }).finally(() => { if (attempt === playAttempt) requested = false; });
    };
    const pause = () => {
      ++playAttempt;
      requested = false;
      element.pause();
      cancelFrameWatch();
      setMediaActive(token, false);
    };
    const seek = (seconds: number) => {
      const target = Math.max(0, Math.min(duration - 0.04, seconds));
      position.current = target;
      pendingSeek.current = target;
      if (element.readyState >= 1) {
        applySeek(target);
      }
      setTime(target);
      callbacks.current.onTime?.(target);
      host.dataset.time = target.toFixed(3);
    };
    api.current = {
      play(options = {}) {
        host.scrollIntoView({ block: "center", behavior: matchMedia(motionQuery).matches ? "instant" : "smooth" });
        review.current = false;
        setMediaSilenced(element, false);
        const restart = options.restart || element.ended || position.current >= duration - 0.08;
        session.current.begin(restart);
        if (restart || options.time !== undefined) seek(options.time ?? 0);
        setFailure(null);
        setBlocked(false);
        wanted.current = true;
        if (element.error) {
          setDecoded(null);
          pendingSeek.current = position.current;
          element.load();
        }
        requestPlay();
      },
      pause() {
        wanted.current = false;
        pause();
      },
      showFrame(seconds) {
        review.current = true;
        session.current.review();
        wanted.current = false;
        setMediaSilenced(element, true);
        pause();
        seek(seconds);
        if (element.readyState === 0) {
          element.preload = "auto";
          element.load();
        }
      },
    };
    const loaded = () => {
      if (pendingSeek.current !== null || initialPosition > 0) {
        applySeek(pendingSeek.current ?? Math.min(initialPosition, duration - 0.04));
      }
      requestPlay();
    };
    const data = () => { watchFrame(); confirmStillFrame(); requestPlay(); };
    const seeked = () => { confirmStillFrame(); watchFrame(); };
    const didPlay = () => {
      if (!wanted.current || document.hidden || !visible.current) { pause(); return; }
      setPlayingInstance(loadInstance);
      setMediaActive(token, true);
      callbacks.current.onPlayingChange?.(true);
      setBlocked(false);
      watchFrame();
    };
    const didPause = () => {
      setPlayingInstance(null);
      setMediaActive(token, false);
      callbacks.current.onPlayingChange?.(false);
    };
    const ended = () => {
      wanted.current = false;
      didPause();
      reportTime();
      if (session.current.finish()) callbacks.current.onComplete?.();
    };
    const error = () => {
      wanted.current = false;
      setFailure(loadInstance);
      didPause();
    };
    const visibility = () => {
      if (document.hidden || !visible.current) pause();
      else { confirmStillFrame(); watchFrame(); requestPlay(); }
    };
    const reviewSeek = (event: Event) => {
      const seconds = Number((event as CustomEvent<number>).detail);
      if (Number.isFinite(seconds)) api.current.showFrame(seconds);
    };
    const reviewHost = host.closest(".piano-nook, .pride-story") ?? host;
    if (import.meta.env.DEV || import.meta.env.MODE === "visual-review")
      reviewHost.addEventListener("cinema-review-seek", reviewSeek);
    const observer = new IntersectionObserver(([entry]) => {
      visible.current = entry.isIntersecting && entry.intersectionRatio > 0.05;
      visibility();
    }, { threshold: [0, 0.05, 0.15] });
    const bounds = host.getBoundingClientRect();
    visible.current = bounds.bottom > 0 && bounds.top < window.innerHeight;
    observer.observe(host);
    document.addEventListener("visibilitychange", visibility);
    element.addEventListener("loadedmetadata", loaded);
    element.addEventListener("loadeddata", data);
    element.addEventListener("canplay", requestPlay);
    element.addEventListener("playing", didPlay);
    element.addEventListener("pause", didPause);
    element.addEventListener("ended", ended);
    element.addEventListener("error", error);
    element.addEventListener("timeupdate", reportTime);
    element.addEventListener("seeked", seeked);
    watchFrame();
    if (element.readyState >= 1) loaded();
    if (element.readyState >= 2) data();
    if (element.readyState === 0 && (initialPosition > 0 || pendingSeek.current !== null)) {
      element.preload = "auto";
      element.load();
    }
    requestPlay();
    return () => {
      alive = false;
      ++playAttempt;
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      reviewHost.removeEventListener("cinema-review-seek", reviewSeek);
      element.removeEventListener("loadedmetadata", loaded);
      element.removeEventListener("loadeddata", data);
      element.removeEventListener("canplay", requestPlay);
      element.removeEventListener("playing", didPlay);
      element.removeEventListener("pause", didPause);
      element.removeEventListener("ended", ended);
      element.removeEventListener("error", error);
      element.removeEventListener("timeupdate", reportTime);
      element.removeEventListener("seeked", seeked);
      cancelFrameWatch();
      element.pause();
      detachAudio();
      setMediaActive(token, false);
      // Abort an obsolete download while preserving React StrictMode's effect replay.
      queueMicrotask(() => {
        if (video.current !== element) {
          element.removeAttribute("src");
          element.load();
        }
      });
    };
  }, [id, source.video, duration, loadInstance]);

  const failed = failure === loadInstance;
  const ready = decoded === loadInstance && !failed;
  return (
    <div ref={root} className={`cinematic-film cinematic-film--${format}`} data-film={id}
      data-time={time.toFixed(3)} data-ready={ready} data-playing={playing} data-reduced-motion={reduced}>
      <video key={source.video} ref={video} className="cinematic-film__video" src={source.video}
        poster={failedPoster === source.poster ? undefined : source.poster} preload={reduced ? "none" : "metadata"} playsInline
        aria-label={cinematicMedia[id].title} tabIndex={-1} disablePictureInPicture />
      <img className="cinematic-film__poster" src={source.poster} alt="" aria-hidden="true"
        onError={() => setFailedPoster(source.poster)}
        style={{ opacity: ready ? 0 : 1, display: failedPoster === source.poster ? "none" : undefined }} />
      <div className="cinematic-film__shade" aria-hidden="true" />
      {(failed || blocked || reduced) && !playing && (
        <p className="cinematic-film__status" role="status">
          {failed ? "影片暂时无法播放，心意依然在这里。" : blocked ? "轻点播放，让这一刻继续。" : "为你留下安静的画面，也可以轻点播放。"}
        </p>
      )}
      <div className="cinematic-film__controls" data-navigation-lock>
        <button onClick={() => playing ? api.current.pause() : api.current.play()} aria-label={playing ? "暂停影片" : failed ? "重试播放影片" : "播放影片"}>
          <span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>
          <span>{playing ? "暂停" : failed ? "重试播放" : "播放"}</span>
        </button>
        <div className="cinematic-film__progress" role="progressbar" aria-label="影片进度" aria-valuenow={Math.round(time)} aria-valuemin={0} aria-valuemax={duration}>
          <i style={{ transform: `scaleX(${Math.min(1, time / duration)})` }} />
        </div>
        <span className="cinematic-film__time" aria-hidden="true">{String(Math.floor(time)).padStart(2, "0")} / {duration}</span>
      </div>
    </div>
  );
});
