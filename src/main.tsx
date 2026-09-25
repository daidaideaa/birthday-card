import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./cinematic.css";
import { loadAssetManifest } from "./utils/mediaUrl";
const host = document.getElementById("root")!;
async function start() {
  if (import.meta.env.VITE_ASSET_BASE_URL) await loadAssetManifest();
  createRoot(host).render(<App />);
}
void start().catch(() => {
  host.textContent = "资源清单暂时无法加载，请检查网络后刷新重试。";
});
