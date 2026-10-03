import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PerformanceState } from '../src/music/PerformanceState';
import { DUET_TIMELINE } from '../src/music/duetTimeline';

test('release finishes at the next authored contact without speeding up or creeping', () => {
  const state = new PerformanceState(DUET_TIMELINE);
  state.strike();
  state.advance(6.1, true);
  let previous = 6.1 / 26;
  let frame = state.advance(0, false);
  for (let i = 0; i < 180; i++) {
    frame = state.advance(1 / 60, false);
    assert.ok(frame.progress - previous <= 1 / 60 / 26 * 1.15 + 1e-8);
    assert.ok(frame.progress >= previous);
    previous = frame.progress;
  }
  assert.equal(frame.progress, 6.3035 / 26);
  assert.equal(frame.mode, 'waiting');
  assert.equal(state.advance(20, false).progress, frame.progress);
  state.strike();
  assert.ok(state.advance(.1, true).progress > frame.progress);
});

test('background suspend cancels settling without resetting or automatically resuming', () => {
  const state = new PerformanceState(DUET_TIMELINE);
  state.strike(); state.advance(13.6, true);
  const frame = state.advance(.1, false);
  state.releaseInput();
  assert.equal(state.advance(50, false).progress, frame.progress);
  state.strike();
  const resumed = state.advance(.1, true);
  assert.ok(resumed.progress > frame.progress);
  assert.ok(resumed.progress < frame.progress + .01);
});

test('settling into final pose completes the sequence and replay resets it', () => {
  const state = new PerformanceState(DUET_TIMELINE);
  state.strike(); state.advance(25.8, true);
  const frame = state.advance(.6, false);
  assert.equal(frame.completed, true); assert.equal(frame.mode, 'waiting');
  assert.equal(frame.progress, 1);
  state.reset(); assert.equal(state.advance(0, false).progress, 0);
});

test('invalid contact timelines fail instead of silently jumping', () => {
  assert.throws(() => new PerformanceState({ duration: 26, stops: [0, 20, 10, 26] }));
  assert.throws(() => new PerformanceState({ duration: 26, stops: [0, 25] }));
});

test('a short piano tap stops promptly rather than completing the whole seated section', () => {
  const state = new PerformanceState(DUET_TIMELINE);
  state.strike();
  state.advance(.02, true);
  let frame = state.advance(0, false);
  for (let i = 0; i < 48; i++) frame = state.advance(1 / 60, false);
  assert.equal(frame.mode, 'waiting');
  assert.ok(frame.progress * 26 <= .8);
  assert.equal(state.advance(60, false).progress, frame.progress);
});
