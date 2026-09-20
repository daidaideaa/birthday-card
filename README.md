# 师宝宝 · 生日奇遇

一个中文、无后端的互动生日礼物。基于 React、TypeScript、Three.js 和 MediaPipe，沿用现有 GitHub Pages 发布流程。

## 四个场景

1. **生日邀请**：月光图书馆与烛光书桌，勃艮第红天鹅绒贺卡、烫金边饰和纸张层次。开卡时镜头、照明、魔法粒子与双犬共同响应；保留点击、手势、拖动旋转。
2. **小小美好**：精选相册，原来的时间线、小事、趣梗、地点和数字仍合在一章，不增加环节。
3. **一封心意**：完整中文书信置于蓝紫暮色中。钢琴每个音符同步琴键、双人舞步、光影与小狗的倾听动作。
4. **生日愿望**：荣耀石上的父子清晨、星空中的父亲记忆、成年辛巴归来，以约 18 秒的连续短场景致敬《狮子王》。大小狮子拥有独立网格和骨骼，场景与双层草莓奶油蛋糕并列，点击烛火后展现烟雾、星光、音乐和双犬庆祝。

两只泰迪分别为杏色和奶油色，改为 Blender 制作的连续雕塑网格、蒙皮骨架与 GLB 动画。`Idle / Curious / Happy / Rest` 动作由 Three.js AnimationMixer 混合，另有眨眼、视线跟随和摸摸反馈。旧版颗粒毛球已移除；这是一套风格化原创模型，并非扫描动物或迪士尼原模型。

钢琴使用 jeremy 的公开授权三角钢琴模型，舞者使用 Quaternius 的 CC0 人物与服装网格，加上项目编排的连续骨骼舞步。狮子基于 kenchoo 的 CC BY 4.0 幼狮模型制作成年衍生体型与动作。旧版狮子、双人舞的透明图集已移除；角色、琴、蛋糕和贺卡都是实时三维物体，环境底图仍为生成绘画。所有角色素材随站点提供，不依赖外部模型服务。

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
- 音效由用户交互解锁，“声音关”统一控制生日曲、钢琴和狮子回应。
- 手机端限制像素比和阴影成本；后台标签页暂停渲染。减少动态效果偏好会静止骨骼角色，狮子剧情可手动切换画面；狮子、舞台与蛋糕离屏后暂停渲染。剧情时钟在隐藏或离屏后暂停。
- WebGL 不可用时可直接阅读完整生日故事，宠物单独降级，不阻断主要内容。

## 资源与来源

详见 [素材来源](public/ASSET_SOURCES.md)。素材生成提示词见 [美术说明](public/ART_DIRECTION.md)。项目未使用付费模型、电影原片或电影原声。

## 模型制作

`scripts/models/` 保留 Blender 制作脚本；运行需要 Blender 4.3+。各模型的来源、再分发许可与修改说明随 `public/models/` 提供。网站运行不需要 Blender。动作通过 GLTFLoader / AnimationMixer 播放，参考 [Three.js 官方骨骼动画示例](https://threejs.org/examples/webgl_animation_skinning_blending.html)。

模型使用原生离线渲染检查造型与动作，并用 Khronos glTF Validator 校验文件。离线模型渲染不能替代整页浏览器和手机布局验收。
