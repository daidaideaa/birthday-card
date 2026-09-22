"""Offline composition check of exported GLBs at the runtime phone camera.

Run after build_dancers.py. This checks geometry, silhouettes and animation;
Blender lighting is an approximation, not a substitute for browser/WebGL QA.
JAZZ_STAGE_QA_DIR and JAZZ_STAGE_FRAMES may override the output and frames.
"""
import bpy, math, os, pathlib
from mathutils import Vector

ROOT=pathlib.Path(__file__).resolve().parents[2]
OUT=pathlib.Path(os.environ.get('JAZZ_STAGE_QA_DIR','/tmp/birthday-stage-review'))
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.render.fps=30

def mat(name,hexcolor,emission=False):
 values=[int(hexcolor[i:i+2],16)/255 for i in (0,2,4)]
 color=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values]
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=.8
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=1
 return m

def mesh(name,vertices,faces,material):
 data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o

def box(name,loc,scale,material):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.scale=scale;o.data.materials.append(material);return o

def glb(name,loc,scale=1,yaw=0):
 before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'public/models'/name));objects=set(bpy.data.objects)-before
 root=bpy.data.objects.new(name+' stage transform',None);bpy.context.collection.objects.link(root)
 for o in objects:
  if o.parent not in objects:o.parent=root
 root.location=loc;root.scale=(scale,)*3;root.rotation_euler.z=yaw
 return root

glb('jazz-duo.glb',(.3,-.75,0))
glb('grand-piano.glb',(-1.35,1.1,.025),.135,-.55)
stone=mat('terrace','4a4659');rail=mat('ironwork','27263b')
box('terrace',(0,-2.8,-.025),(22,14,.025),stone)
box('railing',(0,3.7,.5),(20,.055,.055),rail)
for i in range(-7,8):box('railing post',(i*1.3,3.7,.25),(.036,.036,.5),rail)
bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=.034,depth=2.75,location=(-1.68,1.5,1.37));bpy.context.object.data.materials.append(rail)
bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.14,location=(-1.68,1.5,2.77));bpy.context.object.data.materials.append(mat('lamp','ffdca8',True))
bpy.ops.object.light_add(type='POINT',location=(-1.68,1.5,2.77));bpy.context.object.data.energy=65;bpy.context.object.data.color=(1,.72,.40);bpy.context.object.data.shadow_soft_size=.22

for layer,color in enumerate(['625275','45435e','292f45']):
 verts=[(-24,18-layer*4,-5)]
 for i in range(49):
  x=i-24;verts.append((x,18-layer*4,.3+layer*.25+math.sin(x*.32+layer)*.45+math.sin(x*.71-layer)*.19))
 verts.append((24,18-layer*4,-5));mesh('distant hills',verts,[tuple(range(len(verts)))],mat(color,color,True))
verts=[];faces=[]
for i in range(260):
 x=((i*.618034)%1)*26-13;z=-.3+((i*.381966)%1)*.72;s=.55+(i%5)*.17;n=len(verts)
 verts.extend([(x-.0175*s,9.6,z-.008*s),(x+.0175*s,9.6,z-.008*s),(x+.0175*s,9.6,z+.008*s),(x-.0175*s,9.6,z+.008*s)]);faces.append((n,n+1,n+2,n+3))
mesh('city lights',verts,faces,mat('city amber','ffd8aa',True))
sky=mat('dusk sky','22234f',True);nodes=sky.node_tree.nodes;links=sky.node_tree.links;p=nodes.get('Principled BSDF')
geo=nodes.new('ShaderNodeNewGeometry');xyz=nodes.new('ShaderNodeSeparateXYZ');remap=nodes.new('ShaderNodeMapRange');remap.inputs['From Min'].default_value=-.5;remap.inputs['From Max'].default_value=14
mix=nodes.new('ShaderNodeMixRGB');mix.inputs[1].default_value=(.434,.198,.305,1);mix.inputs[2].default_value=(.016,.017,.078,1)
links.new(geo.outputs['Position'],xyz.inputs[0]);links.new(xyz.outputs['Z'],remap.inputs[0]);links.new(remap.outputs[0],mix.inputs[0]);links.new(mix.outputs[0],p.inputs['Emission Color']);links.new(mix.outputs[0],p.inputs['Base Color'])
mesh('sky plane',[(-50,43,-20),(50,43,-20),(50,43,40),(-50,43,40)],[(0,1,2,3)],sky)

def aim(o,at):o.rotation_euler=(Vector(at)-o.location).to_track_quat('-Z','Y').to_euler()
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.24,.27,.43,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.3
for loc,color,power,size in [((-3,-4,6),(1,.78,.55),700,5),((3,3,4),(.49,.68,1),900,4),((1,-4,2),(1,.9,.76),65,4)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.color=color;o.data.energy=power;o.data.size=size;aim(o,(0,0,1))
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.sensor_fit='VERTICAL';camera.data.sensor_height=24;camera.data.clip_end=100
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
def smooth(t,a,b):
 x=max(0,min(1,(t-a)/(b-a)));return x*x*(3-2*x)
for width,height,label in [(390,540,'phone'),(1000,480,'wide')]:
 scene.render.resolution_x=width;scene.render.resolution_y=height;scene.render.resolution_percentage=100
 portrait=width<height;fov=43 if portrait else 34;camera.data.lens=24/(2*math.tan(math.radians(fov)/2))
 for frame in [int(x) for x in os.environ.get('JAZZ_STAGE_FRAMES','129,255').split(',')]:
  scene.frame_set(frame);t=(frame-1)/30;approach=smooth(t,0,3);turn=smooth(t,6,9.5)
  distance=max(5.9,4.1/(width/height)) if portrait else 7.7
  camera.location=((.85 if portrait else 1.6)-approach*.32+turn*.2,-distance+approach*.24,2.05-approach*.1)
  aim(camera,(.20 if portrait else -.05,-.05,1));scene.render.filepath=str(OUT/f'{label}-{frame:03}.png');bpy.ops.render.render(write_still=True)
print('Composition frames:',OUT,flush=True)
