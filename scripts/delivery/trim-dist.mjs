import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { json, safeFile, variants } from './lib.mjs';
import { validateManifest } from '../../src/assets/manifest.ts';
// Vite copies public; remove only precisely inventoried runtime media from dist.
// Source files and license notices are never removed.
if (process.env.VITE_ASSET_BASE_URL) {
  const { values } = parseArgs({ options: { dir: { type: 'string', default: 'dist' } } });
  const root = path.resolve(values.dir);
  if (![path.resolve('dist'), path.resolve('.asset-build/performance-preview')].includes(root)) throw Error('只允许裁剪本站正式构建或动作预览产物');
  const manifest = validateManifest(await json(path.join(root, 'asset-manifest.json')));
  for (const variant of variants(manifest)) {
    const relative = variant.path.slice(`releases/${manifest.releaseId}/`.length);
    try {
      const file = await safeFile(root, relative);
      await fs.unlink(file);
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  console.log('远程模式：构建产物已移除登记媒体，源素材和署名保持不变');
}
