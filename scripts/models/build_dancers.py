"""Build a CC0 Quaternius jazz duet with original paired choreography.
The source character/outfit topology and skin weights are preserved. Hidden torso
geometry is removed as instructed upstream; the yellow skirt and hairstyles are
original additions. No AI image sheets or Mixamo animation data are used.
"""
import bpy,bmesh,math,pathlib,os,re
from mathutils import Vector,Matrix,Quaternion
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'public/models'
SRC=pathlib.Path(os.environ.get('QUATERNIUS_SOURCE','/workspace/scratch/e75e583bdeff/rig-research/quaternius'))
QA=pathlib.Path(os.environ.get('JAZZ_QA_DIR','/workspace/scratch/e75e583bdeff/jazz-qa'));QA.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=241

def material(name,color,rough=.55,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
ivory=material('ivory cotton',(.80,.75,.64));navy=material('midnight trousers',(.026,.040,.054));ochre=material('ochre silk',(.90,.50,.065),.43);dark=material('espresso hair',(.026,.013,.01));boots=material('polished black shoes',(.016,.013,.012),.3); skin=material('warm skin',(.45,.235,.13),.68)

def import_asset(name):
 old=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(SRC/name));new=set(bpy.data.objects)-old
 for o in list(new):
  if o.type=='MESH' and o.name.startswith('Icosphere'):bpy.data.objects.remove(o,do_unlink=True);new.remove(o)
 
 for o in new:
  if o.type=='MESH' and o.data.shape_keys:o.shape_key_clear()
 return list(new)

def recolor(o,m):o.data.materials.clear();o.data.materials.append(m)
def attach_rigid(o,rig,bone):
 o.vertex_groups.clear();v=o.vertex_groups.new(name=bone);v.add(list(range(len(o.data.vertices))),1,'REPLACE')
 for mod in list(o.modifiers):
  if mod.type=='ARMATURE':o.modifiers.remove(mod)
 mod=o.modifiers.new('skin','ARMATURE');mod.object=rig;o.parent=rig;o.matrix_parent_inverse=Matrix.Identity(4)

def hair_cap(rig,female):
 verts=[];faces=[];n=40;rings=14
 # Scalp silhouette follows the imported head; bob has a longer back and sides.
 for k in range(rings+1):
  u=k/rings
  for j in range(n):
   a=j/n*math.tau;front=max(0,-math.sin(a))**7
   theta=u*((2.22 if female else 1.48)*(1-front)+(1.08 if female else 1.16)*front)
   x=.100*math.sin(theta)*math.cos(a);y=.003+.100*math.sin(theta)*math.sin(a);z=1.637+.118*math.cos(theta)
   if female and u>.75:z-=((u-.75)/.25)*.065*(1-front)
   verts.append((x,y,z))
 for k in range(rings):
  for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 me=bpy.data.meshes.new('cut and styled hair');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('bob haircut' if female else 'short swept haircut',me);bpy.context.collection.objects.link(o);recolor(o,dark);attach_rigid(o,rig,'Head')
 sol=o.modifiers.new('hair edge thickness','SOLIDIFY');sol.thickness=.004
 for p in me.polygons:p.use_smooth=True
 return o

