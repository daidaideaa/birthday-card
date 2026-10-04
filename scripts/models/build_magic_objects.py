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
    data.body=words;data.size=size;data.align_x='CENTER';data.align_y='CENTER';data.extrude=.0007;data.resolution_u=3
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


# Production textures are embedded in the GLBs. No Blender-only noise nodes.
import sys
import numpy as np
sys.path.insert(0, str(ROOT.parent / '.tools/rotoscope'))
import cv2
TEXTURES=MASTERS/'textures'
TEXTURES.mkdir(exist_ok=True)


def write_image(name, data, quality=92):
    path=TEXTURES/name
    array=np.clip(data*255,0,255).astype(np.uint8)
    if array.ndim==3:array=cv2.cvtColor(array,cv2.COLOR_RGB2BGR)
    cv2.imwrite(str(path),array,[cv2.IMWRITE_JPEG_QUALITY,quality] if path.suffix=='.jpg' else [cv2.IMWRITE_PNG_COMPRESSION,6])
    return path


def normal_from_height(height, strength=5):
    dx=cv2.Sobel(height,cv2.CV_32F,1,0,ksize=3)/8
    dy=cv2.Sobel(height,cv2.CV_32F,0,1,ksize=3)/8
    n=np.dstack((-dx*strength,dy*strength,np.ones_like(height)))
    n/=np.linalg.norm(n,axis=2,keepdims=True)
    return (n+1)/2


def noise(size,scale,seed):
    rng=np.random.default_rng(seed)
    field=rng.random((scale,scale)).astype(np.float32)
    return cv2.resize(field,(size,size),interpolation=cv2.INTER_CUBIC)


def pbr(name,color,normal=None,orm=None,roughness=.75,metallic=0):
    mat=material(name,(1,1,1),metallic,roughness)
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;bsdf=nodes.get('Principled BSDF')
    bsdf.inputs['IOR'].default_value=1.42
    bsdf.inputs['Specular IOR Level'].default_value=.28
    for key,path,space in [('color',color,'sRGB'),('normal',normal,'Non-Color'),('orm',orm,'Non-Color')]:
        if not path:continue
        image=bpy.data.images.load(str(path),check_existing=True);image.colorspace_settings.name=space;image.pack()
        node=nodes.new('ShaderNodeTexImage');node.image=image
        if key=='color':links.new(node.outputs['Color'],bsdf.inputs['Base Color'])
        elif key=='normal':
            n=nodes.new('ShaderNodeNormalMap');n.inputs['Strength'].default_value=.8
            links.new(node.outputs['Color'],n.inputs['Color']);links.new(n.outputs['Normal'],bsdf.inputs['Normal'])
        else:
            separate=nodes.new('ShaderNodeSeparateColor');separate.mode='RGB';links.new(node.outputs['Color'],separate.inputs['Color'])
            links.new(separate.outputs['Green'],bsdf.inputs['Roughness']);links.new(separate.outputs['Blue'],bsdf.inputs['Metallic'])
    return mat


def planar_uv(obj,width,height):
    uv=obj.data.uv_layers.active or obj.data.uv_layers.new(name='UVMap')
    for polygon in obj.data.polygons:
        for loop in polygon.loop_indices:
            co=obj.data.vertices[obj.data.loops[loop].vertex_index].co
            uv.data[loop].uv=(co.x/width+.5,co.y/height+.5)


