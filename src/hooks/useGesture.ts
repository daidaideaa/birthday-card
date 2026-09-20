import { useCallback, useEffect, useRef, useState } from "react";
import { GestureController } from "../gesture/GestureController";
export function useGesture(onTarget: (open: boolean) => void, enabled = true) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controller = useRef<GestureController | null>(null);
  const [status, setStatus] = useState("摄像头已关闭");
  const [mode, setMode] = useState<"off" | "loading" | "ready" | "fallback">(
    "off",
  );
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const targetRef = useRef(onTarget);
  targetRef.current = onTarget;
  const stop = useCallback(() => {
    controller.current?.stop();
    controller.current = null;
    setMode("fallback");
    setStatus("摄像头已关闭");
  }, []);
  const start = useCallback(() => {
    if (!videoRef.current) return;
    controller.current?.stop();
    setMode("loading");
    setStatus("正在准备手势识别…");
    const next = new GestureController(
      videoRef.current,
      (open) => targetRef.current(open),
      (text) => {
        setStatus(text);
        setMode("ready");
      },
      () => {
        setMode("fallback");
        setStatus("暂时无法使用摄像头，你仍可以点击打开贺卡。");
      },
    );
    next.setEnabled(enabledRef.current);
    controller.current = next;
    void next.start();
  }, []);
  useEffect(() => controller.current?.setEnabled(enabled), [enabled]);
  useEffect(() => () => controller.current?.stop(), []);
  return { videoRef, status, mode, start, stop };
}
