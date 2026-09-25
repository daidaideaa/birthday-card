import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PuppyCue, PuppyMood } from "./TeddyDog";
import type { ChapterId } from "../content/storyTypes";
import { getMediaActive, subscribeMediaActivity } from "../cinematic/mediaActivity";
import { PackedPetPlayer } from "./PackedPetPlayer";
import { gazeDirection, PetIntent, petMedia, type PetAction, type PetBase, type PetVariant } from "./petMedia";
import "./pet.css";

export type SceneCue = { kind: PuppyCue; serial: number };
const variants: PetVariant[] = ["apricot", "cream"];
const quietServer = () => false;

export function PetCompanion({ chapter, celebrating, cardOpen, session, cue }: {
  chapter: ChapterId;
  celebrating: boolean;
  cardOpen: boolean;
  session: number;
  cue: SceneCue;
}) {
  const host = useRef<HTMLElement>(null);
  const slots = useRef<(HTMLDivElement | null)[]>([]);
  const players = useRef<(PackedPetPlayer | undefined)[]>([]);
  const intents = useRef([new PetIntent(), new PetIntent()]);
  const request = useRef<(index: number, action: PetAction) => void>(() => {});
  const resync = useRef<() => void>(() => {});
  const feedbackTimer = useRef<number | undefined>(undefined);
  const seenCue = useRef(cue.serial);
  const [petted, setPetted] = useState<number | null>(null);
  const [calm, setCalm] = useState(false);
  const [failed, setFailed] = useState<boolean[]>([false, false]);
  const [missingPoster, setMissingPoster] = useState<boolean[]>([false, false]);
  const filmActive = useSyncExternalStore(subscribeMediaActivity, getMediaActive, quietServer);
  const mood: PuppyMood = celebrating ? "happy" : chapter === "letter" ? "sleepy" : cardOpen || chapter !== "birthday" ? "curious" : "welcome";
  const base: PetBase = mood === "sleepy" ? "rest" : "idle";
  const config = useRef({ filmActive, cardOpen, base });
  config.current = { filmActive, cardOpen: cardOpen || chapter !== "birthday", base };

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let visible = false;
    let active = false;
    let dead = false;
    let gaze: -1 | 0 | 1 = 0;
    const broken = new Set<number>();
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const markFailed = (index: number) => {
      broken.add(index);
      players.current[index]?.setActive(false);
      if (!dead) setFailed((old) => old.map((value, i) => i === index ? true : value));
    };
    const play = (index: number, action: PetAction) => {
      if (active && !broken.has(index) && intents.current[index].request(action, performance.now())) players.current[index]?.play(action);
    };
    request.current = play;
    const sync = () => {
      const settings = config.current;
      active = visible && !document.hidden && !reduced.matches && !settings.filmActive && settings.cardOpen;
      setCalm(reduced.matches || settings.filmActive);
      variants.forEach((variant, index) => {
        const intent = intents.current[index];
        intent.reset(settings.base);
        // Before opening the card, no video element or WebGL context is created.
        if (active && !broken.has(index) && !players.current[index] && slots.current[index]) {
          try {
            players.current[index] = new PackedPetPlayer(
              slots.current[index]!, variant,
              (action) => {
                if (!active || dead) return;
                const next = intents.current[index].complete(action);
                if (next) players.current[index]?.play(next);
              },
              () => markFailed(index),
            );
          } catch { markFailed(index); }
        }
        players.current[index]?.setActive(active && !broken.has(index));
        if (active && !broken.has(index)) players.current[index]?.play(settings.base);
      });
    };
    resync.current = sync;
    const intersection = new IntersectionObserver(([entry]) => {
      if (visible === entry.isIntersecting) return;
      visible = entry.isIntersecting;
      sync();
    });
    intersection.observe(el);
    const pointer = (event: PointerEvent) => {
      if (!active || event.pointerType === "touch") return;
      const next = gazeDirection((event.clientX / innerWidth - 0.5) * 2, gaze);
      if (next === gaze) return;
      gaze = next;
      if (next) variants.forEach((_, index) => play(index, next < 0 ? "look-left" : "look-right"));
    };
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    window.addEventListener("pointermove", pointer, { passive: true });
    sync();
    return () => {
      dead = true;
      active = false;
      intersection.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      window.removeEventListener("pointermove", pointer);
      clearTimeout(feedbackTimer.current);
      players.current.forEach((player) => player?.dispose());
      players.current = [];
      request.current = () => {};
      resync.current = () => {};
    };
  }, []);

  useEffect(() => { resync.current(); }, [filmActive, cardOpen, chapter, session]);
  useEffect(() => {
    intents.current.forEach((intent, index) => {
      if (intent.setBase(base, performance.now())) players.current[index]?.play(base);
    });
  }, [base]);
  useEffect(() => {
    if (seenCue.current === cue.serial) return;
    seenCue.current = cue.serial;
    if (filmActive) return;
    const action: PetAction = cue.kind === "piano" ? "look-left" : "happy";
    variants.forEach((_, index) => request.current(index, action));
  }, [cue.kind, cue.serial, filmActive]);
  useEffect(() => {
    if (celebrating) variants.forEach((_, index) => request.current(index, "happy"));
  }, [celebrating]);
  useEffect(() => { setPetted(null); clearTimeout(feedbackTimer.current); }, [session]);

  const pet = (index: number) => {
    if (index === 2) variants.forEach((_, i) => request.current(i, "happy"));
    else request.current(index, "pet");
    setPetted(index);
    clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setPetted(null), 2600);
  };

  return (
    <aside ref={host} className={`pet-companion pet-duo pet-${mood}${calm ? " is-calm" : ""}${petted !== null ? " is-petted" : ""}`} aria-label="杏色与奶油色的两只泰迪">
      <div className="pet-portraits">
        {variants.map((variant, index) => (
          <button key={variant} type="button" className={`pet-portrait${failed[index] ? " is-fallback" : ""}${petted === index ? " is-loved" : ""}`} aria-label={index ? "摸摸奶油色泰迪" : "摸摸杏色泰迪"} onClick={() => pet(index)}>
            {missingPoster[index]
              ? <span className="pet-missing-poster" aria-hidden="true">♡</span>
              : <img className="pet-poster" src={petMedia.poster(variant)} alt="" width="384" height="384" draggable={false} onError={() => setMissingPoster((old) => old.map((value, i) => i === index ? true : value))} />}
            <div className="pet-film" ref={(node) => { slots.current[index] = node; }} />
            <span className="pet-touch-heart" aria-hidden="true">♡</span>
          </button>
        ))}
      </div>
      <div className="pet-dialogue" aria-live="polite" aria-atomic="true">
        {petted === 2 ? "两份喜欢，都给你！" : petted === 0 ? "摸摸收到啦，最喜欢你了 ♡" : petted === 1 ? "再靠近一点，陪着你 ♡" : filmActive || mood === "sleepy" ? "嘘，我们陪你听。" : celebrating ? "两份喜欢，都给你！" : "摸摸我们，陪你一起过生日"}
      </div>
      <button type="button" className="pet-play" onClick={() => pet(2)}>一起玩 <span aria-hidden="true">↗</span></button>
    </aside>
  );
}
