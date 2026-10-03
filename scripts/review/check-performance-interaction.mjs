import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output = '.asset-build/performance-review/check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL,
  args: process.env.PLAYWRIGHT_CHANNEL ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const url = process.env.PERFORMANCE_REVIEW_URL || 'http://127.0.0.1:5184/birthday-card/performance-review.html';
await page.goto(url);
await page.locator('[data-ready="true"]').waitFor({ timeout: 60000 });
await page.getByRole('button', { name: '琴键控制动作', exact: true }).click();
const key = page.getByRole('button', { name: '弹奏来', exact: true });
await key.focus(); await page.keyboard.down('Space');
await expect(page.locator('.key.is-held')).toHaveCount(1);
await expect.poll(async () => Number(await page.locator('[data-time]').getAttribute('data-time')), { timeout: 10000 }).toBeGreaterThan(.15);
await page.keyboard.up('Space');
await expect(page.locator('.key.is-held')).toHaveCount(0);
await expect(page.locator('[data-time]')).toHaveAttribute('data-mode', 'waiting', { timeout: 12000 });
const stopped = Number(await page.locator('[data-time]').getAttribute('data-time'));
expect(stopped).toBeLessThanOrEqual(1.2);
expect(stopped).toBeGreaterThan(0);
await page.waitForTimeout(500);
expect(Number(await page.locator('[data-time]').getAttribute('data-time'))).toBe(stopped);
await key.focus(); await page.keyboard.down('Space');
await expect.poll(async () => Number(await page.locator('[data-time]').getAttribute('data-time'))).toBeGreaterThan(stopped);
await page.evaluate(() => window.dispatchEvent(new Event('blur')));
await page.keyboard.up('Space');
await expect(page.locator('[data-time]')).toHaveAttribute('data-mode', 'waiting');
const blurred = Number(await page.locator('[data-time]').getAttribute('data-time'));
await page.waitForTimeout(500);
expect(Number(await page.locator('[data-time]').getAttribute('data-time'))).toBe(blurred);
await page.getByRole('button', { name: '静音', exact: true }).click();
await expect(page.getByRole('button', { name: '开启声音', exact: true })).toBeVisible();
await page.setViewportSize({ width: 390, height: 844 });
expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
await page.reload(); await page.locator('[data-ready="true"]').waitFor({ timeout: 60000 });
// Space and Enter own independent presses; releasing either must retain the other.
await key.focus(); await page.keyboard.down('Space'); await page.keyboard.down('Enter');
await page.keyboard.up('Space');
await expect(key).toHaveAttribute('aria-pressed', 'true');
await page.keyboard.up('Enter');
await expect(key).toHaveAttribute('aria-pressed', 'false');
// Synthetic touch events exercise ownership and hit testing in the real DOM.
const keyboard = page.locator('.accompaniment__keys');
await keyboard.scrollIntoViewIfNeeded();
const rect = await keyboard.boundingBox();
const pointer = (type, id, x, y = .85) => keyboard.dispatchEvent(type, {
  pointerId: id, pointerType: 'touch', clientX: rect.x + rect.width * x,
  clientY: rect.y + rect.height * y, bubbles: true,
});
await key.focus(); await page.keyboard.down('Space');
await pointer('pointerdown', 11, .1); await pointer('pointerdown', 12, .1);
await page.getByRole('button', { name: '静音', exact: true }).focus();
await page.keyboard.up('Space');
await expect(key).toHaveAttribute('aria-pressed', 'true');
await pointer('pointerup', 11, .1);
await expect(key).toHaveAttribute('aria-pressed', 'true');
await pointer('pointermove', 12, .3);
await expect(key).toHaveAttribute('aria-pressed', 'false');
await expect(page.locator('.key.is-held')).toHaveCount(1);
await pointer('pointerdown', 13, .6, .2); // F sharp, above the white keys.
await expect(page.locator('.key--black.is-held')).toHaveCount(1);
await pointer('pointercancel', 12, .3);
await expect(page.locator('.key.is-held')).toHaveCount(1);
await pointer('lostpointercapture', 13, .6, .2);
await expect(page.locator('.key.is-held')).toHaveCount(0);
// A failed GLB fetch must leave a working retry without leaking stale readiness.
let failModel = true;
await page.route('**/*snow-performance.glb', route => failModel ? route.abort('failed') : route.continue());
await page.reload();
await expect(page.locator('.authored-duet-stage')).toHaveAttribute('data-status', 'error');
failModel = false;
await page.getByRole('button', { name: '重新载入舞台', exact: true }).click();
await expect(page.locator('.authored-duet-stage')).toHaveAttribute('data-status', 'ready', { timeout: 60000 });
await writeFile(`${output}/interaction.json`, JSON.stringify({ errors, stoppedAt: stopped, blurFrozeAt: blurred, phoneOverflow: false, reload: true, keyboardOwners: true, touchOwnershipAndGlissando: true, failedLoadRetry: true }, null, 2));
await browser.close();
expect(errors).toEqual([]);
console.log('Contact stop, resume, blur, mute toggle, phone layout and reload passed.');
