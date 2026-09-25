import { CinematicDirector } from "../../cinematic/CinematicDirector";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { StoryController, StorySnapshot } from "../StoryController";
import { CakeViewport } from "../../scene/CakeViewport";
import { SavannaLife } from "../../scene/CinemaVignettes";
export function FinalWish({
  controller,
  snapshot,
  onReplay,
  onEnding,
  onRoar,
}: {
  controller: StoryController;
  snapshot: StorySnapshot;
  onReplay: () => void;
  onEnding: () => void;
  onRoar: () => void;
}) {
  const stage = useRef<HTMLElement>(null);
  const state = snapshot.finalState;
  const [filmFinished, setFilmFinished] = useState(false);
  const filmEnding = useRef<number | undefined>(undefined);
  const showFilm = !filmFinished && state === "lit";
  const continueToWish = () => {
    clearTimeout(filmEnding.current);
    setFilmFinished(true);
    requestAnimationFrame(() => {
      stage.current?.scrollIntoView({ block: "start", behavior: "instant" });
      stage.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    });
  };
  useEffect(() => () => clearTimeout(filmEnding.current), []);
  const ending = useRef(onEnding);
  ending.current = onEnding;
  useEffect(() => {
    if (state !== "complete") return;
    // Removing the cake shortens the chapter; keep the actual wish in view.
    window.scrollTo({ top: 0, behavior: "instant" });
    stage.current
      ?.querySelector<HTMLElement>(".wish-complete h2")
      ?.focus({ preventScroll: true });
  }, [state]);
  useEffect(() => {
    if (state !== "extinguishing") return;
    const director = new CinematicDirector(1.6);
    director.timeline.call(
      () => {
        ending.current();
        controller.finishWish();
      },
      [],
      1.6,
    );
    const detach = director.attach(stage.current!);
    director.play();
    return () => {
      detach();
      director.dispose();
    };
  }, [controller, state]);
  return (
    <article
      ref={stage}
      className={`final-wish wish-${state} ${showFilm ? "wish-film-arrival" : "wish-candle-reveal"}`}
      data-candle-state={state}
    >
      {state !== "complete" ? (
        <>
          <span className="chapter-kicker">{showFilm ? "从晨光，到星河" : "把愿望，交给今晚的星光"}</span>
          <h2 tabIndex={-1}>{showFilm ? "愿你勇敢，也一直被爱。" : `许个愿吧，${controller.data.person.name}。`}</h2>
          {!showFilm && controller.data.finalWish && (
            <p className="personal-wish">{controller.data.finalWish}</p>
          )}
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
            {controller.data.person.name}，<br />
            生日快乐。<span>愿你一直勇敢，也一直被爱。</span>
          </h2>
          <button className="story-link" onClick={onReplay}>
            再看一次这份惊喜
          </button>
        </div>
      )}
      <div className="birthday-finale-stage">
        {showFilm && (
          <>
            <SavannaLife onRoar={onRoar} onPlaybackStart={() => clearTimeout(filmEnding.current)} onComplete={() => {
              clearTimeout(filmEnding.current);
              filmEnding.current = window.setTimeout(continueToWish, 900);
            }} />
            <button className="text-button wish-film-skip" onClick={continueToWish}>把这份勇气，带进生日愿望 →</button>
          </>
        )}
        {!showFilm && state !== "complete" && (
          <div className="birthday-candle-stage">
            <CakeViewport
              state={state}
              onExtinguish={() => controller.extinguish()}
            />
            <p className="candle-instruction" role="status" aria-live="polite">
              {state === "lit"
                ? "准备好了，就轻轻点一下烛火。"
                : "愿望已经出发，幸福正在路上。"}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
