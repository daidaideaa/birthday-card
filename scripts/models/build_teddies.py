"""Original stylized poodle meshes, authored with Blender, exported as skinned glTF.

Run with Blender's Python (or bpy 4.3):
  python scripts/models/build_teddies.py --preview-dir /tmp/teddy-review
The sculpt is voxel-fused and smoothed; coat detail is one subtle normal texture,
not instanced spheres. Exported assets have a real armature and named actions.
"""
from pathlib import Path
import argparse
import math
import sys
import bpy
import numpy as np
from mathutils import Vector
from mathutils import noise

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--preview-dir', default='/tmp/teddy-review')
parser.add_argument('--skip-individuals', action='store_true')
parser.add_argument('--quick-review', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
PREVIEW = Path(args.preview_dir)
PREVIEW.mkdir(parents=True, exist_ok=True)
OUT = ROOT / 'public' / 'models'
OUT.mkdir(parents=True, exist_ok=True)

def select(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for ob in objects: ob.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]

def apply(ob, modifier):
    select([ob]); bpy.ops.object.modifier_apply(modifier=modifier.name)

def smoothstep(a, b, v):
    t = max(0.0, min(1.0, (v-a)/(b-a)))
    return t*t*(3-2*t)

def coat_normal():
    n = 256
    rng=np.random.default_rng(9073)
    frequency=np.fft.fftfreq(n)
    fx,fy=np.meshgrid(frequency,frequency)
    # Isotropic, periodic fleece: no regular stripes and no painted dark speckles.
    field=rng.standard_normal((n,n))
    kernel=np.exp(-(fx*fx+fy*fy)/(2*.15*.15))
    h=np.fft.ifft2(np.fft.fft2(field)*kernel).real
    h=h/max(.001,h.std())*.45
    dx = (np.roll(h,-1,1)-np.roll(h,1,1))*.30
    dy = (np.roll(h,-1,0)-np.roll(h,1,0))*.30
    vectors = np.stack([-dx,-dy,np.ones_like(h)],axis=-1)
    vectors /= np.linalg.norm(vectors,axis=-1,keepdims=True)
    rgba = np.ones((n,n,4),np.float32);rgba[:,:,:3]=vectors*0.5+0.5
    image = bpy.data.images.new('Soft fleece normal', n, n)
    image.colorspace_settings.name='Non-Color'
    image.pixels.foreach_set(rgba.ravel())
    image.filepath_raw=str(PREVIEW/'coat-normal.png');image.file_format='PNG';image.save();image.pack()
    return image

def material(name, color, roughness=.75, fleece=False):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value=(*color,1)
    bs.inputs['Roughness'].default_value=roughness
    bs.inputs['Specular IOR Level'].default_value=.28 if fleece else .42
    if fleece:
        bs.inputs['Roughness'].default_value=.92
        bs.inputs['Sheen Weight'].default_value=.4
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=NORMAL
        normal=m.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=.45
        m.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
        m.node_tree.links.new(normal.outputs['Normal'],bs.inputs['Normal'])
    return m

def sphere(name, center, radii, mat=None, rotation=None, segments=32):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=20,location=center)
    ob=bpy.context.object;ob.name=name;ob.scale=radii
    if rotation:ob.rotation_euler=rotation
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if mat:ob.data.materials.append(mat)
    for p in ob.data.polygons:p.use_smooth=True
    return ob

def join(objects,name):
    select(objects);bpy.ops.object.join();ob=objects[0];ob.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    return ob

def unwrap(ob):
    # Continuous cylindrical UVs are enough for the fine, directionless fleece.
    layer=ob.data.uv_layers.new(name='Fleece UV')
    zs=[v.co.z for v in ob.data.vertices];low,high=min(zs),max(zs)
    xs=[v.co.x for v in ob.data.vertices];ys=[v.co.y for v in ob.data.vertices]
    cx=(min(xs)+max(xs))*.5;cy=(min(ys)+max(ys))*.5
    for loop in ob.data.loops:
        x,y,z=ob.data.vertices[loop.vertex_index].co
        local_y=.10-.40*smoothstep(.80,1.10,z) if ob.name=='Continuous coat' else cy
        layer.data[loop.index].uv=((math.atan2(y-local_y,x-cx)/math.tau+.5)*2,(z-low)/max(.001,high-low)*2)

