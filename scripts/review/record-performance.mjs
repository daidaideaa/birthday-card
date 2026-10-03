import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const output = '.asset-build/performance-review/check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
for (const [speed, name] of [[1, 'normal'], [.5, 'half-speed']]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1050 }, recordVideo: { dir: output, size: { width: 1280, height: 1050 } } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5184/birthday-card/performance-review.html');
  await page.locator('[data-ready="true"]').waitFor({ timeout: 60000 });
  await page.getByRole('combobox', { name: '播放速度' }).selectOption(String(speed));
  await page.getByRole('button', { name: '播放动作', exact: true }).click();
  const start = Date.now();
  await page.waitForFunction(() => Number(document.querySelector('[data-time]')?.getAttribute('data-time')) >= 26, null, { timeout: 180000 });
  await page.waitForTimeout(500);
  results.push({ name, requestedRate: speed, clipSeconds: 26, wallSeconds: (Date.now() - start) / 1000 });
  await context.close();
  await page.video().saveAs(`${output}/${name}.webm`);
  console.log(`Recorded ${name}`);
}
await writeFile(`${output}/recordings.json`, JSON.stringify(results, null, 2));
await browser.close();
