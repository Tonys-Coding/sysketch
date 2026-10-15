import type { Box, EdgeRoute, GroupBox, Layout, NodeBox, Pt } from './layout.js';

/**
 * Fold a long left-to-right layout into rows that still read left to right.
 *
 * The diagram is cut only in the empty channels between columns (never through a node or
 * group), each part is moved below the previous one, and every edge that crosses a cut is
 * joined by a connector through the gap between rows. Where nothing in the row is in the
 * way, the connector drops straight from the bottom of the node above to the top of the node
 * below; otherwise it runs through the side margins, so it never crosses a node. Routes
 * inside a row are ELK's own.
 */

const LANE_X = 14; // spacing of vertical connector lanes in the side margins
const LANE_Y = 16; // spacing of horizontal lanes in the gap between rows
const LANE_PILL = 38; // horizontal lane spacing when the connector carries a pill
const GAP = 44; // empty space between rows (before lanes)
const PAD = 36;
/** Folding only pays off when few edges cross a cut; busy cuts become a band of long lines. */
const MAX_CROSSING = 4;
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
  if (cols.length < k) return undefined;
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

  // Straight connectors for edges that cross one cut, per side when that side is clear.
  const straight = straightPorts(lay, cuts, partOf, parts, gapEdges);
  const marginUsers = (side: 'up' | 'down') =>
    gapEdges.map((g) => g.filter((id) => straight.get(id)?.[side] === undefined));
  const rightUsers = marginUsers('up');
  const leftUsers = marginUsers('down');

  // Placement: rows left-aligned after a margin for the left connector lanes.
  const left = Math.max(0, ...leftUsers.map((g) => g.length)) * LANE_X + 20;
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
  const groups = new Map<string, GroupBox>();
  for (const [id, b] of lay.groups) groups.set(id, { ...b, ...move(partOf(center(b)), b) });

  const rightEdge = (p: number) => parts[p]!.maxX + dx[p]!;
  const edges = new Map<string, EdgeRoute>();

  /** Route of an edge with at least one straight side; each side is written node -> lane. */
  const straightRoute = (id: string, e: EdgeRoute, plan: Straight): EdgeRoute => {
    const c = plan.cut;
    const [up, lo] = [c, c + 1];
    const ly = laneY(c, id);
    const h = crossings(e.points, cuts[c]!)[0]!;
    const at = (p: number) => (q: Pt) => ({ x: q.x + dx[p]!, y: q.y + dy[p]! });
    const a = at(up)({ x: cuts[c]!, y: h.y });
    const b = at(lo)({ x: cuts[c]!, y: h.y });
    const head = e.points.slice(0, h.i + 1);
    const tail = e.points.slice(h.i + 1).reverse();
    let upperSide: Pt[];
    if (plan.up !== undefined) {
      const box = move(up, plan.upper);
      const x = plan.up + dx[up]!;
      upperSide = [
        { x, y: box.y + box.h },
        { x, y: ly },
      ];
    } else {
      const xr = xRight(c, id, a.x);
      upperSide = [
        ...(plan.forward ? head : tail).map(at(up)),
        a,
        { x: xr, y: a.y },
        { x: xr, y: ly },
      ];
    }
    let lowerSide: Pt[];
    if (plan.down !== undefined) {
      const box = move(lo, plan.lower);
      const x = plan.down + dx[lo]!;
      lowerSide = [
        { x, y: box.y },
        { x, y: ly },
      ];
    } else {
      const xl = xLeft(c, id);
      lowerSide = [...(plan.forward ? tail : head).map(at(lo)), ...(b.x > xl ? [b] : [])];
      lowerSide.push({ x: xl, y: b.y }, { x: xl, y: ly });
    }
    // x where each side meets the lane; the pill sits midway between them
    const ux = upperSide[upperSide.length - 1]!.x;
    const lx = lowerSide[lowerSide.length - 1]!.x;
    const route = plan.forward
      ? [...upperSide, ...[...lowerSide].reverse()]
      : [...lowerSide, ...[...upperSide].reverse()];
    const pts: Pt[] = [];
    for (const q of route) {
      const last = pts[pts.length - 1];
      if (!last || last.x !== q.x || last.y !== q.y) pts.push({ x: r2(q.x), y: r2(q.y) });
    }
    const out: EdgeRoute = { points: pts };
    if (e.pill) {
      // Midway along the lane, but right of the left-margin lines (which run down past this
      // lane to the row below) and never off the canvas.
      const margin = leftUsers[c]!.length ? left + parts[0]!.minX - 2 : PAD / 2;
      const x = Math.max(margin, (ux + lx) / 2 - e.pill.w / 2);
      out.pill = { ...e.pill, x: r2(x), y: r2(ly - e.pill.h / 2) };
    }
    return out;
  };
  const laneY = (c: number, id: string) => {
    const laneH = gapPills[c] ? LANE_PILL : LANE_Y;
    return laneBase[c]! + gapEdges[c]!.indexOf(id) * laneH + laneH / 2;
  };
  const xRight = (c: number, id: string, ax: number) =>
    Math.max(ax, rightEdge(c) + 10) + rightUsers[c]!.indexOf(id) * LANE_X;
  const xLeft = (c: number, id: string) =>
    left + parts[0]!.minX - 12 - leftUsers[c]!.indexOf(id) * LANE_X;

  for (const [id, e] of lay.edges) {
    const plan = straight.get(id);
    if (plan && (plan.up !== undefined || plan.down !== undefined)) {
      edges.set(id, straightRoute(id, e, plan));
      continue;
    }
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
        const ly = laneY(upper, id);
        const a = { x: h.c + dx[upper]!, y: yAt + dy[upper]! };
        const b = { x: h.c + dx[lower]!, y: yAt + dy[lower]! };
        const xr = xRight(upper, id, a.x);
        const xl = xLeft(upper, id);
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
      ...[...edges.values()].flatMap((e) => (e.pill ? [e.pill.x + e.pill.w - PAD / 2] : [])),
    ) + PAD,
  );
  const height = Math.ceil(y + PAD);
  return { ...lay, width, height, nodes, groups, edges };
}

