"""Extract short, supplied animation clips into editable masks and transparent atlases.

Run with the bundled Python (Pillow + NumPy); optional OpenCV improves edge cleanup.
The source GIF is never altered. Edit masks/<name>/NNN.png then run --reuse-masks
to apply a rotoscope correction without replacing hand edits. No missing body parts
are synthesized. All timing and the source frame numbers remain in the atlas JSON.
"""
from pathlib import Path
import argparse, json, math, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
WORK = ROOT / ".asset-build/memory-book"
SOURCE = WORK / "film-source"
OUT = ROOT / "public/memory-book/films"
sys.path.insert(0, str(ROOT.parent / ".tools/rotoscope"))
try:
    import cv2
except ImportError:
    cv2 = None

PROFILES = {
    "lion-nuzzle": {
        "start": 0, "end": 16, "step": 1,
        "crop": [0, 0, 640, 388], "columns": 4,
        "croppedOriginal": "Original close-up: both characters continue below the source frame; compose behind foreground grass.",
        "rois": [[0, [[0,352],[50,303],[79,251],[87,211],[101,174],[105,129],[129,86],[163,55],[197,36],[232,41],[275,48],[311,68],[338,101],[353,145],[358,161],[383,150],[409,166],[451,181],[487,213],[528,254],[552,286],[573,309],[611,333],[640,351],[640,388],[0,388]]],
                 [15, [[0,356],[56,312],[83,268],[84,236],[99,194],[105,153],[131,115],[163,86],[190,63],[229,64],[275,73],[308,91],[337,127],[353,165],[358,185],[383,178],[415,196],[453,216],[488,241],[531,273],[554,302],[579,322],[611,344],[640,362],[640,388],[0,388]]]],
    },
    "spirit-pair": {
        "start": 7, "end": 35, "step": 1,
        "crop": [30, 70, 570, 254], "columns": 5,
        "croppedOriginal": "Complete source characters; original foreground grass partly occludes hooves. Preserve lower grass occlusion in the new scene.",
        "boxes": {
            7: [[155,90,410,245]],
            10: [[139,89,274,245],[318,99,477,245]],
            14: [[145,96,236,244],[362,91,472,244]],
            18: [[103,97,192,245],[337,103,524,247]],
            21: [[78,103,189,249],[335,116,551,248]],
            25: [[54,100,191,248],[312,115,560,250]],
            28: [[52,89,216,250],[280,117,531,251]],
            31: [[57,83,233,250],[280,117,531,251]],
            34: [[55,78,224,250],[280,115,520,251]],
        },
    },
}

def interpolate_points(entries, frame):
    before = entries[0]; after = entries[-1]
    for entry in entries:
        if entry[0] <= frame: before = entry
        if entry[0] >= frame: after = entry; break
    ratio = 0 if after[0] == before[0] else (frame-before[0])/(after[0]-before[0])
    return [(round(a[0]+(b[0]-a[0])*ratio), round(a[1]+(b[1]-a[1])*ratio)) for a,b in zip(before[1],after[1])]

def roi_for(profile, frame, size):
    roi = Image.new("L", size); draw = ImageDraw.Draw(roi)
    if "rois" in profile:
        draw.polygon(interpolate_points(profile["rois"], frame), fill=255)
    else:
        keys = sorted(profile["boxes"])
        lo = max(k for k in keys if k <= frame)
        hi = min((k for k in keys if k >= frame), default=keys[-1])
        a, b = profile["boxes"][lo], profile["boxes"][hi]
        if len(a) != len(b):
            boxes = a
        else:
            f = (frame-lo)/max(1,hi-lo)
            boxes = [[round(x+(y-x)*f) for x,y in zip(boxA,boxB)] for boxA,boxB in zip(a,b)]
        for box in boxes: draw.rounded_rectangle(box, radius=8, fill=255)
    return np.asarray(roi) > 0

def clean_mask(mask, minimum_area=20):
    mask = np.uint8(mask)*255
    if cv2 is not None:
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3,3),np.uint8))
        count, labels, stats, _ = cv2.connectedComponentsWithStats(mask, 8)
        valid = np.zeros(count, np.uint8)
        valid[1:] = (stats[1:,cv2.CC_STAT_AREA] >= minimum_area).astype(np.uint8)*255
        return Image.fromarray(valid[labels])
    return Image.fromarray(mask).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))

