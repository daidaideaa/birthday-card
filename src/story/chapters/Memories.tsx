import { useState } from "react";
import type { MemoryMoment } from "../../content/storyTypes";
import { formatStoryDate, MemoryImage, PhotoViewer } from "../MemoryImage";
export function Memories({ data }: { data: MemoryMoment[] }) {
  const [selected, setSelected] = useState<MemoryMoment | null>(null);
  return (
    <article>
      <span className="chapter-kicker">THINGS WE DID TOGETHER</span>
      <h2 tabIndex={-1}>Some ordinary days became my favorite memories.</h2>
      <div className="memory-scatter">
        {data.map((moment, index) => (
          <figure className="memory-print" key={index}>
            {moment.image && (
              <button
                className="photo-button"
                aria-label={`Enlarge ${moment.title || "memory photograph"}`}
                onClick={() => setSelected(moment)}
              >
                <MemoryImage
                  path={moment.image}
                  alt={moment.title || "Memory photograph"}
                />
              </button>
            )}
            <figcaption>
              {moment.date && (
                <span className="photo-date">
                  {formatStoryDate(moment.date)}
                </span>
              )}
              {moment.title && <h3>{moment.title}</h3>}
              {moment.description && <p>{moment.description}</p>}
            </figcaption>
          </figure>
        ))}
      </div>
      {selected && (
        <PhotoViewer {...selected} onClose={() => setSelected(null)} />
      )}
    </article>
  );
}
