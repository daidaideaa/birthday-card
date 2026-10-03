import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  dir: { type: 'string', default: 'dist' },
  url: { type: 'string' },
} });
const requiredArt = ['book.webp', 'cake.webp', 'puppy-apricot.webp', 'puppy-cream.webp'];
const mediaExtension = /\.(?:webp|png|jpe?g|svg|gif|avif|woff2?|mp3|ogg|wav|m4a|mp4|webm)$/i;

function localReferences(html) {
  return [...new Set([...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((href) => !/^(?:https?:|data:|#|\/\/)/i.test(href)))];
}

function relativeAsset(href, base) {
  const pathname = decodeURIComponent(href.split(/[?#]/)[0]);
  if (!pathname.startsWith(base)) throw Error(`资源路径不在 ${base} 下：${href}`);
  const relative = pathname.slice(base.length);
  if (!relative || relative.split('/').some((part) => part === '..' || part === '.') || relative.includes('\\')) {
    throw Error(`资源路径无效：${href}`);
  }
  return relative;
}

async function nonemptyFile(root, relative) {
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) throw Error(`资源超出构建目录：${relative}`);
  const stat = await fs.stat(file);
  if (!stat.isFile() || !stat.size) throw Error(`资源不是非空文件：${relative}`);
}

async function localCheck() {
  const root = path.resolve(values.dir);
  const base = process.env.VITE_APP_BASE || '/birthday-card/';
  const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  const references = localReferences(html);
  if (!references.some((href) => /\.js(?:[?#]|$)/.test(href))) throw Error('入口缺少 JavaScript 资源');
  for (const href of references) await nonemptyFile(root, relativeAsset(href, base));
  for (const name of requiredArt) await nonemptyFile(root, `memory-book/${name}`);

  // Walk only the new small asset folder; no legacy scans, hashing or network.
  let count = 0;
  const source = path.resolve('public/memory-book');
  async function checkMedia(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw Error(`新版素材不应为联接：${file}`);
      if (entry.isDirectory()) await checkMedia(file);
      else if (mediaExtension.test(entry.name)) {
        await nonemptyFile(root, path.join('memory-book', path.relative(source, file)));
        count++;
      }
    }
  }
  await checkMedia(source);
  console.log(`魔法书构建检查通过：${references.length} 个入口资源、${count} 个本地媒体/字体，base=${base}`);
}

async function liveCheck() {
  const site = new URL(values.url);
  if (!['https:', 'http:'].includes(site.protocol) || !site.pathname.endsWith('/')) {
    throw Error('--url 必须是以 / 结尾的 HTTP(S) 网站地址');
  }
  const response = await fetch(site, { signal: AbortSignal.timeout(20000) });
  if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
    throw Error(`网站入口未返回 HTML：HTTP ${response.status}`);
  }
  const html = await response.text();
  if (!/id=["']root["']/.test(html)) throw Error('网站入口缺少应用挂载节点');
  const references = localReferences(html).filter((href) => /\.(?:js|css)(?:[?#]|$)/.test(href));
  if (!references.some((href) => /\.js(?:[?#]|$)/.test(href))) throw Error('线上入口缺少 JavaScript 资源');
  for (const href of references) {
    relativeAsset(href, site.pathname);
    const asset = await fetch(new URL(href, site), { signal: AbortSignal.timeout(20000) });
    const mime = asset.headers.get('content-type') || '';
    const expected = /\.css(?:[?#]|$)/.test(href) ? /text\/css/ : /(?:javascript|ecmascript)/;
    await asset.body?.cancel();
    if (!asset.ok || !expected.test(mime)) throw Error(`线上入口资源不可用：${href}（HTTP ${asset.status}，${mime}）`);
  }
  console.log(`线上入口检查通过：${site.href}，${references.length} 个 JS/CSS 资源；未运行浏览器交互测试。`);
}

try {
  if (values.url) await liveCheck();
  else await localCheck();
} catch (error) {
  console.error(`魔法书检查失败：${error.message}`);
  process.exitCode = 1;
}
