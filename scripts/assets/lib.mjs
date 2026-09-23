import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { getBounds } from "@gltf-transform/functions";
await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
export const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.decoder": MeshoptDecoder,
    "meshopt.encoder": MeshoptEncoder,
  });
export async function files(directory) {
  const result = [];
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) result.push(...(await files(file)));
    else if (file.endsWith(".glb")) result.push(file);
  }
  return result.sort();
}
const digest = (accessor, triangles = false) => {
  if (!accessor) return null;
  const values = Array.from(accessor.getArray());
  // glTF may narrow integer storage; Meshopt may cyclically rotate a triangle's
  // indices. Normalize those equivalent encodings, preserving order and winding.
  if (triangles)
    for (let i = 0; i < values.length; i += 3) {
      const tri = values.slice(i, i + 3),
        start = tri.indexOf(Math.min(...tri));
      values.splice(i, 3, ...tri.slice(start), ...tri.slice(0, start));
    }
  return createHash("sha256")
    .update(Buffer.from(new Float64Array(values).buffer))
    .digest("hex");
};
// Match glTF Transform’s omission of default TRS components within 1e-5.
// Geometry, skin matrices and animation accessors remain exact comparisons.
const canonicalTRS = (values) =>
  values.map((v) => (Math.abs(v) < 1e-5 ? 0 : Math.abs(v - 1) < 1e-5 ? 1 : v));
export function contract(doc) {
  const r = doc.getRoot();
  return {
    nodes: r.listNodes().map((n) => ({
      name: n.getName(),
      translation: canonicalTRS(n.getTranslation()),
      rotation: canonicalTRS(n.getRotation()),
      scale: canonicalTRS(n.getScale()),
      children: n.listChildren().map((c) => c.getName()),
    })),
    skins: r.listSkins().map((s) => ({
      name: s.getName(),
      joints: s.listJoints().map((j) => j.getName()),
      matrices: Array.from(s.getInverseBindMatrices()?.getArray() ?? []),
    })),
    animations: r.listAnimations().map((a) => ({
      name: a.getName(),
      channels: a.listChannels().map((c) => ({
        node: c.getTargetNode()?.getName(),
        path: c.getTargetPath(),
        interpolation: c.getSampler()?.getInterpolation(),
        times: Array.from(c.getSampler()?.getInput()?.getArray() ?? []),
        values: Array.from(c.getSampler()?.getOutput()?.getArray() ?? []),
      })),
    })),
    meshes: r.listMeshes().map((m) => ({
      name: m.getName(),
      weights: m.getWeights(),
      morphs: m.listPrimitives().map((p) => p.listTargets().length),
      targetNames: m.getExtras().targetNames ?? [],
      data: m.listPrimitives().map((p) => ({
        indices: digest(p.getIndices(), true),
        attributes: p
          .listSemantics()
          .sort()
          .map((s) => [s, digest(p.getAttribute(s))]),
        targets: p.listTargets().map((t) =>
          t
            .listSemantics()
            .sort()
            .map((s) => [s, digest(t.getAttribute(s))]),
        ),
      })),
    })),
    materials: r.listMaterials().map((m) => ({
      name: m.getName(),
      color: m.getBaseColorFactor(),
      roughness: m.getRoughnessFactor(),
      metallic: m.getMetallicFactor(),
      alpha: m.getAlphaMode(),
    })),
  };
}
export function report(doc, bytes) {
  const root = doc.getRoot();
  const bounds = root.listScenes().map((s) => getBounds(s));
  return {
    bytes,
    meshes: root.listMeshes().length,
    triangles: root
      .listMeshes()
      .reduce(
        (n, m) =>
          n +
          m
            .listPrimitives()
            .reduce(
              (v, p) =>
                v +
                (p.getIndices()?.getCount() ??
                  p.getAttribute("POSITION")?.getCount() ??
                  0) /
                  3,
              0,
            ),
        0,
      ),
    textures: root.listTextures().length,
    maxTexture: Math.max(
      0,
      ...root.listTextures().flatMap((t) => t.getSize() ?? [0, 0]),
    ),
    skins: root.listSkins().length,
    joints: root.listSkins().reduce((n, s) => n + s.listJoints().length, 0),
    morphTargets: root
      .listMeshes()
      .reduce(
        (n, m) =>
          n +
          m.listPrimitives().reduce((v, p) => v + p.listTargets().length, 0),
        0,
      ),
    animations: root.listAnimations().map((a) => a.getName()),
    bounds,
    extensions: root.listExtensionsUsed().map((e) => e.extensionName),
  };
}
export function assertLocalGLB(bytes, label) {
  if (
    bytes.readUInt32LE(0) !== 0x46546c67 ||
    bytes.readUInt32LE(4) !== 2 ||
    bytes.readUInt32LE(8) !== bytes.length
  )
    throw Error(`${label}: invalid GLB header/length`);
  const json = JSON.parse(
    bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString(),
  );
  for (const entry of [...(json.buffers ?? []), ...(json.images ?? [])])
    if (entry.uri && !entry.uri.startsWith("data:"))
      throw Error(`${label}: external resource ${entry.uri}`);
  return json;
}
