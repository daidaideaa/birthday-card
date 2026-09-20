# Jazz duet: source and license

`jazz-duo.glb` combines **Quaternius** humanoid character and clothing meshes
licensed under **CC0 1.0 Universal**, with original choreography, hairstyle
geometry, and skirt geometry authored for this project.

## Original packs and license evidence

- Universal Base Characters, Quaternius:
  https://quaternius.com/packs/universalbasecharacters.html
  The author's pack page states CC0 and permits personal/commercial projects.
- Modular Character Outfits — Fantasy, Quaternius:
  https://quaternius.com/packs/modularcharacteroutfitsfantasy.html
- CC0 1.0 Universal:
  https://creativecommons.org/publicdomain/zero/1.0/
- The mirrored original clothing license identifies Quaternius and CC0:
  https://github.com/ryanfitzpatrickio/threejs-playground/blob/bec6cda747d14ae757946f21f5bb76bc719f9c0d/public/assets/simoutfits/LICENSE.txt
- Upstream clothing instructions explicitly call for using the head with the
  complete outfit and removing obscured body geometry to avoid clipping:
  https://github.com/ryanfitzpatrickio/threejs-playground/blob/bec6cda747d14ae757946f21f5bb76bc719f9c0d/public/assets/simoutfits/UPSTREAM-README.txt

## Exact inputs

All four downloads are pinned to commit
`bec6cda747d14ae757946f21f5bb76bc719f9c0d` of the public mirror
`ryanfitzpatrickio/threejs-playground`:

- `simhuman/ubc-male.glb`
  https://raw.githubusercontent.com/ryanfitzpatrickio/threejs-playground/bec6cda747d14ae757946f21f5bb76bc719f9c0d/public/assets/simhuman/ubc-male.glb
- `simhuman/ubc-female.glb`
  https://raw.githubusercontent.com/ryanfitzpatrickio/threejs-playground/bec6cda747d14ae757946f21f5bb76bc719f9c0d/public/assets/simhuman/ubc-female.glb
- `simoutfits/male-peasant.glb`
  https://raw.githubusercontent.com/ryanfitzpatrickio/threejs-playground/bec6cda747d14ae757946f21f5bb76bc719f9c0d/public/assets/simoutfits/male-peasant.glb
- `simoutfits/female-peasant.glb`
  https://raw.githubusercontent.com/ryanfitzpatrickio/threejs-playground/bec6cda747d14ae757946f21f5bb76bc719f9c0d/public/assets/simoutfits/female-peasant.glb

## Changes in this project

- Retained the source anatomy, face meshes, garment meshes, skeletal hierarchy,
  and corresponding skin weights; mapped source bone names where necessary.
- Removed unused body regions, unused morph targets, and fantasy forearm cuffs.
- Added original short/bob hairstyles and an overlapping ochre skirt with a
  subtle follow-through morph; recolored clothing and footwear.
- Reduced textures to 512 px, normalized scale, and optimized animation tracks.
- Created an original eight-second paired sequence with preparation, shared
  side steps, a hand-guided turn, and return. Blender hand/foot IK is baked into
  the exported skeletal clip. This is authored animation, not motion capture.
- The modified combined model is provided under CC0 1.0 Universal as well.

No Mixamo files or the mirror's Meshy-generated showcase wardrobe/hair assets
are included in the delivered model. The grand piano has a separate CC BY 3.0
license; see `PIANO-LICENSE.md`.
