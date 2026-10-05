"""Preserve ImageGen V9 masters, encode RGBA, and locate mechanical atlas crops.

No painting, color replacement, background synthesis, or anatomy edits happen here.
"""
from pathlib import Path
import argparse
import json
import shutil
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--apricot', type=Path)
parser.add_argument('--cream', type=Path)
parser.add_argument('--blink', type=Path)
args = parser.parse_args()
masters = ROOT / '.asset-build/memory-book/masters'
runtime = ROOT / 'public/memory-book'
masters.mkdir(parents=True, exist_ok=True)
parts = ('head', 'body', 'front', 'back', 'tail')
# The generated image uses five columns, but heads have more horizontal room
# than limbs. These dividers follow its actual clear gaps, not a guessed grid.
rows = ((0, 270), (270, 492), (492, 734), (734, 1005), (1005, 1254))
columns = ((0, 268, 543, 775, 1013, 1254), (0, 260, 512, 775, 1024, 1254), *((0, 250, 500, 750, 1000, 1254),) * 3)
layouts = {}
for color in ('apricot', 'cream'):
    master = masters / f'teddy-{color}-turnaround-v9.png'
    source = getattr(args, color)
    if source and source.resolve() != master.resolve():
        shutil.copy2(source, master)
    art = Image.open(master)
    assert art.mode == 'RGBA' and art.size == (1254, 1254)
    output = runtime / f'teddy-{color}-turnaround-v9.webp'
    if source or not output.exists():
        art.save(output, 'WEBP', quality=93, method=6, exact=True)
    color_parts = {}
    for row, part in enumerate(parts):
        crops = []
        for col in range(5):
            cell = (columns[row][col], rows[row][0], columns[row][col + 1], rows[row][1])
            alpha = art.getchannel('A').crop(cell)
            # Erosion only measures the substantial painted bounds; output
            # pixels/alpha remain untouched and padding retains fine fur edges.
            bounds = alpha.point(lambda p: 255 if p >= 96 else 0).filter(ImageFilter.MinFilter(3)).getbbox()
            assert bounds, (color, part, col)
            x0, y0 = max(cell[0], cell[0] + bounds[0] - 6), max(cell[1], cell[1] + bounds[1] - 6)
            x1, y1 = min(cell[2], cell[0] + bounds[2] + 6), min(cell[3], cell[1] + bounds[3] + 6)
            crops.append([x0, y0, x1 - x0, y1 - y0])
        color_parts[part] = crops
    layouts[color] = color_parts
    print(f'{output.name}: {output.stat().st_size:,} bytes')
blink_master = masters / 'teddy-turnaround-blink-v9.png'
if args.blink and args.blink.resolve() != blink_master.resolve():
    shutil.copy2(args.blink, blink_master)
if blink_master.exists():
    blink = Image.open(blink_master)
    assert blink.mode == 'RGBA' and blink.size == (1774, 887)
    blink_output = runtime / 'teddy-turnaround-blink-v9.webp'
    if args.blink or not blink_output.exists():
        blink.save(blink_output, 'WEBP', quality=93, method=6, exact=True)
    blink_columns = (0, 380, 746, 1077, 1419, 1774)
    for row, color in enumerate(('apricot', 'cream')):
        crops = []
        for col in range(5):
            cell = (blink_columns[col], row * 443, blink_columns[col + 1], (row + 1) * 443)
            bounds = blink.getchannel('A').crop(cell).point(lambda p: 255 if p >= 96 else 0).filter(ImageFilter.MinFilter(3)).getbbox()
            assert bounds
            x0, y0 = max(cell[0], cell[0] + bounds[0] - 5), max(cell[1], cell[1] + bounds[1] - 5)
            x1, y1 = min(cell[2], cell[0] + bounds[2] + 5), min(cell[3], cell[1] + bounds[3] + 5)
            crops.append([x0, y0, x1 - x0, y1 - y0])
        layouts[color]['blink'] = crops
    print(f'{blink_output.name}: {blink_output.stat().st_size:,} bytes')
(runtime / 'teddy-turnaround-layout-v9.json').write_text(json.dumps(layouts, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
