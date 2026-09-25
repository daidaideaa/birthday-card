"""Author the 18-second father/cub memory film with local licensed sculpt assets.

Blender 4.5.9 LTS: blender -b -P scripts/cinema/build_pride.py
Produces pride.blend and three Cycles pilot frames. Render the saved Landscape /
Portrait cameras with render_movie.py, then encode the 432 frames at 24 fps.
"""
import sys, math, random
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *
from mathutils import Quaternion
random.seed(2309)
clear()
scene=setup(1920,1080,32)
scene.cycles.denoiser='OPTIX';scene.cycles.denoising_use_gpu=True
scene.frame_start=1; scene.frame_end=432
scene.render.use_motion_blur=False

# Surface fur is actual Cycles strand geometry, not a texture painted around eyes.
def fur_material(name, colors):
    m=bpy.data.materials.new(name); m.use_nodes=True
    n=m.node_tree.nodes; n.clear(); l=m.node_tree.links
    out=n.new('ShaderNodeOutputMaterial'); hair=n.new('ShaderNodeBsdfHairPrincipled')
    hair.parametrization='COLOR'; hair.inputs['Roughness'].default_value=.48
    hair.inputs['Radial Roughness'].default_value=.6
    info=n.new('ShaderNodeHairInfo'); ramp=n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color=(*colors[0],1); ramp.color_ramp.elements[1].color=(*colors[1],1)
    l.new(info.outputs['Random'],ramp.inputs[0]); l.new(ramp.outputs[0],hair.inputs['Color']); l.new(hair.outputs[0],out.inputs[0])
    return m
bodyfur=fur_material('Golden velvet guard hairs',[(.28,.12,.033),(.54,.29,.105)])
manefur=fur_material('Chestnut mane strands',[(.035,.013,.004),(.20,.072,.018)])

def add_fur(obj, mane=False):
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    obj.data.materials.append(manefur if mane else bodyfur)
    bpy.ops.object.particle_system_add()
    ps=obj.particle_systems[-1]; s=ps.settings
    s.type='HAIR'; s.count=6500 if mane else 4500; s.hair_length=.016 if mane else .015
    s.hair_step=3 if mane else 2
    s.child_type='INTERPOLATED'; s.child_percent=4; s.rendered_child_count=14 if mane else 5
    s.clump_factor=.18 if mane else .05; s.clump_shape=.25
    s.roughness_1=.018 if mane else .002
    s.roughness_2=.008 if mane else .001
    s.roughness_endpoint=.018 if mane else .001
    s.root_radius=.0022 if mane else .0008; s.tip_radius=.00015; s.radius_scale=1
    s.material=len(obj.data.materials)
    if not mane:
        group=obj.vertex_groups.new(name='Body fur excluding eyes and muzzle')
        for vertex in obj.data.vertices:
            p=obj.matrix_world@vertex.co
            # The facial sculpt and painted eyelids stay clean and readable.
            mask=1-smooth((-p.y-.48)/.23)*smooth((p.z-.45)/.16)
            group.add([vertex.index],mask,'REPLACE')
        ps.vertex_group_density=group.name
    obj.select_set(False)

