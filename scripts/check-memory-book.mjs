import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  dir: { type: 'string', default: 'dist' },
  url: { type: 'string' },
} });

function entryAssets(html) {
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)]
    .map(match => match[1]);
  if (!assets.some(href => href.endsWith('.js'))) throw Error('入口缺少 JavaScript 资源');
  return [...new Set(assets)];
}

async function localCheck() {
  const root = path.resolve(values.dir);
  const base = process.env.VITE_APP_BASE || '/birthday-card/';
  const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  const assets = entryAssets(html);
  for (const href of assets) {
    if (!href.startsWith(base)) throw Error(`资源路径不在 ${base} 下：${href}`);
    await fs.stat(path.join(root, decodeURIComponent(href.slice(base.length))));
  }

  let count = 0;
  async function checkPublic(relative = '') {
    for (const entry of await fs.readdir(path.join('public/memory-book', relative), { withFileTypes: true })) {
      const file = path.join(relative, entry.name);
      if (entry.isDirectory()) await checkPublic(file);
      else {
        const stat = await fs.stat(path.join(root, 'memory-book', file));
        if (!stat.size) throw Error(`构建资源为空：${file}`);
        count++;
      }
    }
  }
  await checkPublic();
  console.log(`构建资源检查通过：${assets.length} 个入口资源、${count} 个本地素材`);
}

async function liveCheck() {
  const site = new URL(values.url);
  const response = await fetch(site, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw Error(`网站入口不可用：HTTP ${response.status}`);
  const assets = entryAssets(await response.text());
  for (const href of assets) {
    const asset = await fetch(new URL(href, site), { signal: AbortSignal.timeout(20000) });
    const expected = href.endsWith('.css') ? /text\/css/ : /javascript|ecmascript/;
    await asset.body?.cancel();
    if (!asset.ok || !expected.test(asset.headers.get('content-type') || '')) {
      throw Error(`入口资源不可用：${href}（HTTP ${asset.status}）`);
    }
  }
  console.log(`线上入口检查通过：${site.href}，${assets.length} 个 JS/CSS 资源`);
}

if (values.url) await liveCheck();
else await localCheck();
