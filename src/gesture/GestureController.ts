import type { GestureRecognizer } from "@mediapipe/tasks-vision";
import { GestureStabilizer, type HandGesture } from "./gestureTypes";
export class GestureController {
  private recognizer?: GestureRecognizer;
  private stream?: MediaStream;
  private timer?: number;
  private deadline?: number;
  private stopped = false;
  private lastVideoTime = -1;
  private stabilizer = new GestureStabilizer();
  constructor(
    private video: HTMLVideoElement,
    private onTarget: (open: boolean) => void,
    private onStatus: (text: string) => void,
    private onFailure: () => void,
  ) {}
  async start() {
    this.deadline = window.setTimeout(() => this.fail(), 25000);
    try {
      if (!navigator.mediaDevices?.getUserMedia)
        throw new Error("Camera unavailable");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 480 },
          height: { ideal: 360 },
          frameRate: { ideal: 20, max: 24 },
        },
      });
      if (this.stopped) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      this.video.srcObject = stream;
      await this.video.play();
      if (this.stopped) return;
      const { FilesetResolver, GestureRecognizer } =
        await import("@mediapipe/tasks-vision");
      if (this.stopped) return;
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm",
      );
      if (this.stopped) return;
      const recognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
        cannedGesturesClassifierOptions: {
          scoreThreshold: 0.65,
          categoryAllowlist: ["Open_Palm", "Closed_Fist"],
        },
      });
      if (this.stopped) {
        recognizer.close();
        return;
      }
      this.recognizer = recognizer;
      clearTimeout(this.deadline);
      this.onStatus("Camera ready");
      this.timer = window.setInterval(this.infer, 66);
      document.addEventListener("visibilitychange", this.visibility);
    } catch {
      if (!this.stopped) this.fail();
    }
  }
  private visibility = () => {
    this.stabilizer.reset();
  };
  private infer = () => {
    if (this.stopped || document.hidden || !this.recognizer) return;
    if (this.stream?.getVideoTracks()[0]?.readyState === "ended") {
      this.fail();
      return;
    }
    if (
      this.video.readyState < 2 ||
      this.video.currentTime === this.lastVideoTime
    )
      return;
    this.lastVideoTime = this.video.currentTime;
    try {
      const now = performance.now();
      const result = this.recognizer.recognizeForVideo(this.video, now);
      const best = result.gestures[0]?.[0];
      const gesture: HandGesture =
        best?.categoryName === "Open_Palm"
          ? "Open_Palm"
          : best?.categoryName === "Closed_Fist"
            ? "Closed_Fist"
            : "None";
      this.onStatus(
        gesture === "Open_Palm"
          ? "Open palm detected"
          : gesture === "Closed_Fist"
            ? "Closed fist detected"
            : result.landmarks.length
              ? "Show an open palm or a closed fist"
              : "No hand",
      );
      const target = this.stabilizer.update(gesture, best?.score ?? 0, now);
      if (target !== null) this.onTarget(target);
    } catch {
      this.fail();
    }
  };
  private fail() {
    this.stop();
    this.onFailure();
  }
  stop() {
    this.stopped = true;
    clearInterval(this.timer);
    clearTimeout(this.deadline);
    document.removeEventListener("visibilitychange", this.visibility);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.video.pause();
    this.video.srcObject = null;
    this.recognizer?.close();
    this.recognizer = undefined;
    this.stabilizer.reset();
  }
}
