"""Bake Snow/Rain source controls to compact deform-only runtime rigs.

The authored foot paths, shared hand target and stop markers are exported with
the clip. Browser playback does not reconstruct sitting or guess foot contacts.
"""
import bpy,sys,math,json
from pathlib import Path
from mathutils import Matrix,Vector
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(Path(__file__).parent))
from build_character_review import prepare,set_pose,evaluated_objects
ARGS=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
POSE_CHECK='--pose-check' in ARGS
OUT=ROOT/('.asset-build/duet-pose-check' if POSE_CHECK else '.asset-build/duet-runtime');OUT.mkdir(parents=True,exist_ok=True)
FPS=24;DURATION=26
# Every walking interval begins and ends with all feet on the terrace.
STEPS=[(5.6,6.65),(6.65,7.7),(7.7,8.75),(12,13.3),(13.3,14.6),
       (14.6,15.9),(16.4,17.7),(17.7,19),(19.5,20.8),(20.8,22.1)]
STOPS=[0,3.2,5.6,6.65,7.7,8.75,10.2,12,13.3,14.6,15.9,16.4,17.7,19,19.5,20.8,22.1,24,26]

def ease(v):
    v=max(0,min(1,v));return v*v*(3-2*v)
def track(keys,t):
    for (a,pa),(b,pb) in zip(keys,keys[1:]):
        if t<=b:
            u=ease((t-a)/(b-a));return Vector(pa).lerp(Vector(pb),u)
    return Vector(keys[-1][1])
def root_pose(name,t):
    female=name=='rain'
    # x, y, heading in Blender's ground plane. A modest quarter turn, not a spin.
    keys=([(0,(.66,0,-.08)),(8.75,(.66,0,-.08)),(12,(.64,-.03,-.12)),
           (13.3,(.86,-.03,-.12)),(14.6,(.65,-.03,-.12)),(15.9,(.78,-.03,-.12)),
           (16.4,(.78,-.03,-.12)),(17.7,(.77,.05,-.58)),(19,(.64,.09,-.12)),
           (19.5,(.64,.09,-.12)),(20.8,(.82,.01,-.12)),(22.1,(.66,0,-.08)),(26,(.66,0,-.08))]
          if female else
          [(0,(-.80,.05,-.60)),(3.2,(-.80,.05,-.60)),(5.6,(-.80,.05,0)),
           (6.65,(-.57,.04,0)),(7.7,(-.36,.02,0)),(8.75,(-.15,0,.08)),
           (12,(-.15,-.03,.12)),(13.3,(.07,-.03,.12)),(14.6,(-.14,-.03,.12)),
           (15.9,(-.01,-.03,.12)),(16.4,(-.01,-.03,.12)),
           (17.7,(-.02,-.11,.58)),(19,(-.15,-.13,.12)),(19.5,(-.15,-.13,.12)),
           (20.8,(.03,-.04,.12)),(22.1,(-.15,0,.08)),(26,(-.15,0,.08))])
    p=track(keys,t);return Matrix.Translation((p.x,p.y,0))@Matrix.Rotation(p.z,4,'Z')

def footprint(name,side,at):
    female=name=='rain';sign=1 if side=='L' else -1
    return root_pose(name,at)@Vector((sign*(.078 if female else .09),-.055,0))

def foot_path(name,side,t):
    # A swing updates one foot only; the support foot's world position is fixed.
    pos=footprint(name,side,0);heading=-.08 if name=='rain' else -.60
    for i,(a,b) in enumerate(STEPS):
        if name=='rain' and a<12:continue
        if t<a:break
        swing='L' if i%2==0 else 'R'
        # Close the trailing foot during the last quarter: both feet really land
        # at each authored stop rather than sliding along the root translation.
        begin=a if side==swing else a+(b-a)*.70
        end=a+(b-a)*.67 if side==swing else b
        dest=footprint(name,side,b)
        dest_heading=root_pose(name,b).to_euler().z
        if t>=end:pos=dest;heading=dest_heading;continue
        if t<begin:break
        u=(t-begin)/(end-begin);p=pos.lerp(dest,ease(u));p.z=.048*math.sin(math.pi*u)**2
        return p,heading+(dest_heading-heading)*ease(u)
    return pos,heading

