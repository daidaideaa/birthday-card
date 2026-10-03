"""Original book and patisserie meshes. Run with Blender --background --python.

The GLBs contain separate cover/page hinges and candle sockets for live animation.
No raster render is used as the interactive object. Editable masters stay local.
"""
from pathlib import Path
import math
import random
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/memory-book'
MASTERS = ROOT / '.asset-build/memory-book/masters'
OUT.mkdir(parents=True, exist_ok=True)
MASTERS.mkdir(parents=True, exist_ok=True)
random.seed(24)


def reset():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)


def material(name, color, metallic=0, roughness=.4):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


def finish(obj, name, mat, parent=None):
    obj.name = name
    if mat:
        obj.data.materials.append(mat)
    if parent:
        obj.parent = parent
    return obj


def box(name, loc, size, mat, bevel=.04, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new('Soft hand finished edges', 'BEVEL')
        modifier.width = bevel
        modifier.segments = 3
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return finish(obj, name, mat, parent)


def sphere(name, loc, scale, mat, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, radius=1, location=loc)
    obj = bpy.context.object
    obj.scale = scale
    for p in obj.data.polygons:
        p.use_smooth = True
    return finish(obj, name, mat, parent)


def curve(name, points, radius, mat, parent=None, closed=False):
    data = bpy.data.curves.new(name, 'CURVE')
    data.dimensions = '3D'
    data.resolution_u = 2
    data.bevel_depth = radius
    data.bevel_resolution = 2
    spline = data.splines.new('POLY')
    spline.points.add(len(points)-1)
    for point, co in zip(spline.points, points):
        point.co = (*co, 1)
    spline.use_cyclic_u = closed
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    finish(obj, name, mat, parent)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target='MESH')
    obj.select_set(False)
    return obj


def cylinder(name, loc, radius, depth, mat, vertices=96):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    mod = obj.modifiers.new('Rounded rim', 'BEVEL')
    mod.width = min(.035, depth/4)
    mod.segments = 3
    bpy.ops.object.modifier_apply(modifier=mod.name)
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return finish(obj, name, mat)


def ring(name, radius, z, thickness, mat):
    return curve(name, [(radius*math.cos(i*math.tau/160), radius*math.sin(i*math.tau/160), z) for i in range(160)], thickness, mat, closed=True)


def star(name, x, y, z, radius, mat, parent=None, points=4):
    coords=[]
    for i in range(points*2):
        r=radius if i%2==0 else radius*.28
        angle=i*math.pi/points
        coords.append((x+math.sin(angle)*r,y+math.cos(angle)*r,z))
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(coords, [], [tuple(range(len(coords)))])
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj)
    obj=finish(obj,name,mat,parent)
    mod=obj.modifiers.new('Gilded thickness','SOLIDIFY');mod.thickness=.014
    bpy.context.view_layer.objects.active=obj
    bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def text(name, words, loc, size, mat, parent=None):
    data=bpy.data.curves.new(name,'FONT')
    data.body=words;data.size=size;data.align_x='CENTER';data.align_y='CENTER';data.extrude=.002
    font=Path('C:/Windows/Fonts/georgia.ttf')
    if font.exists(): data.font=bpy.data.fonts.load(str(font))
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    obj.location=loc
    return finish(obj,name,mat,parent)


def empty(name, loc=(0,0,0)):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);obj.location=loc
    return obj


