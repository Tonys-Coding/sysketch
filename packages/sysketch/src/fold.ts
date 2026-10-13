import type { Box, EdgeRoute, Layout, NodeBox, Pt } from './layout.js';

/**
 * Fold a long left-to-right layout into rows that still read left to right.
 *
 * The diagram is cut only in the empty channels between columns (never through a node or
 * group), each part is moved below the previous one, and every edge that crosses a cut is
 * joined by a connector that runs through the margins and the gap between rows, so it
 * never crosses a node. Routes inside a row are ELK's own.
 */

const LANE_X = 14; // spacing of vertical connector lanes in the side margins
const LANE_Y = 16; // spacing of horizontal lanes in the gap between rows
const LANE_PILL = 38; // horizontal lane spacing when the connector carries a pill
const GAP = 44; // empty space between rows (before lanes)
const PAD = 36;
/** Folding only pays off when few edges cross a cut; busy cuts become a band of long lines. */
const MAX_CROSSING = 2;
/** Rows must be similar: the shortest at least this share of the longest. */
const MIN_BALANCE = 0.4;

const r2 = (n: number) => Math.round(n * 100) / 100;

interface Span {
  a: number;
  b: number;
}

/** Columns = merged x-extents of nodes and groups; channels are the gaps between them. */
function columns(lay: Layout): Span[] {
  const spans = [...lay.nodes.values(), ...lay.groups.values()]
    .map((b) => ({ a: b.x, b: b.x + b.w }))
    .sort((p, q) => p.a - q.a);
  const out: Span[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s.a <= last.b + 1) last.b = Math.max(last.b, s.b);
    else out.push({ ...s });
  }
  return out;
}

/** Points where a route crosses x = c, with the direction of travel. */
function crossings(points: Pt[], c: number): { i: number; y: number; right: boolean }[] {
  const out: { i: number; y: number; right: boolean }[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const p = points[i]!;
    const q = points[i + 1]!;
    if ((p.x - c) * (q.x - c) < 0) {
      const t = (c - p.x) / (q.x - p.x);
      out.push({ i, y: p.y + t * (q.y - p.y), right: q.x > p.x });
    }
  }
  return out;
}

/** Pick k-1 cut positions (channel midpoints) near equal row widths, avoiding busy channels. */
function chooseCuts(lay: Layout, cols: Span[], k: number): number[] | undefined {
  if (cols.length < k * 2) return undefined;
  const x0 = cols[0]!.a;
  const x1 = cols[cols.length - 1]!.b;
  const channels = cols.slice(1).map((c, i) => {
    let mid = (cols[i]!.b + c.a) / 2;
    // stay clear of vertical edge segments that sit in the channel
    const verticals = [...lay.edges.values()].flatMap((e) =>
      e.points.slice(1).flatMap((q, j) => (e.points[j]!.x === q.x ? [q.x] : [])),
    );
    for (let tries = 0; tries < 8 && verticals.some((v) => Math.abs(v - mid) < 3); tries++) {
      mid += 4;
    }
    const busy = [...lay.edges.values()].filter((e) => crossings(e.points, mid).length).length;
    return { x: mid, index: i, busy };
  });
  const cuts: number[] = [];
  let from = 0;
  for (let j = 1; j < k; j++) {
    const ideal = x0 + ((x1 - x0) * j) / k;
    const options = channels.filter(
      (c) => c.index >= from && c.index <= cols.length - 2 - (k - 1 - j) && c.busy <= MAX_CROSSING,
    );
    if (!options.length) return undefined;
    const best = options.reduce((p, q) =>
      Math.abs(q.x - ideal) + q.busy * 60 < Math.abs(p.x - ideal) + p.busy * 60 ? q : p,
    );
    cuts.push(best.x);
    from = best.index + 1;
  }
  return cuts;
}