def author_pose(rig,name,t,base):
    female=name=='rain';set_pose(rig,female,'neutral')
    world=root_pose(name,t);rig.matrix_world=world
    stand=ease((t-3.2)/2.4) if not female else 1
    torso=rig.pose.bones.get('TORSO-Spine') or rig.pose.bones.get('MSTR-Pelvis')
    m=torso.matrix.copy();m.translation.z-=.40*(1-stand);m.translation.y+=.20*(1-stand)
    # Weight transfers dip slightly as a foot is lifted, vanishing at contacts.
    for a,b in STEPS:
        if a<t<b and (not female or a>=12):m.translation.z-=.009*math.sin(math.pi*(t-a)/(b-a))**2
    torso.matrix=m;bpy.context.view_layer.update()
    for side in ['L','R']:
        control=('MSTR-Foot.' if female else 'IK-Foot.')+side
        p,heading=foot_path(name,side,t)
        if not female and t<5.6:
            p=world@Vector((.09 if side=='L' else -.09,-.055-.20*(1-stand),0))
            heading=world.to_euler().z
        local=world.inverted()@p
        rest=base[control].copy();rest.translation+=local-Vector((.078 if female else .09, -.055,0)) if side=='L' else local-Vector((-.078 if female else -.09,-.055,0))
        rig.pose.bones[control].matrix=rest
        # Foot orientation is relative to its previous planted heading, not the body.
        rotation=Matrix.Rotation(heading-world.to_euler().z,3,'Z')
        m=rig.pose.bones[control].matrix.copy();r=(rotation@base[control].to_3x3()).to_4x4();r.translation=m.translation;rig.pose.bones[control].matrix=r
    bpy.context.view_layer.update()
    # Solve foot-roll hierarchy before baking, keeping the sole on the ground.
    for _ in range(2):
        for side in ['L','R']:
            _,heading=foot_path(name,side,t)
            if not female and t<5.6:heading=world.to_euler().z
            desired=Matrix.Rotation(heading-world.to_euler().z,3,'Z')@rig.data.bones['DEF-Foot.'+side].matrix_local.to_3x3()
            delta=desired@rig.pose.bones['DEF-Foot.'+side].matrix.to_3x3().inverted()
            control=rig.pose.bones[('MSTR-Foot.' if female else 'IK-Foot.')+side]
            m=(delta@control.matrix.to_3x3()).to_4x4();m.translation=control.matrix.translation;control.matrix=m
        bpy.context.view_layer.update()
    # Both actors solve toward exactly the same world-space palm contact.
    join=ease((t-8.75)/1.45)
    center=(root_pose('snow',t).translation+root_pose('rain',t).translation)/2
    center+=Vector((0,-.23,1.12-.12*ease((t-22.1)/3.9)))
    for side,sign in [('L',1),('R',-1)]:
        control=('IK-Hand.' if female else 'IK-Wrist.')+side
        rest=base[control].copy()
        free=Vector((sign*(.25 if female else .30),-.04,.86 if female else .95))
        if not female:free=Vector((sign*.13,-.28,.80)).lerp(free,stand)
        inner=side==('R' if female else 'L')
        if inner:
            invitation=ease((t-7.7)/1.05)
            # The wrist is behind the palm, so meeting wrists makes the fingers
            # cross. Offset each wrist by its palm length to meet the palms.
            local=world.inverted()@(center+Vector((.079 if female else -.089,0,.005 if female else -.005)))
            free=free.lerp(local,join if female else max(join,invitation))
        rotation=Matrix.Rotation(sign*1.28,3,'Y').to_quaternion()
        if not female:
            piano=Matrix.Rotation(-sign*math.pi/2,3,'Z').to_quaternion()
            rotation=piano.slerp(rotation,stand)
        if inner:
            # Male palm up, female palm down. Orient toward the shared contact
            # in world space, then blend continuously during the invitation.
            grip=(world.to_3x3().inverted()@Matrix.Rotation(0 if female else math.pi,3,'X')).to_quaternion()
            rotation=rotation.slerp(grip,join if female else ease((t-7.7)/2.5))
        m=rotation.to_matrix().to_4x4()@rig.data.bones[control].matrix_local;m.translation=free
        rig.pose.bones[control].matrix=m
        for finger in ['Index','Middle','Ring','Pinky']:
            for joint in [1,2,3]:
                bone=rig.pose.bones.get(f'FK-{finger}{joint}.{side}' if female else f'FK-Finger_{finger}{joint}.{side}')
                if bone:
                    bone.rotation_euler.x=.12+(.36*join if inner else 0)+(0.18 if joint>1 else 0)
    # Facial rig remains in the actor: tiny gaze changes and independent blinks.
    head=rig.pose.bones['FK-Head'];head.rotation_euler=(.025*math.sin(t*.7),(.12 if female else -.10)*join,.015*math.sin(t*.4))
    blink=max([max(0,1-abs(t-c)/.12) for c in [1.7,4.8,8.4,12.2,16.9,21.1,24.4]])
    for side in ['L','R']:
        lid=rig.pose.bones.get(('ACT' if female else 'MSTR')+'-Eyelid_Upper.'+side)
        if lid:
            m=lid.matrix.copy();m.translation.z-=.018*blink;lid.matrix=m
        lip=rig.pose.bones.get('ACT-Lips_Corner.'+side)
        if lip:
            m=lip.matrix.copy();m.translation.z+=.003*join;lip.matrix=m
    bpy.context.view_layer.update()

