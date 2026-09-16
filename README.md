# 3D Birthday Card

A warm, interactive birthday gift for Han, built with React, TypeScript, Three.js and MediaPipe. No backend.

## Features

- Textured ivory paper, an original canvas cake illustration and handwritten wishes on real 3D surfaces.
- Open palm to open, closed fist to close; no hand preserves the current state.
- Smooth reversible animation, gentle drag rotation, hearts, ribbons and locally synthesized birthday music.
- Complete camera-free experience, touch support, sound toggle and adaptive mobile rendering.

## Local Development

Node.js 22.12+ recommended.

```sh
npm install
npm run dev
```

## Build

```sh
npm run lint
npm test
npm run build
npm run preview
```

## GitHub Pages

Target: https://daidaideaa.github.io/birthday-card/

Vite uses `/birthday-card/`. In repository Settings → Pages, select **GitHub Actions**. A push to `main` runs lint, state/gesture tests, build and official Pages deployment actions. Do not commit `dist` or create a `gh-pages` branch.

## Camera Permission

Click **Start the Magic** to enable sound and request camera access. The card remains closed until a stable open palm is recognized. **Continue without camera** works without model downloads or permission. **Turn Camera Off** stops the video tracks; hiding the preview only hides it.

Camera frames are processed locally in the browser and are not uploaded.

MediaPipe 0.10.32 WASM loads from jsDelivr and Google's pretrained gesture model loads from Google Cloud Storage. These downloads require internet access; failure or a 25-second timeout offers manual controls. No camera frames are sent to these hosts.

## Browser Notes

Use a current browser with WebGL, Web Audio and HTTPS camera access (localhost also works). Camera behavior and recognition quality require testing with a real webcam. Inference runs independently at about 15 FPS and pauses in hidden tabs. Font and illustration assets are local; Parisienne is bundled under the SIL Open Font License in `public/fonts/OFL.txt`.

## Personalize the Memory Book

Edit **`src/content/story.ts`** and add only genuine details. All dates, memories, jokes, photographs and letter paragraphs are intentionally empty. Empty records and empty chapters are skipped; the current public experience is **Birthday Card → Make a Wish**. The birthday card and final wish are always included in the page count.

- `firstMet`: date, place, memory, first impression, optional image. A title alone does not enable the chapter.
- `timeline`: dated events with expandable details; optional `isBirthday: true` highlights a genuine birthday event without guessing whether it is today.
- `moments`: title, optional date, short description and photograph.
- `littleThings`: one `{ text }` per note, revealed individually.
- `insideJokes`: one `{ title, note? }` per genuine joke.
- `places`: `{ city, date?, memory }`; decorative route, no map service.
- `stats`: `{ label, value }` for actual numbers (zero is valid), or `{ label, text }`. Nothing is inferred or counted automatically.
- `letter`: greeting, an array of complete paragraphs, ending and signature. A greeting without any paragraphs stays hidden.
- `finalWish`: optional personal wish before the candle is extinguished.

Put images in **`public/memories/`**, then use a relative path such as `memories/photo-name.jpg`. Do not include `public/` or a remote URL. `assetUrl()` supplies the GitHub Pages base path. Images are lazy loaded, and only the next chapter's first two images are prefetched. Failed images disappear while captions remain. Resize phone originals before committing when practical (around 1600–2000 px on the long edge is sufficient for this layout).

The book supports buttons, page edges, keyboard arrows and horizontal swipes. Vertical swipes remain available for reading long pages. Photo dialogs support Escape and return focus to the photo. Notes and letter state survive Previous/Next. Replay resets the card, particles, music, chapter and all reveals, while retaining camera permission. Click Start again to resume an already connected camera.

The hidden Three.js scene and gesture inference pause during the book. The letter uses natural document scrolling, lowers any remaining birthday music, and avoids per-character animation. The final candle uses a click/tap and a short local bell ending, with no microphone. Reduced motion replaces page turns with fades and limits sparkles.
