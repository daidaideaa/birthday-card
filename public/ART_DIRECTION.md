# 电影场景美术

## 当前制作方向：离线角色影像与实时交互

2026-09-23 的本轮升级以此节为准；后文是旧实时版本的制作历史。当前四段主片与宠物动作均已交付到本地网页，22 项素材校验和三个视口的 30 项浏览器测试全部通过。已实际检查 16 秒转身画面、手机完整构图和生产版本连续播放；这不等同于商业动画电影品质承诺，也不代表已经部署。

- 双人舞使用 Blender Studio Snow v4 / Rain v3 的人物拓扑与绑定，杏色、奶油色犬使用 Autumn v1 基础；狮子保留原授权来源。不要将专业基础角色、离线渲染或软件输出分辨率直接描述为已经达到迪士尼成片水平。
- Blender 4.5.9 LTS / Cycles 制作皮肤、布料、毛发、地面接触和统一灯光；源角色、舞台与环境处于同一真实镜头中。24 fps 影片输出独立横竖构图，以全身、牵手、落脚和转身空间为构图边界。
- 山顶段落约 24 秒，蓝紫环境光与暖色路灯，白衬衫、深色长裤、黄裙形成清晰轮廓；草原约 18 秒，保留父子清晨、星空记忆、成年归来的时间关系。
- 网页展示大画幅影片，不叠加旧的写实全页爵士/草原背景，不使用小圆角“模型展柜”。正文留在独立纸面上，音乐、字幕、播放进度使用视频时间。
- 纸面邀请衔接相册；相册暖光进入暮色；书信暖光进入草原；草原结束后进入烛火。换章前准备海报，完全遮盖后提交章节；播放器解码前保留海报，减少动态效果直接切换。
- 宠物使用透明离线画面与独立动作片，由 WebGL 按颜色/灰度遮罩合成。动作包括待机、寻视、摸摸、庆祝和休息；影片播放时静止，避免画面同时争夺注意力。
- 逐镜头检查人物眼神、脚底滑动、牵手位置、衣物穿插、犬毛边缘和角色接地。浏览器另行检查首帧、字幕/声音同步、换章、横竖切换、失败降级与完整阅读。离线试帧、编译成功、单元测试通过均不能替代整页和实际动作验收。

镜头脚本和来源锁定在 `scripts/cinema/`；缓存与源 `.blend` 留在 `.asset-build/cinema/`，网页仅使用 `public/cinema/` 压缩成品。输入页链接、下载入口与 ZIP 的 SHA-256 见仓库的 `scripts/cinema/sources.json`；作者与修改说明见 [素材来源](ASSET_SOURCES.md)。

本轮新增 `scripts/cinema/assets/dusk-city.png`：由项目使用内置 imagegen 创作的洛杉矶暮色远景，提供层叠远山、城市灯光和晚霞，不含舞者表演。`stage_duet.py` 将其作为三维舞台远景，保留真正渲染的舞者、钢琴、地面、路灯及接触阴影，并输出 `duet-production.blend`；随后 `polish_duet.py` 修正后半段马尾弯曲和裙下身体遮罩，生成最终渲染源 `duet-polished.blend`，由 `render_movie.py --paired` 分别渲染横竖镜头。它不是电影截图，也不是完整影片的替代。六个横版动作试帧与独立竖版试帧用于检查构图、牵手和穿插，后半段连续预览用于检查转身连续性；最终网页已检查独立横竖成片、暂停定位和自然结束后的信封衔接。

草原镜头由 `build_pride.py` 制作，日出、星空两张 imagegen 远景见 `scripts/cinema/assets/savanna-dawn.png`、`savanna-stars.png`。成年狮面部继续采用已有幼狮雕塑的衍生比例，不标称成年狮扫描；身体短毛、鬃毛和光照在 Blender 中渲染。`encode_pride.mjs` 在 6.5 秒和 11 秒边界加入短叠化，保留 18 秒总时长与字幕时间。原创配乐及公共领域狮吼录音的说明见 [素材来源](ASSET_SOURCES.md)。

## 旧版实时场景记录

场景背景使用内置 imagegen 生成，随后转为 WebP 编码供网页加载。贺卡、双犬、钢琴、舞者、狮子与蛋糕均为实时 Three.js 场景。未使用电影原片或电影原声。