def sculpt(parts,name,mat,voxel=.027,texture_amount=.001):
    print('SCULPT',name,flush=True)
    ob=join(parts,name)
    remesh=ob.modifiers.new('Continuous sculpt','REMESH');remesh.mode='VOXEL';remesh.voxel_size=voxel;remesh.use_smooth_shade=True
    apply(ob,remesh)
    sm=ob.modifiers.new('Soft transitions','SMOOTH');sm.factor=.65;sm.iterations=8;apply(ob,sm)
    sub=ob.modifiers.new('Silhouette refinement','SUBSURF');sub.levels=1;apply(ob,sub)
    decimate=ob.modifiers.new('Web silhouette budget','DECIMATE');decimate.ratio=.18;apply(ob,decimate)
    if texture_amount:
        normals=[v.normal.copy() for v in ob.data.vertices]
        for v,n in zip(ob.data.vertices,normals):
            p=v.co.copy()
            v.co += n * (noise.noise_vector(p*18.0)[0]*texture_amount)
    ob.data.materials.clear();ob.data.materials.append(mat)
    for p in ob.data.polygons:p.use_smooth=True
    unwrap(ob)
    print('SCULPTED',name,len(ob.data.vertices),flush=True)
    return ob

def line(name,points,width,mat):
    data=bpy.data.curves.new(name,'CURVE');data.dimensions='3D';data.resolution_u=16
    spline=data.splines.new('BEZIER');spline.bezier_points.add(len(points)-1)
    for pt,co in zip(spline.bezier_points,points):pt.co=co;pt.handle_left_type='AUTO';pt.handle_right_type='AUTO'
    data.bevel_depth=width;data.bevel_resolution=3;data.use_fill_caps=True
    ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);select([ob]);bpy.ops.object.convert(target='MESH')
    ob=bpy.context.object;ob.data.materials.append(mat);return ob

def rig_model(meshes):
    arm=bpy.data.armatures.new('Teddy skeleton');rig=bpy.data.objects.new('TeddyRig',arm);bpy.context.collection.objects.link(rig)
    select([rig]);bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,head,tail,parent=None):
        b=arm.edit_bones.new(name);b.head=head;b.tail=tail
        if parent:b.parent=arm.edit_bones[parent]
    bone('Root',(0,0,.05),(0,0,.25))
    bone('Body',(0,.25,.61),(0,-.12,.80),'Root')
    bone('Head',(0,-.20,1.0),(0,-.30,1.43),'Body')
    bone('Tail',(0,.52,.85),(0,.75,1.10),'Body')
    for side,sign in [('L',-1),('R',1)]:
        bone('Ear'+side,(sign*.35,-.24,1.44),(sign*.44,-.27,1.02),'Head')
        for end,y in [('Front',-.23),('Back',.37)]:
            bone(end+side,(sign*.225,y,.68),(sign*.225,y,.34),'Body')
            bone(end+side+'Paw',(sign*.225,y,.34),(sign*.225,y-.035,.10),end+side)
    bpy.ops.object.mode_set(mode='OBJECT')
    for ob,mode in meshes:
        groups={b.name:ob.vertex_groups.new(name=b.name) for b in arm.bones}
        for v in ob.data.vertices:
            if mode!='Body':weights={mode:1.0}
            else:
                x,y,z=v.co
                head=smoothstep(.88,1.13,z)
                leg=(1-smoothstep(.43,.74,z))*smoothstep(.075,.17,abs(x))*(1-head)
                side='L' if x<0 else 'R';end='Front' if y<.08 else 'Back'
                paw=1-smoothstep(.23,.43,z)
                weights={'Head':head,'Body':max(0,1-head-leg),end+side:leg*(1-paw),end+side+'Paw':leg*paw}
            for key,value in weights.items():
                if value>0.0001:groups[key].add([v.index],value,'REPLACE')
        mod=ob.modifiers.new('Skin deformation','ARMATURE');mod.object=rig;ob.parent=rig
    return rig

