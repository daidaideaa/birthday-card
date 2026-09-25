import { runtimeAssetUrl as assetUrl } from "../utils/runtimeAssetUrl";

export type PetVariant = "apricot" | "cream";
export type PetAction = "idle" | "look-left" | "look-right" | "pet" | "happy" | "rest";
export type PetBase = "idle" | "rest";

export const petMedia = {
  poster: (variant: PetVariant) => assetUrl(`cinema/pets/${variant}.webp`),
  clip: (variant: PetVariant, action: PetAction) =>
    assetUrl(`cinema/pets/${variant}-${action}.mp4`),
  loops: (action: PetAction) => action === "idle" || action === "rest",
};

const priority: Record<PetAction, number> = {
  idle: 0, rest: 0, "look-left": 1, "look-right": 1, happy: 2, pet: 3,
};

/** No action queue: a touch wins over a celebration, which wins over gaze. */
export class PetIntent {
  base: PetBase = "idle";
  action: PetAction = "idle";
  private expires = 0;
  private lastGaze = -Infinity;

  request(action: PetAction, now: number): boolean {
    if (now < this.expires && priority[action] <= priority[this.action]) return false;
    if (priority[action] === 1 && now - this.lastGaze < 1600) return false;
    if (priority[action] === 1) this.lastGaze = now;
    this.action = action;
    this.expires = now + (priority[action] ? 2200 : 0);
    return true;
  }

  setBase(base: PetBase, now: number): boolean {
    this.base = base;
    if (priority[this.action] && now < this.expires) return false;
    this.action = base;
    this.expires = 0;
    return true;
  }

  complete(action: PetAction): PetBase | null {
    if (action !== this.action) return null;
    this.action = this.base;
    this.expires = 0;
    return this.base;
  }

  reset(base: PetBase = this.base): void {
    this.base = this.action = base;
    this.expires = 0;
    this.lastGaze = -Infinity;
  }
}

/** Hysteresis keeps the gaze steady near the centre of the screen. */
export function gazeDirection(x: number, previous: -1 | 0 | 1): -1 | 0 | 1 {
  if (x < -0.28) return -1;
  if (x > 0.28) return 1;
  if (Math.abs(x) < 0.12) return 0;
  return previous;
}
