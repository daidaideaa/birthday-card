import manifest from '../../assets/releases/runtime-20260925-v1.json';
const allowed = new Map(Object.values(manifest.assets).flatMap(entry => Object.values(entry.variants)).map(v => [`/birthday-card/${v.path}`, v]));
allowed.set(`/birthday-card/releases/${manifest.releaseId}/ready.json`, { mime: 'application/json' });
const origins = new Set(['https://daidaideaa.github.io', 'http://localhost:5173', 'http://127.0.0.1:5173']);

export function byteRange(header, size) {
  if (!header) return undefined;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || !size || (!match[1] && !match[2])) throw Error('range');
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) throw Error('range');
  return { offset: start, length: end - start + 1 };
}
export default {
  async fetch(request, env) {
    const headers = new Headers({ 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex', 'Vary': 'Origin', 'Cache-Control': 'no-store' });
    const origin = request.headers.get('Origin');
    if (origins.has(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Expose-Headers', 'ETag, Content-Length, Content-Range, Accept-Ranges');
    }
    const fail = (status, text) => new Response(request.method === 'HEAD' ? null : text, { status, headers });
    const url = new URL(request.url);
    let pathname;
    try { pathname = decodeURIComponent(url.pathname); } catch { return fail(400, 'Bad path'); }
    if (pathname.includes('%') || pathname.includes('\\') || url.search || !allowed.has(pathname)) return fail(404, 'Not found');
    if (request.method === 'OPTIONS') {
      if (!origins.has(origin) || !['GET', 'HEAD'].includes(request.headers.get('Access-Control-Request-Method'))) return fail(403, 'Origin or method not allowed');
      headers.set('Access-Control-Allow-Methods', 'GET, HEAD');
      headers.set('Access-Control-Allow-Headers', 'Range, If-None-Match, If-Modified-Since, If-Range');
      headers.set('Access-Control-Max-Age', '3600');
      return new Response(null, { status: 204, headers });
    }
    if (!['GET', 'HEAD'].includes(request.method)) { headers.set('Allow', 'GET, HEAD, OPTIONS'); return fail(405, 'Method not allowed'); }
    const asset = allowed.get(pathname);
    let range;
    try {
      // Ignoring Range with If-Range legally returns the whole representation.
      range = request.method === 'GET' && !request.headers.has('If-Range') ? byteRange(request.headers.get('Range'), asset.bytes) : undefined;
    } catch { headers.set('Content-Range', `bytes */${asset.bytes ?? 0}`); return fail(416, 'Range not satisfiable'); }
    try {
      const key = pathname.slice(1);
      const object = request.method === 'HEAD'
        ? await env.BIRTHDAY_ASSETS.head(key)
        : await env.BIRTHDAY_ASSETS.get(key, { onlyIf: request.headers, ...(range ? { range } : {}) });
      if (!object) return fail(404, 'Not found');
      if (asset.bytes && object.size !== asset.bytes) { await object.body?.cancel(); return fail(503, 'Release integrity mismatch'); }
      headers.set('Content-Type', asset.mime);
      headers.set('ETag', object.httpEtag);
      headers.set('Last-Modified', object.uploaded.toUTCString());
      headers.set('Accept-Ranges', 'bytes');
      const notModified = request.headers.get('If-None-Match')?.split(',').some(v => v.trim() === '*' || v.trim().replace(/^W\//, '') === object.httpEtag)
        || (!request.headers.has('If-None-Match') && request.headers.has('If-Modified-Since') && Math.floor(object.uploaded.getTime() / 1000) <= Math.floor(Date.parse(request.headers.get('If-Modified-Since')) / 1000));
      if (notModified) { await object.body?.cancel(); headers.set('Cache-Control', 'public, max-age=31536000, immutable'); return new Response(null, { status: 304, headers }); }
      if (request.method === 'GET' && !object.body) return fail(412, 'Precondition failed');
      headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      headers.set('Content-Length', String(range?.length ?? object.size));
      if (range) headers.set('Content-Range', `bytes ${range.offset}-${range.offset + range.length - 1}/${object.size}`);
      return new Response(request.method === 'HEAD' ? null : object.body, { status: range ? 206 : 200, headers });
    } catch { return fail(503, 'Storage temporarily unavailable'); }
  },
};
