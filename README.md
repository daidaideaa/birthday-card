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
