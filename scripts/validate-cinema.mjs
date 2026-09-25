import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const root = path.resolve("public");
const errors = [], warnings = [], rows = [];
const ffprobe = process.env.FFPROBE_BIN || "ffprobe";
const available = spawnSync(ffprobe, ["-version"], { encoding: "utf8" });
if (available.error || available.status !== 0) {
  throw Error("ffprobe not found. Add FFmpeg to PATH or set FFPROBE_BIN to its executable.");
}
const contracts = [];
for (const [id, duration] of [["duet", 24], ["pride", 18]]) {
  for (const format of ["landscape", "portrait"]) {
    contracts.push({ file: `cinema/${id}-${format}.mp4`, kind: "film", id, duration, format });
    contracts.push({ file: `cinema/${id}-${format}.webp`, kind: "poster", format });
  }
}
for (const variant of ["apricot", "cream"]) {
  contracts.push({ file: `cinema/pets/${variant}.webp`, kind: "pet-poster" });
  for (const action of ["idle", "look-left", "look-right", "pet", "happy", "rest"])
    contracts.push({ file: `cinema/pets/${variant}-${action}.mp4`, kind: "pet" });
}
function fastStart(bytes) {
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    let size = bytes.readUInt32BE(offset);
    const type = bytes.toString("ascii", offset + 4, offset + 8);
    if (type === "moov") return true;
    if (type === "mdat") return false;
    if (size === 1 && offset + 16 <= bytes.length) size = Number(bytes.readBigUInt64BE(offset + 8));
    if (size < 8) break;
    offset += size;
  }
  return false;
}
for (const contract of contracts) {
  const file = path.resolve(root, contract.file);
  if (!file.startsWith(root + path.sep) || /https?:|\.\./.test(contract.file)) {
    errors.push(`${contract.file}: runtime path must be local to public`);
    continue;
  }
  try {
    const bytes = await fs.readFile(file);
    if (bytes.length > 25 * 1024 * 1024) errors.push(`${contract.file}: exceeds 25 MiB`);
    const row = { file: contract.file, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") };
    if (contract.file.endsWith(".webp")) {
      const meta = await sharp(bytes).metadata();
      Object.assign(row, { width: meta.width, height: meta.height, alpha: meta.hasAlpha });
      if (meta.format !== "webp") errors.push(`${contract.file}: not WebP`);
      if (contract.kind === "pet-poster" && !meta.hasAlpha) errors.push(`${contract.file}: pet poster must have transparency`);
      if (contract.format === "landscape" && meta.width <= meta.height) errors.push(`${contract.file}: expected landscape poster`);
      if (contract.format === "portrait" && meta.width >= meta.height) errors.push(`${contract.file}: expected portrait poster`);
    } else {
      const probe = spawnSync(ffprobe, ["-v", "error", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8" });
      if (probe.status !== 0) throw Error(probe.stderr || "ffprobe failed");
      const meta = JSON.parse(probe.stdout);
      const video = meta.streams.find((stream) => stream.codec_type === "video");
      const audio = meta.streams.find((stream) => stream.codec_type === "audio");
      if (!video) throw Error("no video stream");
      const duration = Number(meta.format.duration);
      const [numerator, denominator] = video.avg_frame_rate.split("/").map(Number);
      Object.assign(row, { width: video.width, height: video.height, duration, fps: numerator / denominator, codec: video.codec_name, audio: audio?.codec_name || null });
      if (video.codec_name !== "h264" || video.pix_fmt !== "yuv420p") errors.push(`${contract.file}: expected H.264 / yuv420p`);
      if (!Number.isFinite(duration) || duration <= 0) errors.push(`${contract.file}: invalid duration`);
      if (!fastStart(bytes)) errors.push(`${contract.file}: moov must precede mdat (+faststart)`);
      if (contract.kind === "film") {
        if (Math.abs(duration - contract.duration) > .3) errors.push(`${contract.file}: expected ${contract.duration}s, got ${duration}s`);
        if (Math.abs(row.fps - 24) > .02) errors.push(`${contract.file}: expected 24fps`);
        if (!audio) errors.push(`${contract.file}: no embedded audio track`);
        else if (audio.codec_name !== "aac") errors.push(`${contract.file}: expected AAC audio`);
        if (contract.format === "landscape" && video.width <= video.height) errors.push(`${contract.file}: expected landscape`);
        if (contract.format === "portrait" && video.width >= video.height) errors.push(`${contract.file}: expected portrait`);
      } else if (video.width !== video.height * 2) errors.push(`${contract.file}: packed color/mask must be two square tiles side by side`);
    }
    rows.push(row);
    console.log(`${contract.file}: ${(bytes.length / 1024).toFixed(0)} KiB`);
  } catch (error) { errors.push(`${contract.file}: ${error.code === "ENOENT" ? "missing" : error.message}`); }
}
async function directoryBytes(directory) {
  let bytes = 0;
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) { errors.push(`${file}: symlinks are not self-contained site assets`); continue; }
    bytes += entry.isDirectory() ? await directoryBytes(file) : (await fs.stat(file)).size;
  }
  return bytes;
}
const publicBytes = await directoryBytes(root);
if (publicBytes > 250 * 1024 * 1024) errors.push(`Public assets exceed 250 MiB: ${(publicBytes / 1024 / 1024).toFixed(1)} MiB`);
const manifest = JSON.parse(await fs.readFile("scripts/cinema/sources.json", "utf8"));
for (const source of [...manifest.sources, ...(manifest.generatedAssets ?? [])]) {
  try {
    const bytes = await fs.readFile(source.localArchive);
    if (createHash("sha256").update(bytes).digest("hex") !== source.sha256) errors.push(`${source.localArchive}: source SHA-256 mismatch`);
  } catch (error) {
    if (error.code !== "ENOENT" || source.required) errors.push(`${source.localArchive}: ${error.message}`);
    // Source archives are intentionally excluded from the website and Git repository.
  }
}
await fs.mkdir("test-results", { recursive: true });
await fs.writeFile("test-results/cinema-assets.json", JSON.stringify({ complete: errors.length === 0, publicBytes, rows, warnings, errors }, null, 2));
for (const warning of warnings) console.warn(`WARNING ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);
console.log(`${rows.length}/${contracts.length} cinema assets inspected; public ${(publicBytes / 1024 / 1024).toFixed(1)} MiB; ${errors.length} errors, ${warnings.length} warnings.`);
if (errors.length) process.exitCode = 1;
