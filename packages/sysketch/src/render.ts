import { layout, MAP_NODE, NODE, PILL, SUB, type Pt } from './layout.js';
import { legendBlock } from './legend.js';
import type { Logo } from './logos.js';
import type { EdgeModel, GroupModel, MapSpec, Model } from './model.js';
import { defaultTheme, iconPaint, mix, type Theme } from './themes.js';
import { mapPath } from './maps.js';
import { sketch, sketchIcon } from './sketch.js';
import { GlyphSheet, type Anchor, type FontRef } from './text.js';

const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

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

/** Tile behind brand logos: logos are never recolored, so they get a neutral backing. */
const TILE = { size: 52, radius: 12, pad: 8 };

/**
 * An official logo as an <image>: the file's own bytes, scaled uniformly (never stretched),
 * with no theme paint, effects or hand-drawn roughening. Simple Icons publishes single-color
 * marks plus the brand's official color; that color is the only thing added.
 */
function logoMarkup(logo: Logo, cx: number, top: number, theme: Theme, key: string): string {
  const t = TILE.size;
  const x = r2(cx - t / 2);
  const y = r2(top + (NODE.icon - t) / 2);
  const tileFill = logo.darkTile ? '#1E293B' : '#FFFFFF';
  const tileStroke = logo.darkTile ? '#0F172A' : theme.group.stroke;
  const tile = theme.sketch
    ? sketch.rect(
        x,
        y,
        t,
        t,
        TILE.radius,
        { fill: tileFill, fillStyle: 'solid', stroke: tileStroke, strokeWidth: 1.25 },
        key,
        theme.sketch,
      )
    : `<rect x="${x}" y="${y}" width="${t}" height="${t}" rx="${TILE.radius}" fill="${tileFill}" stroke="${tileStroke}" stroke-width="1"/>`;
  let data = logo.data;
  if (logo.color) {
    const svg = Buffer.from(logo.data, 'base64').toString('utf8');
    data = Buffer.from(svg.replace(/<svg\b/, `<svg fill="${logo.color}"`)).toString('base64');
  }
  const inner = t - TILE.pad * 2;
  return (
    tile +
    `<image x="${r2(x + TILE.pad)}" y="${r2(y + TILE.pad)}" width="${inner}" height="${inner}" preserveAspectRatio="xMidYMid meet" href="data:${logo.mime};base64,${data}"><title>${esc(logo.title)} logo (${esc(logo.source)})</title></image>`
  );
}

export interface RenderOptions {
  theme?: Theme;
  direction?: 'right' | 'down';
  /**
   * Tag nodes and edges for scripts that animate or step through the diagram: node groups get
   * class="sk-node" data-node, edge groups class="sk-edge" data-from/data-to plus an invisible
   * path.sk-route along the route's centre line. Off by default (plain output stays smaller).
   */
  annotate?: boolean;
}

