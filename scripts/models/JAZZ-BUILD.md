# Rebuild the jazz duo

Requires Blender 4.3 or newer. The build script imports four CC0 Quaternius
models, retains their anatomy and compatible skeleton, bakes an original 12 s duet,
and exports `public/models/jazz-duo.glb`.

Download the four pinned inputs listed in `public/models/JAZZ-LICENSE.md` into
one folder, retaining their basenames. Then run:

```bash
QUATERNIUS_SOURCE=/absolute/path/to/input-folder \
JAZZ_QA_DIR=/absolute/path/to/preview-folder \
blender --background --threads 3 --python scripts/models/build_dancers.py
```

`JAZZ_QA_FRAMES=129,255` optionally limits native inspection renders. Otherwise
frames 45, 129 and 255 cover a side step, a low kick and the turn. The `.blend`
checkpoint is written before adding the neutral preview environment.
Set `JAZZ_QA_FRAMES=''` to export without native preview renders when using
the runtime composition check below.

The 12-second `Scene` clip uses foot/hand IK, custom modern clothing, and skirt
morphs. Three.js plays it once per performance; repeated piano notes keep the
current dance moving, while the replay button starts from the beginning.
After a completed clip, the next manually played note starts another dance.

For a composition check, reload the exported GLBs with:

```bash
JAZZ_STAGE_QA_DIR=/absolute/path/to/stage-previews \
blender --background --threads 3 --python scripts/models/review_jazz_stage.py
```

This renders 390 × 540 portrait and 1000 × 480 wide frames using the runtime
camera and model placements, with approximate native lights and environment.
It checks silhouettes and clipping, not browser performance or touch behavior.
`JAZZ_STAGE_FRAMES=129,255` selects frames. The runtime environment is authored
in `src/scene/JazzEnvironment.ts`; phone framing prioritizes the two dancers,
with the piano set further back.
