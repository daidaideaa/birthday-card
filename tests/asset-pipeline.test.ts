import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const cli = path.resolve('scripts/delivery/assets.mjs');
const tsx = pathToFileURL(path.resolve('node_modules/tsx/dist/loader.mjs')).href;
test('pipeline fails closed on changed immutable release, missing files and production mismatch', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'birthday-delivery-'));
  try {
    await fs.mkdir(path.join(root, 'assets'), { recursive: true });
    await fs.mkdir(path.join(root, 'input'));
    await fs.copyFile('assets/source-manifest.json', path.join(root, 'assets/source-manifest.json'));
    await fs.copyFile('assets/demo/invitation.svg', path.join(root, 'input/invitation.svg'));
    const invoke = (args: string[], env: Record<string, string> = {}) => spawnSync(process.execPath, ['--import', tsx, cli, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, VITE_ASSET_BASE_URL: '', DEPLOY_TARGET: '', ...env } });
    assert.equal(invoke(['prepare', '--release', 'test-v1', '--source', 'input']).status, 0);
    await fs.writeFile(path.join(root, 'assets/release.lock.json'), JSON.stringify({ releaseId: 'test-v1', localSource: 'input' }));
    assert.equal(invoke(['publish', '--release', 'test-v1', '--source', 'input', '--dry-run']).status, 0);
    await fs.appendFile(path.join(root, 'input/invitation.svg'), 'changed');
    const conflict = invoke(['prepare', '--release', 'test-v1', '--source', 'input']);
    assert.equal(conflict.status, 1); assert.match(conflict.stderr, /拒绝覆盖/);
    const changed = invoke(['publish', '--release', 'test-v1', '--source', 'input', '--apply']);
    assert.equal(changed.status, 1); assert.match(changed.stderr, /字节与清单不一致/);
    await fs.unlink(path.join(root, 'input/invitation.svg'));
    assert.equal(invoke(['check', '--manifest', 'assets/releases/test-v1.json', '--source', 'input']).status, 1);
    const mismatch = invoke(['prepare'], { DEPLOY_TARGET: 'production', ASSET_RELEASE_ID: 'unapproved-v2' });
    assert.equal(mismatch.status, 1); assert.match(mismatch.stderr, /生产 release/);
  } finally {
    // This directory is the exact fresh mkdtemp result, outside the user's sources.
    await fs.rm(root, { recursive: true, force: true });
  }
});
