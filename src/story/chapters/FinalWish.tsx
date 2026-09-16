import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import type { StoryController, StorySnapshot } from "../StoryController";
export function FinalWish({
  controller,
  snapshot,
  onReplay,
  onEnding,
}: {
  controller: StoryController;
  snapshot: StorySnapshot;
  onReplay: () => void;
  onEnding: () => void;
}) {
  const state = snapshot.finalState;
  const ending = useRef(onEnding);
  ending.current = onEnding;
  useEffect(() => {
    if (state !== "extinguishing") return;
    const timer = window.setTimeout(() => {
      ending.current();
      controller.finishWish();
    }, 850);
    return () => clearTimeout(timer);
  }, [controller, state]);
  return (
    <article className={`final-wish wish-${state}`} data-candle-state={state}>
      {state !== "complete" ? (
        <>
          <span className="chapter-kicker">ONE LAST THING</span>
          <h2 tabIndex={-1}>Make a wish.</h2>
          {controller.data.finalWish && (
            <p className="personal-wish">{controller.data.finalWish}</p>
          )}
          <div className="wish-cake">
            <svg viewBox="0 0 400 350" aria-hidden="true" focusable="false">
              <defs>
                <linearGradient id="wish-icing" x2="0" y2="1">
                  <stop stopColor="#efd3d0" />
                  <stop offset="1" stopColor="#c88d9e" />
                </linearGradient>
                <linearGradient id="wish-top">
                  <stop stopColor="#e7bdbb" />
                  <stop offset="1" stopColor="#f2d6c6" />
                </linearGradient>
              </defs>
              <ellipse
                cx="200"
                cy="310"
                rx="155"
                ry="20"
                fill="#060306"
                opacity=".3"
              />
              <ellipse cx="200" cy="293" rx="145" ry="21" fill="#a28353" />
              <ellipse cx="200" cy="288" rx="140" ry="18" fill="#d7b47d" />
              <path
                d="M75 196H325V274C310 300 90 300 75 274Z"
                fill="url(#wish-icing)"
              />
              <path
                d="M76 244Q200 278 324 244"
                fill="none"
                stroke="#fae7cc"
                strokeWidth="8"
              />
              <ellipse
                cx="200"
                cy="197"
                rx="125"
                ry="24"
                fill="url(#wish-top)"
              />
              <path
                d="M75 196Q200 235 325 196V215Q310 242 297 223Q282 252 268 227Q252 255 237 232Q220 260 205 234Q186 258 171 232Q152 252 138 226Q119 249 106 220Q89 240 75 215Z"
                fill="#f8e5cd"
              />
              <ellipse cx="200" cy="191" rx="121" ry="23" fill="#fff0d9" />
              <g fill="#c68195">
                <circle cx="91" cy="273" r="5" />
                <circle cx="116" cy="281" r="5" />
                <circle cx="143" cy="285" r="5" />
                <circle cx="171" cy="288" r="5" />
                <circle cx="200" cy="289" r="5" />
                <circle cx="229" cy="288" r="5" />
                <circle cx="257" cy="285" r="5" />
                <circle cx="284" cy="281" r="5" />
                <circle cx="309" cy="273" r="5" />
              </g>
            </svg>
            <button
              className="wish-candle"
              aria-label="Blow out the candle"
              disabled={state !== "lit"}
              onClick={() => controller.extinguish()}
            >
              <span className="candle-halo" />
              <span className="candle-flame" />
              <span className="candle-wick" />
              <span className="candle-wax" />
            </button>
          </div>
          <p className="candle-instruction">
            {state === "lit"
              ? "Tap the candle when you’re ready."
              : "A little wish, just for you."}
          </p>
        </>
      ) : (
        <div className="wish-complete">
          <div className="wish-stars" aria-hidden="true">
            {Array.from({ length: 18 }, (_, index) => (
              <i
                key={index}
                style={
                  {
                    "--star-x": `${Math.cos(index * 2.4) * (100 + index * 8)}px`,
                    "--star-y": `${Math.sin(index * 2.4) * (80 + index * 5)}px`,
                    "--star-delay": `${(index % 4) * 70}ms`,
                  } as CSSProperties
                }
              >
                ✧
              </i>
            ))}
          </div>
          <h2 tabIndex={-1}>
            Happy Birthday, {controller.data.person.name}. <span>♥</span>
          </h2>
          <button className="story-link" onClick={onReplay}>
            Replay our story
          </button>
        </div>
      )}
    </article>
  );
}
