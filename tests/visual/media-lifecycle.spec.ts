import {test,expect} from '@playwright/test';
import {album,duet,hidden,visibilityHarness} from './interactive-helpers';

test('duet pauses on hidden and offscreen, releases keys, and needs fresh input',async({page})=>{
  await visibilityHarness(page);await duet(page);const stage=page.locator('.duet-sequence');const key=page.getByRole('button',{name:'弹奏来',exact:true});await key.scrollIntoViewIfNeeded();await key.focus();await page.keyboard.down('Space');
  await expect.poll(async()=>Number(await stage.getAttribute('data-progress'))).toBeGreaterThan(.005);
  await hidden(page,true);await expect(stage).toHaveAttribute('data-active','false');await expect(page.locator('.key.is-held')).toHaveCount(0);
  const paused=await stage.getAttribute('data-progress');await page.waitForTimeout(350);expect(await stage.getAttribute('data-progress')).toBe(paused);
  await page.keyboard.up('Space');await hidden(page,false);await expect(stage).toHaveAttribute('data-active','true');await page.waitForTimeout(250);expect(await stage.getAttribute('data-progress')).toBe(paused);
  await key.focus();await page.keyboard.down('Space');await expect.poll(async()=>Number(await stage.getAttribute('data-progress'))).toBeGreaterThan(Number(paused));await page.keyboard.up('Space');
  await page.evaluate(()=>{const spacer=document.createElement('div');spacer.style.height='200vh';document.body.append(spacer);window.scrollTo(0,document.body.scrollHeight);});
  await expect(stage).toHaveAttribute('data-active','false');const offscreen=await stage.getAttribute('data-progress');await page.waitForTimeout(300);expect(await stage.getAttribute('data-progress')).toBe(offscreen);
});
test('orientation changes preserve the same renderer and choreography progress',async({page})=>{
  await duet(page);const stage=page.locator('.duet-sequence');const key=page.getByRole('button',{name:'弹奏来',exact:true});await key.scrollIntoViewIfNeeded();await key.focus();await page.keyboard.down('Space');
  await expect.poll(async()=>Number(await stage.getAttribute('data-progress'))).toBeGreaterThan(.005);await page.keyboard.up('Space');
  const before=Number(await stage.getAttribute('data-progress'));await page.locator('.duet-stage canvas').evaluate(el=>el.setAttribute('data-original','yes'));
  await page.setViewportSize({width:900,height:500});await page.setViewportSize({width:390,height:844});await key.scrollIntoViewIfNeeded();
  await expect(page.locator('.duet-stage canvas')).toHaveAttribute('data-original','yes');expect(Number(await stage.getAttribute('data-progress'))).toBeGreaterThanOrEqual(before);
});
test('pets stop their renderer in background and resume without hidden video decoders',async({page})=>{
  await visibilityHarness(page);await album(page);const stage=page.locator('.live-pets-stage');await stage.scrollIntoViewIfNeeded();await expect(stage).toHaveAttribute('data-ready','true');
  await hidden(page,true);await expect(stage).toHaveAttribute('data-active','false');const frames=await stage.getAttribute('data-frames');await page.waitForTimeout(350);expect(await stage.getAttribute('data-frames')).toBe(frames);
  await hidden(page,false);await expect(stage).toHaveAttribute('data-active','true');await expect.poll(async()=>Number(await stage.getAttribute('data-frames'))).toBeGreaterThan(Number(frames));await expect(page.locator('.live-pets video')).toHaveCount(0);
});
