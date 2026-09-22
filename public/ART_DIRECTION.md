# 电影场景美术

场景背景使用内置 imagegen 生成，随后转为 WebP 编码供网页加载。贺卡、双犬、钢琴、舞者、狮子与蛋糕均为实时 Three.js 场景。未使用电影原片或电影原声。

角色使用实时三维骨骼动画，开卡、琴音、吼声和许愿事件共同驱动环境光、粒子和双犬反应。所有素材随项目本地提供。

## 手机与舞台，2026-09-22

主要观看设备为手机。舞台采用 430–570 px 竖屏画幅，优先保留两人的头、脚和牵手空间；钢琴退到后景，琴键与播放按钮放在舞台下方。黄裙、白衬衫、侧步和低踢参考《爱乐之城》的山顶舞段，12 秒动作是本项目编排，没有使用电影动作捕捉文件。裙摆为踢腿和转身分别提供形变。

`JazzEnvironment.ts` 绘制暮色天空、三层远山、城市灯点、栏杆、石台和暖色路灯；所有对象与舞者共用镜头。镜头跟随动作时钟轻推，不在手机上响应手指摇晃。像素比上限 1.5，舞台约 30 fps 更新；后台、离屏和减少动态效果沿用暂停规则。

双犬采用正常四足犬轮廓：收小眼睛、突出犬吻、缩小脚掌和头部装饰。表演通过不完全同步的眨眼、轻微寻视、歪头、摸摸反应和动画混合完成；保持风格化原创泰迪，不声称达到长篇动画电影的毛发与表演精度。

收尾修正了侧步落点采样、舞鞋平底和转身牵手高度，竖屏镜头以两位舞者为中心，给侧步时伸出的手臂留出空间。连续弹键保留当前舞步，动作结束后的下一次弹键会开始新一段舞蹈，重播按钮始终从头开始。

实现参考：[Bruno Simon 的作品及公开源码](https://github.com/brunosimon/folio-2025)将视图、灯光、角色和渲染组织在明确的更新顺序中；本项目据此把舞台镜头与角色动作使用同一时钟。[Three.js 骨骼动画混合示例](https://threejs.org/examples/webgl_animation_skinning_blending.html)用于参考动作切换。未复制这两项作品的视觉素材。

模型通过 Blender 检查侧步、踢腿和转身，`review_jazz_stage.py` 用实际导出的 GLB 检查竖屏构图。当前远程预览浏览器报告 WebGL 被禁用，整页实时三维和手机硬件流畅度尚未完成实机验收；离线渲染不代表这些项目已通过。

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
