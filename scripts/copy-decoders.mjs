import fs from "node:fs/promises";
await fs.mkdir("public/basis", { recursive: true });
for (const file of ["basis_transcoder.js", "basis_transcoder.wasm"])
  await fs.copyFile(
    "node_modules/three/examples/jsm/libs/basis/" + file,
    "public/basis/" + file,
  );

await fs.copyFile(
  "node_modules/three/LICENSE",
  "public/basis/THREE-LICENSE.txt",
);
