// No npm packages or account credentials are needed to view the exported preview.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.argv[2] || '.asset-build/character-preview');
const port = Number(process.argv[3] || 5181);
const entry = process.argv[4] || 'character-review.html';
if (!/^[a-z0-9-]+\.html$/.test(entry)) throw Error('Invalid preview entry');
const base = '/birthday-card/';
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.glb':'model/gltf-binary', '.woff':'font/woff', '.png':'image/png', '.webp':'image/webp', '.jpeg':'image/jpeg', '.jpg':'image/jpeg', '.mp4':'video/mp4', '.mp3':'audio/mpeg', '.ogg':'audio/ogg', '.wasm':'application/wasm' };
createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/' || url.pathname === base) { res.writeHead(302, {Location: `${base}${entry}`}).end(); return; }
    if (!url.pathname.startsWith(base)) { res.writeHead(404).end(); return; }
    const file = resolve(root, decodeURIComponent(url.pathname.slice(base.length)));
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const info = await stat(file);
    if (!info.isFile()) throw Error('Not a file');
    res.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': info.size, 'Cache-Control':'no-cache', 'X-Content-Type-Options':'nosniff'});
    if (req.method === 'HEAD') res.end(); else createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch { res.writeHead(404).end('File not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:${port}${base}${entry}\nPress Ctrl+C to stop.`));
