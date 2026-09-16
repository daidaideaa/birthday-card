import type { LittleThing } from "../../content/storyTypes";
export function LittleThings({
  data,
  count,
  reveal,
}: {
  data: LittleThing[];
  count: number;
  reveal: () => void;
}) {
  return (
    <article className="little-things">
      <span className="chapter-kicker">LITTLE THINGS</span>
      <h2 tabIndex={-1}>Little things I never told you I remembered.</h2>
      <div
        className="little-notes"
        aria-live="polite"
        aria-relevant="additions"
      >
        {data.slice(0, count).map((item, index) => (
          <p className="little-note" key={index}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {item.text}
          </p>
        ))}
      </div>
      {count < data.length ? (
        <button className="chapter-action" onClick={reveal}>
          {count ? "One more little thing" : "Unfold a little note"}{" "}
          <span aria-hidden="true">＋</span>
        </button>
      ) : (
        <p className="chapter-closing">I notice more than you think.</p>
      )}
    </article>
  );
}
