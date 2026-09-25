// One-time, explicit migration inventory. It never uploads or deletes anything.
import fs from 'node:fs/promises';
import path from 'node:path';
import { writeJson } from './lib.mjs';
const assets = {}, paths = {};
const mime = { '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const preferred = { 'images/castle-night.webp': 'invitation.background', 'models/teddy-apricot.glb': 'pets.apricot', 'models/teddy-cream.glb': 'pets.cream', 'models/lions/lion-cub.glb': 'pride.cub.model', 'models/lions/father-lion.glb': 'pride.father.model' };
async function inventory(directory) {
  for (const entry of await fs.readdir(`public/${directory}`, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) { await inventory(file); continue; }
    if (!entry.isFile() || !mime[path.extname(file)]) continue;
    const kind = file.endsWith('.glb') ? 'model' : file.endsWith('.mp3') ? 'audio' : file.endsWith('.mp4') ? 'data' : 'image';
    const id = preferred[file] || `legacy.${file.replaceAll('/', '.').replaceAll('-', '_')}`;
    let license;
    if (file.endsWith('.mp4') || file.startsWith('cinema/')) license = 'CC-BY-4.0; CC-BY-3.0 audio; project original score (see attribution)';
    else if (file.startsWith('images/')) license = file.endsWith('.jpg') ? 'Unsplash License' : 'Project generated artwork';
    else if (file.startsWith('audio/') || file.includes('grand-piano')) license = 'CC-BY-3.0';
    else if (file.includes('lions/')) license = 'CC-BY-4.0';
    else if (file.includes('jazz-duo')) license = 'CC0-1.0 + project original';
    else license = 'Project original';
    assets[id] = { kind, license, source: `public/ASSET_SOURCES.md; existing tracked demo: ${file}`, variants: { standard: { file, mime: mime[path.extname(file)] } } };
    paths[file] = id;
  }
}
for (const directory of ['images', 'models', 'audio', 'cinema']) await inventory(directory);
const bundles = { invitation: { critical: ['invitation.background'], deferred: [] }, legacy: { critical: [], deferred: Object.keys(assets).filter(id => id !== 'invitation.background') } };
await writeJson('assets/runtime-source-manifest.json', { schemaVersion: 1, contentMode: 'demo', assets, bundles });
await writeJson('assets/legacy-paths.json', paths);
console.log(`已登记 ${Object.keys(assets).length} 项现有示意媒体，不执行预加载`);