角色使用实时三维骨骼动画，开卡、琴音、吼声和许愿事件共同驱动环境光、粒子和双犬反应。所有素材随项目本地提供。

## 手机与舞台，2026-09-22

主要观看设备为手机。舞台采用 430–570 px 竖屏画幅，优先保留两人的头、脚和牵手空间；钢琴退到后景，琴键与播放按钮放在舞台下方。黄裙、白衬衫、侧步和低踢参考《爱乐之城》的山顶舞段，12 秒动作是本项目编排，没有使用电影动作捕捉文件。裙摆为踢腿和转身分别提供形变。

`JazzEnvironment.ts` 绘制暮色天空、三层远山、城市灯点、栏杆、石台和暖色路灯；所有对象与舞者共用镜头。镜头跟随动作时钟轻推，不在手机上响应手指摇晃。当时像素比上限 1.5，舞台约 30 fps 更新（现行分级预算见 README）；后台、离屏和减少动态效果沿用暂停规则。

双犬采用正常四足犬轮廓：收小眼睛、突出犬吻、缩小脚掌和头部装饰。表演通过不完全同步的眨眼、轻微寻视、歪头、摸摸反应和动画混合完成；保持风格化原创泰迪，不声称达到长篇动画电影的毛发与表演精度。

收尾修正了侧步落点采样、舞鞋平底和转身牵手高度，竖屏镜头以两位舞者为中心，给侧步时伸出的手臂留出空间。连续弹键保留当前舞步，动作结束后的下一次弹键会开始新一段舞蹈，重播按钮始终从头开始。

