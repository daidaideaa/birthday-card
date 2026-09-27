import { CinematicDirector } from "../../cinematic/CinematicDirector";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { StoryController, StorySnapshot } from "../StoryController";
import { CakeViewport } from "../../scene/CakeViewport";
import { SavannaStory } from "../../scene/SavannaStory";
import "./final-wish.css";

export function FinalWish({ controller, snapshot, onReplay, onEnding, onRoar, onReadLetter }: {
  controller: StoryController; snapshot: StorySnapshot; onReplay: () => void;
  onEnding: () => void; onRoar: () => void; onReadLetter?: () => void;
}) {
  const stage = useRef<HTMLElement>(null);
  const state = snapshot.finalState;
  const [storyFinished, setStoryFinished] = useState(state !== "lit");
  const showStory = !storyFinished && state === "lit";
  const ending = useRef(onEnding);
  ending.current = onEnding;
  const continueToWish = () => {
    setStoryFinished(true);
    requestAnimationFrame(() => {
      stage.current?.scrollIntoView({ block: "start", behavior: "instant" });
      stage.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    });
  };
  useEffect(() => {
    if (state !== "extinguishing" && state !== "celebrating") return;
    const duration = state === "extinguishing" ? 1.6 : 6.4;
    const director = new CinematicDirector(duration);
    director.timeline.call(() => {
      if (state === "extinguishing") { ending.current(); controller.celebrateWish(); }
      else controller.finishWish();
    }, [], duration);
    const detach = director.attach(stage.current!);
    director.play();
    return () => { detach(); director.dispose(); };
  }, [controller, state]);
  const celebrating = state === "celebrating" || state === "complete";
  return <article ref={stage} className={`final-wish wish-${state} ${showStory ? "wish-story-arrival" : "wish-candle-reveal"}`} data-candle-state={state}>
    <span className="chapter-kicker">{showStory ? "从晨光，到星河" : "把愿望，交给今晚的星光"}</span>
    <h2 tabIndex={-1}>{showStory ? "愿你勇敢，也一直被爱。" : celebrating ? <>{controller.data.person.name}，<br/><span className="wish-title-line">生日快乐。</span></> : `许个愿吧，${controller.data.person.name}。`}</h2>
    {!showStory && <p className="personal-wish">{controller.data.finalWish || "愿你一直勇敢，也一直被爱。"}</p>}
    <div className="birthday-finale-stage">
      {showStory ? <SavannaStory onRoar={onRoar} onComplete={continueToWish}/> : <div className="birthday-candle-stage">
        <div className="wish-window" aria-hidden="true">
          {[0,1,2].map(burst => <div key={burst} className="wish-firework" style={{"--burst":burst} as CSSProperties}>{Array.from({length:12},(_,i) => <i key={i} style={{"--ray":i} as CSSProperties}/>)}</div>)}
        </div>
        <CakeViewport state={state} onExtinguish={() => controller.extinguish()}/>
        <p className="candle-instruction" role="status">{state === "lit" ? "准备好了，就轻轻点一下烛火。" : state === "extinguishing" ? "愿望已经出发。" : "今晚的星光，都为你而亮。"}</p>
      </div>}
    </div>
    {celebrating && <div className="wish-complete wish-keepsake">
      <p>把这一刻，慢慢收藏。</p>
      <div className="wish-final-actions"><button className="story-link" onClick={onReplay}>再走一遍</button>{onReadLetter && <button className="story-link" onClick={onReadLetter}>重读那封信</button>}</div>
    </div>}
  </article>;
}
