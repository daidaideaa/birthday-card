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

test("chapter commits occur under cover and replay cancels pending navigation", async ({ page }) => {
  await enterAlbum(page);
  await page.evaluate(() => {
    const main = document.querySelector("main")!;
    const records: { chapter: string; opacity: number }[] = [];
    Object.assign(window, { chapterCuts: records });
    let previous = main.className;
    new MutationObserver(() => {
      if (main.className === previous) return;
      previous = main.className;
      records.push({ chapter: main.className, opacity: Number(getComputedStyle(document.querySelector(".chapter-curtain")!).opacity) });
    }).observe(main, { attributes: true, attributeFilter: ["class"] });
  });
  await page.getByRole("button", { name: "下一章 →" }).click();
  await expect(page.locator('[data-chapter="letter"]')).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase", "idle");
  const cuts = await page.evaluate(() => (window as unknown as { chapterCuts: { chapter: string; opacity: number }[] }).chapterCuts);
  expect(cuts.some((cut) => cut.chapter.includes("chapter-letter") && cut.opacity > .99)).toBe(true);
  await page.getByRole("button", { name: "下一章 →" }).click();
  await page.getByRole("button", { name: "回到生日邀请" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "打开这份惊喜" })).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase", "idle");
  await page.waitForTimeout(2000); // Exceed the cancelled prepare deadline.
  await expect(page.locator(".memory-book")).toHaveCount(0);
  await expect(page.locator(".chapter-curtain")).toHaveCSS("visibility", "hidden");
});
