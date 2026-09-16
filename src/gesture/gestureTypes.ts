export type HandGesture = "Open_Palm" | "Closed_Fist" | "None";
export class GestureStabilizer {
  private candidate: HandGesture = "None";
  private since = 0;
  private lastTime = -Infinity;
  reset() {
    this.candidate = "None";
    this.since = 0;
    this.lastTime = -Infinity;
  }
  update(gesture: HandGesture, score: number, time: number): boolean | null {
    if (gesture === "None" || score < 0.72) {
      this.reset();
      return null;
    }
    if (gesture !== this.candidate || time - this.lastTime > 250) {
      this.candidate = gesture;
      this.since = time;
    }
    this.lastTime = time;
    return time - this.since >= 200 ? gesture === "Open_Palm" : null;
  }
}
