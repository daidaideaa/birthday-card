import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  base: "/birthday-card/",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: { three: ["three"], vision: ["@mediapipe/tasks-vision"] },
      },
    },
  },
});
