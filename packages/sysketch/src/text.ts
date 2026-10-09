import { readFileSync } from 'node:fs';
import opentype from 'opentype.js';

export type Weight = 700 | 800;
export type Anchor = 'start' | 'middle' | 'end';

const fonts = new Map<Weight, opentype.Font>();

function font(weight: Weight): opentype.Font {
  let f = fonts.get(weight);
  if (!f) {
    const buf = readFileSync(
      new URL(`../assets/nunito-latin-${weight}-normal.woff`, import.meta.url),
    );
    f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    fonts.set(weight, f);
  }
  return f;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function measure(text: string, size: number, weight: Weight = 700): number {
  return r2(font(weight).getAdvanceWidth(text, size));
}

/** Greedy word wrap to at most `maxWidth`. */
export function wrap(text: string, size: number, weight: Weight, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size, weight) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/** SVG path data for `text` with its baseline at y. */
export function textPathData(
  text: string,
  x: number,
  y: number,
  size: number,
  weight: Weight = 700,
  anchor: Anchor = 'start',
): string {
  const w = measure(text, size, weight);
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return font(weight).getPath(text, left, y, size).toPathData(1);
}
