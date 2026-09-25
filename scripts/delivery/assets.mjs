import fs from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { assertMediaPath, assertReleaseId, validateManifest } from '../../src/assets/manifest.ts';
import { hash, json, writeJson, safeFile, selectedRelease, variants, checkBytes, verifyRemote } from './lib.mjs';
const { values: args, positionals } = parseArgs({ allowPositionals: true, options: {
  release: { type: 'string' }, source: { type: 'string' }, mode: { type: 'string' }, manifest: { type: 'string' },
  'source-manifest': { type: 'string' }, transport: { type: 'string', default: 's3' }, 'dry-run': { type: 'boolean' }, apply: { type: 'boolean' }, full: { type: 'boolean' },
} });
try {
  const command = positionals[0];
  if (command === 'prepare') {
    const mode = args.mode ?? (process.env.VITE_ASSET_BASE_URL ? 'remote' : 'local');
    if (!['local', 'remote'].includes(mode)) throw Error('--mode 必须是 local 或 remote');
    let manifest;
    if (args.source) {
      assertReleaseId(args.release);
      const source = await json(args['source-manifest'] ?? 'assets/source-manifest.json');
      manifest = { schemaVersion: 1, releaseId: args.release, contentMode: source.contentMode, assets: {}, bundles: source.bundles };
      for (const [id, entry] of Object.entries(source.assets)) {
        if (!entry.license?.trim() || !entry.source?.trim()) throw Error(`资源 ${id} 缺少许可或来源`);
        const packaged = { kind: entry.kind, variants: {}, ...(entry.dependencies ? { dependencies: entry.dependencies } : {}) };
        for (const [name, input] of Object.entries(entry.variants)) {
          assertMediaPath(input.file);
          const bytes = await fs.readFile(await safeFile(args.source, input.file));
          packaged.variants[name] = { path: `releases/${args.release}/${input.file}`, mime: input.mime, bytes: bytes.length, sha256: hash(bytes), ...Object.fromEntries(['width', 'height', 'decodedBytesEstimate'].filter(key => input[key] !== undefined).map(key => [key, input[key]])) };
        }
        manifest.assets[id] = packaged;
      }
      validateManifest(manifest);
      const target = `assets/releases/${args.release}.json`;
      try {
        const previous = await json(target);
        if (JSON.stringify(previous) !== JSON.stringify(manifest)) throw Error('拒绝覆盖已有 release；请使用新的 release ID');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await checkBytes(manifest, args.source);
      await writeJson(target, manifest);
    } else manifest = await selectedRelease(args.release);
    if (process.env.DEPLOY_TARGET === 'production') {
      const selected = await selectedRelease(args.release, true);
      if (JSON.stringify(selected) !== JSON.stringify(manifest)) throw Error('生产批准清单不一致');
    }
    if (mode === 'remote') {
      await verifyRemote(manifest);
      // 不删除用户文件；残留本地媒体必须用新的构建工作区处理。
      try { if ((await fs.readdir('public/media')).length) throw Error('remote 构建发现 public/media 残留，请使用干净工作区'); }
      catch (error) { if (error.code !== 'ENOENT') throw error; }
    } else {
      const source = args.source ?? (await json('assets/release.lock.json')).localSource;
      if (!source) throw Error('本地构建需要 --source 或 lock.localSource');
      await checkBytes(manifest, source);
      for (const variant of variants(manifest)) {
        const relative = variant.path.slice(`releases/${manifest.releaseId}/`.length);
        const target = path.join('public/media', variant.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(await safeFile(source, relative), target);
      }
    }
    await writeJson('public/asset-manifest.json', manifest);
    console.log(`已准备 ${manifest.releaseId}（${mode}），不自动更新批准锁文件`);
  } else {
    const manifest = args.manifest ? validateManifest(await json(args.manifest)) : await selectedRelease(args.release);
    if (command === 'check') {
      if (args.source) await checkBytes(manifest, args.source);
      console.log(`清单校验通过：${manifest.releaseId}`);
    } else if (command === 'verify-remote') await verifyRemote(manifest, { full: args.full });
    else if (command === 'publish') {
      if (!args.release || !args.source) throw Error('publish 必须提供 --release 和 --source');
      if (args.release !== manifest.releaseId) throw Error('发布 release 与 manifest 不一致');
      await checkBytes(manifest, args.source);
      console.log(`上传计划：${manifest.releaseId}，${variants(manifest).length} 个对象，${variants(manifest).reduce((s, v) => s + v.bytes, 0)} 字节；不删除任何对象`);
      if (!args.apply || args['dry-run']) console.log('dry-run：未连接 R2，未上传');
      else {
        if (manifest.contentMode !== 'demo') throw Error('当前公开发布器仅允许 demo，个人素材必须另行鉴权设计');
        if (!['s3', 'wrangler'].includes(args.transport)) throw Error('transport 必须为 s3 或 wrangler');
        const { publish } = await import(args.transport === 'wrangler' ? './r2-wrangler.mjs' : './r2.mjs');
        await publish(manifest, args.source);
      }
    } else throw Error('未知 assets 命令');
  }
} catch (error) { console.error(`资产操作失败：${error.message}`); process.exitCode = 1; }
