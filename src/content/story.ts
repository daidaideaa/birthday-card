import type { BirthdayStory } from "./storyTypes";

// 替换照片和文字即可个性化；日期和共同经历请只填写真实资料。
export const story: BirthdayStory = {
  person: { name: "师宝宝" },
  preview: true,
  firstMet: { date: "", place: "", title: "", memory: "", firstImpression: "" },
  timeline: [],
  moments: [
    {
      title: "把平凡的日子，过成小美好",
      image: "images/forest.jpg",
      description:
        "阳光刚好，风也温柔。希望往后的日子，总有这样轻轻松松、闪闪发光的时刻。",
    },
    {
      title: "去看更远的风景",
      image: "images/mountains.jpg",
      description:
        "愿你心里有山海，眼里有星光。慢慢走，喜欢的风景都值得停下来。",
    },
    {
      title: "也记得，好好休息",
      image: "images/lake.jpg",
      description:
        "允许自己发呆、做梦、晚一点再出发。快乐不必很盛大，小小的一点就很好。",
    },
  ],
  littleThings: [],
  insideJokes: [],
  places: [],
  stats: [],
  letter: {
    greeting: "亲爱的师宝宝：",
    paragraphs: [
      "今天，想把所有温柔的祝福都送给你。愿你醒来有好心情，抬头有好风景，也总有人认真听你说那些小小的欢喜。",
      "愿你一直保留好奇和勇气，去喜欢自己喜欢的事，走自己想走的路。偶尔累了，就慢一点；偶尔想撒娇，也完全没关系。",
      "新的一岁，希望你的快乐多一点，烦恼少一点。那些还没实现的愿望，就交给以后的每一个明天。你只管带着期待向前走。",
    ],
    ending: "愿你一直勇敢，也一直被爱。",
    signature: "生日快乐呀 ♡",
  },
  finalWish: "愿你的每一个明天，都有光、有爱、有小小的惊喜。",
};
