import { test } from "node:test";
import assert from "node:assert/strict";
import { FilmPlaybackSession, filmSource, lionPhaseAt } from "../src/cinematic/media.ts";
import { registerMediaAudio, setMediaAudioState, setMediaSilenced } from "../src/cinematic/mediaAudio.ts";
import { getMediaActive, setMediaActive, subscribeMediaActivity } from "../src/cinematic/mediaActivity.ts";
import { AudioController } from "../src/scene/AudioController.ts";

test("native media inherits global mute and volume, including late mounts and review seeks", () => {
  setMediaAudioState({ muted: false, volume: 0.7, unlocked: false });
  const video = { volume: 1, muted: false };
  const detach = registerMediaAudio(video);
  assert.equal(video.muted, true, "sound stays locked until user interaction");
  assert.equal(video.volume, 0.7);
  setMediaAudioState({ unlocked: true });
  assert.equal(video.muted, false);
  setMediaSilenced(video, true);
  setMediaAudioState({ muted: true });
  setMediaAudioState({ muted: false, volume: 0.4 });
  assert.equal(video.muted, true, "global updates cannot make a review seek audible");
  setMediaSilenced(video, false);
  assert.equal(video.muted, false);
  assert.equal(video.volume, 0.4);
  setMediaAudioState({ muted: true, volume: 9 });
  const lateVideo = { volume: 0, muted: false };
  const detachLate = registerMediaAudio(lateVideo);
  assert.deepEqual(lateVideo, { volume: 1, muted: true });
  detach();
  setMediaAudioState({ muted: false });
  assert.equal(video.muted, true, "unmounted media no longer receives global changes");
  detachLate();
  setMediaAudioState({ muted: false, volume: 1, unlocked: false });
});

test("overlapping films keep pets idle until the final decoder pauses", () => {
  const notifications: boolean[] = [];
  const unsubscribe = subscribeMediaActivity(() => notifications.push(getMediaActive()));
  const first = Symbol("first"), second = Symbol("second");
  setMediaActive(first, true);
  setMediaActive(second, true);
  setMediaActive(first, false);
  assert.equal(getMediaActive(), true);
  setMediaActive(second, false);
  setMediaActive(second, false);
  assert.deepEqual(notifications, [true, false]);
  unsubscribe();
});

test("a film fades existing birthday voices without silencing new piano interactions", () => {
  const audio = new AudioController();
  let fades = 0;
  audio.fadeOut = () => { fades++; };
  const token = Symbol("film soundtrack");
  setMediaActive(token, true);
  setMediaActive(token, true);
  assert.equal(fades, 1, "only the start of a soundtrack fades old voices");
  setMediaActive(token, false);
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value: { removeEventListener() {} } });
  try { audio.dispose(); } finally {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  }
  setMediaActive(token, true);
  assert.equal(fades, 1, "disposed controllers unsubscribe");
  setMediaActive(token, false);
});

test("completion is once per play and a review seek cannot advance the story", () => {
  const session = new FilmPlaybackSession();
  session.begin();
  session.review();
  assert.equal(session.finish(), false);
  session.begin();
  assert.equal(session.finish(), true);
  assert.equal(session.finish(), false);
  session.begin();
  assert.equal(session.finish(), false, "resume is not replay");
  session.begin(true);
  assert.equal(session.finish(), true);
});

test("caption boundaries follow media time and both compositions have local sources", () => {
  assert.equal(lionPhaseAt(0), "dawn");
  assert.equal(lionPhaseAt(6.499), "dawn");
  assert.equal(lionPhaseAt(6.5), "stars");
  assert.equal(lionPhaseAt(11), "return");
  assert.equal(lionPhaseAt(18), "return");
  assert.match(filmSource("duet", "portrait").video, /cinema\/duet-portrait\.mp4$/);
  assert.match(filmSource("pride", "landscape").poster, /cinema\/pride-landscape\.webp$/);
});
