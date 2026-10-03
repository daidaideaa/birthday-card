"""Author the character-review candidates from the licensed Snow/Rain source rigs.

Blender 4.5: --background --python scripts/models/build_character_review.py
The production rig stays in the .blend. Evaluated review poses are exported as
separate GLBs; these are inspection poses, never runtime choreography clips.
"""
import bpy
import bmesh
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix, Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts' / 'cinema'))
from common import append_character, material, assign, mesh, control_position, pose_rotation

BUILD = ROOT / '.asset-build' / 'character-review'
OUT = BUILD / 'public' / 'review-assets' / 'characters-v1'
BUILD.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)

def pbr(name, color, roughness=.55):
    return material(name, color, roughness)

def sculpt_with_correctives(obj, transform):
    """Keep the source facial corrective shapes aligned with the new rest sculpt."""
    for vertex in obj.data.vertices: vertex.co=transform(vertex.co.copy())
    if obj.data.shape_keys:
        for key in obj.data.shape_keys.key_blocks:
            for vertex in key.data: vertex.co=transform(vertex.co.copy())

def bind(obj, rig, bone):
    obj.parent = rig
    g = obj.vertex_groups.new(name=bone)
    g.add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    mod = obj.modifiers.new('Studio rig binding', 'ARMATURE')
    mod.object = rig
    return obj

def cloth_surface(name, vertices, faces, mat, rig, bone):
    obj = bind(mesh(name, vertices, faces, mat), rig, bone)
    sub = obj.modifiers.new('Tailored surface', 'SUBSURF'); sub.levels = 2
    solid = obj.modifiers.new('Cloth thickness', 'SOLIDIFY'); solid.thickness = .0015
    return obj

def tube(name, rings, mat, rig, bone, segments=64):
    vertices = []
    for z, rx, ry, cy, fold in rings:
        for i in range(segments):
            a = i * math.tau / segments
            r = fold * math.cos(a * 12)
            vertices.append(((rx+r)*math.cos(a), cy+(ry+r)*math.sin(a), z))
    faces = [(j*segments+i, j*segments+(i+1)%segments,
              (j+1)*segments+(i+1)%segments, (j+1)*segments+i)
             for j in range(len(rings)-1) for i in range(segments)]
    return cloth_surface(name, vertices, faces, mat, rig, bone)

def sleeve_from_body(body, rig, mat, name, low, high, offset):
    obj = body.copy(); obj.data = body.data.copy(); obj.name = name
    bpy.context.collection.objects.link(obj)
    obj.animation_data_clear()
    obj.shape_key_clear()
    for mod in list(obj.modifiers):
        if mod.type not in ['ARMATURE']: obj.modifiers.remove(mod)
    bm = bmesh.new(); bm.from_mesh(obj.data)
    remove = [v for v in bm.verts if not (low < abs(v.co.x) < high and v.co.z > 1.2)]
    bmesh.ops.delete(bm, geom=remove, context='VERTS')
    bm.normal_update()
    for v in bm.verts:
        wrinkle = .0018*math.sin(v.co.x*145) * math.exp(-((abs(v.co.x)-.43)/.085)**2)
        v.co += v.normal * (offset+wrinkle)
    bm.to_mesh(obj.data); bm.free(); assign(obj, mat)
    obj.hide_render=False; obj.hide_viewport=False; obj.hide_set(False)
    sub=obj.modifiers.new('Cotton folds', 'SUBSURF'); sub.levels=2
    solid=obj.modifiers.new('Woven cotton', 'SOLIDIFY'); solid.thickness=.0018
    return obj

