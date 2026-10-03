import type { PerformanceTimeline } from './PerformanceState';

/** Same authored markers as build_duet_runtime.py; checked against the export. */
export const DUET_TIMELINE: PerformanceTimeline = {
  duration: 26,
  stops: [...new Set([
    ...Array.from({ length: 15 }, (_, i) => Number((i * .4).toFixed(4))),
    5.6, 6.65, 7.7, 8.75, 9.2, 9.7, 10.2, 10.8, 11.4, 12, 13.3, 14.6, 15.9,
    16.4, 17.7, 19, 19.5, 20.8, 22.1, 22.7, 23.3, 23.9, 24.5, 25.1, 25.6, 26,
    ...[[5.6, 6.65], [6.65, 7.7], [7.7, 8.75], [12, 13.3], [13.3, 14.6],
      [14.6, 15.9], [16.4, 17.7], [17.7, 19], [19.5, 20.8], [20.8, 22.1]]
      .map(([a, b]) => Number((a + (b - a) * .67).toFixed(4))),
  ])].sort((a, b) => a - b),
};
