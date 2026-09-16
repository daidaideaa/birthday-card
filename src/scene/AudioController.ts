export class AudioController {
  private context?: AudioContext;
  private master?: GainNode;
  private voices: OscillatorNode[] = [];
  muted = false;
  async unlock() {
    this.context ??= new AudioContext();
    await this.context.resume();
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    if (muted) this.fadeOut();
  }
  play() {
    const ctx = this.context;
    if (!ctx || ctx.state !== "running" || this.muted) return;
    this.fadeOut();
    const master = ctx.createGain();
    master.gain.value = 0.18;
    master.connect(ctx.destination);
    this.master = master;
    // Familiar melody, synthesized locally. Gentle fundamentals and fading bell overtones.
    const notes = [
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
