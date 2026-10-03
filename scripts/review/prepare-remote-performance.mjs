import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { selectedRelease, verifyRemote } from '../delivery/lib.mjs';

// A fresh checkout can review the published candidate without private source
// rigs, Blender, or downloading the GLBs into the website artifact.
if (process.env.VITE_ASSET_BASE_URL) {
  const manifest = await selectedRelease(process.env.ASSET_RELEASE_ID || 'duet-review-20261003-v1', false);
  for (const id of ['duet.male', 'duet.female', 'duet.timeline']) if (!manifest.assets[id]) throw Error(`预览 release 缺少 ${id}`);
  await verifyRemote(manifest);
  const output = '.asset-build/performance-remote/public';
  await mkdir(output, { recursive: true });
  await cp('public', output, { recursive: true, filter: file => !path.relative('public', file).split(path.sep).includes('media') });
  await writeFile(`${output}/asset-manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
  await mkdir(`${output}/basis`, { recursive: true });
  for (const name of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
    await writeFile(`${output}/basis/${name}`, await readFile(`node_modules/three/examples/jsm/libs/basis/${name}`));
  }
  console.log(`远程动作预览已准备：${manifest.releaseId}`);
}
