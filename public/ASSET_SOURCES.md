# 素材来源

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
