import { useCallback, useEffect, useRef, useState } from 'react';

type Chord = readonly [number, number, number, number];
type Profile = { chords: readonly Chord[]; barSeconds: number; level: number; tone: number; noteLevel: number };
type Instrument = 'piano' | 'bell' | 'pad' | 'bass';
type Note = { time: number; midi: number; instrument: Instrument; level: number; pan: number; duration: number };
type Voice = { oscillators: OscillatorNode[]; gain: GainNode; pan: StereoPannerNode };

// Original, unmetered phrases. A shared pitch collection lets chapter changes
// blend naturally while the voicing and spaces between notes change their mood.
const PROFILES: readonly Profile[] = [
  { chords: [[57, 60, 64, 71], [53, 60, 64, 67], [50, 57, 60, 64], [55, 62, 67, 69]], barSeconds: 15.6, level: .43, tone: 2200, noteLevel: .032 },
  { chords: [[48, 55, 62, 64], [53, 60, 64, 67], [57, 60, 64, 71], [55, 62, 67, 69]], barSeconds: 13.8, level: .47, tone: 2600, noteLevel: .033 },
  { chords: [[53, 60, 64, 67], [57, 60, 64, 67], [50, 57, 60, 64], [48, 55, 62, 64]], barSeconds: 16.2, level: .36, tone: 1800, noteLevel: .028 },
  { chords: [[48, 55, 62, 67], [55, 62, 67, 69], [57, 64, 67, 71], [53, 60, 64, 67]], barSeconds: 14.4, level: .44, tone: 2350, noteLevel: .032 },
  { chords: [[53, 60, 64, 67], [48, 55, 64, 67], [57, 60, 64, 71], [48, 55, 62, 64]], barSeconds: 15.2, level: .46, tone: 2450, noteLevel: .032 },
];
const PHRASES = [[2, 1, 3], [3, 2, 0], [1, 3, 2], [2, 0, 1]] as const;
const MAX_OSCILLATORS = 28;
const profileFor = (chapter: number) => PROFILES[Math.max(0, Math.min(PROFILES.length - 1, Math.floor(chapter)))];
const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

function hold(parameter: AudioParam, time: number) {
  if (typeof parameter.cancelAndHoldAtTime === 'function') parameter.cancelAndHoldAtTime(time);
  else {
    const value = parameter.value;
    parameter.cancelScheduledValues(time);
    parameter.setValueAtTime(value, time);
  }
}

function roomImpulse(context: AudioContext) {
  const length = Math.ceil(context.sampleRate * 3.4);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  let seed = 849371;
  for (let channel = 0; channel < 2; channel += 1) {
    const data = buffer.getChannelData(channel); let softNoise = 0;
    for (let i = 0; i < length; i += 1) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      softNoise = softNoise * .65 + (seed / 4294967296 * 2 - 1) * .35;
      const time = i / context.sampleRate;
      const arrival = Math.min(1, Math.max(0, (time - .018) / .055));
      data[i] = softNoise * arrival * Math.exp(-time * 2.05) * (1 - i / length);
    }
    for (const [delay, level] of [[.029, .12], [.061, .08], [.103, .045]]) {
      data[Math.round((delay + channel * .007) * context.sampleRate)] += level;
    }
  }
  return buffer;
}

class MemoryScore {
  private readonly context: AudioContext;
  private readonly input: GainNode;
  private readonly tone: BiquadFilterNode;
  private readonly master: GainNode;
  private readonly nodes: AudioNode[];
  private readonly warmWave: PeriodicWave;
  private readonly voices = new Set<Voice>();
  private events: Note[] = [];
  private timer: number | undefined;
  private stopTimer: number | undefined;
  private nextBar = 0;
  private bar = 0;
  private chapter: number;
  private enabled = false;
  private disposed = false;
  private epoch = 0;

  constructor(chapter: number, private readonly report: (playing: boolean) => void) {
    this.chapter = chapter;
    this.context = new AudioContext({ latencyHint: 'playback' });
    const context = this.context;
    this.input = context.createGain();
    const highpass = context.createBiquadFilter(); highpass.type = 'highpass'; highpass.frequency.value = 38; highpass.Q.value = .5;
    this.tone = context.createBiquadFilter(); this.tone.type = 'lowpass'; this.tone.frequency.value = profileFor(chapter).tone; this.tone.Q.value = .45;
    const dry = context.createGain(); dry.gain.value = .86;
    const room = context.createConvolver(); room.buffer = roomImpulse(context); room.normalize = true;
    const wet = context.createGain(); wet.gain.value = .24;
    this.master = context.createGain(); this.master.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -23; compressor.knee.value = 15; compressor.ratio.value = 2;
    compressor.attack.value = .025; compressor.release.value = .7;
    this.input.connect(highpass).connect(this.tone);
    this.tone.connect(dry).connect(this.master);
    this.tone.connect(room).connect(wet).connect(this.master);
    this.master.connect(compressor).connect(context.destination);
    this.nodes = [this.input, highpass, this.tone, dry, room, wet, this.master, compressor];
    this.warmWave = context.createPeriodicWave(new Float32Array(4), new Float32Array([0, 1, .065, .018]));
    document.addEventListener('visibilitychange', this.visibility);
  }

