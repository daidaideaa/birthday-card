import assert from "node:assert/strict";
import test from "node:test";
import { PackedPetPlayer } from "../src/pet/PackedPetPlayer.ts";
import type { PetAction } from "../src/pet/petMedia.ts";

test("returning to an already playing loop cancels a slower obsolete clip", async () => {
  let aborted = false;
  let finishDownload!: () => void;
  // Exercise the actual player method without constructing a WebGL renderer.
  // This path must reuse the existing decoder rather than create a DOM video.
  const player = Object.assign(Object.create(PackedPetPlayer.prototype), {
    active: true,
    disposed: false,
    pendingAction: "rest",
    generation: 7,
    current: { action: "idle", video: { ended: false } },
    abortPending: () => { aborted = true; },
  }) as {
    play: (action: PetAction) => void;
    current: { action: PetAction };
    pendingAction?: PetAction;
    abortPending?: () => void;
    generation: number;
  };
  const oldRequest = player.generation;
  const delayedDownload = new Promise<void>((resolve) => { finishDownload = resolve; })
    .then(() => {
      if (!aborted && player.generation === oldRequest) player.current.action = "rest";
    });

  player.play("idle");
  finishDownload();
  await delayedDownload;

  assert.equal(aborted, true);
  assert.equal(player.current.action, "idle");
  assert.equal(player.pendingAction, undefined);
  assert.equal(player.abortPending, undefined);
  assert.notEqual(player.generation, oldRequest);
});
