"""Offline cinema authoring utilities. Blender 4.5 LTS, no paid add-ons."""
import bpy, math, random, sys
from pathlib import Path
from mathutils import Vector, Matrix

ROOT=Path(__file__).resolve().parents[2]
BUILD=ROOT/'.asset-build'/'cinema'
BUILD.mkdir(parents=True,exist_ok=True)
TAU=math.tau

def clear():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def setup(width=1920,height=1080,samples=48,transparent=False):
    scene=bpy.context.scene
    scene.render.engine='CYCLES'
    prefs=bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type='OPTIX';prefs.get_devices()
        for device in prefs.devices: device.use=device.type=='OPTIX'
        scene.cycles.device='GPU'
    except Exception as error:
        print('GPU fallback:',error,flush=True)
    scene.cycles.samples=samples
    scene.cycles.use_denoising=True
    scene.cycles.adaptive_threshold=.035
    scene.cycles.max_bounces=5
    scene.cycles.transparent_max_bounces=6
    scene.cycles.use_light_tree=True
    scene.render.resolution_x=width;scene.render.resolution_y=height
    scene.render.resolution_percentage=100
    scene.render.fps=24
    scene.render.film_transparent=transparent
    scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA' if transparent else 'RGB'
    scene.render.image_settings.color_depth='8'
    scene.render.image_settings.compression=20
    scene.render.use_motion_blur=True
    scene.render.motion_blur_shutter=.32
    scene.view_settings.view_transform='AgX'
    scene.view_settings.look='AgX - Medium High Contrast'
    scene.world=bpy.data.worlds.new('Blue-hour air')
    scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.20,.25,.43,1)
    scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.28
    scene.render.use_persistent_data=True
    return scene

def material(name,color,roughness=.5,metallic=0,subsurface=0):
    m=bpy.data.materials.new(name);m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Roughness'].default_value=roughness
    p.inputs['Metallic'].default_value=metallic
    p.inputs['Subsurface Weight'].default_value=subsurface
    return m

def emission(name,color,power=1):
    m=material(name,color)
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Emission Color'].default_value=(*color,1)
    p.inputs['Emission Strength'].default_value=power
    return m

def assign(obj,mat):
    for slot in obj.material_slots: slot.link='DATA'
    obj.data.materials.clear();obj.data.materials.append(mat)

def mesh(name,vertices,faces,mat=None):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    if mat:obj.data.materials.append(mat)
    for p in data.polygons:p.use_smooth=True
    return obj

def cube(name,position,scale,mat,bevel=.02):
    bpy.ops.mesh.primitive_cube_add(size=1,location=position)
    obj=bpy.context.object;obj.name=name;obj.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    assign(obj,mat)
    if bevel:
        b=obj.modifiers.new('Soft crafted edges','BEVEL');b.width=bevel;b.segments=3
        obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return obj

def sphere(name,position,scale,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,location=position)
    obj=bpy.context.object;obj.name=name;obj.scale=scale
    assign(obj,mat)
    for p in obj.data.polygons:p.use_smooth=True
    return obj

def cylinder(name,a,b,radius,mat):
    delta=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=radius,depth=delta.length,location=(Vector(a)+Vector(b))/2)
    obj=bpy.context.object;obj.name=name;obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler();assign(obj,mat)
    bevel=obj.modifiers.new('Rounded edge','BEVEL');bevel.width=radius*.2;bevel.segments=2
    for p in obj.data.polygons:p.use_smooth=True
    return obj

def aim(obj,target): obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

def area(name,position,target,color,power,size):
    data=bpy.data.lights.new(name,'AREA');data.energy=power;data.color=color;data.shape='DISK';data.size=size
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=position;aim(obj,target)
    return obj

def camera(name,position,target,lens=48,focus=1.0):
    data=bpy.data.cameras.new(name);data.lens=lens;data.sensor_width=36
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);obj.location=position;aim(obj,target)
    data.dof.use_dof=True;data.dof.focus_distance=(Vector(target)-obj.location).length;data.dof.aperture_fstop=focus
    return obj

def append_character(name):
    path=next((ROOT/'model-sources'/'studio'/name).rglob('*.blend'))
    previous=set(bpy.data.objects)
    with bpy.data.libraries.load(str(path),link=False) as (src,dst):
        dst.collections=[c for c in src.collections if c.lower()=='ch-'+name]
    for col in dst.collections: bpy.context.scene.collection.children.link(col)
    objects=list(set(bpy.data.objects)-previous)
    for obj in objects:
        if obj.animation_data:obj.animation_data.action=None
        if obj.animation_data:
            for track in obj.animation_data.nla_tracks:track.mute=True
        if obj.type=='MESH':
            for mod in obj.modifiers:
                if mod.type=='SUBSURF':mod.render_levels=min(mod.render_levels,2)
    rig=next(o for o in objects if o.type=='ARMATURE' and o.name.lower().startswith('rig'))
    for bone in rig.pose.bones:
        bone.rotation_mode='XYZ';bone.location=(0,0,0);bone.rotation_euler=(0,0,0);bone.scale=(1,1,1)
    # The packaged libraries retain their texture directory when appended.
    for image in bpy.data.images:
        if image.source=='FILE' and not image.packed_file and image.filepath:
            if not Path(bpy.path.abspath(image.filepath)).is_file():
                matches=list(path.parent.rglob(Path(image.filepath).name))
                if matches:image.filepath=str(matches[0]);image.reload()
    return rig,objects

def key(obj,path,frame):obj.keyframe_insert(data_path=path,frame=frame)

def pose_rotation(rig,name,angles,frame=None):
    bone=rig.pose.bones.get(name)
    if not bone:return
    bone.rotation_mode='XYZ';bone.rotation_euler=angles
    if frame is not None:key(bone,'rotation_euler',frame)

def control_position(rig,name,position,frame=None,rotation=None):
    bone=rig.pose.bones.get(name)
    if bone is None:return
    mat=rig.data.bones[name].matrix_local.copy()
    if rotation is not None:mat=Matrix.Rotation(rotation,4,'Z')@mat
    mat.translation=Vector(position)
    bone.matrix=mat
    if frame is not None:
        key(bone,'location',frame);key(bone,'rotation_euler',frame)

def smooth(x):x=max(0,min(1,x));return x*x*(3-2*x)

def add_glow():
    scene=bpy.context.scene;scene.use_nodes=True
    nodes=scene.node_tree.nodes;nodes.clear();links=scene.node_tree.links
    layers=nodes.new('CompositorNodeRLayers')
    glow=nodes.new('CompositorNodeGlare');glow.glare_type='FOG_GLOW';glow.quality='MEDIUM';glow.threshold=2;glow.size=7;glow.mix=-.94
    composite=nodes.new('CompositorNodeComposite')
    links.new(layers.outputs['Image'],glow.inputs['Image']);links.new(glow.outputs['Image'],composite.inputs['Image'])

def save_scene(name):
    path=BUILD/(name+'.blend')
    bpy.ops.wm.save_as_mainfile(filepath=str(path),check_existing=False)
    print('SCENE_READY',path,flush=True)
