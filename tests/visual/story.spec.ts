import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  });
});
async function enterAlbum(page: Page) {
  await page.goto("./");
  await page.getByRole("button", { name: "打开这份惊喜" }).click();
  await page.getByRole("button", { name: /翻开小小美好/ }).click();
  await expect(page.locator('[data-chapter="moments"]')).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase", "idle");
}

test("film frames, complete reading, sequential wish and replay", async ({ page }, info) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => requests.push(request.url()));
  const shot = async (name: string) => page.screenshot({ path: info.outputPath(name + ".png"), animations: "disabled" });
  await page.goto("./");
  await expect(page.getByRole("button", { name: "打开这份惊喜" })).toBeEnabled();
  await shot("invitation");
  expect(requests.some((url) => /cinema\/(duet|pride)|jazz-duo|lion-cub|father-lion|tasks-vision|teddy-/.test(url))).toBe(false);
  await page.getByRole("button", { name: "打开这份惊喜" }).click();
  await page.getByRole("button", { name: /翻开小小美好/ }).click();
  await expect(page.locator('[data-chapter="moments"]')).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase", "idle");
  await shot("moments");
  expect(requests.some((url) => /cinema\/(duet|pride).*\.mp4/.test(url))).toBe(false);
  await page.getByRole("button", { name: "下一章 →" }).click();
  const duet = page.locator('[data-film="duet"]');
  await expect(duet).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase", "idle");
  await expect.poll(() => duet.locator(".cinematic-film__poster").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await duet.scrollIntoViewIfNeeded();
  await shot("jazz-arrival");
  await page.getByRole("button", { name: "弹奏哆", exact: true }).click();
  expect(await duet.locator("video").evaluate((video: HTMLVideoElement) => video.paused)).toBe(true);
  await page.getByRole("button", { name: /开始我们的双人舞/ }).click();
  await expect(duet).toHaveAttribute("data-ready", "true");
  await expect.poll(async () => Number(await duet.getAttribute("data-time"))).toBeGreaterThan(.5);
  await page.getByRole("button", { name: "♫ 声音开" }).click();
  expect(await duet.locator("video").evaluate((video: HTMLVideoElement) => video.muted)).toBe(true);
  await page.getByRole("button", { name: "♫ 声音关" }).click();
  expect(await duet.locator("video").evaluate((video: HTMLVideoElement) => video.muted)).toBe(false);
  for (const [name, time] of [["03s", 3], ["09s", 9], ["16s", 16], ["22s", 22]] as const) {
    await page.locator(".piano-nook").evaluate((element, seconds) => element.dispatchEvent(new CustomEvent("cinema-review-seek", { detail: seconds })), time);
    await expect.poll(async () => Number(await duet.getAttribute("data-frame-time"))).toBeCloseTo(time, 0);
    expect(await duet.locator("video").evaluate((video: HTMLVideoElement) => video.paused && video.muted)).toBe(true);
    await duet.scrollIntoViewIfNeeded();
    await shot("duet-" + name);
  }
  await expect(page.locator(".letter-envelope")).toHaveCount(0);
  // Rotation selects an independently composed file without restarting the scene.
  const viewport = page.viewportSize()!;
  const wasPortrait = await duet.evaluate((element) => element.classList.contains("cinematic-film--portrait"));
  await page.setViewportSize(wasPortrait ? { width: 1440, height: 900 } : { width: 390, height: 844 });
  await expect(duet.locator("video")).toHaveAttribute("src", new RegExp(`duet-${wasPortrait ? "landscape" : "portrait"}\\.mp4$`));
  await expect(duet).toHaveAttribute("data-ready", "true");
  await expect.poll(() => duet.locator("video").evaluate((video: HTMLVideoElement) => video.currentTime)).toBeCloseTo(22, 0);
  expect(await duet.locator("video").evaluate((video: HTMLVideoElement) => video.paused && video.muted)).toBe(true);
  await page.setViewportSize(viewport);
  await expect(duet).toHaveAttribute("data-ready", "true");
  await duet.getByRole("button", { name: "播放影片", exact: true }).click();
  const envelope = page.locator(".letter-envelope");
  await expect(envelope).toBeFocused();
  await expect(envelope).toBeInViewport();
  await expect(page.locator(".letter-paper")).toHaveCount(0);
  await shot("letter-arrival");
  await envelope.click();
  await expect(page.locator(".letter-paper")).toBeVisible();
  await expect(duet).toHaveCount(0);
  await shot("letter");
  await page.getByRole("button", { name: /最后，一起许个愿/ }).click();
  const pride = page.locator('[data-film="pride"]');
  await expect(pride).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase", "idle");
  await pride.scrollIntoViewIfNeeded();
  await expect(pride).toHaveAttribute("data-ready", "true");
  await expect(page.locator(".birthday-candle-stage")).toHaveCount(0);
  await page.locator(".pride-story").evaluate((element) => element.dispatchEvent(new CustomEvent("cinema-review-seek", { detail: 8 })));
  await expect(page.locator(".pride-caption h3")).toHaveText("记住，你是谁。");
  await shot("savanna");
  await page.getByRole("button", { name: /把这份勇气，带进生日愿望/ }).click();
  await expect(pride).toHaveCount(0);
  await page.getByRole("button", { name: "许下愿望，轻轻熄灭生日蜡烛" }).last().click();
  await expect(page.locator('[data-candle-state="complete"]')).toBeVisible();
  await expect(page.locator(".wish-complete h2")).toBeInViewport();
  await shot("ending");
  await page.getByRole("button", { name: "再看一次这份惊喜" }).click();
  await expect(page.getByRole("button", { name: "打开这份惊喜" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("reduced motion and WebGL fallback retain the letter and wish", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
      if (type.includes("webgl")) return null;
      return original.apply(this, [type, ...args] as Parameters<typeof original>);
    } as typeof original;
  });
  await page.goto("./");
  await page.getByRole("button", { name: "打开生日故事" }).click();
  await page.getByRole("button", { name: "下一章 →" }).click();
  await expect(page.locator('[data-film="duet"]')).toHaveAttribute("data-playing", "false");
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase", "idle");
  await page.getByRole("button", { name: "想先看看写给你的话 →" }).click();
  await expect(page.locator(".letter-paper")).toBeVisible();
  await page.getByRole("button", { name: /最后，一起许个愿/ }).click();
  await expect(page.locator('[data-film="pride"]')).toHaveAttribute("data-playing", "false");
  await page.getByRole("button", { name: "看下一个画面 →" }).click();
  await expect(page.locator(".pride-caption h3")).toHaveText("记住，你是谁。");
  await page.getByRole("button", { name: /把这份勇气，带进生日愿望/ }).click();
  await expect(page.locator(".birthday-candle-stage")).toBeVisible();
  await page.getByRole("button", { name: "许下愿望，轻轻熄灭生日蜡烛" }).last().click();
  await expect(page.locator('[data-candle-state="complete"]')).toBeVisible();
});

test("failed media keeps the poster and reading actions available", async ({ page }) => {
  await page.route(/\/cinema\/.*\.mp4/, (route) => route.abort());
  await enterAlbum(page);
  await page.getByRole("button", { name: "下一章 →" }).click();
  const film = page.locator('[data-film="duet"]');
  await expect(film.locator(".cinematic-film__status")).toContainText("影片暂时无法播放");
  await expect(film.locator(".cinematic-film__poster")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "想先看看写给你的话 →" }).click();
  await expect(page.locator(".letter-paper")).toBeVisible();
  await page.getByRole("button", { name: /最后，一起许个愿/ }).click();
  await expect(page.locator('[data-film="pride"] .cinematic-film__status')).toContainText("影片暂时无法播放");
  await page.getByRole("button", { name: /把这份勇气，带进生日愿望/ }).click();
  await expect(page.locator(".birthday-candle-stage")).toBeVisible();
});
