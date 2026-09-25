import assert from "node:assert/strict";
import test from "node:test";
import { gazeDirection, PetIntent, petMedia } from "../src/pet/petMedia.ts";

test("touch interrupts gaze, but gaze and celebration never interrupt a touch", () => {
  const intent = new PetIntent();
  assert.equal(intent.request("look-left", 100), true);
  assert.equal(intent.request("pet", 110), true);
  assert.equal(intent.request("happy", 120), false);
  assert.equal(intent.request("look-right", 230), false);
  assert.equal(intent.request("pet", 500), false);
  assert.equal(intent.action, "pet");
});

test("late completion of an interrupted action cannot replace the newest action", () => {
  const intent = new PetIntent();
  intent.request("look-left", 100);
  intent.request("happy", 200);
  assert.equal(intent.complete("look-left"), null);
  assert.equal(intent.action, "happy");
  assert.equal(intent.complete("happy"), "idle");
});

test("chapter mood changes are remembered without cutting off a touch", () => {
  const intent = new PetIntent();
  intent.request("pet", 100);
  assert.equal(intent.setBase("rest", 200), false);
  assert.equal(intent.action, "pet");
  assert.equal(intent.complete("pet"), "rest");
  assert.equal(intent.action, "rest");
});

test("replay drops previous action and gaze lock, expired actions do not block input", () => {
  const intent = new PetIntent();
  intent.request("pet", 100);
  assert.equal(intent.request("look-left", 2400), true);
  intent.reset("rest");
  assert.equal(intent.action, "rest");
  assert.equal(intent.request("look-right", 2500), true);
});

test("gaze hysteresis avoids repeated left/right flicker at the neutral boundaries", () => {
  assert.equal(gazeDirection(-0.4, 0), -1);
  assert.equal(gazeDirection(-0.2, -1), -1);
  assert.equal(gazeDirection(0.05, -1), 0);
  assert.equal(gazeDirection(0.2, 0), 0);
  assert.equal(gazeDirection(0.4, 0), 1);
  assert.equal(gazeDirection(0.17, 1), 1);
});

test("media contract uses portable paths and loops only the two base clips", () => {
  assert.equal(petMedia.clip("apricot", "look-left"), "/cinema/pets/apricot-look-left.mp4");
  assert.equal(petMedia.poster("cream"), "/cinema/pets/cream.webp");
  assert.equal(petMedia.loops("rest"), true);
  assert.equal(petMedia.loops("pet"), false);
});
