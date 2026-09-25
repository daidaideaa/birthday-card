"""Encode rendered Autumn companion RGBA frames as portable H.264 RGB+mask clips.

Requires Pillow, NumPy, SciPy and FFmpeg. The source PNGs stay outside public/.
Each 768x384 frame stores straight sRGB colour on the left and linear alpha on
the right. Dilating low-alpha RGB avoids dark chroma fringes after YUV420 encoding.
"""
import argparse, json, subprocess, time, os
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import distance_transform_edt

ROOT=Path(__file__).resolve().parents[2]
BUILD=ROOT/'.asset-build'/'cinema'/'pets'
OUTPUT=ROOT/'public'/'cinema'/'pets'
parser=argparse.ArgumentParser()
parser.add_argument('--ffmpeg',default='D:/environment/cinema-tools/ffmpeg-9.0.2-essentials_build/bin/ffmpeg.exe')
parser.add_argument('--variant',choices=['apricot','cream','both'],default='both')
parser.add_argument('--only-ready',action='store_true')
parser.add_argument('--wait',action='store_true',help='Wait up to two hours for a concurrently running renderer.')
args=parser.parse_args()
OUTPUT.mkdir(parents=True,exist_ok=True)
actions={'idle':96,'look-left':48,'look-right':48,'pet':48,'happy':48,'rest':96}
summary=[]
for variant in (['apricot','cream'] if args.variant=='both' else [args.variant]):
    poster=BUILD/(variant+'-idle')/'0001.png'
    if poster.exists():
        Image.open(poster).save(OUTPUT/(variant+'.webp'),quality=96,method=6,exact=True)
    for action,count in actions.items():
        folder=BUILD/(variant+'-'+action)
        frames=[folder/('%04d.png'%frame) for frame in range(1,count+1)]
        deadline=time.monotonic()+7200
        while args.wait and not all(frame.exists() for frame in frames):
            if time.monotonic()>deadline:raise TimeoutError('Render did not finish: '+str(folder))
            time.sleep(10)
        if not all(frame.exists() for frame in frames):
            if args.only_ready:continue
            raise RuntimeError('Incomplete render: '+str(folder))
        destination=OUTPUT/(variant+'-'+action+'.mp4')
        if destination.exists() and destination.stat().st_mtime>max(frame.stat().st_mtime for frame in frames):continue
        temporary=destination.with_suffix('.partial.mp4')
        command=[args.ffmpeg,'-hide_banner','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','768x384','-r','24','-i','-','-an','-c:v','libx264','-preset','slow','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(temporary)]
        process=subprocess.Popen(command,stdin=subprocess.PIPE)
        for frame in frames:
            rgba=np.array(Image.open(frame).convert('RGBA'))
            rgb=rgba[:,:,:3].copy();alpha=rgba[:,:,3]
            weak=alpha<12
            nearest=distance_transform_edt(weak,return_distances=False,return_indices=True)
            rgb[weak]=rgb[nearest[0][weak],nearest[1][weak]]
            mask=np.repeat(alpha[:,:,None],3,axis=2)
            packed=np.concatenate([rgb,mask],axis=1)
            process.stdin.write(packed.tobytes())
        process.stdin.close()
        if process.wait()!=0:raise RuntimeError('FFmpeg failed for '+str(destination))
        os.replace(temporary,destination)
        summary.append({'file':destination.name,'frames':count,'seconds':count/24,'bytes':destination.stat().st_size})
        print('ENCODED',json.dumps(summary[-1]),flush=True)
print(json.dumps(summary,indent=2))