def make_actor(female):
 prefix='female' if female else 'male';items=import_asset(prefix+'-peasant.glb');rig=next(o for o in items if o.type=='ARMATURE');rig.name='Mia' if female else 'Julian';rig.animation_data_clear();rig.rotation_mode='XYZ'
 meshes=[o for o in items if o.type=='MESH']
 for o in list(meshes):
  if '_Arms' in o.name:meshes.remove(o);bpy.data.objects.remove(o,do_unlink=True)
 base=import_asset('ubc-'+prefix+'.glb');headmeshes=[]
 for o in base:
  if o.type!='MESH':continue
  if 'superhero' in o.name.lower():
   arms=o.copy();arms.data=o.data.copy();bpy.context.collection.objects.link(arms);arms.name=rig.name+' original continuous arms'
   bm=bmesh.new();bm.from_mesh(arms.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if abs(v.co.x)<(.28 if female else .55) or v.co.z<2.4],context='VERTS');bm.to_mesh(arms.data);bm.free()
   arms.parent=rig;arms.matrix_parent_inverse=Matrix.Identity(4)
   for mod in arms.modifiers:
    if mod.type=='ARMATURE':mod.object=rig
   for group in arms.vertex_groups:
    bn=group.name
    for side in ['L','R']:
     simple={'DEF-upper_arm.'+side:'upperarm_'+side.lower(),'DEF-forearm.'+side+'.001':'lowerarm_'+side.lower(),'DEF-hand.'+side:'hand_'+side.lower(),'DEF-shoulder.'+side:'clavicle_'+side.lower()}
     if bn in simple:group.name=simple[bn]
    match=re.match(r'DEF-(?:f_)?(index|middle|pinky|ring|thumb)\.(\d+)\.([LR])',bn)
    if match:group.name=match.group(1)+'_'+match.group(2)+'_'+match.group(3).lower()
   meshes.append(arms)
   if female:
    legs=o.copy();legs.data=o.data.copy();bpy.context.collection.objects.link(legs);legs.name='Mia bare lower legs'
    bm=bmesh.new();bm.from_mesh(legs.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z>1.36 or v.co.z<.12],context='VERTS');bm.to_mesh(legs.data);bm.free()
    legs.parent=rig;legs.matrix_parent_inverse=Matrix.Identity(4)
    for mod in legs.modifiers:
     if mod.type=='ARMATURE':mod.object=rig
    mapping={'DEF-thigh.L':'thigh_l','DEF-thigh.R':'thigh_r','DEF-thigh.L.001':'calf_l','DEF-thigh.R.001':'calf_r','DEF-foot.L':'foot_l','DEF-foot.R':'foot_r','DEF-toe.L':'ball_l','DEF-toe.R':'ball_r'}
    for group in legs.vertex_groups:
     if group.name in mapping:group.name=mapping[group.name]
    meshes.append(legs)
   # Keep only head/neck. Complete outfit already contains exposed hands and limbs.
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z<2.943],context='VERTS');bm.to_mesh(o.data);bm.free()
   o.name=rig.name+' original Quaternius head'
  elif o.name.startswith('Icosphere'):continue
  o.parent=None;o.matrix_world=Matrix.Identity(4)
  attach_rigid(o,rig,'Head');headmeshes.append(o)
 for o in base:
  if o.type=='ARMATURE':bpy.data.objects.remove(o,do_unlink=True)
 meshes+=headmeshes
 # The upstream glTF is 3.5 units tall. Normalize it to a ~1.75 m miniature.
 bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 for b in rig.data.edit_bones:b.head*=.5;b.tail*=.5
 bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
 for o in meshes:
  for v in o.data.vertices:v.co*=.5
  o.data.update()
  for p in o.data.polygons:p.use_smooth=True
  if '_Body' in o.name:recolor(o,ochre if female else ivory)
  elif '_Legs' in o.name:
   recolor(o,navy)
   if female:
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z>.68],context='VERTS');bm.to_mesh(o.data);bm.free()
  elif '_Arms' in o.name:recolor(o,skin)
  elif '_Feet' in o.name:
   recolor(o,boots)
   if female:
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z>.13],context='VERTS');bm.to_mesh(o.data);bm.free()
 # Preserve Quaternius arm skin/sleeve texture, simplified to a modest atlas size.
 for image in list(bpy.data.images):
  if image.size[0]>512 or image.size[1]>512:image.scale(512,512)
 meshes.append(hair_cap(rig,female))
 skirtkey=None
 if female:
  vertices=[];faces=[];n=48
  rings=[(1.13,.158,.15),(1.055,.179,.157),(.95,.19,.16),(.79,.23,.17),(.62,.285,.205),(.54,.30,.218)]
  for z,rx,ry in rings:
   for j in range(n):
    a=j/n*math.tau;ruffle=1+.016*math.cos(a*12);vertices.append((math.cos(a)*rx*ruffle,.035+math.sin(a)*ry*ruffle,z))
  for k in range(len(rings)-1):
   for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
  me=bpy.data.meshes.new('draped skirt');me.from_pydata(vertices,[],faces);me.update();o=bpy.data.objects.new('golden dancing skirt',me);bpy.context.collection.objects.link(o);recolor(o,ochre);attach_rigid(o,rig,'pelvis');meshes.append(o)
  for p in me.polygons:p.use_smooth=True
  sol=o.modifiers.new('silk edge','SOLIDIFY');sol.thickness=.003
  o.shape_key_add(name='Basis');skirtkey=o.shape_key_add(name='swirl follow through')
  for v in skirtkey.data:
   w=max(0,(.98-v.co.z)/.44);a=math.atan2(v.co.y-.035,v.co.x);v.co.x+=.055*w*math.sin(a*2);v.co.y+=.035*w*math.cos(a*3)
 targets={}
 for side in ['l','r']:
  for name,bone in [('hand','lowerarm'),('foot','calf')]:
   endpoint=rig.data.bones[f'{bone}_{side}'].tail_local.copy();target=bpy.data.objects.new(rig.name+' '+name+' target '+side,None);bpy.context.collection.objects.link(target);target.location=endpoint;targets[name+side]=target
   ik=rig.pose.bones[f'{bone}_{side}'].constraints.new('IK');ik.target=target;ik.chain_count=2;ik.use_stretch=False
   if name=='hand':
    con=rig.pose.bones[f'hand_{side}'].constraints.new('COPY_ROTATION');con.name='gentle clasp orientation';con.target=target;con.owner_space='WORLD';con.target_space='WORLD';con.influence=0
    target.rotation_mode='QUATERNION';target.rotation_quaternion=rig.data.bones[f'hand_{side}'].matrix_local.to_quaternion()
  # Sole orientation remains fixed while a foot is planted; pose is baked to GLB.
  foot=rig.pose.bones[f'foot_{side}'];foot.rotation_mode='QUATERNION'
  con=foot.constraints.new('COPY_ROTATION');con.target=targets['foot'+side];con.owner_space='WORLD';con.target_space='WORLD'
  targets['foot'+side].rotation_mode='QUATERNION';targets['foot'+side].rotation_quaternion=rig.data.bones[f'foot_{side}'].matrix_local.to_quaternion()
 return rig,meshes,targets,skirtkey

