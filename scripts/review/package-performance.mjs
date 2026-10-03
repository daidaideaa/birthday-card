import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { assertReleaseId } from '../../src/assets/manifest.ts';

// Run prepare-performance and validate-performance first. The full snapshot
// includes the existing story assets, so a browser only consumes one release.
const release = process.argv[2];
assertReleaseId(release);
const source = '.asset-build/performance-review/public';
const sourceManifest = '.asset-build/performance-review/source-manifest.json';
const manifest = JSON.parse(await readFile('assets/runtime-source-manifest.json', 'utf8'));
const timeline = JSON.parse(await readFile(`${source}/review-assets/duet-performance-v1/timeline.json`, 'utf8'));
if (timeline.status !== 'animation-candidate') throw Error('A sparse pose check cannot be published as a full animation.');
for (const [id, file, kind, mime] of [
  ['duet.male', 'snow-performance.glb', 'model', 'model/gltf-binary'],
  ['duet.female', 'rain-performance.glb', 'model', 'model/gltf-binary'],
  ['duet.timeline', 'timeline.json', 'data', 'application/json'],
]) {
  manifest.assets[id] = {
    kind,
    license: 'CC-BY-4.0 (Blender Studio Snow / Rain); project authored choreography',
    source: 'public/ASSET_SOURCES.md; docs/CHARACTER_REWORK.md; scripts/models/build_duet_runtime.py',
    variants: { standard: { file: `review-assets/duet-performance-v1/${file}`, mime } },
  };
}
manifest.bundles.duet = { critical: ['duet.male', 'duet.female', 'legacy.models.grand_piano.glb'], deferred: ['duet.timeline'] };
await writeFile(sourceManifest, JSON.stringify(manifest, null, 2) + '\n');
const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/delivery/assets.mjs', 'prepare', '--release', release, '--source', source, '--source-manifest', sourceManifest, '--mode', 'manifest'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