def maps_from_source():
    image=cv2.cvtColor(cv2.imread(str(MASTERS/'book-wizard-cover-source.png')),cv2.COLOR_BGR2RGB).astype(np.float32)/255
    image=cv2.resize(image,(1152,1536),interpolation=cv2.INTER_AREA)
    red=image[:,:,0];green=image[:,:,1]
    gold=np.clip((green/(red+.01)-.45)/.23,0,1)*np.clip((red-.18)/.36,0,1)
    gold=cv2.GaussianBlur(gold,(0,0),.6)
    gray=cv2.cvtColor(image,cv2.COLOR_RGB2GRAY)
    height=(gray-cv2.GaussianBlur(gray,(0,0),4))*.65+gold*.12
    rough=np.clip(.83-gold*.4+(gray-cv2.GaussianBlur(gray,(0,0),3))*.13,.35,.9)
    coverColor=write_image('cover-albedo.jpg',image,94)
    coverNormal=write_image('cover-normal.jpg',normal_from_height(height,6),94)
    coverORM=write_image('cover-orm.jpg',np.dstack((np.ones_like(gray),rough,gold*.87)),94)
    # Quiet leather for spine and the back, with the same calfskin grain.
    h,w=image.shape[:2];crop=image[int(h*.35):int(h*.68),int(w*.37):int(w*.62)]
    crop=cv2.resize(crop,(512,512),interpolation=cv2.INTER_AREA)
    luma=cv2.cvtColor(crop,cv2.COLOR_RGB2GRAY)
    plainColor=write_image('calfskin-albedo.jpg',crop,92)
    plainNormal=write_image('calfskin-normal.jpg',normal_from_height(luma-cv2.GaussianBlur(luma,(0,0),5),5),92)
    plainORM=write_image('calfskin-orm.jpg',np.dstack((np.ones_like(luma),.74+noise(512,35,33)*.10,np.zeros_like(luma))),88)
    manuscript=cv2.cvtColor(cv2.imread(str(MASTERS/'book-spell-notes-source.png')),cv2.COLOR_BGR2RGB).astype(np.float32)/255
    manuscript=cv2.resize(manuscript,(768,1152),interpolation=cv2.INTER_AREA)
    manuscriptPath=write_image('wizard-manuscript.jpg',manuscript,92)
    # Handmade paper fibres, foxing, and physically parallel edge striations.
    rng=np.random.default_rng(62);s=512
    fib=noise(s,72,65)*.6+noise(s,256,71)*.4
    paperRGB=np.dstack((.80+fib*.10,.71+fib*.10,.52+fib*.13))
    paperColor=write_image('rag-paper.jpg',paperRGB,91)
    paperNormal=write_image('paper-fibres.jpg',normal_from_height(fib*.07,3),89)
    rows=np.arange(s)
    edgeValues=.88+np.sin(rows*.19)*.025+rng.random(s)*.014
    edgeValues-=(rows%17<2)*.12
    edgeValues-=(rows%47==0)*.06
    edges=np.tile(edgeValues[:,None],(1,s))
    edgeRGB=np.dstack((edges*.86,edges*.74,edges*.55))
    edgeColor=write_image('page-edges.jpg',edgeRGB,95)
    return coverColor,coverNormal,coverORM,plainColor,plainNormal,plainORM,manuscriptPath,paperColor,paperNormal,edgeColor


maps=maps_from_source()
reset()
coverMat=pbr('PBR | old wizard calfskin and copper tooling',*maps[:3])
leather=pbr('PBR | worn espresso calfskin',maps[3],maps[4],maps[5])
paper=pbr('PBR | uncoated rag paper',maps[7],maps[8],roughness=.95)
pageEdges=pbr('PBR | deckled page edges',maps[9],maps[8],roughness=.95)
illustration=pbr('PBR | handwritten spellbook paper',maps[6],maps[8],roughness=.96)
storyPages=[]
for index in range(12):
    artwork=TEXTURES/f'story-page-{index:02d}.jpg'
    if not artwork.exists():
        raise FileNotFoundError(f'{artwork}: run scripts/models/build_story_pages.ps1 first')
    pageMat=pbr(f'PBR | story leaf {index//2+1} {"recto" if index%2==0 else "verso"}',artwork,maps[8],roughness=.97)
    pageMat.use_backface_culling=True
    storyPages.append(pageMat)
gold=material('Dark hand chased copper',(.27,.18,.09),.72,.53)
brightGold=material('Worn copper engraved edge',(.43,.29,.14),.74,.46)
patina=material('Patina in copper recesses',(.069,.045,.023),.60,.65)
linen=material('Waxed linen stitching',(.28,.16,.074),0,.94)
edgeInk=material('Shadows between deckled folios',(.22,.15,.073),0,.98)
silk=material('Wine red silk bookmark',(.14,.021,.029),0,.72)

# Genuine thick boards, rounded corners and a softly padded calfskin face.
box('Back_cover',(0,0,-.045),(2.72,3.58,.13),leather,.065)
block=box('Bound_page_block',(0,0,.172),(2.48,3.30,.32),pageEdges,.036)
uv=block.data.uv_layers.active
for polygon in block.data.polygons:
    for loop in polygon.loop_indices:
        co=block.data.vertices[block.data.loops[loop].vertex_index].co
        uv.data[loop].uv=((co.x+co.y+3)/6,(co.z+.16)/.32)
