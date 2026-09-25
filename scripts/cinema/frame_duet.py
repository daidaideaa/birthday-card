"""Keep the complete side-step silhouette inside the independent phone camera."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *

bpy.ops.wm.open_mainfile(filepath=str(BUILD / 'duet-production.blend'), use_scripts=False)
scene = setup(samples=16)
scene.cycles.denoiser = 'OPTIX'
scene.cycles.denoising_use_gpu = True
camera = bpy.data.objects['Portrait']
camera.data.lens = 68
save_scene('duet-production')
scene.camera = camera
scene.render.resolution_x = 720
scene.render.resolution_y = 1280
for frame in [97, 193, 289, 385]:
    scene.frame_set(frame)
    scene.render.filepath = str(BUILD / f'duet-portrait-safe-{frame:04d}.png')
    bpy.ops.render.render(write_still=True)
