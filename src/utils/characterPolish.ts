import * as THREE from "three";

/**
 * Shared helpers for making the original character meshes read as soft,
 * cinematic creatures at runtime: richer PBR materials, fresnel fur fuzz,
 * glow sprites and spring dynamics. No new model inputs are required.
 */

/** Copy a loaded material into a MeshPhysicalMaterial, preserving every map. */
export function toPhysical(
  source: THREE.Material,
): THREE.MeshPhysicalMaterial {
  const from = source as THREE.MeshStandardMaterial;
  const next = new THREE.MeshPhysicalMaterial({
    name: from.name,
    color: from.color ? from.color.clone() : new THREE.Color(0xffffff),
    map: from.map ?? null,
    normalMap: from.normalMap ?? null,
    normalScale: from.normalScale ? from.normalScale.clone() : undefined,
    roughnessMap: from.roughnessMap ?? null,
    metalnessMap: from.metalnessMap ?? null,
    aoMap: from.aoMap ?? null,
    aoMapIntensity: from.aoMapIntensity ?? 1,
    emissive: from.emissive ? from.emissive.clone() : new THREE.Color(0),
    emissiveMap: from.emissiveMap ?? null,
    emissiveIntensity: from.emissiveIntensity ?? 1,
    alphaMap: from.alphaMap ?? null,
    side: from.side,
    transparent: from.transparent,
    opacity: from.opacity,
    depthWrite: from.depthWrite,
    vertexColors: from.vertexColors,
    flatShading: from.flatShading,
  });
  next.roughness = from.roughness ?? 0.8;
  next.metalness = from.metalness ?? 0;
  return next;
}

export type FuzzOptions = {
  /** Rim colour, usually a warm backlight tint. */
  color: THREE.ColorRepresentation;
  /** Overall strength; 0.2–0.5 reads as soft plush. */
  strength?: number;
  /** Fresnel exponent; higher = tighter silhouette band. */
  power?: number;
};

/**
 * Adds a view-dependent rim glow to a material so silhouettes read as fur
 * or fabric catching the key light instead of hard plastic.
 */
export function injectFuzz(
  material: THREE.MeshPhysicalMaterial,
  { color, strength = 0.35, power = 2.6 }: FuzzOptions,
) {
  const tint = new THREE.Color(color);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.fuzzColor = { value: tint };
    shader.uniforms.fuzzStrength = { value: strength };
    shader.uniforms.fuzzPower = { value: power };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 fuzzColor;
        uniform float fuzzStrength;
        uniform float fuzzPower;`,
      )
      .replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
        {
          float fuzzFresnel = pow(
            1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0),
            fuzzPower
          );
          totalEmissiveRadiance += fuzzColor * (fuzzFresnel * fuzzStrength);
        }`,
      );
  };
  material.needsUpdate = true;
}

/** Soft radial glow texture for catchlights, bokeh, dust and light shafts. */
export function makeGlowTexture(
  size = 64,
  inner = "rgba(255,255,255,1)",
  mid = "rgba(255,255,255,0.42)",
  outer = "rgba(255,255,255,0)",
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  gradient.addColorStop(0, inner);
  gradient.addColorStop(0.38, mid);
  gradient.addColorStop(1, outer);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Horizontal streak texture for anamorphic-feeling light shafts. */
export function makeShaftTexture(width = 128, height = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  const horizontal = ctx.createLinearGradient(0, 0, width, 0);
  horizontal.addColorStop(0, "rgba(255,255,255,0)");
  horizontal.addColorStop(0.5, "rgba(255,255,255,0.85)");
  horizontal.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = horizontal;
  ctx.fillRect(0, 0, width, height);
  const vertical = ctx.createLinearGradient(0, 0, 0, height);
  vertical.addColorStop(0, "rgba(0,0,0,1)");
  vertical.addColorStop(0.22, "rgba(255,255,255,0.85)");
  vertical.addColorStop(0.55, "rgba(255,255,255,0.5)");
  vertical.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-in";
  ctx.fillStyle = vertical;
  ctx.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Tiny critically-damped-ish spring for procedural squash and ear jiggle. */
export class Spring {
  value = 0;
  private velocity = 0;
  constructor(
    private stiffness = 110,
    private damping = 11,
  ) {}
  impulse(amount: number) {
    this.velocity += amount;
  }
  update(dt: number) {
    const clamped = Math.min(dt, 0.05);
    const acceleration =
      -this.stiffness * this.value - this.damping * this.velocity;
    this.velocity += acceleration * clamped;
    this.value += this.velocity * clamped;
    if (Math.abs(this.value) < 1e-4 && Math.abs(this.velocity) < 1e-4) {
      this.value = 0;
      this.velocity = 0;
    }
    return this.value;
  }
  reset() {
    this.value = 0;
    this.velocity = 0;
  }
}
