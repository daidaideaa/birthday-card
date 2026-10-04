# 发布与恢复

## 当前 GitHub Pages

网站：https://daidaideaa.github.io/birthday-card/ 。当前入口是 `src/main.tsx` → `src/memory-book/MemoryGift.tsx`；React、TypeScript、Vite、Canvas、Three.js 与本地 SandKit，无后端。

基础路径使用 `/birthday-card/`，由 `VITE_APP_BASE` 配置。`vite.config.ts` 只复制当前 `public/memory-book` 素材和 SandKit 许可，不发布制作母版、源 GIF、遮罩或私密恢复材料。全部运行素材随网站提供，新版不依赖 R2、摄像头、旧 manifest 或媒体网关。

`.github/workflows/pages.yml` 在 main 更新时负责 lint、build、上传 Pages 产物、部署，以及一次线上 JS/CSS 入口检查。PR 使用 `.github/workflows/ci.yml`。旧模型生成和旧多视口预览工作流已随旧实现删除。

`npm run build` 包含类型检查、Vite 构建和本地路径检查；`npm run deploy:check` 可单独检查现有 dist。不要把预览服务器启动当作线上部署完成。

## 当前版本与下一次提交

截至本次清理前，最近记录成功的发布是[工作流 37133314461](https://github.com/daidaideaa/birthday-card/actions/runs/37133314461)，提交 `f27a7386e60436d85b6ac9e394888068e4937141`。本机发布元数据在 `.asset-build/memory-book/publish-blobs.json`。

本机目录 `birthday-card-resume` 的 Git 分支仍是历史 `experience/finish-duet`，包含大量新版修改和未跟踪文件。不要直接推整个旧分支、合并旧 PR #8、强推 main 或清掉工作区。下一次发布基于届时远端 main，将核对过的当前文件和删除项纳入提交，使用非强制更新，并等待 Pages 结果。

2026-10-04 电影式优化将本地已完成清理与新版代码一起基于远端main发布。终端Git无可用推送凭据，使用已连接GitHub的Git数据接口，复用未变blob、上传修改资源、最后非强制更新main一次。独立临时索引在`.git/cinematic-release.index`，不会覆盖原索引或检出分支。实时发布结果见Pages工作流，本机摘要在`.asset-build/memory-book/publish-blobs.json`。详情见根目录`新对话交接.md`。

## 制作资料与恢复

当前可编辑 Blender 母版、原始画稿、电影源 GIF 与逐帧遮罩保存在 `.asset-build/memory-book`，通常被 Git 忽略；换电脑应带走这些内容，不能只克隆仓库。

原始旧项目压缩包位于 `G:\github存储\claude_build.zip`，保留一份。旧源码和许可也可以从 Git 历史恢复。用户私密配置位于本机恢复目录中，不写进公开仓库、构建产物或此文档。

## Cloudflare 历史状态

旧版曾使用 `https://birthday-card-media.daidaidefish.workers.dev/birthday-card/` 连接 R2，历史资源版本为 `runtime-20260925-v1` 和 `duet-review-20261003-v1`。新版五章不请求这些对象。本轮只清理本地重复文件与退役发布代码，未删除远端桶、Worker、对象，也未修改账户、域名或计费。

需要维护旧资源时，从[清理前的部署记录](https://github.com/daidaideaa/birthday-card/blob/f27a7386e60436d85b6ac9e394888068e4937141/docs/DEPLOYMENT.md) 或原始恢复包取回对应工具与来源。不要继续执行旧文档中的命令并误认为它是新版发布流程；旧服务状态需要在实际维护时按需核对。

