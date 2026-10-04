# 师宝宝 · 一本只认识你的魔法书

送给「师宝宝」的中文互动生日礼物。React、TypeScript、Canvas 与 Three.js 共同呈现五章童话，发布地址为 [GitHub Pages](https://daidaideaa.github.io/birthday-card/)，基础路径为 `/birthday-card/`。当前源码已进入新立体书与分层动画版本；线上内容随 Pages 工作流发布更新。

## 当前五章

1. **古书认出她**：克制的电影式旧书房背景承接可互动的 Blender 古书；真实皮革纹理、烫金装帧、纸张与金属分别表现，可拖动观察，封面和纸页在 Three.js 中实时翻动。背景为生成画稿，不是实拍电影截图。
2. **两条来路**：进入后自动播放约114秒的沙画叙事，缓慢镜头和分段字幕依次讲完十幕，无需点击逐页前进。她从河南周口→天津→北京·中国政法大学→香港·香港科技大学→深圳；他从湖北武汉→南京·东南大学→上海·上海交通大学→深圳。最后在真实中国地理轮廓上绘出暖金与月白两条路线，在深圳汇合后自动进入相册。可停留、略过、回看；后台、目录或弹窗打开时冻结当前时间，减少动态与图形回退同样保留自动叙事。
3. **照片与信**：五张明确标记的 Unsplash 网图占位，保留原比例放大和完整暂拟书信，等待替换为两人的照片。
4. **风与星光**：将 2002《小马王》的 Spirit / Rain、1994《狮子王》的 Simba / Nala 原版短动作逐帧抠出，在原创旷野背景上重新布景；草、风、星与镜头分别运动。20 秒全幕 Canvas 叙事进入后自然展开，无进度条和播放器外框，支持停留、重看、点星送风，原动作保留各自帧时长，不播放电影原声。已实际播放完整段落并检查角色轮廓和结尾；来源与完成边界见素材记录。
5. **为你点亮**：Blender 制作的双层深蓝奶油、金色星月蛋糕，可旋转观赏、许愿、熄灭实时烛火，并回看五章。

杏色与奶油色两只二维泰迪使用内置 imagegen 精绘的透明部件画稿，头、耳、躯干、四肢、尾巴各自连续运动；整犬参考图不参与运行时动画。它们会短距离走动、歪头、眨眼、回应摸摸，读信时安静下来。V7调整为无花卉旧魔法书、86.9秒沙画与港深局部放大、幼犬新表情和连贯的书页/相片/星光转场。导航静看淡出，电影自动进入烛光终章。音乐需主动开启；交互支持键盘、后台暂停及减少动态。WebGL 不可用时提供明确说明和章节导航；沙画另有保留自动时序的静态叠映回退。

## 运行

使用 Node.js 22.12+。

~~~sh
npm ci
npm run dev
npm run build
~~~

打开命令显示的 `/birthday-card/` 地址。网站直接加载提供的 GLB、画稿和动作图集；启动网站不需要 Blender，也不需要 R2 或后端。修改三维模型时再使用 Blender 运行原创脚本 `scripts/models/build_magic_objects.py`。

`build` 包含类型检查、静态构建和一次本地资源路径检查。只针对改动做必要验证；不反复计算 SHA、扫描旧资源或运行长循环。旧版测试与评审入口已随旧实现清理。

## 修改入口

- 五章主页面、暂拟信与许愿：[MemoryGift.tsx](src/memory-book/MemoryGift.tsx)
- 立体书、翻页、蛋糕与烛火：[MagicObject.tsx](src/memory-book/MagicObject.tsx)
- Blender 原创模型生成：[build_magic_objects.py](scripts/models/build_magic_objects.py)
- 沙画时间线、两条路线和中国地图：[Journey.tsx](src/memory-book/Journey.tsx)
- 照片与电影来源配置：[media.ts](src/memory-book/media.ts)
- 原版角色逐帧合成舞台：[Cinema.tsx](src/memory-book/Cinema.tsx)
- 两只泰迪的部件动画：[Pets.tsx](src/memory-book/Pets.tsx)
- 运行素材：[public/memory-book](public/memory-book/)
- 画稿完整提示词、模型与历史状态：[memory-book-artwork.json](assets/memory-book-artwork.json)
- 详细创作方案：[整体计划](docs/plans/生日礼物_整体创作与制作计划.md)
- 许可与素材处理记录：[素材来源](public/ASSET_SOURCES.md)

不补造年份、校区或共同经历。周口使用用户明确的城市位置，其余城市沿用 Natural Earth 坐标；两条路线分别叙述，不暗示同时旅行。电影角色帧来自公开社区短 GIF，版权仍属于 DreamWorks / Disney，来源公开不代表开放再分发授权。

## 发布

`main` 的 Pages 工作流执行 lint、build、发布及一次线上入口检查。构建只复制当前 `public/memory-book` 运行素材和 SandKit 许可。退役的静态书、蛋糕和整犬图已删除；制作母版、原始 GIF、遮罩与恢复资料不随网站发布。

当前工程只保留新版五章的源码、运行素材和制作入口。旧人物、三维犬、琴舞、R2 上传流程、旧测试与重复计划已清理，旧实现可从 Git 历史或本机原始 `claude_build.zip` 恢复。Cloudflare 历史状态见 [发布说明](docs/DEPLOYMENT.md)。

本机可编辑母版、电影源 GIF、遮罩和最新预览位于 `.asset-build/memory-book`；私密恢复材料仍在忽略目录中。总体计划仅维护仓库和 `claude_build` 的同步副本，旧书信原文保存在计划末尾。接续工作先读 [新对话交接](新对话交接.md)。



V8书页：六张实体纸采用十二幅不同正反面画稿，逐页停留并支持近读。幼犬重新设计完整头部和耳根结构，保留二维分层动作；生成来源和全部提示词见 assets/memory-book-artwork.json。