export async function renderModel(model: Model, opts: RenderOptions = {}): Promise<string> {
  const theme = opts.theme ?? defaultTheme;
  const lay = await layout(model, theme);
  const out: string[] = [];
  const glyphs = new GlyphSheet();
  const textPath = (
    text: string,
    x: number,
    y: number,
    size: number,
    font: FontRef,
    fill: string,
    anchor: Anchor = 'start',
  ) => glyphs.draw(text, x, y, size, font, fill, anchor);

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

  // A map with its pins in the box, used behind groups and in map nodes. `base` is the surface
  // color the land is mixed from.
  const mapMarkup = (
    map: MapSpec,
    box: { x: number; y: number; w: number; h: number },
    base: string,
    key: string,
  ): string => {
    if (box.w < 80 || box.h < 40) return '';
    const m = mapPath(map.name, box.x, box.y, box.w, box.h);
    const hex = /^#[0-9a-f]{6}/i.test(base);
    // dark surfaces need more of the line color for the land to show
    const dark = hex && [1, 3, 5].reduce((n, i) => n + parseInt(base.slice(i, i + 2), 16), 0) < 300;
    const land = hex
      ? mix(base.slice(0, 7), theme.group.stroke, dark ? 0.55 : 0.3)
      : theme.group.stroke;
    const shape = sk
      ? sketch.path(
          m.d,
          { fill: land, fillStyle: 'solid', stroke: theme.group.stroke, strokeWidth: 1.25 },
          `m:${key}`,
          sk,
        )
      : `<path d="${m.d}" fill="${land}"${hex ? '' : ' fill-opacity="0.16"'} stroke="${theme.group.stroke}" stroke-width="1.25" stroke-linejoin="round"/>`;
    const pinColor = (theme.hues.red ?? theme.hues.orange ?? theme.hues.slate!).a;
    const pins = map.pins
      .map((p, i) => {
        const [x, y] = m.at(p.lon, p.lat);
        // teardrop pin whose tip is the place
        const d =
          `M${x} ${y}C${r2(x - 2)} ${r2(y - 4)} ${r2(x - 5.5)} ${r2(y - 7)} ${r2(x - 5.5)} ${r2(y - 11)}` +
          `C${r2(x - 5.5)} ${r2(y - 14.2)} ${r2(x - 3)} ${r2(y - 16.5)} ${x} ${r2(y - 16.5)}` +
          `C${r2(x + 3)} ${r2(y - 16.5)} ${r2(x + 5.5)} ${r2(y - 14.2)} ${r2(x + 5.5)} ${r2(y - 11)}` +
          `C${r2(x + 5.5)} ${r2(y - 7)} ${r2(x + 2)} ${r2(y - 4)} ${x} ${y}Z`;
        const body = sk
          ? sketch.path(
              d,
              { fill: pinColor, fillStyle: 'solid', stroke: pinColor, strokeWidth: 1.25 },
              `p:${key}:${i}`,
              sk,
            )
          : `<path d="${d}" fill="${pinColor}" stroke="${pinColor}" stroke-width="1" stroke-linejoin="round"/>`;
        const right = x > box.x + box.w - 90;
        return (
          `<g data-pin="${esc(p.label)}">${body}<circle cx="${x}" cy="${r2(y - 11)}" r="2" fill="#FFFFFF"/>` +
          textPath(
            p.label,
            right ? x - 9 : x + 9,
            r2(y - 7),
            12,
            theme.fonts.edge,
            theme.text,
            right ? 'end' : 'start',
          ) +
          `</g>`
        );
      })
      .join('');
    return `<g data-map="${map.name}">${shape}${pins}</g>`;
  };

  // Outer groups first; nested ones get a slightly deeper fill so the levels read apart.
  const depth = (g: GroupModel): number => {
    const parent = g.parent && model.groups.find((p) => p.id === g.parent);
    return parent ? depth(parent) + 1 : 0;
  };
  const groupFill = (d: number) => {
    const f = theme.group.fill;
    if (!d || !/^#[0-9a-f]{6}/i.test(f)) return f;
    return mix(f.slice(0, 7), theme.group.stroke, Math.min(0.24, 0.08 * d)) + f.slice(7);
  };
  for (const g of [...model.groups].sort((a, b) => depth(a) - depth(b))) {
    const b = lay.groups.get(g.id);
    if (!b) continue;
    const fill = groupFill(depth(g));
    const box = sk
      ? sketch.rect(
          b.x,
          b.y,
          b.w,
          b.h,
          card.radius + 4,
          {
            fill,
            fillStyle: 'solid',
            stroke: theme.group.stroke,
            strokeWidth: 1.75,
          },
          `g:${g.id}`,
          sk,
        )
      : `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="${card.radius + 4}" fill="${fill}" stroke="${theme.group.stroke}" stroke-width="1.75"${theme.group.dashed ? ' stroke-dasharray="8 6"' : ''}/>`;
    // simplified map backdrop (maps: {Group: world}), under the label and the nodes
    const mapSvg = g.map
      ? mapMarkup(g.map, { x: b.x + 16, y: b.y + 44, w: b.w - 32, h: b.h - 60 }, fill, `g:${g.id}`)
      : '';
    out.push(
      `<g>${box}${mapSvg}` +
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

  // sequence diagrams: a dashed lifeline under each participant, behind the messages
  for (const [i, l] of (lay.lifelines ?? []).entries()) {
    const d = `M${l.x} ${l.y1}V${l.y2}`;
    const dash = ` stroke-dasharray="7 6"`;
    out.push(
      sk
        ? sketch.path(d, { stroke: theme.group.stroke, strokeWidth: 1.5 }, `l:${i}`, sk, dash)
        : `<path d="${d}" fill="none" stroke="${theme.group.stroke}" stroke-width="1.5"${dash}/>`,
    );
  }

  const edgeTag = (e: EdgeModel) =>
    opts.annotate ? ` class="sk-edge" data-from="${esc(e.from)}" data-to="${esc(e.to)}"` : '';
  const routeTag = (pts: Pt[]) =>
    opts.annotate ? `<path class="sk-route" d="${roundedPath(pts, 12)}" fill="none"/>` : '';
  for (const e of model.edges) {
    const route = lay.edges.get(e.id);
    if (!route || route.points.length < 2) continue;
    const pts = route.points.map((p) => ({ ...p }));
    /** Arrowhead at pts[at], pointing away from its neighbour; the line stops at its base. */
    const head = (at: number, from: number): [number, number][] => {
      const tip = pts[at]!;
      const prev = pts[from]!;
      const dl = Math.hypot(tip.x - prev.x, tip.y - prev.y) || 1;
      const ux = (tip.x - prev.x) / dl;
      const uy = (tip.y - prev.y) / dl;
      pts[at] = { x: r2(tip.x - ux * (ARROW.len - 1)), y: r2(tip.y - uy * (ARROW.len - 1)) };
      const base = { x: tip.x - ux * ARROW.len, y: tip.y - uy * ARROW.len };
      return [
        [r2(tip.x), r2(tip.y)],
        [r2(base.x - uy * ARROW.half), r2(base.y + ux * ARROW.half)],
        [r2(base.x + uy * ARROW.half), r2(base.y - ux * ARROW.half)],
      ];
    };
    const heads: [number, number][][] = [];
    if (e.ends !== 'none') heads.push(head(pts.length - 1, pts.length - 2));
    if (e.ends === 'both') heads.push(head(0, 1));
    const color = edgePaint(e).line;
    const width = r2(theme.edgeWidth * (e.thick ? 2 : 1));
    const dash = e.dashed ? ` stroke-dasharray="${r2(width * 3.5)} ${r2(width * 3)}"` : '';
    if (sk) {
      const ink = { stroke: color, strokeWidth: width };
      out.push(
        `<g${edgeTag(e)}>${routeTag(route.points)}${sketch.path(roundedPath(pts, 12), ink, `e:${e.id}`, sk, dash)}` +
          heads
            .map((h, i) =>
              sketch.polygon(
                h,
                { ...ink, fill: color, fillStyle: 'solid', strokeWidth: 1 },
                i ? `a2:${e.id}` : `a:${e.id}`,
                sk,
              ),
            )
            .join('') +
          `</g>`,
      );
      continue;
    }
    out.push(
      `<g${edgeTag(e)}>${routeTag(route.points)}<path d="${roundedPath(pts, 12)}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${dash}/>` +
        heads
          .map(
            (h) =>
              `<polygon points="${h.map((p) => p.join(',')).join(' ')}" fill="${color}" stroke="${color}" stroke-width="1" stroke-linejoin="round"/>`,
          )
          .join('') +
        `</g>`,
    );
  }

  for (const [ni, n] of model.nodes.entries()) {
    const b = lay.nodes.get(n.id)!;
    const hue = theme.hues[n.icon.hue] ?? theme.hues.slate!;
    const iconSize = NODE.icon;
    const iconH = n.map ? MAP_NODE.mapH : iconSize;
    const ix = r2(b.x + b.w / 2 - iconSize / 2);
    const iy = r2(b.y + 14);
    const paint = iconPaint(theme, hue);
    const body = n.icon.body.replace(/\{[AMLS]\}/g, (k) => paint[k as keyof typeof paint]);
    const iconMarkup = sk ? sketchIcon(body, `i:${n.id}`, sk, [paint['{L}'], hue.a]) : body;
    const labelY0 = b.y + 14 + iconH + NODE.labelGap + 12;
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
      `<g${opts.annotate ? ` class="sk-node" data-node="${esc(n.id)}"` : ''}><title>${esc(n.label)}</title>` +
        shell +
        (n.map
          ? mapMarkup(
              n.map,
              { x: b.x + 14, y: b.y + 14, w: b.w - 28, h: MAP_NODE.mapH },
              card.fill ?? hue.card,
              `n:${n.id}`,
            )
          : n.logo
            ? logoMarkup(n.logo, b.x + b.w / 2, iy, theme, `l:${n.id}`)
            : `<g transform="translate(${ix} ${iy}) scale(${r2(iconSize / 48)})">${iconMarkup}</g>`) +
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
  if (legend) out.push(legend.render(36, legendY, glyphs));
  const title = model.title ?? 'System design diagram';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}"${opts.annotate && model.type ? ` data-type="${model.type}"` : ''}>` +
    `<title>${esc(title)}</title><desc>${esc(desc)}</desc>` +
    `<defs>${defs.join('')}${glyphs.defs()}</defs>` +
    `<rect width="${W}" height="${H}" fill="${theme.bg}"/>` +
    (theme.backdrop ? `<rect width="${W}" height="${H}" fill="url(#sk-bg)"/>` : '') +
    out.join('') +
    `</svg>\n`
  );
}