def build(name):
    female=name=='rain';source,objects=prepare(name)
    # Half the tessellation of the inspection shirt still preserves its silhouette.
    for o in objects:
        for mod in o.modifiers:
            if mod.type=='SUBSURF' and o.name.startswith(('Tailored','Yellow dance')):mod.levels=1
    set_pose(source,female,'neutral');bpy.context.view_layer.update()
    base={b.name:b.matrix.copy() for b in source.pose.bones}
    clean=evaluated_objects(source,objects,name,'neutral')
    used=set()
    for original,copy in zip(objects,clean):
        # Evaluated subdivision preserves the deformation weights in the mesh.
        # Surface-deformed teeth/gums have mask groups, not armature weights.
        # Their evaluated geometry is rigid at this closed-mouth performance;
        # bind it to the head instead of exporting a stationary floating mouth.
        if any(m.type=='SURFACE_DEFORM' for m in original.modifiers):
            copy.vertex_groups.clear()
            group=copy.vertex_groups.new(name='DEF-Head')
            group.add(list(range(len(copy.data.vertices))),1,'REPLACE')
        used.update(copy.vertex_groups[g.group].name for v in copy.data.vertices for g in v.groups if g.weight>.00001 and copy.vertex_groups[g.group].name in source.pose.bones)
    arm=bpy.data.armatures.new(name+' runtime skeleton');rig=bpy.data.objects.new(name+' runtime',arm);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    # Flat deform hierarchy avoids exporting thousands of control/helper bones.
    for bone_name in sorted(used):
        bone=arm.edit_bones.new(bone_name);bone.matrix=base[bone_name];bone.length=max(.015,source.data.bones[bone_name].length)
    bpy.ops.object.mode_set(mode='OBJECT')
    inv={n:base[n].inverted() for n in used}
    for obj in clean:
        obj.parent=rig
        modifier=obj.modifiers.new('Runtime skin','ARMATURE');modifier.object=rig
    scene=bpy.context.scene;scene.render.fps=FPS;scene.frame_start=1;scene.frame_end=1+DURATION*FPS
    rig.animation_data_create();action=bpy.data.actions.new(name+'-performance');rig.animation_data.action=action
    contacts=[]
    for frame in ([1,270,625] if POSE_CHECK else range(1,scene.frame_end+1)):
        t=(frame-1)/FPS;scene.frame_set(frame);author_pose(source,name,t,base)
        for n in used:
            target=rig.pose.bones[n];target.rotation_mode='QUATERNION'
            target.matrix=source.matrix_world@source.pose.bones[n].matrix@inv[n]@arm.bones[n].matrix_local
            for path in ['location','rotation_quaternion','scale']:target.keyframe_insert(data_path=path,frame=frame,group=n)
        contacts.append({'time':t,'feet':{s:list(foot_path(name,s,t)[0]) for s in ['L','R']}})
        if frame%120==1:print('BAKE',name,frame,flush=True)
    scene.frame_set(1)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
    for obj in clean:obj.select_set(True)
    bpy.context.view_layer.objects.active=rig
    bpy.ops.export_scene.gltf(filepath=str(OUT/(name+'-performance.glb')),export_format='GLB',use_selection=True,
        export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_frame_range=True,export_force_sampling=True,
        export_skins=True,export_cameras=False,export_lights=False,export_extras=False,export_yup=True)
    for obj in objects:obj.hide_render=True;obj.hide_set(True)
    source.hide_render=True;source.hide_set(True)
    bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'-performance.blend')),compress=True)
    (OUT/(name+'-contacts.json')).write_text(json.dumps(contacts),encoding='utf-8')
    return {'actor':name,'bones':len(used),'duration':DURATION,'file':name+'-performance.glb'}

if __name__=='__main__':
    result=[build(n) for n in ([n for n in ARGS if not n.startswith('--')] or ['snow','rain'])]
    (OUT/'timeline.json').write_text(json.dumps({'version':'duet-performance-v1','status':'pose-check' if POSE_CHECK else 'animation-candidate','duration':DURATION,'fps':FPS,'stops':STOPS,
        'beats':[{'at':0,'id':'piano'},{'at':3.2,'id':'stand'},{'at':5.6,'id':'approach'},{'at':8.75,'id':'invite'},{'at':10.2,'id':'hold'},{'at':12,'id':'side-step'},{'at':16.4,'id':'turn'},{'at':22.1,'id':'settle'}],
        'actors':result},indent=2),encoding='utf-8')
