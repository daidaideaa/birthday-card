import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, resample, meshopt, flatten } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

const source = process.argv[2] || '.asset-build/duet-runtime';
const output = '.asset-build/performance-review/public/review-assets/duet-performance-v1';
await mkdir(output, { recursive: true });
await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const manifest = JSON.parse(await readFile(`${source}/timeline.json`, 'utf8'));
for (const actor of manifest.actors) {
  const document = await io.read(`${source}/${actor.file}`);
  // Blender's frame 1 may be exported at 1/FPS rather than zero. Normalize the
  // actual sample clock before compression so contact seconds match the browser.
  for (const animation of document.getRoot().listAnimations()) {
    const inputs = [...new Set(animation.listSamplers().map(s => s.getInput()))];
    const offset = Math.min(...inputs.map(a => a.getArray()[0]));
    for (const input of inputs) input.setArray(Float32Array.from(input.getArray(), t => Math.round((t - offset) * manifest.fps) / manifest.fps));
  }
  await document.transform(flatten(), dedup(), prune(), weld(), resample({ tolerance: 0.00001 }), meshopt({
    encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16, quantizeNormal: 12,
  }));
  await io.write(`${output}/${actor.file}`, document);
  actor.bytes = (await stat(`${output}/${actor.file}`)).size;
  console.log(`${actor.actor}: ${(actor.bytes / 1048576).toFixed(2)} MiB, ${actor.bones} bones`);
}
await writeFile(`${output}/timeline.json`, JSON.stringify(manifest, null, 2));
await cp('public', '.asset-build/performance-review/public', { recursive: true });
await mkdir('.asset-build/performance-review/public/basis', { recursive: true });
for (const file of ['basis_transcoder.js', 'basis_transcoder.wasm']) {
  await cp(`node_modules/three/examples/jsm/libs/basis/${file}`, `.asset-build/performance-review/public/basis/${file}`);
}
