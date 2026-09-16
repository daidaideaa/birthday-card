export interface FirstMeeting {
  date: string;
  place: string;
  title: string;
  memory: string;
  firstImpression: string;
  image?: string;
}
export interface TimelineEvent {
  date: string;
  title: string;
  description: string;
  image?: string;
  /** 只有确实对应生日当天的真实事件才设为 true。 */
  isBirthday?: boolean;
}
export interface MemoryMoment {
  date?: string;
  title: string;
  description?: string;
  image?: string;
}
export interface LittleThing {
  text: string;
}
export interface InsideJoke {
  title: string;
  note?: string;
}
export interface MemoryPlace {
  city: string;
  date?: string;
  memory: string;
}
export interface StoryStat {
  label: string;
  /** 真实数字（包括 0）；不填时使用 text，不自动推算。 */
  value?: number;
  text?: string;
}
export interface StoryLetter {
  greeting: string;
  paragraphs: string[];
  ending: string;
  signature: string;
}
export interface BirthdayStory {
  person: { name: string };
  firstMet: FirstMeeting;
  timeline: TimelineEvent[];
  moments: MemoryMoment[];
  littleThings: LittleThing[];
  insideJokes: InsideJoke[];
  places: MemoryPlace[];
  stats: StoryStat[];
  letter: StoryLetter;
  finalWish: string;
}
export type ChapterId =
  | "birthday"
  | "firstMet"
  | "timeline"
  | "moments"
  | "littleThings"
  | "insideJokes"
  | "places"
  | "stats"
  | "letter"
  | "finalWish";
export interface Chapter {
  id: ChapterId;
  label: string;
}