def tailored_shirt(body, rig, mat):
    source=bpy.data.objects['GEO-snow-shirt']
    obj=source.copy();obj.data=source.data.copy();obj.name='Tailored long-sleeve shirt'
    bpy.context.collection.objects.link(obj);obj.animation_data_clear()
    obj.shape_key_clear()
    for mod in list(obj.modifiers):
        if mod.type!='ARMATURE':obj.modifiers.remove(mod)
    bm=bmesh.new();bm.from_mesh(obj.data)
    remaining=set(e for e in bm.edges if e.is_boundary);loops=[]
    while remaining:
        stack=[remaining.pop()];edges=set(stack);vs=set()
        while stack:
            edge=stack.pop();vs.update(edge.verts)
            for vertex in edge.verts:
                for other in vertex.link_edges:
                    if other in remaining:remaining.remove(other);edges.add(other);stack.append(other)
        loops.append((list(edges),list(vs),sum((v.co for v in vs),Vector())/len(vs)))
    tree=KDTree(len(body.data.vertices))
    for v in body.data.vertices:tree.insert(v.co,v.index)
    tree.balance();layer=bm.verts.layers.deform.verify()
    mapping={g.index:(obj.vertex_groups.get(g.name) or obj.vertex_groups.new(name=g.name)).index for g in body.vertex_groups}
    for edges,vs,center in loops:
        if abs(center.x)>.20:
            sign=1 if center.x>0 else -1
            previous=vs
            # Continuous topology from the original sleeve to the wrist; transfer
            # the source rig's deform weights to every added fabric vertex.
            for u in [.08,.18,.31,.44,.55,.67,.78,.90,.97,1]:
                ring=[]
                # Start at the original sleeve radius; an immediate 24% flare
                # made the upper arm look like a second tube slipped over it.
                radius=1+.08*math.sin(math.pi*u)-.14*u
                for v in vs:
                    p=Vector((sign*(abs(center.x)+(.655-abs(center.x))*u),
                              center.y+(v.co.y-center.y)*radius,
                              center.z+(1.332-center.z)*u+(v.co.z-center.z)*radius))
                    p.x+=(v.co.x-center.x)*(1-u)
                    p.y+=.002*math.sin(u*math.pi*8)*math.sin(u*math.pi)
                    new=bm.verts.new(p);ring.append(new)
                    weights={};samples=tree.find_n(p,4);total=sum(1/(distance+.005)**2 for _,_,distance in samples)
                    for _,index,distance in samples:
                        factor=1/(distance+.005)**2/total
                        for g in body.data.vertices[index].groups:weights[mapping[g.group]]=weights.get(mapping[g.group],0)+g.weight*factor
                    for g,w in weights.items():new[layer][g]=w
                lookup={v:i for i,v in enumerate(vs)}
                for edge in edges:
                    a,b=(lookup[v] for v in edge.verts)
                    bm.faces.new((previous[a],previous[b],ring[b],ring[a]))
                previous=ring
        elif center.z>1.3:
            for v in vs:
                v.co.x*=.48;v.co.y=(v.co.y+.004)*.73-.012
                v.co.z=1.438+.013*((v.co.y+.095)/.145)
    bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
    bm.to_mesh(obj.data);bm.free();assign(obj,mat)
    obj.hide_render=False;obj.hide_viewport=False;obj.hide_set(False)
    sub=obj.modifiers.new('Cotton smoothing','SUBSURF');sub.levels=2
    solid=obj.modifiers.new('Cotton thickness','SOLIDIFY');solid.thickness=.002
    return obj

def folded_collar(sign,mat,rig):
    # Supported edges retain a pointed collar rather than subdividing a single
    # polygon into the two rounded discs of the first inspection candidate.
    outer=[(sign*.008,-.082,1.446),(sign*.063,-.052,1.449),
           (sign*.091,-.073,1.406),(sign*.053,-.125,1.354),(sign*.025,-.105,1.406)]
    center=sum((Vector(p) for p in outer),Vector())/len(outer)
    inner=[tuple(center+(Vector(p)-center)*.91) for p in outer]
    verts=outer+inner
    faces=[(i,(i+1)%5,(i+1)%5+5,i+5) for i in range(5)]+[(5,6,7,8,9)]
    obj=cloth_surface('Pointed collar '+str(sign),verts,faces,mat,rig,'DEF-Chest')
    obj.modifiers['Tailored surface'].levels=0
    return obj

