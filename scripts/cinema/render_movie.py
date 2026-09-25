"""Render one saved scene/camera to a resumable PNG sequence using Blender.

blender -b scene.blend -P render_movie.py -- --camera Landscape --name duet-landscape
"""
import argparse, sys
from pathlib import Path
import bpy

parser=argparse.ArgumentParser()
parser.add_argument('--camera', default='Landscape')
parser.add_argument('--name', required=True)
parser.add_argument('--width', type=int, default=1920)
parser.add_argument('--height', type=int, default=1080)
parser.add_argument('--samples', type=int, default=24)
parser.add_argument('--engine', choices=['CYCLES','BLENDER_EEVEE_NEXT'],default='CYCLES')
parser.add_argument('--start',type=int,default=1)
parser.add_argument('--end',type=int,default=0)
parser.add_argument('--paired',action='store_true',help='Render Landscape and Portrait at each pose, reusing evaluated geometry')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
scene=bpy.context.scene
scene.camera=bpy.data.objects[args.camera]
scene.render.engine=args.engine
scene.render.resolution_x=args.width;scene.render.resolution_y=args.height
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.use_file_extension=True
scene.cycles.samples=args.samples
scene.cycles.denoiser='OPTIX'
scene.cycles.denoising_use_gpu=True
scene.render.use_persistent_data=True
if args.engine=='CYCLES':
    prefs=bpy.context.preferences.addons['cycles'].preferences
    prefs.compute_device_type='OPTIX';prefs.get_devices()
    for device in prefs.devices:device.use=device.type=='OPTIX'
    scene.cycles.device='GPU'
else:
    scene.eevee.taa_render_samples=args.samples
    scene.eevee.use_raytracing=True
root=Path(__file__).resolve().parents[2]/'.asset-build/cinema'
views=[(args.name,args.camera,args.width,args.height)]
if args.paired:views=[(args.name+'-landscape','Landscape',1920,1080),(args.name+'-portrait','Portrait',720,1280)]
for name,_,_,_ in views:(root/name).mkdir(parents=True,exist_ok=True)
for frame in range(args.start,(args.end or scene.frame_end)+1):
    pending=[v for v in views if not (root/v[0]/f'{frame:04d}.png').exists()]
    if not pending:continue
    scene.frame_set(frame)
    for name,cam,width,height in pending:
        scene.camera=bpy.data.objects[cam]
        scene.render.resolution_x=width;scene.render.resolution_y=height
        scene.render.filepath=str(root/name/f'{frame:04d}.png')
        bpy.ops.render.render(write_still=True)
        print('FRAME_READY',name,frame,flush=True)