def export(name):
    bpy.ops.wm.save_as_mainfile(filepath=str(MASTERS/f'{name}.blend'))
    # Keep the editable master separated; batch static detail in the web model.
    # Parent hinges survive, so cover and every paper leaf remain independent.
    bpy.ops.object.select_all(action='DESELECT')
    for obj in list(bpy.context.scene.objects):
        if obj.type == 'FONT':
            obj.select_set(True)
            bpy.context.view_layer.objects.active=obj
            bpy.ops.object.convert(target='MESH')
            obj.select_set(False)
    batches={}
    for obj in list(bpy.context.scene.objects):
        if obj.type != 'MESH': continue
        key=(obj.parent.name if obj.parent else '', obj.active_material.name if obj.active_material else '')
        batches.setdefault(key,[]).append(obj)
    for objects in batches.values():
        if len(objects)<2: continue
        bpy.ops.object.select_all(action='DESELECT')
        for obj in objects: obj.select_set(True)
        bpy.context.view_layer.objects.active=objects[0]
        bpy.ops.object.join()
    bpy.ops.object.select_all(action='DESELECT')
    bpy.ops.export_scene.gltf(filepath=str(OUT/f'{name}.glb'),export_format='GLB',export_apply=True,export_animations=False,export_extras=True)
    print(f'EXPORTED {name}: {(OUT/f"{name}.glb").stat().st_size} bytes')


reset()
gold=material('Antique gold foil',(.62,.36,.105),.83,.26)
lightgold=material('Champagne gold',(.82,.57,.23),.75,.22)
leather=material('Oxblood leather',(.07,.024,.018),.05,.43)
leatherInset=material('Leather inset',(.038,.014,.009),.04,.48)
paper=material('Ivory handmade paper',(.68,.56,.36),0,.82)
paperLight=material('Warm paper edges',(.88,.77,.56),0,.78)
ink=material('Old ink',(.15,.075,.025),0,.85)
blue=material('Blue sapphire',(.012,.073,.19),.45,.16)

box('Back_cover',(0,0,-.035),(2.68,3.5,.14),leather)
box('Page_block',(0,0,.18),(2.48,3.30,.34),paper,.018)
for i in range(33):
    z=.025+i*.0095
    curve('Hand_cut_page_edge',[(1.248,-1.61,z),(1.257,0,z+.002),(1.247,1.61,z)],.0025,paperLight)
    curve('Page_foreedge',[(-1.19,-1.655,z),(1.23,-1.655,z)],.002,paperLight)
box('Rounded_spine',(-1.3,0,.18),(.23,3.47,.48),leather,.1)
for y in [-1.36,-.94,.93,1.35]:
    box('Spine_raised_band',(-1.315,y,.18),(.265,.055,.49),gold,.022)
hinge=empty('CoverHinge',(-1.3,0,.405))
box('Front_cover',(1.3,0,0),(2.7,3.52,.13),leather,.055,hinge)
box('Recessed_cover',(1.3,0,.069),(2.34,3.18,.012),leatherInset,.08,hinge)
for inset,radius in [(.06,.016),(.15,.008),(.235,.006)]:
    x0=.03+inset;x1=2.57-inset;y0=-1.7+inset;y1=1.7-inset
    curve('Tooled_border',[(x0,y0,.086),(x1,y0,.086),(x1,y1,.086),(x0,y1,.086)],radius,gold,hinge,True)
# Symmetrical, physically raised foliate scrolls in the four cover corners.
for sx in [-1,1]:
    for sy in [-1,1]:
        for stem in range(3):
            cx=1.3+sx*(.81-stem*.16);cy=sy*(1.32-stem*.1)
            pts=[]
            for i in range(65):
                t=i/64*math.pi*2.5;r=.24*(1-i/76)
                pts.append((cx+sx*math.cos(t)*r,cy+sy*math.sin(t)*r,.099))
            curve('Gold_filigree',pts,.007,gold,hinge)
        for i in range(8):
            t=i/7
            x=1.3+sx*(1.02-.48*t);y=sy*(1.43-.50*t)
            leaf=sphere('Embossed_leaf',(x,y,.09),(.025,.064,.008),gold,hinge)
            leaf.rotation_euler.z=-sx*sy*.65
# Astronomical seal, not a flat picture.
for radius in [.38,.43]:
    curve('Astronomical_seal',[(1.3+radius*math.cos(i*math.tau/120),.47+radius*math.sin(i*math.tau/120),.095) for i in range(120)],.008,gold,hinge,True)