def prepare(name):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rig, objects = append_character(name)
    female = name == 'rain'
    mats = {
        'skin': pbr('Warm porcelain skin', (.63,.365,.245), .51),
        'lip': pbr('Natural rose lips', (.56,.275,.205), .61),
        'hair': pbr('Chestnut brown hair', (.056,.021,.009), .66),
        'shirt': pbr('Ivory cotton', (.89,.875,.82), .7),
        'pants': pbr('Midnight wool', (.018,.024,.034), .76),
        'leather': pbr('Espresso leather', (.021,.011,.008), .29),
        'dress': pbr('Marigold silk', (.91,.56,.045), .46),
        'sclera': pbr('Warm sclera', (.86,.88,.84), .22),
        'iris': pbr('Hazel iris', (.105,.064,.022), .22),
        'pupil': pbr('Pupil', (.002,.001,.0008), .19),
        'teeth': pbr('Ivory teeth', (.83,.79,.69), .36),
        'mouth': pbr('Mouth interior', (.18,.023,.027), .63),
    }
    mats['dress'].node_tree.nodes.get('Principled BSDF').inputs['Sheen Weight'].default_value=.22
    mats['skin'].node_tree.nodes.get('Principled BSDF').inputs['Subsurface Weight'].default_value=.08
    visible=[]
    for obj in objects:
        if obj.type!='MESH' or not obj.name.startswith('GEO'): continue
        n=obj.name.lower()
        if obj.animation_data:
            for d in list(obj.animation_data.drivers):
                if 'hide_' in d.data_path or 'show_' in d.data_path: obj.animation_data.drivers.remove(d)
        skip = any(x in n for x in ['helper','deformer','cornea','eye_dots','body_nomask','jeans','scarf'])
        skip |= n in ['geo-snow-eyes','geo-rain-eyes']
        if skip:
            obj.hide_render=True; continue
        obj.hide_render=False; obj.hide_viewport=False; obj.hide_set(False)
        for mod in obj.modifiers:
            if mod.type=='SUBSURF': mod.levels=1; mod.render_levels=1
            if mod.type=='MASK' and female: mod.show_viewport=False; mod.show_render=False
        if 'eye_anim' in n or 'eyes_viewport' in n:
            for slot in obj.material_slots:
                old=slot.material.name.lower() if slot.material else ''
                slot.material=mats['sclera' if 'white' in old else 'pupil' if 'black' in old or 'pupil' in old else 'iris']
        elif 'head' in n or 'body' in n:
            if not obj.material_slots: assign(obj,mats['skin'])
            for slot in obj.material_slots:
                old=slot.material.name.lower() if slot.material else ''
                slot.material=mats['lip' if 'lip' in old else 'skin']
        elif any(x in n for x in ['hair','eyebrow','eyelash']):
            assign(obj,mats['hair'])
            if 'eyebrow' in n:
                center=sum(v.co.z for v in obj.data.vertices)/len(obj.data.vertices)
                for v in obj.data.vertices:v.co.z=center+(v.co.z-center)*.63
        elif 'shirt' in n: assign(obj,mats['shirt'])
        elif 'pants' in n: assign(obj,mats['pants'])
        elif 'shoes' in n: assign(obj,mats['leather'])
        elif 'top' in n: assign(obj,mats['dress'])
        elif 'teeth' in n: assign(obj,mats['teeth'])
        elif 'gums' in n or 'tongue' in n: assign(obj,mats['mouth'])
        visible.append(obj)
    if female:
        pony=bpy.data.objects['GEO-rain-hair_ponytail']
        pivot=Vector((0,.083,1.582));rotation=Matrix.Rotation(-1.16,3,'X')
        for v in pony.data.vertices:v.co=pivot+rotation@(v.co-pivot)
        pony.vertex_groups.clear();group=pony.vertex_groups.new(name='DEF-Head');group.add(list(range(len(pony.data.vertices))),1,'REPLACE')
        for mod in list(pony.modifiers):
            if mod.type not in ['ARMATURE','SUBSURF']:pony.modifiers.remove(mod)
    else:
        hair=bpy.data.objects['GEO-snow-hair_base']
        # Remodel the high tied rear bun into the short swept silhouette.
        def short_hair(p):
            if p.y>.02 and p.z>1.73:
                f=min(1,(p.z-1.73)/.035)
                p.y=.02+(p.y-.02)*(1-.62*f)
                p.z=1.73+(p.z-1.73)*(1-.35*f)
            return p
        sculpt_with_correctives(hair,short_hair)
        def face_proportions(p):
            x,y,z=p
            if y<-.115:
                mouth=math.exp(-((z-1.535)/.020)**4-(x/.060)**4)
                p.z=1.535+(z-1.535)*(1-.25*mouth)
                p.y+=.005*mouth;p.x*=1-.06*mouth
                nose=math.exp(-((z-1.572)/.022)**4-(x/.045)**4)
                p.x*=1-.10*nose
            if abs(x)>.10 and y>-.08 and z>1.55:
                p.x=math.copysign(.10+(abs(x)-.10)*.77,x)
            return p
        sculpt_with_correctives(bpy.data.objects['GEO-snow-head'],face_proportions)
    if female:
        rig.pose.bones['Properties_Character_Rain']['Scarf']=False
        props=rig.pose.bones['Properties_IKFK']; props['ik_spine']=0
        props['ik_fingers_left']=0; props['ik_fingers_right']=0
        props['ik_stretch_arms']=0
        # Knee-length circular skirt: a shaped waist, panels, turned hem and thickness.
        skirt=tube('Yellow dance dress — panel skirt', [
            (.977,.121,.092,-.012,.001),(.945,.124,.096,-.012,.001),
            (.91,.147,.112,-.013,.002),(.84,.173,.136,-.013,.003),
            (.75,.180,.150,-.009,.007),(.65,.204,.174,-.004,.009),
            (.54,.231,.199,0,.013),(.49,.245,.211,0,.014),
            (.484,.244,.210,0,.014)], mats['dress'],rig,'DEF-Spine1')
        visible.append(skirt)
        skirt.shape_key_add(name='Basis')
        seated=skirt.shape_key_add(name='Seated cloth drape')
        for v in skirt.data.vertices:
            x,y,z=v.co;u=max(0,min(1,(.977-z)/(.977-.484)))
            around=(1-math.sin(math.atan2(y+.012,x)))*.5
            seated.data[v.index].co.y-=.27*around*min(1,u*1.6)
            front_z=.977-.12*u-.17*max(0,(u-.55)/.45)**2
            seated.data[v.index].co.z=z+(front_z-z)*around
        top=bpy.data.objects['GEO-rain-top']
        # Tuck the source tank hem into the dress waist instead of leaving a
        # separate ruffled shirt floating over the skirt.
        top.shape_key_clear()
        for mod in list(top.modifiers):
            if mod.type=='CORRECTIVE_SMOOTH':top.modifiers.remove(mod)
        bm=bmesh.new();bm.from_mesh(top.data)
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if v.co.z<.961],context='VERTS')
        waist_vertices={v for edge in bm.edges if edge.is_boundary for v in edge.verts if v.co.z<1.075}
        for vertex in waist_vertices:
            a=math.atan2(vertex.co.y+.012,vertex.co.x)
            vertex.co=(.120*math.cos(a),-.012+.091*math.sin(a),.972)
        bm.to_mesh(top.data);bm.free()
    else:
        props=rig.pose.bones['Properties']
        for k in props.keys():
            if 'ik_stretch' in k: props[k]=0
        body=bpy.data.objects['GEO-snow-body']
        shirt=bpy.data.objects['GEO-snow-shirt'];visible.remove(shirt);shirt.hide_render=True
        visible.append(tailored_shirt(body,rig,mats['shirt']))
        visible.append(sleeve_from_body(body,rig,mats['shirt'],'Double cuffs',.610,.662,.023))
        # A real folded open collar, not the source T-shirt neckline.
        collar=tube('Shirt collar stand',[(1.417,.073,.066,-.018,0),(1.450,.071,.065,-.018,0)],mats['shirt'],rig,'DEF-Chest')
        bm=bmesh.new();bm.from_mesh(collar.data)
        bmesh.ops.delete(bm,geom=[v for v in bm.verts if abs(v.co.x)<.020 and v.co.y<-.068],context='VERTS')
        bm.to_mesh(collar.data);bm.free()
        visible.append(collar)
        for sign in [-1,1]:
            visible.append(folded_collar(sign,mats['shirt'],rig))
        # Sewn placket and mother-of-pearl buttons follow the chest, not the camera.
        shirt=next(o for o in visible if o.name=='Tailored long-sleeve shirt')
        levels=[1.352,1.30,1.23,1.16,1.09,1.01,.96];vertices=[]
        front=[]
        for z in levels:
            nearest=sorted([v.co for v in shirt.data.vertices if abs(v.co.x)<.042 and v.co.y<0],key=lambda p:abs(p.z-z))[:5]
            y=min(p.y for p in nearest)-.006;front.append(y)
            vertices.extend([(-.009,y,z),(.009,y,z)])
        visible.append(cloth_surface('Shirt placket',vertices,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(len(levels)-1)],mats['shirt'],rig,'DEF-Chest'))
        for z,y in zip(levels[1:-1],front[1:-1]):
            bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=(0,y-.002,z),scale=(.0045,.002,.0045))
            o=bpy.context.object; o.name='Shirt button'; bpy.ops.object.transform_apply(location=True,rotation=False,scale=True)
            assign(o,mats['shirt']); bind(o,rig,'DEF-Chest');visible.append(o)
    return rig,visible

