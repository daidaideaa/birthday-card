import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { byteRange } from '../deploy/media-worker/worker.mjs';
import manifest from '../assets/releases/runtime-20260925-v1.json';
import reviewManifest from '../assets/releases/duet-review-20261003-v1.json';
const asset = manifest.assets['invitation.background'].variants.standard;
const url = `https://media.test/birthday-card/${asset.path}`;
function bucket() {
  let reads = 0;
  const metadata = { size: asset.bytes, httpEtag: '"test-etag"', uploaded: new Date('2026-09-25T00:00:00Z') };
  return { get reads() { return reads; }, BIRTHDAY_ASSETS: {
    async head() { reads++; return metadata; },
    async get(_key, options) {
      reads++;
      if (options.onlyIf.get('If-None-Match') === metadata.httpEtag) return metadata;
      const length = options.range?.length ?? asset.bytes;
      return { ...metadata, body: new Blob([new Uint8Array(length)]).stream() };
    },
  } };
}
test('media gateway rejects unknown paths, writes and bad ranges before accessing R2', async () => {
  const env = bucket();
  for (const [target, method, status] of [[url + '?other=1', 'GET', 404], ['https://media.test/birthday-card/', 'GET', 404], [url, 'PUT', 405]]) {
    const response = await worker.fetch(new Request(target, { method }), env);
    assert.equal(response.status, status); assert.equal(response.headers.get('cache-control'), 'no-store');
  }
  const response = await worker.fetch(new Request(url, { headers: { Range: 'bytes=9999999999-' } }), env);
  assert.equal(response.status, 416); assert.equal(env.reads, 0);
});
test('media gateway streams byte ranges and exposes permitted CORS headers', async () => {
  const env = bucket();
  const response = await worker.fetch(new Request(url, { headers: { Range: 'bytes=0-15', Origin: 'https://daidaideaa.github.io' } }), env);
  assert.equal(response.status, 206); assert.equal((await response.arrayBuffer()).byteLength, 16);
  assert.equal(response.headers.get('content-range'), `bytes 0-15/${asset.bytes}`);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://daidaideaa.github.io');
  assert.equal(env.reads, 1);
});
test('HEAD and conditional GET preserve metadata without a response body', async () => {
  const env = bucket();
  const head = await worker.fetch(new Request(url, { method: 'HEAD' }), env);
  assert.equal(head.status, 200); assert.equal(head.body, null);
  assert.equal(head.headers.get('content-length'), String(asset.bytes));
  const cached = await worker.fetch(new Request(url, { headers: { 'If-None-Match': '"test-etag"' } }), env);
  assert.equal(cached.status, 304); assert.equal(cached.body, null);
});
test('byte range handles suffix, open end and invalid requests', () => {
  assert.deepEqual(byteRange('bytes=-10', 100), { offset: 90, length: 10 });
  assert.deepEqual(byteRange('bytes=90-', 100), { offset: 90, length: 10 });
  assert.deepEqual(byteRange('bytes=0-999', 100), { offset: 0, length: 100 });
  for (const range of ['bytes=10-5', 'bytes=-0', 'bytes=0-1,4-5', 'bytes=-', 'bytes=100-']) assert.throws(() => byteRange(range, 100));
});

test('candidate release is readable from the review origin without opening unlisted objects', async () => {
  const model = reviewManifest.assets['duet.male'].variants.standard;
  const response = await worker.fetch(new Request(`https://media.test/birthday-card/${model.path}`, {
    method: 'HEAD', headers: { Origin: 'http://127.0.0.1:5185' },
  }), { BIRTHDAY_ASSETS: { async head() { return { size: model.bytes, httpEtag: '"candidate"', uploaded: new Date('2026-10-03') }; } } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'model/gltf-binary');
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5185');
  const denied = await worker.fetch(new Request('https://media.test/birthday-card/releases/duet-review-20261003-v1/source.blend'), bucket());
  assert.equal(denied.status, 404);
});
