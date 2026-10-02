"""Build a portable project archive from explicit project inputs, never a home-directory backup.

Python 3.9+, standard library only. Private configuration is packaged separately.
"""
import argparse
import hashlib
import json
import shutil
import subprocess
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--legacy-root', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
stage = args.output.resolve() / 'birthday-card-portable'
if stage.exists():
    raise SystemExit('Use a new output directory; existing package is never overwritten.')
stage.mkdir(parents=True)
files = subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
for name in filter(None, files):
    source = ROOT / name
    if source.is_file():
        target = stage / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)

def copy_tree(source, relative):
    if not source.is_dir():
        raise FileNotFoundError(source)
    shutil.copytree(source, stage / relative, dirs_exist_ok=True)

copy_tree(ROOT/'model-sources', Path('model-sources'))
copy_tree(ROOT/'.asset-build/character-review/public', Path('.asset-build/character-review/public'))
copy_tree(ROOT/'.asset-build/character-preview', Path('.asset-build/character-preview'))
copy_tree(ROOT/'.asset-build/character-review/check', Path('.asset-build/character-review/check'))
copy_tree(ROOT/'.asset-build/character-review/validation', Path('.asset-build/character-review/validation'))
for file in (ROOT/'.asset-build/character-review').glob('*-character-master.blend'):
    shutil.copy2(file, stage/'.asset-build/character-review'/file.name)
# Preserve the final historical authoring projects too. Reproducible PNG frame
# caches and .blend1 autosaves are in an optional history archive, not required here.
for file in (args.legacy_root/'.asset-build/cinema').iterdir():
    if file.is_file() and file.suffix in ['.blend','.wav','.mp4','.png','.jpg','.json','.py','.html']:
        target=stage/'.asset-build/cinema'/file.name
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(file,target)
copy_tree(args.legacy_root/'public/media', Path('public/media'))
subprocess.run(['git','bundle','create',str(stage/'PROJECT-HISTORY.bundle'),'--all'],cwd=ROOT,check=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()
manifest={'schema':1,'commit':commit,'files':[]}
for file in sorted(stage.rglob('*')):
    if not file.is_file():continue
    content=file.read_bytes()
    manifest['files'].append({'path':file.relative_to(stage).as_posix(),'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()})
(stage/'MIGRATION-MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
archive=args.output/'birthday-card-complete.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=5,allowZip64=True) as z:
    for file in sorted(stage.rglob('*')):
        if file.is_file():z.write(file,file.relative_to(stage.parent).as_posix())
print(json.dumps({'archive':str(archive),'bytes':archive.stat().st_size,'files':len(manifest['files']),'commit':commit}),flush=True)
