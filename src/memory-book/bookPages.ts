/** One resting spread per physical leaf turn; the final endpaper keeps the dedication. */
export const BOOK_SPREADS = [
  '只为你打开',
  '这一页留给你',
  '万千字句里',
  '多分给你一点',
  '偏爱也有名字',
  '愿温柔向你走来',
  '故事从这里开始',
] as const;

export const LAST_BOOK_SPREAD = BOOK_SPREADS.length - 1;

export type ReadingSide = 'spread' | 'left' | 'right';
export type BookMechanism = 'name' | 'veil' | 'ink' | 'note';
export const BOOK_MECHANISMS: Partial<Record<number, { id: BookMechanism; label: string; result: string }>> = {
  0: { id: 'name', label: '唤出你的名字', result: '师宝宝。这一页，只为你打开。' },
  2: { id: 'veil', label: '轻轻叠上透明页', result: '万千字句里，这一句偏向你。' },
  4: { id: 'ink', label: '让墨字归位', result: '原来，偏爱也有名字。' },
  5: { id: 'note', label: '展开这张纸笺', result: '师宝宝，愿今晚的温柔，都向你走来。' },
};

export function clampBookPage(index: number) {
  return Number.isFinite(index) ? Math.max(0, Math.min(LAST_BOOK_SPREAD, Math.round(index))) : 0;
}
