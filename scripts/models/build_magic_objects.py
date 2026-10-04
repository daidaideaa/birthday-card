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
bpy.context.preferences.filepaths.save_version = 0


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


def cylinder(name, loc, radius, depth, mat, vertices=96, bevel=.035):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    obj = bpy.context.object
    mod = obj.modifiers.new('Rounded rim', 'BEVEL')
    mod.width = min(bevel, depth/4)
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
    bpy.context.scene.render.engine='CYCLES'
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
leather=material('Oxblood leather',(.12,.036,.022),.03,.49)
leatherInset=material('Leather inset',(.061,.018,.014),.02,.57)
paper=material('Ivory handmade paper',(.41,.29,.155),0,.91)
paperLight=material('Warm paper edges',(.59,.44,.25),0,.89)
ink=material('Old ink',(.15,.075,.025),0,.85)
blue=material('Deep emerald cabochon',(.012,.12,.065),.38,.13)

box('Back_cover',(0,0,-.035),(2.68,3.5,.14),leather)
box('Page_block',(0,0,.18),(2.48,3.30,.34),paper,.018)
box('Rounded_spine',(-1.3,0,.18),(.23,3.47,.48),leather,.1)
for y in [-1.36,-.94,.93,1.35]:
    box('Spine_raised_band',(-1.315,y,.18),(.265,.055,.49),gold,.022)
for y in [-1.20,-.80,.77,1.18]:
    box('Spine_leather_rib',(-1.322,y,.18),(.25,.10,.485),leather,.039)
hinge=empty('CoverHinge',(-1.3,0,.405))
box('Front_cover',(1.3,0,0),(2.7,3.52,.13),leather,.055,hinge)
box('Recessed_cover',(1.3,0,.069),(2.34,3.18,.012),leatherInset,.08,hinge)
# A slightly padded and uneven calfskin panel catches light at the broad creases.
verts=[];faces=[];nx=45;ny=61
for iy in range(ny):
    y=-1.50+iy/(ny-1)*3
    for ix in range(nx):
        x=.20+ix/(nx-1)*2.20
        envelope=math.sin(ix/(nx-1)*math.pi)*math.sin(iy/(ny-1)*math.pi)
        wrinkle=(math.sin(x*31+math.sin(y*12)*2)+math.sin(y*39+x*7)*.45)*.0018
        z=.078+envelope*(.009+wrinkle+math.sin(x*8+y*5)*.0019)
        verts.append((x,y,z))
for iy in range(ny-1):
    for ix in range(nx-1):
        a=iy*nx+ix;faces.append((a,a+1,a+1+nx,a+nx))
