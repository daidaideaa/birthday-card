/**
 * 把触摸伴奏映射为统一的演奏 / 舞蹈相位（方案 §11.3）。
 *
 * 两位角色共用一个相位与速度，因此手不会各自随机选 clip；
 * 停手后在下一个稳定落脚点收势，重新弹奏从可连接姿态继续，不退回第一帧。
 */

/** 速度倍率范围：乱按不会变成鬼畜倍速。 */
const MIN_RATE = 0.85;
const MAX_RATE = 1.15;
/** 停手后进入收势的判定时间，落在方案给出的 0.3–0.8 秒内。 */
const SETTLE_AFTER = 0.55;
/** 一轮编舞的实际动作时长（秒），用户停顿不计入。 */
export const CHOREOGRAPHY_SECONDS = 26;

export type PerformanceMode = "waiting" | "playing" | "settling";

export interface PerformanceFrame {
  /** 0..1 的编舞进度，供舞步与镜头取样。 */
  progress: number;
  phase: number;
  mode: PerformanceMode;
  rate: number;
  /** 最近一次击键后的短暴涨，用于口型 / 强调动作。 */
  accent: number;
  /** 本轮编舞是否已完整走过一遍。 */
  completed: boolean;
}

export class PerformanceState {
  private phase = 0;
  private rate = 1;
  private accent = 0;
  private lastInput = -Infinity;
  private intervals: number[] = [];
  private previous = -Infinity;
  private noteCount = 0;
  private completed = false;
  private clock = 0;
  private awaitingInput = false;

  /**
   * 记录一次击键。只增加输入密度，不直接跳相位。
   * 时间取自本对象内部时钟，与 advance 共用同一时间基准。
   */
  strike() {
    this.awaitingInput = false;
    const now = this.clock;
    if (this.previous > -Infinity) {
      const gap = now - this.previous;
      // 只保留近期间隔；超过 2.5 秒视为重新开始，不污染速度估计。
      if (gap < 2.5) {
        this.intervals.push(gap);
        if (this.intervals.length > 6) this.intervals.shift();
      } else this.intervals = [];
    }
    this.previous = now;
    this.lastInput = now;
    this.noteCount += 1;
    this.accent = 1;
  }

  /** 是否已有过输入；用于区分“还没弹”与“弹过又停”。 */
  get started() {
    return this.noteCount > 0;
  }

  /**
   * 推进相位。holding 为真（仍有按住的音）时也保持演奏，
   * 这样长按延音不会被误判为停手。
   */
  advance(dt: number, holding: boolean): PerformanceFrame {
    this.clock += dt;
    const now = this.clock;
    const since = now - this.lastInput;
    const active = holding || since < SETTLE_AFTER;
    if (this.intervals.length >= 2) {
      const mean = this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
      // 间隔越短速度越快，但夹在 0.85–1.15 之间。
      const target = mean > 0 ? Math.max(MIN_RATE, Math.min(MAX_RATE, 0.62 / mean)) : 1;
      this.rate += (target - this.rate) * Math.min(1, dt * 3);
    } else this.rate += (1 - this.rate) * Math.min(1, dt * 2);
    this.accent = Math.max(0, this.accent - dt * 3.2);

    let mode: PerformanceMode;
    if (!this.started || this.awaitingInput) mode = "waiting";
    else if (active) mode = "playing";
    else mode = "settling";

    if (mode === "playing") {
      this.phase += (dt * this.rate) / CHOREOGRAPHY_SECONDS;
      if (this.phase >= 1) {
        // 走完一轮后保持在收势姿态，不无限自动循环同一段。
        this.phase = 1;
        this.completed = true;
      }
    } else if (mode === "settling" && this.phase > 0 && this.phase < 1) {
      // 收势：继续极慢地走到最近的稳定落脚点，而不是原地冻结。
      const settleTarget = Math.min(1, Math.ceil(this.phase * 8) / 8);
      this.phase = Math.min(settleTarget, this.phase + dt * 0.35);
    }

    return {
      progress: this.phase,
      phase: this.phase,
      mode,
      rate: this.rate,
      accent: this.accent,
      completed: this.completed,
    };
  }

  /**
   * 失焦 / 离场 / 进后台：视作手指已经离键，但保留已经走过的相位。
   * 回来时从当前姿态收势或继续，不会因为“上次击键还很近”而凭空续播，
   * 也不会退回第一帧。
   */
  releaseInput() {
    this.awaitingInput = true;
    this.lastInput = -Infinity;
    this.previous = -Infinity;
    this.intervals = [];
    this.accent = 0;
  }

  /** 换章或重播：完全复位。 */
  reset() {
    this.awaitingInput = false;
    this.phase = 0;
    this.rate = 1;
    this.accent = 0;
    this.lastInput = -Infinity;
    this.previous = -Infinity;
    this.intervals = [];
    this.noteCount = 0;
    this.completed = false;
    this.clock = 0;
  }
}
