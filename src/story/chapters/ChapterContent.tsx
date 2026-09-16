import type { StoryController, StorySnapshot } from "../StoryController";
import { FirstMet } from "./FirstMet";
import { Timeline } from "./Timeline";
import { Memories } from "./Memories";
import { LittleThings } from "./LittleThings";
import { InsideJokes } from "./InsideJokes";
import { Places } from "./Places";
import { Numbers } from "./Numbers";
import { Letter } from "./Letter";
import { FinalWish } from "./FinalWish";
interface Props {
  controller: StoryController;
  snapshot: StorySnapshot;
  onReplay: () => void;
  onEnding: () => void;
  onNext: () => void;
}
export function ChapterContent({
  controller,
  snapshot,
  onReplay,
  onEnding,
  onNext,
}: Props) {
  const data = controller.data;
  switch (controller.chapters[snapshot.index].id) {
    case "firstMet":
      return <FirstMet data={data.firstMet} />;
    case "timeline":
      return (
        <Timeline
          data={data.timeline}
          selected={snapshot.timelineIndex}
          select={(index) => controller.selectTimeline(index)}
        />
      );
    case "moments":
      return <Memories data={data.moments} />;
    case "littleThings":
      return (
        <LittleThings
          data={data.littleThings}
          count={snapshot.revealedCount}
          reveal={() => controller.revealNext()}
        />
      );
    case "insideJokes":
      return <InsideJokes data={data.insideJokes} />;
    case "places":
      return <Places data={data.places} />;
    case "stats":
      return <Numbers data={data.stats} />;
    case "letter":
      return (
        <Letter
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
        />
      );
    case "birthday":
      return null;
  }
}