def add_actions(rig):
    rig.animation_data_create()
    for name,frames in [('Idle',96),('Curious',72),('Happy',60),('Rest',96)]:
        action=bpy.data.actions.new(name);rig.animation_data.action=action
        for f in range(0,frames+1,3):
            phase=f/frames*math.tau
            for p in rig.pose.bones:p.rotation_mode='XYZ';p.rotation_euler=(0,0,0);p.location=(0,0,0);p.scale=(1,1,1)
            rig.pose.bones['Body'].location.z=math.sin(phase)*.006
            rig.pose.bones['Tail'].rotation_euler[1]=math.sin(phase*3)*(.38 if name=='Happy' else .12)
            rig.pose.bones['Head'].rotation_euler[1]=math.sin(phase)*.028
            for side,sign in [('L',-1),('R',1)]:
                rig.pose.bones['Ear'+side].rotation_euler[1]=math.sin(phase*2-.3+sign*.2)*.035
            if name=='Curious':
                rig.pose.bones['Head'].rotation_euler[1]=math.sin(phase)*.18
                rig.pose.bones['Head'].rotation_euler[0]=-.05*(1-math.cos(phase))
                rig.pose.bones['EarL'].rotation_euler[2]=math.sin(phase)*.08
            if name=='Happy':
                bounce=(1-math.cos(phase*2))*.004
                rig.pose.bones['Body'].location.z=bounce
                rig.pose.bones['Head'].rotation_euler[0]=-.035+math.sin(phase*2)*.075
                rig.pose.bones['Head'].rotation_euler[1]=math.sin(phase)*.075
                for side,sign in [('L',-1),('R',1)]:
                    rig.pose.bones['Ear'+side].rotation_euler[2]=sign*math.sin(phase*2-.4)*.10
                    rig.pose.bones['Front'+side].rotation_euler[0]=math.sin(phase*2)*.055
            if name=='Rest':rig.pose.bones['Head'].rotation_euler[0]=.13
            for p in rig.pose.bones:
                p.keyframe_insert('rotation_euler',frame=f,group=p.name)
                if p.name=='Body':p.keyframe_insert('location',frame=f,group=p.name)
        for curve in action.fcurves:
            for key in curve.keyframe_points:key.interpolation='BEZIER'
        rig.animation_data.action=None
        track=rig.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,0,action);track.mute=True
    for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
    return rig

