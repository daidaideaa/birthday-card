# 第四章角色图稿：服务阻塞记录

状态：2026-10-03 未解决。没有生成可用角色稿或动作图集。

## 已有证据

内置图像服务对 1994 版《狮子王》幼年辛巴、木法沙、成年辛巴的统一角色稿请求两次返回 HTTP 400，`image_generation_user_error` / `moderation_blocked`，审核阶段 `output`，类别 `other`。

- 2026-09-27 请求 ID：`216b46e0-0a36-4e07-8922-6a5e3e5e1db5`。
- 2026-10-02 请求 ID：`07a63e78-7f83-43e4-a9dd-36a7e697d38e`。此次明确保留角色名称及 1994 版要求，并提供三张官方画面对照。

[OpenAI 官方图像服务说明](https://developers.openai.com/api/docs/guides/image-generation#handling-blocked-requests-and-other-errors) 将 `output` 定义为生成结果或后续输出审核阶段；粗粒度标签没有给出可修复的具体细节。无法据此确定具体拦截原因。本地完全访问授权不改变远端服务的审核决定。

没有隐藏角色身份、改用另一生成通道、降低审核或反复重复相同请求。该记录不含密钥，可用于服务问题排查；尚未代用户向服务商发送报告。

## 已核查的素材路径

- [Disney 1994 版电影页](https://movies.disney.com/the-lion-king)：原版设定对照，© Disney；不能标作 CC0 或本项目已制作好的动画。
- [productionsbtc008 的成年辛巴](https://sketchfab.com/3d-models/simba-lion-king-3e3913cb4dd2481da02d3d4d8849589d)：页面写明 `Kingdom hearts model`，展示 CC Attribution 标签。模型风格和制作来源尚不满足本任务的原版设定与统一三角色要求，未下载、未导入。
- [DrewsDigitalDesigns 的 Young Simba](https://sketchfab.com/3d-models/young-simba-lion-king-5f2d4928fc504ea3bd30553658091941)：页面列为 CC Attribution，但仅找到单角色，无完整绑定、动作和三角色一致性验证；未下载、未导入。

现有参考页保留幼年辛巴、木法沙、成年辛巴的区分。第四章角色稿、连续动作帧、图集描述与 PixiJS 场景仍待制作。当前恢复包保存现有工作，不把这个阻塞标记为已解决。
