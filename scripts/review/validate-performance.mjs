import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import validator from 'gltf-validator';
import { DUET_TIMELINE } from '../../src/music/duetTimeline.ts';

const root = '.asset-build/performance-review/public/review-assets/duet-performance-v1';
const timeline = JSON.parse(await readFile(`${root}/timeline.json`, 'utf8'));
assert.equal(timeline.status, 'animation-candidate', 'Sparse pose checks are not a complete performance');
assert.equal(timeline.duration, DUET_TIMELINE.duration);
assert.deepEqual(timeline.stops, DUET_TIMELINE.stops);
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const files = [];
for (const actor of timeline.actors) {
  const bytes = await readFile(`${root}/${actor.file}`), document = await io.read(`${root}/${actor.file}`);
  assert.ok(document.getRoot().listSkins().length > 0, 'runtime must retain its skin');
  assert.equal(document.getRoot().listAnimations().length, 1);
  let duration = 0;
  for (const sampler of document.getRoot().listAnimations()[0].listSamplers()) {
    const times = sampler.getInput().getArray(); duration = Math.max(duration, times.at(-1));
  }
  assert.equal(duration, timeline.duration);
  for (const extension of document.getRoot().listExtensionsUsed()) if (extension.extensionName === 'EXT_meshopt_compression') extension.dispose();
  const report = await validator.validateBytes(await io.writeBinary(document), { uri: actor.file, maxIssues: 40 });
  files.push({ file: actor.file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), duration, errors: report.issues.numErrors, warnings: report.issues.numWarnings, messages: report.issues.messages });
  console.log(`${actor.file}: ${duration}s; ${report.issues.numErrors} errors, ${report.issues.numWarnings} warnings`);
}
await mkdir('.asset-build/performance-review/validation', { recursive: true });
await writeFile('.asset-build/performance-review/validation/gltf.json', JSON.stringify(files, null, 2));
await writeFile('assets/review/duet-performance-v1.json', JSON.stringify({ version: 'duet-performance-v1', kind: 'skinned-authored-performance-candidate', reviewOnly: true, visualApproval: 'pending', timeline: { duration: timeline.duration, stops: timeline.stops, beats: timeline.beats }, files: files.map(file => { const entry = { ...file }; delete entry.messages; return entry; }) }, null, 2));
assert.ok(files.every(f => f.errors === 0), 'GLB validation failed');
