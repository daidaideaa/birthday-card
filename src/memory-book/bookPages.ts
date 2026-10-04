/** One resting spread per physical leaf turn; the final endpaper keeps the dedication. */
export const BOOK_SPREADS = [
  '只为你打开',
  '她的来路 · 山海之间',
  '他的起点 · 向南而行',
  '在深圳并肩 · 写给你',
  '把光留住 · 风会回答',
  '星光作伴 · 许一个心愿',
  '生日快乐 · 只为你打开',
] as const;

export const LAST_BOOK_SPREAD = BOOK_SPREADS.length - 1;

export function clampBookPage(index: number) {
  return Number.isFinite(index) ? Math.max(0, Math.min(LAST_BOOK_SPREAD, Math.round(index))) : 0;
}
