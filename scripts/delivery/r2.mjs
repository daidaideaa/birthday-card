import fs from 'node:fs/promises';
import { S3Client, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { hash, variants, safeFile } from './lib.mjs';
export async function publish(manifest, source) {
  for (const name of ['R2_BUCKET_NAME', 'R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']) if (!process.env[name]) throw Error(`缺少本机环境变量：${name}`);
  const Bucket = process.env.R2_BUCKET_NAME;
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(Bucket)) throw Error('R2_BUCKET_NAME 无效');
  const endpoint = new URL(process.env.R2_ENDPOINT);
  if (endpoint.protocol !== 'https:' || !/^[a-f0-9]{32}(?:\.(?:eu|fedramp))?\.r2\.cloudflarestorage\.com$/.test(endpoint.hostname) || endpoint.pathname !== '/' || endpoint.search || endpoint.hash || endpoint.username || endpoint.password) throw Error('R2_ENDPOINT 不是账户 S3 endpoint');
  const client = new S3Client({ endpoint: endpoint.href, region: 'auto', maxAttempts: 3, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY } });
  const head = async Key => {
    try { return await client.send(new HeadObjectCommand({ Bucket, Key })); }
    catch (error) { if (error.$metadata?.httpStatusCode === 404) return null; throw Error(`R2 HEAD 失败：HTTP ${error.$metadata?.httpStatusCode ?? 'network'}`); }
  };
  // 顺序上传将并发限制为 1；条件 PUT 避免并发发布覆盖不可变对象。
  for (const variant of variants(manifest)) {
    const Key = `birthday-card/${variant.path}`;
    const existing = await head(Key);
    if (existing && (existing.Metadata?.sha256 !== variant.sha256 || existing.ContentLength !== variant.bytes || existing.ContentType !== variant.mime)) throw Error(`不可变对象冲突：${variant.path}`);
    if (!existing) {
      const relative = variant.path.slice(`releases/${manifest.releaseId}/`.length);
      await client.send(new PutObjectCommand({ Bucket, Key, Body: await fs.readFile(await safeFile(source, relative)), ContentType: variant.mime, CacheControl: 'public, max-age=31536000, immutable', Metadata: { sha256: variant.sha256 }, IfNoneMatch: '*' }));
    }
    // 首次发布完整检查实际远端字节，不把 ETag 当作 SHA-256。
    const remote = await client.send(new GetObjectCommand({ Bucket, Key }));
    if (remote.ContentType !== variant.mime || remote.ContentLength !== variant.bytes || hash(await remote.Body.transformToByteArray()) !== variant.sha256) throw Error(`R2 完整校验失败：${variant.path}`);
  }
  const ready = { schemaVersion: 1, releaseId: manifest.releaseId, manifestSha256: hash(JSON.stringify(manifest)), objectCount: variants(manifest).length };
  const Key = `birthday-card/releases/${manifest.releaseId}/ready.json`;
  const existing = await head(Key);
  const Body = JSON.stringify(ready);
  if (existing) {
    const prior = await client.send(new GetObjectCommand({ Bucket, Key }));
    if (await prior.Body.transformToString() !== Body) throw Error('ready 已存在且不一致，拒绝覆盖');
  } else await client.send(new PutObjectCommand({ Bucket, Key, Body, ContentType: 'application/json', CacheControl: 'public, max-age=31536000, immutable', IfNoneMatch: '*' }));
  console.log(`R2 release 已完整校验并写入 ready：${manifest.releaseId}；继续检查公共入口 CORS 后才能发布网站`);
}
