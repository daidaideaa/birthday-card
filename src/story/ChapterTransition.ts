export type TransitionPhase = "idle" | "preparing" | "covering" | "covered" | "revealing";
export type TransitionTreatment = "paper" | "bluehour" | "sunrise";
export interface TransitionFrame {
  phase: TransitionPhase;
  treatment: TransitionTreatment;
}

export function transitionDelay(milliseconds: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener("abort", finish, { once: true });
  });
}

/** A newer navigation owns the curtain. Cancelled loads/timers cannot commit. */
export class ChapterTransition {
  private active?: AbortController;
  constructor(
    private readonly update: (frame: TransitionFrame) => void,
    private readonly delay = transitionDelay,
  ) {}

  cancel() {
    this.active?.abort();
    this.active = undefined;
    this.update({ phase: "idle", treatment: "paper" });
  }

  async run(options: {
    treatment: TransitionTreatment;
    immediate: boolean;
    prepare: (signal: AbortSignal) => Promise<unknown>;
    commit: () => void;
  }) {
    this.active?.abort();
    const request = new AbortController();
    this.active = request;
    const { signal } = request;
    const show = (phase: TransitionPhase) =>
      this.update({ phase, treatment: options.treatment });
    if (!options.immediate) {
      show("preparing");
      // A missing poster must never trap the reader behind a loading screen.
      await Promise.race([
        options.prepare(signal).catch(() => undefined),
        this.delay(1800, signal),
      ]);
      if (signal.aborted) return;
      show("covering");
      await this.delay(460, signal);
      if (signal.aborted) return;
      // CSS animation starts on a rendered frame, which may lag this timer.
      // Commit the opaque state and new chapter together rather than trusting
      // an elapsed wall-clock interval to guarantee compositor opacity.
      show("covered");
    }
    options.commit();
    if (signal.aborted) return;
    if (!options.immediate) {
      // Keep the opaque curtain over the React commit and decoded poster frame.
      await this.delay(120, signal);
      if (signal.aborted) return;
      show("revealing");
      await this.delay(600, signal);
      if (signal.aborted) return;
    }
    this.active = undefined;
    request.abort();
    show("idle");
  }
}
