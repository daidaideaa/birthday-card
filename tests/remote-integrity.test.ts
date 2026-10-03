import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hash, verifyRemote } from '../scripts/delivery/lib.mjs';

test('remote integrity requests stored bytes when the CDN could compress JSON', async t => {
  const content = Buffer.from('{"duration":26}');
  const manifest = { schemaVersion: 1, releaseId: 'json-test', contentMode: 'demo',
    assets: { timeline: { kind: 'data', variants: { standard: { path: 'releases/json-test/timeline.json', mime: 'application/json', bytes: content.length, sha256: hash(content) } } } }, bundles: {} };
  const previous = process.env.VITE_ASSET_BASE_URL;
  process.env.VITE_ASSET_BASE_URL = 'https://media.test/birthday-card/';
  t.after(() => { if (previous === undefined) delete process.env.VITE_ASSET_BASE_URL; else process.env.VITE_ASSET_BASE_URL = previous; });
  t.mock.method(globalThis, 'fetch', async (url: URL, options: RequestInit) => {
    const headers = new Headers(options.headers);
    assert.equal(headers.get('Accept-Encoding'), 'identity');
    if (String(url).endsWith('/ready.json')) return Response.json({ releaseId: manifest.releaseId, manifestSha256: hash(JSON.stringify(manifest)) });
    return new Response(options.method === 'HEAD' ? null : content, { headers: {
      'Content-Type': 'application/json', 'Content-Length': String(content.length),
      'Cache-Control': 'public, immutable', 'Access-Control-Allow-Origin': 'https://site.test',
    } });
  });
  await verifyRemote(manifest, { origin: 'https://site.test' });
  await verifyRemote(manifest, { full: true, origin: 'https://site.test' });
});
