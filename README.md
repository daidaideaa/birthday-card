# 师宝宝 · 生日奇遇

中文、无后端的互动生日礼物，使用 React、TypeScript、Vite、Three.js 和 MediaPipe，运行于 GitHub Pages。当前版本将角色表演改为 **Blender 离线影像 + 网页互动**；浏览器继续实时绘制贺卡、蛋糕、琴键与宠物透明合成。

本轮四段主影片、四张影片海报、十二段宠物动作与两张宠物海报已生成并完成本地整合。最终素材检查为 22/22，public 共 47.4 MiB，0 错误、0 警告；三个视口的 30 项浏览器测试全部通过，无跳过。31 项单元测试、lint 和生产构建通过。尚未推送或部署到线上。

## 四个场景

1. **生日邀请**：月光图书馆、立体贺卡和烛光；支持点击、拖动和主动开启的手势。
2. **小小美好**：纸质相册，保留照片、时间线、小事、趣梗、地点和数字；手机横滑只切换相册内容。
3. **一封心意**：24 秒暮色双人舞，横竖镜头分别构图。播放结束后信封滚入视口并获得焦点，等待手动拆信；也可以直接读完整书信。琴键仍能即时弹奏，影片配乐跟随原生视频时钟。
4. **生日愿望**：18 秒父子清晨、星空记忆、成年归来的草原短片；结束或跳过后展示生日蛋糕，点击烛火许愿。影片与蛋糕按顺序出现。

双人舞采用 Blender Studio **Snow v4 / Rain v3** 专业人物基础，双犬采用 **Autumn v1** 基础制作杏色与奶油色角色。人物服装、编舞、场景和灯光由本项目修改或制作；狮子沿用 kenchoo 的授权幼狮与项目成年衍生。不是电影原模型、原片或原声。具体作者、许可与输入校验见 [素材来源](public/ASSET_SOURCES.md) 和 [cinema 源清单](scripts/cinema/sources.json)。

## 运行与验证

需要 Node.js 22.12+。网站运行不需要 Python、Blender 或 FFmpeg。

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

Windows 上若预览服务仍占用 `dist` 中的视频，重新构建可能出现 `ENOTEMPTY` 或 `EPERM`。先停止对应的 `npm run preview` 进程，再运行构建即可。