def set_pose(rig, female, pose):
    for b in rig.pose.bones:
        b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
    if female:
        bpy.data.objects['Yellow dance dress — panel skirt'].data.shape_keys.key_blocks['Seated cloth drape'].value=1 if pose=='sitting' else 0
    # Adult head-to-body proportion, applied to the original facial rig so eyelids,
    # teeth, eyebrows and hair stay aligned in every expression.
    rig.pose.bones['FK-Head'].scale=(.86,.90,.86) if female else (.88,.92,.88)
    bpy.context.view_layer.update()
    for side in ['L','R']:
        for prefix,delta in [(('ACT' if female else 'MSTR')+'-Eyelid_Upper.',-.008),
                             (('ACT' if female else 'MSTR')+'-Eyelid_Lower.',.0007)]:
            b=rig.pose.bones.get(prefix+side)
            if b:
                m=b.matrix.copy();m.translation.z+=delta*.68;b.matrix=m
        corner=rig.pose.bones.get('ACT-Lips_Corner.'+side)
        if corner:
            m=corner.matrix.copy();m.translation.z+=.0025;corner.matrix=m
    for side,sign in [('L',1),('R',-1)]:
        hand=('IK-Hand.' if female else 'IK-Wrist.')+side
        z=.84 if female else .94
        pos=(sign*(.245 if female else .30),-.055,z)
        m=Matrix.Rotation(sign*1.28,4,'Y') @ rig.data.bones[hand].matrix_local
        m.translation=Vector(pos);rig.pose.bones[hand].matrix=m
        for finger in ['Index','Middle','Ring','Pinky']:
            for joint in [1,2,3]:
                names=[f'FK-Finger_{finger}{joint}.{side}',f'Finger_{finger}{joint}.{side}',f'FK-{finger}{joint}.{side}']
                for n in names:
                    if n in rig.pose.bones:
                        pose_rotation(rig,n,(.13 if joint==1 else .17,0,0));break
    if pose=='smile':
        for side in ['L','R']:
            bone=rig.pose.bones.get('ACT-Lips_Corner.'+side)
            if bone:
                m=bone.matrix.copy();m.translation.z+=.006;m.translation.x+=(.002 if side=='L' else -.002);bone.matrix=m
    if pose=='turn': pose_rotation(rig,'FK-Head',(.025,.38,-.04))
    if pose=='hands':
        for side,sign in [('L',1),('R',-1)]:
            hand=('IK-Hand.' if female else 'IK-Wrist.')+side
            m=Matrix.Rotation(sign*.35,4,'Y') @ rig.data.bones[hand].matrix_local
            m.translation=Vector((sign*.16,-.27,1.04 if female else 1.14));rig.pose.bones[hand].matrix=m
    if pose=='sitting':
        # Authoring-only sitting inspection. It is not the stand-up animation.
        torso=rig.pose.bones.get('TORSO-Spine') or rig.pose.bones.get('MSTR-Pelvis')
        if torso:
            m=torso.matrix.copy();m.translation.z-=.40 if not female else .33;m.translation.y+=.20;torso.matrix=m
        bpy.context.view_layer.update()
        for side,sign in [('L',1),('R',-1)]:
            # Rain's IK-Foot is only the ankle under its foot-roll hierarchy.
            # MSTR-Foot moves heel and toe pivots together and preserves the sole.
            foot=('MSTR-Foot.' if female else 'IK-Foot.')+side
            p=rig.data.bones[foot].head_local.copy();p.y-=.25;control_position(rig,foot,p)
            hand=('IK-Hand.' if female else 'IK-Wrist.')+side
            p=(sign*(.13 if female else .16),-.14 if female else -.37,.65 if female else .80)
            control_position(rig,hand,p)
        # Solve the authored foot orientation in rig space, including the Rain
        # IK hierarchy's pelvis response. This is baked before browser export.
        for _ in range(3):
            bpy.context.view_layer.update()
            for side in ['L','R']:
                foot=rig.pose.bones['DEF-Foot.'+side]
                correction=rig.data.bones[foot.name].matrix_local.to_3x3() @ foot.matrix.to_3x3().inverted()
                control=rig.pose.bones[('MSTR-Foot.' if female else 'IK-Foot.')+side]
                m=(correction @ control.matrix.to_3x3()).to_4x4();m.translation=control.matrix.translation;control.matrix=m
    bpy.context.view_layer.update()

