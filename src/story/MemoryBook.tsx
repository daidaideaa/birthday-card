import { useCallback, useEffect, useRef } from "react";
import type { StoryController, StorySnapshot } from "./StoryController";
import { PageTurn } from "./PageTurn";
import { ChapterContent } from "./chapters/ChapterContent";
import { runtimeAssetUrl as assetUrl } from "../utils/runtimeAssetUrl";
import { FILM_PORTRAIT_QUERY } from "../cinematic/media";
interface Props {
  controller: StoryController;
  snapshot: StorySnapshot;
  onReplay: () => void;
  onEnding: () => void;
  onPiano: (note?: number) => void;
  onRoar: () => void;
  onNavigate: (delta: 1 | -1) => void;
  transitioning: boolean;
}
export function MemoryBook({
  controller,
  snapshot,
  onReplay,
  onEnding,
  onPiano,
  onRoar,
  onNavigate,
  transitioning,
}: Props) {
  const { index } = snapshot;
  const chapter = controller.chapters[index];
  const root = useRef<HTMLElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const nextDisabled = index === controller.chapters.length - 1;
  const go = useCallback(
    (delta: 1 | -1) => {
      onNavigate(delta);
    },
    [onNavigate],
  );
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    root.current
      ?.querySelector<HTMLElement>("h2")
      ?.focus({ preventScroll: true });
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
    const device = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };
    if (device.connection?.saveData) return;
    const next = controller.chapters[index + 1]?.id;
    const abort = new AbortController();
    const preload = () => {
      if (document.hidden) return;
      const aspect = matchMedia(FILM_PORTRAIT_QUERY).matches ? "portrait" : "landscape";
      const paths = next === "letter" ? [`cinema/duet-${aspect}.webp`]
        : next === "finalWish" ? [`cinema/pride-${aspect}.webp`] : [];
      if (next === "letter") void import("./chapters/Letter").catch(() => {});
      if (next === "finalWish")
        void import("./chapters/FinalWish").catch(() => {});
      paths.forEach((path) => {
        void fetch(assetUrl(path), {
          signal: abort.signal,
          cache: "force-cache",
        }).catch(() => {});
      });
    };
    const idle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(preload, { timeout: 2500 })
        : setTimeout(preload, 1800);
    return () => {
      abort.abort();
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, [controller, index]);
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
      <PageTurn>
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
        disabled={transitioning}
        onClick={() => go(-1)}
      >
        ‹
      </button>
      {!nextDisabled && (
        <button
          className="page-edge edge-right"
          aria-label="下一章"
          disabled={transitioning}
          onClick={() => go(1)}
        >
          ›
        </button>
      )}
      <nav className="book-navigation" aria-label="章节导航">
        <button onClick={() => go(-1)} disabled={transitioning}>
          ← 上一章
        </button>
        <span>慢慢看，不着急</span>
        <button onClick={() => go(1)} disabled={nextDisabled || transitioning}>
          下一章 →
        </button>
      </nav>
    </section>
  );
}
