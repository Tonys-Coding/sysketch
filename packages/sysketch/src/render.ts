import { layout, NODE, PILL, SUB, type Pt } from './layout.js';
import { legendBlock } from './legend.js';
import type { EdgeModel, Model } from './model.js';
import { defaultTheme, iconPaint, type Theme } from './themes.js';
import { sketch, sketchIcon } from './sketch.js';
import { textPathData, type Anchor, type FontRef } from './text.js';

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function textPath(
  text: string,
  x: number,
  y: number,
  size: number,
  font: FontRef,
  fill: string,
  anchor: Anchor = 'start',
): string {
  return `<path d="${textPathData(text, x, y, size, font, anchor)}" fill="${fill}"/>`;
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
  const theme = opts.theme ?? defaultTheme;
  const lay = await layout(model, theme);
  const out: string[] = [];

  /** Line, badge and badge-text colors for an edge (colored edges use their palette hue). */
  const edgePaint = (e: EdgeModel) => {
    const hue = e.color ? theme.hues[e.color] : undefined;
    if (!hue) return { line: theme.edge, badge: theme.badge, badgeText: theme.badgeText };
    // sketch hues use ink for accents, so colored arrows take the crayon color there
    const line = theme.sketch ? hue.m : hue.a;
    return { line, badge: line, badgeText: theme.sketch ? theme.badgeText : theme.bg };
  };
  const legend = legendBlock(model, theme, Math.max(lay.width - 72, 640), edgePaint);
  const W = Math.max(lay.width, legend ? legend.width + 72 : 0);
  const legendY = lay.height - 12;
  const H = legend ? legendY + legend.height + 36 : lay.height;
  const defs: string[] = [];
  const { card } = theme;
  const sk = theme.sketch;

  if (theme.backdrop) {
    const { kind, color, size } = theme.backdrop;
    const mark =
      kind === 'dots'
        ? `<circle cx="${size / 2}" cy="${size / 2}" r="1.1" fill="${color}"/>`
        : `<path d="M${size} 0H0V${size}" fill="none" stroke="${color}" stroke-width="1"/>`;
    defs.push(
      `<pattern id="sk-bg" width="${size}" height="${size}" patternUnits="userSpaceOnUse">${mark}</pattern>`,
    );
  }
  if (card.shadow) {
    const sh = card.shadow;
    defs.push(
      `<filter id="sk-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="${sh.dy}" stdDeviation="${sh.blur / 2}" flood-color="${sh.color}" flood-opacity="${sh.opacity}"/></filter>`,
    );
  }
  const shadowAttr = card.shadow ? ' filter="url(#sk-shadow)"' : '';

  if (model.title) {
    out.push(
      textPath(model.title, W / 2, lay.titleY, 30, theme.fonts.title, theme.title, 'middle'),
    );
  }

  for (const g of model.groups) {
    const b = lay.groups.get(g.id);
    if (!b) continue;
    const box = sk
      ? sketch.rect(
          b.x,
          b.y,
          b.w,
          b.h,
          card.radius + 4,
          {
            fill: theme.group.fill,
            fillStyle: 'solid',
            stroke: theme.group.stroke,
            strokeWidth: 1.75,
          },
          `g:${g.id}`,
          sk,
        )
      : `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${card.radius + 4}" fill="${theme.group.fill}" stroke="${theme.group.stroke}" stroke-width="1.75"${theme.group.dashed ? ' stroke-dasharray="8 6"' : ''}/>`;
    out.push(
      `<g>${box}` +
        textPath(
          theme.group.uppercase ? g.label.toUpperCase() : g.label,
          b.x + 20,
          b.y + 29,
          theme.group.uppercase ? 13 : 16,
          theme.fonts.group,
          theme.group.label,
        ) +
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
    const headPts: [number, number][] = [
      [r2(tip.x), r2(tip.y)],
      [r2(base.x - uy * ARROW.half), r2(base.y + ux * ARROW.half)],
      [r2(base.x + uy * ARROW.half), r2(base.y - ux * ARROW.half)],
    ];
    const color = edgePaint(e).line;
    const dash = e.dashed
      ? ` stroke-dasharray="${r2(theme.edgeWidth * 3.5)} ${r2(theme.edgeWidth * 3)}"`
      : '';
    if (sk) {
      const ink = { stroke: color, strokeWidth: theme.edgeWidth };
      out.push(
        `<g>${sketch.path(roundedPath(pts, 12), ink, `e:${e.id}`, sk, dash)}` +
          sketch.polygon(
            headPts,
            { ...ink, fill: color, fillStyle: 'solid', strokeWidth: 1 },
            `a:${e.id}`,
            sk,
          ) +
          `</g>`,
      );
      continue;
    }
    const head = headPts.map((p) => p.join(',')).join(' ');
    out.push(
      `<g><path d="${roundedPath(pts, 12)}" fill="none" stroke="${color}" stroke-width="${theme.edgeWidth}" stroke-linecap="round" stroke-linejoin="round"${dash}/>` +
        `<polygon points="${head}" fill="${color}" stroke="${color}" stroke-width="1" stroke-linejoin="round"/></g>`,
    );
  }

  for (const [ni, n] of model.nodes.entries()) {
    const b = lay.nodes.get(n.id)!;
    const hue = theme.hues[n.icon.hue] ?? theme.hues.slate!;
    const iconSize = NODE.icon;
    const ix = r2(b.x + b.w / 2 - iconSize / 2);
    const iy = r2(b.y + 14);
    const paint = iconPaint(theme, hue);
    const body = n.icon.body.replace(/\{[AMLS]\}/g, (k) => paint[k as keyof typeof paint]);
    const iconMarkup = sk ? sketchIcon(body, `i:${n.id}`, sk, [paint['{L}'], hue.a]) : body;
    const labelY0 = b.y + 14 + iconSize + NODE.labelGap + 12;
    const labels = b.lines
      .map((line, i) =>
        textPath(
          line,
          b.x + b.w / 2,
          r2(labelY0 + i * 19),
          NODE.labelSize,
          theme.fonts.label,
          theme.text,
          'middle',
        ),
      )
      .join('');
    const subY0 = labelY0 + (b.lines.length - 1) * 19 + SUB.line + 2;
    const subs = b.subLines
      .map((line, i) =>
        textPath(
          line,
          b.x + b.w / 2,
          r2(subY0 + i * SUB.line),
          SUB.size,
          theme.fonts.edge,
          theme.group.label,
          'middle',
        ),
      )
      .join('');
    const rect = `x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${card.radius}"`;
    let shell: string;
    if (sk) {
      shell = sketch.rect(
        b.x,
        b.y,
        b.w,
        b.h,
        card.radius,
        {
          fill: card.fill ?? hue.card,
          fillStyle: 'solid',
          stroke: hue.a,
          strokeWidth: card.stroke,
        },
        `n:${n.id}`,
        sk,
      );
    } else if (card.style === 'bar') {
      const clip = `sk-clip-${ni}`;
      defs.push(`<clipPath id="${clip}"><rect ${rect}/></clipPath>`);
      shell =
        `<rect ${rect} fill="${card.fill ?? hue.card}" stroke="${card.border ?? hue.a}" stroke-width="${card.stroke}"${shadowAttr}/>` +
        `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="5" fill="${hue.a}" clip-path="url(#${clip})"/>`;
    } else {
      shell = `<rect ${rect} fill="${card.fill ?? hue.card}" stroke="${hue.a}" stroke-width="${card.stroke}"${shadowAttr}/>`;
    }
    out.push(
      `<g><title>${esc(n.label)}</title>` +
        shell +
        `<g transform="translate(${ix} ${iy}) scale(${r2(iconSize / 48)})">${iconMarkup}</g>` +
        labels +
        subs +
        `</g>`,
    );
  }

  for (const e of model.edges) {
    const pill = lay.edges.get(e.id)?.pill;
    if (!pill) continue;
    const cy = r2(pill.y + pill.h / 2);
    const num = e.step === undefined ? '' : String(e.step);
    const paint = edgePaint(e);
    const badge = (cx: number) =>
      (sk
        ? sketch.circle(
            r2(cx),
            cy,
            PILL.badge / 2,
            { fill: paint.badge, fillStyle: 'solid', stroke: theme.edge, strokeWidth: 1.5 },
            `b:${e.id}`,
            sk,
          )
        : `<circle cx="${r2(cx)}" cy="${cy}" r="${PILL.badge / 2}" fill="${paint.badge}"/>`) +
      textPath(num, cx, r2(cy + 4.6), 13, theme.fonts.badge, paint.badgeText, 'middle');
    if (!e.label) {
      out.push(`<g>${badge(pill.x + pill.w / 2)}</g>`);
      continue;
    }
    const hasBadge = num !== '';
    const textX = hasBadge ? pill.x + PILL.badge + 4 : pill.x + 11;
    const pillBox = sk
      ? sketch.rect(
          pill.x,
          pill.y,
          pill.w,
          pill.h,
          pill.h / 2,
          {
            fill: theme.pill.fill,
            fillStyle: 'solid',
            stroke: theme.pill.stroke,
            strokeWidth: 1.5,
          },
          `p:${e.id}`,
          sk,
        )
      : `<rect x="${pill.x}" y="${pill.y}" width="${pill.w}" height="${pill.h}" rx="${pill.h / 2}" fill="${theme.pill.fill}" stroke="${theme.pill.stroke}" stroke-width="1.5"/>`;
    out.push(
      `<g>${pillBox}` +
        (hasBadge ? badge(pill.x + pill.h / 2) : '') +
        textPath(e.label, textX, r2(cy + 4.6), PILL.labelSize, theme.fonts.edge, theme.pill.text) +
        `</g>`,
    );
  }

  const desc = model.edges
    .map(
      (e) =>
        `${model.nodes.find((n) => n.id === e.from)?.label} to ${model.nodes.find((n) => n.id === e.to)?.label}`,
    )
    .join('; ');
  if (legend) out.push(legend.render(36, legendY));
  const title = model.title ?? 'System design diagram';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}">` +
    `<title>${esc(title)}</title><desc>${esc(desc)}</desc>` +
    (defs.length ? `<defs>${defs.join('')}</defs>` : '') +
    `<rect width="${W}" height="${H}" fill="${theme.bg}"/>` +
    (theme.backdrop ? `<rect width="${W}" height="${H}" fill="url(#sk-bg)"/>` : '') +
    out.join('') +
    `</svg>\n`
  );
}
