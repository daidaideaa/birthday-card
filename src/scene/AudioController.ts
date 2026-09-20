export class AudioController {
  private context?: AudioContext;
  private master?: GainNode;
  private voices: OscillatorNode[] = [];
  private noise?: AudioBufferSourceNode;
  muted = false;
  private volume = 1;
  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        0.18 * this.volume,
        this.context.currentTime,
        0.2,
      );
  }
  playEnding() {
    this.play(true);
  }
  /** 原创短音型；按键与自动短句共用音量和静音控制。 */
  playPiano(note?: number) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || this.muted) return;
    this.fadeOut();
    const master = ctx.createGain();
    master.gain.value = 0.15 * Math.max(this.volume, 0.4);
    master.connect(ctx.destination);
    this.master = master;
    const notes =
      note === undefined ? [60, 64, 67, 71, 69, 67, 64, 62, 60] : [note];
    notes.forEach((midi, i) => {
      const at = ctx.currentTime + i * 0.47;
      for (const [multiple, strength] of [
        [1, 0.75],
        [2, 0.18],
        [3, 0.07],
      ]) {
        const voice = ctx.createOscillator(),
          gain = ctx.createGain();
        voice.type = "sine";
        voice.frequency.value = 440 * 2 ** ((midi - 69) / 12) * multiple;
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(strength, at + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, at + 1.6);
        voice.connect(gain);
        gain.connect(master);
        voice.start(at);
        voice.stop(at + 1.7);
        this.voices.push(voice);
        voice.onended = () => {
          voice.disconnect();
          gain.disconnect();
          this.voices = this.voices.filter((v) => v !== voice);
        };
      }
    });
  }
  /** 点击触发的短促低声回应，不加载远程音频，不自动播放。 */
  roar() {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || this.muted) return;
    this.fadeOut();
    const length = 1.25,
      buffer = ctx.createBuffer(
        1,
        Math.ceil(ctx.sampleRate * length),
        ctx.sampleRate,
      );
    const data = buffer.getChannelData(0);
    let low = 0;
    for (let i = 0; i < data.length; i++) {
      const t = i / ctx.sampleRate;
      low = low * 0.94 + (Math.random() * 2 - 1) * 0.06;
      data[i] =
        (low * 2 + Math.sin(2 * Math.PI * (75 * t - 12 * t * t)) * 0.25) *
        (0.6 + 0.4 * Math.sin(t * 41));
    }
    const noise = ctx.createBufferSource(),
      filter = ctx.createBiquadFilter(),
      gain = ctx.createGain();
    filter.type = "lowpass";
    filter.frequency.value = 650;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.17, now + 0.14);
    gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    noise.buffer = buffer;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    this.master = gain;
    this.noise = noise;
    noise.start();
    noise.onended = () => {
      noise.disconnect();
      filter.disconnect();
      if (this.noise === noise) this.noise = undefined;
    };
  }
  async unlock() {
    this.context ??= new AudioContext();
    await this.context.resume();
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.fadeOut();
  }
  play(ending = false) {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || this.muted) return;
    this.fadeOut();
    const master = ctx.createGain();
    master.gain.value = 0.18 * this.volume;
    master.connect(ctx.destination);
    this.master = master;
    // Familiar melody, synthesized locally. Gentle fundamentals and fading bell overtones.
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
    let at = ctx.currentTime + 0.04;
    for (const [midi, beats] of notes) {
      const length = beats * 0.38;
      for (const [multiple, level] of [
        [1, 0.7],
        [2, 0.18],
        [3, 0.045],
      ]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 440 * 2 ** ((midi - 69) / 12) * multiple;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, at);
        gain.gain.linearRampToValueAtTime(level, at + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + length + 0.6);
        osc.connect(gain);
        gain.connect(master);
        osc.start(at);
        osc.stop(at + length + 0.65);
        this.voices.push(osc);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
          this.voices = this.voices.filter((v) => v !== osc);
        };
      }
      at += length;
    }
  }
  fadeOut() {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    try {
      this.noise?.stop(now + 0.1);
    } catch {
      /* 音源可能已结束。 */
    }
    this.noise = undefined;
    const old = this.master;
    old.gain.cancelScheduledValues(now);
    old.gain.setTargetAtTime(0, now, 0.09);
    for (const voice of this.voices) {
      try {
        voice.stop(now + 0.4);
      } catch {
        /* Already ended. */
      }
    }
    this.voices = [];
    window.setTimeout(() => old.disconnect(), 500);
    this.master = undefined;
  }
  dispose() {
    this.fadeOut();
    void this.context?.close();
  }
}
