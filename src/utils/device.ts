export const isMobile = () =>
  matchMedia("(pointer: coarse)").matches || innerWidth < 700;
export const reducedMotion = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches;