def initial_mask(name, frame, rgb, profile):
    a = np.asarray(rgb, dtype=np.float32); r,g,b = a[:,:,0],a[:,:,1],a[:,:,2]
    if name == "lion-nuzzle":
        envelope = [(0,363),(55,313),(70,252),(72,206),(96,151),(113,101),(150,63),(188,33),(224,22),(265,28),(308,40),(347,63),(379,99),(388,139),(458,123),(495,157),(535,210),(570,240),(600,308),(640,340),(640,388),(0,388)]
        shape=Image.new("L",rgb.size); ImageDraw.Draw(shape).polygon(envelope,fill=255)
        roi=np.asarray(shape)>0
        warm=(r>g*1.28)&(r>b*1.28)
        pale=(r>200)&(g>120)&(b>70)&(r>g*1.08)&(g>b*1.05)
        candidate=(warm|pale|(np.max(a,axis=2)<55))&roi
        sure=(r>g*1.55)&(r>b*1.55)&roi
        gold=Image.new("L",rgb.size); ImageDraw.Draw(gold).polygon([(2,363),(84,270),(106,336),(145,386),(2,386)],fill=255)
        sure|=(np.asarray(gold)>0)
        background=(g>r*.86)&(g>b*1.12)
    else:
        roi=roi_for(profile,frame,rgb.size)
        roi[234:]=False
        warm=(r>g*1.36)&(r>b*1.80)
        cream=(g>r*.835)&(b>r*.65)&(b<g*.87)&(r>150)
        dark=np.max(a,axis=2)<60
        candidate=(warm|cream|dark)&roi
        sure=(r>g*1.65)&(r>b*2.15)&(r<215)&roi
        background=((b>g*.9)&(r>110)) | ((r<g*1.32)&(g<r*.82))
    if cv2 is not None:
        labels=np.full(roi.shape,cv2.GC_PR_BGD,np.uint8)
        labels[candidate]=cv2.GC_PR_FGD
        labels[~roi]=cv2.GC_BGD
        labels[background&roi]=cv2.GC_BGD
        labels[sure]=cv2.GC_FGD
        bg_model=np.zeros((1,65),np.float64); fg_model=np.zeros((1,65),np.float64)
        cv2.grabCut(np.uint8(a[:,:,::-1]),labels,None,bg_model,fg_model,3,cv2.GC_INIT_WITH_MASK)
        mask=np.uint8((labels==cv2.GC_FGD)|(labels==cv2.GC_PR_FGD))*255
        # Fill tiny dithering holes, retaining real gaps between limbs and bodies.
        n,holes,stats,_=cv2.connectedComponentsWithStats(255-mask,8)
        for i in range(1,n):
            if stats[i,cv2.CC_STAT_AREA]<35: mask[holes==i]=255
        n,parts,stats,_=cv2.connectedComponentsWithStats(mask,8)
        for i in range(1,n):
            if stats[i,cv2.CC_STAT_AREA]<55: mask[parts==i]=0
        if name=="spirit-pair":
            # Source grass occludes the hooves; remove the old grass, never invent feet.
            mask[231:]=0
        return Image.fromarray(mask)
    return clean_mask(candidate,35)

def lion_key_mask(frame, size):
    if frame == 15:
        outer=[(0,356),(48,310),(68,279),(86,253),(85,233),(78,217),(90,209),(98,188),(106,163),(119,139),(134,119),(154,98),(172,77),(195,57),(223,37),(241,31),(263,35),(285,43),(305,52),(331,63),(348,72),(364,90),(372,109),(375,134),(376,145),(402,143),(431,144),(450,148),(460,153),(463,172),(466,181),(492,198),(520,219),(542,239),(559,262),(572,290),(574,315),(604,335),(640,356),(640,388),(0,388)]
        hole=[(320,299),(339,279),(353,269),(371,270),(388,281),(405,301),(415,325),(410,353),(410,388),(308,388),(314,358),(318,326)]
    else:
        outer=[(0,353),(18,338),(41,314),(62,290),(79,258),(88,243),(90,226),(84,219),(91,208),(92,195),(102,176),(106,154),(120,131),(126,115),(137,98),(154,83),(174,65),(193,53),(211,43),(229,39),(250,42),(269,47),(284,49),(302,56),(318,68),(331,82),(341,96),(348,113),(352,131),(357,150),(367,148),(378,151),(384,160),(400,168),(418,175),(438,185),(457,196),(480,211),(498,224),(518,243),(536,266),(550,289),(560,299),(575,310),(599,324),(620,336),(640,351),(640,388),(0,388)]
        hole=[(328,320),(348,311),(355,304),(367,301),(381,304),(398,317),(402,333),(402,357),(405,388),(307,388),(314,373),(320,350)]
    mask=Image.new("L",size); draw=ImageDraw.Draw(mask);draw.polygon(outer,fill=255);draw.polygon(hole,fill=0)
    return np.array(mask)

