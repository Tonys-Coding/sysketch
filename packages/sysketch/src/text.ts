import { readFileSync } from 'node:fs';
import opentype from 'opentype.js';

/** A bundled font: `assets/<family>-latin-<weight>-normal.woff`. */
export interface FontRef {
  family: string;
  weight: number;
}
export type Anchor = 'start' | 'middle' | 'end';

const fonts = new Map<string, opentype.Font>();

function font(ref: FontRef): opentype.Font {
  const key = `${ref.family}-latin-${ref.weight}-normal`;
  let f = fonts.get(key);
  if (!f) {
    const buf = readFileSync(new URL(`../assets/${key}.woff`, import.meta.url));
    f = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
    fonts.set(key, f);
  }
  return f;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function measure(text: string, size: number, ref: FontRef): number {
  return r2(font(ref).getAdvanceWidth(text, size));
}

/** Greedy word wrap to at most `maxWidth`. */
export function wrap(text: string, size: number, ref: FontRef, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next, size, ref) > maxWidth) {
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
  ref: FontRef,
  anchor: Anchor = 'start',
): string {
  const w = measure(text, size, ref);
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return font(ref).getPath(text, left, y, size).toPathData(1);
}
