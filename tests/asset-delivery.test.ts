import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertMediaPath, validateManifest } from '../src/assets/manifest.ts';
import { createAssetResolver, mediaRoot } from '../src/utils/mediaUrl.ts';
const example = () => JSON.parse(readFileSync('assets/releases/demo-contract-v1.json', 'utf8'));
test('asset paths reject traversal, encoded URLs and alternative separators', () => {
  for (const p of ['../x', 'a/../x', '/x', '//host/x', 'https://host/x', 'a\\x', 'a%2fx', '%252e%252e/x', 'a?b', 'a#b', 'a//b']) assert.throws(() => assertMediaPath(p));
  assert.doesNotThrow(() => assertMediaPath('releases/demo/你好 world.webp'));
});
test('media roots distinguish local subpath, trusted HTTPS and development HTTP', () => {
  assert.equal(mediaRoot('', '/birthday-card/', 'https://owner.github.io').href, 'https://owner.github.io/birthday-card/media/');
  assert.equal(mediaRoot('', '/', 'https://site.pages.dev').pathname, '/media/');
  for (const root of ['http://cdn.test/', '//cdn.test/', 'https://a:b@cdn.test/', 'https://cdn.test/?token=x', 'https://cdn.test/no-slash', 'https://cdn.test/a/../b/']) assert.throws(() => mediaRoot(root));
  assert.equal(mediaRoot('http://localhost:5173/', '/', '', true).hostname, 'localhost');
});
test('release snapshot stays fixed and lite falls back to standard', () => {
  const manifest = example();
  const resolve = createAssetResolver(manifest, new URL('https://cdn.test/birthday-card/'));
  manifest.assets['invitation.background'].variants.standard.path = 'changed';
  assert.equal(resolve('invitation.background', 'lite'), 'https://cdn.test/birthday-card/releases/demo-contract-v1/invitation.svg');
  assert.throws(() => resolve('missing'), /missing/);
  assert.throws(() => resolve('toString'), /toString/);
});
test('manifest rejects broken references, cycles, paths and fingerprints', () => {
  for (const change of [
    m => m.assets['invitation.background'].variants.standard.sha256 = 'fake',
    m => m.assets['invitation.background'].variants.standard.path = 'releases/other/a.svg',
    m => m.assets['invitation.background'].dependencies = ['missing'],
    m => m.assets['invitation.background'].dependencies = ['invitation.background'],
    m => m.bundles.invitation.critical = ['missing'],
  ] as Array<(m: ReturnType<typeof example>) => void>) {
    const manifest = example(); change(manifest); assert.throws(() => validateManifest(manifest));
  }
});
