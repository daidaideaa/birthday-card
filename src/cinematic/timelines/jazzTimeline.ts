import type { CinematicDirector } from "../CinematicDirector";
export const JAZZ_DURATION = 12;
export const jazzNotes = [
  60, 64, 67, 71, 69, 67, 64, 62, 60, 64, 67, 72, 71, 67, 64, 60, 62, 65, 69,
  72, 71, 67, 64, 60,
];
export const jazzLook = () => ({
  approach: 0,
  turn: 0,
  exposure: 1.03,
  key: 2,
  rim: 2.5,
  bloom: 0.12,
});
export function choreographJazz(
  director: CinematicDirector,
  look: ReturnType<typeof jazzLook>,
) {
  const tl = director.timeline;
  tl.addLabel("arrival", 0)
    .addLabel("side-step", 1)
    .addLabel("kick", 4)
    .addLabel("clasp", 6)
    .addLabel("turn", 7)
    .addLabel("settle", 10);
  tl.to(look, { approach: 1, duration: 3, ease: "sine.inOut" }, 0)
    .to(
      look,
      { turn: 1, rim: 2.8, bloom: 0.16, duration: 2.5, ease: "sine.inOut" },
      6,
    )
    .to(look, { key: 2.12, exposure: 1.08, duration: 2 }, 8.5)
    .to(look, { bloom: 0.1, duration: 1.5 }, 10.5);
}