mesh=bpy.data.meshes.new('Padded calfskin');mesh.from_pydata(verts,[],faces);mesh.update()
uv=mesh.uv_layers.new(name='Leather grain')
for polygon in mesh.polygons:
    polygon.use_smooth=True
    for loop in polygon.loop_indices:
        vi=mesh.loops[loop].vertex_index;uv.data[loop].uv=((vi%nx)/(nx-1),(vi//nx)/(ny-1))
obj=bpy.data.objects.new('Padded_leather',mesh);bpy.context.collection.objects.link(obj);finish(obj,obj.name,leatherInset,hinge)
# Worn brass corners are sculpted bindings, with inset studs and leaf etching.
for sx in [-1,1]:
    for sy in [-1,1]:
        x=1.3+sx*1.23;y=sy*1.61
        box('Brass_corner_binding',(x-sx*.15,y,.088),(.39,.11,.034),gold,.032,hinge)
        box('Brass_corner_binding',(x,y-sy*.15,.088),(.11,.40,.034),gold,.032,hinge)
        sphere('Corner_rivet',(x,y,.113),(.027,.027,.014),lightgold,hinge)
        star('Corner_fleur',x-sx*.22,y-sy*.22,.102,.078,gold,hinge)
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
# An old foliate crest; the book is a leather-bound fairy tale, not a star HUD.
for radius in [.36,.42]:
    curve('Foliate_crest',[(1.3+radius*.82*math.cos(i*math.tau/120),.55+radius*1.25*math.sin(i*math.tau/120),.098) for i in range(120)],.011,gold,hinge,True)
curve('Crest_stem',[(1.3,.13,.102),(1.3,.91,.102)],.012,lightgold,hinge)
for side in [-1,1]:
    for i in range(5):
        y=.28+i*.125
        pts=[(1.3,y,.10),(1.3+side*.09,y+.035,.10),(1.3+side*(.17 if i<4 else .10),y+.14,.10)]
        curve('Crest_branches',pts,.009,gold,hinge)
        leaf=sphere('Crest_leaf',(pts[-1][0],pts[-1][1],.104),(.038,.075,.011),lightgold,hinge)
        leaf.rotation_euler.z=side*-.6
sphere('Emerald',(1.3,.55,.139),(.075,.108,.037),blue,hinge)
for y in [-.94,.94]:
    box('Leather_book_clasp',(2.57,y,.108),(.31,.20,.055),leather,.025,hinge)
    box('Brass_clasp',(2.67,y,.136),(.14,.23,.04),gold,.018,hinge)
    sphere('Clasp_stud',(2.65,y,.164),(.025,.025,.012),lightgold,hinge)
text('Book_title','THE BOOK\nOF YOU',(1.3,-.43,.09),.185,gold,hinge)
text('Book_subtitle','A STORY ONLY YOU CAN OPEN',(1.3,-.93,.09),.054,gold,hinge)
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
gold=material('Edible gold leaf',(.83,.57,.23),.78,.25)
darkGold=material('Brushed brass',(.38,.22,.065),.76,.31)
frosting=material('Midnight blue buttercream',(.010,.030,.078),0,.65)
piping=material('Blue buttercream piping',(.038,.080,.145),0,.59)
cream=material('Vanilla cream',(.71,.61,.44),0,.62)
chocolate=material('White chocolate',(.86,.76,.58),0,.34)
berry=material('Blueberry velvet',(.032,.037,.079),0,.42)
wax=material('Champagne candle wax',(.82,.66,.38),.09,.34)
ivory=material('Porcelain',(.52,.46,.34),.12,.29)
black=material('Cotton wick',(.012,.007,.005),0,1)
cylinder('Cake_stand_foot',(0,0,-.19),.57,.1,darkGold)
cylinder('Cake_stand_stem',(0,0,-.07),.15,.24,darkGold,48)
cylinder('Porcelain_plate',(0,0,.09),1.38,.09,ivory)
ring('Plate_gold_rim',1.35,.147,.018,gold)
ring('Plate_lower_rim',1.31,.045,.012,darkGold)
for radius in [1.21,1.25,1.28]: ring('Plate_engraving',radius,.14,.0025,gold)


def iced_tier(name, radius, bottom, height, mat):
    verts=[];faces=[];radial=128;levels=32
    for j in range(levels+1):
        z=bottom+j/levels*height
        for i in range(radial):
            a=i/radial*math.tau
            r=radius+.0008*math.sin(a*13+j*.21)+.00035*math.sin(a*29-j*.41)
            if j in [0,levels]:r-=.029
            elif j in [1,levels-1]:r-=.008
            verts.append((r*math.cos(a),r*math.sin(a),z))
    for j in range(levels):
        for i in range(radial):
            n=(i+1)%radial;a=j*radial+i;b=j*radial+n;faces.append((a,b,b+radial,a+radial))
    faces.extend([tuple(reversed(range(radial))),tuple(levels*radial+i for i in range(radial))])
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    uv=mesh.uv_layers.new(name='Buttercream grain')
    for polygon in mesh.polygons:
        seam=any(mesh.loops[loop].vertex_index%radial==radial-1 for loop in polygon.loop_indices)
        for loop in polygon.loop_indices:
            vi=mesh.loops[loop].vertex_index
            if len(polygon.vertices)==4:
                u=(vi%radial)/radial
                if seam and u==0:u=1
                uv.data[loop].uv=(u*3,(vi//radial)/levels)
            else:uv.data[loop].uv=((verts[vi][0]/radius+1)/2,(verts[vi][1]/radius+1)/2)
    obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj);finish(obj,name,mat)
    for p in mesh.polygons:p.use_smooth=len(p.vertices)==4


def rosette(x,y,z,radius,mat,angle=0):
    coords=[];polys=[];segments=24;levels=10
    for k in range(levels):
        h=k/(levels-1); r=radius*(1-h)**.68
        for q in range(segments):
            a=q/segments*math.tau+h*1.9+angle
            rr=r*(1+.20*math.cos(q/segments*math.tau*8))
            coords.append((x+math.cos(a)*rr+h*h*radius*.24,y+math.sin(a)*rr,z+h*radius*1.25))
    for k in range(levels-1):
        for q in range(segments):polys.append((k*segments+q,k*segments+(q+1)%segments,(k+1)*segments+(q+1)%segments,(k+1)*segments+q))
    data=bpy.data.meshes.new('Hand piped cream');data.from_pydata(coords,[],polys);data.update()
    uv=data.uv_layers.new(name='Cream grain')
    for polygon in data.polygons:
        for loop in polygon.loop_indices:
            vi=data.loops[loop].vertex_index
            uv.data[loop].uv=((vi%segments)/segments,(vi//segments)/(levels-1))
    obj=bpy.data.objects.new('Piped_cream_rosette',data);bpy.context.collection.objects.link(obj);finish(obj,obj.name,mat)
    for p in data.polygons:p.use_smooth=True


iced_tier('Lower_tier',1.0,.16,.71,frosting)
iced_tier('Upper_tier',.72,.865,.55,frosting)
# The lower scallops and upper vanilla rosettes have visibly soft piped ridges.
for tier,radius,z,count,sz in [(0,1.00,.175,52,.043),(1,.975,.854,38,.042),(2,.699,1.414,24,.052)]:
    for i in range(count):
        a=i/count*math.tau
        rosette(radius*math.cos(a),radius*math.sin(a),z,sz,cream if tier==2 else piping,a)
ring('Lower_gold_ribbon',1.004,.255,.008,gold)
ring('Upper_gold_ribbon',.724,.918,.008,gold)
# A deliberately irregular fine gold edge and flecks are edible leaf, not beads.
for tier,rr,z0,z1 in [(0,1.006,.32,.79),(1,.727,.97,1.36)]:
    for i in range(70 if tier==0 else 45):
        a=random.random()*math.tau;z=random.uniform(z0,z1);r=random.uniform(.006,.022)
        s=star('Gold_leaf_flake',0,0,0,r,gold,points=3 if i%3 else 4)
        s.rotation_euler=(math.pi/2,0,a+math.pi/2)
        s.location=(rr*math.cos(a),rr*math.sin(a),z)
    for start in [-2.8,-.8,1.2]:
        points=[]
        for i in range(5):
            a=start+i*.17;z=(z0+z1)/2+math.sin(i*1.45)*.12
            points.append((rr*math.cos(a),rr*math.sin(a),z))
            sphere('Sugar_constellation_pearl',points[-1],(.012,.012,.012),gold)
        curve('Sugar_constellation_thread',points,.0038,gold)
# Ganache gathers into little natural drips below the upper rim.
for i in range(18):
    a=i/18*math.tau
    length=.035+random.random()*.055
    curve('Golden_ganache_drip',[(.719*math.cos(a),.719*math.sin(a),1.41),(.724*math.cos(a),.724*math.sin(a),1.385-length*.45),(.724*math.cos(a),.724*math.sin(a),1.385-length)],.008,gold)
# Crescent cut from two arcs of the same intersection, with a substantial chocolate edge.
coords=[];moonFaces=[];count=57
outerRadius=.29;innerRadius=.258;offset=.18
intersectionX=(outerRadius**2-innerRadius**2+offset**2)/(2*offset)
outerAngle=math.acos(intersectionX/outerRadius)
innerAngle=math.acos((intersectionX-offset)/innerRadius)
for i in range(count):
    t=outerAngle+i/(count-1)*(math.tau-2*outerAngle)
    coords.append((outerRadius*math.cos(t),0,outerRadius*math.sin(t)))
for i in range(count):
    t=innerAngle+i/(count-1)*(math.tau-2*innerAngle)
    coords.append((offset+innerRadius*math.cos(t),0,innerRadius*math.sin(t)))
for i in range(count-1):moonFaces.append((i,i+1,count+i+1,count+i))
data=bpy.data.meshes.new('Crescent chocolate');data.from_pydata(coords,[],moonFaces);data.update()
moon=bpy.data.objects.new('Golden_crescent',data);bpy.context.collection.objects.link(moon);finish(moon,moon.name,gold)
moon.location=(-.30,.13,1.93)
solid=moon.modifiers.new('Chocolate topper thickness','SOLIDIFY');solid.thickness=.038
bpy.context.view_layer.objects.active=moon;bpy.ops.object.modifier_apply(modifier=solid.name)
curve('Moon_stem',[(-.30,.13,1.40),(-.30,.13,1.80)],.009,gold)
# Gold stars stand at varying heights behind the candles.
for i,(x,y,z,sz) in enumerate([(.32,.30,1.85,.092),(.07,.31,2.08,.062),(-.57,.26,1.74,.048)]):
    curve('Star_wire',[(x,y,1.39),(x,y,z)],.006,gold)
    obj=star('Standing_sugar_star',0,0,0,sz,gold,points=5)
    obj.rotation_euler.x=math.pi/2;obj.location=(x,y,z)
for i,(x,y,height) in enumerate([(.34,-.25,.48),(-.02,-.10,.62),(.38,.14,.40)]):
    cylinder(f'Candle_{i}',(x,y,1.43+height/2),.026,height,wax,32,.01)
    curve('Candle_gold_spiral',[(x+.027*math.cos(k/28*math.tau),y+.027*math.sin(k/28*math.tau),1.44+k/28*.10) for k in range(int(height/.10*28))],.002,gold)
    cylinder(f'Wick_{i}',(x,y,1.43+height+.016),.005,.035,black,12,.002)
    socket=empty(f'FlameSocket_{i}',(x,y,1.43+height+.035));socket['flame']=True
# Blueberries, fine sugar pearls and a few white-chocolate petals make it patisserie.
for i,(x,y,z) in enumerate([(-.59,-.67,.9),(-.70,-.53,.9),(-.79,-.67,.9),(.66,.59,.90),(.78,.46,.90),(-.30,-.36,1.45),(-.42,-.26,1.45)]):
    b=sphere('Blueberry',(x,y,z),(.063,.063,.057),berry)
    for q in range(5):
        a=q/5*math.tau
        curve('Blueberry_crown',[(x,y,z+.055),(x+math.cos(a)*.016,y+math.sin(a)*.016,z+.057)],.003,piping)
for x,y,z,r in [(-.53,-.59,.87,.10),(.67,.49,.875,.08),(-.36,-.31,1.414,.068)]:
    rosette(x,y,z,r,cream)
for i in range(15):
    a=i*2.39;r=.3+.08*math.sin(i*2.1)
    sphere('Vanilla_sugar_pearl',(r*math.cos(a),r*math.sin(a),1.431),(.012,.012,.012),cream)
export('star-cake')
