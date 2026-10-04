import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

export default defineConfig(({ mode, command }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const base = env.VITE_APP_BASE || "/birthday-card/";
  if (!new RegExp("^/(?:[A-Za-z0-9_-]+/)*$").test(base)) throw Error("VITE_APP_BASE 路径格式无效");
  return {
    base,
    publicDir: command === "serve" ? "public" : false,
    plugins: [react(), {
      name: "memory-book-public-assets",
      writeBundle(options) {
        const output = path.resolve(options.dir || "dist");
        fs.cpSync("public/memory-book", path.join(output, "memory-book"), { recursive: true });
        fs.copyFileSync("src/memory-book/vendor/sandkit/LICENSE", path.join(output, "memory-book", "SandKit-LICENSE.txt"));
      },
    }],
  };
});
