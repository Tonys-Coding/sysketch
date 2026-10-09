// Renders every catalog icon in every theme to icons-src/_preview.png.
import { chromium } from '@playwright/test';
import { DRAWN_ICONS, ICONS, themes } from '../packages/sysketch/dist/index.js';

const COLS = 10;
const CELL = { w: 118, h: 112 };
const drawn = new Set(DRAWN_ICONS);
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function sheet(theme) {
  const rows = Math.ceil(ICONS.length / COLS);
  const W = COLS * CELL.w + 24;
  const H = rows * CELL.h + 56;
  const cells = ICONS.map((icon, i) => {
    const x = 12 + (i % COLS) * CELL.w;
    const y = 44 + Math.floor(i / COLS) * CELL.h;
    const hue = theme.hues[icon.hue] ?? theme.hues.slate;
    const body = icon.body
      .replaceAll('{A}', hue.a)
      .replaceAll('{M}', hue.m)
      .replaceAll('{L}', theme.iconLight);
    const status = drawn.has(icon.name) ? '●' : icon.borrowed ? '○' : '◐';
    const fill = theme.card.fill ?? hue.card;
    const stroke = theme.card.style === 'bar' ? (theme.card.border ?? hue.a) : hue.a;
    return (
      `<rect x="${x + 4}" y="${y + 4}" width="${CELL.w - 8}" height="${CELL.h - 8}" rx="10" fill="${fill}" stroke="${stroke}"/>` +
      `<g transform="translate(${x + CELL.w / 2 - 22} ${y + 14}) scale(0.9167)" opacity="${icon.borrowed ? 0.35 : 1}">${body}</g>` +
      `<text x="${x + CELL.w / 2}" y="${y + 84}" text-anchor="middle" font-size="12" font-weight="600" fill="${theme.text}">${status} ${esc(icon.name)}</text>`
    );
  }).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" font-family="Inter, system-ui, sans-serif">` +
    `<rect width="${W}" height="${H}" fill="${theme.bg}"/>` +
    `<text x="16" y="28" font-size="16" font-weight="800" fill="${theme.title}">${theme.name}   ● yours  ◐ placeholder  ○ not drawn (borrowed, faded)</text>` +
    cells +
    `</svg>`
  );
}

const html = `<body style="margin:0;display:flex;flex-direction:column;gap:12px;background:#888">${Object.values(themes).map(sheet).join('')}</body>`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: COLS * CELL.w + 24, height: 800 } });
await page.setContent(html);
await page.screenshot({ path: 'icons-src/_preview.png', fullPage: true });
await browser.close();
console.log('preview: icons-src/_preview.png');
