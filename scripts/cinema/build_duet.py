"""A blue-hour hilltop duet using Blender Studio's Snow and Rain rigs (CC BY)."""
import sys,math,random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *

clear();scene=setup(samples=48);scene.frame_end=576
random.seed(90723)
snow,so=append_character('snow');rain,ro=append_character('rain')

# The professional face topology, eyes, facial correctives and skin shading remain intact.
ivory=material('Ivory cotton under warm lamplight',(.83,.81,.72),.62)
ivory.node_tree.nodes['Principled BSDF'].inputs['Sheen Weight'].default_value=.18
navy=material('Midnight wool trousers',(.019,.024,.045),.68)
silk=material('Saffron silk',(.83,.49,.055),.37)
silk.node_tree.nodes['Principled BSDF'].inputs['Sheen Weight'].default_value=.45
silk.node_tree.nodes['Principled BSDF'].inputs['Sheen Tint'].default_value=(1,.7,.2,1)
leather=material('Espresso polished leather',(.021,.016,.018),.3)
for obj in so:
    if obj.name=='GEO-snow-shirt':assign(obj,ivory)
    if obj.name=='GEO-snow-pants':assign(obj,navy)
    if obj.name.startswith('GEO-snow-shoes'):assign(obj,leather)
for obj in ro:
    if obj.animation_data:
        for driver in list(obj.animation_data.drivers):
            if driver.data_path in ['hide_render','hide_viewport'] or 'show_render' in driver.data_path:
                obj.animation_data.drivers.remove(driver)
    if obj.name in ['GEO-rain-jeans','GEO-rain-scarf','GEO-rain-body_nomask']:obj.hide_render=True
    if obj.name=='GEO-rain-body':
        obj.hide_render=False;obj.hide_viewport=False;obj.hide_set(False)
        for mod in obj.modifiers:
            if mod.type=='MASK':mod.show_render=False;mod.show_viewport=False
    if obj.name=='GEO-rain-body_nomask':
        obj.hide_render=True
        for mod in obj.modifiers:
            if mod.type=='MASK':mod.show_render=False;mod.show_viewport=False
    if obj.name=='GEO-rain-top':assign(obj,silk)
    if obj.name=='GEO-rain-shoes':
        for s in obj.material_slots:s.material=leather
    if obj.name=='GEO-rain-hairband':assign(obj,silk)
rain.pose.bones['Properties_Character_Rain']['Scarf']=False
rain.pose.bones['Properties_IKFK']['ik_stretch_arms']=0.0

# Fit a continuous, pleated silk skirt to Rain's existing waist. Secondary motion
# is authored as inertial shape keys, with the pelvis binding retained at its top.
verts=[];faces=[];segments=96;rows=18
for j in range(rows):
    u=j/(rows-1);z=.93-u*.49
    rx=.145+.17*u**1.4;ry=.102+.19*u**1.4
    for i in range(segments):
        a=i/segments*TAU
        fold=(.002+.013*u)*math.cos(12*a)
        verts.append(((rx+fold)*math.cos(a),-.014+(ry+fold)*math.sin(a),z+.008*u*math.cos(12*a)))
for j in range(rows-1):
    for i in range(segments):
        a=j*segments+i;b=j*segments+(i+1)%segments
        faces.append((a,b,b+segments,a+segments))
