# 第三、四章重制：独立角色预览

本轮在 `experience/character-rework` 分支制作。基线为 `0074e5d`。主站、第一/二章、个人内容、Cloudflare 资源版本与暂停中的 VPS 监控均未修改。

## 当前阶段

2026-10-03 动作制作追加：新增 `build_duet_runtime.py`，从原始 Snow/Rain 控制骨架烘焙 26 秒带蒙皮的运行模型。`performance-review.html` 可旋转、定位动作、正常速度/慢放与琴键驱动；`story-review` 构建把候选人物接入第三章，普通生产构建仍使用既有舞台。两个角色共用时间轴，停止标记来自制作端的动作边界。该候选仍需手掌接触、脚底滑移、服装与动作审阅，不能把格式校验当作整章验收。

本次用户要求先完成内容再上传完整新版，因此保留旧交接 Release，不用未完成的候选覆盖它。为响应关机及换电脑恢复要求，另存 `performance-checkpoint-20261003` 草稿备份：包含本轮源码、制作主文件、浏览器动画、录屏和原加密配置，明确不作为完成版发布。私有加密包沿用用户指定的原密码，密码不进入源码、文档或网页；重新加密时仍生成新的随机盐和随机数。

2026-10-02 追加：收窄衬衫接袖处并在各检查姿态烘焙身体碰撞修正；网页改用 `characters-v2` Meshopt 文件，总下载量从约 44.8 MiB 降到 9.6 MiB。原始导出保留供修改。两份人物主文件打包纹理；完整源工程、现有媒体和制作资料通过独立 GitHub 交接 Release 提供，见 [换电脑步骤](MOVE_TO_ANOTHER_COMPUTER.md)。这不是生产部署或造型验收通过。

这是第一轮**造型候选**，不是整章完成交付。按用户计划，先验收人物近景，再扩展编舞；预览确认后才能发布。格式检查、类型检查和构建通过不等于 VIS 验收通过。

已实现：

- 独立入口 `character-review.html`，可旋转、缩放；两人/单人、正面/四分之三/侧面、全身/肩颈/手部、中性光/暮色光。
- 基于 Blender Studio Snow / Rain 拓扑与绑定的修改候选：成人头身比例、眼睑、男角色口鼻和耳部比例、棕发、男角色长袖衬衫与领片袖口、黄裙与坐姿裙摆。
- 两人各自的站姿、微笑、转头、抬手、坐姿检查 GLB。姿态在 Blender 内求值，网页不执行坐姿 CCD 或修改骨骼。
- 原始绑定与可继续编辑的制作主文件留在 `.asset-build/character-review/*-character-master.blend`。网页仅加载静态 GLB；这些文件**不是**舞蹈动画或最终运行时骨架交付。
- 裙腰对齐与坐姿碰撞修正在导出脚本中按实际变形烘焙；后续正式编舞仍需将这些修正制作成可动画的服装绑定与动态，不能直接插值五个静态检查网格。
- 第四章提供幼年辛巴、木法沙、成年辛巴的官方 1994 版图像对照、差异检查和来源链接。

尚未完成：

- 人物造型的用户验收，以及最终舞鞋/服装、表情与动态的美术验收。
- 弹琴→起身→走近→邀请→牵手已做连续候选及即时手指层，尚未完成自然编舞、精确手指触键和手脚接触的美术修正。
- 狮子重绘角色稿与动作图集、PixiJS 场景及统一时间线。
- 已有第三章正常速度/慢放录屏及琴键、松手停止、后台暂停、静音和返回书信的浏览器检查；完整整章验收、十分钟性能检查和真实 iPhone 检查尚未完成。
- 不可变生产资产版本、远程依赖检查、生产发布与回退演练。

## 启动与构建

项目根目录运行：

```powershell
& D:\environment\cinema-tools\blender-4.5.9-windows-x64\blender.exe --background --python scripts/models/build_character_review.py
node scripts/review/optimize-characters.mjs
node scripts/review/validate-characters.mjs
npm run dev:characters
```

打开 `http://127.0.0.1:5181/birthday-card/character-review.html`。

`npm run build:characters` 导出 `.asset-build/character-preview`，仅依赖静态托管与浏览器 WebGL，无 Python/Blender/Node 服务端依赖。正式架构仍为 GitHub Pages 网页 + 现有 Cloudflare 媒体资源端点。此构建没有上传至任何线上环境。

预览资源使用独立 `publicDir`：`.asset-build/character-review/public`。主站默认 Vite 构建不会复制这些模型。预览采用逐姿态加载以便观察；后续生产版本需导出统一皮肤骨架、动画和纹理，而不是把十个检查网格当作连续动画。

## 制作与来源