actors=[make_actor(False),make_actor(True)]
def smooth(t):t=max(0,min(1,t));return t*t*(3-2*t)
def pose(t,fem):
 x=.57 if fem else -.57
 step=.14*math.sin((t-1)/2*math.tau) if 1<t<3 else 0
 approach=smooth((t-3)/.8)*(1-smooth((t-6.3)/1.2))
 x+=step+(-.20 if fem else .02)*approach
 yaw=math.tau*smooth((t-4.1)/2.1) if fem else -.15*approach
 return x,0,yaw

def foot_at(t,fem,side,rest):
 # A swing reaches the next footprint; the following half beat holds it exactly.
 period=1.05;offset=0 if side=='l' else period*.5
 def destination(at):
  x,y,a=pose(at,fem);return Vector((x+math.cos(a)*rest.x-math.sin(a)*rest.y,y+math.sin(a)*rest.x+math.cos(a)*rest.y,rest.z)),a
 if t<1 or t>7.4:return destination(t)
 k=math.floor((t-offset)/period);start=k*period+offset;phase=(t-start)/period
 p0,a0=destination(max(0,start-.525));p1,a1=destination(min(8,start+.525));f=smooth(phase/.5);p=p0.lerp(p1,f)
 if phase<.5:p.z+=math.sin(math.pi*phase/.5)*.045
 return p,a0+(a1-a0)*f

