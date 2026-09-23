"""Build a CC0 Quaternius jazz duet with original paired choreography.
Source anatomy and the outfit rig are retained. Contemporary clothes, shoes,
hairstyles and choreography are authored here. No AI image sheets or Mixamo
animation data are used.
"""
import sys as _sys
from pathlib import Path as _Path
_sys.path.insert(0, str(_Path(__file__).resolve().parent))
from common import output_dir, export_glb
import bpy,bmesh,math,pathlib,os,re
from mathutils import Vector,Matrix,Quaternion
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=output_dir()
SRC=pathlib.Path(os.environ.get('QUATERNIUS_SOURCE',str(ROOT/'model-sources/quaternius')))
QA=pathlib.Path(os.environ.get('JAZZ_QA_DIR','/tmp/birthday-jazz-review'));QA.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=30;scene.frame_start=1;scene.frame_end=361

def material(name,color,rough=.55,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal;return m
ivory=material('ivory cotton',(.86,.85,.79));navy=material('midnight trousers',(.026,.040,.054));ochre=material('ochre silk',(.92,.59,.065),.52);dark=material('espresso hair',(.026,.013,.01));boots=material('polished black shoes',(.016,.013,.012),.3); skin=material('warm skin',(.45,.235,.13),.68)

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

def ring_mesh(name,rings,rig,mat,weights,axis='Z'):
 # Continuous cloth surfaces, with skin weights blended across the real joints.
 vertices=[];faces=[];n=32
 for center,rx,ry in rings:
  for j in range(n):
   a=j/n*math.tau
   offset=Vector((rx*math.cos(a),ry*math.sin(a),0)) if axis=='Z' else Vector((0,rx*math.cos(a),ry*math.sin(a)))
   vertices.append(Vector(center)+offset)
 for k in range(len(rings)-1):
  for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);recolor(o,mat)
 o.parent=rig;mod=o.modifiers.new('cloth skin','ARMATURE');mod.object=rig
 for i,v in enumerate(vertices):
  for bone,w in weights(v).items():
   if w>0:
    group=o.vertex_groups.get(bone) or o.vertex_groups.new(name=bone);group.add([i],w,'REPLACE')
 for p in me.polygons:p.use_smooth=True
 return o

def torso_weights(v):
 if v.z<1.13:return {'spine_01':1}
 if v.z<1.26:
  t=(v.z-1.13)/.13;return {'spine_01':1-t,'spine_02':t}
 t=min(1,(v.z-1.26)/.14);return {'spine_02':1-t,'spine_03':t}

def modern_clothes(rig,female):
 objects=[]
 profile=[(1.03,.153,.10),(1.13,.15,.10),(1.27,.177,.112),(1.39,.178,.098),(1.45,.145,.071),(1.49,.065,.055)] if female else [(1.00,.172,.118),(1.12,.175,.118),(1.27,.193,.125),(1.39,.225,.115),(1.455,.161,.08),(1.495,.063,.055)]
 objects.append(ring_mesh('gold dress bodice' if female else 'white cotton shirt',[((0,.025,z),rx,ry) for z,rx,ry in profile],rig,ochre if female else ivory,torso_weights))
 for side,sign in [('l',1),('r',-1)]:
  if not female:
   bone=rig.data.bones['upperarm_'+side];a=bone.head_local;b=bone.tail_local
   objects.append(ring_mesh('rolled shirt sleeve '+side,[(a.lerp(b,t),r,r) for t,r in [(-.09,.083),(.18,.092),(.64,.081),(.67,.086),(.74,.086)]],rig,ivory,lambda v,s=side:{'upperarm_'+s:1},axis='X'))
   def leg_weights(v,s=side):
    t=max(0,min(1,(v.z-.46)/.15));return {'thigh_'+s:t,'calf_'+s:1-t}
   objects.append(ring_mesh('straight trousers '+side,[((sign*.087,.041 if z>.35 else .065,z),rx,ry) for z,rx,ry in [(1.0,.086,.104),(.89,.094,.119),(.75,.087,.105),(.61,.075,.082),(.53,.071,.077),(.45,.065,.071),(.28,.058,.065),(.10,.054,.060),(.065,.053,.060)]],rig,navy,leg_weights))
  # Low shoes have a continuous closed toe and a sole, without fantasy boot tops.
  foot=rig.data.bones['foot_'+side].head_local
  bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=(foot.x,-.012,.052));shoe=bpy.context.object;shoe.name='dance shoe '+side;shoe.scale=(.059 if female else .065,.145,.049)
  bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);recolor(shoe,boots);attach_rigid(shoe,rig,'foot_'+side)
  # A flat sole gives the planted foot a visible contact patch instead of a ball tip.
  for v in shoe.data.vertices:
   if v.co.z<.022:v.co.z=.003
  for p in shoe.data.polygons:p.use_smooth=True
  objects.append(shoe)
 if not female:
  objects.append(ring_mesh('trouser waistband',[((0,.027,z),rx,ry) for z,rx,ry in [(1.025,.164,.109),(.955,.177,.120),(.89,.18,.120)]],rig,navy,lambda v:{'pelvis':1}))
  # Small open collar and a narrow jazz tie read clearly in the phone silhouette.
  verts=[(-.018,-.032,1.49),(-.09,-.063,1.46),(-.05,-.093,1.395),(.018,-.032,1.49),(.09,-.063,1.46),(.05,-.093,1.395)]
  me=bpy.data.meshes.new('shirt collar');me.from_pydata(verts,[],[(0,1,2),(3,5,4)]);me.update();o=bpy.data.objects.new('shirt collar',me);bpy.context.collection.objects.link(o);recolor(o,ivory);attach_rigid(o,rig,'spine_03');objects.append(o)
  me=bpy.data.meshes.new('narrow tie');me.from_pydata([(-.014,-.082,1.46),(.014,-.082,1.46),(.022,-.14,1.18),(0,-.145,1.145),(-.022,-.14,1.18)],[],[(0,1,2,3,4)]);me.update();o=bpy.data.objects.new('midnight jazz tie',me);bpy.context.collection.objects.link(o);recolor(o,navy);attach_rigid(o,rig,'spine_03');objects.append(o)
 return objects