def evaluated_objects(rig, objects, name, pose):
    deps=bpy.context.evaluated_depsgraph_get()
    collider=None
    waist=None
    if name=='rain':
        bodice=bpy.data.objects['GEO-rain-top']
        bodice_data=bpy.data.meshes.new_from_object(bodice.evaluated_get(deps),depsgraph=deps)
        bottom=min(v.co.z for v in bodice_data.vertices)
        hem=[v.co.copy() for v in bodice_data.vertices if v.co.z<bottom+.018]
        cy=(min(p.y for p in hem)+max(p.y for p in hem))/2
        waist=(bottom+.012,max(abs(p.x) for p in hem)+.002,
               (max(p.y for p in hem)-min(p.y for p in hem))/2+.002,cy)
        bpy.data.meshes.remove(bodice_data)
    if name=='snow' or (name=='rain' and pose=='sitting'):
        body=bpy.data.objects['GEO-'+name+'-body']
        bodydata=bpy.data.meshes.new_from_object(body.evaluated_get(deps),depsgraph=deps)
        collider=BVHTree.FromPolygons([body.matrix_world@v.co for v in bodydata.vertices],
                                     [list(p.vertices) for p in bodydata.polygons])
        bpy.data.meshes.remove(bodydata)
    outobjects=[]
    for obj in objects:
        evaluated=obj.evaluated_get(deps)
        data=bpy.data.meshes.new_from_object(evaluated, preserve_all_data_layers=True,depsgraph=deps)
        if waist and obj.name=='Yellow dance dress — panel skirt':
            # Match the evaluated bodice hem, including the Studio rig's spine
            # scale. Rest-space radii alone leave a floating waistband.
            top=max(v.co.z for v in data.vertices)
            ring=[v.co.copy() for v in data.vertices if v.co.z>top-.008]
            rx=max(abs(p.x) for p in ring)
            cy=(min(p.y for p in ring)+max(p.y for p in ring))/2
            ry=(max(p.y for p in ring)-min(p.y for p in ring))/2
            for vertex in data.vertices:
                t=max(0,min(1,(vertex.co.z-(top-.13))/.13));t=t*t*(3-2*t)
                vertex.co.x*=1+(waist[1]/rx-1)*t
                target_y=waist[3]+(vertex.co.y-cy)*waist[2]/ry
                vertex.co.y+=(target_y-vertex.co.y)*t
                vertex.co.z+=(waist[0]-top)*t
        if collider and obj.name in ['Yellow dance dress — panel skirt','Tailored long-sleeve shirt']:
            inverse=obj.matrix_world.inverted()
            # Bake a collision correction for the inspection pose. Full dance
            # cloth still requires authored secondary motion after approval.
            for vertex in data.vertices:
                world=obj.matrix_world@vertex.co
                point,normal,_,distance=collider.find_nearest(world)
                margin=.013 if name=='rain' else .006
                if point is not None and distance<(.10 if name=='rain' else .05):
                    signed=(world-point).dot(normal)
                    if signed<margin:vertex.co=inverse@(world+normal*(margin-signed))
        clean=bpy.data.objects.new(obj.name,data);bpy.context.collection.objects.link(clean)
        clean.matrix_world=obj.matrix_world
        for i,slot in enumerate(obj.material_slots):
            if i < len(data.materials): data.materials[i]=slot.material
        for poly in data.polygons:poly.use_smooth=True
        outobjects.append(clean)
    return outobjects

