import { useRef, type CSSProperties } from "react";
import type { TimelineEvent } from "../../content/storyTypes";
import { formatStoryDate, MemoryImage } from "../MemoryImage";
export function Timeline({
  data,
  selected,
  select,
}: {
  data: TimelineEvent[];
  selected: number | null;
  select: (index: number | null) => void;
}) {
  const hoverOpened = useRef<number | null>(null);
  return (
    <article>
      <span className="chapter-kicker">OUR TIMELINE</span>
      <h2 tabIndex={-1}>Look how far we've come.</h2>
      <ol className="memory-timeline">
        {data.map((event, index) => (
          <li
            key={index}
            className={event.isBirthday ? "birthday-event" : ""}
            style={
              {
                "--reveal-delay": `${Math.min(index * 75, 600)}ms`,
              } as CSSProperties
            }
          >
            <button
              className="timeline-trigger"
              aria-expanded={selected === index}
              aria-controls={`timeline-detail-${index}`}
              onMouseEnter={(e) => {
                if (
                  matchMedia("(hover: hover)").matches &&
                  e.buttons === 0 &&
                  selected !== index
                ) {
                  hoverOpened.current = index;
                  select(index);
                }
              }}
              onMouseLeave={() => {
                hoverOpened.current = null;
              }}
              onClick={() => {
                if (hoverOpened.current === index) {
                  hoverOpened.current = null;
                  return;
                }
                select(selected === index ? null : index);
              }}
            >
              <span className="timeline-dot" aria-hidden="true" />
              <span className="timeline-date">
                {event.isBirthday ? "BIRTHDAY" : formatStoryDate(event.date)}
              </span>
              <span>{event.title}</span>
              <span className="timeline-toggle" aria-hidden="true">
                {selected === index ? "−" : "+"}
              </span>
            </button>
            <div
              id={`timeline-detail-${index}`}
              className="timeline-detail"
              hidden={selected !== index}
            >
              {event.description && <p>{event.description}</p>}
              {selected === index && (
                <MemoryImage
                  path={event.image}
                  alt={event.title || "Timeline photograph"}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
