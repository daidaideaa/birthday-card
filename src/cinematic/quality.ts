export type QualityTier = "high" | "balanced" | "low";
export function chooseQuality(input: {
  mobile: boolean;
  cores: number;
  memory?: number;
  reduced: boolean;
  saveData?: boolean;
}): QualityTier {
  if (
    input.reduced ||
    input.saveData ||
    input.cores <= 2 ||
    (input.memory !== undefined && input.memory <= 2)
  )
    return "low";
  return input.mobile || input.cores <= 4 ? "balanced" : "high";
}
export function qualityPolicy() {
  const device = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const tier = chooseQuality({
    mobile: matchMedia("(pointer: coarse)").matches || innerWidth < 700,
    cores: device.hardwareConcurrency || 4,
    memory: device.deviceMemory,
    reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: device.connection?.saveData,
  });
  return {
    tier,
    pixelRatio: Math.min(
      devicePixelRatio || 1,
      tier === "high" ? 1.8 : tier === "balanced" ? 1.35 : 1,
    ),
    shadowSize: tier === "high" ? 1024 : 512,
    shadows: tier !== "low",
    bloom: tier !== "low",
    particleScale: tier === "high" ? 1 : tier === "balanced" ? 0.6 : 0.3,
  };
}
