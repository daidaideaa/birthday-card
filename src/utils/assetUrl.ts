/** 只接受 public 下的相对资源路径，避免 Pages 子目录丢失或意外加载外站。 */
export function assetUrl(
  path: string,
  base = import.meta.env?.BASE_URL ?? "/",
): string {
  const clean = path.trim().replace(/^\/+/, "");
  if (
    !clean ||
    /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(path.trim()) ||
    clean.split("/").some((p) => p === "..")
  )
    return "";
  return `${base.replace(/\/?$/, "/")}${clean.split("/").map(encodeURIComponent).join("/")}`;
}
