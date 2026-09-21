# birthday-card 协作约定

## 项目与边界

这是送给「师宝宝」的中文互动生日礼物，使用 React、TypeScript、Vite、Three.js 和 MediaPipe，无后端，通过 GitHub Pages 发布。

- 以当前代码为准，围绕本次目标增量修改；保留用户已有改动。
- 当前为生日邀请、精选相册、完整书信、生日愿望四个场景。未要求调整叙事时保持此结构；称呼、照片和文案集中在 `src/content/story.ts`，不编造真实经历。
- 保留开卡、手势、鼠标/触屏操作、生日音乐，以及摄像头拒绝或 WebGL 不可用时的阅读入口。摄像头由用户主动开启，声音由用户交互解锁，静音统一生效。
- 保留减少动态效果与离屏/后台暂停机制。新增资源使用项目现有的基础路径处理，兼容 `/birthday-card/`；不提交 `dist`。

## 按任务找入口

只阅读与当前任务相关的实现和资料，不要求每次遍历仓库。

- 文案、照片、章节：`src/content/`、`src/story/`；配置说明见 [README](README.md)。
- 三维场景、镜头、音效：`src/scene/`；双犬：`src/pet/`；视觉改进或验收可用 [birthday-visual-review](.agents/skills/birthday-visual-review/SKILL.md)。
- 手势与输入：`src/gesture/`、`src/hooks/useGesture.ts`、`src/App.tsx`。
- 素材替换、模型制作：按需查看 [美术说明](public/ART_DIRECTION.md)、[素材来源](public/ASSET_SOURCES.md)、`scripts/models/` 及对应模型许可。
- 构建、发布、资源路径：`package.json`、`vite.config.ts`、`src/utils/assetUrl.ts`、`.github/workflows/pages.yml`。
- 发起下一轮任务时可参考 [任务提示词](docs/TASK_PROMPTS.md)，无需为普通修改加载它。

## 完成与验证

- 将请求推进到实现完成并解决本次引入的问题；已获授权的局部修改和必要验证可连续进行，不在初稿阶段无故停下。
- 纯文档修改检查内容和链接即可。逻辑修改选择相关测试；类型、构建或集成受影响时再运行对应检查。命令见 `package.json`；现有 CI 会执行 lint、test、build。
- 视觉任务检查实际画面和动作，构建通过不能代替视觉验收；工具不可用时明确标记未验证项。
- 验证足以支持结论后结束；只有具体失败、未解决风险或必需门禁才追加检查，不反复计算哈希、全量扫描或重跑相同测试。
- 提交和部署范围以本次请求及已有授权为准；推送 `main` 会触发现有 Pages 工作流。收尾简述改动、验证结果与仍存在的限制。
