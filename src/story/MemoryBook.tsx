import { useCallback, useEffect, useRef, useState } from "react";
import type { StoryController, StorySnapshot } from "./StoryController";
import { PageTurn } from "./PageTurn";
import { reducedMotion } from "../utils/device";
import { ChapterContent } from "./chapters/ChapterContent";
import { assetUrl } from "../utils/assetUrl";
interface Props {
  controller: StoryController;
  snapshot: StorySnapshot;
  onReplay: () => void;
  onEnding: () => void;
  onPiano: (note?: number) => void;
  onRoar: () => void;
}
export function MemoryBook({
  controller,
  snapshot,
  onReplay,
  onEnding,
  onPiano,
  onRoar,
}: Props) {
  const { index, direction, turn } = snapshot;
  const chapter = controller.chapters[index];
  const root = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const lockUntil = useRef(0);
  const [turning, setTurning] = useState(false);
  const nextDisabled = index === controller.chapters.length - 1;
  const go = useCallback(
    (delta: 1 | -1) => {
      if (performance.now() < lockUntil.current) return;
      if (controller.go(delta)) {
        lockUntil.current = performance.now() + (reducedMotion() ? 180 : 650);
        setTurning(true);
      }
    },
    [controller],
  );
  useEffect(() => {
    const timer = window.setTimeout(
      () => setTurning(false),
      reducedMotion() ? 180 : 650,
    );
    window.scrollTo({ top: 0, behavior: "instant" });
    root.current
      ?.querySelector<HTMLElement>("h2")
      ?.focus({ preventScroll: true });
    return () => clearTimeout(timer);
  }, [index]);
  useEffect(() => {
    const keyboard = (e: KeyboardEvent) => {
      if (
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.repeat ||
        window.getSelection()?.type === "Range" ||
        document.querySelector("dialog[open]")
      )
        return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest(
          'input,textarea,select,[contenteditable="true"],[data-navigation-lock]',
        )
      )
        return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        go(e.key === "ArrowRight" ? 1 : -1);
      }
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [go]);
  useEffect(() => {
    // 只预取紧邻下一页的前两张图片，不批量下载整本相册。
    const next = controller.chapters[index + 1]?.id;
    const data = controller.data;
    const paths =
      next === "moments"
        ? [
            data.firstMet.image,
            ...data.moments.map((e) => e.image),
            ...data.timeline.map((e) => e.image),
          ]
        : [];
    const links = paths
      .filter((p): p is string => Boolean(p))
      .slice(0, 2)
      .map((path) => {
        const link = document.createElement("link");
        link.rel = "prefetch";
        link.as = "image";
        const url = assetUrl(path);
        if (url) {
          link.href = url;
          document.head.appendChild(link);
        }
        return link;
      });
    return () => links.forEach((link) => link.remove());
  }, [controller, index]);
  return (
    <section
      ref={root}
      className={`memory-book chapter-${chapter.id}`}
      aria-label="生日纪念册"
      data-chapter={chapter.id}
      onTouchStart={(e) => {
        if (
          e.touches.length !== 1 ||
          (e.target as HTMLElement).closest(
            "button,a,dialog,input,textarea,[data-navigation-lock]",
          )
        ) {
          touch.current = null;
          return;
        }
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchCancel={() => {
        touch.current = null;
      }}
      onTouchEnd={(e) => {
        if (!touch.current) return;
        const dx = e.changedTouches[0].clientX - touch.current.x,
          dy = e.changedTouches[0].clientY - touch.current.y;
        touch.current = null;
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2)
          go(dx < 0 ? 1 : -1);
      }}
    >
      <div className="book-meta">
        <span>{chapter.label}</span>
        <span
          aria-label={`第 ${index + 1} 章，共 ${controller.chapters.length} 章`}
        >
          {String(index + 1).padStart(2, "0")} /{" "}
          {String(controller.chapters.length).padStart(2, "0")}
        </span>
      </div>
      <PageTurn direction={direction} turn={turn}>
        <ChapterContent
          controller={controller}
          snapshot={snapshot}
          onReplay={onReplay}
          onEnding={onEnding}
          onPiano={onPiano}
          onRoar={onRoar}
          onNext={() => go(1)}
        />
      </PageTurn>
      <button
        className="page-edge edge-left"
        aria-label="上一章"
        disabled={turning}
        onClick={() => go(-1)}
      >
        ‹
      </button>
      {!nextDisabled && (
        <button
          className="page-edge edge-right"
          aria-label="下一章"
          disabled={turning}
          onClick={() => go(1)}
        >
          ›
        </button>
      )}
      <nav className="book-navigation" aria-label="章节导航">
        <button onClick={() => go(-1)} disabled={turning}>
          ← 上一章
        </button>
        <span>慢慢看，不着急</span>
        <button onClick={() => go(1)} disabled={nextDisabled || turning}>
          下一章 →
        </button>
      </nav>
    </section>
  );
}
