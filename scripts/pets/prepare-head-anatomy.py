"""Preserve and encode the complete puppy-head artwork from built-in ImageGen.

Only copies the original RGBA master and encodes WebP; no artistic edits.
The four anatomical head viewports and neck placement are defined in Pets.tsx.
"""
from pathlib import Path
import argparse
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path, nargs='?')
args = parser.parse_args()
master = ROOT / '.asset-build/memory-book/masters/teddy-head-anatomy.png'
master.parent.mkdir(parents=True, exist_ok=True)
if args.source and args.source.resolve() != master.resolve():
    shutil.copy2(args.source, master)
art = Image.open(master)
assert art.mode == 'RGBA' and art.size == (1254, 1254)
output = ROOT / 'public/memory-book/teddy-head-anatomy.webp'
art.save(output, 'WEBP', quality=93, method=6, exact=True)
print(f'{output}: {output.stat().st_size:,} bytes; RGBA retained')
