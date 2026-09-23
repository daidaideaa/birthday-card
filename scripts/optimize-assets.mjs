import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { EXTMeshoptCompression } from "@gltf-transform/extensions";
import { textureCompress } from "@gltf-transform/functions";
import sharp from "sharp";
import { io, files, contract, assertLocalGLB } from "./assets/lib.mjs";
const input = process.argv[2] ?? ".asset-build/raw";
const output = process.argv[3] ?? "public/models";
if (path.resolve(input) === path.resolve(output))
  throw Error(
    "Keep raw sources separate; never recompress final assets in place.",
  );
for (const file of await files(input)) {
  const bytes = await fs.readFile(file);
  assertLocalGLB(bytes, file);
  const doc = await io.readBinary(bytes),
    before = contract(doc);
  // Retain float attributes and every animation sample: no simplify/quantize/resample.
  await doc.transform(
    textureCompress({
      encoder: sharp,
      resize: [1024, 1024],
      slots: /^(?!normalTexture).*$/,
    }),
  );
  doc
    .createExtension(EXTMeshoptCompression)
    .setRequired(true)
    .setEncoderOptions({
      method: EXTMeshoptCompression.EncoderMethod.QUANTIZE,
    });
  const dest = path.join(output, path.relative(input, file));
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const temp = dest + ".pending.glb";
  try {
    await io.write(temp, doc);
    // KTX2 is opt-in until a runtime review accepts the texture change. CLI fails if toktx is absent.
    if (process.env.ASSET_KTX2 === "1") {
      const cli = path.resolve("node_modules/@gltf-transform/cli/bin/cli.js");
      const result = spawnSync(
        process.execPath,
        [
          cli,
          "uastc",
          temp,
          temp + ".ktx.glb",
          "--slots",
          "{normalTexture,baseColorTexture}",
          "--level",
          "2",
          "--rdo",
          "--zstd",
          "18",
        ],
        { stdio: "inherit" },
      );
      if (result.status !== 0)
        throw Error(
          "KTX2 encode failed; install pinned KTX-Software/toktx and glTF Transform CLI.",
        );
      const encoded = await io.read(temp + ".ktx.glb");
      encoded
        .createExtension(EXTMeshoptCompression)
        .setRequired(true)
        .setEncoderOptions({
          method: EXTMeshoptCompression.EncoderMethod.QUANTIZE,
        });
      await io.write(temp, encoded);
      await fs.rm(temp + ".ktx.glb");
    }
    const decoded = await io.read(temp);
    assert.deepEqual(
      contract(decoded),
      before,
      `${file}: skin/animation/morph/material changed`,
    );
    const after = (await fs.stat(temp)).size;
    if (after > bytes.length * 1.05)
      throw Error(`${file}: optimized output grew by more than 5%`);
    await fs.rename(temp, dest);
    console.log(
      `${path.relative(input, file)}: ${bytes.length} → ${after} bytes`,
    );
  } finally {
    await fs.rm(temp, { force: true });
    await fs.rm(temp + ".ktx.glb", { force: true });
  }
}
