// Generate the sysketch logo set in docs/brand/: an "s" drawn as a tiny diagram (three
// nodes on a hand-drawn path) next to the wordmark in Shantell Sans. Text is converted to
// paths, so the files look the same everywhere.
// usage: npm run build && node scripts/brand.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import opentype from 'opentype.js';
import rough from 'roughjs';

const { svgToPng } = await import('../packages/sysketch/dist/index.js');

const TAGLINE = 'system design, sketched';
const PAPER = '#fffdf7';
const LIGHT = { ink: '#1f2328', sub: '#5c574b' };
const DARK = { ink: '#f1f3f5', sub: '#b9b3a5' };
const NODES = ['#f783ac', '#ffc93c', '#4cc3fc']; // pink, yellow, blue from the sketch palette

const font = (weight) => {
  const buf = readFileSync(`packages/sysketch/assets/shantell-sans-latin-${weight}-normal.woff`);
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
};
const bold = font(800);
const medium = font(500);
const textPath = (f, s, x, y, size, fill) =>
  `<path d="${f.getPath(s, x, y, size).toPathData(2)}" fill="${fill}"/>`;
const width = (f, s, size) => f.getAdvanceWidth(s, size);

const gen = rough.generator();
const paths = (drawable) =>
  gen
    .toPaths(drawable)
    .map(
      (p) =>
        `<path d="${p.d}" stroke="${p.stroke}" stroke-width="${p.strokeWidth}" fill="${p.fill ?? 'none'}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('');

/** The mark: a path shaped like an "s" with three colored nodes, in a 0..140 x 0..200 box. */
function mark(ink) {
  const base = { roughness: 1.3, bowing: 1.2, stroke: ink };
  const curve = gen.curve(
    [
      [76, 22],
      [28, 18],
      [20, 68],
      [62, 96],
      [104, 124],
      [96, 174],
      [42, 172],
    ],
    { ...base, seed: 11, strokeWidth: 3.6 },
  );
  const node = (x, y, fill, seed) =>
    gen.circle(x, y, 34, {
      ...base,
      seed,
      strokeWidth: 2.8,
      fill,
      fillStyle: 'hachure',
      hachureGap: 4,
      hachureAngle: -41,
      fillWeight: 2.4,
    });
  return (
    paths(curve) +
    paths(node(78, 22, NODES[0], 21)) +
    paths(node(60, 96, NODES[1], 22)) +
    paths(node(42, 172, NODES[2], 23))
  );
}

/** Mark + wordmark (+ tagline). Returns { svg, w, h }. */
function logo({ ink, sub }, { tagline = true, bg } = {}) {
  const pad = 24;
  const size = 96;
  const tx = pad + 150;
  const wordW = width(bold, 'sysketch', size);
  const tagW = width(medium, TAGLINE, 30);
  const w = Math.ceil(tx + Math.max(wordW, tagline ? tagW : 0) + pad);
  const h = 248;
  const body =
    `<g transform="translate(${pad} ${pad})">${mark(ink)}</g>` +
    textPath(bold, 'sysketch', tx, tagline ? 146 : 158, size, ink) +
    (tagline ? textPath(medium, TAGLINE, tx + 4, 196, 30, sub) : '');
  return {
    w,
    h,
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="sysketch: ${TAGLINE}">` +
      (bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : '') +
      body +
      `</svg>\n`,
  };
}

/** Square icon: the mark alone on a paper tile (avatars, favicons). */
function icon(size = 512) {
  const s = size / 256;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${size}" height="${size}" role="img" aria-label="sysketch">` +
    `<rect width="256" height="256" rx="56" fill="${PAPER}"/>` +
    `<g transform="translate(68 28) scale(${(1).toFixed(2)})">${mark(LIGHT.ink)}</g>` +
    `</svg>\n`
  ).replace(`width="${size}" height="${size}"`, `width="${256 * s}" height="${256 * s}"`);
}

/** GitHub social preview (1280x640). */
function social() {
  const l = logo(LIGHT);
  const scale = 1.45;
  const x = (1280 - l.w * scale) / 2;
  const install = 'claude mcp add sysketch -- npx -y sysketch-mcp';
  const line = '18x fewer AI tokens than writing the SVG';
  const lw = width(medium, line, 34);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640" width="1280" height="640">` +
    `<rect width="1280" height="640" fill="${PAPER}"/>` +
    `<g transform="translate(${x.toFixed(1)} 64) scale(${scale})">${l.svg.replace(/^<svg[^>]*>|<\/svg>\n$/g, '')}</g>` +
    textPath(medium, line, (1280 - lw) / 2, 500, 34, LIGHT.ink) +
    textPath(medium, install, (1280 - width(medium, install, 24)) / 2, 556, 24, '#8a8577') +
    `</svg>\n`
  );
}

mkdirSync('docs/brand', { recursive: true });
const out = (name, data) => {
  writeFileSync(`docs/brand/${name}`, data);
  console.log(`wrote docs/brand/${name}`);
};
const light = logo(LIGHT);
out('sysketch-logo.svg', light.svg);
out('sysketch-logo-dark.svg', logo(DARK).svg);
out('sysketch-wordmark.svg', logo(LIGHT, { tagline: false }).svg);
out('sysketch-icon.svg', icon(256));
out('sysketch-logo.png', svgToPng(logo(LIGHT, { bg: PAPER }).svg, 2));
out('sysketch-icon-512.png', svgToPng(icon(256), 2));
out('social-preview.png', svgToPng(social(), 1));