- Snow v4.2：Blender Foundation / Blender Studio，CC BY 4.0，<https://studio.blender.org/characters/snow/v4/>。
- Rain v3.2（v3.3 源包）：Blender Foundation / Blender Studio，CC BY 4.0，<https://studio.blender.org/characters/rain/v3/>。
- 源包通过工作区 `model-sources` 读取；上游 ZIP、版本与 SHA-256 见 `scripts/cinema/sources.json`。导出时不自动执行源文件内嵌 Python 文本。
- 本次修改不是原作者对本项目的背书。人物候选衍生自以上模型，并保留署名和许可证链。
- 预览字体使用仓库已有 Noto Serif SC 子集及 OFL 文件。
- 狮子对照来源为 [Disney 官方《The Lion King》1994 版电影页](https://movies.disney.com/the-lion-king)，图像 © Disney，仅作角色设计对照，不列为 CC0 或已经完成的重绘角色资产。

## 第四章的当前阻塞

内置 imagegen 的统一角色稿请求被服务安全检查拒绝：`moderation_blocked`，阶段 `output`，类别 `other`；服务未给出更具体的原因。未产出图稿或图集。

请求 ID：`216b46e0-0a36-4e07-8922-6a5e3e5e1db5`。本轮未改用其他生成服务。官方对照图仍可在独立预览中查看。

2026-10-02 在同一内置图像服务明确提交相同的 1994 版幼年辛巴、木法沙、成年辛巴角色稿要求，并使用三张官方图作对照，再次返回 `moderation_blocked / output / other`。请求 ID：`07a63e78-7f83-43e4-a9dd-36a7e697d38e`。未产出图片，也未换通道规避。现有 SVG 不能算作用户要求的精绘角色或连续动作图集。

2026-10-03 核对了服务文档并检索现成模型。`output` 说明拦截发生在生成结果或后续输出审核阶段，`other` 没有提供具体原因，不能推断为本地权限、余额或某一种版权判断。检索到的成年辛巴页面标明为 Kingdom Hearts 模型；另有幼狮模型，但未取得一套已核实且符合 1994 版造型的三角色源文件。此次没有下载或导入这些候选。详情和来源见 [图像服务阻塞记录](IMAGE_SERVICE_BLOCK.md)。

## 连续动作候选预览

```sh
blender --background --python scripts/models/build_duet_runtime.py
npm run assets:performance
node --import tsx scripts/review/validate-performance.mjs
npm run dev:performance
```

独立动作页：`http://127.0.0.1:5184/birthday-card/performance-review.html`。完整故事预览：`http://127.0.0.1:5184/birthday-card/`。`npm run build:performance` 输出 `.asset-build/performance-preview`，可以由静态服务器托管；不需要浏览器调用 Python 或 Blender。原始运行模型和可编辑制作文件在 `.asset-build/duet-runtime`，压缩资源在 `.asset-build/performance-review/public/review-assets/duet-performance-v1`。

这里是新的骨架动画，不是对五个静态姿态插值；脚步与共同手部目标在 Blender 中制作。初次网页检查发现牙龈仍是表面变形遮罩权重，未跟随人物；已改为闭口表演中的头部绑定，并把共同手部目标从手腕重合改为按掌长偏移。精确指尖触键、牵手造型、服装动态与舞鞋仍需逐项检查，未作最终美术验收。

## 检查记录

- glTF 校验与文件摘要：`.asset-build/character-review/validation/characters-v2-gltf.json`。
- 预览交接清单：`assets/review/characters-v2.json`，包含文件大小与 SHA-256，`reviewOnly: true`、`visualApproval: pending`。压缩文件实际解码后再进行 Khronos 校验。
- 桌面浏览器画面：`.asset-build/character-review/web`。
- 窄屏、静态构建与重新进入检查：`scripts/review/check-characters.mjs`，输出 `.asset-build/character-review/check`。
- 真实 iPhone 尚未实测；浏览器窄屏不能代替设备验证。
- 本轮最终结果：10 个 GLB 的 Khronos 校验均为 0 错误、0 警告；TypeScript、针对新增文件的 ESLint 与独立静态构建通过。1440×1050 与 390×844 的浏览器加载、角色切换后重新进入、横向溢出检查通过，未记录页面异常或本地资源 4xx/5xx。构建仍提示 Three.js 相关初始包约 851 kB（gzip 232 kB）；尚未作正式手机性能验收。

### 2026-10-03 连续动作检查

- 两个完整 26 秒动画经 Meshopt 压缩后分别为约 3.42 / 3.48 MiB；解码后 Khronos 校验均为 0 错误、0 警告。`assets/review/duet-performance-v1.json` 记录摘要，造型验收仍为 `pending`。
- `npm run lint`、48 项 `npm test` 通过；连续动作静态预览构建通过。构建仍有 Three.js 大文件提示。
- 实际浏览器检查琴键推进→松手到下一个制作标记→原地等待→再次输入继续；后台暂停、静音、390 像素窄屏和重新载入通过。完整故事预览也加载了新舞台并能回到原有书信。测试禁止外部请求，不调用 Cloudflare 写入接口。
- `.asset-build/performance-review/check/normal.webm` 与 `half-speed.webm` 为本次完整动画录屏。26 秒动作实际用时分别为 26.622 / 52.652 秒。录屏无音轨，不证明音质验收。
- 当前测试浏览器使用软件渲染器；为此降低预览像素比并关闭阴影。硬件帧率、真实 iPhone 和持续运行性能未验证。
- 已看全身、琴前、手掌及手机截图：牵手仍有指间穿插，男衬衫接袖和后领不平顺，女角色舞鞋与衣物动态未完成。现有触地点数据是制作目标轨迹，并非逐帧网格脚底测量结果。**不通过最终美术验收，不进入生产。**

## 后续发布门槛

保持 `02` 的角色→动作样章→整章验收顺序。用户确认预览后，按 `01` 与项目当前 `docs/DEPLOYMENT.md` 的 GitHub Pages + Cloudflare 约定，创建新的不可变生产资产版本，校验远程加载和依赖，再部署并保存上一版回退入口。不得覆盖 `runtime-20260925-v1`。
