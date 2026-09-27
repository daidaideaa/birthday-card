/**
 * 可触摸的伴奏键盘：弹琴阶段驱动琴师，舞蹈阶段驱动舞步（用户已选①）。
 *
 * 方案 §10.3 / §5.4：pointerdown 确定所有权，pointerup / pointercancel /
 * lostpointercapture / 失焦 / 换章都释放。滑奏使用坐标命中而不是 enter 事件，
 * 多指逐一跟踪。`touch-action: none` 只加在键盘本身，不整站禁用滚动。
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BLACK_AFTER_WHITE,
  BLACK_NOTES,
  NOTE_NAMES,
  SOLFEGE,
  WHITE_NOTES,
} from "../audio/PianoVoices";

export interface KeyboardProps {
  active?: boolean;
  /** 真正发声的入口；velocity 由按压位置推出。 */
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  /**
   * 按住的音高集合发生变化时通知外层。
   * 键盘自己是视觉真相来源：静音或音频尚未解锁时，琴键依然要跟手下沉。
   */
  onHeldChange?: (held: readonly number[]) => void;
  label: string;
  /** 舞蹈阶段的键盘轻量化，但仍是同一套可弹音高。 */
  variant?: "stage" | "slim";
}

/** 黑键宽度占单个白键的比例，与视觉宽度一致以保证命中准确。 */
const BLACK_WIDTH_RATIO = 0.62;

