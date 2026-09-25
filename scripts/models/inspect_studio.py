"""Inspect the official production rigs without enabling embedded scripts."""
import bpy, json, sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
out = root / '.asset-build' / 'studio-inspect'
out.mkdir(parents=True, exist_ok=True)
for name in ['snow', 'rain', 'autumn']:
    files = list((root / 'model-sources' / 'studio' / name).rglob('*.blend'))
    if not files:
        continue
    source = next((p for p in files if 'rig' in p.name.lower()), files[0])
    bpy.ops.wm.open_mainfile(filepath=str(source), load_ui=False, use_scripts=False)
    info = {'file': str(source), 'objects': [], 'texts': [], 'materials': []}
    for obj in bpy.data.objects:
        item = {'name': obj.name, 'type': obj.type, 'hidden': obj.hide_render,
                'location': list(obj.location), 'scale': list(obj.scale),
                'dimensions': list(obj.dimensions), 'parent': obj.parent.name if obj.parent else None}
        if obj.type == 'ARMATURE':
            item['bones'] = [{'name': b.name, 'deform': b.use_deform, 'head':list(b.head_local),'tail':list(b.tail_local)} for b in obj.data.bones]
            item['props'] = {b.name:dict(b.items()) for b in obj.pose.bones if len(b.keys())}
        if obj.type == 'MESH':
            item['vertices'] = len(obj.data.vertices)
            item['materials'] = [m.name for m in obj.data.materials if m]
            item['modifiers'] = [(m.name,m.type) for m in obj.modifiers]
            item['particles'] = [(p.name,p.settings.type,p.settings.count,p.settings.hair_length) for p in obj.particle_systems]
        info['objects'].append(item)
    for mat in bpy.data.materials:
        info['materials'].append({'name':mat.name,'nodes':[(n.name,n.type) for n in mat.node_tree.nodes] if mat.use_nodes else []})
    for t in bpy.data.texts:
        info['texts'].append({'name': t.name, 'length':len(t.as_string())})
        (out / f'{name}-{t.name}.txt').write_text(t.as_string(), encoding='utf-8')
    (out / f'{name}.json').write_text(json.dumps(info, indent=2,default=str), encoding='utf-8')
    print('INSPECTED',name,source,len(info['objects']),flush=True)