def export_pose(rig, objects, name, pose):
    outobjects=evaluated_objects(rig,objects,name,pose)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in outobjects:obj.select_set(True)
    filepath=OUT/f'{name}-{pose}.glb'
    bpy.ops.export_scene.gltf(filepath=str(filepath),export_format='GLB',use_selection=True,
        export_animations=False,export_cameras=False,export_lights=False,export_extras=False,
        export_yup=True,export_attributes=False)
    count=sum(len(o.data.vertices) for o in outobjects)
    for obj in outobjects: bpy.data.objects.remove(obj,do_unlink=True)
    print('EXPORTED',filepath, count,filepath.stat().st_size,flush=True)
    return {'file':filepath.name,'vertices':count,'bytes':filepath.stat().st_size}

if __name__=='__main__':
    manifest={'version':'characters-v1','status':'candidate — visual review required','characters':{}}
    names=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['snow','rain']
    for name in names:
        rig,objects=prepare(name)
        set_pose(rig,name=='rain','neutral')
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(BUILD/f'{name}-character-master.blend'),compress=True)
        results=[]
        for pose in ['neutral','smile','turn','hands','sitting']:
            set_pose(rig,name=='rain',pose)
            results.append(export_pose(rig,objects,name,pose))
        manifest['characters'][name]=results
    (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
