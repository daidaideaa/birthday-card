import { lazy, Suspense } from "react";
import type { StoryController, StorySnapshot } from "../StoryController";
import { Memories } from "./Memories";
const Letter = lazy(() =>
  import("./Letter").then((m) => ({ default: m.Letter })),
);
const FinalWish = lazy(() =>
  import("./FinalWish").then((m) => ({ default: m.FinalWish })),
);
export function ChapterContent({
  controller,
  snapshot,
  onReplay,
  onEnding,
  onNext,
  onNoteOn,
  onNoteOff,
  onRoar,
}: {
  controller: StoryController;
  snapshot: StorySnapshot;
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  onRoar: () => void;
  onReplay: () => void;
  onEnding: () => void;
  onNext: () => void;
}) {
  const data = controller.data;
  switch (controller.chapters[snapshot.index].id) {
    case "moments":
      return <Memories data={data} />;
    case "letter":
      return (
        <Suspense fallback={<p role="status">暮色正在点亮…</p>}>
          <Letter
            onNoteOn={onNoteOn}
            onNoteOff={onNoteOff}
            data={data.letter}
            name={data.person.name}
            open={snapshot.letterOpen}
            onOpen={() => controller.openLetter()}
            onNext={onNext}
          />
        </Suspense>
      );
    case "finalWish":
      return (
        <Suspense fallback={<p role="status">晨光正在点亮…</p>}>
          <FinalWish
            controller={controller}
            snapshot={snapshot}
            onReplay={onReplay}
            onEnding={onEnding}
            onRoar={onRoar}
            onReadLetter={controller.chapters.some(chapter => chapter.id === "letter") ? () => { controller.openLetter(); controller.go(-1); } : undefined}
          />
        </Suspense>
      );
    case "birthday":
      return null;
  }
}
