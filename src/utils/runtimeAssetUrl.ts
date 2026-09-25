import { assetUrl } from './assetUrl';
import { getAssetUrl } from './mediaUrl';
import paths from '../../assets/legacy-paths.json';
/** 现有场景的迁移适配器，新场景直接使用逻辑 ID。 */
export function runtimeAssetUrl(path: string): string {
  if (!import.meta.env?.VITE_ASSET_BASE_URL) return assetUrl(path);
  const id = Object.hasOwn(paths, path) ? paths[path as keyof typeof paths] : undefined;
  if (!id) throw Error(`远程媒体未登记：${path}`);
  return getAssetUrl(id);
}
