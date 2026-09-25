import { assetUrl } from "../utils/assetUrl";

export type FilmId = "duet" | "pride";
export type FilmFormat = "landscape" | "portrait";
export type LionPhase = "dawn" | "stars" | "return";
export const FILM_PORTRAIT_QUERY = "(max-width: 900px) and (max-aspect-ratio: 4/5)";

/** Local, independently composed frames: portrait is never a crop of the duet. */
export const cinematicMedia = {
  duet: { duration: 24, title: "暮色里，和你跳一支舞。" },
  pride: { duration: 18, title: "生命与勇气" },
} as const;

export function filmSource(id: FilmId, format: FilmFormat) {
  return {
    video: assetUrl(`cinema/${id}-${format}.mp4`),
    poster: assetUrl(`cinema/${id}-${format}.webp`),
  };
}

export function lionPhaseAt(time: number): LionPhase {
  return time < 6.5 ? "dawn" : time < 11 ? "stars" : "return";
}

/** Review seeks may update the image/caption, but can never finish the story. */
export class FilmPlaybackSession {
  private reviewing = false;
  private completed = false;

  begin(restart = false) {
    this.reviewing = false;
    if (restart) this.completed = false;
  }

  review() {
    this.reviewing = true;
  }

  finish() {
    if (this.reviewing || this.completed) return false;
    this.completed = true;
    return true;
  }
}
