import type { BirthdayStory } from "./storyTypes";

// 仅填写真实资料。留空的章节会自动隐藏；注释中的格式不会出现在网页上。
// 图片路径相对于 public，例如 image: "memories/你的文件名.jpg"。
// 日期可用 YYYY-MM-DD 或你希望直接显示的英文日期，不会根据日期编造事件。
export const story: BirthdayStory = {
  person: { name: "Han" },
  firstMet: { date: "", place: "", title: "", memory: "", firstImpression: "" },
  // timeline: [{ date: '', title: '', description: '', image: 'memories/文件名.jpg' }]
  timeline: [],
  // moments: [{ title: '', date: '', description: '', image: 'memories/文件名.jpg' }]
  moments: [],
  // littleThings: [{ text: '' }]
  littleThings: [],
  // insideJokes: [{ title: '', note: '' }]
  insideJokes: [],
  // places: [{ city: '', date: '', memory: '' }]
  places: [],
  // stats: [{ label: '', value: 真实数字 }] 或 [{ label: '', text: '真实文字' }]
  stats: [],
  // paragraphs 每项是一段完整的信；只有正文非空时才显示信件章节。
  letter: { greeting: "Dear Han,", paragraphs: [], ending: "", signature: "" },
  finalWish: "",
};
