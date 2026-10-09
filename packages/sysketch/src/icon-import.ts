/**
 * Converts a hand-drawn icon SVG (see docs/icon-checklist.md) into a theme-ready
 * icon body on a 48x48 grid with {A}/{M}/{L} color placeholders.
 */
export class IconImportError extends Error {}

export interface ConvertedIcon {
  body: string;
  warnings: string[];
}

const COLORS: Record<string, string> = {
  '#0000ff': '{A}',
  '#00f': '{A}',
  '#00ff00': '{M}',
  '#0f0': '{M}',
  '#ff0000': '{L}',
  '#f00': '{L}',
};

const FORBIDDEN = [
  'text',
  'tspan',
  'image',
  'linearGradient',
  'radialGradient',
  'filter',
  'mask',
  'pattern',
  'style',
  'script',
  'foreignObject',
  'use',
  'symbol',
];

const CARRIED = ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'];

const r3 = (n: number) => Math.round(n * 1000) / 1000;

function attrs(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) out[m[1]!] = m[2]!;
  return out;
}

function mapColor(value: string, bad: Set<string>): string {
  const c = value.trim().toLowerCase();
  if (c === 'none') return 'none';
  const mapped = COLORS[c];
  if (!mapped) bad.add(value);
  return mapped ?? value;
}

export function convertIconSvg(src: string): ConvertedIcon {
  const warnings: string[] = [];
  const s = src
    .replace(/<\?xml[^>]*\?>/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  const open = /<svg\b([^>]*)>/i.exec(s);
  const close = s.lastIndexOf('</svg>');
  if (!open || close === -1) throw new IconImportError('not an SVG file (no <svg> root)');
  const root = attrs(open[1]!);
  let inner = s.slice(open.index + open[0].length, close);

  const vb = root.viewBox
    ? root.viewBox
        .trim()
        .split(/[\s,]+/)
        .map(Number)
    : root.width && root.height
      ? [0, 0, parseFloat(root.width), parseFloat(root.height)]
      : [];
  if (vb.length !== 4 || vb.some((n) => Number.isNaN(n))) {
    throw new IconImportError('missing viewBox (export at 48x48)');
  }
  const [minX, minY, w, h] = vb as [number, number, number, number];
  if (Math.abs(w - h) > 0.01) throw new IconImportError(`canvas must be square, got ${w}x${h}`);
  const scale = 48 / w;
  if (w !== 48) warnings.push(`scaled from ${w}x${h} to 48x48`);

  inner = inner.replace(/<(title|desc|metadata)\b[\s\S]*?<\/\1>/gi, '');
  inner = inner.replace(/<defs\b[^>]*>([\s\S]*?)<\/defs>/gi, (_, d: string) => {
    if (d.replace(/<clipPath\b[\s\S]*?<\/clipPath>/gi, '').trim()) {
      throw new IconImportError('unsupported <defs> content (only a frame clip path is allowed)');
    }
    warnings.push('removed frame clip path');
    return '';
  });
  inner = inner.replace(/<defs\s*\/>/gi, '').replace(/\sclip-path="[^"]*"/gi, '');

  for (const tag of FORBIDDEN) {
    if (new RegExp(`<${tag}\\b`, 'i').test(inner)) {
      throw new IconImportError(
        `<${tag}> is not allowed (no text, images, gradients, filters, masks or styles)`,
      );
    }
  }
  if (/\s(style|class)="/i.test(inner)) {
    throw new IconImportError(
      'uses style/class attributes; export with presentation attributes (fill=, stroke=)',
    );
  }
  inner = inner.replace(/\s(id|data-[\w-]+|xmlns(:\w+)?)="[^"]*"/gi, '');

  const bad = new Set<string>();
  inner = inner.replace(
    /\b(fill|stroke|stop-color|color)="([^"]*)"/gi,
    (_, k: string, v: string) => `${k}="${mapColor(v, bad)}"`,
  );
  const carried: string[] = [];
  for (const k of CARRIED) {
    const v = root[k];
    if (v === undefined) continue;
    carried.push(`${k}="${k === 'fill' || k === 'stroke' ? mapColor(v, bad) : v}"`);
  }
  if (bad.size) {
    throw new IconImportError(
      `colors must be #0000FF (outline), #00FF00 (fill), #FF0000 (highlight) or none; found ${[...bad].join(', ')}`,
    );
  }
  if (root.fill === undefined) {
    carried.unshift('fill="none"');
    warnings.push('root had no fill; shapes without fill= are left unfilled');
  }

  const widths = [
    ...[...inner.matchAll(/stroke-width="([\d.]+)"/g)].map((m) => m[1]!),
    ...(root['stroke-width'] ? [root['stroke-width']] : []),
  ]
    .map((v) => Number(v) * scale)
    .filter((n) => n < 1.75 || n > 3.25);
  if (widths.length) {
    warnings.push(`stroke width ${r3(widths[0]!)} at 48px; aim for 2.5 so icons match`);
  }

  const tf: string[] = [];
  if (scale !== 1) tf.push(`scale(${r3(scale)})`);
  if (minX || minY) tf.push(`translate(${-minX} ${-minY})`);
  if (tf.length) carried.push(`transform="${tf.join(' ')}"`);

  const content = inner
    .replace(/\s*\n\s*/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
  if (!content) throw new IconImportError('the icon is empty');
  if (!content.includes('{A}') && !carried.some((c) => c.includes('{A}'))) {
    warnings.push('no #0000FF outline color used; the icon will look flat in dark themes');
  }
  const body = `<g ${carried.join(' ')}>${content}</g>`;
  if (body.length > 8000)
    warnings.push(`large icon (${body.length} chars); simplify paths if possible`);
  return { body, warnings };
}
