# 换电脑继续制作

本次交付为 `experience/character-rework` 独立预览，不会替换正式 GitHub Pages。完整下载入口：

<https://github.com/daidaideaa/birthday-card/releases/tag/character-handoff-20261002>

2026-10-03 另存第三章连续动作的**未完成草稿备份** `performance-checkpoint-20261003`。登录仓库所属 GitHub 账号后，在 [Releases](https://github.com/daidaideaa/birthday-card/releases) 查看草稿。它保留关机前的新工程和检查记录，不是完成版，不替换上面的公开交接包或线上站点。

## 下载哪些文件

- **birthday-card-complete.zip**：主要下载包。包含完整源码、两份 01/02 方案、Snow/Rain/Autumn 原始模型与纹理、两个人物修改后的 Blender 主文件、10 个浏览器姿态、预览网页、现有网站媒体、历史影院制作工程、截图、许可证、校验清单、Git 历史和所有分支。解压后目录名为 `birthday-card-portable`。
- **private-settings.enc**：本项目私有配置与 Claude 会话的加密包。包含四把 Claude key 的配置、路由状态和脚本、项目会话与本机 Wrangler 授权配置。密码单独交付，不保存在 GitHub。已有额度和过期状态不会因迁移改变。
- **history-frames-*.zip**：可选历史渲染帧、试片和自动保存备份；继续改网页、查看人物和编辑主文件不需要下载。解压到主要下载包旁边，保留其 `birthday-card-portable` 目录层次即可合并。
- **SHA256SUMS.txt**：上传文件的校验值。

GitHub 自动生成的 **Source code (zip)** 仅含 Git 源码，不含被忽略的大模型与制作工程。请下载上面的 **birthday-card-complete.zip**。

## 先看人物预览

1. 安装 [Node.js](https://nodejs.org/) 22.12 或更新版本。
2. 解压主要下载包，双击 `START-CHARACTER-PREVIEW.cmd`，保留打开的窗口。
3. 打开 <http://127.0.0.1:5181/birthday-card/character-review.html>。

也可在项目目录执行：

```sh
node scripts/migration/verify-package.mjs
node scripts/migration/serve-preview.mjs
```

此入口使用已导出的网页，不需要 npm 安装、Blender、Claude 额度或 Cloudflare 账户。人物模型、字体和网页都在下载包内；第四章官方参考图片仍由 Disney 网站提供，需要联网。这些图片不是完成的动作图集。

## 连续动作恢复点

2026-10-03 草稿中的主要包还包含：

- `.asset-build/duet-runtime`：两个 26 秒动画的原始 GLB、Blender 制作主文件及时间轴、目标接触轨迹。
- `.asset-build/performance-preview`：可直接本地运行的静态预览。
- `.asset-build/performance-review`：压缩模型、校验结果、近景截图、正常速度和半速录屏。

解压后双击 `START-PERFORMANCE-PREVIEW.cmd`，访问 `http://127.0.0.1:5184/birthday-card/performance-review.html`。完整故事预览访问同端口的 `/birthday-card/index.html`。也可以执行：

```sh
node scripts/migration/serve-preview.mjs .asset-build/performance-preview 5184 performance-review.html
```

所有本轮修改均在 `experience/character-rework` 分支。手指穿插、服装和舞鞋尚待修正；第四章没有新图集。正常速度录屏是 `normal.webm`，慢放是 `half-speed.webm`，位于 `.asset-build/performance-review/check`。两份录像不含音轨。

## 修改网页与重新制作人物

```sh
npm ci
npm run dev:characters
```

修改后 `npm run build:characters`。原有生日网页用 `npm run dev`；本地媒体已随包提供，默认无须调用 Cloudflare。常规 `npm run build` 仍构建正式网站入口，角色预览是单独入口。

重新制作需要 [Blender 4.5 LTS](https://www.blender.org/download/lts/4-5/)。选择新电脑上的 Blender 可执行文件，而非沿用原电脑的 D 盘路径：

```sh
blender --background --python scripts/models/build_character_review.py
node scripts/review/optimize-characters.mjs
node scripts/review/validate-characters.mjs
npm run build:characters
```

Blender 脚本使用软件内置 Python，人物预览不依赖原电脑 `radar-py39` 环境。辅助打包脚本使用 Python 3.9+ 标准库。旧影院影片需要另装 FFmpeg；旧脚本中的 GPU / OptiX 设置需按新显卡调整。软件和 node_modules 不作跨电脑复制，用对应系统的安装包重新安装。

最新人物主文件在 `.asset-build/character-review/*-character-master.blend`，已打包纹理。原始 rig 在 `model-sources/studio/`。服装导出碰撞修正仍由脚本烘焙；不能把五个静态姿态直接当作舞蹈动画。旧 `.asset-build/cinema` 工程保留为历史，不代表用户已认可美术。

旧影院工程可能记录了原机器的绝对纹理路径。如果打开时提示丢失纹理，用下面的方式修复并打包到所打开的主文件（将两处路径替换为实际路径）：

```sh
blender --background .asset-build/cinema/duet-polished.blend --python scripts/migration/relink-blender.py -- "新电脑上的项目绝对路径"
```

## 恢复私有配置

后续交接版本保持本次单独交付的密码不变。密码不会写进仓库。维护者重新生成加密包时可使用 `encrypt-with-password` 模式，交互隐藏输入原密码；新包使用独立随机盐与随机数，旧包继续可用。本次草稿直接保留已经验证过的原加密配置文件。新的完整交接版本只有内容完成后才发布，不用正在制作的动作候选替换本页所链接的旧包。

将 `private-settings.enc` 放在项目根目录，执行：

```sh
node scripts/migration/private-archive.mjs decrypt private-settings.enc private-restored
```

按提示输入单独交付的密码，输入时不会回显。解密会先认证整个文件；密码错误或文件被改动时不会写出部分配置。输出目录已存在时会拒绝覆盖。

解密文件中的 `RESTORE-PRIVATE.txt` 说明各配置原来所在的位置。先查看再复制到新机器对应目录，保留新机器已有配置。路由脚本、启动器中的 `D:\claude_build` 和 Python 路径需要改成实际路径。不要自动重新启用额度不足的 key、后台监控或定时任务。Cloudflare OAuth 会过期或撤销，必要时在新电脑重新登录。未从系统凭据库导出 GitHub 登录令牌，新电脑使用 GitHub 自己的登录流程；本机没有独立保存的 R2 S3 密钥，不伪造或创建新的密钥。

**不要把密码、`private-restored/`、用户目录 `.claude` 或 Wrangler 授权文件加入 Git。** 公开网站和客户端 VITE 变量也不得包含密钥。加密包使用 AES-256-GCM、随机 256 位密码及 scrypt，不需要第三方解压工具。

## 恢复 Git 开发历史

如果直接解压，不会得到 `.git` 目录。需要继续提交时，可将历史恢复到另一个新目录：

```sh
git clone -b experience/character-rework PROJECT-HISTORY.bundle ../birthday-card-git
git -C ../birthday-card-git remote set-url origin https://github.com/daidaideaa/birthday-card.git
```

再将下载包里的 `model-sources`、`.asset-build`、`public/media` 复制到新项目目录。或者从 GitHub 克隆分支后复制这些大文件。普通 Git 提交不会包含它们；下一次交接要另生成新版本下载包，不能只推送源码。

## 接下来从哪里继续

阅读 [角色重制交接](CHARACTER_REWORK.md) 和 `docs/plans/02_Claude_电影化前端美化与交互改造方案.md`。当前人物仍待造型验收，完整舞蹈、角色接触、第四章重绘及图集尚未完成。图像服务曾拒绝请求，授权不会解除该服务拦截，不能把参考图称为已完成角色稿。

发布沿用 [GitHub Pages + Cloudflare R2](DEPLOYMENT.md)，它覆盖 01 方案里早期的 Cloudflare Pages 选择。保持第一、二章和个人内容；人物→动作样章→整章确认后再发布。真实 iPhone 未实测，VPS 监控保持暂停。
