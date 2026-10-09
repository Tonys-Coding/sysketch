import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

// Visual regression on the golden example diagrams, rendered in real Chromium.
for (const name of ['url-shortener', 'web-scale']) {
  test(`${name} renders and matches screenshot`, async ({ page }) => {
    const svg = readFileSync(`examples/${name}.svg`, 'utf8');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.setContent(`<body style="margin:0">${svg}</body>`);
    const box = await page.locator('svg').boundingBox();
    const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!;
    expect(box?.width).toBe(Number(w));
    expect(box?.height).toBe(Number(h));
    expect(errors).toEqual([]);
    await expect(page.locator('svg')).toHaveScreenshot(`${name}.png`, { maxDiffPixelRatio: 0.002 });
  });
}
