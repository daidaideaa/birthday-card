import type { FirstMeeting } from "../../content/storyTypes";
import { formatStoryDate, MemoryImage } from "../MemoryImage";
export function FirstMet({ data }: { data: FirstMeeting }) {
  return (
    <article className="first-met">
      <span className="chapter-kicker">FIRST MET</span>
      <h2 tabIndex={-1}>The day our story began.</h2>
      {data.date && <p className="first-date">{formatStoryDate(data.date)}</p>}
      {data.place && <p className="first-place">{data.place}</p>}
      <div className={`first-details ${data.image ? "with-photo" : ""}`}>
        <div>
          {data.title && <h3>{data.title}</h3>}
          {data.memory && <p>{data.memory}</p>}
          {data.firstImpression && (
            <blockquote>{data.firstImpression}</blockquote>
          )}
        </div>
        {data.image && (
          <figure className="printed-photo">
            <MemoryImage
              path={data.image}
              alt={data.title || "The day we first met"}
            />
          </figure>
        )}
      </div>
    </article>
  );
}
