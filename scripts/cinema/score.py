"""Original 24-second jazz miniature, performed with the licensed local piano.

Python 3.9 + NumPy. No excerpt or melody from a film soundtrack is used.
"""
import argparse, subprocess, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--ffmpeg', required=True)
args = parser.parse_args()
rate = 48000
duration = 24
raw = subprocess.check_output([args.ffmpeg, '-v', 'error', '-i', str(ROOT/'public/audio/piano-c4.mp3'), '-f', 'f32le', '-ac', '1', '-ar', str(rate), '-'])
sample = np.frombuffer(raw, dtype='<f4')
mix = np.zeros((duration*rate, 2), dtype=np.float64)

def note(midi, at, gain=.22, length=2.4, pan=0):
    speed = 2**((midi-60)/12)
    count = min(int(length*rate), int(len(sample)/speed))
    sound = np.interp(np.arange(count)*speed, np.arange(len(sample)), sample)
    envelope = np.ones(count)
    tail = min(count, int(.55*rate))
    envelope[-tail:] *= np.linspace(1, 0, tail)**2
    sound *= envelope*gain
    start = int(at*rate)
    count = min(count, len(mix)-start)
    if count <= 0: return
    stereo = np.column_stack((sound[:count]*(1-pan*.25), sound[:count]*(1+pan*.25)))
    mix[start:start+count] += stereo
    # Short, low-level stereo room reflections, never a separate browser clock.
    for delay, wet in [(0.083,.12),(.151,.09),(.237,.045)]:
        offset=start+int(delay*rate);n=min(count,len(mix)-offset)
        if n>0:mix[offset:offset+n] += stereo[:n,::-1]*wet

# Eight three-beat bars at 60 bpm. Warm major-seventh harmony; a new melody.
chords = [(48,55,59,64),(45,52,55,60),(50,57,60,65),(43,50,53,59),
          (48,55,59,64),(45,52,55,60),(50,57,60,65),(48,55,59,64)]
melody = [[76,74,71],[72,76,79],[77,76,72],[74,71,67],
          [76,79,83],[81,79,76],[77,74,71],[72,76,72]]
for bar,chord in enumerate(chords):
    t=bar*3
    note(chord[0],t,.30,2.7,-.5)
    for beat in [1,2]:
        for index,pitch in enumerate(chord[1:]):note(pitch,t+beat+index*.025,.15,1.6,-.2)
    for beat,pitch in enumerate(melody[bar]):note(pitch,t+beat+.1,.23,1.8,.35)
# Natural final decay, no abrupt clipped note.
fade = np.minimum(1,np.arange(len(mix))/(rate*.2)) * np.minimum(1,(len(mix)-np.arange(len(mix)))/(rate*1.5))
mix *= fade[:,None]
mix *= .84/max(1e-8,np.max(np.abs(mix)))
out=ROOT/'.asset-build/cinema/duet-score.wav';out.parent.mkdir(parents=True,exist_ok=True)
with wave.open(str(out),'wb') as wav:
    wav.setnchannels(2);wav.setsampwidth(2);wav.setframerate(rate)
    wav.writeframes((mix*32767).astype('<i2').tobytes())
print(out)
