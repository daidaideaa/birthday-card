"""Original 18-second underscore with a public-domain lion recording.
Run with radar-py39/python.exe scripts/cinema/pride_score.py --ffmpeg path/to/ffmpeg.exe
"""
import argparse, subprocess, wave
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser();parser.add_argument('--ffmpeg',required=True);args=parser.parse_args()
rate=48000;duration=18;count=rate*duration
mix=np.zeros((count,2),dtype=np.float64)
def decode(path, filters=None):
    cmd=[args.ffmpeg,'-v','error','-i',str(path)]
    if filters:cmd+=['-af',filters]
    return np.frombuffer(subprocess.check_output(cmd+['-f','f32le','-ac','1','-ar',str(rate),'-']),dtype='<f4')
piano=decode(ROOT/'public/audio/piano-c4.mp3')
def add(sound,at,gain=1,pan=0):
    start=int(at*rate);length=min(len(sound),count-start)
    if length<=0:return
    stereo=np.column_stack([sound[:length]*(1-pan*.2),sound[:length]*(1+pan*.2)])*gain
    mix[start:start+length]+=stereo
    for delay,wet in [(.13,.09),(.24,.06),(.41,.025)]:
        offset=start+int(delay*rate);n=min(length,count-offset)
        if n>0:mix[offset:offset+n]+=stereo[:n,::-1]*wet

def note(midi,at,level=.17,length=3.0,pan=0):
    ratio=2**((midi-60)/12);n=min(int(length*rate),int(len(piano)/ratio))
    sound=np.interp(np.arange(n)*ratio,np.arange(len(piano)),piano)
    env=np.minimum(1,np.arange(n)/(rate*.01))*np.minimum(1,(n-np.arange(n))/(rate*.6))
    add(sound*env,at,level,pan)
def pad(chord,at,length,level):
    n=int(length*rate);t=np.arange(n)/rate
    env=np.minimum(1,t/1.2)*np.minimum(1,(length-t)/1.8)
    sound=np.zeros(n)
    for pitch in chord:
        f=440*2**((pitch-69)/12)
        phase=2*np.pi*f*t+.014*np.sin(2*np.pi*.23*t)
        sound+=np.sin(phase)*.6+np.sin(phase*2)*.12+np.sin(phase*3)*.035
    add(sound*env,at,level)
pad([48,55,60,64],0,6.7,.015)
pad([45,52,59,64],6.35,5.0,.010)
pad([48,55,60,67],10.8,7.2,.018)
for at,pitches in [(0,[48,60,64]),(2.3,[55,67]),(4.5,[52,64,72]),(6.7,[57,64]),(8.8,[59,67]),(11,[48,60,67]),(13.0,[55,64,72]),(16.0,[48,60,64,72])]:
    for i,pitch in enumerate(pitches):note(pitch,at+i*.065,.17 if at<6.5 or at>=11 else .10,2.8,(i-1)*.35)
# Soft air, shaped slowly rather than looping a conspicuous noise sample.
rng=np.random.default_rng(923);noise=rng.normal(0,1,count)
noise=np.convolve(noise,np.ones(180)/180,mode='same')
t=np.arange(count)/rate;wind=noise*(.017+.006*np.sin(t*.43))
add(wind,0,1)
roar=decode(ROOT/'scripts/cinema/assets/lion-roar-public-domain.ogg','highpass=f=60,lowpass=f=2600')
window=int(2.75*rate)
starts=np.arange(0,len(roar)-window,int(.2*rate))
best=max(starts,key=lambda start:float(np.mean(roar[start:start+window]**2)))
clip=roar[best:best+window].copy();u=np.arange(len(clip))/rate
clip*=np.minimum(1,u/.10)*np.minimum(1,(2.75-u)/.48)
clip*=.40/max(.001,float(np.max(np.abs(clip))))
add(clip,14.42,1)
fade=np.minimum(1,t/.35)*np.minimum(1,(duration-t)/.85)
mix*=fade[:,None]
peak=np.max(np.abs(mix));mix*=.79/max(.79,peak)
out=ROOT/'.asset-build/cinema/pride-score.wav';out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as target:
    target.setnchannels(2);target.setsampwidth(2);target.setframerate(rate);target.writeframes((mix*32767).astype('<i2').tobytes())
print(out,'peak',float(np.max(np.abs(mix))))
