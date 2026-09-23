import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
const run = (command, args, env = {}) => {
  const r = spawnSync(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run(process.execPath, ["scripts/fetch-model-sources.mjs"]);
const blender = process.env.BLENDER_BIN ?? "blender";
const raw = path.resolve(".asset-build/raw");
await fs.mkdir(raw, { recursive: true });
await fs.copyFile(
  "model-sources/grand-piano.glb",
  path.join(raw, "grand-piano.glb"),
);
for (const script of [
  "build_dancers.py",
  "build_teddies.py",
  "build_lions.py",
]) {
  run(
    blender,
    [
      "--background",
      "--threads",
      "3",
      "--python-exit-code",
      "1",
      "--python",
      "scripts/models/" + script,
      ...(script === "build_teddies.py" ? ["--", "--no-preview"] : []),
    ],
    { MODEL_OUT: raw, ASSET_PREVIEW: "0", JAZZ_QA_FRAMES: "" },
  );
}
run(process.execPath, ["scripts/optimize-assets.mjs"]);
run(process.execPath, ["scripts/validate-assets.mjs"]);
