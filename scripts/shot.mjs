// Dev helper: screenshot an SVG with Chromium for visual review.
// usage: node scripts/shot.mjs in.svg [out.png] [scale]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const [src, out = src.replace(/\.svg$/, '.png'), scale = '1'] = process.argv.slice(2);
const svg = fs.readFileSync(src, 'utf8');
const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: +scale,
});
await page.setContent(`<body style="margin:0">${svg}</body>`);
await page.screenshot({ path: out });
await browser.close();
console.log(`${out} (${w}x${h})`);