for i,z in enumerate([.04,.079,.107,.151,.194,.225,.267,.309]):
    curve('Uneven_folio_foreedge',[(-1.19,-1.654,z),(0,-1.657,z+.0007*math.sin(i)),(1.18,-1.653,z)],.0016,edgeInk)
    curve('Uneven_folio_side',[(1.244,-1.58,z),(1.247,0,z+.001),(1.244,1.58,z)],.0014,edgeInk)
box('Rounded_spine',(-1.32,0,.172),(.27,3.55,.47),leather,.125)
for y in [-1.31,-.79,0,.79,1.31]:
    box('Raised_binding_cord',(-1.342,y,.172),(.28,.095,.475),leather,.035)
    for off in [-.046,.046]:
        curve('Worn_spine_rule',[(-1.473,y+off,-.015),(-1.481,y+off,.33)],.003,brightGold)
for i in range(35):
    y=-1.55+i*.088
    curve('Hand_stitched_spine',[(-1.178,y,.372),(-1.133,y+.028,.376)],.0033,linen)

hinge=empty('CoverHinge',(-1.325,0,.478))
box('Front_cover_board',(1.325,0,-.006),(2.74,3.60,.125),leather,.065,hinge)
# The cover's inside remains a separate manuscript endpaper, visible at spread zero.
data=bpy.data.meshes.new('Inside cover manuscript')
data.from_pydata([(.125,-1.60,-.072),(2.525,-1.60,-.072),(2.525,1.60,-.072),(.125,1.60,-.072)],[],[(3,2,1,0)])
data.update();uv=data.uv_layers.new(name='UVMap')
for polygon in data.polygons:
    for loop in polygon.loop_indices:
        co=data.vertices[data.loops[loop].vertex_index].co
        uv.data[loop].uv=(1-(co.x-.125)/2.4,(co.y+1.6)/3.2)
obj=bpy.data.objects.new('Inside_cover_manuscript',data);bpy.context.collection.objects.link(obj);finish(obj,obj.name,illustration,hinge)
# One UV-mapped relief surface, with the albedo/roughness/normal/metalness embedded.
verts=[];faces=[];nx=65;ny=87
for iy in range(ny):
    v=iy/(ny-1);y=(v-.5)*3.49
    for ix in range(nx):
        u=ix/(nx-1);x=.027+u*2.596
        pad=(math.sin(u*math.pi)*math.sin(v*math.pi))**.55
        z=.065+pad*.018+pad*math.sin(x*9+y*5)*.0016
        verts.append((x,y,z))
for iy in range(ny-1):
    for ix in range(nx-1):
        a=iy*nx+ix;faces.append((a,a+1,a+nx+1,a+nx))