[GitHub Pages](https://daidaideaa.github.io/birthday-card/) 的基础路径保持 `/birthday-card/`。Pages 工作流在推送 `main` 后执行测试、旧模型校验和完整 cinema 校验，再构建部署；仅在 ffprobe 不可用时安装 FFmpeg。缺少主片、海报或宠物动作都会阻止发布。不要提交 `dist`；本地修改不会自动更新已发布网站。

```sh
# ffprobe 须在 PATH 中，或设置 FFPROBE_BIN
npm run cinema:validate
# 旧 GLB 资产继续独立验证
npm run assets:validate
npx playwright install chromium
npm run test:visual
```

`cinema:validate` 检查 4 段横竖影片、4 张影片海报、12 段双犬动作和 2 张透明海报：H.264/yuv420p、主片 24 fps 与时长、AAC 配乐、faststart、宠物左右颜色/遮罩尺寸、本地路径、来源 SHA-256，以及单文件 25 MiB/全部 public 250 MiB 的预算。缺少文件会失败；四段主片都必须含嵌入的 AAC 音轨。结果在 `test-results/cinema-assets.json`。制作过程中的试帧不计为通过验收。

浏览器测试覆盖 1440×900、390×844、430×932：海报、原生视频时间、关键动作定位、静音、书信、草原到烛火、影片失败、减少动态效果、WebGL 降级、完全遮盖时换章及重播取消。还验证了离屏/后台暂停、手动暂停不被误恢复、阻断网络时连续旋转不复用旧解码状态，以及双犬的暂停与恢复。后台可见性用受控 visibility 事件检查监听行为，不代表真实手机系统的后台调度。`visual-review` 构建才开放定位时间的测试入口，普通生产构建不开放。已另行检查生产构建的双人舞横竖完整播放与自然结束信封衔接；截图和软件渲染测试仍不能代替真实手机的流畅度检查。

## 替换个人内容

编辑 `src/content/story.ts`，现有数据结构保持兼容：

- `person.name` 是页面和贺卡称呼。
- `preview: true` 标记目前的风景与文案为效果示意；放入真实内容后设为 `false`。
- `moments` 建议精选 3–5 个片段；`firstMet`、`timeline`、`littleThings`、`insideJokes`、`places`、`stats` 继续合并到相册章，空内容不显示。
- `letter` 保留称呼、完整段落、结尾与落款；仅有称呼不创建空信件章节。
- `finalWish` 是许愿前的祝福。

个人照片放在 `public/memories/`，填写 `memories/photo.jpg` 这样的相对路径。网站资源通过现有 `assetUrl` 处理基础路径；不依赖外部模型服务。当前示意内容没有虚构真实的相识日期与共同回忆。

## 媒体与交互架构

- `cinematic/media.ts` 提供媒体路径、时长、草原阶段和横竖选择。只有当前影片进入播放组件；空闲仅预取下一章海报与组件代码，不批量下载影片或旧舞者/狮子 GLB。
- `CinematicFilm` 用视频的 `currentTime` 作为字幕与剧情时钟；横竖切换保留位置。解码前保留海报，失败可重试或继续阅读。影片、采样、生日曲和狮子回应受同一全局静音控制。
- `ChapterTransition` 先准备目标海报和组件，保留当前章节；460 ms 遮盖后以显式全不透明状态提交章节，停留 120 ms 再用 600 ms 展开，避免计时器与动画首帧的偏差露出换章。邀请用纸色、暮色用暖色到蓝紫、草原用晨光。新请求和重播取消过期计时与提交；减少动态效果时立即切换。
- 双犬使用 H.264 左侧颜色/右侧灰度遮罩的动作片，由轻量 WebGL 合成透明轮廓。每只犬保留独立触摸区域，待机、向左/右看、摸摸、庆祝、休息共六种状态。摸摸优先，操作不累积成长队列；影片播放时使用安静静帧。
- 后台和离屏暂停视频与渲染；减少动态效果保留静帧与手动播放入口。WebGL 不可用仍可阅读完整故事与使用宠物海报。
- 摄像头仅在用户点击开启后申请，画面只在本地处理。拒绝权限、手势库或模型加载失败均回落到点击。进入故事后暂停手势推理。
- 键盘左右箭头、导航按钮、横向手势都可换章；相册、视频控件与钢琴区域防止误触章节导航；照片弹窗支持 Escape 与焦点恢复。

## 离线制作

新影像脚本在 `scripts/cinema/`，使用 Blender **4.5.9 LTS**；旧 `scripts/models/` GLB 流水线仍按 **4.3.2** 保留。源 ZIP 放入 `model-sources/studio/`，根据 `scripts/cinema/sources.json` 校验后解压；它们与 `.blend`、逐帧 PNG、试片都不提交到 Git。

本机工具在 `D:\environment\cinema-tools`，辅助 Python 环境为 `D:\environment\radar-py39`。Blender 脚本使用 Blender 自带 Python；代码对网站访问者没有这些依赖。可设置 `FFPROBE_BIN` 指向 FFmpeg 的 `bin/ffprobe.exe` 后验证。

制作顺序：角色与灯光定妆图 → 短动作试片 → 横竖完整帧 → H.264/AAC 编码与 WebP 海报 → 浏览器交互和画面检查。源镜头输出 24 fps；横版以 1920×1080、竖版以 720×1280 为网页目标。桌面与手机各自构图，不能直接裁掉舞者手脚。本机渲染配置使用 OptiX；其他硬件需调整对应设备设置，耗时受设备和角色毛发复杂度影响。

双人舞制作入口依次为 `build_duet.py` → `finish_duet.py` → `stage_duet.py` → `polish_duet.py`。`stage_duet.py` 将项目使用 imagegen 创作的洛杉矶暮色远景 `scripts/cinema/assets/dusk-city.png` 放入三维场景，输出 `.asset-build/cinema/duet-production.blend`、六个代表动作试帧和竖屏试帧。`polish_duet.py` 保留前 300 帧，修正后半段马尾弯曲与裙下身体遮罩，输出用于最终渲染的 `duet-polished.blend`。该图只提供远山、城市与天空；舞者、钢琴、地面、路灯及其动画仍在 Blender 中真实渲染，不用背景图替代完整影片。

`score.py --ffmpeg <路径>` 使用已有许可的 Salamander 采样制作原创 24 秒爵士配乐。`render_movie.py` 支持选镜头、尺寸、采样数、帧区间以及 Cycles/EEVEE，跳过已存在的帧以便恢复；更换镜头或灯光后应使用新的输出目录，避免复用旧帧。编码示例：

```sh
blender -b .asset-build/cinema/duet-polished.blend -P scripts/cinema/render_movie.py -- --paired --name duet --samples 16
node scripts/cinema/encode_movie.mjs --ffmpeg <ffmpeg路径> --name duet-landscape --score .asset-build/cinema/duet-score.wav
node scripts/cinema/encode_movie.mjs --ffmpeg <ffmpeg路径> --name duet-portrait --score .asset-build/cinema/duet-score.wav
```

宠物是 Autumn 梗犬基础的杏色/奶油色派生，修改垂耳、眉眼、短卷毛和暗色犬眼，制作六种原创动作；不标称完全重雕贵宾犬或迪士尼原角色。

草原制作由 `build_pride.py` 输出 `pride.blend`，使用 `render_movie.py` 输出两个镜头。`pride_score.py` 制作原创伴奏，含原有授权钢琴采样与公共领域狮吼片段；`encode_pride.mjs` 将其嵌入 AAC 音轨，并在 6.5 秒、11 秒场景边界加入保持时钟的短叠化。日出、星空远景来自本项目 imagegen。详细处理与来源见 `scripts/cinema/pride-sources.json`，源文件哈希同时收录于总 `sources.json`。

镜头原始帧与中间文件在 `.asset-build/cinema/`；网页成品统一放在 `public/cinema/`。美术原则与此前版本记录见 [ART_DIRECTION](public/ART_DIRECTION.md)。不要把“成功编码”写成造型或动态效果已达标；最终需要检查落脚、牵手、布料穿插、毛发轮廓、完整构图、黑帧与接续音量。

旧 GLB 工具仍可使用 `assets:sources`、`assets:build`、`assets:optimize`、`assets:validate` 和 `assets:review:prepare`；它们不会生成新的 cinema 影片。旧模型许可随 `public/models/` 保留。

## AI 协作

项目约定见 [AGENTS.md](AGENTS.md)；视觉工作使用 [birthday-visual-review](.agents/skills/birthday-visual-review/SKILL.md)。先检查实际画面，再处理造型、镜头或交互问题。完成情况以实际文件、测试报告与已观察的画面为准。
