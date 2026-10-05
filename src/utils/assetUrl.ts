/** 项目内部的 public 相对路径使用 Vite 的部署前缀。 */
export function assetUrl(path: string): string {
  return `${import.meta.env.BASE_URL}${path}`;
}
