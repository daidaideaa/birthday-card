# 编辑生日贺卡内容

内容入口为 [`src/content/story.ts`](../src/content/story.ts)，字段类型见 [`storyTypes.ts`](../src/content/storyTypes.ts)。目前 `preview: true` 表示示意素材；真实内容填完并检查后再改成 `false`。空数组和空字段会隐藏对应内容，不必用虚构回忆填满页面。

| 要修改的内容 | 字段 |
| --- | --- |
| 页面与贺卡称呼 | `person.name` |
| 精选相册（建议 3–5 条） | `moments` 的 `title`、`description`、`image`、可选 `date` |
| 相识信息 | `firstMet`；没有真实资料则保留空字段 |
| 时间线、小事、趣梗、地点、数字 | `timeline`、`littleThings`、`insideJokes`、`places`、`stats` |
| 完整书信 | `letter.greeting`、`paragraphs`、`ending`、`signature` |
| 可选真人录音 | `letter.recording` |
| 许愿前祝福 | `finalWish` |

图片与录音填相对于 `public` 的路径，例如 `memories/photo-01.webp` 或 `memories/letter.mp3`；不加 `/public/`、盘符或开头的斜杠。文件名建议使用小写英文与短横线。保留完整段落，不把长信压缩成几个标题。录音字段缺省时不显示播放入口，声音仍服从全局静音。

```ts
moments: [
  { title: '填写真实片段标题', image: 'memories/photo-01.webp', description: '填写真实回忆' },
],
letter: {
  greeting: '亲爱的师宝宝：',
  paragraphs: ['第一段完整文字', '第二段完整文字'],
  ending: '愿你一直勇敢，也一直被爱。',
  signature: '你的落款',
  // recording: 'memories/letter.mp3',
},
```

本地可将素材放入 `public/memories/` 预览。当前 GitHub 仓库、Pages 和 demo R2 入口是公开的；私人素材的公开范围应另行确定，不加入公开 demo 发布清单。

改完后运行 `npm run dev`，检查桌面与手机宽度的标题、相册、完整信件和许愿文字，再运行 `npx tsc -b`。内容改动不需要重新制作 Blender 模型。第三、四章的编舞、角色外观与云端媒体版本独立于 `story.ts`，相关入口见 [重制说明](CHARACTER_REWORK.md) 和 [部署说明](DEPLOYMENT.md)。