export function AccompanimentKeys({
  active = true,
  onNoteOn,
  onNoteOff,
  onHeldChange,
  label,
  variant = "stage",
}: KeyboardProps) {
  const root = useRef<HTMLDivElement>(null);
  /** pointerId → 当前该手指按住的音高。多指各自独立。 */
  const owned = useRef(new Map<number, number>());
  /** note → 按住它的指针数；与音频层的持有计数同构，但不依赖音频可用。 */
  const counts = useRef(new Map<number, number>());
  const [heldSet, setHeldSet] = useState<ReadonlySet<number>>(() => new Set());
  const notify = useRef(onHeldChange);
  notify.current = onHeldChange;

  /** 提交按住集合；只在实际变化时 setState。 */
  const commit = useCallback(() => {
    const next = new Set<number>();
    for (const [note, count] of counts.current) if (count > 0) next.add(note);
    // 更新函数必须是纯的：这里只算新集合，通知外层放在下面的 effect 里。
    setHeldSet((old) =>
      old.size === next.size && [...next].every((n) => old.has(n)) ? old : next,
    );
  }, []);

  /** 按住集合变化后再通知外层，避免在渲染期间更新父组件状态。 */
  useEffect(() => {
    notify.current?.([...heldSet]);
  }, [heldSet]);

  /** 同键多指用计数，一指松开不截断另一指。 */
  const press = useCallback(
    (note: number) => {
      counts.current.set(note, (counts.current.get(note) ?? 0) + 1);
      commit();
    },
    [commit],
  );
  const lift = useCallback(
    (note: number) => {
      const left = (counts.current.get(note) ?? 0) - 1;
      if (left > 0) counts.current.set(note, left);
      else counts.current.delete(note);
      commit();
    },
    [commit],
  );

  /**
   * 坐标命中：先测黑键（在上层），再回落到白键。
   * 滑奏时每次 pointermove 重新求解，因此跨键不依赖 enter/leave。
   */
  const noteAt = useCallback((
    clientX: number,
    clientY: number,
    /**
     * 滑奏时手指会上下漂移。已持有这根手指时把纵坐标夹回键面，
     * 只有横向滑出键盘两端才真正松键——这才是真实琴键的手感。
     */
    clampY = false,
  ): number | null => {
    const host = root.current;
    if (!host) return null;
    const bounds = host.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    const x = clientX - bounds.left;
    let y = clientY - bounds.top;
    if (x < 0 || x > bounds.width) return null;
    if (clampY) y = Math.max(0, Math.min(bounds.height, y));
    else if (y < 0 || y > bounds.height) return null;
    const whiteWidth = bounds.width / WHITE_NOTES.length;
    // 黑键只占键盘上部；下半部分即使水平落在黑键范围内也算白键。
    const blackHeight = bounds.height * 0.62;
    if (y <= blackHeight) {
      for (const note of BLACK_NOTES) {
        const after = BLACK_AFTER_WHITE[note];
        const centre = (after + 1) * whiteWidth;
        const half = (whiteWidth * BLACK_WIDTH_RATIO) / 2;
        if (x >= centre - half && x <= centre + half) return note;
      }
    }
    const index = Math.min(WHITE_NOTES.length - 1, Math.max(0, Math.floor(x / whiteWidth)));
    return WHITE_NOTES[index];
  }, []);

  /** 按压位置越靠键面下缘力度越大，给演奏一点表情。 */
  const velocityAt = useCallback((clientY: number) => {
    const host = root.current;
    if (!host) return 0.8;
    const bounds = host.getBoundingClientRect();
    if (!bounds.height) return 0.8;
    const ratio = (clientY - bounds.top) / bounds.height;
    return Math.max(0.45, Math.min(1, 0.55 + ratio * 0.5));
  }, []);

  /**
   * 回调用 ref 持有：父组件每次重渲染都会传入新的函数标识，
   * 若让生命周期 effect 依赖它们，effect 的清理会在演奏中途误清按住状态。
   */
  const noteOffRef = useRef(onNoteOff);
  noteOffRef.current = onNoteOff;
  const noteOnRef = useRef(onNoteOn);
  noteOnRef.current = onNoteOn;

  const release = useCallback(
    (pointerId: number) => {
      const note = owned.current.get(pointerId);
      if (note === undefined) return;
      owned.current.delete(pointerId);
      // -1 表示这根手指当前滑到了键盘外，已经释放过。
      if (note < 0) return;
      lift(note);
      noteOffRef.current(note);
    },
    [lift],
  );

  const releaseEverything = useCallback(() => {
      for (const pointerId of [...owned.current.keys()]) release(pointerId);
      // 键盘操作留下的持有计数也一并清空。
      for (const note of [...counts.current.keys()]) noteOffRef.current(note);
      counts.current.clear();
      commit();
  }, [release, commit]);

  useEffect(() => {
    if (!active) releaseEverything();
  }, [active, releaseEverything]);

  /** 失焦、隐藏页面与卸载都要清空按住的音，避免黏音。 */
  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) releaseEverything();
    };
    window.addEventListener("blur", releaseEverything);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("blur", releaseEverything);
      document.removeEventListener("visibilitychange", onHidden);
      releaseEverything();
    };
    // 只在挂载 / 卸载时安装：依赖回调标识会让演奏中途被误清。
  }, [releaseEverything]);

  const down = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active) return;
    const note = noteAt(event.clientX, event.clientY);
    if (note === null) return;
    // 键盘接管这根手指，所以此处阻止默认滚动/缩放，但只在键盘内。
    event.preventDefault();
    const host = root.current;
    // 捕获让 move/up 始终回到键盘，即使手指滑出元素边界。
    try {
      host?.setPointerCapture(event.pointerId);
    } catch {
      /* 某些浏览器在 touch 上可能拒绝，坐标命中仍然有效。 */
    }
    owned.current.set(event.pointerId, note);
    press(note);
    noteOnRef.current(note, velocityAt(event.clientY));
  };

  const move = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!owned.current.has(event.pointerId)) return;
    const previous = owned.current.get(event.pointerId)!;
    // 滑奏中纵向漂移不松键，只有横向滑出键盘才释放。
    const note = noteAt(event.clientX, event.clientY, true);
    if (note === null) {
      // 滑出键盘：释放，但保留这根手指的所有权以便滑回来。
      if (previous < 0) return;
      owned.current.set(event.pointerId, -1);
      lift(previous);
      noteOffRef.current(previous);
      return;
    }
    if (note === previous) return;
    owned.current.set(event.pointerId, note);
    // 滑奏：先释放旧键再触发新键，键位按轨迹改变。
    if (previous >= 0) {
      lift(previous);
      noteOffRef.current(previous);
    }
    press(note);
    noteOnRef.current(note, velocityAt(event.clientY));
  };

  const up = (event: React.PointerEvent<HTMLDivElement>) => {
    release(event.pointerId);
  };

  return (
    <div className={`accompaniment accompaniment--${variant}`} data-navigation-lock>
      <div className="accompaniment__label">
        <span>{label}</span>
        <span aria-hidden="true">♫</span>
      </div>
      <div
        ref={root}
        className="accompaniment__keys"
        role="group"
        aria-label="可弹奏的琴键，按住、滑动或多指同时按都可以"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onLostPointerCapture={up}
      >
        {WHITE_NOTES.map((note) => (
          <button
            key={note}
            disabled={!active}
            type="button"
            className={"key key--white" + (heldSet.has(note) ? " is-held" : "")}
            aria-label={`弹奏${SOLFEGE[note]}`}
            aria-pressed={heldSet.has(note)}
            onKeyDown={(event) => {
              if (event.key !== " " && event.key !== "Enter") return;
              event.preventDefault();
              if (event.repeat) return;
              press(note);
              noteOnRef.current(note, 0.8);
            }}
            onKeyUp={(event) => {
              if (event.key !== " " && event.key !== "Enter") return;
              lift(note);
              noteOffRef.current(note);
            }}
            onBlur={() => {
              // 焦点离开时若仍在按住，释放它。
              if (!heldSet.has(note)) return;
              lift(note);
              noteOffRef.current(note);
            }}
          >
            <span aria-hidden="true">{NOTE_NAMES[note]}</span>
          </button>
        ))}
        {BLACK_NOTES.map((note) => (
          <button
            key={note}
            disabled={!active}
            type="button"
            className={"key key--black" + (heldSet.has(note) ? " is-held" : "")}
            style={{
              // 与 noteAt 的命中计算共用同一组比例，视觉与手感一致。
              left: `calc(${((BLACK_AFTER_WHITE[note] + 1) / WHITE_NOTES.length) * 100}% - ${
                (BLACK_WIDTH_RATIO / WHITE_NOTES.length) * 50
              }%)`,
              width: `${(BLACK_WIDTH_RATIO / WHITE_NOTES.length) * 100}%`,
            }}
            aria-label={`弹奏${SOLFEGE[note]}`}
            aria-pressed={heldSet.has(note)}
            onKeyDown={(event) => {
              if (event.key !== " " && event.key !== "Enter") return;
              event.preventDefault();
              if (event.repeat) return;
              press(note);
              noteOnRef.current(note, 0.8);
            }}
            onKeyUp={(event) => {
              if (event.key !== " " && event.key !== "Enter") return;
              lift(note);
              noteOffRef.current(note);
            }}
            onBlur={() => {
              if (!heldSet.has(note)) return;
              lift(note);
              noteOffRef.current(note);
            }}
          />
        ))}
      </div>
    </div>
  );
}
