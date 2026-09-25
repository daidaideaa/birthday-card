"""Local continuity repair. Preserve frames 1–300 and the production source.

Outputs duet-polished.blend and representative Cycles proofs. No external
handlers or new mesh deformation: the existing hair FK chain does the work.
"""
import sys, math, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *
from mathutils import Quaternion

bpy.ops.wm.open_mainfile(filepath=str(BUILD/'duet-production.blend'), use_scripts=False)
scene=bpy.context.scene
rig=bpy.data.objects['RIG-rain']
names=[f'FK-Hair_Ponytail{i}' for i in range(1,5)]
action=rig.animation_data.action
assert not any(any(f'pose.bones["{name}"]' in c.data_path for name in names) for c in action.fcurves), 'Unexpected authored ponytail animation; preserve it before applying polish.'
axes={name:rig.data.bones[name].matrix_local.to_quaternion().inverted()@Vector((1,0,0)) for name in names}
# A tied root, then increasingly downward tangents. The tip is gently curved,
# not a rigid cone. Keep the hairstyle settled through the final held pose.
angles=[.20,.56,.45,.20]
for frame in range(1,578):
    weight=smooth((frame-300)/34)
    t=(frame-1)/24
    settling=1-smooth((t-20)/2)
    for index,name in enumerate(names):
        bone=rig.pose.bones[name];bone.rotation_mode='XYZ'
        bend=angles[index]+(.035+.014*index)*math.sin((t-12.5)*3.1-index*.52)*settling
        rotation=Quaternion(axes[name],-bend*weight)
        bone.rotation_euler=rotation.to_euler('XYZ')
        key(bone,'rotation_euler',frame)

body=bpy.data.objects['GEO-rain-body']
original=body.modifiers['Costume interior mask']
group=body.vertex_groups.new(name='Skirt interior with full lower thighs')
group.add([v.index for v in body.data.vertices if .65<v.co.z<.935],1,'REPLACE')
repaired=body.modifiers.new('Turn costume interior mask','MASK')
repaired.vertex_group=group.name;repaired.invert_vertex_group=True
# The last forward kick extends beyond frame 300; retain its original interior
# mask until 13.5 seconds. Boolean visibility is embedded animation, so a fresh
# Blender render does not need trusted scripts or per-frame Python handlers.
for frame,late in [(1,False),(324,False),(325,True),(577,True)]:
    for modifier,on in [(original,not late),(repaired,late)]:
        modifier.show_render=on;modifier.show_viewport=on
        key(modifier,'show_render',frame);key(modifier,'show_viewport',frame)
for curve in body.animation_data.action.fcurves:
    if 'Costume interior mask' in curve.data_path or 'Turn costume interior mask' in curve.data_path:
        for point in curve.keyframe_points:point.interpolation='CONSTANT'
for curve in action.fcurves:
    if any(f'pose.bones["{name}"]' in curve.data_path for name in names):
        for point in curve.keyframe_points:point.interpolation='LINEAR'

prefs=bpy.context.preferences.addons['cycles'].preferences
prefs.compute_device_type='OPTIX';prefs.get_devices()
for device in prefs.devices:device.use=device.type=='OPTIX'
scene.render.engine='CYCLES';scene.cycles.device='GPU'
scene.cycles.samples=16;scene.cycles.use_denoising=True
scene.cycles.denoiser='OPTIX';scene.cycles.denoising_use_gpu=True
scene.render.use_persistent_data=True
scene.frame_set(373)
bpy.ops.wm.save_as_mainfile(filepath=str(BUILD/'duet-polished.blend'))
proofs=[('landscape',373),('landscape',381),('portrait',373),('landscape',308),('landscape',325),('landscape',284)]
for orientation,frame in proofs:
    scene.camera=bpy.data.objects['Landscape' if orientation=='landscape' else 'Portrait']
    scene.render.resolution_x=1920 if orientation=='landscape' else 720
    scene.render.resolution_y=1080 if orientation=='landscape' else 1280
    scene.frame_set(frame)
    scene.render.filepath=str(BUILD/f'duet-polished-{orientation}-{frame:04d}.png')
    bpy.ops.render.render(write_still=True)
    print('POLISH_PROOF',orientation,frame,flush=True)
# Additional diagnostic only: show the proposed mask on the early kick. The
# saved production result still retains the original mask through frame 324.
original.show_render=False;repaired.show_render=True
scene.render.filepath=str(BUILD/'duet-polished-new-mask-kick-0284.png')
bpy.ops.render.render(write_still=True)
print('DUET_POLISH_READY',flush=True)