def tracked_lion_mask(frame, rgb, previous_rgb, previous_mask):
    array=np.asarray(rgb)
    if frame == 0 or previous_mask is None:
        candidate=lion_key_mask(frame,rgb.size)
    else:
        gray=cv2.cvtColor(array,cv2.COLOR_RGB2GRAY)
        previous_gray=cv2.cvtColor(previous_rgb,cv2.COLOR_RGB2GRAY)
        flow=cv2.calcOpticalFlowFarneback(gray,previous_gray,None,.5,3,21,4,5,1.2,0)
        yy,xx=np.mgrid[0:array.shape[0],0:array.shape[1]].astype(np.float32)
        candidate=cv2.remap(previous_mask,xx+flow[:,:,0],yy+flow[:,:,1],cv2.INTER_LINEAR)
        candidate=np.uint8(candidate>128)*255
    inner=cv2.erode(candidate,np.ones((11,11),np.uint8))
    outer=cv2.dilate(candidate,np.ones((11,11),np.uint8))
    labels=np.full(candidate.shape,cv2.GC_PR_BGD,np.uint8)
    labels[candidate>0]=cv2.GC_PR_FGD
    labels[inner>0]=cv2.GC_FGD
    labels[outer==0]=cv2.GC_BGD
    cv2.grabCut(array[:,:,::-1].copy(),labels,None,np.zeros((1,65),np.float64),np.zeros((1,65),np.float64),2,cv2.GC_INIT_WITH_MASK)
    mask=np.uint8((labels==cv2.GC_FGD)|(labels==cv2.GC_PR_FGD))*255
    hsv=cv2.cvtColor(array,cv2.COLOR_RGB2HSV)
    distance=cv2.distanceTransform(mask,cv2.DIST_L2,3)
    yy=np.arange(mask.shape[0])[:,None]
    fringe=(distance<6)&(hsv[:,:,0]>31)&(hsv[:,:,1]>60)&(hsv[:,:,2]>90)&(yy<200)
    mask[fringe]=0
    return Image.fromarray(mask)

def run(name, reuse):
    profile = PROFILES[name]
    image = Image.open(SOURCE / f"{name}.gif")
    mask_dir = WORK / "masks" / name; mask_dir.mkdir(parents=True, exist_ok=True)
    frame_dir = WORK / "film-frames" / name; frame_dir.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    selected = list(range(profile["start"], min(image.n_frames,profile["end"]), profile["step"]))
    result, durations, frames = [], [], []
    previous_rgb, previous_mask = None, None
    for number in selected:
        image.seek(number); rgb = image.convert("RGB")
        duration = image.info.get("duration",100)
        mask_path = mask_dir / f"{number:03}.png"
        if reuse and mask_path.exists():
            mask = Image.open(mask_path).convert("L")
        else:
            mask = tracked_lion_mask(number,rgb,previous_rgb,previous_mask) if name == "lion-nuzzle" and cv2 is not None else initial_mask(name, number, rgb, profile)
            mask.save(mask_path)
        previous_rgb=np.asarray(rgb); previous_mask=np.asarray(mask)
        rgba = rgb.convert("RGBA")
        # A subpixel matte smooths GIF dithering but does not blur the source color.
        rgba.putalpha(mask.filter(ImageFilter.GaussianBlur(.38)))
        rgba.save(frame_dir / f"{number:03}.png")
        result.append(rgba.crop(profile["crop"]))
        durations.append(duration); frames.append(number)
    fw,fh = result[0].size; columns = profile["columns"]
    atlas = Image.new("RGBA", (fw*columns,fh*math.ceil(len(result)/columns)))
    for i,frame in enumerate(result): atlas.paste(frame,((i%columns)*fw,(i//columns)*fh))
    atlas.save(OUT/f"{name}.webp",format="WEBP",quality=92,method=6,exact=True)
    metadata = {
        "src":f"memory-book/films/{name}.webp", "frameWidth":fw,"frameHeight":fh,
        "columns":columns,"frames":len(result),"durations":durations,"sourceFrames":frames,
        "durationMs":sum(durations),"croppedOriginal":profile["croppedOriginal"],
        "sourceFile":f"{name}.gif","maskMethod":"Editable per-frame alpha matte; original RGB and animation timing preserved.",
        "loop": name=="lion-nuzzle",
    }
    (OUT/f"{name}.json").write_text(json.dumps(metadata,indent=2)+"\n",encoding="utf-8")
    (mask_dir/"profile.json").write_text(json.dumps(profile,indent=2)+"\n",encoding="utf-8")
    # A six-frame contrast contact sheet is a visual editing aid, never a runtime asset.
    cells = []; selected_indices = np.linspace(0,len(result)-1,6,dtype=int)
    for i in selected_indices:
        original = result[i]
        canvas = Image.new("RGBA", original.size, (20,30,44,255)); canvas.alpha_composite(original)
        canvas = canvas.convert("RGB"); ImageDraw.Draw(canvas).text((8,8),f"source frame {frames[i]}",fill="white")
        cells.append(canvas)
    sheet = Image.new("RGB",(fw*3,fh*2),(20,30,44))
    for i,cell in enumerate(cells): sheet.paste(cell,((i%3)*fw,(i//3)*fh))
    sheet.save(WORK/f"{name}-alpha-review.jpg",quality=92)
    print(json.dumps({"name":name,"frames":len(result),"dimensions":[fw,fh],"bytes":(OUT/f"{name}.webp").stat().st_size,"opencv":cv2 is not None}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("name",choices=list(PROFILES))
    parser.add_argument("--reuse-masks",action="store_true")
    args = parser.parse_args()
    run(args.name,args.reuse_masks)
