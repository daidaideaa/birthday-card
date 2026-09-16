import type { InsideJoke } from "../../content/storyTypes";
export function InsideJokes({ data }: { data: InsideJoke[] }) {
  return (
    <article>
      <span className="chapter-kicker">JUST BETWEEN US</span>
      <h2 tabIndex={-1}>
        Things that make absolutely no sense to anyone else.
      </h2>
      <div className="joke-board">
        {data.map((joke, index) => (
          <section className="joke-note" key={index}>
            <span className="note-doodle" aria-hidden="true">
              {index % 2 ? "✧" : "〰"}
            </span>
            {joke.title && <h3>{joke.title}</h3>}
            {joke.note && <p>{joke.note}</p>}
          </section>
        ))}
      </div>
    </article>
  );
}
