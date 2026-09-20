import { useState } from "react";
import type { BirthdayStory, MemoryMoment } from "../../content/storyTypes";
import { MemoryImage, PhotoViewer, formatStoryDate } from "../MemoryImage";

export function Memories({ data }: { data: BirthdayStory }) {
  const [selected, setSelected] = useState<number | null>(null);
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
      <div className="memory-gallery">
        {items.map((item, i) => (
          <figure className="memory-print" key={i}>
            <button
              className="photo-button"
              onClick={() => setSelected(i)}
              aria-label={"查看：" + item.title}
            >
              <div className="photo-mat">
                <MemoryImage path={item.image} alt={item.title} eager={i < 2} />
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
                <span className="photo-date">{formatStoryDate(item.date)}</span>
              )}
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </figcaption>
          </figure>
        ))}
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
