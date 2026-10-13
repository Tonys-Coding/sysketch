import type { EdgeModel, Model } from './model.js';
import { sketch } from './sketch.js';
import { measure, type GlyphSheet, type FontRef } from './text.js';
import type { Theme } from './themes.js';

/** A numbered "Steps" panel listing every edge, drawn under the diagram. */
export interface LegendBlock {
  width: number;
  height: number;
  render(x: number, y: number, glyphs: GlyphSheet): string;
}

const ROW = 30;
const PAD = 20;
const HEAD = 38;
const BADGE_R = 11;
const COL_GAP = 44;
const ARROW_W = 26;
const TEXT = 14;
const NOTE = 13;

type Segment = { text: string; font: FontRef; size: number; fill: string } | { arrow: true };

const r2 = (n: number) => Math.round(n * 100) / 100;

function segWidth(s: Segment): number {
  return 'arrow' in s ? ARROW_W : measure(s.text, s.size, s.font);
}

export function legendBlock(
  model: Model,
  theme: Theme,
  maxWidth: number,
  colorOf: (e: EdgeModel) => { line: string; badge: string; badgeText: string },
): LegendBlock | undefined {
  if (!model.legend || model.edges.length === 0) return undefined;
  const nameOf = (id: string) => model.nodes.find((n) => n.id === id)?.label ?? id;
  const muted = theme.group.label;

  const edges = model.edges
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.step ?? a.i + 1) - (b.e.step ?? b.i + 1) || a.i - b.i)
    .map(({ e }) => e);

  const rows = edges.map((e) => {
    const segs: Segment[] = e.note
      ? [{ text: e.note, font: theme.fonts.label, size: TEXT, fill: theme.text }]
      : [
          { text: nameOf(e.from), font: theme.fonts.label, size: TEXT, fill: theme.text },
          { arrow: true },
          { text: nameOf(e.to), font: theme.fonts.label, size: TEXT, fill: theme.text },
          ...(e.label
            ? [{ text: `  ·  ${e.label}`, font: theme.fonts.edge, size: NOTE, fill: muted }]
            : []),
        ];
    const width = BADGE_R * 2 + 12 + segs.reduce((w, s) => w + segWidth(s), 0);
    return { e, segs, width };
  });

  const colW = Math.ceil(Math.max(...rows.map((r) => r.width)));
  const twoCols = rows.length > 5 && PAD * 2 + colW * 2 + COL_GAP <= maxWidth;
  const cols = twoCols ? 2 : 1;
  const perCol = Math.ceil(rows.length / cols);
  const width = PAD * 2 + colW * cols + COL_GAP * (cols - 1);
  const height = HEAD + perCol * ROW + PAD - 8;
  const sk = theme.sketch;

  return {
    width,
    height,
    render(x, y, glyphs) {
      const out: string[] = [];
      out.push(
        sk
          ? sketch.rect(
              x,
              y,
              width,
              height,
              theme.card.radius + 4,
              {
                fill: theme.group.fill,
                fillStyle: 'solid',
                stroke: theme.group.stroke,
                strokeWidth: 1.75,
              },
              'legend',
              sk,
            )
          : `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${theme.card.radius + 4}" fill="${theme.group.fill}" stroke="${theme.group.stroke}" stroke-width="1.75"/>`,
      );
      const head = theme.group.uppercase ? 'STEPS' : 'Steps';
      out.push(
        glyphs.draw(
          head,
          x + PAD,
          y + 26,
          theme.group.uppercase ? 13 : 16,
          theme.fonts.group,
          muted,
        ),
      );
      rows.forEach((row, i) => {
        const col = Math.floor(i / perCol);
        const rx = x + PAD + col * (colW + COL_GAP);
        const cy = y + HEAD + (i % perCol) * ROW + ROW / 2 - 4;
        const paint = colorOf(row.e);
        const num = row.e.step === undefined ? '•' : String(row.e.step);
        out.push(
          sk
            ? sketch.circle(
                r2(rx + BADGE_R),
                r2(cy),
                BADGE_R,
                { fill: paint.badge, fillStyle: 'solid', stroke: theme.edge, strokeWidth: 1.5 },
                `lb:${row.e.id}`,
                sk,
              )
            : `<circle cx="${r2(rx + BADGE_R)}" cy="${r2(cy)}" r="${BADGE_R}" fill="${paint.badge}"/>`,
          glyphs.draw(
            num,
            rx + BADGE_R,
            r2(cy + 4.4),
            12,
            theme.fonts.badge,
            paint.badgeText,
            'middle',
          ),
        );
        let tx = rx + BADGE_R * 2 + 12;
        for (const seg of row.segs) {
          if ('arrow' in seg) {
            const ay = r2(cy);
            const dash = row.e.dashed ? ' stroke-dasharray="4 3"' : '';
            out.push(
              `<path d="M${r2(tx + 5)} ${ay}H${r2(tx + ARROW_W - 9)}" stroke="${paint.line}" stroke-width="2" stroke-linecap="round"${dash}/>` +
                `<path d="M${r2(tx + ARROW_W - 10)} ${r2(ay - 4)}L${r2(tx + ARROW_W - 4)} ${ay}L${r2(tx + ARROW_W - 10)} ${r2(ay + 4)}Z" fill="${paint.line}"/>`,
            );
          } else {
            out.push(glyphs.draw(seg.text, r2(tx), r2(cy + 5), seg.size, seg.font, seg.fill));
          }
          tx += segWidth(seg);
        }
      });
      return `<g>${out.join('')}</g>`;
    },
  };
}
