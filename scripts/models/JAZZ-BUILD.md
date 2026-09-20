# Rebuild the jazz duo

Requires Blender 4.3 or newer. The build script imports four CC0 Quaternius
models, preserves their mesh topology and weights, bakes an original 8 s duet,
and exports `public/models/jazz-duo.glb`.

Download the four pinned inputs listed in `public/models/JAZZ-LICENSE.md` into
one folder, retaining their basenames. Then run:

```bash
QUATERNIUS_SOURCE=/absolute/path/to/input-folder \
JAZZ_QA_DIR=/absolute/path/to/preview-folder \
blender --background --threads 3 --python scripts/models/build_dancers.py
```

`JAZZ_QA_FRAMES=1,145` optionally limits native inspection renders. Otherwise the
script renders frames 1, 65, 145, and 180 with Cycles CPU. The `.blend` checkpoint
is written before adding the native preview environment. The WebGL component
uses a transparent shadow receiver to integrate into the terrace background;
the neutral floor in native previews is only for checking contact and geometry.

There is one shared `Scene` animation, 8 seconds long. The web component uses
Three.js `AnimationMixer` and plays that clip once per dance request.
