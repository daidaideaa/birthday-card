import type { MemoryPlace } from "../../content/storyTypes";
import { formatStoryDate } from "../MemoryImage";
export function Places({ data }: { data: MemoryPlace[] }) {
  return (
    <article>
      <span className="chapter-kicker">OUR PLACES</span>
      <h2 tabIndex={-1}>Places that became memories.</h2>
      <ol className="place-route">
        {data.map((place, index) => (
          <li key={index}>
            <span className="place-pin" aria-hidden="true" />
            {place.date && (
              <span className="photo-date">{formatStoryDate(place.date)}</span>
            )}
            <h3>{place.city}</h3>
            {place.memory && <p>{place.memory}</p>}
          </li>
        ))}
      </ol>
    </article>
  );
}
