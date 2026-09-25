import test from "node:test";
import assert from "node:assert/strict";
import { ChapterTransition, type TransitionFrame } from "../src/story/ChapterTransition.ts";

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));
function controlled() {
  const waits: { milliseconds: number; release: () => void }[] = [];
  const frames: TransitionFrame[] = [];
  const transition = new ChapterTransition((frame) => frames.push(frame), (milliseconds, signal) =>
    new Promise<void>((resolve) => {
      signal.addEventListener("abort", () => resolve(), { once: true });
      waits.push({ milliseconds, release: resolve });
    }),
  );
  return { transition, waits, frames };
}

test("chapter commits only while covered, then reveals", async () => {
  const { transition, waits, frames } = controlled();
  let committed = false;
  const result = transition.run({ treatment: "bluehour", immediate: false, prepare: async () => {}, commit: () => {
    assert.equal(frames.at(-1)?.phase, "covered");
    committed = true;
  } });
  await tick();
  assert.equal(committed, false);
  waits.find((wait) => wait.milliseconds === 460)!.release();
  await tick();
  assert.equal(committed, true);
  waits.find((wait) => wait.milliseconds === 120)!.release();
  await tick();
  assert.equal(frames.at(-1)?.phase, "revealing");
  waits.find((wait) => wait.milliseconds === 600)!.release();
  await result;
  assert.equal(frames.at(-1)?.phase, "idle");
});

test("new navigation cancels a stale poster load", async () => {
  const { transition } = controlled();
  const commits: string[] = [];
  let finish!: () => void;
  const old = transition.run({ treatment: "paper", immediate: false, prepare: () => new Promise<void>((resolve) => { finish = resolve; }), commit: () => commits.push("stale") });
  await transition.run({ treatment: "sunrise", immediate: true, prepare: async () => {}, commit: () => commits.push("current") });
  finish();
  await old;
  assert.deepEqual(commits, ["current"]);
});

test("replay cancels covered navigation and clears the curtain", async () => {
  const { transition, frames } = controlled();
  let commits = 0;
  const pending = transition.run({ treatment: "paper", immediate: false, prepare: async () => {}, commit: () => commits++ });
  await tick();
  transition.cancel();
  await pending;
  assert.equal(commits, 0);
  assert.equal(frames.at(-1)?.phase, "idle");
});

test("reduced motion commits immediately without loading or timers", async () => {
  const { transition, waits, frames } = controlled();
  let commits = 0;
  await transition.run({ treatment: "paper", immediate: true, prepare: async () => { throw Error("must not load"); }, commit: () => commits++ });
  assert.equal(commits, 1);
  assert.equal(waits.length, 0);
  assert.equal(frames.at(-1)?.phase, "idle");
});

test("unavailable poster times out without leaving navigation blocked", async () => {
  const { transition, waits, frames } = controlled();
  let commits = 0;
  const pending = transition.run({ treatment: "sunrise", immediate: false, prepare: () => new Promise(() => {}), commit: () => commits++ });
  assert.equal(frames.at(-1)?.phase, "preparing");
  waits.find((wait) => wait.milliseconds === 1800)!.release();
  await tick();
  assert.equal(frames.at(-1)?.phase, "covering");
  waits.find((wait) => wait.milliseconds === 460)!.release();
  await tick();
  assert.equal(commits, 1);
  transition.cancel();
  await pending;
  assert.equal(frames.at(-1)?.phase, "idle");
});