interface Straight {
  /** index of the cut the edge crosses (upper row = cut, lower row = cut + 1) */
  cut: number;
  /** the edge travels from the upper row to the lower one */
  forward: boolean;
  upper: NodeBox;
  lower: NodeBox;
  /** x of the port on the upper node's bottom, when the way down is clear */
  up?: number;
  /** x of the port on the lower node's top, when the way up is clear */
  down?: number;
}

/**
 * For each edge that crosses exactly one cut, find ports on the bottom of its node in the
 * upper row and the top of its node in the lower row whose vertical path to the gap between
 * rows meets no other node, group, group title, pill or parallel edge.
 */
function straightPorts(
  lay: Layout,
  cuts: number[],
  partOf: (x: number) => number,
  parts: { minX: number; top: number; bottom: number }[],
  gapEdges: string[][],
): Map<string, Straight> {
  const center = (b: Box) => b.x + b.w / 2;
  const boxes = [...lay.nodes.values()];
  const nodeAt = (p: Pt) =>
    boxes.find(
      (b) => p.x >= b.x - 2 && p.x <= b.x + b.w + 2 && p.y >= b.y - 2 && p.y <= b.y + b.h + 2,
    );
  const plans = new Map<string, Straight>();
  for (const [id, e] of lay.edges) {
    const hits = cuts.flatMap((c, cut) => crossings(e.points, c).map((h) => ({ ...h, cut })));
    if (hits.length !== 1) continue;
    const h = hits[0]!;
    const from = nodeAt(e.points[0]!);
    const to = nodeAt(e.points[e.points.length - 1]!);
    if (!from || !to) continue;
    const [upper, lower] = h.right ? [from, to] : [to, from];
    if (partOf(center(upper)) !== h.cut || partOf(center(lower)) !== h.cut + 1) continue;
    plans.set(id, { cut: h.cut, forward: h.right, upper, lower });
  }

  const rerouted = new Set(gapEdges.flat());
  const clear = (part: number, x: number, y1: number, y2: number, own: NodeBox) => {
    const blocks = (b: Box, m: number) =>
      x > b.x - m && x < b.x + b.w + m && b.y < y2 && b.y + b.h > y1;
    if (boxes.some((b) => b !== own && partOf(center(b)) === part && blocks(b, 10))) return false;
    for (const g of lay.groups.values()) {
      if (partOf(center(g)) !== part) continue;
      const inside =
        own.x >= g.x && own.x + own.w <= g.x + g.w && own.y >= g.y && own.y + own.h <= g.y + g.h;
      const title = { x: g.x, y: g.y, w: (g.labelW ?? g.w) + 14, h: 44 };
      if (inside ? blocks(title, 0) : blocks(g, 6)) return false;
    }
    for (const [id, e] of lay.edges) {
      if (rerouted.has(id)) continue;
      if (e.pill && blocks(e.pill, 6)) return false;
      for (let i = 0; i + 1 < e.points.length; i++) {
        const [p, q] = [e.points[i]!, e.points[i + 1]!];
        const vertical = p.x === q.x && Math.abs(p.x - x) < 8;
        if (vertical && Math.min(p.y, q.y) < y2 && Math.max(p.y, q.y) > y1) return false;
      }
    }
    return true;
  };

  // Ports on one side of a node are spread evenly, ordered by where the other end sits.
  const sides = new Map<string, { box: NodeBox; side: 'up' | 'down'; ids: string[] }>();
  for (const [id, plan] of plans) {
    for (const side of ['up', 'down'] as const) {
      const box = side === 'up' ? plan.upper : plan.lower;
      const key = `${side}:${box.x}:${box.y}`;
      if (!sides.has(key)) sides.set(key, { box, side, ids: [] });
      sides.get(key)!.ids.push(id);
    }
  }
  const rowX = (b: Box) => center(b) - parts[partOf(center(b))]!.minX;
  for (const { box, side, ids } of sides.values()) {
    const other = (id: string) => (side === 'up' ? plans.get(id)!.lower : plans.get(id)!.upper);
    const part = partOf(center(box));
    const lane = (id: string) => gapEdges[plans.get(id)!.cut]!.indexOf(id);
    ids.sort((a, b) => {
      const d = rowX(other(a)) - rowX(other(b));
      if (Math.abs(d) > 40) return d;
      // Same column: the edge on the nearer lane takes the port on the side it turns
      // toward, so the other edge's vertical doesn't cross its lane.
      const left = rowX(other(a)) < rowX(box);
      return (lane(a) - lane(b)) * (left ? 1 : -1);
    });
    const taken: number[] = [];
    ids.forEach((id, i) => {
      const [y1, y2] =
        side === 'up' ? [box.y + box.h, parts[part]!.bottom] : [parts[part]!.top, box.y];
      // the evenly spread port, else the nearest clear spot on that side (e.g. beside a
      // group title)
      const want = box.x + (box.w * (i + 1)) / (ids.length + 1);
      const spots: number[] = [];
      for (let x = box.x + 18; x <= box.x + box.w - 18; x += 6) spots.push(x);
      spots.sort((a, b) => Math.abs(a - want) - Math.abs(b - want));
      const x = [want, ...spots].find(
        (x) => taken.every((t) => Math.abs(t - x) >= 14) && clear(part, x, y1, y2, box),
      );
      if (x !== undefined) {
        taken.push(x);
        plans.get(id)![side] = r2(x);
      }
    });
  }
  return plans;
}
