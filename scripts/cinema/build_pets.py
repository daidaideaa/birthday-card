"""Blender Studio Autumn-derived companions; offline Cycles, transparent native frames.

Run with Blender --background --python scripts/cinema/build_pets.py -- --pilot.
Full render: same command without --pilot. Encode with encode_pets.py afterwards.
"""
import sys, math, json, argparse
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *

parser=argparse.ArgumentParser()
parser.add_argument('--pilot',action='store_true')
parser.add_argument('--variant',default='apricot',choices=['apricot','cream'])
parser.add_argument('--action',default='all')
parser.add_argument('--pilot-frame',type=int,default=1)
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
clear()
scene=setup(384,384,32,True)
scene.cycles.denoiser='OPTIX'
scene.cycles.denoising_use_gpu=True
scene.render.use_motion_blur=False
rig,objects=append_character('autumn')
rig.pose.bones['properties']['particles']=1
rig.pose.bones['properties']['model_res']=2
for obj in objects:
    if obj.type=='MESH':
        for mod in list(obj.modifiers):
            if mod.type=='MASK' and mod.name.startswith('hide_leg'):obj.modifiers.remove(mod)
        for ps in obj.particle_systems:
            ps.settings.child_percent=12
            ps.settings.rendered_child_count=32
            ps.settings.kink='CURL'
            ps.settings.kink_amplitude=.0022
            ps.settings.kink_frequency=4
            ps.settings.child_length=.82

# Remap the original groom's textured variations, retaining skin/nose detail.
dark=(.24,.13,.065,1) if args.variant=='apricot' else (.40,.33,.25,1)
light=(.72,.52,.32,1) if args.variant=='apricot' else (.92,.84,.67,1)
for name in ['autumn_body','autumn_body.hair']:
    mat=bpy.data.materials.get(name)
    for node in list(mat.node_tree.nodes):
        socket=node.inputs.get('Base Color') if node.type=='BSDF_PRINCIPLED' else node.inputs.get('Color') if node.type in ['BSDF_HAIR','BSDF_DIFFUSE'] else None
        if socket is None or not socket.is_linked:continue
        source=socket.links[0].from_socket
        ramp=mat.node_tree.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].color=(.006,.004,.002,1) if name=='autumn_body' else dark
        ramp.color_ramp.elements[1].color=light
        mid=ramp.color_ramp.elements.new(.13);mid.color=dark
        mat.node_tree.links.new(source,ramp.inputs[0]);mat.node_tree.links.new(ramp.outputs['Color'],socket)

# Canine eyes have far less exposed white than the original expressive film dog.
# Keep the separate cornea and iris geometry, with chocolate sclera and catchlights.
for suffix,color in [('white',(.024,.012,.006)),('brown',(.075,.028,.009)),('black',(.002,.001,.0007))]:
    mat=bpy.data.materials.get('autumn_eyes_eyeball_'+suffix)
    mat.node_tree.nodes.clear()
    output=mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    shader=mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Roughness'].default_value=.28
    shader.inputs['Specular IOR Level'].default_value=.2
    shader.inputs['Coat Weight'].default_value=.1
    mat.node_tree.links.new(shader.outputs[0],output.inputs['Surface'])
for node in bpy.data.materials['autumn_eyes_cornea'].node_tree.nodes:
    if node.type=='BSDF_GLOSSY':
        node.inputs['Color'].default_value=(.22,.22,.22,1)
        node.inputs['Roughness'].default_value=.09

# Drop the pointed terrier ears gently outward for a softer companion silhouette.
for side,sign in [('L',1),('R',-1)]:
    bone=rig.pose.bones['ear_mstr_ctrl_'+side]
    mat=bone.bone.matrix_local.copy();origin=mat.translation.copy()
    mat=Matrix.Rotation(sign*1.45,4,'Y')@mat;mat.translation=origin
    bone.matrix=mat
    up=rig.pose.bones['eyelid_up_ctrl_'+side]
    mat=up.bone.matrix_local.copy();mat.translation.z+=.007;up.matrix=mat
    brow=rig.pose.bones['brow_ctrl_'+side]
    mat=brow.bone.matrix_local.copy();mat.translation.z+=.010;brow.matrix=mat
control_position(rig,'look',(.08,-.85,.355))

