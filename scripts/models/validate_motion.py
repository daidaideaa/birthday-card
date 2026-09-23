"""Check actual decoded duet skinning, not only Blender IK target positions."""
import bpy, json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'.asset-build/review/jazz-duo.glb'))
scene=bpy.context.scene;scene.render.fps=30
shoes=[o for o in scene.objects if o.type=='MESH' and 'dance shoe' in o.name.lower().replace('_',' ')]
assert len(shoes)==4, f'Expected four shoes, got {len(shoes)}'
rows=[]
for frame in range(1,362,6):
 scene.frame_set(frame);graph=bpy.context.evaluated_depsgraph_get()
 for shoe in shoes:
  obj=shoe.evaluated_get(graph);mesh=obj.to_mesh()
  low=min((obj.matrix_world@v.co).z for v in mesh.vertices)
  rows.append({'frame':frame,'shoe':shoe.name,'floor_z':round(low,5)})
  obj.to_mesh_clear()
minimum=min(r['floor_z'] for r in rows)
assert minimum>-.035, f'Sole penetrates the floor by {-minimum:.3f} m'
out=ROOT/'test-results';out.mkdir(exist_ok=True)
(out/'duet-floor-contact.json').write_text(json.dumps({'minimum_z':minimum,'samples':rows},indent=2))
print(f'Four shoes / {len(rows)} skinning samples: minimum sole height {minimum:.5f} m')
