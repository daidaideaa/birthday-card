import { test, expect } from "@playwright/test";
// A repeatable balanced budget on software-rendered CI and local runners.
// This does not emulate a phone GPU or make a hardware frame-rate assertion.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 4 });
    Object.defineProperty(navigator, "deviceMemory", { get: () => 8 });
  });
});
test("story frames, click fallback, dance and replay", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto("./");
  await expect(
    page.getByRole("button", { name: "打开这份惊喜" }),
  ).toBeEnabled();
  const shot = async (name: string) => {
    await page.screenshot({
      path: info.outputPath(name + ".png"),
      fullPage: false,
      animations: "disabled",
    });
  };
  await shot("invitation");
  expect(
    requests.some((url) =>
      /jazz-duo|lion-cub|father-lion|tasks-vision|teddy-/.test(url),
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "打开这份惊喜" }).click();
  await page.getByRole("button", { name: /翻开小小美好/ }).click();
  await expect(page.locator('[data-chapter="moments"]')).toBeVisible();
  await shot("moments");
  await page.getByRole("button", { name: "下一章 →" }).click();
  await expect(page.locator(".jazz-stage--ready")).toBeVisible({
    timeout: 60000,
  });
  await page.locator(".jazz-stage").scrollIntoViewIfNeeded();
  await shot("jazz-arrival");
  await page.getByRole("button", { name: /开始我们的双人舞/ }).click();
  await page.locator(".jazz-stage").scrollIntoViewIfNeeded();
  await expect
    .poll(async () =>
      Number(
        await page.locator(".jazz-stage__viewport").getAttribute("data-time"),
      ),
    )
    .toBeGreaterThan(0.5);
  for (const [name, time] of [
    ["side-step", 2.2],
    ["kick", 4.3],
    ["clasp", 6.8],
    ["turn", 8.5],
    ["ending-pose", 11.8],
  ] as const) {
    await page
      .locator(".piano-nook")
      .evaluate(
        (el, t) =>
          el.dispatchEvent(
            new CustomEvent("cinema-review-seek", { detail: t }),
          ),
        time,
      );
    await shot("jazz-" + name);
  }
  await page.getByRole("button", { name: "想先看看写给你的话 →" }).click();
  await expect(page.locator(".letter-paper")).toBeVisible();
  expect(await page.locator(".jazz-stage canvas").count()).toBe(0);
  await shot("letter");
  await page.getByRole("button", { name: /最后，一起许个愿/ }).click();
  await expect(page.locator(".pride-rock-status")).toHaveCount(0, {
    timeout: 60000,
  });
  await page.locator(".pride-rock-stage").scrollIntoViewIfNeeded();
  await shot("savanna");
  await page
    .getByRole("button", { name: "许下愿望，轻轻熄灭生日蜡烛" })
    .last()
    .click();
  await expect(page.locator('[data-candle-state="complete"]')).toBeVisible();
  await expect(page.locator(".wish-complete h2")).toBeInViewport();
  await shot("ending");
  await page.getByRole("button", { name: "再看一次这份惊喜" }).click();
  await expect(
    page.getByRole("button", { name: "打开这份惊喜" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("reduced motion and WebGL fallback retain the letter and wish", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      type: string,
      ...args: unknown[]
    ) {
      if (type.includes("webgl")) return null;
      return original.apply(this, [type, ...args] as Parameters<
        typeof original
      >);
    } as typeof original;
  });
  await page.goto("./");
  await page.getByRole("button", { name: "打开生日故事" }).click();
  await page.getByRole("button", { name: "下一章 →" }).click();
  await page.getByRole("button", { name: "想先看看写给你的话 →" }).click();
  await expect(page.locator(".letter-paper")).toBeVisible();
  await page.getByRole("button", { name: /最后，一起许个愿/ }).click();
  await expect(
    page.getByRole("button", { name: "看下一个画面 →" }),
  ).toBeEnabled();
});
