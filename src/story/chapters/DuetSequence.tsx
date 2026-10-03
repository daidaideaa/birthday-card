/**
 * 第三章前半与中段：弹琴 → 牵手 → 双人舞，全部由触摸伴奏驱动。
 *
 * 用户已选①：弹琴阶段驱动坐着的琴师；进入舞蹈后同一套伴奏键继续控制舞步。
 * 这里没有“播放舞蹈”按钮，也没有影片时钟。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { AccompanimentKeys } from "../../music/AccompanimentKeys";
import { PerformanceState, type PerformanceFrame } from "../../music/PerformanceState";
import { DuetStage } from "../../scene/DuetStage";
import { reducedMotion } from "../../utils/device";
import { AuthoredDuetStage } from "../../scene/AuthoredDuetStage";
import { DUET_TIMELINE } from "../../music/duetTimeline";

const authoredReview = import.meta.env.MODE === 'story-review';

/** 进入舞蹈所需的击键数：几个音就起身，不要求弹对旋律。 */
const NOTES_TO_RISE = 5;

export interface DuetSequenceProps {
  /** 立即发声的入口，由 AudioBus 提供。 */
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  /** 一轮编舞走完后通知外层，可以把注意力移向信。 */
  onSettled: () => void;
  /** 允许跳过舞蹈直接读信。 */
  onSkip: () => void;
}

export function DuetSequence({
  onNoteOn,
  onNoteOff,
  onSettled,
  onSkip,
}: DuetSequenceProps) {
  const host = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);
  const performance = useRef(new PerformanceState(authoredReview ? DUET_TIMELINE : undefined));
  const frameRef = useRef<PerformanceFrame>({
    progress: 0, phase: 0, mode: "waiting", rate: 1, accent: 0, completed: false,
  });
  const heldRef = useRef<readonly number[]>([]);
  /** 仅在语义变化时提交 React 状态，不每帧 setState。 */
  const [, setHeld] = useState<readonly number[]>([]);
  const [shot, setShot] = useState<"piano" | "duet">("piano");
  const [mode, setMode] = useState<PerformanceFrame["mode"]>("waiting");
  const [stageOk, setStageOk] = useState<boolean | null>(null);
  const strikes = useRef(0);
  const rose = useRef(false);
  const settledOnce = useRef(false);
  const settle = useRef(onSettled);
  settle.current = onSettled;
  /*
   * 释放回调只用 ref 传给卸载清理：若把它写进 effect 依赖，父组件每次
   * 重渲染（新的箭头函数身份）都会跑一遍清理，把演奏相位 reset 回原点，
   * 舞步会在弹奏中途突然归零。
   */
  const release = useRef(onNoteOff);
  release.current = onNoteOff;

  /** 单一驱动循环：推进相位，只在语义变化时同步到 React。 */
  useEffect(() => {
    let raf = 0;
    let previous = 0;
    let stop = false;
    let visible = true;
    let focused = true;
    const canRun = () => !stop && visible && focused && !document.hidden;
    const tick = (now: number) => {
      raf = 0;
      if (!canRun()) return;
      const dt = previous ? Math.min((now - previous) / 1000, authoredReview ? 1 : .1) : 1 / 60;
      previous = now;
      const current = heldRef.current;
      const frame = performance.current.advance(dt, current.length > 0);
      frameRef.current = frame;
      if (host.current) host.current.dataset.progress = frame.progress.toFixed(6);
      setMode((old) => (old === frame.mode ? old : frame.mode));
      if (authoredReview && !rose.current && frame.progress * DUET_TIMELINE.duration >= 3.2 && !current.length) {
        rose.current = true;
        setShot('duet');
      }
      if (frame.completed && !settledOnce.current && frame.mode !== "playing") {
        settledOnce.current = true;
        settle.current();
      }
      raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      const enabled = canRun();
      setActive(enabled);
      if (!enabled) {
        cancelAnimationFrame(raf);
        raf = 0;
        previous = 0;
        heldRef.current = [];
        performance.current.releaseInput();
        frameRef.current = performance.current.advance(0, false);
        setMode(frameRef.current.mode);
      } else if (!raf) {
        previous = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    if (host.current) observer.observe(host.current);
    const blur = () => { focused = false; sync(); };
    const focus = () => { focused = true; sync(); };
    window.addEventListener("blur", blur);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      stop = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("blur", blur);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  /** 只在真正离开本章时释放按住的音并归零相位。 */
  useEffect(() => {
    const state = performance.current;
    return () => {
      for (const note of heldRef.current) release.current(note);
      heldRef.current = [];
      state.reset();
    };
  }, []);

  /**
   * 键盘是按下状态的真相来源：静音或音频未解锁时琴键仍然跟手，
   * 舞台上的可见琴键与手部目标也据此更新。
   */
  const heldChange = useCallback((next: readonly number[]) => {
    heldRef.current = next;
    setHeld(next);
    /*
     * 起身进入舞蹈会让键盘轻量化、布局重排。只在手指全部离开键盘后
     * 才切换，否则正在滑奏的手指会因为键盘在指下改变尺寸而丢键。
     */
    if (!authoredReview && next.length === 0 && strikes.current >= NOTES_TO_RISE) setShot("duet");
  }, []);

  const noteOn = useCallback(
    (note: number, velocity: number) => {
      // 声音先响，再推进相位；不为等动画延迟发声。
      onNoteOn(note, velocity);
      performance.current.strike();
      strikes.current += 1;
    },
    [onNoteOn],
  );

  const hint =
    shot === "piano"
      ? mode === "waiting"
        ? "按住琴键试试，黑键也能弹。他会跟着你的手指落下。"
        : "多按几个音，他就会起身邀她跳舞。"
      : mode === "playing"
        ? "继续弹，舞步跟着你的节奏走。"
        : mode === "settling"
          ? "松手了，他们会自然收势停下。"
          : "随时再弹，他们会从现在的姿态继续。";

  return (
    <div ref={host} className="duet-sequence" data-shot={shot} data-mode={mode} data-active={active}>
      {authoredReview ? <AuthoredDuetStage frameRef={frameRef} heldRef={heldRef} onReady={setStageOk} /> : <DuetStage
        frameRef={frameRef}
        heldRef={heldRef}
        shot={shot}
        onReady={setStageOk}
      />}
      <AccompanimentKeys
        active={active && stageOk !== null}
        onNoteOn={noteOn}
        onNoteOff={onNoteOff}
        onHeldChange={heldChange}
        label={shot === "piano" ? "山顶的夜曲 · 送给你" : "你的伴奏 · 他们的舞步"}
        variant={shot === "piano" ? "stage" : "slim"}
      />
      <p className="accompaniment__hint" aria-live="polite">
        {stageOk === false
          ? "舞台画面暂时无法显示，但琴键仍然可以弹奏。"
          : reducedMotion()
            ? "你可以慢慢弹；已为你关掉大幅运镜。"
            : hint}
      </p>
      <button type="button" className="text-button letter-skip" onClick={onSkip}>
        想先看看写给你的话 →
      </button>
    </div>
  );
}
