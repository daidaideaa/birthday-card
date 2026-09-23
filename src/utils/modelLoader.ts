import type { WebGLRenderer } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { assetUrl } from "./assetUrl";

export function createModelLoader(renderer: WebGLRenderer) {
  const ktx = new KTX2Loader()
    .setTranscoderPath(assetUrl("basis/"))
    .setWorkerLimit(1)
    .detectSupport(renderer);
  return {
    loader: new GLTFLoader()
      .setMeshoptDecoder(MeshoptDecoder)
      .setKTX2Loader(ktx),
    dispose: () => ktx.dispose(),
  };
}