def lion(filename, title, scale, location, angle):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(ROOT/'.asset-build/review/lions'/f'{filename}.glb'))
    objects=list(set(bpy.data.objects)-before)
    for obj in list(objects):
        if obj.name.startswith('Icosphere') or 'mane' in obj.name.lower():
            bpy.data.objects.remove(obj,do_unlink=True);objects.remove(obj)
    scene.frame_set(1)
    rig=next(o for o in objects if o.type=='ARMATURE')
    base={b.name:(b.location.copy(),b.rotation_quaternion.copy(),b.scale.copy()) for b in rig.pose.bones}
    for obj in objects:obj.animation_data_clear()
    if filename=='father-lion':
        sections=[(-.86,.225,.225,.255),(-.68,.285,.26,.35),(-.46,.315,.29,.45),(-.20,.235,.24,.34),(.02,.13,.18,.24)]
        vertices=[];faces=[];count=64;inverse=rig.matrix_world.inverted()
        for row,(y,rx,upper,lower) in enumerate(sections):
            for i in range(count):
                a=math.tau*i/count;sn=math.sin(a)
                irregular=.013*math.sin(a*7+row*.6)+.009*math.sin(a*13+.4)
                z=.80+(upper if sn>0 else lower)*sn
                narrowing=1-.32*max(0,-sn)**3
                yy=y+.05*max(0,sn)+.09*max(0,-sn)+.024*math.sin(a*5+row)
                vertices.append(inverse@Vector((.065+(rx+irregular)*math.cos(a)*narrowing,yy,z)))
        for row in range(len(sections)-1):
            for i in range(count):faces.append((row*count+i,(row+1)*count+i,(row+1)*count+(i+1)%count,row*count+(i+1)%count))
        center=len(vertices);vertices.append(inverse@Vector((.065,-.77,.75)))
        for i in range(count):faces.append((center,i,(i+1)%count))
        mane=mesh('Cinema chestnut mane',vertices,faces,material('Warm mane roots',(.11,.046,.016),.93))
        mane.parent=rig;mane.matrix_world=rig.matrix_world.copy()
        weights=mane.vertex_groups.new(name='Wolf_Neck_TopSHJnt_17');weights.add(list(range(len(vertices))),1,'REPLACE')
        modifier=mane.modifiers.new('Follow the head performance','ARMATURE');modifier.object=rig
        objects.append(mane)
        # Directed individual fibers: crown sweeps back, cheeks fall into a
        # tapered chest bib. Unlike normal-emitted particles, this is not a halo.
        import bisect
        triangles=[];areas=[];total=0
        for face in faces:
            for i in range(1,len(face)-1):
                a,b,c=[Vector(vertices[j]) for j in [face[0],face[i],face[i+1]]]
                total+=(b-a).cross(c-a).length*.5;areas.append(total);triangles.append((a,b,c))
        curve=bpy.data.curves.new('Directionally combed mane fibers','CURVE')
        curve.dimensions='3D';curve.resolution_u=1;curve.bevel_depth=.0022;curve.bevel_resolution=1;curve.resolution_u=1
        for shade in [(.045,.017,.005),(.073,.029,.008),(.105,.043,.014),(.15,.066,.022),(.21,.098,.037)]:
            curve.materials.append(material('Mane fiber '+str(shade),shade,.63))
        for index in range(14500):
            a,b,c=triangles[bisect.bisect_left(areas,random.random()*total)]
            u=math.sqrt(random.random());v=random.random();point=(1-u)*a+u*(1-v)*b+u*v*c
            n=(b-a).cross(c-a).normalized()
            height=point.z
            side=1 if point.x>.065 else -1
            if height>.98:
                direction=Vector((side*.18,.97,-.02));length=random.uniform(.065,.12)
            elif height<.58:
                direction=Vector((side*.12,.22,-1));length=random.uniform(.09,.17)
            else:
                direction=Vector((side*.28,.40,-.84));length=random.uniform(.10,.17)
            direction.normalize()
            # Adjacent groups share a wave, forming visible irregular locks.
            phase=point.x*85+point.y*43+point.z*27
            length*=.84+.16*math.sin(phase)
            spline=curve.splines.new('POLY');spline.points.add(5)
            spline.material_index=random.choices(range(5),weights=[1,2,4,3,1])[0]
            for step in range(6):
                t=step/5
                wave=.007*math.sin(t*math.pi*1.4+phase)*t
                pos=point+n*(.006+.020*math.sin(math.pi*t))+direction*(length*t)+Vector((wave,0,wave*.4))
                spline.points[step].co=(*pos,1);spline.points[step].radius=(.85+random.random()*.3)*(1-.94*t)**1.2
        groom=bpy.data.objects.new('Mane groom - crown cheeks and chest',curve);bpy.context.collection.objects.link(groom)
        groom.parent=rig;groom.parent_type='BONE';groom.parent_bone='Wolf_Neck_TopSHJnt_17'
        bpy.context.view_layer.update();groom.matrix_world=Matrix.Identity(4)
        objects.append(groom)
    anchor=bpy.data.objects.new(title,None);bpy.context.collection.objects.link(anchor)
    for obj in objects:
        if obj.parent not in objects:obj.parent=anchor
        if obj.type=='MESH':
            for polygon in obj.data.polygons:polygon.use_smooth=True
            sub=obj.modifiers.new('Cinema surface subdivision','SUBSURF');sub.levels=1;sub.render_levels=1
            for mat in obj.data.materials:
                if mat and mat.use_nodes:
                    p=mat.node_tree.nodes.get('Principled BSDF')
                    if p:
                        p.inputs['Roughness'].default_value=.72
                        p.inputs['Subsurface Weight'].default_value=.055
            add_fur(obj,'mane' in obj.name.lower())
    anchor.scale=(scale,)*3;anchor.location=location;anchor.rotation_euler.z=angle
    return anchor,rig,objects,base
