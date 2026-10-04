"""Mechanically encode the selected built-in ImageGen masters as runtime atlases.

No repainting, recoloring, masking, or background synthesis is performed here.
The painterly art and fine alpha come directly from the generated RGBA masters.
"""
from pathlib import Path
import argparse
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apricot', type=Path, help='Optional new built-in ImageGen PNG to preserve as the apricot master')
parser.add_argument('--cream', type=Path, help='Optional new built-in ImageGen PNG to preserve as the cream master')
args = parser.parse_args()
masters = ROOT / '.asset-build/memory-book/masters'
runtime = ROOT / 'public/memory-book'
masters.mkdir(parents=True, exist_ok=True)
for color in ('apricot', 'cream'):
    destination = masters / f'teddy-{color}-painted.png'
    source = getattr(args, color)
    if source and source.resolve() != destination.resolve():
        shutil.copy2(source, destination)
    art = Image.open(destination)
    assert art.mode == 'RGBA' and art.size == (1536, 1024)
    output = runtime / f'teddy-{color}-painted.webp'
    art.save(output, 'WEBP', quality=93, method=6, exact=True)
    print(f'{output}: {output.stat().st_size:,} bytes; RGBA retained')
