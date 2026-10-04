"""Preserve and mechanically encode the built-in ImageGen puppy face atlas.

No artistic edits are applied here; alignment crops live in Pets.tsx.
"""
from pathlib import Path
import argparse
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path, nargs='?')
args = parser.parse_args()
master = ROOT / '.asset-build/memory-book/masters/teddy-puppy-expressions.png'
master.parent.mkdir(parents=True, exist_ok=True)
if args.source and args.source.resolve() != master.resolve():
    shutil.copy2(args.source, master)
art = Image.open(master)
assert art.mode == 'RGBA' and art.size == (1024, 1536)
output = ROOT / 'public/memory-book/teddy-puppy-expressions.webp'
art.save(output, 'WEBP', quality=93, method=6, exact=True)
print(f'{output}: {output.stat().st_size:,} bytes; RGBA retained')
