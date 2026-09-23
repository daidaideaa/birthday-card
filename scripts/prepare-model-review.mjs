import fs from "node:fs/promises";
import path from "node:path";
import { io, files } from "./assets/lib.mjs";
// Blender doesn't decode EXT_meshopt_compression; review the exact decoded deliverables.
for (const file of await files("public/models")) {
  const doc = await io.read(file);
  doc
    .getRoot()
    .listExtensionsUsed()
    .filter((e) => e.extensionName === "EXT_meshopt_compression")
    .forEach((e) => e.dispose());
  const dest = path.join(
    ".asset-build/review",
    path.relative("public/models", file),
  );
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await io.write(dest, doc);
}
