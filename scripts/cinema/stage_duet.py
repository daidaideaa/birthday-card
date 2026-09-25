"""Final distant matte and representative motion/portrait proofs."""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
from bisect import bisect_right
bpy.ops.wm.open_mainfile(filepath=str(BUILD/'duet-final.blend'),use_scripts=False)
scene=setup(samples=24)
for name in ['Area','Area.001','Area.002','Area.003']:
    if name in bpy.data.objects:bpy.data.objects[name].hide_render=True
# Hide covered body topology, as a production costume does; avoid hip poke-through.
body=bpy.data.objects['GEO-rain-body']
covered=body.vertex_groups.new(name='Under opaque dance skirt')
covered.add([v.index for v in body.data.vertices if .45<v.co.z<.935],1,'REPLACE')
mask=body.modifiers.new('Costume interior mask','MASK');mask.vertex_group=covered.name;mask.invert_vertex_group=True
for rig_name,female in [('RIG-Snow',False),('RIG-rain',True)]:
    rig=bpy.data.objects[rig_name];action=rig.animation_data.action
    names=[('IK-Hand.' if female else 'IK-Wrist.')+side for side in ['L','R']]
    for curve in list(action.fcurves):
        if curve.data_path.endswith('rotation_euler') and any(('pose.bones["'+name+'"]') in curve.data_path for name in names):action.fcurves.remove(curve)
    for frame in range(1,578,12):
        scene.frame_set(frame);t=(frame-1)/24
        for side,sign in [('L',1),('R',-1)]:
            name=('IK-Hand.' if female else 'IK-Wrist.')+side;bone=rig.pose.bones[name]
            inner=(female and side=='R') or (not female and side=='L')
            hold=smooth((t-12.5)/1.3)*(1-smooth((t-19)/1.3)) if inner else 0
            mat=Matrix.Rotation(sign*(1.08-1.5*hold),4,'Y')@rig.data.bones[name].matrix_local
            mat.translation=bone.matrix.translation;bone.matrix=mat;key(bone,'rotation_euler',frame)
for rig_name,female in [('RIG-Snow',False),('RIG-rain',True)]:
    rig=bpy.data.objects[rig_name]
    if female:rig.pose.bones['Properties_IKFK']['ik_spine']=0.0
    action=rig.animation_data.action
    for curve in list(action.fcurves):
        if any(('pose.bones["'+name+'"]') in curve.data_path for name in ['FK-Head','FK-Chest']):
            action.fcurves.remove(curve)
    for frame in range(1,578,12):
        t=(frame-1)/24;dance=smooth((t-2)/2)*(1-smooth((t-20)/3))
        pose_rotation(rig,'FK-Chest',(.025,.065*math.sin(t*math.pi/2)*dance,.055*math.sin(t*math.pi/2+.5)*dance),frame)
        pose_rotation(rig,'FK-Head',(.025,0,(-.19 if female else .19)*(1-smooth((t-20)/3))),frame)
# Match the costume swing to the actual alternating foot swing, including its phase.
shape=bpy.data.objects['Rain custom pleated dance skirt'].data.shape_keys
for curve in list(shape.animation_data.action.fcurves):
    if 'Forward step' in curve.data_path:shape.animation_data.action.fcurves.remove(curve)
for frame in range(1,578,2):
    t=(frame-1)/24;lift=0
    if 9<t<13:
        for offset in [0,.5]:
            phase=(t-3-offset)%1
            if phase>.58:lift=max(lift,math.sin(math.pi*smooth((phase-.58)/.42)))
    shape.key_blocks['Forward step'].value=lift
    key(shape.key_blocks['Forward step'],'value',frame)
# Two different rigs use different wrist pivots. Match their actual knuckle bones,
# then smoothly distribute the correction into every baked IK position key.
snow=bpy.data.objects['RIG-Snow'];rain=bpy.data.objects['RIG-rain']
corrections=[(1,Vector((0,0,0))),(289,Vector((0,0,0)))]
for frame in range(301,494,12):
    scene.frame_set(frame);bpy.context.view_layer.update();t=(frame-1)/24
    blend=smooth((t-12.5)/1.3)*(1-smooth((t-19)/1.3))
    target=rain.matrix_world@rain.pose.bones['DEF-Middle1.R'].head+Vector((0,-.005,.012))
    actual=snow.matrix_world@snow.pose.bones['Finger_Middle1.L'].head
    hand=snow.pose.bones['IK-Wrist.L'];before=hand.location.copy();m=hand.matrix.copy()
    m.translation+=snow.matrix_world.to_3x3().inverted()@((target-actual)*blend)
    hand.matrix=m;corrections.append((frame,hand.location-before))
corrections.extend([(505,Vector((0,0,0))),(577,Vector((0,0,0)))])
frames=[f for f,v in corrections]
for curve in snow.animation_data.action.fcurves:
    if curve.data_path=='pose.bones["IK-Wrist.L"].location':
        for point in curve.keyframe_points:
            f=point.co.x;i=max(0,min(len(frames)-2,bisect_right(frames,f)-1))
            a,da=corrections[i];b,db=corrections[i+1]
            point.co.y+=da.lerp(db,(f-a)/(b-a))[curve.array_index]
        curve.update()
print('COSTUME_AND_CONTACT_READY',flush=True)
for obj in bpy.data.objects:
    if obj.name.startswith(('Painted evening sky','Hills ','City light','Distant building','Apartment window')):obj.hide_render=True
mat=bpy.data.materials.new('Cinematic LA dusk matte');mat.use_nodes=True
nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/'scripts/cinema/assets/dusk-city.png'));tex.image.pack()
em=nodes.new('ShaderNodeEmission');em.inputs['Strength'].default_value=.75
out=nodes.new('ShaderNodeOutputMaterial');links.new(tex.outputs['Color'],em.inputs['Color']);links.new(em.outputs[0],out.inputs[0])
back=mesh('Distant city matte',[(-26.4,30,-15.85),(26.4,30,-15.85),(26.4,30,13.85),(-26.4,30,13.85)],[(0,1,2,3)],mat)
uv=back.data.uv_layers.new(name='UVMap')
for loop,co in zip(uv.data,[(0,0),(1,0),(1,1),(0,1)]):loop.uv=co
# Camera-hidden matte must not cast any shadows on the stage.
back.visible_shadow=False
scene.camera=bpy.data.objects['Landscape'];scene.frame_set(241)
save_scene('duet-production')
proofs=[]
for frame in [1,157,265,385,433,529]:
    scene.frame_set(frame);bpy.context.view_layer.update()
    deps=bpy.context.evaluated_depsgraph_get();row={'frame':frame}
    for name in ['GEO-rain-shoes','GEO-snow-shoes_bottom']:
        obj=bpy.data.objects[name].evaluated_get(deps);geo=obj.to_mesh()
        row[name]=min((obj.matrix_world@v.co).z for v in geo.vertices);obj.to_mesh_clear()
    proofs.append(row)
    scene.render.resolution_x=960;scene.render.resolution_y=540;scene.cycles.samples=16
    scene.render.filepath=str(BUILD/f'duet-proof-{frame:04d}.png');bpy.ops.render.render(write_still=True)
(BUILD/'duet-contact-proof.json').write_text(json.dumps(proofs,indent=2))
scene.camera=bpy.data.objects['Portrait'];scene.frame_set(385)
scene.render.resolution_x=540;scene.render.resolution_y=960
scene.render.filepath=str(BUILD/'duet-portrait-proof.png');bpy.ops.render.render(write_still=True)
