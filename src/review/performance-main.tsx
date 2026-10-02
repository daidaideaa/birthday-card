import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState } from 'react';
import { AuthoredDuetStage } from '../scene/AuthoredDuetStage';
import type { PerformanceFrame } from '../music/PerformanceState';
import { PianoVoices } from '../audio/PianoVoices';
import { AccompanimentKeys } from '../music/AccompanimentKeys';
import { PerformanceState } from '../music/PerformanceState';
import { DUET_TIMELINE } from '../music/duetTimeline';
import './performance-review.css';

function PerformanceReview() {
  const frame = useRef<PerformanceFrame>({ phase: 0, progress: 0, mode: 'waiting', rate: 1, accent: 0, completed: false });
  const held = useRef<readonly number[]>([]);
  const [time, setTime] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1);
  const [ready, setReady] = useState(false), [muted, setMuted] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [view, setView] = useState<'wide' | 'piano' | 'hands'>('wide');
  const performance = useRef(new PerformanceState(DUET_TIMELINE));
  const voices = useRef<PianoVoices | null>(null), context = useRef<AudioContext | null>(null), output = useRef<GainNode | null>(null);
  useEffect(() => {
    let raf = 0, previous = 0;
    const tick = (now: number) => {
      const dt = previous ? Math.min(1, (now - previous) / 1000) : 0; previous = now;
      if (interactive && ready && !document.hidden) {
        frame.current = performance.current.advance(dt, held.current.length > 0);
        setTime(frame.current.progress * 26);
      } else if (playing && ready && !document.hidden) {
        const t = Math.min(26, frame.current.progress * 26 + dt * speed);
        frame.current = { ...frame.current, progress: t / 26, phase: t / 26, mode: 'playing' };
        setTime(t); if (t === 26) setPlaying(false);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [playing, ready, speed, interactive]);
  useEffect(() => {
    const stop = () => { setPlaying(false); voices.current?.releaseAll(); held.current = []; performance.current.releaseInput(); frame.current = { ...frame.current, mode: 'waiting' }; };
    window.addEventListener('blur', stop); document.addEventListener('visibilitychange', stop);
    return () => { window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop); voices.current?.releaseAll(); void context.current?.close(); };
  }, []);
  const seek = (t: number) => { setTime(t); frame.current = { ...frame.current, progress: t / 26, phase: t / 26, mode: 'waiting' }; };
  const noteOn = (note: number, velocity: number) => {
    if (!context.current) {
      const ctx = new AudioContext(); context.current = ctx; output.current = ctx.createGain(); output.current.gain.value = muted ? 0 : .4; output.current.connect(ctx.destination);
      voices.current = new PianoVoices(ctx, output.current, new Map());
    }
    void context.current.resume(); voices.current?.noteOn(note, velocity);
    if (interactive) performance.current.strike();
  };
  return <main className="performance-review">
    <header><span>第三章 · 制作预览</span><h1>暮色里，与你共舞</h1><p>拖动场景旋转视角，逐段检查人物与接触动作。</p></header>
    <AuthoredDuetStage frameRef={frame} heldRef={held} onReady={setReady} inspect view={view} />
    <section className="review-transport" aria-label="动作审阅">
      <button onClick={() => { setInteractive(false); if (time >= 26) seek(0); setPlaying(!playing); }} disabled={!ready}>{playing ? '暂停' : '播放动作'}</button>
      <button aria-pressed={interactive} onClick={() => { setPlaying(false); setInteractive(!interactive); performance.current.reset(); seek(0); }}>琴键控制动作</button>
      <button onClick={() => { setPlaying(false); performance.current.reset(); seek(0); }}>回到开头</button>
      <select aria-label="播放速度" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={1}>正常速度</option><option value={.5}>半速</option><option value={.25}>四分之一速</option></select>
      <output>{time.toFixed(2)} / 26 秒</output>
      <nav aria-label="审阅视角">{([['wide', '全身构图'], ['piano', '琴键与坐姿'], ['hands', '手掌接触']] as const).map(([v, label]) => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{label}</button>)}</nav>
      <input aria-label="动作时间" type="range" min={0} max={26} step={.01} value={time} onChange={e => { setPlaying(false); setInteractive(false); seek(Number(e.target.value)); }} />
      <nav aria-label="动作片段">{[[0, '弹琴'], [4.3, '起身'], [7.2, '走近'], [9.8, '邀请'], [11.2, '牵手'], [14, '侧步'], [18, '转身'], [25, '收势']].map(([t, label]) => <button key={label} onClick={() => { setPlaying(false); setInteractive(false); seek(Number(t)); }}>{label}</button>)}</nav>
    </section>
    <AccompanimentKeys active={ready} onNoteOn={noteOn} onNoteOff={n => voices.current?.noteOff(n)} onHeldChange={v => { held.current = v; }} label="试弹 · 即时琴声" variant="slim" />
    <button className="mute-button" onClick={() => { setMuted(!muted); if (output.current) output.current.gain.value = muted ? .4 : 0; }}>{muted ? '开启声音' : '静音'}</button>
  </main>;
}

createRoot(document.getElementById('root')!).render(<PerformanceReview />);
