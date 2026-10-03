import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const output = '.asset-build/performance-review/check';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
const errors = [], samples = [];
page.on('pageerror', error => errors.push(error.message));
page.on('crash', () => errors.push('Page crashed'));
const started = Date.now();
try {
  await page.goto(process.env.PERFORMANCE_REVIEW_URL || 'http://127.0.0.1:5184/birthday-card/performance-review.html');
  await page.locator('[data-ready="true"]').waitFor({ timeout: 60000 });
  await page.evaluate(() => {
    window.reviewFrames = [];
    let previous = performance.now();
    const frame = now => { window.reviewFrames.push(now - previous); previous = now; requestAnimationFrame(frame); };
    requestAnimationFrame(frame);
  });
  const cdp = await page.context().newCDPSession(page);
  for (let cycle = 0; Date.now() - started < 600000; cycle++) {
    await page.getByRole('button', { name: '回到开头', exact: true }).click();
    await page.getByRole('button', { name: '播放动作', exact: true }).click();
    await expect.poll(async () => Number(await page.locator('[data-time]').getAttribute('data-time')), { timeout: 45000 }).toBe(26);
    await cdp.send('HeapProfiler.collectGarbage');
    samples.push(await page.evaluate(cycle => {
      const times = window.reviewFrames.splice(0).sort((a, b) => a - b);
      const canvas = document.querySelector('.duet-stage canvas');
      const gl = canvas.getContext('webgl2'), debug = gl.getExtension('WEBGL_debug_renderer_info');
      return { cycle, heapBytes: performance.memory?.usedJSHeapSize, frames: times.length,
        p50ms: times[Math.floor(times.length * .5)], p95ms: times[Math.floor(times.length * .95)],
        contextLost: gl.isContextLost(), renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'unavailable' };
    }, cycle));
    expect(samples.at(-1).contextLost).toBe(false);
    console.log(`Completed playback cycle ${cycle + 1}`);
  }
  expect(errors).toEqual([]);
  const heaps = samples.slice(2).map(s => s.heapBytes).filter(Number.isFinite);
  // Catch retention of entire models/contexts, allowing ordinary browser variation.
  if (heaps.length) expect(heaps.at(-1) - heaps[0]).toBeLessThan(32 * 1048576);
} finally {
  await writeFile(`${output}/stability.json`, JSON.stringify({ elapsedSeconds: (Date.now() - started) / 1000, errors, samples, scope: 'Desktop browser playback; not a physical phone test' }, null, 2));
  await browser.close();
}
