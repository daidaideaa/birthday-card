import fs from "node:fs/promises";
import path from "node:path";
import { validateBytes } from "gltf-validator";
import { io, files, report, assertLocalGLB } from "./assets/lib.mjs";
const root = process.argv[2] ?? "public/models";
const expected = {
  "jazz-duo.glb": ["Scene"],
  "teddy-apricot.glb": ["Idle", "Curious", "Happy", "Rest"],
  "teddy-cream.glb": ["Idle", "Curious", "Happy", "Rest"],
  "lion-cub.glb": ["Idle", "Walk", "Roar", "Bow"],
  "father-lion.glb": ["Idle", "Walk", "Roar", "Bow"],
};
const rows = [];
for (const file of await files(root)) {
  const bytes = await fs.readFile(file);
  assertLocalGLB(bytes, file);
  const doc = await io.readBinary(bytes),
    r = report(doc, bytes.length);
  if (
    r.bytes > 8 * 1024 * 1024 ||
    r.triangles > 150000 ||
    r.maxTexture > 2048 ||
    r.meshes > 100
  )
    throw Error(`${file}: web asset budget exceeded`);
  for (const b of r.bounds)
    if (
      ![...b.min, ...b.max].every(Number.isFinite) ||
      b.max.some((v, i) => v - b.min[i] > 50)
    )
      throw Error(`${file}: invalid or huge model bounds`);
  const clips = expected[path.basename(file)];
  if (
    clips &&
    (!r.skins ||
      !clips.every((name) =>
        r.animations.some((a) => a === name || a.startsWith(name + ".")),
      ))
  )
    throw Error(`${file}: missing skin/animation contract`);
  if (path.basename(file) === "jazz-duo.glb" && !r.morphTargets)
    throw Error("Jazz skirt morphs missing");
  // Validator 不支持 meshopt 数据检查时，先用注册过的解码器展开再验证。
  doc
    .getRoot()
    .listExtensionsUsed()
    .filter((e) => e.extensionName === "EXT_meshopt_compression")
    .forEach((e) => e.dispose());
  const validation = await validateBytes(await io.writeBinary(doc), {
    uri: file,
    maxIssues: 30,
  });
  if (validation.issues.numErrors)
    throw Error(`${file}: ${JSON.stringify(validation.issues.messages)}`);
  rows.push({ file, ...r, warnings: validation.issues.numWarnings });
  console.log(
    `${file}: ${(r.bytes / 1024).toFixed(0)} KiB | ${r.meshes} meshes | ${r.triangles} tris | ${r.textures} textures/${r.maxTexture}px | ${r.skins} skins/${r.joints} joints | ${r.morphTargets} morphs | ${r.animations.join(", ") || "static"} | ${validation.issues.numWarnings} warnings`,
  );
}
for (const required of [
  "grand-piano.glb",
  "jazz-duo.glb",
  "teddy-apricot.glb",
  "teddy-cream.glb",
  "lions/lion-cub.glb",
  "lions/father-lion.glb",
]) {
  if (
    !rows.some(
      (row) =>
        path.relative(root, row.file).split(path.sep).join("/") === required,
    )
  )
    throw Error(`Missing required runtime model: ${required}`);
}
await fs.mkdir("test-results", { recursive: true });
await fs.writeFile("test-results/assets.json", JSON.stringify(rows, null, 2));
