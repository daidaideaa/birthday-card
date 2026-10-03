import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { duet } from '../../tests/visual/interactive-helpers';

const baseURL = process.env.PERFORMANCE_REVIEW_URL || 'http://127.0.0.1:5185/birthday-card/';
const media = 'https://birthday-card-media.daidaidefish.workers.dev/birthday-card/';
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
const page = await browser.newPage({ baseURL, viewport: { width: 1280, height: 1000 } });
const errors: string[] = [], models: string[] = [], forbidden: string[] = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => {
  if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  if (response.url().endsWith('.glb')) models.push(response.url());
});
await page.route('**/*', route => {
  const url = route.request().url();
  if (url.startsWith(media) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
  if (url.startsWith(new URL(baseURL).origin + '/') && !/\.(?:glb|mp4|mp3)(?:\?|$)/.test(url)) return route.continue();
  forbidden.push(url); return route.abort();
});
try {
  await duet(page);
  await expect(page.locator('.authored-duet-stage')).toHaveAttribute('data-status', 'ready', { timeout: 90000 });
  expect(models.some(url => url.includes('/duet-review-20261003-v1/') && url.endsWith('/snow-performance.glb'))).toBe(true);
  expect(models.some(url => url.includes('/duet-review-20261003-v1/') && url.endsWith('/rain-performance.glb'))).toBe(true);
  expect(models.every(url => url.startsWith(media))).toBe(true);
  const key = page.getByRole('button', { name: '弹奏来', exact: true });
  await key.focus(); await page.keyboard.down('Space');
  await expect.poll(async () => Number(await page.locator('.duet-sequence').getAttribute('data-progress'))).toBeGreaterThan(.02);
  await page.keyboard.up('Space');
  await expect(page.locator('.duet-sequence')).toHaveAttribute('data-mode', 'waiting', { timeout: 5000 });
  await page.screenshot({ path: '.asset-build/performance-review/check/remote-story.png' });
  await page.getByRole('button', { name: /想先看看写给你的话/ }).click();
  await expect(page.locator('.letter-paper')).toBeVisible();
  expect(errors).toEqual([]); expect(forbidden).toEqual([]);
  console.log('Remote GLBs decoded, key input advanced, release stopped, and the letter remained accessible.');
} finally {
  await writeFile('.asset-build/performance-review/check/remote.json', JSON.stringify({ baseURL, models, forbidden, errors }, null, 2));
  await browser.close();
}
