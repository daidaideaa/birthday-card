# 素材来源

## 当前五章版本（2026-10-03；以下本节优先）

本节记录 `src/memory-book` 当前实现。旧的三维人物与犬、琴舞、静态书与蛋糕画稿、电影静帧/外部播放器均在后面的**历史记录**中保留，不能据其判断当前演出形式。已实际播放新的20秒电影合成，查看两组原动作、角色轮廓与结尾落星；这不等于用户已认可最终美术或真实手机已实测。

| 当前运行素材 | 来源与制作方式 | 实际用途 |
| --- | --- | --- |
| `memory-book/magic-book.glb`、`star-cake.glb` | 项目原创 Blender 几何、材质与结构；生成脚本 `scripts/models/build_magic_objects.py` | Three.js 真实三维古书与深蓝金色蛋糕；书封与六层纸页由浏览器实时开合、弯曲；蛋糕可观察、许愿与熄烛 |
| `src/memory-book/vendor/sandkit/*` | [LinklyAI / SandKit](https://github.com/LinklyAI/SandKit)，MIT，Copyright © 2026 Linkly AI | WebGL2 沙粒模拟和形变；项目原创城市线稿、顺序叙事、触摸擦拭与合流构图 |
| `Journey.tsx` 内中国轮廓与城市位置 | [Natural Earth](https://www.naturalearthdata.com/)，公共领域 | 沙画结束时展示真实地理位置上的双路线与深圳结点 |
| `memory-book/teddy-rig.webp` | 内置 OpenAI imagegen 原创透明部件图集，参考项目旧杏色泰迪画稿；完整提示词保留 | SVG 逐部件关节运动的杏色/奶油色二维泰迪，详见下节 |
| `memory-book/wind-and-stars.webp` | 内置 OpenAI imagegen 原创手绘旷野背景；完整提示词见下节 | 电影合成舞台的**静态后景一层**；前景草、风、星、镜头和原版角色帧独立运动 |
| `memory-book/films/spirit-pair.*`、`lion-nuzzle.*` | 下文列出的 Tenor 社区短 GIF 中原版角色动作；DreamWorks / Disney 权利归属保留 | 透明逐帧角色图集与原帧时长元数据；重新布景编排，无原片音轨 |
| `memory-book/photos/*.webp` | 下文五张 Unsplash 照片及作者记录 | 网图占位，不代表本人照片、出游或真实共同经历 |

### 原创 Blender 书与蛋糕

两件模型由 `scripts/models/build_magic_objects.py` 使用 Blender Python 创建，无第三方人物网格、电影贴图或 AI 静态图替代立体几何。古书含皮革封面、金饰、书脊、独立封面轴与纸页轴；蛋糕含深蓝奶油表面、金色星月装饰、烛身与托盘。`MagicObject.tsx` 添加实时灯光、材质细节、纸页弯曲、相机交互和烛火。

可编辑 Blender 母版位于忽略目录 `.asset-build/memory-book/masters/magic-book.blend`、`star-cake.blend`；发布仅使用对应 GLB。模型是脚本创作，**没有 imagegen 提示词**；生成记录的 `prompt` 明确为 `null`，不补造提示词。浏览器中实时驱动书页与烛火，不声称 GLB 内包含已烘焙演出动画。

### 沙画引擎、技能与中国地图

实际使用上游 [SandKit](https://github.com/LinklyAI/SandKit) 引擎，并参考、安装其真实 [sandkit-build](https://github.com/LinklyAI/SandKit/blob/main/skills/sandkit-build/SKILL.md) 与 [sandkit-art](https://github.com/LinklyAI/SandKit/blob/main/skills/sandkit-art/SKILL.md) 技能。引擎源文件原样保留在 `src/memory-book/vendor/sandkit/`，MIT 许可原文同目录 `LICENSE`；项目自行编写城市构图、段落时序、交互、回退与地图合流，不把上游引擎归为项目原创。

城市输入由项目 Canvas 线稿生成黑白构图，再供 GPU 沙粒采样；未使用电影截图，也不把推断的浅浮雕深度称为实测深度。连续沙画结束后再显示中国地图，分别绘出她的暖金线与他的月白线；在深圳的小结是原创象征，未为构成心形移动城市。

地图数据依据 [Natural Earth 公共领域条款](https://www.naturalearthdata.com/about/terms-of-use/)，取自其维护仓库：

- [1:110m 国家轮廓 GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson)：中国陆地轮廓及相关岛屿环，概括比例尺用于叙事示意。
- [1:10m populated places GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson)：北京、天津、香港、深圳、武汉、南京、上海的真实经纬度。

河南未指定城市，使用约东经 113.5°、北纬 34.0° 的**省级示意位置**；不声称具体出生地。学校只附城市与用户提供的名称，不指定校区。两条路线分开顺序呈现，不补造年份或暗示两人同时旅行。

### 原创分层二维泰迪

运行图 `memory-book/teddy-rig.webp`（1774 × 887，272,014 字节）来自内置 imagegen 的透明部件画稿，以历史 `puppy-apricot.webp` 作为卷毛与表情参考。请求为 2048 × 1024 的 4 × 2 部件网格，工具实际返回 1774 × 887；保留原 Alpha，仅用 sharp 转 WebP（quality 88、alphaQuality 100），未手工重画或修补原图。

母版与真实调用提示词分别保存在 `.asset-build/memory-book/masters/teddy-rig.png`、`teddy-rig.prompt.txt`；完整提示词也进入 [生成记录](../assets/memory-book-artwork.json) 的 `teddy-rig` 项。图集内容为独立躯干、头、耳、尾、前腿、后腿和闭眼头部，不是八张整犬姿势轮换。

`Pets.tsx` 通过 SVG viewBox 裁出部件，对四肢、躯干、头、耳、尾分别作关节变换，配合眨眼、短走、歪头和摸摸回应。奶油色来自同一原创图集的 CSS `saturate(.42) brightness(1.17)` 调色，并有镜像和独立节奏；没有另称一张新生成的奶油色 rig。阅读、离屏、后台和减少动态设置都会收敛动作。

### 原创电影舞台背景

生成日期：2026-10-03；工具：内置 OpenAI imagegen；无参考图、无电影角色、无电影场景临摹。母版 `.asset-build/memory-book/wind-and-stars-master.png` 为 1672 × 941，运行图 `memory-book/wind-and-stars.webp` 为 1600 × 900、287,242 字节，仅尺寸转换与 WebP 编码（quality 93）。原始输出保留，不作局部修图。

此画仅用于后景。透明原版角色动作来自下一节，其余运动来自 Canvas 图层；不会将这张 AI 原画本身称作逐帧电影。实际生成提示词逐字如下：

~~~text
Use case: illustration-story.
Asset type: original background painting for a cinematic 2D animated web stage; this is ONLY a scenery layer, not an animation or a finished poster.
Create a beautifully authored, restrained, hand-painted 16:9 landscape panorama, ideally 2048 x 1152 pixels. A vast open grassland at the precise poetic moment when the last warm sunset gives way to a deep-blue evening sky. One continuous coherent location and lighting transition, not a split image. Low rolling violet mountains on the distant horizon, pale warm gold along that horizon, layered painterly indigo and dusty blue clouds above, with just a few tiny early stars high in the sky. Spacious and tender, expansive and romantic.
Composition: horizon at about 63% of image height; traversable flat earth and short ochre grasses occupy the lower third. Leave the middle 75% of the width uncluttered at ground level so separately composited hand-drawn animals can run horizontally across it. Modest low sandstone rocks and gentle grassy slopes at the extreme left and right edges frame the scene, never large hero rock formations. Distant hill layers have carefully varied silhouettes and atmospheric perspective. The center of the ground is clearly readable and calm.
Medium: premium traditional feature-animation background painting, fine gouache and watercolor on paper with soft dry-brush texture, intentional painted edges, subtle value structure, clean large silhouettes and exquisitely controlled color, genuinely drawn and painted appearance rather than photorealism or 3D rendering. Preserve natural modest contrast so the animated foreground characters will read.
Palette: warm honey and muted amber low on the horizon and on a little of the ground, dusty plum distant hills, midnight ultramarine and slate-blue upper sky, subdued warm-gray rocks, restrained sage and ochre grass.
Constraints: absolutely no people, animals, movie characters, recognizable film landmarks, buildings, text, lettering, logo, title, frame or watermark. Entirely original scenery. No neon, no lens flare, no bloom, no glowing particles, no glitter, no glowing grass, no magical beams, no Milky Way, no over-saturated orange-purple AI fantasy gradient. No busy foreground vegetation and no central obstacle. No collage and no separate panels. Opaque background.
~~~

### 原版电影角色动作：当前合成素材

公开社区 GIF 是原版动作的获取来源，**不是官方发布账户或开源授权素材**。版权分别属于 DreamWorks Animation / Disney，社区上传者和公开下载地址不改变原作权利；本记录不把“公开可见”写成再分发许可。没有下载整部电影、使用原声或用近似新画角色冒充原版。

| 原版动作 | 上传页面与原始下载 | 提取与运行文件 |
| --- | --- | --- |
| 2002《小马王》Spirit / Rain 双马嬉戏 | Tenor 上传者 **MrThreat**：[来源页面](https://tenor.com/view/horses-spirit-spirit2002-spirit-stallion-of-the-cimarron-gif-14770152)，[GIF CDN](https://media1.tenor.com/m/3U9ZHGQTBzMAAAAd/horses-spirit.gif)；© DreamWorks | 原始 640 × 274，35 帧、3.5 秒；取第 7–34 帧，共 28 帧、2.8 秒。裁切区域 [30, 70, 570, 254]，每帧 540 × 184，5 列图集；`memory-book/films/spirit-pair.webp` 与 `.json` |
| 1994《狮子王》Simba / Nala 依偎 | Tenor 上传者 **Sephirock38**：[来源页面](https://tenor.com/view/lion-king-simba-nala-in-love-gif-18769637)，[GIF CDN](https://media1.tenor.com/m/OsGLEXzxVCoAAAAd/lion-king-simba.gif)；© Disney | 原始 640 × 388，16 帧、1.92 秒；每帧 640 × 388，4 列图集；`memory-book/films/lion-nuzzle.webp` 与 `.json` |

原始 GIF 保存在忽略的 `.asset-build/memory-book/film-source/`，不随网站发布。狮子使用手工轮廓、光流跟随及窄边带修边；双马使用静止背景重建差分与轮廓清理。保留原角色 RGB、相对遮挡和各帧时长，不补造被原画边缘、草或对方身体遮住的部位。可编辑逐帧遮罩保存在制作目录。Spirit / Rain 的蹄部原有草遮挡，狮子为延伸到画幅下沿的近景，合成时通过镜头位置和原创前景草承接裁切。

`Cinema.tsx` 将原版动作置于原创 20 秒 Canvas 段落：Spirit / Rain 的原动作、暮色转深、Simba / Nala 的原版依偎、星光落向下一页；原动作各播放一次后保留末帧，不用无限循环冒充长镜头。暂停、重看、点星送风和减少动态下三幅静态推进已接入，未使用 iframe、预告播放器或原片音轨。**已观察完整播放到20秒结束，落星交互位置随时间更新；另针对狮子近景下沿修正后观察一张画面。未反复长循环测试。**

以下为历史版本的有效来源与许可留档；其中“当前”“主片”等字样只指相应日期版本。

## 历史：2026-09-27 独立角色预览

本次候选位于独立 `character-review.html`，不修改当前线上角色。Snow / Rain 的 CC BY 4.0 来源、修改项、制作主文件、官方狮子对照与尚未完成的项目见 [角色重制交接](../docs/CHARACTER_REWORK.md)。这些 GLB 是检查姿态，不是生产编舞动画；当前造型状态为待验收。第四章仅整理了 Disney 官方 1994 版图像对照，尚未产出新的角色稿或动作图集。

## 历史交互版本（2026-09-27）

- 正常阅读路径的钢琴、双人舞和双犬已改为实时 GLB，不再请求 `cinema/*.mp4`。使用本页已列出的 `grand-piano.glb`、`jazz-duo.glb`、`teddy-apricot.glb`、`teddy-cream.glb`，沿用原署名与许可。旧影片及来源记录保留为历史资料。
- 草原三幕现在由 `src/scene/SavannaStory.tsx` 中原创 SVG 曲线和 CSS/交互时间线绘制：天空、远山、金合欢、河流、岩石、成年与幼年狮子。未使用电影画面、官方角色贴图或新下载的狮子素材；这是风格化绘本，不标称电影级逐帧动画。
- 钢琴坐姿、手臂和手指目标约束由 `PianistPose.ts` 计算，舞蹈继续使用现有模型动画。蛋糕为项目代码生成的单层奶油与草莓造型，烟花为 CSS 图形。
- 书信支持用户自行提供的真人录音；默认未配置录音，也未合成人声。当前相册仍是原来的三张风景示意，未伪造私人照片或经历。
- 本轮没有新增第三方下载素材；下方 cinema 条目的许可仍随保留文件保存。

## 历史 cinema 影像来源（2026-09-23）

| 新素材 | 原始作者、版本与许可 | 本项目修改 |
| --- | --- | --- |
| `cinema/duet-landscape.*`、`duet-portrait.*` 男舞者 | [Snow v4](https://studio.blender.org/characters/snow/v4/)，Snow Rig (CC) Blender Foundation · studio.blender.org，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 服装材质、编舞、场景、镜头与灯光 |
| 同一双人舞女舞者 | [Rain v3](https://studio.blender.org/characters/rain/v3/)，Rain Rig (CC) Blender Foundation · studio.blender.org，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 黄色裙装、材质、编舞、场景、镜头与灯光 |
| `cinema/pets/apricot-*`、`cream-*` 和两张海报 | [Autumn v1](https://studio.blender.org/characters/autumn/v1/)，Autumn character © Blender Foundation · studio.blender.org，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 杏色/奶油色、垂耳、眉眼、短卷毛、暗色犬眼、六种原创动作、透明渲染与遮罩编码；保留原梗犬基础，并非完全重雕的贵宾犬 |
| `cinema/pride-landscape.*`、`pride-portrait.*` | [Baby Lion / kenchoo](https://sketchfab.com/3d-models/baby-lion-c9599625dc474262aab754d7b63841f5)，[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) | 沿用项目成年衍生与幼狮资产，重新布景、镜头、材质、灯光和离线演出 |
| 双人舞远景，源文件 `scripts/cinema/assets/dusk-city.png` | 本项目使用内置 OpenAI imagegen 生成，2026-09-23 | 洛杉矶暮色城市、远山与天空的 matte；由 `stage_duet.py` 放入 Blender，前景角色和舞台保持真实三维渲染；不是电影原片或完整影片替代 |
| 草原远景，源文件 `scripts/cinema/assets/savanna-dawn.png`、`savanna-stars.png` | 本项目使用内置 OpenAI imagegen 生成，2026-09-23 | 草原日出与星空远景；前景狮子、毛发、岩石及表演在 Blender 中渲染 |
| 草原影片 14.42 秒处狮吼；源文件 `scripts/cinema/assets/lion-roar-public-domain.ogg` | [Lion raring-sound1TamilNadu178.ogg / த*உழவன்](https://commons.wikimedia.org/wiki/File:Lion_raring-sound1TamilNadu178.ogg)，作者声明全球公共领域（PD-self） | 截取 2.75 秒、60 Hz 高通、2600 Hz 低通、响度调整、淡入淡出与短反射，混入原创伴奏 |

主片没有使用电影原片、电影动作捕捉数据或原声。双人舞和草原配乐分别由 `scripts/cinema/score.py`、`pride_score.py` 制作原创短句，使用项目已有 Salamander 钢琴采样，沿用下方及 [音频许可](audio/LICENSE.md) 的 CC BY 3.0 署名。草原声轨另含上表公共领域狮吼录音；页面按钮的低声回应仍是合成音效。Blender Foundation、原作者与本项目或生日祝福没有背书关系。

源页面、稳定下载入口、许可及本地 ZIP 的 SHA-256 已记录在仓库 `scripts/cinema/sources.json`。源 ZIP 在忽略目录 `model-sources/studio/`，不会重复放进网页；网站不加载原始专业 `.blend`。这些条目记录输入和用途，影片是否完整以 `npm run cinema:validate` 的实际检查报告为准。

## 历史琴舞连续动作候选（2026-10-03）

`duet-review-20261003-v1` 的 `snow-performance.glb` 与 `rain-performance.glb` 衍生自上表 Blender Studio Snow v4.2 / Rain v3.2（v3.3 源包），CC BY 4.0。项目修改了白衬衫权重、舞鞋、单手演奏、邀请牵手及共同动作时间线；导出保留骨架和原创编舞，再经 Meshopt 压缩。钢琴继续采用 jeremy / Poly Pizza 的 CC BY 3.0 模型，未改变来源许可。

该版本已发布到现有 R2，通过独立预览使用；完整记录见 [重制进度](../docs/CHARACTER_REWORK.md)。美术验收仍为待完成，没有用这次功能检查证明精确指尖接触、服装动态或手机实机表现已达标。

## 保留素材与旧版历史

以下保留各版来源链。旧 cinema 文件和许可仍保留；本节只描述当时实现，不能作为当前五章的运行说明。

获取日期：2026-09-20。网图用于本次生日主题预览，不代表师宝宝的个人照片或真实共同经历。

| 本地文件 | 来源 | 用途 |
| --- | --- | --- |
| images/forest.jpg | [Unsplash 原图](https://images.unsplash.com/photo-1441974231531-c6227db76b6e) | 相册风景示意 |
| images/mountains.jpg | [Unsplash 原图](https://images.unsplash.com/photo-1464822759023-fed622ff2c3b) | 相册风景示意 |
| images/lake.jpg | [Unsplash 原图](https://images.unsplash.com/photo-1470770841072-f978cf4d019e) | 相册风景示意 |
| images/castle-night.webp | 内置 imagegen 生成 | 月光图书馆与烛光书桌；替换原开场图 |
| images/jazz-night.webp | 内置 imagegen 生成 | 蓝紫暮色、城市灯光与路灯；已移除背景钢琴，交由实时模型呈现 |
| images/savanna-cinema.webp | 内置 imagegen 生成 | 草原夕阳、岩石与远山的空间层次 |
| fonts/birthday-serif.woff | [Google Fonts Noto Serif SC](https://github.com/google/fonts/tree/main/ofl/notoserifsc) | 公开字体下载后在本地生成的中文子集，许可见 NotoSerifSC-OFL.txt |

第三方图片的权利属于原作者或权利人；上表记录出处，不声明它们属于公共领域。

## 历史三维模型

| 文件 | 作者与许可 | 修改与用途 |
| --- | --- | --- |
| models/teddy-apricot.glb / teddy-cream.glb | 项目原创，Blender 制作 | 四足泰迪比例、较小眼睛、突出犬吻、卷毛法线、骨骼、眨眼与四组动作 |
| models/grand-piano.glb | [jeremy / Poly Pizza](https://poly.pizza/m/7U-93vxPOER)，CC BY 3.0 | 黑漆材质调整，另加交互琴键、琴凳与舞台照明；详见 models/PIANO-LICENSE.md |
| models/jazz-duo.glb | Quaternius，CC0 基础人物与兼容骨架；衣服为项目原创 | 白衬衫、长裤、黄裙、低帮舞鞋，12 秒侧步、轻踢和牵手转身；具体上游文件和许可见模型目录 |
| models/lions/lion-cub.glb / father-lion.glb | [kenchoo / Baby Lion](https://sketchfab.com/3d-models/baby-lion-c9599625dc474262aab754d7b63841f5)，CC BY 4.0 | 幼狮网格基础上制作成年比例、鬃毛与 Idle / Walk / Roar / Bow 骨骼动作；详见 models/lions/LICENSE.txt |

贺卡、蛋糕和场景效果由项目内 Three.js 几何绘制；双犬与舞者在 Blender 中制作或装配，并导出 GLB。狮子和舞者均已替换为实时三维角色，不再使用图片动作图集。模型作者与本项目及电影主题没有关联或背书关系。

背景采用生成场景绘画，不是电影原片。声音为本地合成生日曲、原创钢琴短句和低声回应。魔法轨迹、星光、照明与角色通过开卡、琴音、吼声、许愿事件结合。

生成方式、素材路径和完整提示词见 [美术说明](ART_DIRECTION.md)。

2026-09-22：双人舞舞台新增代码绘制的暮色天空、三层远山、城市灯点、栏杆、地面和路灯，均与角色共用 Three.js 相机。全页 `jazz-night.webp` 仍用于书信章节背景，舞台内部由实时三维场景提供空间层次。本次未新增第三方素材。

## 历史更新（2026-09-23）

- `audio/piano-c4.mp3`、`audio/piano-a4.mp3`：Alexander Holm 的 Salamander Grand Piano V3，CC BY 3.0；取自 [Tone.js 音频分发](https://tonejs.github.io/audio/salamander/)，许可与修改说明见 [audio/LICENSE.md](audio/LICENSE.md)。单音文件未改动，播放时移调和包络处理；不是电影原声。
- 纸张、信封、烛火：项目原创 Web Audio 噪声/滤波合成，不标称真实录音。本轮未引入有版权疑问的音乐或拟音素材。
- 舞者、双犬和狮子由现有 Blender 源脚本精修；Meshopt 不改变来源许可。`scripts/models/sources.json` 记录可复现输入与哈希，幼狮制作基线固定为本仓库 e3ff45f 中的授权衍生模型。
- 荣耀石轮廓与程序凹凸由代码生成。未新增电影截图、角色贴图、logo 或伪造个人照片。
- Meshopt 解码器来自 Three.js 包中的 meshoptimizer（MIT）；KTX2 Basis Universal 转码器随 Three.js 构建复制（Apache-2.0）；网站构建保留解码器自带版权声明，完整许可随 `public/licenses/` 发布；该目录也保留新增 GSAP 的版权声明与标准许可链接。

## 仍在使用的五张预览照片（2026-10-03）

以下为用户授权的新五章制作资源。五张照片均为网图示意，**不代表本人照片、共同出游或真实往事**；图注是面向未来的祝福。运行配置集中在 `src/memory-book/media.ts`，本地图片使用项目基础路径，适用于 GitHub Pages 的 `/birthday-card/` 子路径。

### 本地照片

原始图片页面均明确标注免费 [Unsplash License](https://unsplash.com/license)，不是 Unsplash+ 付费素材。2026-10-03 从对应 `images.unsplash.com` 原图分发地址获取 WebP 运行版本，只做等比例缩放及编码压缩，无生成、拼接、内容修饰或冒充私人照片。已实际查看选定的五张图。图片正文中的书籍属于摄影内容，不表达收礼人的信仰或阅读经历。

| 本地文件 | 作者与原始页面 | 原图分发标识 | 运行尺寸 | 用途 |
| --- | --- | --- | --- | --- |
| `memory-book/photos/ocean-evening.webp` | [Veronica MORENO-ALVAREZ / Unsplash](https://unsplash.com/photos/ocean-waves-at-sunset-with-pink-sky-l_yA9G07D4A) | `photo-1767844077142-feb6e7308736` | 1600 × 1067 | 粉金色黄昏海面；相册第一张 |
| `memory-book/photos/sunlit-book.webp` | [Aaron Burden / Unsplash](https://unsplash.com/photos/opened-book-on-brown-field-during-daytime-4uX_r8OhJ_o) | `photo-1593485589800-579b43749b15` | 1600 × 1200 | 日光中的打开书籍与小路 |
| `memory-book/photos/city-lights.webp` | [Paolo Syiaco / Unsplash](https://unsplash.com/photos/bokeh-photography-of-city-lights-during-night-time-Uc8wfh1tPUk) | `photo-1619528614119-56530cb5ef1e` | 1600 × 1067 | 城市灯光散景；不标称深圳实景 |
| `memory-book/photos/golden-path.webp` | [Stefano Pinotti / Unsplash](https://unsplash.com/photos/sunlight-streams-through-a-forest-path-AqFtUA6WhTI) | `photo-1762933604852-4b4409603588` | 1067 × 1600 | 金色日光的森林小路 |
| `memory-book/photos/night-sky.webp` | [Nathan Anderson / Unsplash](https://unsplash.com/photos/milky-way-over-mountain-landscape-at-night-L95xDkSSuWw) | `photo-1488866022504-f2584929ca5f` | 1600 × 1077 | 星河与远山；相册末页 |

五张运行图合计约 2.03 MiB。保留原有宽高比；界面裁切仅由 `object-position` 控制，放大时应能看完整图。许可允许免费下载和用于本项目；作者署名及原始页链接保留在上述表格和配置中。

## 历史：官方远程静帧与外部播放入口（2026-10-03 首版）

| 作品 | 展示画面与来源 | 官方播放入口 | 获取形态与边界 |
| --- | --- | --- | --- |
| 《小马王》 / Spirit: Stallion of the Cimarron（2002） | [DreamWorks 官方片目](https://www.dreamworks.com/movies/spirit-stallion-of-the-cimarron)中的[横幅宣传原图](https://www.dreamworks.com/storage/movies/spirit-stallion-of-the-cimarron/spirit-stallion-of-the-cimarron-hero-image.jpg) | [DreamWorks Spirit 官方账号预告](https://www.youtube.com/watch?v=RPJ4EQ2Eh9I) | 远程引用官方原图，不在仓库保存原片或宣传图副本；YouTube oEmbed 返回片名与 DreamWorks Spirit 账号，确认来源；地区播放与嵌入仍取决于官方服务 |
| 《狮子王》 / The Lion King（1994） | [Disney 官方片目](https://movies.disney.com/the-lion-king)中的[辛巴与娜娜原版剧照](https://lumiere-a.akamaihd.net/v1/images/g_thelionking_01_fd5dcd2d.jpeg?region=0%2C0%2C1200%2C560) | [Disney 官方原版预告](https://video.disney.com/watch/the-lion-king-trailer-554364a2df54eb31138c2eaf) | 远程引用官方原图，不在仓库保存原片或剧照副本；官方页面明确是 1994 版 |

以下为首版静帧方案的来源记录，当前已替换为本文开头的透明角色帧合成。电影图像版权分别属于 DreamWorks Animation / Disney。首版未取得开放再分发许可，**不将“官方网站可见”写成自由素材授权**；当时只远程引用官方静态画面和跳转入口，没有在站内提供本地自动播放短片。远程图或播放服务不可用时，须仍保留标题、祝福、官方入口和继续下一章的功能，不能卡住蛋糕结尾。本项目原创的两段祝福不引用电影台词，也不声称官方背书。

历史静帧选图修正：实际查看 DreamWorks 的红黑剪影横幅及官方预告缩略图后，后者为 480 × 360 的雪中群马远景，均不适合表现 Spirit 的面部神态。当时将 `media.ts` 中小马王展示图替换为 [Universal 同片官方发行页](https://www.universalpicturesathome.com/movies/spirit-stallion-of-the-cimarron) 的 Digital 版本 [Spirit 与 Rain 双角色海报](https://images.contentstack.io/v3/assets/blt13adb7e2033fcee5/blt2815f5291917d13f/690eacd9518443a93372835a/Spirit_PosterArt.jpg?width=800)。实际查看的远程版本为 **800 × 1132**，有原版两位角色清晰表情；这是官方海报，不称为电影截帧。保持远程引用及原版官方预告入口，未另存海报到仓库。该图为竖幅，展示应使用完整海报/`object-fit: contain`，不能硬铺满横幅裁掉耳朵和鼻尖。狮子王官方剧照同样应完整保留辛巴与娜娜的两位主体。
