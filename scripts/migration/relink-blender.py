"""Repair project-local image paths after moving a legacy .blend to a new computer.
blender -b scene.blend -P scripts/migration/relink-blender.py -- PROJECT_ROOT
Only the explicitly opened file is saved; source scripts are not auto-executed.
"""
import bpy
import sys
from pathlib import Path
root=Path(sys.argv[sys.argv.index('--')+1]).resolve()
missing=[]
for image in bpy.data.images:
    if image.packed_file or image.source not in ['FILE','TILED'] or not image.filepath:
        continue
    raw=image.filepath.replace('\\','/')
    candidates=[]
    for marker in ['model-sources/','public/','scripts/cinema/assets/']:
        if marker in raw:candidates.append(root/raw[raw.index(marker):])
    name=Path(raw).name
    if '<UDIM>' in name:name=name.replace('<UDIM>','1001')
    for folder in [root/'model-sources',root/'public',root/'scripts/cinema/assets']:
        candidates.extend(folder.rglob(name))
    match=next((p for p in candidates if p.is_file()),None)
    if match:
        image.filepath=str(match).replace('1001','<UDIM>') if '<UDIM>' in raw else str(match)
        image.reload()
    elif not Path(bpy.path.abspath(image.filepath)).is_file():missing.append(image.name)
if missing:
    raise RuntimeError('Missing image dependencies: '+', '.join(missing))
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath,compress=True)
print('PORTABLE_BLEND_OK',Path(bpy.data.filepath).name)
