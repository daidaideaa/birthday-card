import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { assertMediaPath, assertReleaseId, validateManifest } from '../../src/assets/manifest.ts';
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export const json = async file => JSON.parse(await fs.readFile(file, 'utf8'));
export const encodePath = value => value.split('/').map(encodeURIComponent).join('/');
export const variants = manifest => Object.values(manifest.assets).flatMap(entry => Object.values(entry.variants));
export async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n');
}
export async function safeFile(root, relative) {
  assertMediaPath(relative);
  const realRoot = await fs.realpath(root);
  const file = await fs.realpath(path.resolve(root, relative));
  if (!file.startsWith(realRoot + path.sep) || !(await fs.stat(file)).isFile()) throw Error(`资源超出指定目录或不是文件：${relative}`);
  return file;
}
export async function selectedRelease(explicit, production = process.env.DEPLOY_TARGET === 'production') {
  const lock = await json('assets/release.lock.json');
  assertReleaseId(lock.releaseId);
  const id = explicit || process.env.ASSET_RELEASE_ID || lock.releaseId;
  assertReleaseId(id);
  if (production && id !== lock.releaseId) throw Error('生产 release 与 release.lock.json 不一致');
  if (id !== lock.releaseId) console.log(`预览明确覆盖 release：${id}`);
  const manifest = validateManifest(await json(`assets/releases/${id}.json`));
  if (manifest.releaseId !== id) throw Error('release 文件名与清单不一致');
  return manifest;
}
export async function checkBytes(manifest, source) {
  for (const variant of variants(manifest)) {
    const relative = variant.path.slice(`releases/${manifest.releaseId}/`.length);
    const bytes = await fs.readFile(await safeFile(source, relative));
    if (bytes.length !== variant.bytes || hash(bytes) !== variant.sha256) throw Error(`资源缺失或字节与清单不一致：${relative}`);
    // 外部依赖必须以逻辑 ID 完整登记；GLB 仅接受内嵌资源，避免隐式外链。
    if (relative.endsWith('.glb')) {
      if (bytes.toString('ascii', 0, 4) !== 'glTF' || bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) throw Error(`GLB 格式无效：${relative}`);
      const gltf = JSON.parse(bytes.toString('utf8', 20, 20 + bytes.readUInt32LE(12)).trim());
      if ([...(gltf.buffers ?? []), ...(gltf.images ?? [])].some(v => v.uri && !v.uri.startsWith('data:'))) throw Error(`GLB 外部依赖未内嵌：${relative}`);
    }
    if (relative.endsWith('.json')) JSON.parse(bytes.toString('utf8'));
  }
}
export function publicRoot(value) {
  const root = new URL(value);
  if (root.protocol !== 'https:' || root.username || root.password || root.search || root.hash || !root.pathname.endsWith('/') || /(^|\.)r2\.dev$|\.r2\.cloudflarestorage\.com$/.test(root.hostname)) throw Error('请配置正式 HTTPS 媒体目录；不能使用 r2.dev 或 S3 endpoint');
  return root;
}
export async function fetchChecked(url, options = {}) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      return response;
    } catch (error) { last = error; }
  }
  throw Error(`媒体请求失败：${last.message}`);
}
export async function verifyRemote(manifest, { full = false, origin = process.env.SITE_ORIGIN } = {}) {
  const root = publicRoot(process.env.VITE_ASSET_BASE_URL);
  const headers = origin ? { Origin: new URL(origin).origin } : {};
  const ready = await (await fetchChecked(new URL(`releases/${manifest.releaseId}/ready.json`, root), { headers })).json();
  if (ready.manifestSha256 !== hash(JSON.stringify(manifest)) || ready.releaseId !== manifest.releaseId) throw Error('远端 ready 与批准清单不一致');
  for (const variant of variants(manifest)) {
    const response = await fetchChecked(new URL(encodePath(variant.path), root), { method: full ? 'GET' : 'HEAD', headers });
    if (response.headers.get('content-type')?.split(';')[0] !== variant.mime || Number(response.headers.get('content-length')) !== variant.bytes) throw Error(`远端 MIME/大小不一致：${variant.path}`);
    if (origin && !['*', new URL(origin).origin].includes(response.headers.get('access-control-allow-origin'))) throw Error(`远端 CORS 不允许本站：${variant.path}`);
    if (!response.headers.get('cache-control')?.includes('immutable')) throw Error(`远端不可变缓存缺失：${variant.path}`);
    if (full && hash(Buffer.from(await response.arrayBuffer())) !== variant.sha256) throw Error(`远端 SHA-256 不一致：${variant.path}`);
  }
  console.log(`远端校验通过：${manifest.releaseId}，${variants(manifest).length} 个对象，${full ? '首次完整 SHA-256' : 'HEAD 检查'}`);
}
