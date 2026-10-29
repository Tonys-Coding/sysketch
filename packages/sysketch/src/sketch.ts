import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core.js';

/** Hand-drawn rendering knobs for a theme (see the `sketch` theme). */
export interface SketchStyle {
  roughness: number;
  bowing: number;
  /** roughness used inside icons, which are small */
  iconRoughness: number;
  hachureGap: number;
  /** icons only: draw each outline once instead of the doubled hand-drawn pass */
  iconSingleStroke?: boolean;
  /** icons only: bowing (how much straight lines curve); defaults to `bowing` */
  iconBowing?: number;
  /** icons only: multiplier for outline width, so dense icons do not clot */
  iconWidth?: number;
}

export interface Ink {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  /** hachure = crayon scribble, solid = flat */
  fillStyle?: 'hachure' | 'solid' | 'cross-hatch' | 'zigzag';
}

const gen = rough.generator();

/** Stable per-shape seed, so the same diagram always wobbles the same way. */
function seed(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 2147483646) + 1;
}

const trim = (d: string) => d.replace(/(\d+\.\d)\d+/g, '$1');

function options(
  ink: Ink,
  key: string,
  s: SketchStyle,
  roughness = s.roughness,
  icon = false,
): Options {
  const width = (ink.strokeWidth ?? 2) * (icon ? (s.iconWidth ?? 1) : 1);
  const o: Options = {
    seed: seed(key),
    roughness,
    bowing: icon ? (s.iconBowing ?? s.bowing) : s.bowing,
    ...(icon && s.iconSingleStroke ? { disableMultiStroke: true } : {}),
    stroke: ink.stroke ?? 'none',
    strokeWidth: width,
    hachureGap: s.hachureGap,
    hachureAngle: -41,
    fillWeight: Math.max(1, width * 0.45),
    preserveVertices: true,
  };
  if (ink.fill && ink.fill !== 'none') {
    o.fill = ink.fill;
    o.fillStyle = ink.fillStyle ?? 'hachure';
  }
  return o;
}

function emit(drawable: ReturnType<typeof gen.path>, extra = ''): string {
  return gen
    .toPaths(drawable)
    .map(
      (p) =>
        `<path d="${trim(p.d)}" fill="${p.fill ?? 'none'}" stroke="${p.stroke}" stroke-width="${Math.round(p.strokeWidth * 100) / 100}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`,
    )
    .join('');
}

export function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  const k = Math.min(r, w / 2, h / 2);
  return (
    `M${x + k} ${y}H${x + w - k}Q${x + w} ${y} ${x + w} ${y + k}V${y + h - k}` +
    `Q${x + w} ${y + h} ${x + w - k} ${y + h}H${x + k}Q${x} ${y + h} ${x} ${y + h - k}` +
    `V${y + k}Q${x} ${y} ${x + k} ${y}Z`
  );
}

export const sketch = {
  rect(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    ink: Ink,
    key: string,
    s: SketchStyle,
  ) {
    return emit(gen.path(roundedRectPath(x, y, w, h, r), options(ink, key, s)));
  },
  circle(cx: number, cy: number, r: number, ink: Ink, key: string, s: SketchStyle) {
    return emit(gen.circle(cx, cy, r * 2, options(ink, key, s, s.roughness * 0.6)));
  },
  /** `extra` is appended to every emitted path, e.g. a stroke-dasharray. */
  path(d: string, ink: Ink, key: string, s: SketchStyle, extra = '') {
    return emit(gen.path(d, options(ink, key, s)), extra);
  },
  polygon(points: [number, number][], ink: Ink, key: string, s: SketchStyle) {
    return emit(gen.polygon(points, options(ink, key, s, s.roughness * 0.5)));
  },
};

const num = (a: Record<string, string>, k: string) => Number(a[k] ?? 0);

function attrs(src: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of src.matchAll(/([\w:-]+)\s*=\s*"([^"]*)"/g)) out[m[1]!] = m[2]!;
  return out;
}

function points(v: string | undefined): [number, number][] {
  const n = (v ?? '')
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const out: [number, number][] = [];
  for (let i = 0; i + 1 < n.length; i += 2) out.push([n[i]!, n[i + 1]!]);
  return out;
}

/**
 * Redraw an icon body (placeholder colors already resolved) with rough strokes and
 * scribbled fills. Handles the shapes icons are allowed to contain.
 */
export function sketchIcon(
  body: string,
  key: string,
  s: SketchStyle,
  /** fills drawn flat instead of scribbled (highlights, solid ink details) */
  solid: string[],
): string {
  const out: string[] = [];
  const stack: Record<string, string>[] = [{}];
  let i = 0;
  for (const m of body.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, closing, tag, rest, selfClose] = m;
    const inherited = stack[stack.length - 1]!;
    if (closing) {
      if (tag === 'g') {
        stack.pop();
        out.push('</g>');
      }
      continue;
    }
    const a = { ...inherited, ...attrs(rest!) };
    if (tag === 'g') {
      if (selfClose) continue;
      const { transform, ...inheritable } = a;
      stack.push(inheritable);
      out.push(transform ? `<g transform="${transform}">` : '<g>');
      continue;
    }
    const fill = a.fill ?? 'black';
    const ink: Ink = {
      fill,
      stroke: a.stroke ?? 'none',
      strokeWidth: Number(a['stroke-width'] ?? 1),
      // highlights and solid ink details stay flat so they read clearly
      fillStyle: solid.includes(fill) ? 'solid' : 'hachure',
    };
    const opts = options(ink, `${key}:${i++}`, s, s.iconRoughness, true);
    let shape: string;
    switch (tag) {
      case 'rect': {
        const rx = num(a, 'rx') || num(a, 'ry');
        const d = roundedRectPath(num(a, 'x'), num(a, 'y'), num(a, 'width'), num(a, 'height'), rx);
        shape = emit(gen.path(d, opts));
        break;
      }
      case 'circle':
        shape = emit(gen.circle(num(a, 'cx'), num(a, 'cy'), num(a, 'r') * 2, opts));
        break;
      case 'ellipse':
        shape = emit(
          gen.ellipse(num(a, 'cx'), num(a, 'cy'), num(a, 'rx') * 2, num(a, 'ry') * 2, opts),
        );
        break;
      case 'path':
        shape = emit(gen.path(a.d ?? '', opts));
        break;
      case 'line':
        shape = emit(gen.line(num(a, 'x1'), num(a, 'y1'), num(a, 'x2'), num(a, 'y2'), opts));
        break;
      case 'polygon':
        shape = emit(gen.polygon(points(a.points), opts));
        break;
      case 'polyline':
        shape = emit(gen.linearPath(points(a.points), opts));
        break;
      default:
        continue;
    }
    out.push(a.transform ? `<g transform="${a.transform}">${shape}</g>` : shape);
  }
  return out.join('');
}
