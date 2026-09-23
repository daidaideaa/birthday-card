# 师宝宝 · 生日奇遇

一个中文、无后端的互动生日礼物。基于 React、TypeScript、Three.js 和 MediaPipe，沿用现有 GitHub Pages 发布流程。

## 四个场景

1. **生日邀请**：月光图书馆与烛光书桌，勃艮第红天鹅绒贺卡、烫金边饰和纸张层次。开卡时镜头、照明、魔法粒子与双犬共同响应；保留点击、手势、拖动旋转。
2. **小小美好**：烛光桌面上的纸质相册，保留书脊、纸边与接触阴影；手机横滑浏览主照片。原来的时间线、小事、趣梗、地点和数字仍合在一章，不增加环节。
3. **一封心意**：先在蓝紫暮色中点播双人舞，播放结束后出现信封，也可以直接读信。开信时停止舞台和后续琴音，余音降低，留出完整的中文阅读空间。
4. **生日愿望**：荣耀石上的父子清晨、星空中的父亲记忆、成年辛巴归来，以约 18 秒的连续短场景致敬《狮子王》。大小狮子拥有独立网格和骨骼，场景与双层草莓奶油蛋糕并列，点击烛火后展现烟雾、星光、音乐和双犬庆祝。

两只泰迪分别为杏色和奶油色，改为 Blender 制作的连续雕塑网格、蒙皮骨架与 GLB 动画。`Idle / Curious / Happy / Rest` 动作由 Three.js AnimationMixer 混合，另有眨眼、视线跟随和摸摸反馈。旧版颗粒毛球已移除；这是一套风格化原创模型，并非扫描动物或迪士尼原模型。

钢琴使用 jeremy 的公开授权三角钢琴模型，舞者使用 Quaternius 的 CC0 人物与兼容骨架，穿着项目制作的白衬衫、长裤和黄裙。12 秒双人舞以《爱乐之城》山顶舞段为视觉参考，包含侧步、轻踢和牵手转身；舞步为原创编排。手机竖屏优先展示全身动作，镜头与动作共用时间线，缓慢推进后停留。远山、城市灯点、地面与路灯都处于同一三维舞台。

狮子基于 kenchoo 的 CC BY 4.0 幼狮模型制作成年衍生体型与动作。旧版狮子、双人舞的透明图集已移除；角色、琴、蛋糕和贺卡都是实时三维物体，章节环境底图仍为生成绘画。所有角色素材随站点提供，不依赖外部模型服务。

