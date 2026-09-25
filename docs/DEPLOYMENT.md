# GitHub Pages + Cloudflare R2 发布

2026-09-25 用户最新指令覆盖原实施方案的网站托管选择：保留 `https://daidaideaa.github.io/birthday-card/`，不创建 Cloudflare Pages 站点。代码、HTML/JS/CSS、小资源放 GitHub Pages；新版本大资源采用 R2。当前旧版仍在使用的 cinema 与模型检查保留。

## 本地与共享契约 v1

使用 Node 22+、`npm ci`。`npm run dev` 或 `npm run build` 自动从批准锁文件准备媒体清单；默认 base 为 `/birthday-card/`，`VITE_APP_BASE=/` 可验证根路径。`.env.example` 仅含公开配置。

```text
assets/source-manifest.json            制作来源/许可/依赖
assets/releases/<release-id>.json      实际字节清单（不可变）
assets/release.lock.json               批准版本和本地样章来源
public/asset-manifest.json             每次构建生成，不手工编辑
public/media/releases/<release-id>/    本地生成，不提交
```

Claude 接口：先 `await loadAssetManifest()`，再调用 `getAssetUrl("invitation.background", "standard")`。函数位于 `src/utils/mediaUrl.ts`，类型及运行时验证位于 `src/assets/manifest.ts`。缺少 lite 回退 standard，缺少逻辑 ID 明确报错。清单只加载一次，不自动下载所有媒体。原 `assetUrl()` 仍仅服务本地静态路径。

示意 SVG 只是可重建的接口例子，不能称为新美术完整样章。当前实际画面沿用已存在的前端，36 项既有媒体经 `runtimeAssetUrl` 适配器接入 R2，逻辑映射见 `assets/legacy-paths.json`，来源登记见 `assets/runtime-source-manifest.json`。临时旧 MP4 使用契约的 data 类型；新美术直接使用 image/atlas/model/audio 等类型。Claude 完成新资源后按章节接入逻辑 ID，不保留新场景对旧路径的依赖。

## 资产制作、发布与门禁

```sh
npm run assets:prepare -- --release demo-contract-v1 --source assets/demo --mode local
npm run assets:check -- --manifest assets/releases/demo-contract-v1.json --source assets/demo
npm run assets:publish -- --release demo-contract-v1 --source assets/demo --dry-run
# 明确指定新运行包；下面的 apply 才执行上传
npm run assets:publish -- --release <id> --source .asset-build/runtime/<id> --apply
npm run assets:verify-remote -- --release <id> --full
npm run assets:prepare -- --release <id> --mode remote
npm run build
npm run deploy:check -- --dir dist
```

`--source-manifest` 可选其他来源清单。新发布不能覆盖既有 release。默认 dry-run；不会遍历桶、删除对象或上传母版。发布器逐对象限并发为 1，最多 3 次请求尝试，检查 SHA-256、大小和 MIME 后最后写 ready。S3 条件 PUT 防止并发覆盖。每次 UI 发布使用 ready+HEAD 检查，首次使用 `--full` 验证完整字节。生产不允许 ASSET_RELEASE_ID 与 lock 不一致。必须先公开入口校验成功，再提交更新后的 lock。

R2 本机会话变量：`R2_BUCKET_NAME`、`R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`。R2 上传凭证只授予专用桶 Object Read & Write，不写入 Git 或 VITE 变量。本机母版不在 Actions runner，必须先在本机发布。仅修改 UI 时复用已有 release。

本次初始发布使用已有交互授权的 Wrangler OAuth，命令添加 `--transport wrangler --apply`，无需创建或保存另一套 S3 密钥。该途径以本机排他锁和逐对象存在性/字节检查避免覆盖；只允许同一时间一位本地发布者，不能用于多机并发发布。S3 默认发布器使用条件 PUT，适合正式多发布者场景。OAuth 授权是账户级，包括 User Read、Account Read、Workers Write、Worker Scripts Write、后台刷新，不是假称的桶级授权；以后 CI 仅使用专用桶的 S3 凭证。

