import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

// Keep authoring exports intact. Only the separate browser version is optimized.
const source = '.asset-build/character-review/public/review-assets/characters-v1';
const output = '.asset-build/character-review/public/review-assets/characters-v2';
await mkdir(output, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder,
});
const manifest = JSON.parse(await readFile(`${source}/manifest.json`, 'utf8'));
manifest.version = 'characters-v2';
manifest.encoding = 'EXT_meshopt_compression';
let before = 0, after = 0;
for (const poses of Object.values(manifest.characters)) for (const pose of poses) {
  const document = await io.read(`${source}/${pose.file}`);
  await document.transform(dedup(), prune(), weld(), meshopt({
    encoder: MeshoptEncoder, level: 'medium', quantizePosition: 16, quantizeNormal: 12,
  }));
  await io.write(`${output}/${pose.file}`, document);
  before += pose.bytes;
  pose.bytes = (await stat(`${output}/${pose.file}`)).size;
  after += pose.bytes;
}
await writeFile(`${output}/manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`Character downloads: ${(before / 1048576).toFixed(1)} → ${(after / 1048576).toFixed(1)} MiB`);