剧情采用《狮子王》的父子传承与辛巴归来线索，省略伤亡和冲突，以适合生日礼物；没有将木法沙与成年辛巴并存的画面误作原片时序。剧情依据：[Disney D23 官方剧情简介](https://d23.com/a-to-z/lion-king-the-film/)。

## 运行与验证

建议 Node.js 22.12+。

```sh
npm ci
npm run dev
npm run lint
npm test
npm run build
npm run preview
```

GitHub Pages 地址：<https://daidaideaa.github.io/birthday-card/>。Vite 基础路径仍为 `/birthday-card/`，推送 `main` 后由原有 Actions 执行测试、构建与部署，不提交 `dist`。

## 替换个人内容

编辑 `src/content/story.ts`：

- `person.name`：页面与贺卡上的称呼。
- `preview: true`：显示“风景与文字为效果示意”的说明，换成真实照片与文案后设为 `false`。
- `moments`：建议精选 3–5 个片段，每项填写标题、图片路径和简短描述。
- `firstMet`、`timeline`、`littleThings`、`insideJokes`、`places`、`stats`：仍兼容这些资料，但统一展示在相册中，不再增加独立章节。空内容不显示。
- `letter`：称呼、完整段落、结尾与落款。只填写称呼不会生成空白信件章节。
- `finalWish`：许愿前的一句祝福。

图片放入 `public/memories/`，使用 `memories/photo.jpg` 这样的相对路径。当前网图保存在本地 `public/images/`，不会运行时依赖图片外链。预览内容没有虚构相识日期或共同经历。中文标题采用随项目提供的思源宋体子集，新增未收录汉字由系统中文字体补充。

## 交互与性能

- 摄像头只有在主动点击“用手势打开”后才请求；拒绝或加载失败不影响点击体验。
- 摄像头帧仅在本地处理；进入书页后暂停手势推理和贺卡渲染，双犬继续响应当前场景。
- 手势库 WASM 来自 jsDelivr，模型来自 Google Cloud Storage，加载超时会回落到手动方式。
- 键盘左右箭头、导航按钮与横向滑动均可换章；照片弹窗支持 Escape 和焦点恢复，信件保留正常纵向阅读。
- 手机首页按称呼、贺卡、按钮依次自适应排列；相册内部横滑只切照片，不触发章节翻页，也可使用上一张/下一张按钮。
- 烛火只出现在邀请与相册章节；书信使用远处城市灯点，草原使用尘埃与星光。书页转场统一为 650ms，减少动态效果时关闭。
- 音效由用户交互解锁，“声音关”统一控制生日曲、钢琴和狮子回应。
- 手机端限制像素比和阴影成本；后台标签页暂停渲染。减少动态效果偏好会静止骨骼角色，狮子剧情可手动切换画面；狮子、舞台与蛋糕离屏后暂停渲染。剧情时钟在隐藏或离屏后暂停。
- WebGL 不可用时可直接阅读完整生日故事，宠物单独降级，不阻断主要内容。

## 资源与来源

详见 [素材来源](public/ASSET_SOURCES.md)。素材生成提示词见 [美术说明](public/ART_DIRECTION.md)。项目未使用付费模型、电影原片或电影原声。

## 模型制作

`scripts/models/` 保留 Blender 制作脚本；运行需要 Blender 4.3+。各模型的来源、再分发许可与修改说明随 `public/models/` 提供。网站运行不需要 Blender。动作通过 GLTFLoader / AnimationMixer 播放，参考 [Three.js 官方骨骼动画示例](https://threejs.org/examples/webgl_animation_skinning_blending.html)。

模型使用原生离线渲染检查造型与动作，并用 Khronos glTF Validator 校验文件。离线模型渲染不能替代整页浏览器和手机布局验收。

## AI 协作

项目约定见 [AGENTS.md](AGENTS.md)。场景与角色的视觉改进可使用 [birthday-visual-review](.agents/skills/birthday-visual-review/SKILL.md)；下一轮需求可参考 [任务提示词](docs/TASK_PROMPTS.md)。资料按任务选择，无需每次全部读取。

## 演出与质量策略（2026-09-23）

- 新增 GSAP `CinematicDirector`：暂停的 timeline 由可见场景时钟推进，爵士的 12 秒镜头、琴音、字幕、灯光与 GLB 播放时间一致；后台和离屏暂停，seek 检查不触发音频或导航。邀请页过渡、草原蒙太奇与许愿收尾复用同一控制器。骨骼动作仍由 Blender/AnimationMixer 负责。
- 延续 Three.js EffectComposer，不引入第二套后期库。爵士采用 HDR 阈值 bloom、轻微色调与暗角；bloom 使用半分辨率，信件不经过后期。减少动态效果关闭镜头运动及 bloom。
- 自动 high/balanced/low，根据触屏/视口、CPU、可用内存提示、节省流量和 reduced-motion 选择。DPR 上限分别为 1.8/1.35/1，阴影上限 1024/512/关闭；人物网格不减配。仅首屏邀请页在进入前初始化，双犬在点击后加载；舞台、狮子、蛋糕按章加载，空闲只预取下一章。
- 钢琴使用两个本地 Salamander 单音采样，解锁音频并进入书信章节后才下载；失败回落到合成。纸张、信封、烛火仍是原创合成音效。全局静音、阅读音量和后台暂停共用音频控制器。

## 可重复资产流水线

固定 Blender **4.3.2**；上游输入在 `scripts/models/sources.json` 固定 URL 和 SHA-256。狮子采用固定提交中的已授权幼狮衍生文件作为可复现制作基线，来源链保留在许可文件中。

```sh
npm run assets:sources
# 将 Blender 加入 PATH，或设置 BLENDER_BIN 为绝对路径
npm run assets:build
npm run assets:validate
npm run assets:review:prepare
blender --background --python-exit-code 1 --python scripts/models/validate_motion.py
blender --background --python-exit-code 1 --python scripts/models/review_jazz_stage.py
```

制作脚本 → `.asset-build/raw` → glTF Transform → Meshopt → `public/models`。不简化角色网格、不量化浮点顶点、不重采样动画。导出后逐项比较网格数值、关节、绑定矩阵、动画名称/采样值、morph 名称/数量和材质参数。节点 TRS 的默认值按 glTF Transform 的 1e-5 省略容差比较；三角索引允许保持绕序的循环置换。检查文件大小、三角形、纹理尺寸、模型边界及外部引用，Khronos Validator 在解码后检查。当前少量材质/未使用属性警告沿用原资产，不包含校验错误。

KTX2 为可选制作路径：安装 KTX-Software **4.4.2** 并将 `toktx` 加入 PATH，运行 `ASSET_KTX2=1 npm run assets:optimize`。已验证 UASTC 编码、骨架/动画保留，以及 Chromium 中本地 Basis 转码加载。默认交付仍保留小尺寸 PNG/JPEG，256 px 法线的压缩收益较小，暂不改变已审查的纹理观感；运行时支持 Meshopt + KTX2，解码器在构建时从锁定的 Three.js 包复制到站点本地。不要将已经压缩的最终资产作为下次制作输入。

`assets.yml` 仅在制作脚本/源清单变化时重建，缓存 Blender 和来源资产，上传 GLB 与检查图，不自动提交生成结果。普通 Pages 构建只检查已提交资产。

```sh
npx playwright install chromium
npm run test:visual
```

截图覆盖 1440×900、390×844、430×932 的邀请、相册、舞台关键动作、信件、草原与结尾。测试使用独立 `visual-review` 构建，普通生产构建不含定位时间的测试入口；摄像头使用点击 fallback；软件渲染固定 balanced 预算，不代表真实设备帧率。图像用于人工审查，不判断角色是否美观。`visual.yml` 保存截图和失败 trace 14 天。
