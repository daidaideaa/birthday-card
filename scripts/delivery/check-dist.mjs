import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { validateManifest } from '../../src/assets/manifest.ts';
import { json, hash, variants, safeFile } from './lib.mjs';
const { values } = parseArgs({ options: { dir: { type: 'string', default: 'dist' } } });
try {
  const root = path.resolve(values.dir);
  const base = process.env.VITE_APP_BASE || '/birthday-card/';
  const remote = Boolean(process.env.VITE_ASSET_BASE_URL);
  let count = 0, bytes = 0;
  async function scan(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      const rel = path.relative(root, file).replaceAll('\\', '/');
      if (entry.isSymbolicLink()) throw Error(`构建目录包含符号链接：${rel}`);
      if (entry.isDirectory()) { if (/^(?:\.git|\.asset-build|model-sources|node_modules)(?:\/|$)/.test(rel)) throw Error(`构建包含非运行目录：${rel}`); await scan(file); continue; }
      count++; const size = (await fs.stat(file)).size; bytes += size;
      if (size > 25 * 1024 * 1024) throw Error(`文件超过 25 MiB 保守限制：${rel}`);
      if (/(^|\/)(?:\.env(?:\.|$)|.*credentials.*|.*\.(?:pem|key|blend|blend1|map)$)/i.test(rel)) throw Error(`构建包含敏感文件或源码映射：${rel}`);
      if (remote && rel.startsWith('media/')) throw Error('远程模式不应包含 dist/media');
      if (/\.(?:js|html|css|json|txt)$/.test(rel)) {
        const text = await fs.readFile(file, 'utf8');
        if (/(?:https?:\/\/[^\s"'<>]*example\.com|(?:CLOUDFLARE_API_TOKEN|R2_SECRET_ACCESS_KEY)\s*[=:]\s*["']?[A-Za-z0-9_+-]{16,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|AKIA[A-Z0-9]{16})/.test(text)) throw Error(`构建包含占位域名或疑似密钥：${rel}`);
      }
    }
  }
  await scan(root);
  if (count > 20000) throw Error('构建文件数超过 20000');
  const manifest = validateManifest(await json(path.join(root, 'asset-manifest.json')));
  if (manifest.contentMode !== (process.env.VITE_CONTENT_MODE || 'demo')) throw Error('构建 contentMode 与 manifest 不一致');
  if (!remote) for (const variant of variants(manifest)) {
    const content = await fs.readFile(await safeFile(root, `media/${variant.path}`));
    if (content.length !== variant.bytes || hash(content) !== variant.sha256) throw Error(`构建资源损坏：${variant.path}`);
  }
  const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
  for (const [, href] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^https?:|^data:|^#/.test(href)) continue;
    if (!href.startsWith(base)) throw Error(`HTML 路径与 base 不一致：${href}`);
    await safeFile(root, decodeURIComponent(href.slice(base.length)));
  }
  console.log(`部署检查通过：${count} 个文件，${(bytes / 1024 / 1024).toFixed(2)} MiB，base=${base}，release=${manifest.releaseId}`);
} catch (error) { console.error(`部署检查失败：${error.message}`); process.exitCode = 1; }