本地 `VITE_ASSET_BASE_URL` 留空时使用本站媒体。生产工作流默认使用 `https://birthday-card-media.daidaidefish.workers.dev/birthday-card/`，可通过同名 GitHub 仓库变量覆盖；`SITE_ORIGIN` 是 `https://daidaideaa.github.io`，不能含 `/birthday-card/`。正式配置禁止 r2.dev 和 S3 endpoint。独立 Worker 网关接私有 R2，只放行编译进去的 release 清单中的对象，无桶列表和写接口。网关请求计入 Workers 配额，每次有效读取最多一次 R2 操作；公开读取网关不是私人鉴权。升级媒体 release 时先更新网关允许清单，并保留前两个已批准 release 的允许路径，再上传/验证媒体，最后更新站点 lock。

`.github/workflows/pages.yml` 是唯一网站生产发布链。它保留现有 main push 发布，显式注入 `/birthday-card/`，保留类型、单测、模型和影片校验，再检查产物、发布并执行 HTTP smoke。PR CI 不获得生产写凭证。Actions 均固定到实际核验的完整 commit。`github-pages` 环境和 OIDC 继续使用 GitHub 自有部署机制，R2 写凭证不需要放进日常网站发布步骤。

## CORS、缓存与费用

GitHub Pages 无法使用 Cloudflare 的 `_headers` 自定义响应头，不把文件写入仓库后冒充生效。媒体网关已经返回允许本站 Origin 的 CORS、正确 MIME、GET/HEAD、ETag、Range、nosniff；不允许前端上传和删除。200/206/304/404/405/416 与预检 204 已实测。Range 同时携带 If-Range 时返回完整 200；多段 Range 不支持，返回 416。

版本化媒体 `Cache-Control: public, max-age=31536000, immutable`；目前依靠浏览器缓存，未声称 Worker 边缘 Cache API 命中。HTML/根 manifest 使用 GitHub Pages 策略；运行时 fetch 清单强制重新验证。noindex 不是访问保护；私人图片、录音、书信不应进入公开 demo 发布器。

2026-09-25 核验：[R2 官方定价](https://developers.cloudflare.com/r2/pricing/)：Standard 免费层每月 10 GB-month、100 万 A、1000 万 B；超额分别 $0.015/GB-month、$4.50/百万 A、$0.36/百万 B，公网出口免费。免费层不是硬上限。用户已亲自完成付款绑定，明确接受超额收费风险。已设置启用的 $1 账户用量邮件提醒（名称 Birthday card R2 $1 budget alert），接收人为当前 Cloudflare 账户邮箱；这是账户级总用量提醒，不是单桶计量或自动停费功能。[官方预算提醒说明](https://developers.cloudflare.com/billing/manage/budget-alerts/)。不自动升级套餐。

首轮媒体版本 `runtime-20260925-v1` 共 36 项，48,863,156 字节（约 46.6 MiB）；ready 为额外小对象。网站远程模式产物约 2.06 MiB、33 文件，旧媒体仍在 Git 中作为本地回退与许可来源，不再复制到生产 dist。生产从同一 manifest 固定版本读取，加载时不扫描桶。当前只发布一个版本，不自动清理；以后至少保留当前及前两个批准版本。

## 回滚

保留正式版本及前两个批准 release，不自动清理桶。GitHub Pages 回滚应重新运行上一个已验证提交的发布工作流或提交经确认的代码/lock 回退；不能只修改远端 latest。先验证旧 release key 存在且可读，再发布其固定 manifest。尚无 R2 正式发布时，现有本地媒体随历史 GitHub Pages 构建保留。

HTTP smoke 不代替真实 iPhone Safari 的图片/GLB/音频解码、冷缓存网络和手势验收。新 2D 狮子动画尚未由美术任务交付，部署任务不声称它已存在。