export function foldRows(lay: Layout, k: number): Layout | undefined {
  const cols = columns(lay);
  const cuts = chooseCuts(lay, cols, k);
  if (!cuts) return undefined;
  const partOf = (x: number) => cuts.filter((c) => c < x).length;
  const center = (b: Box) => b.x + b.w / 2;

  // Crossing edges per gap (gap j sits between row j-1 and row j), in order of their y.
  const gapEdges: string[][] = cuts.map(() => []);
  const gapPills: boolean[] = cuts.map(() => false);
  for (const [id, e] of lay.edges) {
    cuts.forEach((c, j) => {
      if (crossings(e.points, c).length) {
        gapEdges[j]!.push(id);
        if (e.pill) gapPills[j] = true;
      }
    });
  }
  cuts.forEach((c, j) =>
    gapEdges[j]!.sort(
      (a, b) =>
        crossings(lay.edges.get(a)!.points, c)[0]!.y - crossings(lay.edges.get(b)!.points, c)[0]!.y,
    ),
  );
  const lanes = Math.max(0, ...gapEdges.map((g) => g.length));

  // Content extents of each part (nodes, groups, pills of edges that stay inside it).
  const parts = Array.from({ length: k }, () => ({
    minX: Infinity,
    maxX: -Infinity,
    top: Infinity,
    bottom: -Infinity,
  }));
  const grow = (p: number, b: Box) => {
    const s = parts[p]!;
    s.minX = Math.min(s.minX, b.x);
    s.maxX = Math.max(s.maxX, b.x + b.w);
    s.top = Math.min(s.top, b.y);
    s.bottom = Math.max(s.bottom, b.y + b.h);
  };
  for (const b of lay.nodes.values()) grow(partOf(center(b)), b);
  for (const b of lay.groups.values()) grow(partOf(center(b)), b);
  for (const [id, e] of lay.edges) {
    if (e.pill && !gapEdges.some((g) => g.includes(id))) grow(partOf(center(e.pill)), e.pill);
    for (const p of e.points) {
      const s = parts[partOf(p.x)]!;
      s.minX = Math.min(s.minX, p.x);
      s.maxX = Math.max(s.maxX, p.x);
      s.top = Math.min(s.top, p.y);
      s.bottom = Math.max(s.bottom, p.y);
    }
  }
  if (parts.some((p) => p.minX === Infinity)) return undefined;
  // Lopsided folds (one node alone on a row) read worse than the wide original.
  const boxWidths = parts.map(() => ({ a: Infinity, b: -Infinity }));
  for (const bx of [...lay.nodes.values(), ...lay.groups.values()]) {
    const w = boxWidths[partOf(center(bx))]!;
    w.a = Math.min(w.a, bx.x);
    w.b = Math.max(w.b, bx.x + bx.w);
  }
  const widths = boxWidths.map((w) => w.b - w.a);
  if (Math.min(...widths) < MIN_BALANCE * Math.max(...widths)) return undefined;

  // Placement: rows left-aligned after a margin for the left connector lanes.
  const left = lanes * LANE_X + 20;
  const dx = parts.map((p) => left + parts[0]!.minX - p.minX);
  const dy: number[] = [];
  const laneBase: number[] = [];
  let y = parts[0]!.top;
  parts.forEach((p, i) => {
    if (i > 0) {
      const laneH = gapPills[i - 1] ? LANE_PILL : LANE_Y;
      laneBase.push(y + GAP / 2);
      y += GAP + gapEdges[i - 1]!.length * laneH;
    }
    dy.push(y - p.top);
    y += p.bottom - p.top;
  });
  const move = (p: number, b: Box): Box => ({ ...b, x: r2(b.x + dx[p]!), y: r2(b.y + dy[p]!) });

  const nodes = new Map<string, NodeBox>();
  for (const [id, b] of lay.nodes) nodes.set(id, { ...b, ...move(partOf(center(b)), b) });
  const groups = new Map<string, Box>();
  for (const [id, b] of lay.groups) groups.set(id, move(partOf(center(b)), b));

  const rightEdge = (p: number) => parts[p]!.maxX + dx[p]!;
  const edges = new Map<string, EdgeRoute>();
  for (const [id, e] of lay.edges) {
    const pts: Pt[] = [];
    let part = partOf(e.points[0]!.x);
    let pill: Box | undefined;
    const push = (q: Pt) => {
      const last = pts[pts.length - 1];
      if (!last || last.x !== q.x || last.y !== q.y) pts.push({ x: r2(q.x), y: r2(q.y) });
    };
    e.points.forEach((p, i) => {
      push({ x: p.x + dx[part]!, y: p.y + dy[part]! });
      const q = e.points[i + 1];
      if (!q) return;
      // every cut this segment crosses, in travel order
      const hits = cuts
        .map((c, j) => ({ c, j: j + 1, x: (c - p.x) / (q.x - p.x) }))
        .filter((h) => (p.x - h.c) * (q.x - h.c) < 0)
        .sort((a, b) => a.x - b.x);
      for (const h of hits) {
        const yAt = p.y + h.x * (q.y - p.y);
        const upper = h.j - 1; // row above the gap
        const lower = h.j;
        const lane = gapEdges[h.j - 1]!.indexOf(id);
        const laneH = gapPills[h.j - 1] ? LANE_PILL : LANE_Y;
        const ly = laneBase[h.j - 1]! + lane * laneH + laneH / 2;
        const a = { x: h.c + dx[upper]!, y: yAt + dy[upper]! };
        const b = { x: h.c + dx[lower]!, y: yAt + dy[lower]! };
        const xr = Math.max(a.x, rightEdge(upper) + 10) + lane * LANE_X;
        const xl = left + parts[0]!.minX - 12 - lane * LANE_X;
        // Enter the lower row from the left margin. The crossing point is dropped when it
        // lies further left (cut in a wide channel), so the connector stays on the canvas.
        const path = [a, { x: xr, y: a.y }, { x: xr, y: ly }, { x: xl, y: ly }, { x: xl, y: b.y }];
        if (b.x > xl) path.push(b);
        const forward = q.x > p.x;
        for (const s of forward ? path : path.reverse()) push(s);
        if (e.pill && !pill) {
          pill = { ...e.pill, x: r2((xr + xl) / 2 - e.pill.w / 2), y: r2(ly - e.pill.h / 2) };
        }
        part = forward ? lower : upper;
      }
    });
    const route: EdgeRoute = { points: pts };
    if (e.pill) route.pill = pill ?? move(partOf(center(e.pill)), e.pill);
    edges.set(id, route);
  }

  const width = Math.ceil(
    Math.max(
      ...parts.map((_, p) => rightEdge(p)),
      ...[...edges.values()].flatMap((e) => e.points.map((q) => q.x)),
    ) + PAD,
  );
  const height = Math.ceil(y + PAD);
  return { ...lay, width, height, nodes, groups, edges };
}