skirt=mesh('Rain custom pleated dance skirt',verts,faces,silk)
skirt.parent=rain
skirt.shape_key_add(name='Basis')
swirl=skirt.shape_key_add(name='Turn inertia')
kick=skirt.shape_key_add(name='Forward step')
for idx,v in enumerate(skirt.data.vertices):
    u=(idx//segments)/(rows-1);a=(idx%segments)/segments*TAU
    theta=a+.18*u*u
    x,y,z=v.co
    swirl.data[idx].co=(x*math.cos(.18*u*u)-y*math.sin(.18*u*u)+.10*u*u*math.cos(a), x*math.sin(.18*u*u)+y*math.cos(.18*u*u)+.085*u*u*math.sin(a),z+.10*u*u*(.7+.3*math.cos(a*3)))
    kick.data[idx].co.y-=.11*u*u*max(0,-math.sin(a))
    kick.data[idx].co.z+=.045*u*u*max(0,-math.sin(a))
waist=next((b.name for b in rain.data.bones if b.use_deform and 'spine' in b.name.lower()),'DEF-Spine1')
group=skirt.vertex_groups.new(name=waist);group.add(list(range(len(verts))),1,'REPLACE')
arm=skirt.modifiers.new('Pelvis binding','ARMATURE');arm.object=rain
sub=skirt.modifiers.new('Silk surface','SUBSURF');sub.levels=1;sub.render_levels=1
solid=skirt.modifiers.new('Hem thickness','SOLIDIFY');solid.thickness=.002

for rig in [snow,rain]:
    prop=rig.pose.bones.get('Properties')
    if prop:
        for k in list(prop.keys()):
            if 'ik_stretch' in k:prop[k]=0.
            if k in ['ik_left_upperarm','ik_right_upperarm','ik_left_thigh','ik_right_thigh']:prop[k]=1.

def path(t,female):
    dance=smooth((t-2)/2)*(1-smooth((t-20)/3))
    x=(.56 if female else -.56)+.18*math.sin((t-3)*math.pi/2)*dance
    partner=smooth((t-12.5)/1.3)*(1-smooth((t-19)/1.3))
    x=x*(1-partner)+(.25 if female else -.35)*partner
    y=.045*math.sin(t*math.pi/2)*dance
    angle=(-.12 if female else .12)
    if female:angle+=TAU*smooth((t-14)/4)
    else:angle+=.12*math.sin(t*.4)*dance
    return x,y,angle

def foot(t,female,side,rest):
    # Each planted sole stays at its previous landing point in world space.
    active=3<t<21
    if not active:
        x,y,a=path(t,female);return Vector((x+math.cos(a)*rest.x-math.sin(a)*rest.y,y+math.sin(a)*rest.x+math.cos(a)*rest.y,rest.z)),a
    period=1.;offset=.5 if side=='R' else 0.
    cycle=math.floor((t-3-offset)/period);start=3+offset+cycle*period
    phase=t-start
    stepStart=start+.58;stepEnd=start+1.
    def planted(at):
        x,y,a=path(at,female)
        return Vector((x+math.cos(a)*rest.x-math.sin(a)*rest.y,y+math.sin(a)*rest.x+math.cos(a)*rest.y,rest.z)),a
    a,ra=planted(start);b,rb=planted(stepEnd)
    if phase<.58:return a,ra
    p=smooth((t-stepStart)/(stepEnd-stepStart));pos=a.lerp(b,p)
    lift=math.sin(math.pi*p)*(.13 if 9<t<13 else .055)
    pos.z+=lift
    if 9<t<13:pos.y-=.15*math.sin(math.pi*p)
    return pos,ra+(rb-ra)*p

for frame in range(1,578,2):
    if frame%48==1:print('BLOCKING_FRAME',frame,flush=True)
    scene.frame_set(frame);t=(frame-1)/24
    for rig,female in [(snow,False),(rain,True)]:
        x,y,yaw=path(t,female)
        rig.location=(x,y,-.012+.009*math.sin(t*math.pi*2)**2*smooth((t-2)/2));rig.rotation_euler=(0,0,yaw)
        key(rig,'location',frame);key(rig,'rotation_euler',frame)
        bpy.context.view_layer.update()
        inv=rig.matrix_world.inverted()
        for side,sign in [('L',1),('R',-1)]:
            bn='IK-Foot.'+side;rest=rig.data.bones[bn].head_local.copy()
            if female:rest.z+=.014
            world,rot=foot(t,female,side,rest)
            control_position(rig,bn,inv@world,frame,rot-yaw)
            # Nearest hands share one exact position during the partnered turn.
            inner=(female and side=='R') or (not female and side=='L')
            hold=smooth((t-12.5)/1.3)*(1-smooth((t-19)/1.3))
            hand=Vector((sign*.29,-.12,.94+.045*math.sin(t*math.pi/2+(0 if inner else 1))))
            if inner:
                clasp=inv@Vector((.20,-.18,1.22+.48*math.sin(math.pi*max(0,min(1,(t-13)/7)))))
                hand=hand.lerp(clasp,hold)
            else:
                hand.z+=.08*smooth((t-3)/2)*(1-smooth((t-21)/2));hand.x+=sign*.07*math.sin(t*math.pi/2)
            control_position(rig,('IK-Hand.' if female else 'IK-Wrist.')+side,hand,frame)
            # Fingers curl softly, avoiding the open-handed mannequin pose.
            for finger in ['Index','Middle','Ring','Pinky']:
                for joint in [1,2,3]:
                    for pattern in [f'FK-Finger_{finger}{joint}.{side}',f'FK-Finger_{finger.lower()}{joint}.{side}']:
                        pose_rotation(rig,pattern,(.16 if not inner else .22,0,0),frame)
        pose_rotation(rig,'FK-Chest',(.015, .025*math.sin(t*1.2),.025*math.sin(t*1.57)),frame)
        pose_rotation(rig,'FK-Head',(.015,0,(.10 if female else -.10)*(1-smooth((t-20)/3))),frame)
    swirl.value=.08+.76*smooth((t-13.5)/1.5)*(1-smooth((t-18.5)/2));key(swirl,'value',frame)
    kick.value=.55*max(0,math.sin(t*math.pi*2)) if 9<t<13 else 0;key(kick,'value',frame)

# Blue-hour stage: physical stone foreground, warm practicals, city bokeh depth.
stone=material('Blue-hour limestone',(.13,.125,.16),.83)
nodes=stone.node_tree.nodes;links=stone.node_tree.links;p=nodes.get('Principled BSDF')
noise=nodes.new('ShaderNodeTexNoise');noise.inputs['Scale'].default_value=100
bump=nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value=.17;bump.inputs['Distance'].default_value=.016
links.new(noise.outputs['Fac'],bump.inputs['Height']);links.new(bump.outputs['Normal'],p.inputs['Normal'])
cube('Wide stone terrace',(0,0,-.105),(35,25,.2),stone,.06)
iron=material('Aged black bronze',(.038,.033,.036),.34,.55)
rail=material('Weathered terrace edge',(.17,.155,.17),.72)
for x in [-6,-4,-2,0,2,4,6]:cube('Balustrade pillar',(x,2.35,.34),(.11,.12,.7),rail,.02)
cylinder('Terrace handrail',(-7,2.35,.72),(7,2.35,.72),.036,iron)
lamp=emission('Honey glass', (1,.56,.18),7)
for x,y,z in [(-2.45,.65,2.65),(4.3,3.5,2.5)]:
    cylinder('Lamp post',(x,y,0),(x,y,z),.032,iron)
    sphere('Glowing frosted globe',(x,y,z),(.13,.13,.16),lamp)
    cube('Lantern cap',(x,y,z+.18),(.30,.30,.03),iron,.025)
    area('Lantern warm pool',(x,y,z-.13),(x+.2,y-.5,.4),(1,.58,.27),85,.6)
    for dx in [-.095,.095]:cylinder('Lantern frame',(x+dx,y,z-.14),(x+dx,y,z+.14),.008,iron)

# Mountain silhouettes are geometry against a continuous luminous sky gradient.
sky=bpy.data.materials.new('Periwinkle rose dusk');sky.use_nodes=True
n=sky.node_tree.nodes;n.clear();l=sky.node_tree.links
tc=n.new('ShaderNodeTexCoord');sep=n.new('ShaderNodeSeparateXYZ');ramp=n.new('ShaderNodeValToRGB');em=n.new('ShaderNodeEmission');out=n.new('ShaderNodeOutputMaterial')
ramp.color_ramp.elements[0].position=.0;ramp.color_ramp.elements[0].color=(.49,.19,.14,1)
ramp.color_ramp.elements[1].position=1.;ramp.color_ramp.elements[1].color=(.025,.035,.105,1)
mid=ramp.color_ramp.elements.new(.24);mid.color=(.20,.12,.29,1)
l.new(tc.outputs['Generated'],sep.inputs[0]);l.new(sep.outputs['Z'],ramp.inputs[0]);l.new(ramp.outputs[0],em.inputs[0]);l.new(em.outputs[0],out.inputs[0])
cube('Painted evening sky',(0,38,7),(110,.1,25),sky,0)
for layer in range(3):
    vertices=[];faces=[];y=12+layer*7
    for i in range(65):
        x=-45+i*1.5;z=1.1+layer*.5+.5*math.sin(x*.22+layer)+.24*math.sin(x*.71+layer*2)
        vertices.extend([(x,y,-2),(x,y,z)])
        if i:faces.append((i*2-2,i*2,i*2+1,i*2-1))
    mesh('Hills '+str(layer),vertices,faces,material('Hill haze '+str(layer),(.032+layer*.022,.035+layer*.02,.075+layer*.045),1))
warmWindow=emission('City amber',(.95,.48,.17),3)
coolWindow=emission('City pearl',(.62,.73,1),2)
for i in range(400):
    x=random.uniform(-25,25);y=random.uniform(5,17);z=random.uniform(.05,1.1)
    sphere('City light %03d'%i,(x,y,z),(.016,.012,.014),warmWindow if i%5 else coolWindow)

pianoPath=ROOT/'.asset-build'/'review'/'grand-piano.glb'
if not pianoPath.exists():
    pianoPath=next((ROOT/'.asset-build').rglob('grand-piano.glb'))
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(pianoPath))
pianoObjects=list(set(bpy.data.objects)-before)
anchor=bpy.data.objects.new('Piano placement',None);bpy.context.collection.objects.link(anchor)
for obj in pianoObjects:
    if obj.parent is None:obj.parent=anchor