father=lion('father-lion','Father',1.5,(-.62,.35,0),-.22)
cub=lion('lion-cub','Cub',.89,(.76,-.24,0),-.32)
NECK='Wolf_Neck_TopSHJnt_17'; JAW='Wolf_Head_JawSHJnt_12';SPINE='Wolf_Neck_01SHJnt_19'

def turn(rig,base,name,axis,angle):
    bone=rig.pose.bones.get(name)
    if bone:
        local=bone.bone.matrix_local.to_quaternion().inverted()@Vector(axis)
        bone.rotation_mode='QUATERNION';bone.rotation_quaternion=bone.rotation_quaternion@Quaternion(local,angle)

def perform(actor, is_cub):
    anchor,rig,objects,base=actor
    frames=sorted(set(list(range(1,433,3))+[156,157,264,265,432]))
    for frame in frames:
        t=(frame-1)/24
        for bone in rig.pose.bones:
            bone.rotation_mode='QUATERNION'
            bone.location,bone.rotation_quaternion,bone.scale=[v.copy() for v in base[bone.name]]
        if t<6.5:
            anchor.location=(.76,-.24,0) if is_cub else (-.62,.35,0)
            anchor.rotation_euler.z=-.30 if is_cub else -.20
            tender=math.sin(math.pi*smooth((t-1.0)/4.8))
            turn(rig,base,NECK,(0,0,1),(-.15 if is_cub else .13)*tender)
            turn(rig,base,SPINE,(1,0,0),(-.055 if is_cub else .11)*tender)
        elif t<11:
            anchor.location=(.02,-.20,0) if is_cub else (-.62,.35,0)
            anchor.rotation_euler.z=.02 if is_cub else -.2
            turn(rig,base,NECK,(1,0,0),-.13+.018*math.sin(t*1.4))
            turn(rig,base,NECK,(0,0,1),.07*math.sin((t-6.5)*.7))
        else:
            anchor.location=(0,.06,0) if not is_cub else (.76,-.24,0)
            anchor.rotation_euler.z=-.08
            roar=math.sin(math.pi*max(0,min(1,(t-14.4)/2.8)))**1.3 if t>14.4 else 0
            turn(rig,base,NECK,(1,0,0),-.24*roar+.014*math.sin(t*1.5))
            turn(rig,base,JAW,(1,0,0),.30*roar)
            turn(rig,base,SPINE,(1,0,0),-.06*roar)
        for name in base:
            if 'Tail_01' in name:turn(rig,base,name,(0,0,1),.026*math.sin(t*1.3+.5))
            if 'Ear_01_01' in name:turn(rig,base,name,(1,0,0),.018*math.sin(t*1.9+(0 if 'Wolf_l' in name else .7)))
        key(anchor,'location',frame);key(anchor,'rotation_euler',frame)
        for bone in rig.pose.bones:
            key(bone,'rotation_quaternion',frame)
    for obj in objects:
        if obj.type not in ('MESH','CURVE'):continue
        for frame,hidden in ([(1,False),(156,False),(157,False),(264,False),(265,True),(432,True)] if is_cub else [(1,False),(156,False),(157,True),(264,True),(265,False),(432,False)]):
            obj.hide_render=hidden;key(obj,'hide_render',frame)
perform(father,False);perform(cub,True)

# A broad, slightly eroded sandstone shelf supports every planted paw.
rock=material('Layered warm sandstone',(.22,.13,.077),.88)
n=rock.node_tree.nodes;l=rock.node_tree.links;p=n.get('Principled BSDF')
noise=n.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=5;noise.inputs['Detail'].default_value=5
ramp=n.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.035,.018,.009,1);ramp.color_ramp.elements[1].color=(.27,.16,.078,1)
fine=n.new('ShaderNodeTexNoise');fine.inputs['Scale'].default_value=95;fine.inputs['Detail'].default_value=3
bump=n.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.38;bump.inputs['Distance'].default_value=.035
l.new(noise.outputs['Fac'],ramp.inputs[0]);l.new(ramp.outputs[0],p.inputs['Base Color']);l.new(fine.outputs['Fac'],bump.inputs['Height']);l.new(bump.outputs[0],p.inputs['Normal'])
strata=n.new('ShaderNodeTexWave');strata.wave_type='BANDS';strata.bands_direction='Z';strata.inputs['Scale'].default_value=11;strata.inputs['Distortion'].default_value=5;strata.inputs['Detail Scale'].default_value=1.4
strata_mix=n.new('ShaderNodeMixRGB');strata_mix.blend_type='MULTIPLY';strata_mix.inputs[0].default_value=.18
l.new(ramp.outputs[0],strata_mix.inputs[1]);l.new(strata.outputs['Color'],strata_mix.inputs[2]);l.new(strata_mix.outputs[0],p.inputs['Base Color'])

