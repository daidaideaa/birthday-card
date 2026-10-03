# 师宝宝 · 生日奇遇

React、TypeScript、Three.js 与 Web Audio 制作的中文互动生日礼物。网站继续使用 [GitHub Pages](https://daidaideaa.github.io/birthday-card/)，媒体通过 Cloudflare Worker 读取 R2。浏览器不需要 Blender、Python 或服务器。

## 当前状态

正常阅读路径是实时交互：生日邀请 → 小小美好相册 → 琴键驱动的双人舞与完整书信 → 草原故事与生日许愿。早期 MP4 影院方案的制作资料留在 [历史说明](README_CINEMA_HISTORY.md)，不代表当前主线实现。

第三章的 Snow / Rain 角色重制在独立 `story-review` 预览中，包含同一人物弹琴、起身、走近、邀请、牵手、侧步、转身与收势的 26 秒骨架动画。普通生产构建仍使用此前批准的舞台，不能把制作预览称为最终验收。第四章指定角色稿与动画图集尚未完成，原因见 [服务阻塞记录](docs/IMAGE_SERVICE_BLOCK.md)。

具体已做、未做与验收证据见 [角色重制进度](docs/CHARACTER_REWORK.md)。个人内容仍为示意，没有编造真实经历。

## 安装与运行

使用 Node.js 22.12+（本轮发布工具使用 Node 24）。

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
```

本地默认从 `assets/release.lock.json` 准备批准媒体。打开终端给出的 `/birthday-card/` 地址。网站 base 必须保留该子路径；不要直接双击 HTML。

## 动作预览

已有云端候选可直接预览，不必恢复源模型或安装 Blender；设置公开媒体地址后执行 `npm run dev:performance`，完整命令见 [部署说明](docs/DEPLOYMENT.md#2026-10-03-动作候选发布)。

需要从迁移包恢复源模型后才能重新制作。源模型来源与许可见 [素材记录](public/ASSET_SOURCES.md)，迁移步骤见 [换电脑说明](docs/MOVE_TO_ANOTHER_COMPUTER.md)。本机可编辑 `.blend` 和中间文件留在 `.asset-build`，不提交到 Git。

```sh
blender --background --python scripts/models/build_duet_runtime.py
npm run assets:performance
node --import tsx scripts/review/validate-performance.mjs
npm run dev:performance
```

完整故事预览为 `http://127.0.0.1:5184/birthday-card/`；动作审阅页为同一路径下的 `performance-review.html`，支持逐段检查、旋转视角、正常速度/半速播放和真实琴键输入。`--pose-check` 只供稀疏姿态检查，不得作为完整动画交付。

```sh
# 可用浏览器通道由 PLAYWRIGHT_CHANNEL 指定，例如 Windows 的 msedge。
node scripts/review/check-performance.mjs
node scripts/review/check-performance-interaction.mjs
node --import tsx scripts/review/check-performance-story.mts
node scripts/review/record-performance.mjs
npm run build:performance
```

检查结果保存在 `.asset-build/performance-review/check`。浏览器模拟手机和受控后台事件不等于真实 iPhone 验收。

## 内容与发布

- 改称呼、照片、回忆、书信、录音与祝福：[内容编辑指南](docs/CONTENT_EDITING.md)。
- 发布新媒体、远程校验、CORS 与回退：[部署说明](docs/DEPLOYMENT.md)。
- 资源制作与来源：[美术说明](public/ART_DIRECTION.md)、[素材记录](public/ASSET_SOURCES.md)。
- 协作与视觉检查：[AGENTS.md](AGENTS.md)、[birthday-visual-review](.agents/skills/birthday-visual-review/SKILL.md)。

`main` 推送触发现有 Pages 发布工作流。新资源必须使用新 release ID，经远程完整校验后再选择；不得覆盖现有不可变对象。密码、OAuth 文件、迁移私密资料和本地 `.env` 均不进入 Git 或浏览器包。