for i in range(12):
    a=i*math.tau/12
    star('Seal_star',1.3+.54*math.cos(a),.47+.54*math.sin(a),.092,.022,gold,hinge)
star('North_star',1.3,.47,.11,.27,lightgold,hinge)
sphere('Sapphire',(1.3,.47,.125),(.048,.048,.026),blue,hinge)
text('Book_title','THE BOOK\nOF YOU',(1.3,-.43,.09),.185,gold,hinge)
text('Book_subtitle','A LITTLE MAGIC',(1.3,-.93,.09),.064,gold,hinge)
curve('Bottom_swirl',[(.94+ i*.012,-1.11+.015*math.sin(i*.35),.1) for i in range(61)],.008,gold,hinge)
# Individual flexible page surfaces; the browser bends and turns each leaf.
for pageIndex in range(6):
    pageHinge=empty(f'PageHinge_{pageIndex}',(-1.20,0,.354-pageIndex*.011))
    vertices=[];faces=[]
    for ix in range(25):
        x=ix/24*2.40
        for iy in range(3):vertices.append((x,-1.6+iy*1.6,.005*math.sin(ix/24*math.pi)))
    for ix in range(24):
        for iy in range(2):
            a=ix*3+iy;faces.append((a,a+3,a+4,a+1))
    mesh=bpy.data.meshes.new('Flexible paper');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(f'Paper_{pageIndex}',mesh);bpy.context.collection.objects.link(obj);finish(obj,obj.name,paperLight,pageHinge)
    obj['flexiblePage']=True
    solid=obj.modifiers.new('Paper thickness','SOLIDIFY');solid.thickness=.005
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=solid.name)
    for j in range(10):
        length=1.68 if j%3 else 1.33
        curve('Manuscript_line',[(.3,1.16-j*.16,.012),(.3+length,1.16-j*.16,.012)],.004,ink,pageHinge)
    star('Page_star',1.20,-.88,.014,.14,gold,pageHinge)
export('magic-book')

reset()
gold=material('Edible gold leaf',(.82,.51,.145),.78,.24)
darkGold=material('Brushed brass',(.38,.22,.065),.72,.33)
frosting=material('Midnight blue buttercream',(.017,.036,.092),.04,.48)
piping=material('Blue buttercream piping',(.025,.061,.147),.02,.46)
wax=material('Champagne candle wax',(.70,.46,.18),.24,.36)
ivory=material('Porcelain',(.53,.47,.36),.2,.27)
black=material('Cotton wick',(.012,.007,.005),0,1)
cylinder('Cake_stand_foot',(0,0,-.19),.48,.1,darkGold)
cylinder('Cake_stand_stem',(0,0,-.09),.13,.20,darkGold,48)
cylinder('Porcelain_plate',(0,0,.04),1.30,.09,ivory)
ring('Plate_gold_rim',1.28,.095,.018,gold)
ring('Plate_lower_rim',1.23,.005,.012,darkGold)
# Surface rings vary subtly in radius to give the icing a spatula finish.
verts=[];faces=[];radial=160;levels=30
for j in range(levels+1):
    z=.12+j/levels*1.02
    for i in range(radial):
        a=i/radial*math.tau
        r=1.00+.003*math.sin(j*2.1)+.0015*math.sin(a*25+j*.55)
        if j==0 or j==levels:r-=.022
        verts.append((r*math.cos(a),r*math.sin(a),z))
for j in range(levels):
    for i in range(radial):
        n=(i+1)%radial;a=j*radial+i;b=j*radial+n;faces.append((a,b,b+radial,a+radial))