outline=[(-2.9,-2.5),(2.45,-2.6),(2.85,-.7),(2.4,1.1),(1.25,1.95),(-.15,2.15),(-1.8,1.8),(-2.85,.8)]
points=[(x,y,0) for x,y in outline]+[(x*.84+random.uniform(-.12,.12),y*.83+random.uniform(-.12,.12),-2.4+random.uniform(-.2,.2)) for x,y in outline]
faces=[tuple(range(8))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
ledge=mesh('Weathered pride rock',points,faces,rock)
for polygon in ledge.data.polygons:polygon.use_smooth=False
bevel=ledge.modifiers.new('Weathered edge softness','BEVEL');bevel.width=.12;bevel.segments=3
ledge.modifiers.new('Grounded stone normals','WEIGHTED_NORMAL')
# One continuous irregular rock face avoids the old stacked rectangular planks.
for i in range(11):
    a=math.tau*i/11
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1,location=(2.3*math.cos(a),1.9*math.sin(a),-1.7-random.random()*.5))
    boulder=bpy.context.object;boulder.name='Weathered cliff fracture';boulder.scale=(.5+random.random()*.4,.5+random.random()*.3,.7+random.random()*.5);assign(boulder,rock)
    for vertex in boulder.data.vertices:vertex.co*=random.uniform(.83,1.12)
for i in range(18):
    x=random.uniform(-2.55,2.55);y=random.choice([-2.35,2.25])+random.uniform(-.08,.08)
    sphere('Eroded edge chip',(x,y,-.10-random.random()*.12),(.10+random.random()*.1,.13,.08),rock)

# Distant environments are project-local matte paintings; camera, lions, fur,
# rock and shadows remain physically rendered at every frame.
backdrop=bpy.data.materials.new('Cinematic savanna environment');backdrop.use_nodes=True
n=backdrop.node_tree.nodes;n.clear();l=backdrop.node_tree.links
out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');mix=n.new('ShaderNodeMixRGB')
coords=n.new('ShaderNodeTexCoord');center=n.new('ShaderNodeVectorMath');center.operation='SUBTRACT';center.inputs[1].default_value=(.5,.5,0)
scale=n.new('ShaderNodeVectorMath');scale.operation='MULTIPLY'
restore=n.new('ShaderNodeVectorMath');restore.operation='ADD';restore.inputs[1].default_value=(.5,.5,0)
l.new(coords.outputs['Window'],center.inputs[0]);l.new(center.outputs[0],scale.inputs[0]);l.new(scale.outputs[0],restore.inputs[0])
for component,expression in [(0,'min(1,(w/h)/1.5)'),(1,'min(1,1.5/(w/h))')]:
    driver=scale.inputs[1].driver_add('default_value',component).driver;driver.expression=expression
    for name,path in [('w','render.resolution_x'),('h','render.resolution_y')]:
        variable=driver.variables.new();variable.name=name;variable.type='SINGLE_PROP';variable.targets[0].id_type='SCENE';variable.targets[0].id=scene;variable.targets[0].data_path=path
scale.inputs[1].default_value[2]=1
for index,name in enumerate(['savanna-dawn.png','savanna-stars.png']):
    texture=n.new('ShaderNodeTexImage');texture.image=bpy.data.images.load(str(ROOT/'scripts/cinema/assets'/name));texture.image.pack()
    texture.extension='EXTEND';l.new(restore.outputs[0],texture.inputs['Vector']);l.new(texture.outputs['Color'],mix.inputs[index+1])
l.new(mix.outputs[0],em.inputs[0]);l.new(em.outputs[0],out.inputs[0])
for frame,night in [(1,False),(156,False),(157,True),(264,True),(265,False),(432,False)]:
    mix.inputs[0].default_value=1 if night else 0;key(mix.inputs[0],'default_value',frame)
    em.inputs['Strength'].default_value=.75 if night else .86;key(em.inputs['Strength'],'default_value',frame)
