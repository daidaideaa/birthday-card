import { gsap } from "gsap";

/** GSAP 只编排属性与 cue；时间由可见场景驱动，不使用全局 ticker 播放。 */
export class CinematicDirector {
  readonly timeline = gsap.timeline({ paused: true });
  private elapsed = 0;
  private running = false;
  private frames = new Set<(time: number, delta: number) => void>();
  private wake?: () => void;
  constructor(readonly duration: number) {
    this.timeline.to({}, { duration }, 0);
  }
  get time() {
    return this.elapsed;
  }
  get playing() {
    return this.running;
  }
  subscribe(frame: (time: number, delta: number) => void) {
    this.frames.add(frame);
    return () => {
      this.frames.delete(frame);
    };
  }
  invalidate() {
    this.frames.forEach((frame) => frame(this.elapsed, 0));
  }
  play(restart = false) {
    if (restart || this.elapsed >= this.duration) {
      this.elapsed = 0;
      this.timeline.time(0, true);
      this.invalidate();
    }
    this.running = true;
    this.wake?.();
  }
  pause() {
    this.running = false;
  }
  advance(delta: number) {
    if (!this.running || !Number.isFinite(delta) || delta <= 0) return;
    const previous = this.elapsed;
    this.elapsed = Math.min(this.duration, previous + delta);
    this.timeline.time(this.elapsed, false);
    this.frames.forEach((frame) =>
      frame(this.elapsed, this.elapsed - previous),
    );
    if (this.elapsed >= this.duration) this.running = false;
  }
  /** Review seeking never emits sound, navigation or completion callbacks. */
  seek(time: number) {
    this.elapsed = Math.max(0, Math.min(this.duration, time));
    this.timeline.time(this.elapsed, true);
    this.invalidate();
  }
  attach(host: HTMLElement) {
    let frame = 0,
      previous = 0,
      visible = false,
      disposed = false;
    const tick = (now: number) => {
      frame = 0;
      if (disposed || document.hidden || !visible || !this.running) return;
      if (previous) this.advance(Math.min((now - previous) / 1000, 0.1));
      previous = now;
      if (this.running) frame = requestAnimationFrame(tick);
    };
    const resume = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      if (!disposed && visible && !document.hidden && this.running)
        frame = requestAnimationFrame(tick);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        resume();
      },
      { threshold: 0.05 },
    );
    observer.observe(host);
    document.addEventListener("visibilitychange", resume);
    this.wake = resume;
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", resume);
      this.wake = undefined;
    };
  }
  dispose() {
    this.pause();
    this.timeline.kill();
    this.frames.clear();
  }
}
