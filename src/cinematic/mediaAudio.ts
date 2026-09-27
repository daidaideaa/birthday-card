type MediaAudioTarget = Pick<HTMLMediaElement, "muted" | "volume">;
type MediaAudioState = { muted: boolean; volume: number; unlocked: boolean };

const state: MediaAudioState = { muted: false, volume: 1, unlocked: false };
const elements = new Map<MediaAudioTarget, boolean>();
const narration = new Set<MediaAudioTarget>();

function apply(element: MediaAudioTarget, silent: boolean) {
  element.muted = state.muted || !state.unlocked || silent;
  element.volume = narration.has(element) ? 1 : state.volume;
}

/** A native video's soundtrack shares the existing global sound controls. */
export function registerMediaAudio(element: MediaAudioTarget, foreground = false) {
  if (foreground) narration.add(element);
  elements.set(element, false);
  apply(element, false);
  return () => { elements.delete(element); narration.delete(element); };
}

/** Native controls cannot bypass the shared mute/unlock state. */
export function enforceMediaMute(element: MediaAudioTarget) {
  if (!element.muted && elements.has(element) && (state.muted || !state.unlocked || elements.get(element))) element.muted = true;
}

export function setMediaSilenced(element: MediaAudioTarget, silent: boolean) {
  if (!elements.has(element)) return;
  elements.set(element, silent);
  apply(element, silent);
}

export function setMediaAudioState(update: Partial<MediaAudioState>) {
  if (update.muted !== undefined) state.muted = update.muted;
  if (update.unlocked !== undefined) state.unlocked = update.unlocked;
  if (update.volume !== undefined && Number.isFinite(update.volume))
    state.volume = Math.max(0, Math.min(1, update.volume));
  for (const [element, silent] of elements) apply(element, silent);
}
