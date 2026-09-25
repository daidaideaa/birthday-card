/** Encode an authored frame sequence and its synchronous score for static hosting. */
import { parseArgs } from 'node:util';
import { spawnSync } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const { values } = parseArgs({ options: {
  ffmpeg: { type: 'string' }, name: { type: 'string' }, score: { type: 'string' },
  poster: { type: 'string', default: '0001' }, fps: { type: 'string', default: '24' },
} });
if (!values.ffmpeg || !values.name || !values.score) throw new Error('Expected --ffmpeg executable --name scene-format --score wav-path');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const frames = path.join(root, '.asset-build/cinema', values.name);
const output = path.join(root, 'public/cinema');
await mkdir(output, { recursive: true });
const result = spawnSync(values.ffmpeg, ['-hide_banner', '-y', '-framerate', values.fps,
  '-i', path.join(frames, '%04d.png'), '-i', path.resolve(values.score),
  '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'libx264', '-preset', 'slow',
  '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setparams=range=limited:color_primaries=bt709:color_trc=bt709:colorspace=bt709',
  '-crf', '18', '-maxrate', '6500k', '-bufsize', '13000k', '-pix_fmt', 'yuv420p',
  '-g', '24', '-keyint_min', '24', '-sc_threshold', '0', '-movflags', '+faststart',
  '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
  '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-shortest',
  path.join(output, `${values.name}.mp4`)], { stdio: 'inherit' });
if (result.status !== 0) throw new Error(`FFmpeg failed: ${result.status}`);
await sharp(path.join(frames, `${values.poster}.png`)).webp({ quality: 91, effort: 6 })
  .toFile(path.join(output, `${values.name}.webp`));
const size = (await stat(path.join(output, `${values.name}.mp4`))).size;
if (size > 25 * 1024 * 1024) throw new Error(`Movie exceeds its 25 MiB budget: ${size}`);
console.log(`${values.name}: ${(size / 1024 / 1024).toFixed(2)} MiB, poster ready`);
