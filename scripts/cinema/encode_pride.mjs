/** Encode the 18-second pride montage with brief, clock-preserving dissolves. */
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const { values } = parseArgs({ options: {
  ffmpeg: { type: 'string' }, format: { type: 'string' },
} });
if (!values.ffmpeg || !['landscape','portrait'].includes(values.format))
  throw new Error('Expected --ffmpeg executable --format landscape|portrait');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const name = `pride-${values.format}`;
const frames = path.join(root, '.asset-build/cinema', name);
const output = path.join(root, 'public/cinema');
const temporary = path.join(output, `${name}.encoding.mp4`);
await mkdir(output, { recursive: true });
// Five-frame handles on either side retain all original scene time outside
// the ten-frame dissolve. Chapter cues remain at exactly 6.5 and 11 seconds.
const dissolve = [
  '[0:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv444p,split=3[a][b][c]',
  '[a]trim=start_frame=0:end_frame=156,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop=5[a1]',
  '[b]trim=start_frame=156:end_frame=264,setpts=PTS-STARTPTS,tpad=start_mode=clone:start=5:stop_mode=clone:stop=5[b1]',
  '[c]trim=start_frame=264:end_frame=432,setpts=PTS-STARTPTS,tpad=start_mode=clone:start=5[c1]',
  '[a1][b1]xfade=transition=fade:duration=0.416666667:offset=6.291666667[ab]',
  '[ab][c1]xfade=transition=fade:duration=0.416666667:offset=10.791666667,trim=duration=18,format=yuv420p,setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709[out]',
].join(';');
const result = spawnSync(values.ffmpeg, ['-hide_banner', '-y', '-framerate', '24',
  '-i', path.join(frames, '%04d.png'), '-i', path.join(root, '.asset-build/cinema/pride-score.wav'),
  '-filter_complex_threads', '1', '-filter_complex', dissolve,
  '-map', '[out]', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'slow', '-threads', '4',
  '-crf', '18', '-maxrate', '6500k', '-bufsize', '13000k', '-pix_fmt', 'yuv420p',
  '-g', '24', '-keyint_min', '24', '-sc_threshold', '0', '-movflags', '+faststart',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-t', '18',
  temporary], { stdio: 'inherit' });
if (result.status !== 0) throw new Error(`FFmpeg failed: ${result.status}`);
const size = (await stat(temporary)).size;
if (size > 25 * 1024 * 1024) throw new Error(`Movie exceeds 25 MiB: ${size}`);
await rename(temporary, path.join(output, `${name}.mp4`));
await sharp(path.join(frames, '0001.png')).webp({ quality: 91, effort: 6 })
  .toFile(path.join(output, `${name}.webp`));
console.log(`${name}: ${(size / 1024 / 1024).toFixed(2)} MiB with score, dissolves and first-frame poster`);