anchor.scale=(.12,)*3;anchor.location=(-2.25,1.1,0);anchor.rotation_euler.z=-.45

area('Warm soft key',(-3,-4,4),(0,0,1),(1,.75,.49),430,4.5)
area('Blue sky fill',(3,-1,4),(0,0,1),(.38,.48,1),290,5)
area('Silk and hair rim',(1,3,3.5),(0,0,1),(.68,.72,1),630,3.5)
land=camera('Landscape',(2.9,-8.8,2.9),(0,.2,1.05),48,5.6)
portrait=camera('Portrait',(1.8,-8.1,2.55),(.03,.1,1.15),47,5.6)
for frame,pos,at in [(1,(2.9,-8.8,2.9),(0,.2,1.05)),(97,(2.4,-8.3,2.6),(0,.15,1.02)),(337,(1.0,-7.8,2.4),(0,.1,1.05)),(481,(.2,-7.5,2.3),(0,.05,1.10)),(576,(.2,-7.5,2.3),(0,.05,1.10))]:
    land.location=pos;aim(land,at);land.data.dof.focus_distance=(Vector(at)-land.location).length
    key(land,'location',frame);key(land,'rotation_euler',frame);key(land.data.dof,'focus_distance',frame)
scene.camera=land;add_glow();scene.frame_set(73)
save_scene('duet')
scene.render.resolution_x=960;scene.render.resolution_y=540;scene.cycles.samples=24
scene.render.filepath=str(BUILD/'duet-pilot.png');bpy.ops.render.render(write_still=True)