faces.extend([tuple(reversed(range(radial))),tuple(levels*radial+i for i in range(radial))])
mesh=bpy.data.meshes.new('Spatula icing');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Cake',mesh);bpy.context.collection.objects.link(obj);finish(obj,'Cake',frosting)
for p in obj.data.polygons:p.use_smooth=len(p.vertices)==4
for z in [.20,.27]:ring('Gold_ribbon',1.007,z,.009,gold)
ring('Top_icing_rim',.974,1.143,.025,piping)
# Small piped stars with rippled profiles, each baked as a mesh.
for top in [False,True]:
    count=38 if top else 44
    for i in range(count):
        a=i/count*math.tau;rr=.945 if top else 1.015;zz=1.153 if top else .14
        coords=[];polys=[]
        for level in range(7):
            h=level/6;r=.050*(1-h*.83)
            for q in range(16):
                angle=q/16*math.tau+h*.95
                radius=r*(1 if q%2==0 else .73)
                coords.append((rr*math.cos(a)+math.cos(angle)*radius,rr*math.sin(a)+math.sin(angle)*radius,zz+h*.078))
        for k in range(6):
            for q in range(16):polys.append((k*16+q,k*16+(q+1)%16,(k+1)*16+(q+1)%16,(k+1)*16+q))
        data=bpy.data.meshes.new('Piped rose');data.from_pydata(coords,[],polys);data.update()
        rose=bpy.data.objects.new('Piped_icing',data);bpy.context.collection.objects.link(rose);finish(rose,rose.name,piping)
        for p in data.polygons:p.use_smooth=True
# Gold flecks and edible stars wrapping the true cylindrical side.
for i in range(105):
    a=random.random()*math.tau;z=random.uniform(.33,1.04);r=random.uniform(.009,.035)
    s=star('Gold_leaf',0,0,0,r,gold,points=4 if i%3 else 5)
    s.rotation_euler=(math.pi/2,0,a+math.pi/2)
    s.location=(1.006*math.cos(a),1.006*math.sin(a),z)
for start in [-2.2,-.2,1.9]:
    points=[]
    for i in range(5):
        a=start+i*.17;z=.60+math.sin(i*1.45)*.19
        points.append((1.014*math.cos(a),1.014*math.sin(a),z))
        sphere('Constellation_pearl',points[-1],(.023,.023,.023),gold)
    curve('Constellation_thread',points,.007,gold)
# A real crescent topper cut from a planar polygon and extruded.
coords=[]
for i in range(41):
    t=math.radians(60)+i/40*math.radians(240)
    coords.append((.32*math.cos(t),0,.32*math.sin(t)))
for i in range(41):
    t=math.radians(-115)-i/40*math.radians(130)
    coords.append((.32+.37*math.cos(t),0,.37*math.sin(t)))
data=bpy.data.meshes.new('Crescent gold');data.from_pydata(coords,[],[tuple(range(len(coords)))]);data.update()
moon=bpy.data.objects.new('Golden_crescent',data);bpy.context.collection.objects.link(moon);finish(moon,moon.name,gold)
moon.location=(-.40,.18,1.72)
solid=moon.modifiers.new('Gold topper thickness','SOLIDIFY');solid.thickness=.04
bpy.context.view_layer.objects.active=moon;bpy.ops.object.modifier_apply(modifier=solid.name)
curve('Moon_stem',[(-.40,.18,1.1),(-.40,.18,1.58)],.012,gold)
for i,(x,y,height) in enumerate([(.38,-.30,.61),(.02,.03,.80),(.42,.35,.51)]):
    cylinder(f'Candle_{i}',(x,y,1.15+height/2),.033,height,wax,32)
    for j in range(4):
        z=1.19+j*.12
        curve('Candle_gold_spiral',[(x+.034*math.cos(k/18*math.tau),y+.034*math.sin(k/18*math.tau),z+k/18*.08) for k in range(19)],.003,gold)
    cylinder(f'Wick_{i}',(x,y,1.15+height+.021),.007,.045,black,12)
    socket=empty(f'FlameSocket_{i}',(x,y,1.15+height+.045));socket['flame']=True
for x,y,sz in [(-.4,-.38,.085),(.2,-.65,.06),(.60,.05,.055),(-.58,.55,.048)]:
    star('Top_sugar_star',x,y,1.15,sz,gold,points=5)
export('star-cake')
