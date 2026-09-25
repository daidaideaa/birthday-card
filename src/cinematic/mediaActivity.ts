const active = new Set<symbol>();
const listeners = new Set<() => void>();

/** Each mounted film owns a token; overlapping chapter exits cannot resume pets early. */
export function setMediaActive(token: symbol, playing: boolean) {
  const previous = active.size > 0;
  if (playing) active.add(token);
  else active.delete(token);
  if (previous !== (active.size > 0)) for (const listener of listeners) listener();
}

export const getMediaActive = () => active.size > 0;
export function subscribeMediaActivity(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
