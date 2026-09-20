import { test } from "node:test";
import assert from "node:assert/strict";
import type { BirthdayStory } from "../src/content/storyTypes.ts";
const emptyStory: BirthdayStory = {
  person: { name: "TEST" },
  firstMet: { date: "", place: "", title: "", memory: "", firstImpression: "" },
  timeline: [],
  moments: [],
  littleThings: [],
  insideJokes: [],
  places: [],
  stats: [],
  letter: { greeting: "TEST", paragraphs: [], ending: "", signature: "" },
  finalWish: "",
};
import {
  StoryController,
  getChapters,
  prepareStory,
} from "../src/story/StoryController.ts";
import { CardMotion } from "../src/scene/CardMotion.ts";
import { assetUrl } from "../src/utils/assetUrl.ts";

test("empty content exposes only birthday and final wish", () => {
  assert.deepEqual(
    getChapters(emptyStory).map((c) => c.id),
    ["birthday", "finalWish"],
  );
});
test("blank records and a greeting-only letter do not create empty chapters", () => {
  const source = structuredClone(emptyStory);
  source.firstMet.title = "TEST: title without personal information";
  source.firstMet.date = "  ";
  source.timeline = [{ date: "", title: " ", description: "" }];
  source.moments = [{ title: "", image: " " }];
  source.littleThings = [{ text: "\n" }];
  source.insideJokes = [{ title: "", note: " " }];
  source.places = [{ city: "", memory: " " }];
  source.stats = [{ label: "TEST", value: Number.NaN }];
  source.letter.paragraphs = [" ", "\n"];
  assert.deepEqual(
    getChapters(source).map((c) => c.id),
    ["birthday", "finalWish"],
  );
  assert.equal(
    source.timeline.length,
    1,
    "filtering must not mutate the editable source",
  );
});
test("personal content is condensed into one album and four ordered chapters", () => {
  const source = structuredClone(emptyStory);
  source.firstMet.memory = "TEST ONLY";
  source.timeline = [{ date: "", title: "TEST ONLY", description: "" }];
  source.moments = [{ title: "", image: "memories/test-only.svg" }];
  source.littleThings = [{ text: "TEST ONLY" }];
  source.insideJokes = [{ title: "TEST ONLY" }];
  source.places = [{ city: "TEST ONLY", memory: "" }];
  source.stats = [
    { label: "TEST ONLY", value: 0 },
    { label: "TEST ONLY", text: "TEST ONLY" },
  ];
  source.letter.paragraphs = ["TEST ONLY"];
  assert.deepEqual(
    getChapters(source).map((c) => c.id),
    ["birthday", "moments", "letter", "finalWish"],
  );
  assert.equal(prepareStory(source).stats.length, 2);
});
test("navigation respects first/last bounds and counts only visible chapters", () => {
  const source = structuredClone(emptyStory);
  source.letter.paragraphs = ["TEST ONLY"];
  const book = new StoryController(source);
  assert.equal(book.chapters.length, 3);
  assert.equal(book.go(-1), false);
  assert.equal(book.getSnapshot().index, 0);
  assert.equal(book.go(1), true);
  assert.equal(book.chapters[book.getSnapshot().index].id, "letter");
  book.go(1);
  assert.equal(book.go(1), false);
  assert.equal(book.getSnapshot().index, 2);
  book.go(-1);
  assert.equal(book.getSnapshot().direction, -1);
});
test("reveal, letter and candle state persist across navigation; candle is one-shot", () => {
  const source = structuredClone(emptyStory);
  source.littleThings = [{ text: "TEST ONLY" }];
  source.letter.paragraphs = ["TEST ONLY"];
  const book = new StoryController(source);
  book.revealNext();
  book.revealNext();
  assert.equal(book.getSnapshot().revealedCount, 1);
  book.openLetter();
  book.go(1);
  book.go(-1);
  assert.equal(book.getSnapshot().letterOpen, true);
  assert.equal(book.extinguish(), true);
  assert.equal(book.extinguish(), false);
  book.finishWish();
  assert.equal(book.getSnapshot().finalState, "complete");
  assert.equal(book.extinguish(), false);
});
test("Replay resets navigation, reveal, letter, candle and real card motion, and rearms surprise", () => {
  let surprises = 0;
  const card = new CardMotion(
    () => surprises++,
    () => {},
  );
  const source = structuredClone(emptyStory);
  source.littleThings = [{ text: "TEST ONLY" }];
  const book = new StoryController(source);
  card.setTarget(true);
  card.update(2);
  assert.equal(surprises, 1);
  book.go(1);
  book.openLetter();
  book.revealNext();
  book.extinguish();
  book.finishWish();
  let resetCalls = 0;
  book.replay(() => {
    resetCalls++;
    card.reset();
  });
  assert.equal(resetCalls, 1);
  assert.equal(book.getSnapshot().index, 0);
  assert.equal(book.getSnapshot().letterOpen, false);
  assert.equal(book.getSnapshot().revealedCount, 0);
  assert.equal(book.getSnapshot().finalState, "lit");
  assert.equal(book.getSnapshot().timelineIndex, null);
  assert.equal(card.state, "CLOSED");
  assert.equal(card.progress, 0);
  assert.equal(card.targetOpen, false);
  assert.equal(card.surpriseArmed, true);
  card.update(2);
  assert.equal(card.state, "CLOSED");
  card.setTarget(true);
  card.update(2);
  assert.equal(surprises, 2);
});
test("GitHub Pages asset paths keep the base, encode filenames and reject remote/traversal paths", () => {
  assert.equal(
    assetUrl("memories/photo 1.jpg", "/birthday-card/"),
    "/birthday-card/memories/photo%201.jpg",
  );
  assert.equal(
    assetUrl("/memories/a.jpg", "/birthday-card"),
    "/birthday-card/memories/a.jpg",
  );
  assert.equal(assetUrl("memories/a.jpg", "/"), "/memories/a.jpg");
  assert.equal(assetUrl("https://example.com/a.jpg", "/birthday-card/"), "");
  assert.equal(assetUrl("../a.jpg", "/birthday-card/"), "");
  assert.equal(assetUrl("", "/birthday-card/"), "");
});
