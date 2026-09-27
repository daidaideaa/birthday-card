/**
 * 低延迟钢琴声部：按下立即发声，按住延音，松开独立衰减。
 *
 * 方案 §10.3 的要求落在这里：同键多指用持有计数，重复击键产生新 attack，
 * 限制最大复音与 voice 生命周期，离章 / 失焦 / 后台一次释放全部按住的音。
 * 不做防抖——任何延迟都会被手指感知为“琴键不跟手”。
 */

/** 工程默认音域 D4–A4：5 个白键 + 3 个可弹黑键。 */
export const PIANO_RANGE = { low: 62, high: 69 } as const;
export const WHITE_NOTES = [62, 64, 65, 67, 69] as const;
export const BLACK_NOTES = [63, 66, 68] as const;
/** 黑键落在哪两个白键之间（白键索引）。 */
export const BLACK_AFTER_WHITE: Record<number, number> = { 63: 0, 66: 2, 68: 3 };

export const NOTE_NAMES: Record<number, string> = {
  62: "D", 63: "升D", 64: "E", 65: "F", 66: "升F", 67: "G", 68: "升G", 69: "A",
};
export const SOLFEGE: Record<number, string> = {
  62: "来", 63: "升来", 64: "咪", 65: "发", 66: "升发", 67: "嗦", 68: "升嗦", 69: "拉",
};

/** 同时最多 6 个发声 voice：三指和弦加上前一次的延音尾巴仍有余量。 */
const MAX_VOICES = 6;
const SUSTAIN_SECONDS = 4.2;
/** 松键后的自然衰减，不是硬切。 */
const RELEASE_SECONDS = 0.42;

interface Voice {
  note: number;
  source: AudioBufferSourceNode | OscillatorNode;
  extra: OscillatorNode[];
  gain: GainNode;
  startedAt: number;
  cleanup: () => void;
}

export class PianoVoices {
  private voices: Voice[] = [];
  /** note → 按住它的指针数；0 才真正松键。 */
  private held = new Map<number, number>();

  constructor(
    private context: AudioContext,
    private destination: AudioNode,
    private samples: Map<number, AudioBuffer>,
  ) {}

  /** 当前按住的音高集合，供角色手部姿态求解使用。 */
  heldNotes(): number[] {
    return [...this.held.keys()].filter((note) => (this.held.get(note) ?? 0) > 0);
  }

  isHeld(note: number) {
    return (this.held.get(note) ?? 0) > 0;
  }

  /**
   * 按下一个音。同一个键被第二根手指按下时只增加计数，
   * 但仍然产生新的 attack——真实钢琴上重复击键会再次发声。
   */
  noteOn(note: number, velocity = 1) {
    this.held.set(note, (this.held.get(note) ?? 0) + 1);
    this.attack(note, velocity);
  }

  /** 松开一个音；只有最后一根手指离开时才进入衰减。 */
  noteOff(note: number) {
    const count = (this.held.get(note) ?? 0) - 1;
    if (count > 0) {
      this.held.set(note, count);
      return;
    }
    this.held.delete(note);
    this.release(note);
  }

  /** 离章 / 失焦 / 后台：一次清空，防黏音。 */
  releaseAll() {
    this.held.clear();
    for (const voice of [...this.voices]) this.fade(voice, RELEASE_SECONDS);
  }

  private attack(note: number, velocity: number) {
    const ctx = this.context;
    const now = ctx.currentTime;
    // 同一个键的旧 voice 先快速让位，避免一个旧 voice 永久占住按键。
    for (const voice of this.voices.filter((v) => v.note === note)) this.fade(voice, 0.08);
    // 超出复音上限时先收掉最早的发声，而不是拒绝新的输入。
    while (this.voices.length >= MAX_VOICES) {
      const oldest = this.voices.reduce((a, b) => (a.startedAt <= b.startedAt ? a : b));
      this.fade(oldest, 0.06);
      if (this.voices.includes(oldest)) this.drop(oldest);
    }
    const level = 0.5 + velocity * 0.42;
    const gain = ctx.createGain();
    gain.connect(this.destination);
    const extra: OscillatorNode[] = [];
    let source: AudioBufferSourceNode | OscillatorNode;
    const sampleKey = note < 65 ? 62 : 69;
    const buffer = this.samples.get(sampleKey) ?? this.samples.get(60) ?? this.samples.get(69);
    if (buffer) {
      const player = ctx.createBufferSource();
      player.buffer = buffer;
      // 采样按半音关系变速；有限音域内音色偏移仍可接受。
      const recorded = this.samples.has(sampleKey) ? sampleKey : this.samples.has(60) ? 60 : 69;
      player.playbackRate.value = 2 ** ((note - recorded) / 12);
      player.connect(gain);
      source = player;
    } else {
      // 采样未就绪也必须立刻有声：三个分音的合成琴音顶上。
      const base = 440 * 2 ** ((note - 69) / 12);
      const partials: [number, number][] = [[1, 0.62], [2, 0.17], [3, 0.05]];
      let primary: OscillatorNode | undefined;
      for (const [multiple, weight] of partials) {
        const oscillator = ctx.createOscillator();
        oscillator.type = multiple === 1 ? "triangle" : "sine";
        oscillator.frequency.value = base * multiple;
        const partialGain = ctx.createGain();
        partialGain.gain.value = weight;
        oscillator.connect(partialGain);
        partialGain.connect(gain);
        oscillator.start(now);
        if (primary) extra.push(oscillator);
        else primary = oscillator;
      }
      source = primary!;
    }
    // 快速 attack + 缓慢延音包络；按住期间不重新发声。
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.006);
    gain.gain.setTargetAtTime(level * 0.28, now + 0.02, 0.9);
    const voice: Voice = {
      note,
      source,
      extra,
      gain,
      startedAt: now,
      cleanup: () => {
        try {
          source.disconnect();
          extra.forEach((node) => node.disconnect());
          gain.disconnect();
        } catch {
          /* 已断开。 */
        }
        this.drop(voice);
      },
    };
    this.voices.push(voice);
    source.onended = voice.cleanup;
    if (source instanceof AudioBufferSourceNode) source.start(now);
    // voice 生命周期上限，长时间演奏不累积节点。
    const stopAt = now + SUSTAIN_SECONDS;
    try {
      source.stop(stopAt);
      extra.forEach((node) => node.stop(stopAt));
    } catch {
      /* 已停止。 */
    }
  }

  private release(note: number) {
    for (const voice of this.voices.filter((v) => v.note === note))
      this.fade(voice, RELEASE_SECONDS);
  }

  private fade(voice: Voice, seconds: number) {
    const now = this.context.currentTime;
    const end = now + seconds;
    try {
      voice.gain.gain.cancelScheduledValues(now);
      // 从当前实际值开始衰减，避免松键时出现电平跳变。
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.exponentialRampToValueAtTime(0.0001, end);
      voice.source.stop(end + 0.02);
      voice.extra.forEach((node) => node.stop(end + 0.02));
    } catch {
      voice.cleanup();
    }
  }

  private drop(voice: Voice) {
    const index = this.voices.indexOf(voice);
    if (index >= 0) this.voices.splice(index, 1);
  }

  dispose() {
    for (const voice of [...this.voices]) {
      try {
        voice.source.stop();
      } catch {
        /* 已停止。 */
      }
      voice.cleanup();
    }
    this.voices = [];
    this.held.clear();
  }
}
