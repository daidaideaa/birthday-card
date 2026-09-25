import { parseArgs } from 'node:util';
import { validateManifest } from '../../src/assets/manifest.ts';
import { fetchChecked, encodePath, publicRoot } from './lib.mjs';
const { values } = parseArgs({ options: { url: { type: 'string' } } });
try {
  const site = new URL(values.url);
  if (!site.pathname.endsWith('/')) throw Error('--url 需要以 / 结尾');
  const page = await fetchChecked(site);
  if (!page.headers.get('content-type')?.includes('text/html')) throw Error('首页 MIME 错误');
  const html = await page.text();
  for (const [, href] of html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)) {
    const response = await fetchChecked(new URL(href, site));
    const mime = response.headers.get('content-type') || '';
    if (!(/javascript|text\/css/.test(mime))) throw Error('JS/CSS 请求返回错误 MIME');
    await response.body?.cancel();
  }
  const response = await fetchChecked(new URL('asset-manifest.json', site));
  if (!response.headers.get('content-type')?.includes('application/json')) throw Error('manifest 返回非 JSON');
  const manifest = validateManifest(await response.json());
  const root = process.env.VITE_ASSET_BASE_URL ? publicRoot(process.env.VITE_ASSET_BASE_URL) : new URL('media/', site);
  const seen = new Set();
  for (const entry of Object.values(manifest.assets)) {
    if (seen.has(entry.kind)) continue;
    seen.add(entry.kind);
    const asset = entry.variants.standard;
    const result = await fetchChecked(new URL(encodePath(asset.path), root), { headers: { Origin: site.origin } });
    if (result.headers.get('content-type')?.split(';')[0] !== asset.mime) throw Error(`媒体 MIME 错误：${asset.path}`);
    if (root.origin !== site.origin && !['*', site.origin].includes(result.headers.get('access-control-allow-origin'))) throw Error('媒体 CORS 错误');
    await result.body?.cancel();
  }
  const missing = await fetch(new URL('media/releases/missing-asset-test/not-found.glb', site), { signal: AbortSignal.timeout(30000) });
  if (missing.status !== 404) throw Error(`不存在的媒体应返回 404，得到 ${missing.status}`);
  console.log(`线上 HTTP smoke 通过：${site.href}，release=${manifest.releaseId}；不代表 iPhone 解码/交互验收`);
} catch (error) { console.error(`线上检查失败：${error.message}`); process.exitCode = 1; }