def hair_cap(rig,female):
 verts=[];faces=[];n=40;rings=14
 # Scalp silhouette follows the imported head; bob has a longer back and sides.
 for k in range(rings+1):
  u=k/rings
  for j in range(n):
   a=j/n*math.tau;front=max(0,-math.sin(a))**7
   theta=u*((2.22 if female else 1.48)*(1-front)+(1.08 if female else 1.16)*front)
   sweep=1+.035*math.sin(a*2+.4)*math.sin(theta)
   x=.100*sweep*math.sin(theta)*math.cos(a);y=.003+.100*sweep*math.sin(theta)*math.sin(a);z=1.637+.118*math.cos(theta)
   if female and u>.75:z-=((u-.75)/.25)*.065*(1-front)
   verts.append((x,y,z))
 for k in range(rings):
  for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 me=bpy.data.meshes.new('cut and styled hair');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new('bob haircut' if female else 'short swept haircut',me);bpy.context.collection.objects.link(o);recolor(o,dark);attach_rigid(o,rig,'Head')
 sol=o.modifiers.new('hair edge thickness','SOLIDIFY');sol.thickness=.004
 for p in me.polygons:p.use_smooth=True
 return o

def make_actor(female):
 prefix='female' if female else 'male';items=import_asset(prefix+'-peasant.glb');rig=next(o for o in items if o.type=='ARMATURE');rig.name='Mia' if female else 'Sebastian';rig.animation_data_clear();rig.rotation_mode='XYZ'
 meshes=[o for o in items if o.type=='MESH']
 # Keep the compatible skeleton; replace all fantasy garments with modern clothes.
 for o in list(meshes):
  meshes.remove(o);bpy.data.objects.remove(o,do_unlink=True)
 base=import_asset('ubc-'+prefix+'.glb');headmeshes=[]
 for o in base:
  if o.type!='MESH':continue
  if 'superhero' in o.name.lower():
   arms=o.copy();arms.data=o.data.copy();bpy.context.collection.objects.link(arms);arms.name=rig.name+' original continuous arms'
   bm=bmesh.new();bm.from_mesh(arms.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if abs(v.co.x)<(.28 if female else .50) or v.co.z<2.4],context='VERTS');bm.to_mesh(arms.data);bm.free()
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
    legs=o.copy();legs.data=o.data.copy();bpy.context.collection.objects.link(legs);legs.name='bare lower legs'
    bm=bmesh.new();bm.from_mesh(legs.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z>1.36 or v.co.z<.12],context='VERTS');bm.to_mesh(legs.data);bm.free()
    legs.parent=rig;legs.matrix_parent_inverse=Matrix.Identity(4)
    for mod in legs.modifiers:
     if mod.type=='ARMATURE':mod.object=rig
    mapping={'DEF-thigh.L':'thigh_l','DEF-thigh.R':'thigh_r','DEF-thigh.L.001':'calf_l','DEF-thigh.R.001':'calf_r','DEF-foot.L':'foot_l','DEF-foot.R':'foot_r','DEF-toe.L':'ball_l','DEF-toe.R':'ball_r'}
    for group in legs.vertex_groups:
     if group.name in mapping:group.name=mapping[group.name]
    meshes.append(legs)
   # Keep only head/neck. Complete outfit already contains exposed hands and limbs.
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z<2.943 or (v.co.z<3.16 and abs(v.co.x)>.14)],context='VERTS');bm.to_mesh(o.data);bm.free()
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
 # Preserve Quaternius arm skin/sleeve texture, simplified to a modest atlas size.
 for ob in headmeshes:
  for v in ob.data.vertices:
   # Gently taper lower cheeks; preserve eye sockets, neck seam and skull height.
   z=v.co.z
   jaw=max(0,1-abs(z-1.575)/.065)
   v.co.x*=1-(.065 if female else .022)*jaw
  ob.data.update()
 for image in list(bpy.data.images):
  if image.size[0]>512 or image.size[1]>512:image.scale(512,512)
 meshes.append(hair_cap(rig,female))
 meshes+=modern_clothes(rig,female)
 skirtkey=None
 if female:
  vertices=[];faces=[];n=48
  rings=[(1.09,.153,.108),(1.055,.163,.118),(.95,.19,.16),(.79,.23,.17),(.62,.305,.215),(.54,.34,.235)]
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
  kick=o.shape_key_add(name='skirt follows forward kick')
  for v in kick.data:
   w=max(0,(1.10-v.co.z)/.56);front=max(0,-math.sin(math.atan2(v.co.y-.035,v.co.x)))
   v.co.y-=.38*w*front;v.co.z+=.035*w*front
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
 # 并肩侧步、两次轻踢、牵手转身，最后停留；脚步采用固定落点。
 # Half-beat footprint samples must retain the side travel (a full sine period
 # here sampled only zeros, so the torso swayed while the feet stayed in place).
 step=.12*math.sin((t-1)*math.pi) if 1<t<4 else 0
 approach=smooth((t-6)/.7)*(1-smooth((t-10)/1.4))
 x+=step+(-.13 if fem else .02)*approach
 turn=smooth((t-7)/2.2);turn=turn*turn*(3-2*turn)
 yaw=math.tau*turn if fem else -.12*approach
 return x,0,yaw

