import { expect, type Page } from "@playwright/test";
export async function album(page:Page) {
  await page.goto("./");
  await page.getByRole("button",{name:"打开这份惊喜"}).click();
  await page.getByRole("button",{name:/翻开小小美好/}).click();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase","idle");
}
export async function duet(page:Page) {
  await album(page);await page.getByRole("button",{name:"下一章 →"}).click();
  await page.locator(".accompaniment__keys").waitFor();
  await expect(page.locator("main")).toHaveAttribute("data-transition-phase","idle");
}
export async function cake(page:Page) {
  await page.getByRole("button",{name:/想先看看写给你的话/}).click();
  await page.getByRole("button",{name:/最后，一起许个愿/}).click();
  await page.locator(".savanna-chapters button").nth(2).click();
  await page.getByRole("button",{name:/把这份勇气/}).click();
}
export async function visibilityHarness(page:Page) {
  // Controlled browser events test listeners, not actual iOS background suspension.
  await page.addInitScript(()=>{
    let hidden=false;
    Object.defineProperty(document,"hidden",{get:()=>hidden,configurable:true});
    Object.assign(window,{reviewVisibility:(value:boolean)=>{hidden=value;document.dispatchEvent(new Event("visibilitychange"));}});
  });
}
export async function hidden(page:Page,value:boolean) {
  await page.evaluate(value=>(window as unknown as {reviewVisibility:(value:boolean)=>void}).reviewVisibility(value),value);
}
