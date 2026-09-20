import type { StoryController, StorySnapshot } from "../StoryController";
import { Memories } from "./Memories";
import { Letter } from "./Letter";
import { FinalWish } from "./FinalWish";
export function ChapterContent({
  controller,
  snapshot,
  onReplay,
  onEnding,
  onNext,
  onPiano,
  onRoar,
}: {
  controller: StoryController;
  snapshot: StorySnapshot;
  onPiano: (note?: number) => void;
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
        <Letter
          onPiano={onPiano}
          data={data.letter}
          name={data.person.name}
          open={snapshot.letterOpen}
          onOpen={() => controller.openLetter()}
          onNext={onNext}
        />
      );
    case "finalWish":
      return (
        <FinalWish
          controller={controller}
          snapshot={snapshot}
          onReplay={onReplay}
          onEnding={onEnding}
          onRoar={onRoar}
        />
      );
    case "birthday":
      return null;
  }
}
