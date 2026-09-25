import { assetUrl } from "../utils/assetUrl";
import { setMediaAudioState } from "../cinematic/mediaAudio";
import { getMediaActive, subscribeMediaActivity } from "../cinematic/mediaActivity";
type Foley = "paper" | "envelope" | "candle";
type Voice = {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  cleanup: () => void;
};

export class AudioController {
  private context?: AudioContext;
  private master?: GainNode;
  private voices = new Set<Voice>();
  private samples = new Map<number, AudioBuffer>();
  private loading?: Promise<void>;
  private abort = new AbortController();
  private disposed = false;
  private volume = 1;
  private detachMedia = subscribeMediaActivity(() => {
    if (getMediaActive()) this.fadeOut();
  });
  muted = false;
  private visibility = () => {
    if (!this.context || this.disposed) return;
    // 剧情时钟也暂停；隐藏时停止余音，不在回到页面时补播旧 cue。
    if (document.hidden) {
      this.fadeOut();
      void this.context.suspend();
    } else void this.context.resume().catch(() => {});
  };
  async unlock() {
    if (this.disposed) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume * 0.18;
      this.master.connect(this.context.destination);
      document.addEventListener("visibilitychange", this.visibility);
    }
    await this.context.resume();
    if (this.disposed) return;
    setMediaAudioState({ unlocked: true, muted: this.muted, volume: this.volume });
  }
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    setMediaAudioState({ volume: this.volume, muted: this.muted });
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.volume * 0.18,
        this.context.currentTime,
        0.15,
      );
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    this.setVolume(this.volume);
    if (muted) this.fadeOut();
  }
  /** 仅进入舞台且 AudioContext 已解锁后下载两个真实琴音；失败继续合成。 */
  preloadPiano() {
    if (!this.context || this.disposed) return;
    this.loading ??= Promise.all(
      [
        [60, "c4"],
        [69, "a4"],
      ].map(async ([midi, name]) => {
        const response = await fetch(assetUrl(`audio/piano-${name}.mp3`), {
          signal: this.abort.signal,
        });
        if (!response.ok) throw Error("sample unavailable");
        const buffer = await this.context!.decodeAudioData(
          await response.arrayBuffer(),
        );
        if (!this.disposed) this.samples.set(Number(midi), buffer);
      }),
    )
      .then(() => {})
      .catch(() => {});
  }
  private available() {
    return (
      !this.disposed &&
      !this.muted &&
      !document.hidden &&
      this.context?.state === "running"
    );
  }
  private voice(
    source: AudioScheduledSourceNode,
    level: number,
    start: number,
    length: number,
    filter?: BiquadFilterNode,
  ) {
    const ctx = this.context!;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(level, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length);
    if (filter) {
      source.connect(filter);
      filter.connect(gain);
    } else source.connect(gain);
    gain.connect(this.master!);
    const voice: Voice = {
      source,
      gain,
      cleanup: () => {
        source.disconnect();
        filter?.disconnect();
        gain.disconnect();
        this.voices.delete(voice);
      },
    };
    this.voices.add(voice);
    source.onended = voice.cleanup;
    source.start(start);
    source.stop(start + length + 0.05);
  }
  private synth(midi: number, at: number, length = 1.6) {
    for (const [multiple, level] of [
      [1, 0.7],
      [2, 0.15],
      [3, 0.035],
    ]) {
      const oscillator = this.context!.createOscillator();
      oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12) * multiple;
      this.voice(oscillator, level, at, length);
    }
  }
  playPiano(note = 60) {
    if (!this.available()) return;
    const ctx = this.context!;
    const key = note < 65 ? 60 : 69;
    const buffer = this.samples.get(key);
    if (buffer) {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = 2 ** ((note - key) / 12);
      this.voice(source, 0.85, ctx.currentTime, 2.1);
    } else this.synth(note, ctx.currentTime);
  }
  playEnding() {
    this.play(true);
  }
  play(ending = false) {
    if (!this.available()) return;
    this.fadeOut();
    const notes = ending
      ? [
          [72, 0.6],
          [76, 0.6],
          [79, 0.6],
          [84, 2.5],
        ]
      : [
          [67, 0.75],
          [67, 0.25],
          [69, 1],
          [67, 1],
          [72, 1],
          [71, 2],
          [67, 0.75],
          [67, 0.25],
          [69, 1],
          [67, 1],
          [74, 1],
          [72, 2],
          [67, 0.75],
          [67, 0.25],
          [79, 1],
          [76, 1],
          [72, 1],
          [71, 1],
          [69, 2],
          [77, 0.75],
          [77, 0.25],
          [76, 1],
          [72, 1],
          [74, 1],
          [72, 2],
        ];
    let at = this.context!.currentTime + 0.04;
    for (const [midi, beats] of notes) {
      this.synth(midi, at, beats * 0.38 + 0.6);
      at += beats * 0.38;
    }
  }
  foley(kind: Foley) {
    if (!this.available()) return;
    const ctx = this.context!,
      length = kind === "envelope" ? 0.55 : kind === "paper" ? 0.32 : 0.7;
    const buffer = ctx.createBuffer(
      1,
      Math.ceil(ctx.sampleRate * length),
      ctx.sampleRate,
    );
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] =
        (Math.random() * 2 - 1) *
        (0.65 + 0.35 * Math.sin((i / ctx.sampleRate) * 45));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = kind === "candle" ? 430 : 1300;
    filter.Q.value = 0.6;
    this.voice(
      source,
      kind === "candle" ? 0.16 : 0.11,
      ctx.currentTime,
      length,
      filter,
    );
  }
  roar() {
    if (!this.available()) return;
    const ctx = this.context!,
      length = 1.25,
      buffer = ctx.createBuffer(
        1,
        Math.ceil(ctx.sampleRate * length),
        ctx.sampleRate,
      ),
      data = buffer.getChannelData(0);
    let low = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      low = low * 0.94 + (Math.random() * 2 - 1) * 0.06;
      data[i] =
        (low * 2 + Math.sin(2 * Math.PI * (75 * t - 12 * t * t)) * 0.25) *
        (0.6 + 0.4 * Math.sin(t * 41));
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 650;
    this.voice(source, 0.7, ctx.currentTime, length, filter);
  }
  fadeOut() {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const voice of this.voices) {
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setTargetAtTime(0, now, 0.035);
      try {
        voice.source.stop(now + 0.15);
      } catch {
        voice.cleanup();
      }
    }
  }
  dispose() {
    this.disposed = true;
    this.detachMedia();
    setMediaAudioState({ unlocked: false });
    this.abort.abort();
    document.removeEventListener("visibilitychange", this.visibility);
    for (const voice of this.voices) {
      try {
        voice.source.stop();
      } catch {
        /* Already stopped. */
      }
      voice.cleanup();
    }
    this.voices.clear();
    this.samples.clear();
    this.master?.disconnect();
    void this.context?.close();
  }
}
