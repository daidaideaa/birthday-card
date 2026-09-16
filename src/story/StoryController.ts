import type { BirthdayStory, Chapter } from "../content/storyTypes";
const filled = (value?: string) => Boolean(value?.trim());
export function prepareStory(source: BirthdayStory): BirthdayStory {
  return {
    ...source,
    timeline: source.timeline.filter(
      (e) =>
        filled(e.date) ||
        filled(e.title) ||
        filled(e.description) ||
        filled(e.image),
    ),
    moments: source.moments.filter(
      (e) => filled(e.title) || filled(e.description) || filled(e.image),
    ),
    littleThings: source.littleThings.filter((e) => filled(e.text)),
    insideJokes: source.insideJokes.filter(
      (e) => filled(e.title) || filled(e.note),
    ),
    places: source.places.filter((e) => filled(e.city) || filled(e.memory)),
    stats: source.stats.filter(
      (e) => filled(e.label) && (Number.isFinite(e.value) || filled(e.text)),
    ),
    letter: {
      ...source.letter,
      paragraphs: source.letter.paragraphs.filter(filled),
    },
  };
}
export function getChapters(source: BirthdayStory): Chapter[] {
  const data = prepareStory(source);
  const chapters: Chapter[] = [{ id: "birthday", label: "BIRTHDAY WISHES" }];
  const first = data.firstMet;
  if (
    [
      first.date,
      first.place,
      first.memory,
      first.firstImpression,
      first.image,
    ].some(filled)
  )
    chapters.push({ id: "firstMet", label: "THE BEGINNING" });
  const groups = [
    ["timeline", "OUR TIMELINE"],
    ["moments", "OUR MEMORIES"],
    ["littleThings", "LITTLE THINGS"],
    ["insideJokes", "JUST BETWEEN US"],
    ["places", "OUR PLACES"],
    ["stats", "BY THE NUMBERS"],
  ] as const;
  groups.forEach(([id, label]) => {
    if (data[id].length) chapters.push({ id, label });
  });
  if (data.letter.paragraphs.length)
    chapters.push({ id: "letter", label: "A LETTER FOR YOU" });
  chapters.push({ id: "finalWish", label: "ONE LAST WISH" });
  return chapters;
}
export interface StorySnapshot {
  index: number;
  direction: 1 | -1;
  turn: number;
  session: number;
  letterOpen: boolean;
  revealedCount: number;
  timelineIndex: number | null;
  finalState: "lit" | "extinguishing" | "complete";
}
const initial = (): StorySnapshot => ({
  index: 0,
  direction: 1,
  turn: 0,
  session: 0,
  letterOpen: false,
  revealedCount: 0,
  timelineIndex: null,
  finalState: "lit",
});
export class StoryController {
  readonly data: BirthdayStory;
  readonly chapters: Chapter[];
  private snapshot = initial();
  private listeners = new Set<() => void>();
  constructor(source: BirthdayStory) {
    this.data = prepareStory(source);
    this.chapters = getChapters(this.data);
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private change(patch: Partial<StorySnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  go(delta: 1 | -1) {
    const index = Math.max(
      0,
      Math.min(this.chapters.length - 1, this.snapshot.index + delta),
    );
    if (index === this.snapshot.index) return false;
    this.change({ index, direction: delta, turn: this.snapshot.turn + 1 });
    return true;
  }
  openLetter() {
    this.change({ letterOpen: true });
  }
  revealNext() {
    this.change({
      revealedCount: Math.min(
        this.data.littleThings.length,
        this.snapshot.revealedCount + 1,
      ),
    });
  }
  selectTimeline(index: number | null) {
    if (index === null || (index >= 0 && index < this.data.timeline.length))
      this.change({ timelineIndex: index });
  }
  extinguish() {
    if (this.snapshot.finalState !== "lit") return false;
    this.change({ finalState: "extinguishing" });
    return true;
  }
  finishWish() {
    if (this.snapshot.finalState === "extinguishing")
      this.change({ finalState: "complete" });
  }
  replay(resetCard: () => void) {
    resetCard();
    const session = this.snapshot.session + 1;
    this.change({ ...initial(), session });
  }
}