def make_dog(variant):
    color=(.30,.115,.032) if variant==0 else (.78,.65,.43)
    earcolor=(.255,.086,.025) if variant==0 else (.65,.51,.32)
    coat=material('Apricot velvet' if variant==0 else 'Cream velvet',color,fleece=True)
    ears=material('Soft ear fleece',earcolor,fleece=True)
    black=material('Warm dark eyes',(.018,.011,.008),.13)
    nose_mat=material('Soft charcoal nose',(.026,.016,.013),.34)
    mouth_mat=material('Warm smile',(.095,.035,.028),.75)
    white=material('Eye glint',(.97,.95,.88),.15)
    rose=material('Rose tongue',(.57,.19,.20),.72)
    ribbon=material('Sage ribbon' if variant else 'Berry collar',(.20,.36,.29) if variant else (.28,.055,.069),.78)
    gold=material('Brass tag',(.58,.37,.12),.36)
    parts=[sphere('body',(0,.13,.68),(.30,.49,.32)),sphere('chest',(0,-.18,.81),(.28,.29,.35)),sphere('neck',(0,-.23,1.02),(.26,.25,.28)),sphere('head',(0,-.29,1.26),(.427,.335,.342)),sphere('crown',(0,-.235,1.435),(.33,.282,.22))]
    for x,z,r in [(-.23,1.485,.12),(0,1.55,.125),(.21,1.49,.125)]:
        parts.append(sphere('Integrated crown curl',(x,-.25,z),(r,.21,r)))
    for sign in [-1,1]:
        parts += [sphere('cheek',(sign*.10,-.566,1.095),(.16,.127,.103))]
        for y in [-.23,.38]:
            parts += [sphere('upper leg',(sign*.225,y,.45),(.112,.127,.255)),sphere('paw',(sign*.225,y-.035,.125),(.13,.168,.104))]
    body=sculpt(parts,'Continuous coat',coat)
    meshes=[(body,'Body')]
    for side,sign in [('L',-1),('R',1)]:
        ear=sphere('Ear '+side,(sign*.405,-.255,1.235),(.17,.195,.31),rotation=(.10,sign*-.19,0))
        # Taper the ear root, leaving a broad, soft hanging end.
        for v in ear.data.vertices:
            v.co.x*=1-.23*smoothstep(-.10,.26,v.co.z)
        earparts=[ear]
        for z in [1.075,1.235,1.39]:
            earparts.append(sphere('Integrated ear curl',(sign*.48,-.26,z),(.09,.165,.105)))
        ear=sculpt(earparts,'Velvet ear '+side,ears,voxel=.019,texture_amount=.001)
        meshes.append((ear,'Ear'+side))
        eye=sphere('Eye '+side,(sign*.162,-.590,1.29),(.071,.033,.074),black,rotation=(0,sign*.10,sign*-.09))
        glint=sphere('Glint '+side,(sign*.162-.018,-.628,1.321),(.011,.006,.015),white,segments=20)
        eye=join([eye,glint],'Eye '+side)
        eye.shape_key_add(name='Basis');blink=eye.shape_key_add(name='Blink')
        for v in blink.data:v.co.z=1.29+(v.co.z-1.29)*.08
        meshes.append((eye,'Head'))
    nose=sphere('Rounded triangle nose',(0,-.716,1.14),(.081,.047,.053),nose_mat)
    for v in nose.data.vertices:v.co.x*=.85+.30*v.co.z/.053
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);meshes.append((nose,'Head'))
    # A modest upturned dog smile, tucked underneath the muzzle.
    for sign in [-1,1]:
        smile=line('Smile',[(0,-.688,1.097),(sign*.052,-.688,1.070),(sign*.10,-.667,1.089)],.006,mouth_mat)
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);meshes.append((smile,'Head'))
    tongue=sphere('Tongue',(0,-.683,1.050),(.028,.016,.029),rose);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);meshes.append((tongue,'Head'))
    tail=line('Teddy tail',[(0,.51,.81),(0,.66,.96),(.018,.73,1.10),(.02,.72,1.17)],.077,coat)
    tail=sculpt([tail],'Soft tail',coat,voxel=.018,texture_amount=.0015);meshes.append((tail,'Tail'))
    # A small textile accent rather than a second ring around the face.
    if variant:
        bow=sphere('Ribbon left',(-.325,-.435,1.53),(.072,.027,.038),ribbon,rotation=(0,.2,-.25))
        bow2=sphere('Ribbon right',(-.215,-.435,1.55),(.072,.027,.038),ribbon,rotation=(0,-.2,-.25))
        knot=sphere('Ribbon knot',(-.272,-.462,1.54),(.027,.024,.027),ribbon)
        bow=join([bow,bow2,knot],'Sage bow');meshes.append((bow,'Head'))
    else:
        tag=sphere('Little brass heart tag',(0,-.436,.81),(.035,.013,.042),gold)
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);meshes.append((tag,'Body'))
    rig=add_actions(rig_model(meshes))
    rig['author']='Original birthday-card poodle, Blender mesh authoring'
    return rig,[ob for ob,mode in meshes]

def point_at(ob,target):ob.rotation_euler=(Vector(target)-ob.location).to_track_quat('-Z','Y').to_euler()