mesh=bpy.data.meshes.new('Hand tooled cover surface');mesh.from_pydata(verts,[],faces);mesh.update()
uv=mesh.uv_layers.new(name='UVMap')
for polygon in mesh.polygons:
    polygon.use_smooth=True
    for loop in polygon.loop_indices:
        vi=mesh.loops[loop].vertex_index;uv.data[loop].uv=((vi%nx)/(nx-1),(vi//nx)/(ny-1))
obj=bpy.data.objects.new('Calfskin_cover_PBR',mesh);bpy.context.collection.objects.link(obj);finish(obj,obj.name,coverMat,hinge)


# Narrow angular copper corner guards, made like practical protective book fittings.
for sx in [-1,1]:
    for sy in [-1,1]:
        cx=1.325+sx*1.23;cy=sy*1.60
        coords=[(cx-sx*.24,cy+sy*.025,.075),(cx+sx*.025,cy+sy*.025,.075),(cx+sx*.025,cy-sy*.24,.075),(cx-sx*.025,cy-sy*.205,.075),(cx-sx*.033,cy-sy*.033,.075),(cx-sx*.205,cy-sy*.025,.075)]
        data=bpy.data.meshes.new('Corner guard');data.from_pydata(coords,[],[tuple(range(6))]);data.update()
        obj=bpy.data.objects.new('Hammered_copper_corner',data);bpy.context.collection.objects.link(obj);finish(obj,obj.name,gold,hinge)
        mod=obj.modifiers.new('Fitting thickness','SOLIDIFY');mod.thickness=.008
        bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
        sphere('Flush_corner_pin',(cx-sx*.012,cy-sy*.012,.083),(.012,.012,.005),brightGold,hinge)
        curve('Corner_incised_rule',[(cx-sx*.19,cy+.006*sy,.083),(cx+.006*sx,cy+.006*sy,.083),(cx+.006*sx,cy-sy*.19,.083)],.0016,patina,hinge)
# Individually made clasps with an inset, patinated hinge, instead of flat gold blocks.
for y in [-.99,.99]:
    strap=box('Leather_clasp',(2.57,y,.096),(.31,.15,.035),leather,.032,hinge)
    clasp=box('Engraved_clasp',(2.679,y,.112),(.10,.185,.027),gold,.025,hinge)
    sphere('Clasp_rivet',(2.682,y,.130),(.016,.020,.005),brightGold,hinge)
    for dy in [-.055,.055]:curve('Clasp_engraving',[(2.65,y+dy,.128),(2.71,y+dy,.128)],.0016,patina,hinge)

# Small fine typography sits inside the quiet cartouche of the printed cover.
def chinese_text(name,words,loc,size,mat,parent=None):
    obj=text(name,words,loc,size,mat,parent)
    obj.data.font=bpy.data.fonts.load('C:/Windows/Fonts/STKAITI.TTF')
    obj.data.extrude=0;obj.data.bevel_depth=0;obj.data.resolution_u=3
    return obj
box('Old_engraved_nameplate',(1.325,.15,.088),(1.13,.36,.011),patina,.025,hinge)
for dx in [-.505,.505]:
    for dy in [-.12,.12]:sphere('Nameplate_pin',(1.325+dx,.15+dy,.097),(.008,.008,.0035),gold,hinge)
chinese_text('Personal_dedication','师 宝 宝',(1.325,.15,.101),.215,brightGold,hinge)
chinese_text('Personal_subtitle','写给你的一场梦',(1.325,-.21,.101),.078,gold,hinge)
text('Quiet_imprint','MEMORIA',(1.325,-.46,.102),.053,gold,hinge)
# A silk bookmark drapes naturally from the text block.
curve('Silk_bookmark',[(-.72,-1.42,.022),(-.72,-1.68,.02),(-.66,-1.85,-.04),(-.56,-2.00,-.09)],.019,silk)
bpy.ops.mesh.primitive_plane_add(size=1,location=(0,0,.338))
obj=bpy.context.object;obj.dimensions=(2.40,3.20,0)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
finish(obj,'Dedication_rag_paper',paper)
# A small, irregular pressed-wax seal on the dedicated endpaper.
waxSeal=material('Old oxblood sealing wax',(.16,.017,.023),.02,.45)
waxMark=material('Wax seal recessed impression',(.077,.009,.011),.01,.57)
verts=[];faces=[];radial=48
for j,(radius,z) in enumerate([(.0,.359),(.05,.359),(.094,.364),(.119,.356),(.12,.341)]):
    for i in range(radial):
        a=i/radial*math.tau;r=radius*(1+.035*math.sin(a*7)+.018*math.sin(a*13))
        verts.append((.82+r*math.cos(a),-1.20+r*math.sin(a),z-.017))
for j in range(4):
    for i in range(radial):
        a=j*radial+i;b=j*radial+(i+1)%radial;faces.append((a,b,b+radial,a+radial))
data=bpy.data.meshes.new('Hand pressed wax');data.from_pydata(verts,[],faces);data.update()
obj=bpy.data.objects.new('Private_wax_seal',data);bpy.context.collection.objects.link(obj);finish(obj,obj.name,waxSeal)
for p in data.polygons:p.use_smooth=True
curve('Wax_impression_key',[(.82,-1.235,.345),(.82,-1.19,.345),(.842,-1.19,.345)],.004,waxMark)
curve('Wax_impression_bow',[(.82+.020*math.cos(i*math.tau/40),-1.17+.020*math.sin(i*math.tau/40),.345) for i in range(40)],.004,waxMark,closed=True)
# Six independently deformable printed leaves preserve browser interaction.
for pageIndex in range(6):
    ph=empty(f'PageHinge_{pageIndex}',(-1.20,0,.390-pageIndex*.006))
    verts=[];faces=[];nx=33;ny=9
    for ix in range(nx):
        x=ix/(nx-1)*2.4
        for iy in range(ny):
            yy=-1.60+iy/(ny-1)*3.20
            zz=.004+math.sin(ix/(nx-1)*math.pi)*.012+math.sin(iy/(ny-1)*math.pi)*.004
            verts.append((x,yy,zz))
    for ix in range(nx-1):
        for iy in range(ny-1):
            a=ix*ny+iy;faces.append((a,a+ny,a+ny+1,a+1))
    data=bpy.data.meshes.new('Flexible printed rag paper');data.from_pydata(verts,[],faces);data.update()
    uv=data.uv_layers.new(name='UVMap')
    for polygon in data.polygons:
        polygon.use_smooth=True
        for loop in polygon.loop_indices:
            vi=data.loops[loop].vertex_index
            uv.data[loop].uv=((vi//ny)/(nx-1),(vi%ny)/(ny-1))
    obj=bpy.data.objects.new(f'Paper_{pageIndex}',data);bpy.context.collection.objects.link(obj);finish(obj,obj.name,storyPages[pageIndex*2],ph)
    obj.data.materials.append(storyPages[pageIndex*2+1]);obj.data.materials.append(paper)
    obj['flexiblePage']=True
    obj['rectoPage']=pageIndex*2;obj['versoPage']=pageIndex*2+1
    mod=obj.modifiers.new('Paper edge','SOLIDIFY');mod.thickness=.0025
    mod.material_offset=1;mod.material_offset_rim=2
    bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    # A turned physical leaf shows its verso; its notes must not read backwards.
    for polygon in obj.data.polygons:
        if polygon.normal.z<-.25:
            polygon.material_index=1
            for loop in polygon.loop_indices:
                obj.data.uv_layers.active.data[loop].uv.x=1-obj.data.uv_layers.active.data[loop].uv.x
        elif polygon.normal.z>.25:
            polygon.material_index=0
        else:
            polygon.material_index=2
export('magic-book')

# A book-only iteration never rewrites the approved cake or its editable master.
if '--book-only' in sys.argv:
    raise SystemExit(0)

reset()
# Food materials use embedded pores and softly varied roughness, with no metal sheen.
def food_maps(prefix,base,rough=.83,seed=44):
    s=512
    broad=noise(s,12,seed);mid=noise(s,64,seed+1);fine=noise(s,240,seed+2)
    grain=(mid-.5)*.018+(fine-.5)*.022+(broad-.5)*.025
    color=np.array(base,dtype=np.float32)[None,None,:]+grain[:,:,None]
    height=(mid-.5)*.04+(fine-.5)*.075
    albedo=write_image(prefix+'-albedo.jpg',color,92)
    normal=write_image(prefix+'-normal.jpg',normal_from_height(height,4.5),92)
    orm=write_image(prefix+'-orm.jpg',np.dstack((np.ones((s,s)),np.clip(rough+(broad-.5)*.06,0,1),np.zeros((s,s)))),87)
    return pbr('PBR | '+prefix,albedo,normal,orm)

frosting=food_maps('midnight-velvet-buttercream',(.115,.190,.305),.87,41)
piping=food_maps('blue-piped-buttercream',(.205,.292,.413),.86,50)
cream=food_maps('vanilla-chocolate-cream',(.86,.80,.68),.82,61)
berry=food_maps('natural-blueberry-bloom',(.30,.32,.40),.79,80)
berryDark=food_maps('natural-blueberry-skin',(.18,.205,.29),.64,90)
# Real edible gold has small crumples, a subdued warm tone, and occasional highlights.
s=256;foil=noise(s,29,12)*.6+noise(s,95,15)*.4
foilC=write_image('gold-leaf-albedo.jpg',np.dstack((.70+foil*.12,.56+foil*.12,.27+foil*.09)),90)
foilN=write_image('gold-leaf-normal.jpg',normal_from_height(foil*.10,3),91)
foilORM=write_image('gold-leaf-orm.jpg',np.dstack((np.ones((s,s)),.43+foil*.10,np.full((s,s),.83))),89)
gold=pbr('PBR | edible crumpled gold leaf',foilC,foilN,foilORM)
brass=material('Antique brushed cake stand',(.22,.135,.056),.68,.54)
ivory=material('Warm glazed porcelain',(.35,.30,.23),0,.46)
wax=material('Beeswax candles',(.57,.43,.24),0,.73)
wick=material('Charred linen wick',(.008,.006,.004),0,.98)
# Low footed porcelain, rolled rim and subtle engraved gold edge.
cylinder('Stand_foot',(0,0,-.16),.46,.075,brass,64,.025)
cylinder('Stand_stem',(0,0,-.065),.105,.18,brass,48,.016)
plate=cylinder('Porcelain_salver',(0,0,.055),1.285,.075,ivory,128,.025)
ring('Porcelain_rolled_lip',1.254,.108,.018,ivory)
ring('Handpainted_gold_rim',1.267,.113,.006,gold)
ring('Fine_gold_rule',1.204,.101,.0025,gold)
for i in range(64):
    a=i/64*math.tau
    sphere('Pressed_porcelain_rim',(1.226*math.cos(a),1.226*math.sin(a),.098),(.013,.013,.004),ivory)


def iced_tier(name,R,bottom,H,mat,seed):
    # Broad, gently imperfect spatula shapes and rounded shoulders, no perfect cylinder.
    radial=144;levels=38;verts=[];faces=[]
    for j in range(levels+1):
        t=j/levels;z=bottom+t*H
        shoulder=.036*(math.exp(-t*24)+math.exp(-(1-t)*26))
        for i in range(radial):
            a=i/radial*math.tau
            uneven=.0058*math.sin(a*5+seed)+.0035*math.sin(a*9+t*3.4)+.002*math.sin(a*21-t*7)
            r=R-shoulder+.012*math.sin(t*math.pi)+uneven
            zz=z+(math.sin(a*4+seed)*.004+math.sin(a*11)*.0015)*math.sin(t*math.pi/2)
            verts.append((r*math.cos(a),r*math.sin(a),zz))
    for j in range(levels):
        for i in range(radial):
            a=j*radial+i;b=j*radial+(i+1)%radial;faces.append((a,b,b+radial,a+radial))
    # Domed top, gently tapering through three concentric rings.
    previous=levels*radial
    for ringIndex,radius in enumerate([R*.72,R*.38,.002]):
        start=len(verts)
        for i in range(radial):
            a=i/radial*math.tau;verts.append((radius*math.cos(a),radius*math.sin(a),bottom+H+.005+ringIndex*.002))
        for i in range(radial):faces.append((previous+i,previous+(i+1)%radial,start+(i+1)%radial,start+i))
        previous=start
    faces.append(tuple(reversed(range(radial))))
    data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update()
    uv=data.uv_layers.new(name='Buttercream UV')
    for p in data.polygons:
        p.use_smooth=True
        seam=any(data.loops[loop].vertex_index%radial==radial-1 for loop in p.loop_indices)
        for loop in p.loop_indices:
            vi=data.loops[loop].vertex_index;co=data.vertices[vi].co
            if vi<(levels+1)*radial:
                u=(vi%radial)/radial
                if seam and u==0:u=1
                uv.data[loop].uv=(u*3.5,(co.z-bottom)/H*1.2)
            else:uv.data[loop].uv=(co.x/R+.5,co.y/R+.5)
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj);finish(obj,name,mat)

iced_tier('Hand_spatula_lower_tier',.99,.123,.72,frosting,2)
iced_tier('Hand_spatula_upper_tier',.67,.829,.55,frosting,4)
# Fine and slightly wavering piping at the base; gold is laid by hand.
for R,z in [(.989,.175),(.672,.867)]:
    points=[]
    for i in range(180):
        a=i/180*math.tau
        points.append(((R+.002*math.sin(a*9))*math.cos(a),(R+.002*math.sin(a*9))*math.sin(a),z+.002*math.sin(a*7)))
    curve('Fine_edible_gold_line',points,.0035,gold,closed=True)


def pipe_swirling_cream(cx,cy,z,R,H,mat,phase=0,shell=False):
    # A real fluted extrusion follows the pastry bag's spiral, not a pointed cone.
    samples=34 if not shell else 17;sides=10;verts=[];faces=[]
    def center(t):
        if shell:
            return Vector((cx+(t-.5)*R*2,cy+math.sin(t*math.pi)*R*.20,z+math.sin(t*math.pi)*H))
        a=phase+t*math.tau*1.8;r=R*(1-t)**.75
        return Vector((cx+math.cos(a)*r,cy+math.sin(a)*r,z+t*H))
    for j in range(samples):
        t=j/(samples-1);p=center(t)
        tangent=(center(min(.9999,t+.002))-center(max(0,t-.002))).normalized()
        side=tangent.cross(Vector((0,0,1))).normalized()
        if side.length<.1:side=Vector((1,0,0))
        up=tangent.cross(side).normalized()
        rad=R*.48*(1-t)**.55+.0018
        if shell:rad=R*.54*math.sin(math.pi*(t*.91+.045))**.65
        for k in range(sides):
            a=k/sides*math.tau;rr=rad*(1+.20*math.cos(a*5))
            v=p+(side*math.cos(a)+up*math.sin(a))*rr
            verts.append(tuple(v))
    for j in range(samples-1):
        for k in range(sides):
            a=j*sides+k;b=j*sides+(k+1)%sides;faces.append((a,b,b+sides,a+sides))
    data=bpy.data.meshes.new('Continuous piped cream');data.from_pydata(verts,[],faces);data.update()
    uv=data.uv_layers.new(name='Cream UV')
    for p in data.polygons:
        p.use_smooth=True
        for loop in p.loop_indices:
            vi=data.loops[loop].vertex_index;uv.data[loop].uv=((vi%sides)/sides,(vi//sides)/(samples-1))
    obj=bpy.data.objects.new('Hand_piped_cream',data);bpy.context.collection.objects.link(obj);finish(obj,obj.name,mat)

for i in range(44):
    a=i/44*math.tau
    pipe_swirling_cream(.985*math.cos(a),.985*math.sin(a),.136,.031,.025,piping,a,True)
# Asymmetric patisserie clusters, a lighter touch than uniform rows of spiky kisses.
for a,R,z,sz in [(-2.5,.85,.844,.080),(-2.30,.84,.845,.074),(-2.10,.85,.847,.066),(.55,.84,.845,.075),(.77,.83,.846,.06),(-1.85,.56,1.385,.070),(-1.55,.56,1.385,.06),(1.0,.51,1.385,.066)]:
    pipe_swirling_cream(R*math.cos(a),R*math.sin(a),z,sz,sz*.94,cream,a)
# A very fine blue piped chain softens the upper shoulder.
for i in range(27):
    a=i/27*math.tau
    pipe_swirling_cream(.647*math.cos(a),.647*math.sin(a),1.375,.027,.023,piping,a,True)


def chocolate_flower(cx,cy,z,radius):
    for ringIndex,count in [(0,7),(1,5),(2,3)]:
        for i in range(count):
            a=i/count*math.tau+ringIndex*.47
            length=radius*(1-ringIndex*.23);width=length*.42
            rows=12;cols=9;verts=[];faces=[]
            for j in range(rows):
                t=j/(rows-1)
                for k in range(cols):
                    side=k/(cols-1)*2-1
                    spread=math.sin(t*math.pi*.94)**.66*width*side
                    dist=t*length
                    zz=z+ringIndex*.018+length*(.21*math.sin(t*math.pi)+.20*t*t)+.009*side*side
                    verts.append((cx+math.cos(a)*dist-math.sin(a)*spread,cy+math.sin(a)*dist+math.cos(a)*spread,zz))
            for j in range(rows-1):
                for k in range(cols-1):
                    q=j*cols+k;faces.append((q,q+1,q+cols+1,q+cols))
            data=bpy.data.meshes.new('Curled chocolate petal');data.from_pydata(verts,[],faces);data.update()
            obj=bpy.data.objects.new('Handmade_white_chocolate_petal',data);bpy.context.collection.objects.link(obj);finish(obj,obj.name,cream)
            for p in data.polygons:p.use_smooth=True
            planar_uv(obj,radius*2,radius*2)
            mod=obj.modifiers.new('Chocolate edge','SOLIDIFY');mod.thickness=.0023
            bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
    for i in range(7):
        a=i/7*math.tau;r=.019
        sphere('Flower_stamen',(cx+math.cos(a)*r,cy+math.sin(a)*r,z+.077),(.006,.006,.010),gold)

chocolate_flower(-.24,-.40,1.389,.19)
chocolate_flower(.72,-.31,.854,.145)
# Natural berries have an uneven dusty bloom, a recessed crown and five small lobes.
def blueberry(x,y,z,r,index):
    obj=sphere('Blueberry',(x,y,z),(r,r*.94,r*.91),berry if index%3 else berryDark)
    for vertex in obj.data.vertices:
        co=vertex.co;theta=math.atan2(co.y,co.x)
        co.x*=1+.022*math.sin(theta*5+index);co.y*=1+.018*math.sin(theta*7-index)
    top=z+r*.88
    crown=cylinder('Berry_crown',(x,y,top),r*.27,r*.04,berryDark,20,.002)
    for i in range(5):
        a=i/5*math.tau+index
        obj=sphere('Blueberry_sepal',(x+math.cos(a)*r*.18,y+math.sin(a)*r*.18,top+r*.026),(r*.09,r*.18,r*.035),berryDark)
        obj.rotation_euler.z=a

berries=[(-.73,-.49,.89,.057),(-.78,-.35,.897,.062),(-.69,-.34,.922,.060),(-.63,-.49,.895,.048),(.69,.46,.895,.059),(.78,.35,.895,.051),(.77,.49,.895,.047),(-.43,-.27,1.42,.052),(-.45,-.13,1.425,.062),(-.35,-.16,1.438,.054),(.29,.34,1.418,.049)]
for i,args in enumerate(berries):blueberry(*args,i)
# Irregular, torn flakes of edible leaf. Sparse size variation avoids polka dots.
for i in range(110):
    tier=i%3!=0;R=.675 if tier else .995
    a=random.random()*math.tau;z=random.uniform(.96,1.30) if tier else random.uniform(.30,.75)
    sz=random.uniform(.004,.014)*(1.7 if i%19==0 else 1)
    coords=[];count=5+int(i%3)
    for j in range(count):
        angle=j/count*math.tau;r=sz*random.uniform(.55,1)
        aa=a+math.cos(angle)*r/R
        coords.append(((R+.002)*math.cos(aa),(R+.002)*math.sin(aa),z+math.sin(angle)*r))
    data=bpy.data.meshes.new('Torn edible gold');data.from_pydata(coords,[],[tuple(range(count))]);data.update()
    obj=bpy.data.objects.new('Edible_gold_flake',data);bpy.context.collection.objects.link(obj);finish(obj,obj.name,gold)
    planar_uv(obj,.09,.09)
# Three quiet constellations, fine enough to look hand piped.
for start,R,mid in [(-2.0,.995,.53),(.65,.995,.49),(-1.35,.675,1.13)]:
    points=[]
    for i in range(5):
        a=start+i*.17;z=mid+math.sin(i*1.5)*.075
        points.append((R*math.cos(a),R*math.sin(a),z))
        sphere('Sugar_constellation_dot',points[-1],(.007,.007,.007),gold)
    curve('Fine_constellation_icing',points,.0018,gold)
# A thin curved gold-leaf chocolate crescent; explicit strip topology.
coords=[];faces=[];count=49;R=.235;r=.214;off=.137
ix=(R*R-r*r+off*off)/(2*off);oa=math.acos(ix/R);ia=math.acos((ix-off)/r)
for i in range(count):
    a=oa+i/(count-1)*(math.tau-2*oa);coords.append((R*math.cos(a),.012*math.sin(a)**2,R*math.sin(a)))
for i in range(count):
    a=ia+i/(count-1)*(math.tau-2*ia);coords.append((off+r*math.cos(a),.009*math.sin(a)**2,r*math.sin(a)))
for i in range(count-1):faces.append((i,i+1,count+i+1,count+i))
data=bpy.data.meshes.new('Curled chocolate crescent');data.from_pydata(coords,[],faces);data.update()
obj=bpy.data.objects.new('Gold_leaf_chocolate_crescent',data);bpy.context.collection.objects.link(obj);finish(obj,obj.name,gold)
obj.location=(-.29,.20,1.81)
obj.rotation_euler.z=.34
for p in data.polygons:p.use_smooth=True
uv=data.uv_layers.new(name='Foil UV')
for p in data.polygons:
    for loop in p.loop_indices:
        co=data.vertices[data.loops[loop].vertex_index].co;uv.data[loop].uv=(co.x/R+.5,co.z/R+.5)
mod=obj.modifiers.new('Chocolate thickness','SOLIDIFY');mod.thickness=.010
bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name)
curve('Fine_moon_support',[(-.29,.20,1.38),(-.29,.20,1.65)],.006,gold)
for x,y,z,size in [(.24,.23,1.85,.046),(.06,.24,1.99,.029)]:
    curve('Curved_sugar_star_support',[(x+.015,y,1.39),(x+.007,y,z-.08),(x,y,z)],.0035,gold)
    obj=star('Thin_sugar_star',0,0,0,size,gold,points=5);obj.rotation_euler.x=math.pi/2;obj.location=(x,y,z)
# Three hand dipped beeswax candles and live fire sockets.
for i,(x,y,H) in enumerate([(.29,-.17,.46),(.02,.025,.61),(.34,.11,.38)]):
    cylinder(f'Candle_{i}',(x,y,1.39+H/2),.022,H,wax,32,.008)
    for j in range(3):
        angle=j*2.0+i;zz=1.39+H-.06-j*.025
        sphere('Wax_drop',(x+math.cos(angle)*.021,y+math.sin(angle)*.021,zz),(.006,.006,.025),wax)
    cylinder(f'Wick_{i}',(x,y,1.39+H+.012),.004,.028,wick,12,.001)
    socket=empty(f'FlameSocket_{i}',(x,y,1.39+H+.030));socket['flame']=True
export('star-cake')
