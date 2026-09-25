"""Lighting, hands, facial life and final lens pass after dance blocking."""
import sys, math, random
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *

bpy.ops.wm.open_mainfile(filepath=str(BUILD/'duet.blend'),use_scripts=False)
scene=bpy.context.scene
snow=bpy.data.objects['RIG-Snow'];rain=bpy.data.objects['RIG-rain']
# Two dancers are the focal point; the terrace is a real place with depth.
for name in ['Landscape','Portrait']:
    cam=bpy.data.objects[name];cam.animation_data_clear();cam.data.animation_data_clear()
    cam.data.lens=50 if name=='Landscape' else 68
    if name=='Portrait':cam.data.sensor_fit='VERTICAL';cam.data.sensor_height=36
    cam.data.dof.aperture_fstop=3.5
    keys=[(1,(1.3,-7.3,1.85),(0,.05,1.02)),(97,(1.0,-7.0,1.75),(0,0,1.02)),(337,(.35,-6.8,1.75),(0,0,1.05)),(481,(-.3,-6.6,1.8),(0,0,1.06)),(576,(-.3,-6.6,1.8),(0,0,1.06))]
    if name=='Portrait':keys=[(f,(p[0]*.25,p[1]-.7,p[2]),(0,0,1.0)) for f,p,a in keys]
    for f,p,a in keys:
        cam.location=p;aim(cam,a);cam.data.dof.focus_distance=(Vector(a)-cam.location).length
        key(cam,'location',f);key(cam,'rotation_euler',f);key(cam.data.dof,'focus_distance',f)

bpy.data.objects['Piano placement'].location=(-2.35,1.7,0)
# The first practical was directly behind the piano lid; separate their silhouettes.
for obj in list(bpy.data.objects):
    if obj.name.startswith(('Lamp post','Glowing frosted','Lantern cap','Lantern warm','Lantern frame')) and obj.location.x<0:
        obj.location.x-=.8;obj.location.y+=.7
bpy.data.lights['Warm soft key'].energy=300
bpy.data.lights['Blue sky fill'].energy=115
bpy.data.lights['Silk and hair rim'].energy=470
bpy.data.materials['Blue-hour limestone'].node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.065,.067,.096,1)
ramp=next(n for n in bpy.data.materials['Periwinkle rose dusk'].node_tree.nodes if n.type=='VALTORGB')
ramp.color_ramp.elements[0].color=(.55,.18,.12,1)
ramp.color_ramp.elements[1].position=.39;ramp.color_ramp.elements[1].color=(.23,.08,.24,1)

# Window clusters form an actual distant city, in front of layered mountain silhouettes.
random.seed(142)
city=material('Distant city',(.020,.024,.056),.85)
window=emission('Tiny inhabited windows',(1,.50,.18),3)
for i in range(95):
    x=random.uniform(-22,22);y=random.uniform(7,11);h=random.uniform(.18,.8)
    cube('Distant building', (x,y,h*.5),(.13+random.random()*.13,.2,h),city,0)
    for level in range(1,int(h/.10)):
        if random.random()<.7:
            cube('Apartment window',(x,y-.104,level*.10),(.025,.003,.025),window,0)

# Relax the wrists: the fingers point down when free, and follow the lifted clasp.
for frame in range(1,578,12):
    scene.frame_set(frame);t=(frame-1)/24
    for rig,female in [(snow,False),(rain,True)]:
        for side,sign in [('L',1),('R',-1)]:
            name=('IK-Hand.' if female else 'IK-Wrist.')+side
            bone=rig.pose.bones[name]
            inner=(female and side=='R') or (not female and side=='L')
            hold=smooth((t-12.5)/1.3)*(1-smooth((t-19)/1.3)) if inner else 0
            mat=Matrix.Rotation(sign*(1.08-1.5*hold),4,'Y')@rig.data.bones[name].matrix_local
            mat.translation=bone.matrix.translation
            bone.matrix=mat;key(bone,'rotation_euler',frame)
            for finger in ['Index','Middle','Ring','Pinky']:
                for joint in [1,2,3]:
                    pose_rotation(rig,f'Finger_{finger}{joint}.{side}',(.09 if joint==1 else .07,0,0),frame)

# Friendly, restrained mouth corners; asymmetry prevents a frozen doll expression.
for rig in [snow,rain]:
    for side in ['L','R']:
        bone=rig.pose.bones.get('ACT-Lips_Corner.'+side)
        if bone:
            m=bone.matrix.copy();m.translation.z+=.0058 if side=='L' else .0054;bone.matrix=m
    for at in [1,94,97,101,105,106,201,204,208,212,213,326,329,333,337,338,451,454,458,462,463,576]:
        scene.frame_set(at)
        blink=max([max(0,1-abs(at-c)/8) for c in [101,208,333,458]])
        for side in ['L','R']:
            name=('MSTR-Eyelid_Upper.' if rig==snow else 'ACT-Eyelid_Upper.')+side
            bone=rig.pose.bones.get(name)
            if bone:
                m=rig.data.bones[name].matrix_local.copy();m.translation.z-=.001+.014*blink
                bone.matrix=m;key(bone,'location',at)

scene.camera=bpy.data.objects['Landscape'];scene.frame_set(241)
save_scene('duet-final')
setup(width=960,height=540,samples=24)
scene.render.filepath=str(BUILD/'duet-final-pilot.png');bpy.ops.render.render(write_still=True)
