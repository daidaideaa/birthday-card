# Rebuild and review the jazz duo

Use Blender 4.3.2 and Node.js 22.12+. The build imports four pinned CC0
Quaternius models, retains their compatible skeleton, and bakes an original
12-second duet with foot/hand IK, modern clothing and skirt morphs.

```sh
npm run assets:sources
BLENDER_BIN=/absolute/path/to/blender npm run assets:build
npm run assets:review:prepare
blender --background --python-exit-code 1 --python scripts/models/validate_motion.py
JAZZ_STAGE_QA_DIR=test-results/blender JAZZ_STAGE_FRAMES=129,255 \
blender --background --threads 2 --python-exit-code 1 --python scripts/models/review_jazz_stage.py
```

Inputs and SHA-256 hashes are in `sources.json`; attribution remains in
`public/models/JAZZ-LICENSE.md`. Source scripts write `.asset-build/raw`, then
glTF Transform and Meshopt produce the validated files in `public/models`.
`MODEL_OUT` overrides the raw output location. Do not use compressed final
files as authoring inputs. For an individual dancer build, run
`blender --background --python-exit-code 1 --python scripts/models/build_dancers.py`.
`ASSET_PREVIEW=1` requests its optional native previews; `JAZZ_QA_FRAMES=129,255`
limits those frames. The batch build disables source previews.

Blender cannot import the runtime Meshopt extension directly, so the review
prepare step decodes the final delivered files into `.asset-build/review`.
The composition script renders 390×540 portrait and 1000×480 wide frames with
the runtime camera, placements and movement curve. AgX/native lighting only
approximates the browser's ACES/PMREM environment; browser screenshots are
the final visual reference. It does not measure phone performance.

`validate_motion.py` samples evaluated shoe meshes across the exported clip
and rejects floor penetration deeper than 3.5 cm. Inspect the JSON and browser
key frames for sliding, hand contact and silhouette; this guard is not an
aesthetic score. The current sampled minimum sole height is about 2.9 mm.

Three.js plays `Scene` once per performance using the cinematic clock.
Repeated piano notes keep the current dance moving; replay starts at zero.
The next manual note after completion starts another dance. The environment
is authored in `src/scene/JazzEnvironment.ts`; portrait framing prioritizes
both dancers, with the piano further back.
