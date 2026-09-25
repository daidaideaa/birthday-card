import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const base = env.VITE_APP_BASE || "/birthday-card/";
  if (!/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) throw Error("VITE_APP_BASE 必须是 / 或 /birthday-card/ 形式的站点路径");
  return {
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"], vision: ["@mediapipe/tasks-vision"] },
      },
    },
  },
};
});
