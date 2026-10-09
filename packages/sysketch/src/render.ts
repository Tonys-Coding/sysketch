import { layout, NODE, PILL, type Pt } from './layout.js';
import type { Model } from './model.js';
import { lightTheme, type Theme } from './themes.js';
import { textPathData, type Anchor, type Weight } from './text.js';

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function textPath(
  text: string,
  x: number,
  y: number,
  size: number,
  weight: Weight,
  fill: string,
  anchor: Anchor = 'start',
): string {
  return `<path d="${textPathData(text, x, y, size, weight, anchor)}" fill="${fill}"/>`;
}

/** Polyline with rounded corners. */
function roundedPath(pts: Pt[], radius: number): string {
  if (pts.length < 2) return '';
  let d = `M${pts[0]!.x} ${pts[0]!.y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i - 1]!;
    const c = pts[i]!;
    const n = pts[i + 1]!;
    const l1 = Math.hypot(c.x - p.x, c.y - p.y);
    const l2 = Math.hypot(n.x - c.x, n.y - c.y);
    const r = Math.min(radius, l1 / 2, l2 / 2);
    if (r < 0.5) {
      d += `L${c.x} ${c.y}`;
      continue;
    }
    const a = { x: r2(c.x - ((c.x - p.x) / l1) * r), y: r2(c.y - ((c.y - p.y) / l1) * r) };
    const b = { x: r2(c.x + ((n.x - c.x) / l2) * r), y: r2(c.y + ((n.y - c.y) / l2) * r) };
    d += `L${a.x} ${a.y}Q${c.x} ${c.y} ${b.x} ${b.y}`;
  }
  const last = pts[pts.length - 1]!;
  return d + `L${last.x} ${last.y}`;
}

const ARROW = { len: 12, half: 6.5 };

export interface RenderOptions {
  theme?: Theme;
  direction?: 'right' | 'down';
}

export async function renderModel(model: Model, opts: RenderOptions = {}): Promise<string> {
  const theme = opts.theme ?? lightTheme;
  const lay = await layout(model);
  const out: string[] = [];

  if (model.title) {
    out.push(textPath(model.title, lay.width / 2, lay.titleY, 30, 800, theme.text, 'middle'));
  }

  for (const g of model.groups) {
    const b = lay.groups.get(g.id);
    if (!b) continue;
    out.push(
      `<g><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="20" fill="${theme.groupFill}" stroke="${theme.groupStroke}" stroke-width="2" stroke-dasharray="9 7"/>` +
        textPath(g.label, b.x + 20, b.y + 29, 16, 800, theme.muted) +
        `</g>`,
    );
  }

  for (const e of model.edges) {
    const route = lay.edges.get(e.id);
    if (!route || route.points.length < 2) continue;
    const pts = route.points.map((p) => ({ ...p }));
    const tip = pts[pts.length - 1]!;
    const prev = pts[pts.length - 2]!;
    const dl = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1;
    const ux = (tip.x - prev.x) / dl;
    const uy = (tip.y - prev.y) / dl;
    pts[pts.length - 1] = {
      x: r2(tip.x - ux * (ARROW.len - 1)),
      y: r2(tip.y - uy * (ARROW.len - 1)),
    };
    const base = { x: tip.x - ux * ARROW.len, y: tip.y - uy * ARROW.len };
    const head = `${r2(tip.x)},${r2(tip.y)} ${r2(base.x - uy * ARROW.half)},${r2(base.y + ux * ARROW.half)} ${r2(base.x + uy * ARROW.half)},${r2(base.y - ux * ARROW.half)}`;
    out.push(
      `<g><path d="${roundedPath(pts, 12)}" fill="none" stroke="${theme.edge}" stroke-width="${theme.edgeWidth}" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<polygon points="${head}" fill="${theme.edge}" stroke="${theme.edge}" stroke-width="1" stroke-linejoin="round"/></g>`,
    );
  }

  for (const n of model.nodes) {
    const b = lay.nodes.get(n.id)!;
    const hue = theme.hues[n.icon.hue] ?? theme.hues.slate!;
    const iconSize = NODE.icon;
    const ix = r2(b.x + b.w / 2 - iconSize / 2);
    const iy = r2(b.y + 14);
    const body = n.icon.body
      .replaceAll('{A}', hue.a)
      .replaceAll('{M}', hue.m)
      .replaceAll('{L}', '#ffffff');
    const labelY0 = b.y + 14 + iconSize + NODE.labelGap + 12;
    const labels = b.lines
      .map((line, i) =>
        textPath(
          line,
          b.x + b.w / 2,
          r2(labelY0 + i * 19),
          NODE.labelSize,
          700,
          theme.text,
          'middle',
        ),
      )
      .join('');
    out.push(
      `<g><title>${esc(n.label)}</title>` +
        `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${theme.cardRadius}" fill="${hue.card}" stroke="${hue.a}" stroke-width="${theme.cardStroke}"/>` +
        `<g transform="translate(${ix} ${iy}) scale(${r2(iconSize / 48)})">${body}</g>` +
        labels +
        `</g>`,
    );
  }

  for (const e of model.edges) {
    const pill = lay.edges.get(e.id)?.pill;
    if (!pill) continue;
    const cy = r2(pill.y + pill.h / 2);
    const num = e.step === undefined ? '' : String(e.step);
    const badge = (cx: number) =>
      `<circle cx="${r2(cx)}" cy="${cy}" r="${PILL.badge / 2}" fill="${theme.badge}"/>` +
      textPath(num, cx, r2(cy + 4.6), 13, 800, theme.badgeText, 'middle');
    if (!e.label) {
      out.push(`<g>${badge(pill.x + pill.w / 2)}</g>`);
      continue;
    }
    const hasBadge = num !== '';
    const textX = hasBadge ? pill.x + PILL.badge + 4 : pill.x + 11;
    out.push(
      `<g><rect x="${pill.x}" y="${pill.y}" width="${pill.w}" height="${pill.h}" rx="${pill.h / 2}" fill="${theme.pillFill}" stroke="${theme.pillStroke}" stroke-width="1.5"/>` +
        (hasBadge ? badge(pill.x + pill.h / 2) : '') +
        textPath(e.label, textX, r2(cy + 4.6), PILL.labelSize, 700, theme.text) +
        `</g>`,
    );
  }

  const desc = model.edges
    .map(
      (e) =>
        `${model.nodes.find((n) => n.id === e.from)?.label} to ${model.nodes.find((n) => n.id === e.to)?.label}`,
    )
    .join('; ');
  const title = model.title ?? 'System design diagram';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lay.width} ${lay.height}" width="${lay.width}" height="${lay.height}" role="img" aria-label="${esc(title)}">` +
    `<title>${esc(title)}</title><desc>${esc(desc)}</desc>` +
    `<rect width="${lay.width}" height="${lay.height}" fill="${theme.bg}"/>` +
    out.join('') +
    `</svg>\n`
  );
}
