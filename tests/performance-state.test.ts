import { test } from "node:test";
import assert from "node:assert/strict";
import { PerformanceState } from "../src/music/PerformanceState";

test("leaving the stage freezes progress until fresh input, without resetting it", () => {
  const state = new PerformanceState();
  state.strike();
  const before = state.advance(1, true);
  assert.ok(before.progress > 0);
  state.releaseInput();
  for (let i = 0; i < 120; i++) {
    const paused = state.advance(1 / 60, false);
    assert.equal(paused.progress, before.progress);
    assert.equal(paused.mode, "waiting");
  }
  state.strike();
  assert.ok(state.advance(1 / 60, true).progress > before.progress);
});

test("ordinary note release settles at a stable pose and does not autoplay", () => {
  const state = new PerformanceState();
  assert.equal(state.advance(30, false).progress, 0);
  state.strike();
  state.advance(0.2, true);
  let frame = state.advance(0.6, false);
  assert.equal(frame.mode, "settling");
  for (let i = 0; i < 120; i++) frame = state.advance(1 / 60, false);
  const settled = frame.progress;
  assert.ok(settled > 0 && settled < 1);
  for (let i = 0; i < 120; i++) frame = state.advance(1 / 60, false);
  assert.equal(frame.progress, settled);
});