cam=camera('Companion portrait',(.12,-.96,.39),(0,-.015,.195),58,8)
cam.data.type='ORTHO';cam.data.ortho_scale=.55;cam.data.dof.use_dof=False
scene.camera=cam
area('Warm softbox',(-.45,-.50,.7),(0,0,.2),(1,.83,.63),35,.55)
area('Silk fill',(.45,-.25,.42),(0,0,.2),(.70,.83,1),15,.45)
area('Amber rim',(.25,.30,.6),(0,0,.2),(1,.77,.51),35,.4)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.4
bpy.context.view_layer.update()
folder=BUILD/'pets';folder.mkdir(exist_ok=True)

animated=['head_ik_ctrl','tail_ctrl','ear_mstr_ctrl_L','ear_mstr_ctrl_R','eyelid_up_ctrl_L','eyelid_up_ctrl_R','mouth_ctrl','brow_ctrl_L','brow_ctrl_R']
neutral={name:rig.pose.bones[name].matrix_basis.copy() for name in animated}

def offset(name,delta):
    bone=rig.pose.bones[name]
    bone.location+=bone.bone.matrix_local.to_3x3().inverted()@Vector(delta)

def animate(action):
    if rig.animation_data:rig.animation_data.action=None
    count=96 if action in ['idle','rest'] else 48
    duration=count/24
    for frame in range(1,count+2):
        t=(frame-1)/24
        phase=TAU*t/duration
        envelope=math.sin(math.pi*t/duration)**2
        for name in animated:rig.pose.bones[name].matrix_basis=neutral[name]
        head=rig.pose.bones['head_ik_ctrl']
        head.rotation_euler.x=.022*math.sin(phase)
        head.rotation_euler.z=.018*math.sin(phase)
        wag=.12*math.sin(phase*2)
        blink=max(0,1-abs(t-duration*.62)/.11)**1.5
        if action in ['look-left','look-right']:
            head.rotation_euler.y=(.30 if action=='look-right' else -.30)*envelope
            head.rotation_euler.z=.05*envelope
        elif action=='pet':
            head.rotation_euler.z=.18*envelope
            head.rotation_euler.x=-.09*envelope
            blink=max(blink,.65*envelope)
            wag=.4*math.sin(phase*4)*envelope
        elif action=='happy':
            head.rotation_euler.x=-.12*envelope
            head.rotation_euler.z=.10*math.sin(phase*2)*envelope
            wag=.55*math.sin(phase*5)*envelope
            offset('mouth_ctrl',(0,0,-.006*envelope))
        elif action=='rest':
            head.rotation_euler.x=.09+.012*math.sin(phase)
            blink=.68+.06*math.sin(phase)
            wag=.025*math.sin(phase)
        rig.pose.bones['tail_ctrl'].rotation_euler.z=wag
        for side,sign in [('L',1),('R',-1)]:
            rig.pose.bones['ear_mstr_ctrl_'+side].rotation_euler.x+=.035*math.sin(phase*2+sign*.2)*(envelope if count==48 else 1)
            offset('eyelid_up_ctrl_'+side,(0,0,-.029*blink))
        for name in animated:
            for channel in ['location','rotation_euler','scale']:key(rig.pose.bones[name],channel,frame)
    scene.frame_start=1;scene.frame_end=count
    rig.animation_data.action.name=args.variant+'-'+action
    rig.animation_data.action.use_fake_user=True
    return count

actions=['idle','look-left','look-right','pet','happy','rest'] if args.action=='all' else [args.action]
for action in actions:
    count=animate(action)
    if args.pilot:
        scene.frame_set(args.pilot_frame)
        scene.render.filepath=str(folder/(args.variant+'-'+action+'-pilot.png'))
        bpy.ops.render.render(write_still=True)
        if action=='idle':
            scene.render.filepath=str(folder/(args.variant+'-pilot.png'))
            bpy.data.images['Render Result'].save_render(scene.render.filepath,scene=scene)
        break
    frames=folder/(args.variant+'-'+action);frames.mkdir(exist_ok=True)
    for frame in range(1,count+1):
        target=frames/('%04d.png'%frame)
        if target.exists():continue
        scene.frame_set(frame)
        scene.render.filepath=str(target)
        bpy.ops.render.render(write_still=True)
    print('PET_ACTION_READY',args.variant,action,flush=True)
save_scene('pets-'+args.variant)
