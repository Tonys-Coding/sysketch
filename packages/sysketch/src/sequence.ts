import {
  nodeBox,
  pillSize,
  type EdgeRoute,
  type GroupBox,
  type Layout,
  type NodeBox,
} from './layout.js';
import type { GroupModel, Model } from './model.js';
import { measure } from './text.js';
import type { Theme } from './themes.js';

/**
 * Sequence diagram layout (`type: sequence`): participants in a row across the top, a dashed
 * lifeline down from each, and one row per message, top to bottom in spec order. Columns
 * widen until every message label fits between its two lifelines. Groups become boxes around
 * their participants' columns (members are kept next to each other; groups may nest).
 */

const PAD = 36;
/** Space between participant cards. */
const COL_GAP = 64;
/** Vertical space per message, and the extra for a message to itself. */
const ROW = 56;
const SELF_H = 30;
/** Self-messages loop this far to the right of the lifeline. */
const SELF_W = 44;
const FIRST = 52;
const TAIL = 40;
/** Group boxes: header height per level, and side margin per level. */
const GROUP_HEAD = 40;
const GROUP_SIDE = 18;
const GROUP_LEVEL = 14;
/** Line left visible at each end of a message beside its label. */
const ARROW_ROOM = 14;

export function layoutSequence(model: Model, theme: Theme): Layout {
  const rank = new Map<string, number>();
  for (const e of model.edges)
    for (const id of [e.from, e.to]) if (!rank.has(id)) rank.set(id, rank.size);
  for (const n of model.nodes) if (!rank.has(n.id)) rank.set(n.id, rank.size);

  // Column order: first appearance, with each group's members kept together.
  const byId = new Map(model.groups.map((g) => [g.id, g]));
  const groupOf = new Map<string, GroupModel>();
  for (const g of model.groups) for (const n of g.nodes) groupOf.set(n, g);
  const minRank = (g: GroupModel): number =>
    Math.min(
      ...g.nodes.map((n) => rank.get(n) ?? Infinity),
      ...g.groups.map((c) => minRank(byId.get(c)!)),
    );
  const order: string[] = [];
  const emit = (g: GroupModel) => {
    const items = [
      ...g.nodes.map((n) => ({ r: rank.get(n) ?? Infinity, node: n })),
      ...g.groups.map((c) => ({ r: minRank(byId.get(c)!), group: byId.get(c)! })),
    ].sort((a, b) => a.r - b.r);
    for (const it of items) {
      if ('node' in it) order.push(it.node);
      else emit(it.group);
    }
  };
  const top = (g: GroupModel): GroupModel => (g.parent ? top(byId.get(g.parent)!) : g);
  const placed = new Set<GroupModel>();
  for (const id of [...rank.keys()].sort((a, b) => rank.get(a)! - rank.get(b)!)) {
    if (order.includes(id)) continue;
    const g = groupOf.get(id);
    if (!g) order.push(id);
    else if (!placed.has(top(g))) {
      placed.add(top(g));
      emit(top(g));
    }
  }
  const col = new Map(order.map((id, i) => [id, i]));

  // Nesting depth below each group (for margins) and the deepest level overall.
  const below = (g: GroupModel): number =>
    g.groups.length ? 1 + Math.max(...g.groups.map((c) => below(byId.get(c)!))) : 0;
  const levels = model.groups.length
    ? 1 + Math.max(...model.groups.filter((g) => !g.parent).map(below))
    : 0;
  const side = (g: GroupModel) => GROUP_SIDE + below(g) * GROUP_LEVEL;

  const boxes = order.map((id) =>
    nodeBox(
      model.nodes.find((n) => n.id === id)!,
      theme,
    ),
  );
  // Centre-to-centre distance between neighbouring columns.
  const gap = boxes.slice(1).map((b, i) => {
    let d = boxes[i]!.w / 2 + b.w / 2 + COL_GAP;
    // room for the group borders that run between the two columns
    const ga = groupOf.get(order[i]!);
    const gb = groupOf.get(order[i + 1]!);
    if (ga !== gb) d += (ga ? side(ga) : 0) + (gb ? side(gb) : 0);
    return d;
  });
  let rightOverhang = 0;
  const pills = model.edges.map((e) => pillSize(e.label, e.step, theme.fonts.edge));
  const needs = model.edges
    .map((e, i) => ({ a: col.get(e.from)!, b: col.get(e.to)!, pill: pills[i] }))
    .sort((p, q) => Math.abs(p.b - p.a) - Math.abs(q.b - q.a));
  for (const { a, b, pill } of needs) {
    if (a === b) {
      // a message to itself loops out to the right, with its label beside the loop
      const want = SELF_W + 10 + (pill?.w ?? 0) + 24;
      if (a < gap.length) gap[a] = Math.max(gap[a]!, want + boxes[a + 1]!.w / 2 + 12);
      else rightOverhang = Math.max(rightOverhang, want - boxes[a]!.w / 2);
      continue;
    }
    const [lo, hi] = a < b ? [a, b] : [b, a];
    const want = (pill?.w ?? 0) + ARROW_ROOM * 2 + 40;
    const have = gap.slice(lo, hi).reduce((s, d) => s + d, 0);
    if (have < want) for (let k = lo; k < hi; k++) gap[k]! += (want - have) / (hi - lo);
  }

  const titleH = model.title ? 92 : 36;
  const top0 = titleH + (levels ? GROUP_HEAD * levels + 8 : 0);
  // groups around the first column need room on the left
  const leftMargin =
    PAD +
    Math.max(
      0,
      ...model.groups.filter((g) => groupNodesOf(g).some((m) => col.get(m) === 0)).map(side),
    );
  const xs: number[] = [];
  boxes.forEach((b, i) => xs.push(i ? xs[i - 1]! + gap[i - 1]! : leftMargin + b.w / 2));

  const nodes = new Map<string, NodeBox>();
  const headH = Math.max(...boxes.map((b) => b.h));
  boxes.forEach((b, i) => nodes.set(order[i]!, { ...b, x: r2(xs[i]! - b.w / 2), y: top0 }));

  const edges = new Map<string, EdgeRoute>();
  let y = top0 + headH + FIRST;
  model.edges.forEach((e, i) => {
    const xa = xs[col.get(e.from)!]!;
    const xb = xs[col.get(e.to)!]!;
    const pill = pills[i];
    if (e.from === e.to) {
      const route: EdgeRoute = {
        points: [
          { x: xa, y },
          { x: xa + SELF_W, y },
          { x: xa + SELF_W, y: y + SELF_H },
          { x: xa, y: y + SELF_H },
        ],
      };
      if (pill)
        route.pill = { ...pill, x: r2(xa + SELF_W + 10), y: r2(y + SELF_H / 2 - pill.h / 2) };
      edges.set(e.id, route);
      y += SELF_H + ROW;
      return;
    }
    const route: EdgeRoute = {
      points: [
        { x: xa, y },
        { x: xb, y },
      ],
    };
    if (pill) route.pill = { ...pill, x: r2((xa + xb) / 2 - pill.w / 2), y: r2(y - pill.h / 2) };
    edges.set(e.id, route);
    y += ROW;
  });
  const lifeEnd = y - ROW + TAIL;
  const lifelines = order.map((id, i) => ({
    x: xs[i]!,
    y1: top0 + nodes.get(id)!.h,
    y2: lifeEnd,
  }));

  const groups = new Map<string, GroupBox>();
  const upper = theme.group.uppercase;
  for (const g of model.groups) {
    const members = groupNodesOf(g);
    if (!members.length) continue;
    const cols = members.map((m) => col.get(m)!);
    const first = Math.min(...cols);
    const last = Math.max(...cols);
    const s = side(g);
    const x = xs[first]! - boxes[first]!.w / 2 - s;
    const right = xs[last]! + boxes[last]!.w / 2 + s;
    const depthIn = (gg: GroupModel): number => (gg.parent ? 1 + depthIn(byId.get(gg.parent)!) : 0);
    const gy = titleH + depthIn(g) * GROUP_HEAD;
    groups.set(g.id, {
      x: r2(x),
      y: r2(gy),
      w: r2(right - x),
      h: r2(lifeEnd + 16 + below(g) * GROUP_LEVEL - gy),
      labelW: Math.ceil(
        20 + measure(upper ? g.label.toUpperCase() : g.label, upper ? 13 : 16, theme.fonts.group),
      ),
    });
  }

  const extents = [
    ...[...nodes.values()].map((b) => b.x + b.w),
    ...[...groups.values()].map((b) => b.x + b.w),
    ...[...edges.values()].flatMap((r) => (r.pill ? [r.pill.x + r.pill.w] : [])),
    xs[xs.length - 1]! + rightOverhang,
  ];
  const bottom = Math.max(lifeEnd, ...[...groups.values()].map((b) => b.y + b.h));
  return {
    width: Math.ceil(Math.max(...extents) + PAD),
    height: Math.ceil(bottom + PAD),
    titleY: 52,
    nodes,
    groups,
    edges,
    lifelines,
  };

  function groupNodesOf(g: GroupModel): string[] {
    return [...g.nodes, ...g.groups.flatMap((c) => groupNodesOf(byId.get(c)!))];
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100;
