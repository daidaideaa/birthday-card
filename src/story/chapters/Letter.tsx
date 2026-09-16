import type { StoryLetter } from "../../content/storyTypes";
export function Letter({
  data,
  name,
  open,
  onOpen,
  onNext,
}: {
  data: StoryLetter;
  name: string;
  open: boolean;
  onOpen: () => void;
  onNext: () => void;
}) {
  return (
    <article className={`letter-chapter ${open ? "letter-open" : ""}`}>
      <span className="chapter-kicker">JUST A FEW WORDS, FOR YOU</span>
      <h2 tabIndex={-1}>A Letter for You</h2>
      {!open ? (
        <div className="envelope-scene">
          <div className="letter-envelope" aria-hidden="true">
            <div className="envelope-flap" />
            <div className="envelope-seal">{name.charAt(0).toUpperCase()}</div>
            <span>FOR {name.toUpperCase()}</span>
          </div>
          <button className="chapter-action" onClick={onOpen}>
            Open the letter
          </button>
        </div>
      ) : (
        <div className="letter-paper">
          {data.greeting && <p className="letter-greeting">{data.greeting}</p>}
          {data.paragraphs.map((paragraph, index) => (
            <p className="letter-paragraph" key={index}>
              {paragraph}
            </p>
          ))}
          {data.ending && <p className="letter-ending">{data.ending}</p>}
          {data.signature && (
            <p className="letter-signature">{data.signature}</p>
          )}
          <div className="letter-last">
            <p>One last thing.</p>
            <button className="chapter-action" onClick={onNext}>
              Make a wish →
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
