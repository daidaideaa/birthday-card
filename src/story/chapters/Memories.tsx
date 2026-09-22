import { useRef, useState } from "react";
import type { BirthdayStory, MemoryMoment } from "../../content/storyTypes";
import { MemoryImage, PhotoViewer, formatStoryDate } from "../MemoryImage";
import { reducedMotion } from "../../utils/device";

export function Memories({ data }: { data: BirthdayStory }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [visiblePhoto, setVisiblePhoto] = useState(0);
  const gallery = useRef<HTMLDivElement>(null);
  const first = data.firstMet;
  const items: MemoryMoment[] = [
    ...([
      first.date,
      first.place,
      first.memory,
      first.firstImpression,
      first.image,
    ].some((v) => v?.trim())
      ? [
          {
            title: first.title || "故事的开始",
            date: first.date,
            description: [first.place, first.memory, first.firstImpression]
              .filter(Boolean)
              .join(" · "),
            image: first.image,
          },
        ]
      : []),
    ...data.moments,
    ...data.timeline,
    ...data.places.map((p) => ({
      title: p.city,
      date: p.date,
      description: p.memory,
    })),
  ];
  const notes = [
    ...data.littleThings.map((n) => n.text),
    ...data.insideJokes.map((n) =>
      [n.title, n.note].filter(Boolean).join(" · "),
    ),
    ...data.stats.map((n) => n.label + "：" + (n.text ?? n.value)),
  ];
  const active = selected === null ? null : items[selected];
  const scrollToPhoto = (index: number) => {
    const root = gallery.current;
    const target = root?.children[index] as HTMLElement | undefined;
    const first = root?.firstElementChild as HTMLElement | null;
    if (!root || !target || !first) return;
    root.scrollTo({
      left: target.offsetLeft - first.offsetLeft,
      behavior: reducedMotion() ? "instant" : "smooth",
    });
  };
  return (
    <article className="memories-chapter">
      <div className="chapter-heading">
        <div>
          <span className="chapter-kicker">把日子收藏，把喜欢留下</span>
          <h2 tabIndex={-1}>
            和你有关的
            <br />
            <em>小小美好</em>
          </h2>
        </div>
        <p>
          有些瞬间不必很盛大，
          <br />
          只要想起，就会微笑。
        </p>
      </div>
      <div className="album-surface" data-navigation-lock>
        <div className="album-inscription" aria-hidden="true">
          <span>光阴的小小收藏</span>
          <span>FOR YOU</span>
        </div>
        <div
          ref={gallery}
          className="memory-gallery"
          role="region"
          aria-label="回忆照片，可左右滑动或使用照片按钮浏览"
          tabIndex={0}
          onKeyDown={(event) => {
            if (
              event.target !== event.currentTarget ||
              event.altKey ||
              event.ctrlKey ||
              event.metaKey
            )
              return;
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              scrollToPhoto(
                Math.max(
                  0,
                  Math.min(
                    items.length - 1,
                    visiblePhoto + (event.key === "ArrowRight" ? 1 : -1),
                  ),
                ),
              );
            }
          }}
          onScroll={(event) => {
            const root = event.currentTarget;
            const first = root.firstElementChild as HTMLElement | null;
            if (!first) return;
            const offsets = Array.from(root.children, (child) =>
              Math.abs(
                (child as HTMLElement).offsetLeft -
                  first.offsetLeft -
                  root.scrollLeft,
              ),
            );
            setVisiblePhoto(offsets.indexOf(Math.min(...offsets)));
          }}
        >
          {items.map((item, i) => (
            <figure className="memory-print" key={i}>
              <button
                className="photo-button"
                onClick={() => setSelected(i)}
                aria-label={"查看：" + item.title}
              >
                <div className="photo-mat">
                  <MemoryImage
                    path={item.image}
                    alt={item.title}
                    eager={i < 2}
                  />
                  <span className="photo-number">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="photo-expand" aria-hidden="true">
                    ↗
                  </span>
                </div>
              </button>
              <figcaption>
                {item.date && (
                  <span className="photo-date">
                    {formatStoryDate(item.date)}
                  </span>
                )}
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        {items.length > 1 && (
          <nav className="album-controls" aria-label="照片导航">
            <button
              onClick={() => scrollToPhoto(visiblePhoto - 1)}
              disabled={visiblePhoto === 0}
              aria-label="上一张照片"
            >
              ←
            </button>
            <span aria-live="polite" aria-atomic="true">
              {String(visiblePhoto + 1).padStart(2, "0")} /{" "}
              {String(items.length).padStart(2, "0")}
              <small>左右滑动，慢慢看</small>
            </span>
            <button
              onClick={() => scrollToPhoto(visiblePhoto + 1)}
              disabled={visiblePhoto === items.length - 1}
              aria-label="下一张照片"
            >
              →
            </button>
          </nav>
        )}
      </div>
      {notes.length > 0 && (
        <div className="memory-notes">
          {notes.map((text, i) => (
            <p key={i}>{text}</p>
          ))}
        </div>
      )}
      <div className="album-closing">
        <span /> 愿每一个普通的日子，都有小小的光。 <span />
      </div>
      {data.preview && (
        <p className="preview-note">
          风景与文字为效果示意，之后换成我们的照片和故事。
        </p>
      )}
      {active && (
        <PhotoViewer
          image={active.image}
          title={active.title}
          date={active.date ? formatStoryDate(active.date) : undefined}
          description={active.description}
          onClose={() => setSelected(null)}
        />
      )}
    </article>
  );
}
