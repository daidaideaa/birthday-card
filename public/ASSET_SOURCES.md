# 素材来源

## 2026-09-27 独立角色预览

本次候选位于独立 `character-review.html`，不修改当前线上角色。Snow / Rain 的 CC BY 4.0 来源、修改项、制作主文件、官方狮子对照与尚未完成的项目见 [角色重制交接](../docs/CHARACTER_REWORK.md)。这些 GLB 是检查姿态，不是生产编舞动画；当前造型状态为待验收。第四章仅整理了 Disney 官方 1994 版图像对照，尚未产出新的角色稿或动作图集。

## 当前交互版本（2026-09-27，优先于下方历史描述）

- 正常阅读路径的钢琴、双人舞和双犬已改为实时 GLB，不再请求 `cinema/*.mp4`。使用本页已列出的 `grand-piano.glb`、`jazz-duo.glb`、`teddy-apricot.glb`、`teddy-cream.glb`，沿用原署名与许可。旧影片及来源记录保留为历史资料。
- 草原三幕现在由 `src/scene/SavannaStory.tsx` 中原创 SVG 曲线和 CSS/交互时间线绘制：天空、远山、金合欢、河流、岩石、成年与幼年狮子。未使用电影画面、官方角色贴图或新下载的狮子素材；这是风格化绘本，不标称电影级逐帧动画。
- 钢琴坐姿、手臂和手指目标约束由 `PianistPose.ts` 计算，舞蹈继续使用现有模型动画。蛋糕为项目代码生成的单层奶油与草莓造型，烟花为 CSS 图形。
- 书信支持用户自行提供的真人录音；默认未配置录音，也未合成人声。当前相册仍是原来的三张风景示意，未伪造私人照片或经历。
- 本轮没有新增第三方下载素材；下方 cinema 条目的许可仍随保留文件保存。

## 当前 cinema 影像来源（2026-09-23）

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

## 2026-10-03 连续动作候选

`duet-review-20261003-v1` 的 `snow-performance.glb` 与 `rain-performance.glb` 衍生自上表 Blender Studio Snow v4.2 / Rain v3.2（v3.3 源包），CC BY 4.0。项目修改了白衬衫权重、舞鞋、单手演奏、邀请牵手及共同动作时间线；导出保留骨架和原创编舞，再经 Meshopt 压缩。钢琴继续采用 jeremy / Poly Pizza 的 CC BY 3.0 模型，未改变来源许可。

该版本已发布到现有 R2，通过独立预览使用；完整记录见 [重制进度](../docs/CHARACTER_REWORK.md)。美术验收仍为待完成，没有用这次功能检查证明精确指尖接触、服装动态或手机实机表现已达标。

## 保留素材与旧版历史

以下保留各版的来源链。正常阅读路径已恢复实时互动；旧 cinema 文件和许可仍保留，不能把历史实现说明当作当前场景的运行方式。

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

## 三维模型

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

## 2026-09-23 更新

- `audio/piano-c4.mp3`、`audio/piano-a4.mp3`：Alexander Holm 的 Salamander Grand Piano V3，CC BY 3.0；取自 [Tone.js 音频分发](https://tonejs.github.io/audio/salamander/)，许可与修改说明见 [audio/LICENSE.md](audio/LICENSE.md)。单音文件未改动，播放时移调和包络处理；不是电影原声。
- 纸张、信封、烛火：项目原创 Web Audio 噪声/滤波合成，不标称真实录音。本轮未引入有版权疑问的音乐或拟音素材。
- 舞者、双犬和狮子由现有 Blender 源脚本精修；Meshopt 不改变来源许可。`scripts/models/sources.json` 记录可复现输入与哈希，幼狮制作基线固定为本仓库 e3ff45f 中的授权衍生模型。
- 荣耀石轮廓与程序凹凸由代码生成。未新增电影截图、角色贴图、logo 或伪造个人照片。
- Meshopt 解码器来自 Three.js 包中的 meshoptimizer（MIT）；KTX2 Basis Universal 转码器随 Three.js 构建复制（Apache-2.0）；网站构建保留解码器自带版权声明，完整许可随 `public/licenses/` 发布；该目录也保留新增 GSAP 的版权声明与标准许可链接。

## 2026-10-03 魔法记忆之书：五张预览照片与两部原版动画

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

### 原版电影：官方远程画面与官方播放入口

| 作品 | 展示画面与来源 | 官方播放入口 | 获取形态与边界 |
| --- | --- | --- | --- |
| 《小马王》 / Spirit: Stallion of the Cimarron（2002） | [DreamWorks 官方片目](https://www.dreamworks.com/movies/spirit-stallion-of-the-cimarron)中的[横幅宣传原图](https://www.dreamworks.com/storage/movies/spirit-stallion-of-the-cimarron/spirit-stallion-of-the-cimarron-hero-image.jpg) | [DreamWorks Spirit 官方账号预告](https://www.youtube.com/watch?v=RPJ4EQ2Eh9I) | 远程引用官方原图，不在仓库保存原片或宣传图副本；YouTube oEmbed 返回片名与 DreamWorks Spirit 账号，确认来源；地区播放与嵌入仍取决于官方服务 |
| 《狮子王》 / The Lion King（1994） | [Disney 官方片目](https://movies.disney.com/the-lion-king)中的[辛巴与娜娜原版剧照](https://lumiere-a.akamaihd.net/v1/images/g_thelionking_01_fd5dcd2d.jpeg?region=0%2C0%2C1200%2C560) | [Disney 官方原版预告](https://video.disney.com/watch/the-lion-king-trailer-554364a2df54eb31138c2eaf) | 远程引用官方原图，不在仓库保存原片或剧照副本；官方页面明确是 1994 版 |

电影图像版权分别属于 DreamWorks Animation / Disney。未取得开放再分发许可，**不将“官方网站可见”写成自由素材授权**，也未下载整部电影、抽取受保护视频或另造近似角色冒充原版。当前资源是官方静态画面和跳转入口，并非本站本地自动播放短片。远程图或播放服务不可用时，须仍保留标题、祝福、官方入口和继续下一章的功能，不能卡住蛋糕结尾。本项目原创的两段祝福不引用电影台词，也不声称官方背书。

原版电影画面选图修正：实际查看 DreamWorks 的红黑剪影横幅及官方预告缩略图后，后者为 480 × 360 的雪中群马远景，均不适合表现 Spirit 的面部神态。现将 `media.ts` 中小马王展示图替换为 [Universal 同片官方发行页](https://www.universalpicturesathome.com/movies/spirit-stallion-of-the-cimarron) 的 Digital 版本 [Spirit 与 Rain 双角色海报](https://images.contentstack.io/v3/assets/blt13adb7e2033fcee5/blt2815f5291917d13f/690eacd9518443a93372835a/Spirit_PosterArt.jpg?width=800)。实际查看的远程版本为 **800 × 1132**，有原版两位角色清晰表情；这是官方海报，不称为电影截帧。保持远程引用及原版官方预告入口，未另存海报到仓库。该图为竖幅，展示应使用完整海报/`object-fit: contain`，不能硬铺满横幅裁掉耳朵和鼻尖。狮子王官方剧照同样应完整保留辛巴与娜娜的两位主体。
