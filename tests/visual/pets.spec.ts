import { test, expect } from "@playwright/test";

test("two rendered companions decode independently and respond to a touch", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./");
  await page.getByRole("button", { name: "打开这份惊喜" }).click();
  const pets = page.getByRole("complementary", { name: "杏色与奶油色的两只泰迪" });
  await pets.scrollIntoViewIfNeeded();
  await expect(pets.locator('.pet-film[data-ready="true"]')).toHaveCount(2);
  await pets.getByRole("button", { name: "摸摸杏色泰迪" }).click();
  await expect(pets.locator(".pet-dialogue")).toHaveText("摸摸收到啦，最喜欢你了 ♡");
  await expect.poll(() => requests.some((url) => url.includes("apricot-pet.mp4"))).toBe(true);
  await expect(pets.locator(".pet-film").nth(0)).toHaveAttribute("data-action", "pet");
  expect(requests.some((url) => url.includes("cream-pet.mp4"))).toBe(false);
  await pets.getByRole("button", { name: "摸摸奶油色泰迪" }).click();
  await expect(pets.locator(".pet-dialogue")).toHaveText("再靠近一点，陪着你 ♡");
  await expect.poll(() => requests.some((url) => url.includes("cream-pet.mp4"))).toBe(true);
  await expect(pets.locator(".pet-film").nth(1)).toHaveAttribute("data-action", "pet");
});

test("reduced motion keeps still companions interactive without video decoders", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("./");
  await page.getByRole("button", { name: "打开这份惊喜" }).click();
  const pets = page.getByRole("complementary", { name: "杏色与奶油色的两只泰迪" });
  await pets.scrollIntoViewIfNeeded();
  await expect(pets).toHaveClass(/is-calm/);
  await expect(pets.locator("canvas")).toHaveCount(0);
  await pets.getByRole("button", { name: "摸摸奶油色泰迪" }).click();
  await expect(pets.locator(".pet-dialogue")).toHaveText("再靠近一点，陪着你 ♡");
  expect(requests.some((url) => /cinema\/pets\/.+\.mp4/.test(url))).toBe(false);
});

test("missing pet images and clips keep accessible feedback without broken images", async ({ page }) => {
  await page.route("**/cinema/pets/*", (route) => route.fulfill({ status: 404, body: "" }));
  await page.goto("./");
  await page.getByRole("button", { name: "打开这份惊喜" }).click();
  const pets = page.getByRole("complementary", { name: "杏色与奶油色的两只泰迪" });
  await pets.scrollIntoViewIfNeeded();
  await expect(pets.locator(".pet-missing-poster")).toHaveCount(2);
  await expect(pets.locator("img")).toHaveCount(0);
  await pets.getByRole("button", { name: "摸摸杏色泰迪" }).click();
  await expect(pets.locator(".pet-dialogue")).toHaveText("摸摸收到啦，最喜欢你了 ♡");
});