for rig,meshes,targets,skirt in actors:
 fem=rig.name=='Mia';rests={s:rig.data.bones[f'calf_{s}'].tail_local.copy() for s in ['l','r']}
 for frame in range(1,242):
  t=(frame-1)/30;scene.frame_set(frame);x,y,a=pose(t,fem);rig.location=(x,y,-.02+.004*math.sin(t*math.tau)**2);rig.rotation_euler=(0,0,a);rig.keyframe_insert('location');rig.keyframe_insert('rotation_euler')
  lift=smooth((t-3.1)/.85)*(1-smooth((t-6.25)/.65))
  for side,sgn in [('l',1),('r',-1)]:
   p,ang=foot_at(t,fem,side,rests[side]);targets['foot'+side].location=p;targets['foot'+side].keyframe_insert('location')
   restq=rig.data.bones[f'foot_{side}'].matrix_local.to_quaternion();targets['foot'+side].rotation_quaternion=Quaternion((0,0,1),ang)@restq;targets['foot'+side].keyframe_insert('rotation_quaternion')
   hx=sgn*.31;hy=-.045;hz=.995+.025*math.sin(t*math.tau/1.05)
   hand=Vector((x+math.cos(a)*hx-math.sin(a)*hy,y+math.sin(a)*hx+math.cos(a)*hy,hz))
   # Anatomical left is +X in the source rig; partners share exactly one hand target.
   if (fem and side=='r') or (not fem and side=='l'):hand=hand.lerp(Vector((.195 if fem else -.035,-.015,1.68)),lift)
   else:hand.y-=.015
   targets['hand'+side].location=hand;targets['hand'+side].keyframe_insert('location')
   con=rig.pose.bones[f'hand_{side}'].constraints.get('gentle clasp orientation');con.influence=lift if ((fem and side=='r') or (not fem and side=='l')) else 0;con.keyframe_insert('influence')
  for bn,amp in [('spine_02',.018),('spine_03',-.018),('Head',.018)]:
   pb=rig.pose.bones[bn];pb.rotation_mode='XYZ';pb.rotation_euler.y=amp*math.sin(t*1.4);pb.keyframe_insert('rotation_euler')
  if skirt:skirt.value=.05+.8*math.sin(math.pi*smooth((t-4.1)/2.2))**2;skirt.keyframe_insert('value')
 for a2 in bpy.data.actions:
  for fc in a2.fcurves:
   for k in fc.keyframe_points:k.interpolation='LINEAR'
scene.frame_set(1)
# Export only actors, not transient IK target objects or native QA scene.
bpy.ops.object.select_all(action='DESELECT')
for rig,meshes,targets,skirt in actors:
 rig.select_set(True)
 for o in meshes:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'jazz-duo.glb'),export_format='GLB',use_selection=True,export_animations=True,export_frame_range=True,export_force_sampling=True,export_nla_strips=False,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_skins=True,export_morph=True,export_image_format='JPEG',export_jpeg_quality=85,export_optimize_animation_size=True,export_optimize_animation_keep_anim_armature=False,export_optimize_animation_keep_anim_object=False)
bpy.ops.wm.save_as_mainfile(filepath=str(QA/'jazz-duo.blend'));print('EXPORTED',OUT/'jazz-duo.glb',flush=True)
# Native preview of the same composition; keep dancers right of the piano/bench.
for rig,meshes,targets,skirt in actors:
 rig.delta_location=(1.1,-.7,0)
 for target in targets.values():target.delta_location=(1.1,-.7,0)
bpy.ops.import_scene.gltf(filepath=str(OUT/'grand-piano.glb'))
for o in bpy.context.selected_objects:
 if o.type=='MESH':o.scale=(.165,)*3;o.location=(-1.45,.40,.025);o.rotation_euler.z=-.35
floor=material('stage stone',(.038,.049,.066),.7)
bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(floor)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.04,.055,.095,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.22

def aim(o,at):o.rotation_euler=(Vector(at)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,color,power,size in [('warm side',(-3,-4,6),(1,.76,.48),650,5),('cool rim',(3,3,4),(.48,.67,1),1000,4),('face fill',(3,-4,2),(1,.9,.75),85,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.color=color;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,1))
bpy.ops.object.camera_add(location=(4.8,-8,3.7));camera=bpy.context.object;aim(camera,(0,-.15,.85));camera.data.type='ORTHO';camera.data.ortho_scale=5.45;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1100;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
for frame in [int(value) for value in os.environ.get('JAZZ_QA_FRAMES','1,65,145,180').split(',')]:
 scene.frame_set(frame);scene.render.filepath=str(QA/f'final-jazz-{frame:03}.png');bpy.ops.render.render(write_still=True)
print('QA READY',QA,flush=True)
