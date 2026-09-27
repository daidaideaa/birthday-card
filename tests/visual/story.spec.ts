import { test, expect } from '@playwright/test';
import { duet } from './interactive-helpers';

test('interactive four chapters, independent inputs, retained cake and replay', async ({page},info)=>{
  const errors:string[]=[];const requests:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await duet(page);
  const key=page.getByRole('button',{name:'弹奏来',exact:true});await key.scrollIntoViewIfNeeded();await key.focus();
  await page.keyboard.down('Space');await expect(page.locator('.key.is-held')).toHaveCount(1);
  await expect.poll(async()=>Number(await page.locator('.duet-sequence').getAttribute('data-progress'))).toBeGreaterThan(0);
  await page.keyboard.up('Space');await expect(page.locator('.key.is-held')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('piano.png')});
  await page.getByRole('button',{name:/想先看看写给你的话/}).click();await expect(page.locator('.letter-paper')).toBeVisible();
  await expect(page.locator('.letter-recording')).toHaveCount(0);
  await page.getByRole('button',{name:/最后，一起许个愿/}).click();
  const story=page.locator('.savanna-story');await expect(story).toBeVisible();
  await page.getByRole('button',{name:'轻轻招呼幼狮'}).click();await expect(story).toHaveAttribute('data-motion','approach');
  await page.locator('.savanna-chapters button').nth(1).click();
  for(let i=1;i<=3;i++)await page.getByRole('button',{name:`点亮第${i}颗星`,exact:true}).click();
  await expect(page.locator('.savanna-star-controls [aria-pressed=true]')).toHaveCount(3);
  await page.locator('.savanna-chapters button').nth(2).click();
  const walk=page.getByRole('button',{name:'按住，向前走'});await walk.scrollIntoViewIfNeeded();await walk.focus();
  await page.keyboard.down('Space');await expect.poll(async()=>Number(await story.getAttribute('data-progress'))).toBeGreaterThan(.01);
  await page.keyboard.up('Space');await expect(story).toHaveAttribute('data-motion','idle');
  const stopped=await story.getAttribute('data-progress');await page.waitForTimeout(250);expect(await story.getAttribute('data-progress')).toBe(stopped);
  await page.getByRole('button',{name:/把这份勇气/}).click();
  await page.getByRole('button',{name:'许下愿望，轻轻熄灭生日蜡烛'}).click();
  await expect(page.locator('.final-wish')).toHaveAttribute('data-candle-state','complete');
  await expect(page.locator('.cinema-cake')).toBeVisible();await page.screenshot({path:info.outputPath('ending.png')});
  await page.getByRole('button',{name:'重读那封信',exact:true}).click();await expect(page.locator('.letter-paper')).toBeVisible();
  await page.getByRole('button',{name:'回到生日邀请'}).click();await expect(page.getByRole('button',{name:'打开这份惊喜'})).toBeVisible();
  expect(requests.filter(url=>/cinema\/.*\.mp4/.test(url))).toEqual([]);expect(errors).toEqual([]);
});

test('reduced motion and WebGL fallback retain all reading and wish actions',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){if(type.includes('webgl'))return null;return original.apply(this,[type,...args] as Parameters<typeof original>);} as typeof original;});
  await page.goto('./');await page.getByRole('button',{name:'打开生日故事'}).click();await page.getByRole('button',{name:'下一章 →'}).click();
  await expect(page.locator('.duet-stage__status')).toContainText('暂时无法显示');
  await page.getByRole('button',{name:/想先看看写给你的话/}).click();await expect(page.locator('.letter-paper')).toBeVisible();
  await page.getByRole('button',{name:/最后，一起许个愿/}).click();await expect(page.locator('.savanna-art')).toBeVisible();
  await page.locator('.savanna-chapters button').nth(2).click();await page.getByRole('button',{name:/把这份勇气/}).click();
  await page.getByRole('button',{name:'许下愿望，轻轻熄灭生日蜡烛'}).click();await expect(page.locator('[data-candle-state=complete]')).toBeVisible();
});

test('missing stage models retain responsive keys and the reading route',async({page})=>{
  await page.route('**/models/jazz-duo.glb',route=>route.abort());await duet(page);
  await expect(page.locator('.duet-stage__status')).toContainText('暂时无法显示');
  const key=page.getByRole('button',{name:'弹奏来',exact:true});await key.scrollIntoViewIfNeeded();await key.focus();await page.keyboard.down('Space');
  await expect(page.locator('.key.is-held')).toHaveCount(1);await page.keyboard.up('Space');
  await page.getByRole('button',{name:/想先看看写给你的话/}).click();await expect(page.locator('.letter-paper')).toBeVisible();
});