def foot_at(t,fem,side,rest):
 # A swing reaches the next footprint; the following half beat holds it exactly.
 period=1.0;offset=0 if side=='l' else period*.5
 def destination(at):
  x,y,a=pose(at,fem);return Vector((x+math.cos(a)*rest.x-math.sin(a)*rest.y,y+math.sin(a)*rest.x+math.cos(a)*rest.y,rest.z)),a
 if t<1 or t>11.4:return destination(t)
 if 4<=t<6:
  p,a=destination(4)
  if side==('l' if fem else 'r'):
   lift=max(0,math.sin((t-4)*math.tau))
   p.y-=.22*lift;p.z+=.075*lift
  return p,a
 k=math.floor((t-offset)/period);start=k*period+offset;phase=(t-start)/period
 p0,a0=destination(max(0,start-.5));p1,a1=destination(min(12,start+.5));f=smooth(phase/.5);p=p0.lerp(p1,f)
 if phase<.5:p.z+=math.sin(math.pi*phase/.5)*.045
 return p,a0+(a1-a0)*f

for rig,meshes,targets,skirt in actors:
 fem=rig.name=='Mia';rests={s:rig.data.bones[f'calf_{s}'].tail_local.copy() for s in ['l','r']}
 for frame in range(1,362):
  t=(frame-1)/30;scene.frame_set(frame);x,y,a=pose(t,fem);settle=1-smooth((t-10.3)/1.5);rig.location=(x,y,-.017+.005*math.sin(t*math.tau)**2*settle);rig.rotation_euler=(0,0,a);rig.keyframe_insert('location');rig.keyframe_insert('rotation_euler')
  lift=smooth((t-6)/.85)*(1-smooth((t-9.5)/.8))
  for side,sgn in [('l',1),('r',-1)]:
   p,ang=foot_at(t,fem,side,rests[side]);targets['foot'+side].location=p;targets['foot'+side].keyframe_insert('location')
   restq=rig.data.bones[f'foot_{side}'].matrix_local.to_quaternion();targets['foot'+side].rotation_quaternion=Quaternion((0,0,1),ang)@restq;targets['foot'+side].keyframe_insert('rotation_quaternion')
   hx=sgn*.24;hy=-.045;hz=.925+.015*math.sin(t*math.tau)*(1-smooth((t-10)/1.8))
   hand=Vector((x+math.cos(a)*hx-math.sin(a)*hy,y+math.sin(a)*hx+math.cos(a)*hy,hz))
   # Anatomical left is +X in the source rig; partners share exactly one hand target.
   if (fem and side=='r') or (not fem and side=='l'):hand=hand.lerp(Vector((.118 if fem else .052,-.015,1.80)),lift)
   else:
    hand.y-=.015
    if 1<t<6:hand.x+=sgn*.12*math.sin((t-1)*math.pi)**2;hand.z+=.10*math.sin((t-1)*math.pi)**2
   targets['hand'+side].location=hand;targets['hand'+side].keyframe_insert('location')
   con=rig.pose.bones[f'hand_{side}'].constraints.get('gentle clasp orientation');con.influence=lift if ((fem and side=='r') or (not fem and side=='l')) else 0;con.keyframe_insert('influence')
  for bn,amp in [('spine_02',.018),('spine_03',-.018),('Head',.018)]:
   pb=rig.pose.bones[bn];pb.rotation_mode='XYZ';pb.rotation_euler.y=amp*math.sin(t*1.4)*(1-smooth((t-10)/1.8));pb.keyframe_insert('rotation_euler')
  if skirt:
   # Delayed skirt response and a small damped settling swing.
   follow=math.sin(math.pi*smooth((t-7.12)/2.25))**2
   settle=max(0,t-9.35);skirt.value=.04+.70*follow+.075*math.exp(-settle*2)*math.sin(settle*6)**2;skirt.keyframe_insert('value')
   kick=skirt.id_data.key_blocks['skirt follows forward kick'];kick.value=max(0,math.sin((t-4)*math.tau)) if 4<=t<6 else 0;kick.keyframe_insert('value')
 for a2 in bpy.data.actions:
  for fc in a2.fcurves:
   for k in fc.keyframe_points:k.interpolation='LINEAR'