def setup_render():
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32
    scene.cycles.use_denoising=True
    scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.world.color=(.20,.17,.15)
    scene.view_settings.view_transform='AgX'
    def area(name,pos,energy,color,size):
        data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.color=color;data.shape='DISK';data.size=size
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob);ob.location=pos;point_at(ob,(0,0,.9))
    area('Large warm key',(-3,-4,5),430,(1,.85,.72),4)
    area('Cool fill',(3,-2,2.8),240,(.78,.87,1),3)
    area('Soft rim',(0,3,4),430,(1,.85,.65),3)
    floor=material('Studio background',(.055,.043,.042),.86)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,0));bpy.context.object.data.materials.append(floor)
    cam=bpy.data.cameras.new('Review Camera');camera=bpy.data.objects.new('Review Camera',cam);bpy.context.collection.objects.link(camera);scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=2.15
    return camera

bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
NORMAL=coat_normal()
for variant,name in enumerate(['apricot','cream']):
    rig,meshes=make_dog(variant)
    select([rig]+meshes)
    for track in rig.animation_data.nla_tracks:track.mute=False
    bpy.context.scene.frame_set(0)
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'teddy-{name}.glb'),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,export_frame_range=False,export_skins=True,export_morph=True,export_morph_animation=False,export_materials='EXPORT',export_extras=True,export_tangents=True)
    for track in rig.animation_data.nla_tracks:track.mute=True
    for p in rig.pose.bones:p.rotation_euler=(0,0,0);p.location=(0,0,0)
    camera=setup_render()
    angles=[] if args.skip_individuals else [('front',(0,-5,2.0)),('three-quarter',(3.2,-4.8,2.1))]
    if args.quick_review:angles=[('three-quarter',(3.2,-4.8,2.1))] if variant==0 else []
    for angle,location in angles:
        camera.location=location;point_at(camera,(0,-.05,.86));bpy.context.scene.render.filepath=str(PREVIEW/f'{name}-{angle}.png');bpy.ops.render.render(write_still=True)
    print('EXPORTED',name,(OUT/f'teddy-{name}.glb').stat().st_size,flush=True)
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Review the exported files together, so the review covers the delivered assets.
REVIEW_ACTIONS={}
for variant,name in enumerate(['apricot','cream']):
    before_actions=set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=str(OUT/f'teddy-{name}.glb'))
    if variant==0:
        imported=[a for a in bpy.data.actions if a not in before_actions]
        REVIEW_ACTIONS={clip:next(a for a in imported if a.name.startswith(clip)) for clip in ['Idle','Curious','Happy','Rest']}
    roots=[o for o in bpy.context.selected_objects if o.parent is None]
    for root in roots:
        root.location.x = .54 if variant else -.54
        root.rotation_euler.z = -.10 if variant else .10
        if variant:root.scale *= .91
camera=setup_render();camera.data.ortho_scale=2.75
bpy.context.scene.render.resolution_x=1000;bpy.context.scene.render.resolution_y=700
camera.location=(.35,-5,2.0);point_at(camera,(0,-.03,.84))
bpy.context.scene.render.filepath=str(PREVIEW/'teddy-duo.png');bpy.ops.render.render(write_still=True)
bpy.context.scene.render.resolution_x=660;bpy.context.scene.render.resolution_y=462
bpy.context.scene.cycles.samples=20
rigs=[o for o in bpy.context.scene.objects if o.type=='ARMATURE']
for clip,frame in [('Curious',18),('Curious',45),('Happy',12),('Happy',36)]:
    action=REVIEW_ACTIONS[clip]
    for rig in rigs:
        rig.animation_data_create()
        for track in rig.animation_data.nla_tracks:track.mute=True
        rig.animation_data.action=action
    bpy.context.scene.frame_set(frame)
    bpy.context.scene.render.filepath=str(PREVIEW/f'motion-{clip.lower()}-{frame}.png')
    bpy.ops.render.render(write_still=True)
print('FINISHED',str(OUT),str(PREVIEW),flush=True)
