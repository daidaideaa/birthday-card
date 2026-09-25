import { assetUrl } from "./assetUrl";
import { assertMediaPath, validateManifest } from "../assets/manifest";
import type { AssetManifest, AssetVariantName } from "../assets/manifest";

export function mediaRoot(configured = "", base = "/", origin = "http://localhost", dev = false): URL {
  if (!configured) return new URL(`${base}media/`, origin);
  const root = new URL(configured);
  if (root.username || root.password || root.search || root.hash || /[%\\]/.test(configured) || configured.split("/").includes("..") || !root.pathname.endsWith("/") || (root.protocol !== "https:" && !(dev && root.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(root.hostname)))) throw Error("资源根必须是可信 HTTPS 目录（开发时允许 localhost HTTP）");
  return root;
}
export function createAssetResolver(manifest: AssetManifest, root: URL) {
  const fixed = structuredClone(validateManifest(manifest));
  return (id: string, variant: AssetVariantName = "standard"): string => {
    const entry = Object.hasOwn(fixed.assets, id) ? fixed.assets[id] : undefined;
    if (!entry) throw Error(`缺少必需资源：${id}（release ${fixed.releaseId}）`);
    const resource = entry.variants[variant] ?? entry.variants.standard;
    assertMediaPath(resource.path);
    return new URL(resource.path.split("/").map(encodeURIComponent).join("/"), root).href;
  };
}
let pending: Promise<AssetManifest> | undefined;
let resolveAsset: ReturnType<typeof createAssetResolver> | undefined;
/** 每次体验只加载一次清单；不会预取清单中的所有媒体。 */
export function loadAssetManifest(): Promise<AssetManifest> {
  return pending ??= (async () => {
    const response = await fetch(assetUrl("asset-manifest.json"), { cache: "no-cache" });
    if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) throw Error(`资源清单加载失败：HTTP ${response.status}`);
    const manifest = validateManifest(await response.json());
    if (manifest.contentMode !== (import.meta.env.VITE_CONTENT_MODE || "demo")) throw Error("资源清单 contentMode 与构建配置不一致");
    resolveAsset = createAssetResolver(manifest, mediaRoot(import.meta.env.VITE_ASSET_BASE_URL, import.meta.env.BASE_URL, location.origin, import.meta.env.DEV));
    return structuredClone(manifest);
  })();
}
export function getAssetUrl(id: string, variant: AssetVariantName = "standard") {
  if (!resolveAsset) throw Error("请先 await loadAssetManifest() 再读取资源");
  return resolveAsset(id, variant);
}