plate=cube('Distant photographic air',(0,55,9),(240,.1,130),backdrop,0)
plate.visible_shadow=False;plate.visible_diffuse=False;plate.visible_glossy=False

keylight=area('Sunrise wrap',(-3.8,-4.5,5),(0,0,.9),(1,.73,.45),620,5)
fill=area('Cool open sky',(4,-1.8,4.5),(0,0,1),(.48,.63,1),240,5)
rim=area('Golden mane rim',(-1,4,4.0),(0,0,.9),(1,.57,.19),1000,3.5)
for frame,factor in [(1,1),(156,1.05),(157,.42),(264,.43),(265,1.15),(432,1.24)]:
    for light,power in [(keylight,620),(fill,240),(rim,1000)]:
        light.data.energy=power*factor;key(light.data,'energy',frame)
    rim.data.color=(.37,.48,1) if 157<=frame<=264 else (1,.57,.19);key(rim.data,'color',frame)
    keylight.data.color=(.49,.60,1) if 157<=frame<=264 else (1,.73,.45);key(keylight.data,'color',frame)
    bg=scene.world.node_tree.nodes['Background'];bg.inputs['Strength'].default_value=.20 if 157<=frame<=264 else .32;key(bg.inputs['Strength'],'default_value',frame)

land=camera('Landscape',(3.7,-7.2,2.4),(0,-.05,.94),50,3.5)
portrait=camera('Portrait',(2.9,-8.4,2.45),(0,.0,1.10),45,3.5)
for cam,poses in [(land,[(1,(3.7,-7.2,2.4),(0,-.05,.94),50),(156,(3.05,-6.8,2.23),(0,-.04,.93),50),(157,(2.4,-5.5,1.15),(.03,-.18,.90),52),(264,(1.85,-5.3,1.22),(.03,-.15,.94),52),(265,(2.8,-6.6,1.65),(0,-.12,1.03),52),(360,(2.3,-6.35,1.75),(0,-.1,1.05),52),(432,(2.3,-6.35,1.75),(0,-.1,1.05),52)]),(portrait,[(1,(2.65,-8.6,2.5),(0,-.02,1.03),45),(156,(2.3,-8.2,2.4),(0,0,1.03),45),(157,(1.5,-5.4,1.2),(.04,-.16,.90),47),(264,(1.15,-5.2,1.26),(.04,-.15,.96),47),(265,(1.9,-7.0,1.8),(0,-.1,1.14),47),(360,(1.5,-6.8,1.85),(0,-.1,1.16),47),(432,(1.5,-6.8,1.85),(0,-.1,1.16),47)])]:
    for frame,position,target,lens in poses:
        if cam==land and frame in (157,264):
            target=(target[0],target[1],target[2]-.08);lens=51
        if cam==portrait:
            lens*=1.18;target=(target[0]-.09,target[1],target[2]+.24)
        cam.location=position;aim(cam,target);cam.data.lens=lens
        cam.data.dof.focus_distance=(Vector(target)-cam.location).length
        key(cam,'location',frame);key(cam,'rotation_euler',frame);key(cam.data,'lens',frame);key(cam.data.dof,'focus_distance',frame)
# Eliminate spline overshoot at montage cuts. Keyframes remain continuous inside a shot.
for action in bpy.data.actions:
    try: curves=action.fcurves
    except AttributeError:continue
    for curve in curves:
        for point in curve.keyframe_points:point.interpolation='LINEAR' if curve.data_path not in ('hide_render',) else 'CONSTANT'
scene.camera=land;add_glow();scene.frame_set(73)
save_scene('pride')
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.cycles.samples=24
for name,frame in [('dawn',73),('stars',205),('return',373)]:
    scene.frame_set(frame);scene.render.filepath=str(BUILD/f'pride-pilot-{name}.png');bpy.ops.render.render(write_still=True)
scene.camera=portrait;scene.render.resolution_x=480;scene.render.resolution_y=854
for name,frame in [('dawn',73),('stars',205),('return',373)]:
    scene.frame_set(frame);scene.render.filepath=str(BUILD/f'pride-pilot-portrait-{name}.png');bpy.ops.render.render(write_still=True)
print('PRIDE_PILOTS_READY',flush=True)
