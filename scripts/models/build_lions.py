"""Build two consistently styled, rigged lions from kenchoo's CC-BY-4.0 sculpt.

Usage: blender --background --threads 3 --python scripts/models/build_lions.py -- /path/to/baby_lion/scene.gltf
The source contains actual topology, UV textures, skin weights and a jaw/ear/tail rig.
Adult is a distinct derivative: longer limbs/torso, smaller head/ears, sculpted mane.
No generated images, sphere characters, or animation atlases are used.
"""
import bpy, math, sys
import numpy as np
from pathlib import Path
from mathutils import Vector, Quaternion, Matrix

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/models/lions'
OUT.mkdir(parents=True,exist_ok=True)
SOURCE=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path('/tmp/model-research/baby-lion/scene.gltf')
NECK='Wolf_Neck_TopSHJnt_17'
JAW='Wolf_Head_JawSHJnt_12'

def clear():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)

def material(name,color,roughness=.72):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness
 return m

def mesh(name,verts,faces,mat):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o

def mane(rig):
 # Directional strand maps are authored for this sculpt, then embedded in the GLB.
 # Fine fur runs from the cheeks along the neck rather than around a plastic collar.
 w,h=1024,512
 u,v=np.meshgrid(np.arange(w)/w,np.arange(h)/h)
 rng=np.random.default_rng(51)
 # Broken, varying-length strands avoid the regular bands of a wood-like wave map.
 raw=rng.random((24,w)).astype(np.float32)
 raw=(raw*2+np.roll(raw,1,axis=1)+np.roll(raw,-1,axis=1))/4
 row=v*22;index=row.astype(int);fraction=row-index
 field=raw[index,np.arange(w)[None,:]]*(1-fraction)+raw[index+1,np.arange(w)[None,:]]*fraction
 fine=rng.random((h,w))
 grain=.14+.70*field+.16*fine
 broad=.91+.07*np.sin(u*math.tau*13+v*4)
 rgb=np.stack([(.18+.20*grain)*broad,(.065+.11*grain)*broad,(.025+.052*grain)*broad,np.ones_like(u)],axis=-1)
 texture=bpy.data.images.new('Chestnut directional fur',width=w,height=h)
 texture.pixels.foreach_set(rgb.astype(np.float32).ravel());texture.pack()
 du,dv=np.gradient(grain)
 normal=np.stack([np.clip(.5-dv*1.4,.1,.9),np.clip(.5-du*3,.1,.9),np.ones_like(u),np.ones_like(u)],axis=-1)
 normalmap=bpy.data.images.new('Chestnut fur normal',width=w,height=h)
 normalmap.colorspace_settings.name='Non-Color';normalmap.pixels.foreach_set(normal.astype(np.float32).ravel());normalmap.pack()
 fur=material('Mane textured chestnut',(1,1,1),.93)
 nodes=fur.node_tree.nodes;links=fur.node_tree.links;p=nodes.get('Principled BSDF')
 tex=nodes.new('ShaderNodeTexImage');tex.image=texture;links.new(tex.outputs['Color'],p.inputs['Base Color'])
 bump=nodes.new('ShaderNodeTexImage');bump.image=normalmap;n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.48
 links.new(bump.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],p.inputs['Normal'])
 inv=rig.matrix_world.inverted()
 # A low nape, full cheeks, and a long chest bib: the cross-section is not a ring.
 sections=[(-.755,.16,.14),(-.62,.23,.24),(-.47,.285,.31),(-.28,.27,.325),(-.10,.21,.265),(.025,.13,.19)]
 center_x=.062;center_z=.67
 verts=[];faces=[];N=96
 for row,(y,rx,rz) in enumerate(sections):
  for i in range(N):
   a=math.tau*i/N;sn=math.sin(a)
   wave=.009*math.sin(a*9+.3)+.006*math.sin(a*13+.7)
   x=center_x+(rx+wave)*math.cos(a)
   # Above the skull fur stays short; the bib length grows below the lower jaw.
   z=center_z+.04*row/(len(sections)-1)+(rz+wave)*sn*((.68-.26*row/(len(sections)-1)) if sn>0 else 1.32)
   # Continuous small crown over the forehead, tapering immediately behind the ears.
   z+=.095*max(0,sn)**3*math.exp(-row*1.7)
   yy=y+.012*math.sin(a*9+.4)
   verts.append(inv@Vector((x*1.08,yy*1.12,z*1.22)))
 for r in range(len(sections)-1):
  for i in range(N):faces.append((r*N+i,r*N+(i+1)%N,(r+1)*N+(i+1)%N,(r+1)*N+i))
 obj=mesh('Adult sculpted mane',verts,faces,fur)
 uv=obj.data.uv_layers.new(name='Fur direction')
 for poly in obj.data.polygons:
  indices=[obj.data.loops[k].vertex_index for k in poly.loop_indices]
  seam=any(j%N==0 for j in indices) and any(j%N==N-1 for j in indices)
  for k,j in zip(poly.loop_indices,indices):
   uu=(j%N)/N
   if seam and j%N==0:uu=1
   uv.data[k].uv=(uu,(j//N)/(len(sections)-1))
 group=obj.vertex_groups.new(name=NECK);group.add(list(range(len(verts))),1,'REPLACE');mod=obj.modifiers.new('Mane follows neck','ARMATURE');mod.object=rig;obj.parent=rig


def build(adult):
 clear();bpy.ops.import_scene.gltf(filepath=str(SOURCE));scene=bpy.context.scene;scene.render.fps=24;scene.frame_set(1)
 rig=next(o for o in scene.objects if o.type=='ARMATURE')
 for o in list(scene.objects):
  if o.name=='Icosphere':bpy.data.objects.remove(o,do_unlink=True)
 body=next(o for o in scene.objects if o.type=='MESH')
 body.name='Adult lion sculpt' if adult else 'Lion cub sculpt'
 # Clear source animation after capturing its anatomical neutral pose.
 base={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
 for o in scene.objects:o.animation_data_clear()
 for a in list(bpy.data.actions):bpy.data.actions.remove(a)
 if adult:
  transform=Matrix.Diagonal((1.08,1.12,1.22,1.0))
  body.data.transform(body.matrix_world.inverted()@transform@body.matrix_world, shape_keys=True)
  rig.data.transform(rig.matrix_world.inverted()@transform@rig.matrix_world)
  bpy.context.view_layer.update()
  # A broader adult muzzle preserves the cub's topology, UVs, and skin weights.
  blocks=body.data.shape_keys.key_blocks if body.data.shape_keys else []
  points=[block.data for block in blocks] if blocks else [body.data.vertices]
  inv_body=body.matrix_world.inverted()
  for points_set in points:
   for vertex in points_set:
    world=body.matrix_world@vertex.co
    amount=max(0,min(1,(-world.y-.64)/.15))*max(0,min(1,(world.z-.54)/.15))
    world.x=.067+(world.x-.067)*(1+.18*amount)
    vertex.co=inv_body@world
  # Smaller ears distinguish the adult without concealing its expressive face.
  loc,q,scale=base[NECK];base[NECK]=(loc,q,scale*1.02)
  for name in base:
   if 'Ear_01_01' in name:
    loc,q,scale=base[name];base[name]=(loc,q,scale*.80)
  mane(rig)
 for o in scene.objects:
  if o.type=='MESH':
   for p in o.data.polygons:p.use_smooth=True
   for mat in o.data.materials:
    if mat and mat.use_nodes:
     p=mat.node_tree.nodes.get('Principled BSDF')
     if p:p.inputs['Roughness'].default_value=.82;p.inputs['Metallic'].default_value=0
 def restore():
  for b in rig.pose.bones:
   b.rotation_mode='QUATERNION';b.location,b.rotation_quaternion,b.scale=[v.copy() for v in base[b.name]]
 def turn(name,axis,angle):
  b=rig.pose.bones.get(name)
  if b:
   local=b.bone.matrix_local.to_quaternion().inverted()@Vector(axis)
   b.rotation_quaternion=base[name][1]@Quaternion(local,angle)
 actions=[]
 for title,count in [('Idle',73),('Walk',49),('Roar',73),('Bow',73)]:
  action=bpy.data.actions.new(title);action.use_fake_user=True;rig.animation_data_create();rig.animation_data.action=action
  for frame in range(1,count+1,3):
   restore();u=(frame-1)/(count-1);wave=math.sin(math.tau*u)
   if title=='Walk':
    for side,offset in [('l',0),('r',math.pi)]:
     s=math.sin(math.tau*u+offset)
     for name in base:
      if f'Wolf_{side}_FrontLeg_Hip' in name:turn(name,(1,0,0),s*.22)
      elif f'Wolf_{side}_FrontLeg_Knee' in name:turn(name,(1,0,0),max(0,-s)*.22)
      elif f'Wolf_{side}_HindLeg_Hip' in name:turn(name,(1,0,0),-s*.2)
      elif f'Wolf_{side}_HindLeg_Knee1' in name:turn(name,(1,0,0),max(0,s)*.24)
    turn(NECK,(1,0,0),wave*.028)
   elif title=='Roar':
    envelope=math.sin(math.pi*u)**1.5
    turn(NECK,(1,0,0),-.28*envelope)
    turn(JAW,(1,0,0),(.36 if adult else .27)*envelope)
    turn('Wolf_Neck_01SHJnt_19',(1,0,0),-.085*envelope)
   elif title=='Bow':
    envelope=math.sin(math.pi*u)**1.5
    turn(NECK,(1,0,0),.25*envelope)
    turn('Wolf_Neck_01SHJnt_19',(1,0,0),.08*envelope)
   else:
    turn(NECK,(0,0,1),wave*.035)
    turn('Wolf_Neck_01SHJnt_19',(1,0,0),wave*.014)
   for name in base:
    if 'Tail_01' in name:turn(name,(0,0,1),wave*.045)
   for b in rig.pose.bones:
    b.keyframe_insert('location',frame=frame,group=b.name);b.keyframe_insert('rotation_quaternion',frame=frame,group=b.name);b.keyframe_insert('scale',frame=frame,group=b.name)
  for fc in action.fcurves:
   for k in fc.keyframe_points:k.interpolation='BEZIER'
  actions.append(action)
 rig.animation_data.action=actions[0]
 scene.frame_set(1);scene.frame_end=73
 for image in bpy.data.images:
  if image.size[0]>1024 or image.size[1]>1024:
   image.scale(min(1024,image.size[0]),min(1024,image.size[1]))
 bpy.ops.object.select_all(action='SELECT')
 path=OUT/('father-lion.glb' if adult else 'lion-cub.glb')
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=88,export_tangents=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_frame_range=False,export_all_influences=False,export_extras=True)
 print('EXPORTED',path,path.stat().st_size,flush=True)
 return path

cub=build(False);adult=build(True)
(OUT/'LICENSE.txt').write_text('Lion cub and adult lion derivative models\nBased on "Baby Lion" by kenchoo\nhttps://sketchfab.com/3d-models/baby-lion-c9599625dc474262aab754d7b63841f5\nLicense: Creative Commons Attribution 4.0\nhttps://creativecommons.org/licenses/by/4.0/\n\nChanges: adult body proportions, sculpted mane, new skeletal Idle / Walk / Roar / Bow animation clips, file conversion. Original artist is not associated with or endorsing this project.\n')
# Render the actual exported assets in the same composition used by the web scene.
clear();scene=bpy.context.scene
preview_rigs=[]
for path,scale,position,angle in [(adult,1.2,(-.58,.14,0),-.4),(cub,.72,(.72,-.6,0),-.68)]:
 before=set(scene.objects);before_actions=set(bpy.data.actions);bpy.ops.import_scene.gltf(filepath=str(path));new=set(scene.objects)-before
 actions=set(bpy.data.actions)-before_actions
 roots=[o for o in new if o.parent not in new]
 for o in roots:o.scale*=scale;o.rotation_euler.z=angle;o.location+=Vector(position)
 for o in new:
  if o.animation_data:
   o.animation_data.action=next((a for a in actions if a.name.startswith('Idle')),None)
   preview_rigs.append((o,actions))
scene.frame_set(1)
rock=material('Warm weathered sandstone',(.25,.15,.10))
mesh('Pride Rock ledge',[(-2.6,-1.8,0),(2.1,-1.4,0),(2.7,.15,0),(1.8,1.15,0),(-2.2,1.3,0),(-2,-1.6,-.8),(2,-1.3,-.72),(2.35,.15,-1.05),(1.7,1,-.9),(-1.9,1.1,-.75)],[(0,1,2,3,4),(0,5,6,1),(1,6,7,2),(2,7,8,3),(3,8,9,4),(4,9,5,0)],rock)
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1100;scene.render.resolution_y=780;scene.render.resolution_percentage=100
scene.world.color=(.16,.12,.1)
def point(o,t):o.rotation_euler=(Vector(t)-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4,-6.4,3.1));camera=bpy.context.object;camera.data.lens=48;point(camera,(0,-.05,.5));scene.camera=camera
for position,energy,color,size in [((-3,-2,5),900,(1,.76,.49),4),((3,-4,3),550,(1,.86,.68),3),((-2,3,4),1200,(1,.60,.27),2)]:
 bpy.ops.object.light_add(type='AREA',location=position);light=bpy.context.object;light.data.energy=energy;light.data.color=color;light.data.shape='DISK';light.data.size=size;point(light,(0,0,.5))
scene.render.filepath='/tmp/model-research/lions-native-preview.png';bpy.ops.render.render(write_still=True)
for rig,actions in preview_rigs:
 rig.animation_data.action=next(a for a in actions if a.name.startswith('Roar'))
scene.frame_set(37)
scene.render.filepath='/tmp/model-research/lions-roar-preview.png';bpy.ops.render.render(write_still=True)
