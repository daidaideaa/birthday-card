import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
const sources = JSON.parse(
  await fs.readFile("scripts/models/sources.json", "utf8"),
);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const source of sources) {
  const dest = path.join("model-sources", source.path);
  if (
    await fs
      .readFile(dest)
      .then((b) => hash(b) === source.sha256)
      .catch(() => false)
  ) {
    console.log("cached", source.path);
    continue;
  }
  const response = await fetch(source.url, {
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw Error(`${source.path}: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== source.sha256)
    throw Error(`${source.path}: checksum mismatch`);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, bytes);
  console.log("downloaded", source.path);
}
