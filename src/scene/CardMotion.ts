import { easeInOutCubic } from "../utils/easing";
export type CardState = "CLOSED" | "OPENING" | "OPEN" | "CLOSING";
export class CardMotion {
  state: CardState = "CLOSED";
  progress = 0;
  targetOpen = false;
  surpriseArmed = true;
  private start = 0;
  private elapsed = 0;
  private duration = 1;
  constructor(
    private onSurprise: () => void,
    private onState: (state: CardState) => void,
  ) {}
  reset() {
    this.state = "CLOSED";
    this.progress = 0;
    this.targetOpen = false;
    this.surpriseArmed = true;
    this.start = 0;
    this.elapsed = 0;
    this.duration = 1;
    this.onState(this.state);
  }
  setTarget(open: boolean) {
    if (open === this.targetOpen) return;
    this.targetOpen = open;
    this.start = this.progress;
    this.elapsed = 0;
    this.duration = Math.max(
      0.24,
      (open ? 1.05 : 0.8) * Math.abs(Number(open) - this.start),
    );
    this.state = open ? "OPENING" : "CLOSING";
    this.onState(this.state);
  }
  update(dt: number) {
    if (this.state !== "OPENING" && this.state !== "CLOSING") return;
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.duration);
    this.progress =
      this.start + (Number(this.targetOpen) - this.start) * easeInOutCubic(t);
    if (this.targetOpen && this.progress >= 0.42 && this.surpriseArmed) {
      this.surpriseArmed = false;
      this.onSurprise();
    }
    if (t === 1) {
      this.state = this.targetOpen ? "OPEN" : "CLOSED";
      if (this.state === "CLOSED") this.surpriseArmed = true;
      this.onState(this.state);
    }
  }
}