  toggle() {
    if (this.disposed) return;
    this.enabled = !this.enabled;
    this.report(this.enabled);
    if (this.enabled) void this.resume();
    else this.quiet();
  }

  setChapter(chapter: number) {
    if (this.chapter === chapter || this.disposed) return;
    this.chapter = chapter;
    if (!this.enabled || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    const profile = profileFor(chapter);
    hold(this.tone.frequency, now); this.tone.frequency.linearRampToValueAtTime(profile.tone, now + 4);
    hold(this.master.gain, now); this.master.gain.linearRampToValueAtTime(profile.level, now + 4.5);
    // Give the old phrase a breath, then let the next harmony enter under its tail.
    const turn = now + 3.8;
    this.nextBar = Math.min(this.nextBar, turn);
    this.events = this.events.filter((event) => event.time < turn);
    this.bar = 0;
  }

  private visibility = () => {
    if (!this.enabled || this.disposed) return;
    if (document.hidden) this.quiet();
    else void this.resume();
  };

  private async resume() {
    if (!this.enabled || this.disposed || document.hidden) return;
    const epoch = ++this.epoch;
    clearTimeout(this.stopTimer); this.stopTimer = undefined;
    try {
      await this.context.resume();
      if (epoch !== this.epoch || !this.enabled || this.disposed || document.hidden) {
        if (!this.disposed && (!this.enabled || document.hidden)) void this.context.suspend().catch(() => undefined);
        return;
      }
      if (this.context.state !== 'running') throw new Error('Audio did not resume');
      const now = this.context.currentTime; const profile = profileFor(this.chapter);
      hold(this.master.gain, now); this.master.gain.linearRampToValueAtTime(profile.level, now + 1.8);
      hold(this.tone.frequency, now); this.tone.frequency.linearRampToValueAtTime(profile.tone, now + 2.2);
      this.events = []; this.nextBar = now + .22;
      clearInterval(this.timer); this.timer = window.setInterval(this.tick, 160);
      this.tick();
    } catch {
      if (epoch === this.epoch && !this.disposed) { this.enabled = false; this.report(false); this.quiet(); }
    }
  }

  private quiet() {
    const epoch = ++this.epoch;
    clearInterval(this.timer); this.timer = undefined; this.events = [];
    clearTimeout(this.stopTimer);
    if (this.context.state === 'closed') return;
    const now = this.context.currentTime;
    hold(this.master.gain, now); this.master.gain.linearRampToValueAtTime(0, now + .08);
    // Stop every scheduled source, including notes whose start time is in the future.
    for (const voice of this.voices) {
      // This envelope survives a quick off→on even if the master fade is cancelled.
      hold(voice.gain.gain, now); voice.gain.gain.linearRampToValueAtTime(0, now + .075);
      for (const oscillator of voice.oscillators) {
        try { oscillator.stop(now + .09); } catch { /* A just-ended source is already silent. */ }
      }
    }
    this.stopTimer = window.setTimeout(() => {
      if (this.disposed || epoch !== this.epoch) return;
      for (const voice of this.voices) { voice.gain.disconnect(); voice.pan.disconnect(); voice.oscillators.forEach((oscillator) => oscillator.disconnect()); }
      this.voices.clear();
      void this.context.suspend().catch(() => {
        if (!this.disposed && epoch === this.epoch) { this.enabled = false; this.report(false); }
      });
    }, 130);
  }

  private queuePhrase(at: number) {
    const profile = profileFor(this.chapter);
    const chord = profile.chords[this.bar % profile.chords.length];
    const length = profile.barSeconds;
    chord.forEach((midi, index) => this.events.push({ time: at + index * .09, midi, instrument: 'pad', level: .0078, pan: (index - 1.5) * .19, duration: length + .9 }));
    this.events.push({ time: at + .1, midi: chord[0] - 12, instrument: 'bass', level: .009, pan: 0, duration: length - 1.1 });
    const phrase = PHRASES[this.bar % PHRASES.length];
    const times = this.bar % 2 ? [.13, .43, .72] : [.07, .35, .68];
    phrase.forEach((tone, index) => {
      let midi = chord[tone];
      while (midi < 64) midi += 12;
      const bell = index === 2 && (this.bar + this.chapter) % 4 === 3;
      this.events.push({ time: at + length * times[index], midi: midi + (bell ? 12 : 0), instrument: bell ? 'bell' : 'piano', level: profile.noteLevel * (index === 1 ? .78 : .94) * (bell ? .56 : 1), pan: index === 1 ? .14 : -.16, duration: bell ? 5.8 : 5.1 });
    });
    this.events.sort((a, b) => a.time - b.time);
    this.nextBar = at + length; this.bar += 1;
  }

  private tick = () => {
    if (this.disposed || !this.enabled || document.hidden || this.context.state !== 'running') return;
    const now = this.context.currentTime;
    if (this.nextBar < now - 1) this.nextBar = now + .08;
    if (this.nextBar <= now + .25) this.queuePhrase(this.nextBar);
    while (this.events.length && this.events[0].time <= now + .25) {
      const note = this.events.shift()!;
      if (note.time >= now - .35) this.sound({ ...note, time: Math.max(note.time, now + .012) });
    }
  };

  private sound(note: Note) {
    const partials = note.instrument === 'piano' ? [[1, 1], [2.003, .21], [3.998, .035]] : note.instrument === 'bell' ? [[1, 1], [2.011, .13], [4.03, .02]] : [[1, 1]];
    const count = [...this.voices].reduce((total, voice) => total + voice.oscillators.length, 0);
    if (count + partials.length > MAX_OSCILLATORS) return;
    const context = this.context; const gain = context.createGain(); const pan = context.createStereoPanner();
    gain.gain.value = 0;
    pan.pan.value = note.pan; gain.connect(pan).connect(this.input);
    const sustained = note.instrument === 'pad' || note.instrument === 'bass';
    const attack = sustained ? 1.9 : note.instrument === 'bell' ? .06 : .034;
    const start = note.time; const end = start + note.duration;
    gain.gain.setValueAtTime(.00001, start);
    gain.gain.linearRampToValueAtTime(note.level, start + attack);
    if (sustained) { gain.gain.linearRampToValueAtTime(note.level * .8, end - 2.8); gain.gain.exponentialRampToValueAtTime(.00001, end); }
    else { gain.gain.exponentialRampToValueAtTime(note.level * .38, start + .48); gain.gain.exponentialRampToValueAtTime(.00001, end); }
    const voice: Voice = { oscillators: [], gain, pan }; let remaining = partials.length;
    this.voices.add(voice);
    partials.forEach(([multiple, level]) => {
      const oscillator = context.createOscillator(); const partial = context.createGain();
      if (note.instrument === 'pad') oscillator.setPeriodicWave(this.warmWave);
      else oscillator.type = 'sine';
      oscillator.frequency.value = frequency(note.midi) * multiple;
      oscillator.detune.value = note.instrument === 'pad' ? note.pan * 5 : 0;
      partial.gain.value = level; oscillator.connect(partial).connect(gain); voice.oscillators.push(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect(); partial.disconnect(); remaining -= 1;
        if (remaining === 0) { gain.disconnect(); pan.disconnect(); this.voices.delete(voice); }
      };
      oscillator.start(start); oscillator.stop(end + .04);
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.enabled = false; this.epoch += 1;
    clearInterval(this.timer); clearTimeout(this.stopTimer); this.events = [];
    document.removeEventListener('visibilitychange', this.visibility);
    for (const voice of this.voices) {
      voice.oscillators.forEach((oscillator) => { try { oscillator.stop(); } catch { /* Already ended. */ } oscillator.disconnect(); });
      voice.gain.disconnect(); voice.pan.disconnect();
    }
    this.voices.clear(); this.nodes.forEach((node) => node.disconnect());
    void this.context.close().catch(() => undefined);
  }
}

export default function useMusic(chapter: number) {
  const score = useRef<MemoryScore | null>(null);
  const latestChapter = useRef(chapter); latestChapter.current = chapter;
  const mounted = useRef(true);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { score.current?.setChapter(chapter); }, [chapter]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; score.current?.dispose(); score.current = null; };
  }, []);
  const toggle = useCallback(() => {
    try {
      if (!score.current) score.current = new MemoryScore(latestChapter.current, (value) => { if (mounted.current) setPlaying(value); });
      score.current.toggle();
    } catch { score.current?.dispose(); score.current = null; setPlaying(false); }
  }, []);
  return { playing, toggle };
}
