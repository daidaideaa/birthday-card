import bpy,json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
for name in ['snow','rain','autumn']:
 p=next((root/'model-sources'/'studio'/name).rglob('*.blend'))
 bpy.ops.wm.open_mainfile(filepath=str(p),load_ui=False,use_scripts=False)
 print('COLLECTIONS',name,[(c.name,c.hide_render,c.hide_viewport,len(c.objects)) for c in bpy.data.collections if not any(k in c.name.lower() for k in ['widget','custom','bone'])],flush=True)
 rig=next(o for o in bpy.data.objects if o.type=='ARMATURE' and o.name.startswith('RIG'))
 print('CONTROLS',name,[(b.name,[round(v,3) for v in b.head]) for b in rig.pose.bones if b.name in ['root','master','TORSO','FK-Spine','FK-Chest','FK-Neck','FK-Head','IK-Hand.L','IK-Hand.R','IK-Foot.L','IK-Foot.R','IK-Pole-Foot.L','IK-Pole-Foot.R','head_fk','head_ik_ctrl','master_body','master_torso','properties']],flush=True)
 print('GEO',name,[(o.name,[(s.name,s.link) for s in o.material_slots]) for o in bpy.data.objects if o.name.startswith('GEO') and o.type=='MESH'],flush=True)
 print('PROP',name,{b.name:{k:v for k,v in b.items() if isinstance(v,(float,int,str))} for b in rig.pose.bones if b.name.startswith('Properties') or b.name.startswith('properties')},flush=True)