实现参考：[Bruno Simon 的作品及公开源码](https://github.com/brunosimon/folio-2025)将视图、灯光、角色和渲染组织在明确的更新顺序中；本项目据此把舞台镜头与角色动作使用同一时钟。[Three.js 骨骼动画混合示例](https://threejs.org/examples/webgl_animation_skinning_blending.html)用于参考动作切换。未复制这两项作品的视觉素材。

模型通过 Blender 检查侧步、踢腿和转身，`review_jazz_stage.py` 用实际导出的 GLB 检查竖屏构图。当轮远程预览浏览器的 WebGL 被禁用；本轮已增加可运行 WebGL 的 Chromium 截图检查，手机硬件流畅度仍需实机验收。

## images/jazz-night.webp

生成提示词：

```text
Use case: stylized-concept. Asset type: finished cinematic website background, landscape 1536 x 1024. Create a gorgeous original romantic Los Angeles hilltop jazz scene inspired by the lighting and cinematography of La La Land: blue-hour periwinkle sky fading into dusky rose at the horizon, luminous sprawling city lights and dark layered hills, a softly illuminated Griffith Observatory dome far away, a single elegant vintage streetlamp at the left edge, a polished ebony grand piano with its lid open on the right third, a small empty piano bench. Foreground stone terrace and very subtle jacaranda petals. The central terrace is empty, reserved for animated characters that will be composited there; NO people. Sophisticated cinematic painterly realism with physically convincing materials, beautiful soft glow, deep indigo shadows, muted amber highlights; refined film production design and slightly tactile grain. Eye-level wide shot, sweeping landscape, careful negative space in the center, piano fully visible lower right. No text, no logo, no watermark, no poster border, no interface. This must look like expensive film concept art, NOT flat clip art, NOT cartoon vector art.
```

## images/castle-night.webp

生成提示词：

```text
Use case: stylized-concept. Asset type: cinematic full-screen website environment, very wide landscape 1536 x 1024. Create a magnificent magical castle library at night, original environment evoking the warm mystery of Hogwarts. Camera close to a dark polished walnut writing desk in the foreground, whose right half is EMPTY and reserved for an interactive 3D birthday invitation composited later. Tall Gothic leaded windows on the RIGHT show a distant warmly lit medieval castle on a rocky lakeside under a midnight blue sky and a crescent moon. A few lit taper candles and stacked old books at the far edges, hanging tiny warm lights high above, flowing burgundy velvet curtain on the far LEFT. Compose the LEFT third mostly dark quiet space reserved for large Chinese typography. Deep real spatial depth, rich walnut and aged brass, warm candle light against blue moonlight, a light haze and a handful of suspended dust motes. Expensive film cinematography, photoreal materials with painterly restraint, anamorphic feeling, soft luminous highlights but restrained saturation. The desk extends to the bottom edge, pleasing generous negative space at center-right. No people, no animals, no card, no cakes, no text, no logos, no floating UI. Beautiful believable cinematic lighting rather than fantasy clipart.
```

## images/savanna-cinema.webp

生成提示词：

```text
Use case: stylized-concept. Asset type: landscape 1536 x 1024 cinematic website environment. An awe-inspiring African savanna at the last golden light before sunset, original film concept art evoking the majesty and tenderness of The Lion King. Wide elevated view over layered rolling plains, winding silver river and scattered acacia trees, immense apricot sun low near the RIGHT horizon, purple distant mountains, beautiful layers of warm dusty atmosphere. In the LOWER LEFT foreground a broad weathered sandstone rock ledge with a flat upper surface, reserved for an animated lion character, no animal painted on the ledge. At bottom right sparse delicate savanna grasses in shadow. Center foreground is quiet and unobstructed, reserved for a birthday cake overlay. Refined photorealistic cinematic painting, tactile rock surfaces, rich earth colors, muted amber sunlight and plum shadows, delicate volumetric sun rays, no harsh yellow saturation, no graphic silhouettes. Large-scale and immersive, eye-level horizon at 40 percent from top. NO text, no logos, no animals, no people, no cake, no UI.
```


## 第三轮角色重构

删除 `lion-atlas.webp` 和 `dance-atlas.webp`。泰迪采用连续网格与细法线；狮子使用授权幼狮拓扑及成年衍生；舞者使用 Quaternius CC0 基础人物和服装。制作入口见 `scripts/models/`，不是再生成一组角色姿态图片。

## 夜景背景对象移除

使用内置 imagegen 编辑 `images/jazz-night.webp`，去掉图片中的钢琴和琴凳，腾出与三维角色共用的前景。完整提示词：

```text
Use case: precise-object-edit. Edit target: the supplied cinematic Los Angeles twilight terrace photograph. Remove ONLY the entire black grand piano and piano bench in the lower right. Reconstruct matching empty stone terrace paving and the low balustrade behind them, with correct perspective and twilight illumination. Keep the camera angle, skyline, distant Griffith Observatory, blue purple twilight sky, coral horizon, glowing lamppost at left, jacaranda branches and all remaining architectural details unchanged. This is the clean environment plate for a website with realtime 3D piano and dancers placed into the empty foreground, so do not add any people, animals, furniture, piano, text, branding or watermark. Maintain high quality cinematic photography, 1536x1024 landscape.
```

## 2026-09-23：演出收敛与模型精修

- 保留四章。双人舞仍使用原 Quaternius 骨架、脚步落点和牵手约束；调整下颌轮廓、衬衫肩线、布料反射、头发轮廓、转身加减速、牵手高度和裙摆延迟回落。不新增逐关节网页动画。
- 泰迪缩小头眼、调整胸腹与脚掌，在连续网格中加入大/中尺度卷毛起伏，保留 256 px 法线；没有 strand hair 或毛球实例阵列。第二只犬的反应延迟 240 ms，与可见场景更新一起暂停。
- 成年狮子独立调整肩胸、躯干伸长、口鼻和鬃毛轮廓；幼狮保留原独立资产。荣耀石保留平坦落脚区，增加倒角、地层轮廓及轻微程序凹凸，不增加高成本材质。
- 爵士不持续推近：0–3 秒轻推，6–8.5 秒轻微侧向调整，最后稳定。竖屏 FOV 43°，维持两位角色的完整动作范围；钢琴保持后景。暖色主光与冷色轮廓光，Bloom 阈值 1.6，强度 0.10–0.16。
- `review_jazz_stage.py` 读取解码后的最终 GLB，与网页保持机位、FOV、角色位置和推进曲线对应。Blender AgX 与网页 ACES 的结果不完全一致，网页截图是最终依据。
- 已实际检查 1440×900、390×844、430×932 网页以及 Blender 的踢腿/转身画面；Blender 蒙皮检查覆盖 244 个鞋底采样。造型仍是风格化低面数角色，并非高精度人物扫描或电影级毛发。手机硬件帧率需在目标设备复核，CI 软件渲染只验证加载、行为与构图。
