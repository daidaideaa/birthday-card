import {test,expect} from '@playwright/test';
import {album} from './interactive-helpers';

test('two live companions share a renderer and respond independently without films',async({page})=>{
  const requests:string[]=[];page.on('request',r=>requests.push(r.url()));await album(page);
  const pets=page.locator('.live-pets');await pets.scrollIntoViewIfNeeded();await expect(pets.locator('.live-pets-stage')).toHaveAttribute('data-ready','true');
  await expect(pets.locator('canvas')).toHaveCount(1);
  await page.getByRole('button',{name:'摸摸杏杏'}).click();await expect(pets.locator('[role=status]')).toContainText('摇了摇尾巴');
  await page.getByRole('button',{name:'摸摸奶油'}).click();await expect(pets.locator('[role=status]')).toContainText('轻轻靠过来');
  expect(requests.some(url=>/cinema\/pets\/.*\.mp4/.test(url))).toBe(false);
});
test('reduced motion retains pet feedback without an idle animation loop',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await album(page);const stage=page.locator('.live-pets-stage');await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-ready','true');
  // Font/layout and the initial intersection may request a final still frame.
  await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);
  const frame=await stage.getAttribute('data-frames');await page.waitForTimeout(600);expect(await stage.getAttribute('data-frames')).toBe(frame);
  await page.getByRole('button',{name:'摸摸奶油'}).click();await expect(page.locator('.live-pets-caption')).toContainText('轻轻靠过来');
});
test('missing pet models preserve feedback and chapter navigation',async({page})=>{
  await page.route('**/models/teddy-*.glb',route=>route.abort());await album(page);await expect(page.locator('.live-pets')).toContainText('陪你继续读下去');
  await page.getByRole('button',{name:'摸摸杏杏'}).click();await expect(page.locator('.live-pets-caption')).toContainText('摇了摇尾巴');
  await page.getByRole('button',{name:'下一章 →'}).click();await expect(page.locator('.duet-sequence')).toBeVisible();
});