scene.frame_set(1)
# Export only actors, not transient IK target objects or native QA scene.
bpy.ops.object.select_all(action='DESELECT')
for rig,meshes,targets,skirt in actors:
 rig.select_set(True)
 for o in meshes:o.select_set(True)
export_glb(filepath=str(OUT/'jazz-duo.glb'),use_selection=True,export_animations=True,export_frame_range=True,export_force_sampling=True,export_nla_strips=False,export_animation_mode='SCENE',export_anim_scene_split_object=False,export_skins=True,export_morph=True,export_image_format='JPEG',export_jpeg_quality=85,export_optimize_animation_size=True,export_optimize_animation_keep_anim_armature=False,export_optimize_animation_keep_anim_object=False)
bpy.ops.wm.save_as_mainfile(filepath=str(QA/'jazz-duo.blend'));print('EXPORTED',OUT/'jazz-duo.glb',flush=True)
if os.environ.get('ASSET_PREVIEW', '0') != '1':
 sys = __import__('sys'); sys.exit(0)
# Native preview of the same composition; keep dancers right of the piano/bench.
for rig,meshes,targets,skirt in actors:
 rig.delta_location=(1.1,-.7,0)
 for target in targets.values():target.delta_location=(1.1,-.7,0)
bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models/grand-piano.glb'))
for o in bpy.context.selected_objects:
 if o.type=='MESH':o.scale=(.165,)*3;o.location=(-1.45,.40,.025);o.rotation_euler.z=-.35
floor=material('stage stone',(.038,.049,.066),.7)
bpy.ops.mesh.primitive_plane_add(size=200);bpy.context.object.data.materials.append(floor)
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.04,.055,.095,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.22

def aim(o,at):o.rotation_euler=(Vector(at)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,color,power,size in [('warm side',(-3,-4,6),(1,.76,.48),650,5),('cool rim',(3,3,4),(.48,.67,1),1000,4),('face fill',(3,-4,2),(1,.9,.75),85,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.color=color;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,1))
bpy.ops.object.camera_add(location=(1.8,-8,2.6));camera=bpy.context.object;aim(camera,(0,-.15,.85));camera.data.type='ORTHO';camera.data.ortho_scale=5.45;scene.camera=camera
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.render.resolution_x=1100;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
for frame in [int(value) for value in os.environ.get('JAZZ_QA_FRAMES','45,129,255').split(',') if value.strip()]:
 scene.frame_set(frame);scene.render.filepath=str(QA/f'final-jazz-{frame:03}.png');bpy.ops.render.render(write_still=True)
print('QA READY',QA,flush=True)
