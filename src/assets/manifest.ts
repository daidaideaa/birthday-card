export type AssetKind = "image" | "atlas" | "model" | "texture" | "audio" | "data";
export type AssetVariantName = "standard" | "lite";
export interface AssetVariant {
  path: string; mime: string; bytes: number; sha256: string;
  width?: number; height?: number; decodedBytesEstimate?: number;
}
export interface AssetEntry {
  kind: AssetKind;
  variants: { standard: AssetVariant; lite?: AssetVariant };
  dependencies?: string[];
}
export interface AssetManifest {
  schemaVersion: 1;
  releaseId: string;
  contentMode: "demo" | "personal";
  assets: Record<string, AssetEntry>;
  bundles: Record<string, { critical: string[]; deferred: string[] }>;
}
export function assertReleaseId(id: unknown): asserts id is string {
  if (typeof id !== "string" || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw Error("release ID 无效");
}
/** 清单保存未编码路径，统一在 URL 层编码，拒绝重复编码绕过。 */
export function assertMediaPath(path: unknown): asserts path is string {
  if (typeof path !== "string" || !path || /[\\%?#:]/.test(path) || [...path].some(c => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) || path.split("/").some(p => !p || p === "." || p === ".." || p.trim() !== p)) throw Error("资源相对路径无效");
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function validateManifest(value: unknown): AssetManifest {
  if (!record(value) || value.schemaVersion !== 1 || !["demo", "personal"].includes(String(value.contentMode))) throw Error("manifest 版本或内容模式无效");
  assertReleaseId(value.releaseId);
  if (!record(value.assets) || !Object.keys(value.assets).length || !record(value.bundles) || !Object.keys(value.bundles).length) throw Error("manifest 缺少资源或章节");
  const paths = new Set<string>();
  for (const [id, entry] of Object.entries(value.assets)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id) || !record(entry) || !["image", "atlas", "model", "texture", "audio", "data"].includes(String(entry.kind)) || !record(entry.variants) || !entry.variants.standard) throw Error(`资源 ${id} 格式无效`);
    for (const [name, variant] of Object.entries(entry.variants)) {
      if (!["standard", "lite"].includes(name) || !record(variant)) throw Error(`资源 ${id} 变体无效`);
      assertMediaPath(variant.path);
      if (!variant.path.startsWith(`releases/${value.releaseId}/`) || paths.has(variant.path)) throw Error(`资源 ${id} 版本路径无效或重复`);
      paths.add(variant.path);
      if (!Number.isSafeInteger(variant.bytes) || Number(variant.bytes) <= 0 || !/^[a-f0-9]{64}$/.test(String(variant.sha256)) || typeof variant.mime !== "string" || !/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/.test(variant.mime)) throw Error(`资源 ${id} 字节、SHA-256 或 MIME 无效`);
      for (const field of ["width", "height", "decodedBytesEstimate"]) if (variant[field] !== undefined && (!Number.isSafeInteger(variant[field]) || Number(variant[field]) <= 0)) throw Error(`资源 ${id} ${field} 无效`);
    }
    if (entry.dependencies !== undefined && (!Array.isArray(entry.dependencies) || entry.dependencies.some(d => typeof d !== "string" || !Object.hasOwn(value.assets as object, d)))) throw Error(`资源 ${id} 依赖缺失`);
  }
  for (const [name, bundle] of Object.entries(value.bundles)) {
    if (!record(bundle) || !["critical", "deferred"].every(k => Array.isArray(bundle[k]) && (bundle[k] as unknown[]).every(id => typeof id === "string" && Object.hasOwn(value.assets as object, id)))) throw Error(`章节 ${name} 引用了缺失资源`);
  }
  const manifest = value as unknown as AssetManifest;
  const active = new Set<string>(), done = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) throw Error(`资源依赖循环：${id}`);
    if (done.has(id)) return;
    active.add(id);
    for (const dependency of manifest.assets[id].dependencies ?? []) visit(dependency);
    active.delete(id); done.add(id);
  }
  Object.keys(manifest.assets).forEach(visit);
  return manifest;
}
