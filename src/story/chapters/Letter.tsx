import { PianoDance } from "../../scene/CinemaVignettes";
import type { StoryLetter } from "../../content/storyTypes";
export function Letter({
  data,
  name,
  open,
  onOpen,
  onNext,
  onPiano,
}: {
  onPiano: (note?: number) => void;
  data: StoryLetter;
  name: string;
  open: boolean;
  onOpen: () => void;
  onNext: () => void;
}) {
  return (
    <article className={"letter-chapter " + (open ? "letter-open" : "")}>
      <span className="chapter-kicker">有些话，想慢慢说给你听</span>
      <h2 tabIndex={-1}>
        一封小小的<em>心意</em>
      </h2>
      <PianoDance onPlay={onPiano} />
      {!open ? (
        <div className="envelope-scene">
          <button
            className="letter-envelope"
            onClick={onOpen}
            aria-label={"打开给" + name + "的信"}
          >
            <span className="envelope-flap" />
            <span className="envelope-seal">师</span>
            <span className="envelope-address">{name} 亲启</span>
            <span className="envelope-postmark">愿你 · 每天开心</span>
          </button>
          <button className="chapter-action" onClick={onOpen}>
            拆开这封信 <span>↗</span>
          </button>
        </div>
      ) : (
        <div className="letter-paper">
          {data.greeting && <p className="letter-greeting">{data.greeting}</p>}
          {data.paragraphs.map((p, i) => (
            <p className="letter-paragraph" key={i}>
              {p}
            </p>
          ))}
          {data.ending && <p className="letter-ending">{data.ending}</p>}
          {data.signature && (
            <p className="letter-signature">{data.signature}</p>
          )}
          <button className="chapter-action" onClick={onNext}>
            最后，一起许个愿 <span>→</span>
          </button>
        </div>
      )}
    </article>
  );
}
