import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { hash, variants, safeFile, publicRoot, encodePath, fetchChecked, writeJson } from './lib.mjs';
/** Interactive single-publisher OAuth transport. CI should use the conditional S3 writer. */
export async function publish(manifest, source) {
  const root = publicRoot(process.env.VITE_ASSET_BASE_URL);
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket || !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket)) throw Error('缺少有效 R2_BUCKET_NAME');
  await fs.mkdir('.asset-build', { recursive: true });
  const guard = path.resolve(`.asset-build/publish-${manifest.releaseId}.lock`);
  const lock = await fs.open(guard, 'wx');
  try {
    const ready = { schemaVersion: 1, releaseId: manifest.releaseId, manifestSha256: hash(JSON.stringify(manifest)), objectCount: variants(manifest).length };
    const readyPath = `releases/${manifest.releaseId}/ready.json`;
    const existingReady = await fetch(new URL(readyPath, root), { signal: AbortSignal.timeout(30000) });
    if (existingReady.ok) {
      if (JSON.stringify(await existingReady.json()) !== JSON.stringify(ready)) throw Error('远端 ready 冲突');
      console.log('该 release 已就绪，不执行覆盖'); return;
    }
    if (existingReady.status !== 404) throw Error(`ready 查询失败：HTTP ${existingReady.status}`);
    const put = (relative, file, mime) => {
      const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'r2', 'object', 'put', `${bucket}/birthday-card/${relative}`, '--file', file, '--remote', '--content-type', mime, '--cache-control', 'public, max-age=31536000, immutable'], { encoding: 'utf8', env: process.env });
      if (result.status !== 0) throw Error(`Wrangler 上传失败：${relative}（状态 ${result.status}）`);
    };
    for (const variant of variants(manifest)) {
      const url = new URL(encodePath(variant.path), root);
      const present = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
      if (!present.ok && present.status !== 404) throw Error(`对象查询失败：HTTP ${present.status}`);
      if (!present.ok) put(variant.path, await safeFile(source, variant.path.slice(`releases/${manifest.releaseId}/`.length)), variant.mime);
      const downloaded = await fetchChecked(url);
      if (downloaded.headers.get('content-type')?.split(';')[0] !== variant.mime || hash(Buffer.from(await downloaded.arrayBuffer())) !== variant.sha256) throw Error(`远端对象与批准字节不一致：${variant.path}`);
      console.log(`已验证 ${variant.path}`);
    }
    const readyFile = path.resolve(`.asset-build/${manifest.releaseId}-ready.json`);
    await writeJson(readyFile, ready);
    put(readyPath, readyFile, 'application/json');
    console.log(`已写入最终 ready：${manifest.releaseId}`);
  } finally { await lock.close(); await fs.unlink(guard); }
}
