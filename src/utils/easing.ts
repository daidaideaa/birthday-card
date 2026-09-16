export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));
