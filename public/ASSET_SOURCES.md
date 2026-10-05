# 素材来源

## 当前五章版本（2026-10-04；以下本节优先）

本节记录 `src/memory-book` 当前实现。旧三维人物与犬、琴舞、静态画稿和外部播放器已退役并清理；旧来源与许可见文末历史入口。已实际播放新的20秒电影合成，查看两组原动作、角色轮廓与结尾落星；这不等于用户已认可最终美术或真实手机已实测。

| 当前运行素材 | 来源与制作方式 | 实际用途 |
| --- | --- | --- |
| `memory-book/magic-book.glb`、`star-cake.glb` | 项目原创 Blender 几何、材质与结构；生成脚本 `scripts/models/build_magic_objects.py` | Three.js 真实三维古书与深蓝金色蛋糕；书封与六层纸页由浏览器实时开合、弯曲；蛋糕可观察、许愿与熄烛 |
| `src/memory-book/vendor/sandkit/*` | [LinklyAI / SandKit](https://github.com/LinklyAI/SandKit)，MIT，Copyright © 2026 Linkly AI | WebGL2 沙粒模拟和形变；项目原创城市线稿、顺序叙事、触摸擦拭与合流构图 |
| `Journey.tsx` 内中国轮廓与城市位置 | [Natural Earth](https://www.naturalearthdata.com/)，公共领域 | 沙画结束时展示真实地理位置上的双路线与深圳结点 |
| `memory-book/teddy-apricot-painted.webp`、`teddy-cream-painted.webp` | 内置 OpenAI imagegen 生成的透明精绘部件图集 | 两只泰迪的头、耳、躯干、四肢和尾部分层动画；不是整张姿态图片平移 |
| `memory-book/library-cinema.webp` | 内置 OpenAI imagegen 生成的克制旧书房背景；完整提示词在生成记录 | 开场环境底片，独立于可互动的三维书；不冒称实拍或原版电影画面 |
| `memory-book/wind-and-stars.webp` | 内置 OpenAI imagegen 原创手绘旷野背景；完整提示词见下节 | 电影合成舞台的**静态后景一层**；前景草、风、星、镜头和原版角色帧独立运动 |
| `memory-book/films/spirit-pair.*`、`lion-nuzzle.*` | 下文列出的 Tenor 社区短 GIF 中原版角色动作；DreamWorks / Disney 权利归属保留 | 透明逐帧角色图集与原帧时长元数据；重新布景编排，无原片音轨 |
| `memory-book/photos/*.webp` | 下文五张 Unsplash 照片及作者记录 | 网图占位，不代表本人照片、出游或真实共同经历 |

### 原创 Blender 书与蛋糕

两件模型由 `scripts/models/build_magic_objects.py` 使用 Blender Python 创建，无第三方人物网格、电影贴图或 AI 静态图替代立体几何。古书含皮革封面、金饰、书脊、独立封面轴与纸页轴；蛋糕含深蓝奶油表面、金色星月装饰、烛身与托盘。`MagicObject.tsx` 添加实时灯光、材质细节、纸页弯曲、相机交互和烛火。

可编辑 Blender 母版位于忽略目录 `.asset-build/memory-book/masters/magic-book.blend`、`star-cake.blend`；发布使用对应 GLB。几何由原创脚本制作；本轮另用内置 imagegen 制作近黑皮革装帧与手抄魔法笔记纹理（旧植物书页已退役），来源与提示词单独记录，贴图不取代立体书几何。浏览器中实时驱动书页与烛火，不声称 GLB 内包含已烘焙演出动画。

### 沙画引擎、技能与中国地图

实际使用上游 [SandKit](https://github.com/LinklyAI/SandKit) 引擎，并参考、安装其真实 [sandkit-build](https://github.com/LinklyAI/SandKit/blob/main/skills/sandkit-build/SKILL.md) 与 [sandkit-art](https://github.com/LinklyAI/SandKit/blob/main/skills/sandkit-art/SKILL.md) 技能。引擎源文件原样保留在 `src/memory-book/vendor/sandkit/`，MIT 许可原文同目录 `LICENSE`；项目自行编写城市构图、段落时序、交互、回退与地图合流，不把上游引擎归为项目原创。

城市输入由项目 Canvas 线稿生成黑白构图，再供 GPU 沙粒采样；未使用电影截图，也不把推断的浅浮雕深度称为实测深度。连续沙画结束后再显示中国地图，分别绘出她的暖金线与他的月白线；在深圳的小结是原创象征，未为构成心形移动城市。

地图数据依据 [Natural Earth 公共领域条款](https://www.naturalearthdata.com/about/terms-of-use/)，取自其维护仓库：

- [1:110m 国家轮廓 GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson)：中国陆地轮廓及相关岛屿环，概括比例尺用于叙事示意。
- [1:10m populated places GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_populated_places_simple.geojson)：北京、天津、香港、深圳、武汉、南京、上海的真实经纬度。

用户已确认起点为河南周口；采用约东经 114.65°、北纬 33.62° 的城市示意位置。他从湖北武汉开始，不额外声称具体出生地。学校只附城市与用户提供的名称，不指定校区。两条路线分开顺序呈现，不补造年份或暗示两人同时旅行。

### 原创分层二维泰迪

2026-10-04 用户再次指出 SVG 造型像羊，已撤换为内置 imagegen 制作的精绘泰迪透明部件图集，杏色与香槟奶油色分别保存。自然犬类口鼻、长垂耳、深色眼神与不规则卷毛取代规则云朵轮廓。七个部件区域由 SVG 容器裁切，四肢、头、耳、尾分别运动；四拍步态、嗅闻、坐下/卧下、眨眼、摸摸回应和错时庆祝由浏览器程序生成，图集中整犬参考格不参与动画。

母版 `.asset-build/memory-book/masters/teddy-apricot-painted.png`、`teddy-cream-painted.png` 和完整提示词 `teddy-painted-prompts.md` 保留，发布仅做 WebP 编码，保留生成的 alpha。未用图像 API、未购买素材；内置生成是本项目的美术来源，不冒称手工逐帧绘制。透明原稿的机械裁切与动画变换不修改狗的美术内容。

历史 `memory-book/teddy-rig.webp` 不再被运行时引用；其原始 imagegen 母版、提示词与来源记录仍保留于 `.asset-build/memory-book/masters/` 和 `assets/memory-book-artwork.json`，没有更改旧素材的制作来源。后台/离屏停止连续绘制，减少动态保留静态互动回应。
### 原创电影舞台背景

生成日期：2026-10-03；工具：内置 OpenAI imagegen；无参考图、无电影角色、无电影场景临摹。母版 `.asset-build/memory-book/wind-and-stars-master.png` 为 1672 × 941，运行图 `memory-book/wind-and-stars.webp` 为 1600 × 900、287,242 字节，仅尺寸转换与 WebP 编码（quality 93）。原始输出保留，不作局部修图。

此画仅用于后景。透明原版角色动作来自下一节，其余运动来自 Canvas 图层；不会将这张 AI 原画本身称作逐帧电影。完整提示词见 [生成记录](../assets/memory-book-artwork.json) 的 `wind-and-stars` 项。

### 原版电影角色动作：当前合成素材

公开社区 GIF 是原版动作的获取来源，**不是官方发布账户或开源授权素材**。版权分别属于 DreamWorks Animation / Disney，社区上传者和公开下载地址不改变原作权利；本记录不把“公开可见”写成再分发许可。没有下载整部电影、使用原声或用近似新画角色冒充原版。

| 原版动作 | 上传页面与原始下载 | 提取与运行文件 |
| --- | --- | --- |
| 2002《小马王》Spirit / Rain 双马嬉戏 | Tenor 上传者 **MrThreat**：[来源页面](https://tenor.com/view/horses-spirit-spirit2002-spirit-stallion-of-the-cimarron-gif-14770152)，[GIF CDN](https://media1.tenor.com/m/3U9ZHGQTBzMAAAAd/horses-spirit.gif)；© DreamWorks | 原始 640 × 274，35 帧、3.5 秒；取第 7–34 帧，共 28 帧、2.8 秒。裁切区域 [30, 70, 570, 254]，每帧 540 × 184，5 列图集；`memory-book/films/spirit-pair.webp` 与 `.json` |
| 1994《狮子王》Simba / Nala 依偎 | Tenor 上传者 **Sephirock38**：[来源页面](https://tenor.com/view/lion-king-simba-nala-in-love-gif-18769637)，[GIF CDN](https://media1.tenor.com/m/OsGLEXzxVCoAAAAd/lion-king-simba.gif)；© Disney | 原始 640 × 388，16 帧、1.92 秒；每帧 640 × 388，4 列图集；`memory-book/films/lion-nuzzle.webp` 与 `.json` |

原始 GIF 保存在忽略的 `.asset-build/memory-book/film-source/`，不随网站发布。狮子使用手工轮廓、光流跟随及窄边带修边；双马使用静止背景重建差分与轮廓清理。保留原角色 RGB、相对遮挡和各帧时长，不补造被原画边缘、草或对方身体遮住的部位。可编辑逐帧遮罩保存在制作目录。Spirit / Rain 的蹄部原有草遮挡，狮子为延伸到画幅下沿的近景，合成时通过镜头位置和原创前景草承接裁切。

`Cinema.tsx` 将原版动作置于原创 20 秒 Canvas 段落：Spirit / Rain 的原动作、暮色转深、Simba / Nala 的原版依偎、星光落向下一页；原动作各播放一次，短暂停留后淡出到风与星空，避免长时间保持末帧；没有无限循环或倒放冒充长动作。进入章节自然展开，已移除进度条及播放器外框；暂停、重看、点星送风和减少动态下三幅静态推进已接入，未使用 iframe、预告播放器或原片音轨。**已观察完整播放到20秒结束，落星交互位置随时间更新；另针对狮子近景下沿修正后观察一张画面。未反复长循环测试。**

### V7 · 古书、幼犬与构图（2026-10-04）

手机背景 memory-book/library-cinema-portrait.webp 是以内置imagegen参考原书房重新构图的836×1881竖幅，保留两侧书架、完整窗与桌面；未用程序拉伸或裁图冒充新构图。母版和完整prompt在制作目录及统一生成记录中。

书封与纸页去除花卉藤蔓，改为旧皮铜件、封蜡与虚构魔法笔记。完整提示词在 assets/memory-book-artwork.json；母版 book-wizard-cover-source.png、book-spell-notes-source.png 及 wizard-book-generation.json 位于本地忽略的制作目录。memory-book/manuscript-leaf.webp 是同一手稿的机械WebP编码，用于纸页经过镜头的转场。

memory-book/teddy-puppy-expressions.webp 是内置imagegen参考已有泰迪风格生成的RGBA表情图集（1024×1536）；分别为睁眼、闭眼和轻吐舌，身体与长耳仍单独运动。完整原始提示词及参考关系在生成记录；旧机械编码脚本已随退役导出清理，可从V8提交的Git历史恢复。没有购买素材或调用付费API。

useMusic.ts 为本项目原创WebAudio声景，由用户主动开启。本地合成钢琴泛音、轻钟音、柔和低音/和弦及立体声混响，不含电影原声或第三方录音。背景、角色和声音都不冒称人工逐帧绘制或实拍录制。

### V8 · 独立书页与头部结构（2026-10-04）

六張实体纸的十二个正反面，使用 scripts/models/build_story_pages.ps1 原创线稿、程序纸纹和准确中文排版生成，分别嵌入GLB。没有调用图像生成、使用电影道具扫描或套用同一页。系统华文楷体、宋体和Georgia仅用于本机渲染文字，不分发字体文件。内容、制作方式及页列表见统一生成记录 book-story-pages-v8；本地画稿在 masters/textures/story-page-00.jpg 至11.jpg。

memory-book/teddy-head-anatomy.webp 来自内置imagegen新制的1254×1254透明完整头部图集。完整头骨、短口鼻、颊部、耳根与短垂耳统一绘制，替代V7脸片与旧耳的组合。两色各有同结构睁眼/闭眼版本，身体沿用分层原稿；只有机械WebP编码和SVG区域裁切，无程序修改画面内容。首稿因结构仍不理想弃用，两个完整提示词、参考关系与选择理由均记录在 assets/memory-book-artwork.json。原稿和编码入口 scripts/pets/prepare-head-anatomy.py 保留，无付费API或素材购买。

V7 teddy-puppy-expressions.webp 与更早的 teddy-rig.webp 已从当前发布目录移除，二者的母版和完整来源记录仍保留；历史导出见统一记录中的 archivedExport。

## 五张预览照片（2026-10-03）

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


## 字体

`memory-book/serif.woff` 是 Noto Serif SC 中文子集，使用 SIL Open Font License；[许可原文](memory-book/NotoSerifSC-OFL.txt)，[上游](https://github.com/google/fonts/tree/main/ofl/notoserifsc)。

## 已退役素材记录

已删除的旧三维角色、琴舞、旧预览、静态书与蛋糕等来源，保存在[清理前的素材记录](https://github.com/daidaideaa/birthday-card/blob/f27a7386e60436d85b6ac9e394888068e4937141/public/ASSET_SOURCES.md)。历史出处并未被改写为项目原创；当前运行素材、源 GIF 与可编辑遮罩保留。


## V9 · 手机空间与双人叙事（2026-10-05）

- 首尾竖屏场景由内置image_gen生成；wizard-study-layer.webp与window-night-layer.webp保留真实alpha窗洞，window-distance.webp为独立窗外远景。SVG分别合成远景、窗框/室内、桌面、帘子、烛光与浮尘。不是实拍；母版、引用关系和完整提示词已合并到assets/memory-book-artwork.json，本机原PNG在masters。WebP仅机械编码。
- 书保留Blender真实六叶七组展开，换成不剧透的独立浪漫纸稿，姓名显影、透明叠页和双轴折笺由Three.js控制。纸稿是本地程序排版/线稿；字体仅在本机渲染为纹理，不分发系统字体。可编辑脚本与母版保留。
- 泰迪为内置image_gen五角度独立头/躯干/四肢/尾图稿，杏色、奶油色和闭眼图分别生成；Canvas逐件关节动画与朝向插值，不是整张静姿图片移动。来源与完整提示词见统一生成记录teddy-articulated-turnaround-v9。
- 旧手机背景与三份退役泰迪导出已移至Windows回收站；可编辑母版、历史出处和Git历史保留。
- 双人沙画沿用SandKit许可，两个实例总预算52,000粒；手机DPR上限1.5的本地渲染调整有代码注释。
- 电影保持已提取的原版短动作与既有来源。V9重排竖屏镜头、限制角色过度放大并改进地面衔接。尝试核实[Disney官方音乐视频](https://www.youtube.com/watch?v=25QyCxVkXwQ)与[Movieclips小马王片段](https://www.youtube.com/watch?v=QSqUVzkUvj8)的更高清源，均在格式获取阶段遇到TLS连接提前断开，未取得新源，不能声称已升级原片分辨率。检查记录保留film-source/source-check-20261005.json。

本轮没有购买素材、订阅或调用额外收费API。
