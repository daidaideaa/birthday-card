import fs from 'node:fs/promises';
import path from 'node:path';
import { json, safeFile } from './lib.mjs';
// Vite copies public; remove only precisely inventoried runtime media from dist.
// Source files and license notices are never removed.
if (process.env.VITE_ASSET_BASE_URL) {
  const root = path.resolve('dist');
  for (const relative of Object.keys(await json('assets/legacy-paths.json'))) {
    const file = await safeFile(root, relative);
    await fs.unlink(file);
  }
  console.log('远程模式：dist 已移除登记媒体，源素材和署名保持不变');
}
