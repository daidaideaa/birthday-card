import { test, expect, type Page } from "@playwright/test";

declare global {
  interface Window {
    mediaLifecycleReview: {
      videos: HTMLVideoElement[];
      audio: AudioContext[];
      setHidden: (hidden: boolean) => void;
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Headless tabs do not reliably expose OS tab visibility. Exercise the real
    // listeners using controlled visibility values, without replacing playback.
    let hidden = false;
    const videos: HTMLVideoElement[] = [];
    const audio: AudioContext[] = [];
    Object.defineProperty(document, "hidden", { get: () => hidden, configurable: true });
    Object.defineProperty(document, "visibilityState", { get: () => hidden ? "hidden" : "visible", configurable: true });
    const create = document.createElement.bind(document);
    document.createElement = ((tag: string, options?: ElementCreationOptions) => {
      const element = create(tag, options);
      if (element instanceof HTMLVideoElement) videos.push(element);
      return element;
    }) as typeof document.createElement;
    const OriginalAudioContext = window.AudioContext;
    window.AudioContext = class extends OriginalAudioContext {
      constructor(options?: AudioContextOptions) { super(options); audio.push(this); }
    };
    window.mediaLifecycleReview = {
      videos, audio,
      setHidden(value) { hidden = value; document.dispatchEvent(new Event("visibilitychange")); },
    };
  });
});

async function enterAlbum(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "打开这份惊喜" }).click();
  await page.getByRole("button", { name: /翻开小小美好/ }).click();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase", "idle");
}
async function enterDuet(page: Page) {
  await enterAlbum(page);
  await page.getByRole("button", { name: "下一章 →" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase", "idle");
  const film = page.locator('[data-film="duet"]');
  await film.scrollIntoViewIfNeeded();
  await film.getByRole("button", { name: "播放影片", exact: true }).click();
  await expect(film).toHaveAttribute("data-ready", "true");
  await expect(film).toHaveAttribute("data-playing", "true");
  return film;
}
async function makeScrollSpace(page: Page) {
  await page.evaluate(() => {
    const spacer = document.createElement("div");
    spacer.style.height = "200vh";
    spacer.dataset.lifecycleSpacer = "true";
    document.body.appendChild(spacer);
  });
}

test("film resumes only its prior play intent after offscreen and background pauses", async ({ page }) => {
  const film = await enterDuet(page);
  const video = film.locator("video");
  await makeScrollSpace(page);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await expect(film).not.toBeInViewport();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  const offscreenTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await page.waitForTimeout(400);
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(offscreenTime, 1);
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-playing", "true");

  await page.evaluate(() => window.mediaLifecycleReview.setHidden(true));
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  await expect.poll(() => page.evaluate(() => window.mediaLifecycleReview.audio.every((context) => context.state !== "running"))).toBe(true);
  const hiddenTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await page.waitForTimeout(400);
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(hiddenTime, 1);
  await page.evaluate(() => window.mediaLifecycleReview.setHidden(false));
  await expect(film).toHaveAttribute("data-playing", "true");

  await film.getByRole("button", { name: "暂停影片", exact: true }).click();
  const pausedTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
  await page.evaluate(() => {
    window.mediaLifecycleReview.setHidden(true);
    window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" });
  });
  await expect(film).not.toBeInViewport();
  await page.evaluate(() => window.mediaLifecycleReview.setHidden(false));
  await film.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await expect(film).toHaveAttribute("data-playing", "false");
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(pausedTime, 1);
});

test("rotating twice cannot reuse a stale decoded flag or lose a manual pause", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const film = await enterDuet(page);
  await expect.poll(() => film.locator("video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(.5);
  await film.getByRole("button", { name: "暂停影片", exact: true }).click();
  const pausedTime = await film.locator("video").evaluate((element: HTMLVideoElement) => element.currentTime);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/cinema/duet-*.mp4", async (route) => {
    await gate;
    await route.continue().catch(() => {}); // A superseded orientation may cancel its request.
  });
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(film).toHaveClass(/cinematic-film--portrait/);
    await expect(film).toHaveAttribute("data-ready", "false");
    await expect(film.locator(".cinematic-film__poster")).toHaveCSS("opacity", "1");
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(film).toHaveClass(/cinematic-film--landscape/);
    await expect.poll(() => film.locator("video").evaluate((element: HTMLVideoElement) => element.readyState)).toBe(0);
    await expect(film).toHaveAttribute("data-ready", "false");
    await expect(film.locator(".cinematic-film__poster")).toHaveCSS("opacity", "1");
    // The retained poster is actual decoded imagery, not a broken-image rectangle.
    await expect.poll(() => film.locator(".cinematic-film__poster").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  } finally { release(); }
  await expect(film).toHaveAttribute("data-ready", "true");
  await film.scrollIntoViewIfNeeded();
  await expect(film).toHaveAttribute("data-playing", "false");
  expect(await film.locator("video").evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(pausedTime, 1);
  await film.getByRole("button", { name: "播放影片", exact: true }).click();
  await expect(film).toHaveAttribute("data-playing", "true");
});

test("packed pets stop hidden decoders, resume their base and retain a visual frame", async ({ page }) => {
  await enterAlbum(page);
  const pets = page.getByRole("complementary", { name: "杏色与奶油色的两只泰迪" });
  await pets.scrollIntoViewIfNeeded();
  await expect(pets.locator('.pet-film[data-ready="true"]')).toHaveCount(2);
  await page.evaluate(() => window.mediaLifecycleReview.setHidden(true));
  await expect.poll(() => page.evaluate(() => window.mediaLifecycleReview.videos.filter((video) => video.src.includes("/cinema/pets/")).every((video) => video.paused))).toBe(true);
  await expect(pets.locator('.pet-film[data-ready="true"]')).toHaveCount(0);
  await expect.poll(() => pets.locator(".pet-poster").evaluateAll((images) => images.length === 2 && images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.evaluate(() => window.mediaLifecycleReview.setHidden(false));
  await expect(pets.locator('.pet-film[data-ready="true"][data-action="idle"]')).toHaveCount(2);

  await pets.getByRole("button", { name: "摸摸杏色泰迪" }).click();
  await expect(pets.locator(".pet-film").first()).toHaveAttribute("data-action", "pet");
  await page.evaluate(() => window.mediaLifecycleReview.setHidden(true));
  await page.evaluate(() => window.mediaLifecycleReview.setHidden(false));
  await expect(pets.locator('.pet-film[data-ready="true"][data-action="idle"]')).toHaveCount(2);

  await makeScrollSpace(page);
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }));
  await expect(pets).not.toBeInViewport();
  await expect.poll(() => page.evaluate(() => window.mediaLifecycleReview.videos.filter((video) => video.src.includes("/cinema/pets/")).every((video) => video.paused))).toBe(true);
  await pets.scrollIntoViewIfNeeded();
  await expect(pets.locator('.pet-film[data-ready="true"]')).toHaveCount(2);
  expect(await page.evaluate(() => window.mediaLifecycleReview.videos.filter((video) => video.src.includes("/cinema/pets/")).every((video) => video.muted))).toBe(true);
});
