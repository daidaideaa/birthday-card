import { test } from "node:test";
import assert from "node:assert/strict";
import { CardMotion } from "../src/scene/CardMotion.ts";
import { GestureStabilizer } from "../src/gesture/gestureTypes.ts";
const advance = (m: CardMotion, seconds: number) => {
  for (let t = 0; t < seconds; t += 0.01) m.update(0.01);
};
test("closed at load; surprise once per fully closed cycle", () => {
  let bursts = 0;
  const m = new CardMotion(
    () => bursts++,
    () => {},
  );
  assert.equal(m.state, "CLOSED");
  assert.equal(m.progress, 0);
  m.setTarget(true);
  advance(m, 1.2);
  assert.equal(m.state, "OPEN");
  assert.equal(bursts, 1);
  for (let i = 0; i < 30; i++) {
    m.setTarget(true);
    advance(m, 0.1);
  }
  assert.equal(bursts, 1);
  m.setTarget(false);
  advance(m, 0.3);
  m.setTarget(true);
  advance(m, 1.2);
  assert.equal(bursts, 1);
  m.setTarget(false);
  advance(m, 1);
  assert.equal(m.state, "CLOSED");
  m.setTarget(true);
  advance(m, 1.2);
  assert.equal(bursts, 2);
});
test("mid-flight reversal preserves current angle in both directions", () => {
  const m = new CardMotion(
    () => {},
    () => {},
  );
  m.setTarget(true);
  advance(m, 0.4);
  const opening = m.progress;
  m.setTarget(false);
  assert.equal(m.progress, opening);
  advance(m, 0.1);
  assert.ok(m.progress < opening);
  const closing = m.progress;
  m.setTarget(true);
  assert.equal(m.progress, closing);
  advance(m, 0.1);
  assert.ok(m.progress > closing);
});
test("early aborted open does not trigger surprise; later valid opening does", () => {
  let bursts = 0;
  const m = new CardMotion(
    () => bursts++,
    () => {},
  );
  m.setTarget(true);
  advance(m, 0.15);
  m.setTarget(false);
  advance(m, 1);
  assert.equal(bursts, 0);
  m.setTarget(true);
  advance(m, 1.2);
  assert.equal(bursts, 1);
});
test("stable gestures need 200 ms; missing hand never closes", () => {
  const s = new GestureStabilizer();
  assert.equal(s.update("Open_Palm", 0.9, 0), null);
  assert.equal(s.update("Open_Palm", 0.9, 133), null);
  assert.equal(s.update("Open_Palm", 0.9, 201), true);
  assert.equal(s.update("None", 0, 270), null);
  assert.equal(s.update("None", 0, 1000), null);
  assert.equal(s.update("Closed_Fist", 0.95, 1100), null);
  assert.equal(s.update("Closed_Fist", 0.95, 1301), false);
});
test("low confidence, brief flips and background gaps reset stability", () => {
  const s = new GestureStabilizer();
  s.update("Open_Palm", 0.9, 0);
  s.update("Closed_Fist", 0.9, 100);
  assert.equal(s.update("Open_Palm", 0.9, 201), null);
  assert.equal(s.update("Open_Palm", 0.6, 400), null);
  assert.equal(s.update("Open_Palm", 0.9, 460), null);
  assert.equal(s.update("Open_Palm", 0.9, 6000), null);
  assert.equal(s.update("Open_Palm", 0.9, 6201), true);
});
