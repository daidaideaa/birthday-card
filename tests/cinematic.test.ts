import { test } from "node:test";
import assert from "node:assert/strict";
import { CinematicDirector } from "../src/cinematic/CinematicDirector.ts";
import { chooseQuality } from "../src/cinematic/quality.ts";
test("pause, replay and review seek cannot double-fire or backfill audio cues", () => {
  const director = new CinematicDirector(2);
  const calls: number[] = [];
  const pose = { x: 0 };
  director.timeline
    .to(pose, { x: 2, duration: 2, ease: "none" }, 0)
    .call(() => calls.push(1), [], 0.5)
    .call(() => calls.push(2), [], 2);
  director.play(true);
  director.advance(0.6);
  assert.deepEqual(calls, [1]);
  director.pause();
  director.advance(5);
  assert.equal(director.time, 0.6);
  director.play();
  director.advance(1.4);
  assert.deepEqual(calls, [1, 2]);
  assert.equal(director.playing, false);
  director.seek(0.2);
  director.seek(2);
  assert.deepEqual(calls, [1, 2]);
  assert.equal(pose.x, 2);
  director.play(true);
  director.advance(2);
  assert.deepEqual(calls, [1, 2, 1, 2]);
  director.dispose();
});
test("mobile and accessibility budgets preserve a conservative default", () => {
  assert.equal(
    chooseQuality({ mobile: true, cores: 8, reduced: false }),
    "balanced",
  );
  assert.equal(
    chooseQuality({ mobile: false, cores: 8, reduced: false }),
    "high",
  );
  assert.equal(
    chooseQuality({ mobile: false, cores: 8, reduced: true }),
    "low",
  );
  assert.equal(
    chooseQuality({ mobile: true, cores: 8, memory: 2, reduced: false }),
    "low",
  );
});
