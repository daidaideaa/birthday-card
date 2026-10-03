import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { duet } from '../../tests/visual/interactive-helpers';

const browser = await chromium.launch({ headless: true });
const baseURL = process.env.PERFORMANCE_REVIEW_URL || 'http://127.0.0.1:5184/birthday-card/';
const origin = new URL(baseURL).origin;
const page = await browser.newPage({ baseURL, viewport: { width: 1280, height: 1000 } });
const errors: string[] = [];
const blockedExternal: string[] = [];
page.on('pageerror', e => errors.push(e.message));
await page.route('**/*', route => {
  const url = route.request().url();
  if (url.startsWith(origin + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
  blockedExternal.push(url); return route.abort();
});
try {
await duet(page);
await expect(page.locator('.authored-duet-stage')).toHaveAttribute('data-status', 'ready', { timeout: 60000 });
const key = page.getByRole('button', { name: '弹奏来', exact: true });
await key.focus(); await page.keyboard.down('Space');
await expect.poll(async () => Number(await page.locator('.duet-sequence').getAttribute('data-progress')), { timeout: 10000 }).toBeGreaterThan(.02);
await page.keyboard.up('Space');
await expect(page.locator('.duet-sequence')).toHaveAttribute('data-mode', 'waiting', { timeout: 12000 });
await page.screenshot({ path: '.asset-build/performance-review/check/story-duet.png' });
await page.getByRole('button', { name: /想先看看写给你的话/ }).click();
await expect(page.locator('.letter-paper')).toBeVisible();
await expect(page.locator('.authored-duet-stage')).toHaveCount(0);
await writeFile('.asset-build/performance-review/check/story-integration.json', JSON.stringify({ baseURL, errors, blockedExternal, newStageLoaded: true, inputAdvanced: true, releaseStopped: true, letterRetained: true }, null, 2));
expect(errors).toEqual([]);
console.log('Full story loads authored stage, responds to keys, settles, and returns to the original letter.');
} finally { await browser.close(); }
