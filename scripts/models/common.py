"""Shared Blender export boundaries; source builds remain separate from web compression."""
import os
from pathlib import Path
import bpy
ROOT = Path(__file__).resolve().parents[2]
def output_dir(subdirectory=''):
    result = Path(os.environ.get('MODEL_OUT', str(ROOT / '.asset-build/raw'))) / subdirectory
    result.mkdir(parents=True, exist_ok=True)
    return result

def export_glb(filepath, **options):
    selected = list(bpy.context.selected_objects) if options.get('use_selection') else list(bpy.context.scene.objects)
    meshes = [o for o in selected if o.type == 'MESH']
    if not meshes: raise RuntimeError('Refusing to export an empty asset')
    for obj in meshes:
        if any(abs(v) > 1000 for vertex in obj.data.vertices for v in vertex.co):
            raise RuntimeError(f'Non-web scale in {obj.name}')
    bpy.ops.export_scene.gltf(filepath=str(filepath), export_format='GLB', **options)
    if Path(filepath).stat().st_size > 8 * 1024 * 1024:
        raise RuntimeError(f'Raw GLB exceeds 8 MiB: {filepath}')
