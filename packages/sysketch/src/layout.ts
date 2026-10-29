import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs/lib/elk-api.js';
import { groupNodes, type GroupModel, type Model } from './model.js';
import type { Theme } from './themes.js';
import { foldRows } from './fold.js';
import { layoutSequence } from './sequence.js';
import { measure, wrap, type FontRef } from './text.js';

export interface Pt {
  x: number;
  y: number;
}
export interface Box extends Pt {
  w: number;
  h: number;
}
export interface GroupBox extends Box {
  /** width of the group's title from the group's left edge (folded connectors avoid it) */
  labelW?: number;
}
export interface NodeBox extends Box {
  lines: string[];
  /** wrapped subtitle lines (empty when the node has no subtitle) */
  subLines: string[];
}
export interface EdgeRoute {
  points: Pt[];
  /** centre-anchored box reserved for the step badge / label pill */
  pill?: Box;
}
export interface Layout {
  width: number;
  height: number;
  titleY: number;
  nodes: Map<string, NodeBox>;
  groups: Map<string, GroupBox>;
  edges: Map<string, EdgeRoute>;
  /** sequence diagrams: dashed lines down from each participant */
  lifelines?: { x: number; y1: number; y2: number }[];
}

export const NODE = {
  minW: 132,
  h: 112,
  icon: 56,
  labelSize: 16,
  labelGap: 10,
  maxLabelW: 150,
} as const;
/** A map node is a wide card with a big map where the icon would be. */
export const MAP_NODE = { minW: 340, mapH: 130 } as const;
export const PILL = { h: 28, badge: 26, labelSize: 13 } as const;
export const SUB = { size: 12, line: 16, maxW: 170 } as const;
/** Extra room reserved on each side of a pill so the arrow stays visible around it. */
const PILL_GAP = 12;

export function pillSize(
  label: string | undefined,
  step: number | undefined,
  font: FontRef,
): { w: number; h: number } | undefined {
  if (!label && step === undefined) return undefined;
  if (!label) return { w: PILL.badge, h: PILL.badge };
  const tw = measure(label, PILL.labelSize, font);
  return { w: Math.ceil(tw + 22 + (step === undefined ? 0 : PILL.badge - 4)), h: PILL.h };
}

/** Card size and wrapped text for a node, at the origin. */
export function nodeBox(n: Model['nodes'][number], theme: Theme): NodeBox {
  const lines = wrap(n.label, NODE.labelSize, theme.fonts.label, NODE.maxLabelW);
  const subLines = n.sub ? wrap(n.sub, SUB.size, theme.fonts.edge, SUB.maxW) : [];
  const textW = Math.max(
    ...lines.map((l) => measure(l, NODE.labelSize, theme.fonts.label)),
    ...subLines.map((l) => measure(l, SUB.size, theme.fonts.edge)),
  );
  const w = Math.max(n.map ? MAP_NODE.minW : NODE.minW, Math.ceil(textW + 36));
  const h =
    NODE.h +
    (n.map ? MAP_NODE.mapH - NODE.icon : 0) +
    (lines.length - 1) * 19 +
    (subLines.length ? subLines.length * SUB.line + 2 : 0);
  return { x: 0, y: 0, w, h, lines, subLines };
}

const elk = new ELK();
const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Split a diagram into independent parts: nodes are connected if an edge joins
 * them or they share a group. Parts keep the order their first node appears in.
 */
function components(model: Model): Model[] {
  const parent = new Map(model.nodes.map((n) => [n.id, n.id]));
  const find = (x: string): string => {
    while (parent.get(x) !== x) x = parent.get(x)!;
    return x;
  };
  const join = (a: string, b: string) => parent.set(find(a), find(b));
  for (const e of model.edges) join(e.from, e.to);
  for (const g of model.groups) {
    const all = groupNodes(model, g);
    for (const m of all.slice(1)) join(all[0]!, m);
  }

  const parts = new Map<string, Set<string>>();
  for (const n of model.nodes) {
    const root = find(n.id);
    if (!parts.has(root)) parts.set(root, new Set());
    parts.get(root)!.add(n.id);
  }
  return [...parts.values()].map((ids) => ({
    direction: model.direction,
    nodes: model.nodes.filter((n) => ids.has(n.id)),
    groups: model.groups.filter((g) => ids.has(groupNodes(model, g)[0] ?? '')),
    edges: model.edges.filter((e) => ids.has(e.from)),
  }));
}

function shift(lay: Layout, dx: number, dy: number, into: Layout): void {
  for (const [id, b] of lay.nodes) into.nodes.set(id, { ...b, x: r2(b.x + dx), y: r2(b.y + dy) });
  for (const [id, b] of lay.groups) into.groups.set(id, { ...b, x: r2(b.x + dx), y: r2(b.y + dy) });
  for (const [id, e] of lay.edges) {
    const route: EdgeRoute = {
      points: e.points.map((p) => ({ x: r2(p.x + dx), y: r2(p.y + dy) })),
    };
    if (e.pill) route.pill = { ...e.pill, x: r2(e.pill.x + dx), y: r2(e.pill.y + dy) };
    into.edges.set(id, route);
  }
}

/**
 * Lay out each independent part on its own and stack them (below each other for
 * left-to-right diagrams, side by side for top-down ones). Laying them out together
 * makes ELK share columns between unrelated flows, which leaves large empty gaps.
 */
export async function layout(model: Model, theme: Theme): Promise<Layout> {
  if (model.type === 'sequence') return layoutSequence(model, theme);
  const first = await layoutParts(model, theme);
  if (first.width / first.height <= WIDE) return first;
  // Too wide to read when scaled to a page. Candidates: the flow folded into rows (still
  // left to right), and top-down when the spec didn't choose a direction. ELK's own row
  // wrapping was tried and rejected: its wrap-around edges cross the whole diagram.
  const shape = (l: Layout) => Math.abs(Math.log(l.width / l.height / TARGET_ASPECT));
  let best = first;
  if (
    model.direction === 'right' &&
    first.width > FOLD_MIN_WIDTH &&
    components(model).length === 1
  ) {
    for (const k of [2, 3, 4]) {
      const folded = foldRows(first, k);
      if (folded && shape(folded) < shape(best)) best = folded;
    }
  }
  if (model.autoDirection) {
    const down = await layoutParts({ ...model, direction: 'down' }, theme);
    if (shape(down) < shape(best)) {
      model.direction = 'down';
      return down;
    }
  }
  return best;
}

/** Wider than this (width / height) and an auto-direction diagram also tries top-down. */
const WIDE = 2.4;
/** Diagrams narrower than this already fit a page; folding them only adds connectors. */
const FOLD_MIN_WIDTH = 1800;
/** The shape that reads best on a page or slide. */
const TARGET_ASPECT = 1.6;

export async function layoutParts(model: Model, theme: Theme): Promise<Layout> {
  const topPad = model.title ? 92 : 36;
  const parts = components(model);
  if (parts.length < 2) return layoutOnce(model, theme, topPad);

  const down = model.direction === 'down';
  const merged: Layout = {
    width: 0,
    height: 0,
    titleY: 52,
    nodes: new Map(),
    groups: new Map(),
    edges: new Map(),
  };
  let offset = 0;
  for (const [i, part] of parts.entries()) {
    const lay = await layoutOnce(part, theme, i === 0 || down ? topPad : 4);
    shift(lay, down ? offset : 0, down ? 0 : offset, merged);
    offset += down ? lay.width : lay.height;
    merged.width = down ? offset : Math.max(merged.width, lay.width);
    merged.height = down ? Math.max(merged.height, lay.height) : offset;
  }
  return merged;
}

/** Icons of nodes where requests come from: users and the apps they use. */
const ENTRY_ICONS = new Set(['user', 'mobile', 'browser', 'desktop']);

/**
 * Edges that point back against the flow, i.e. that close a cycle. Solid edges are walked
 * first in spec order (depth-first) and the ones that close a cycle are marked; then each
 * dashed edge (responses, callbacks, async consumers) is marked only if it would close a
 * cycle. Laying marked edges out reversed keeps the flow reading in spec order, so
 * `api ..> client` loops back while `kafka ..> ledger` still points forward.
 */
export function feedbackEdges(model: Model, rank: Map<string, number>): Set<string> {
  const back = new Set<string>();
  const out = new Map<string, string[]>();
  const add = (from: string, to: string) => out.set(from, [...(out.get(from) ?? []), to]);
  // People and apps start the flow even when the spec lists them late (models often begin
  // with the gateway and add "rider > gateway" at the end): an arrow into one of them from
  // elsewhere is a reply or notification, as long as it also sends requests.
  const senders = new Set(model.edges.map((e) => e.from));
  const entry = new Set(
    model.nodes
      .filter((n) => !n.logo && ENTRY_ICONS.has(n.icon.name) && senders.has(n.id))
      .map((n) => n.id),
  );
  for (const e of model.edges) if (entry.has(e.to) && !entry.has(e.from)) back.add(e.id);
  const solid = model.edges.filter((e) => !e.dashed && !back.has(e.id));
  const next = new Map<string, typeof solid>();
  for (const e of solid) next.set(e.from, [...(next.get(e.from) ?? []), e]);

  const state = new Map<string, 'open' | 'done'>();
  const visit = (id: string) => {
    state.set(id, 'open');
    for (const e of next.get(id) ?? []) {
      const s = state.get(e.to);
      if (s === 'open') back.add(e.id);
      else if (!s) visit(e.to);
    }
    state.set(id, 'done');
  };
  const order = (id: string) => (entry.has(id) ? -1e6 : 0) + rank.get(id)!;
  for (const id of [...rank.keys()].sort((a, b) => order(a) - order(b))) {
    if (!state.has(id)) visit(id);
  }
  for (const e of solid) if (!back.has(e.id)) add(e.from, e.to);

  const reaches = (from: string, to: string): boolean => {
    const seen = new Set([from]);
    const stack = [from];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === to) return true;
      for (const n of out.get(id) ?? []) {
        if (seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
    return false;
  };
  for (const e of model.edges.filter((x) => x.dashed && !back.has(x.id))) {
    if (reaches(e.to, e.from)) back.add(e.id);
    else add(e.from, e.to);
  }
  if (model.groups.length) groupCycles(model, back);
  return back;
}

/**
 * Groups are laid out as blocks, so two sibling groups that point at each other (lb > api
 * from Public Subnet into Private Subnet, api ..> nat back again) form a loop even when the
 * nodes don't. Edges are compared at the level where their ends' group chains split; solid
 * edges in spec order keep their direction first, then dashed ones, and any edge that would
 * close a loop between those blocks is marked as feedback too.
 */
function groupCycles(model: Model, back: Set<string>): void {
  const parentOf = new Map<string, string | undefined>();
  for (const g of model.groups) {
    for (const n of g.nodes) parentOf.set(`n:${n}`, `g:${g.id}`);
    for (const c of g.groups) parentOf.set(`g:${c}`, `g:${g.id}`);
  }
  const chain = (node: string) => {
    const out = [`n:${node}`];
    for (let at = parentOf.get(out[0]!); at; at = parentOf.get(at)) out.unshift(at);
    return out;
  };
  /** The two blocks, children of the lowest shared group (or of the root), that hold the ends. */
  const blocks = (from: string, to: string): [string, string] | undefined => {
    const [a, b] = [chain(from), chain(to)];
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i < a.length && i < b.length ? [a[i]!, b[i]!] : undefined;
  };
  const out = new Map<string, string[]>();
  const add = (a: string, b: string) => out.set(a, [...(out.get(a) ?? []), b]);
  const reaches = (from: string, to: string): boolean => {
    const seen = new Set([from]);
    const stack = [from];
    while (stack.length) {
      const id = stack.pop()!;
      if (id === to) return true;
      for (const n of out.get(id) ?? []) {
        if (seen.has(n)) continue;
        seen.add(n);
        stack.push(n);
      }
    }
    return false;
  };
  // edges already reversed are laid out the other way round
  for (const e of model.edges.filter((x) => back.has(x.id))) {
    const bl = blocks(e.to, e.from);
    if (bl) add(bl[0], bl[1]);
  }
  const rest = model.edges.filter((x) => !back.has(x.id));
  for (const e of [...rest.filter((x) => !x.dashed), ...rest.filter((x) => x.dashed)]) {
    const bl = blocks(e.from, e.to);
    if (!bl) continue;
    if (reaches(bl[1], bl[0])) back.add(e.id);
    else add(bl[0], bl[1]);
  }
}

async function layoutOnce(model: Model, theme: Theme, topPad: number): Promise<Layout> {
  const nodes = new Map<string, NodeBox>();
  const elkNodes = new Map<string, ElkNode>();

  for (const n of model.nodes) {
    const box = nodeBox(n, theme);
    const { w, h } = box;
    nodes.set(n.id, box);
    elkNodes.set(n.id, {
      id: `n:${n.id}`,
      width: w,
      height: h,
      // keep edge attachment points away from rounded corners
      layoutOptions: { 'elk.spacing.portsSurrounding': '[top=22,left=22,bottom=22,right=22]' },
    });
  }

  const down = model.direction === 'down';
  // ELK does not inherit spacing into compound nodes, so groups get the same options.
  const spacing: LayoutOptions = {
    'elk.spacing.nodeNode': '56',
    'elk.layered.spacing.nodeNodeBetweenLayers': down ? '72' : '56',
    'elk.spacing.edgeNode': '28',
    'elk.spacing.edgeEdge': '22',
    'elk.layered.spacing.edgeNodeBetweenLayers': down ? '34' : '28',
    'elk.spacing.edgeLabel': down ? '12' : '6',
  };

  // Model order = order of first appearance in the edges, so the flow reads the way the
  // spec was written and "return" edges (e.g. api ..> client) count as going backwards.
  const rank = new Map<string, number>();
  for (const e of model.edges)
    for (const id of [e.from, e.to]) if (!rank.has(id)) rank.set(id, rank.size);
  for (const n of model.nodes) if (!rank.has(n.id)) rank.set(n.id, rank.size);
  const backward = feedbackEdges(model, rank);

  const grouped = new Set(model.groups.flatMap((g) => g.nodes));
  const firstMember = (n: ElkNode): number =>
    n.id.startsWith('g:')
      ? Math.min(...(n.children ?? []).map(firstMember))
      : (rank.get(n.id.slice(2)) ?? Infinity);
  // Groups nest as ELK compound nodes; children keep the spec's flow order.
  const groupNode = (g: GroupModel): ElkNode => {
    const children = [
      ...model.groups.filter((c) => c.parent === g.id).map(groupNode),
      ...g.nodes.map((id) => elkNodes.get(id)!),
    ].sort((a, b) => firstMember(a) - firstMember(b));
    return {
      id: `g:${g.id}`,
      layoutOptions: { ...spacing, 'elk.padding': '[top=46,left=26,bottom=26,right=26]' },
      children,
    };
  };
  const groupNodesTop = model.groups.filter((g) => !g.parent).map(groupNode);
  const loose = model.nodes.filter((n) => !grouped.has(n.id)).map((n) => elkNodes.get(n.id)!);
  const rootChildren = [...groupNodesTop, ...loose].sort((a, b) => firstMember(a) - firstMember(b));

  // Feedback edges are laid out reversed (so the graph ELK sees is acyclic and follows the
  // spec order), then their routes are flipped back so arrows still point the right way.
  const edges: ElkExtendedEdge[] = model.edges.map((e) => {
    const size = pillSize(e.label, e.step, theme.fonts.edge);
    const flip = backward.has(e.id);
    return {
      id: `e:${e.id}`,
      sources: [`n:${flip ? e.to : e.from}`],
      targets: [`n:${flip ? e.from : e.to}`],
      ...(size
        ? {
            labels: [
              {
                id: `l:${e.id}`,
                text: e.label ?? String(e.step),
                width: size.w + PILL_GAP * 2,
                height: size.h,
                layoutOptions: { 'elk.edgeLabels.inline': 'true' } as LayoutOptions,
              },
            ],
          }
        : {}),
    };
  });

  const root: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': down ? 'DOWN' : 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.padding': `[top=${topPad},left=36,bottom=36,right=36]`,
      ...spacing,
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
      'elk.layered.cycleBreaking.strategy': 'GREEDY_MODEL_ORDER',
      'elk.json.edgeCoords': 'ROOT',
      'elk.json.shapeCoords': 'ROOT',
    },
    children: rootChildren,
    edges,
  };

  const out = await elk.layout(root);

  const walk = (n: ElkNode) => {
    for (const c of n.children ?? []) {
      if (c.id.startsWith('n:')) {
        const box = nodes.get(c.id.slice(2))!;
        box.x = r2(c.x ?? 0);
        box.y = r2(c.y ?? 0);
      }
      walk(c);
    }
  };
  walk(out);

  const groups = new Map<string, GroupBox>();
  const collect = (n: ElkNode) => {
    for (const g of n.children ?? []) {
      if (!g.id.startsWith('g:')) continue;
      const label = model.groups.find((m) => `g:${m.id}` === g.id)?.label ?? '';
      const upper = theme.group.uppercase;
      const size = upper ? 13 : 16;
      groups.set(g.id.slice(2), {
        x: r2(g.x ?? 0),
        y: r2(g.y ?? 0),
        w: r2(g.width ?? 0),
        h: r2(g.height ?? 0),
        labelW: Math.ceil(
          20 + measure(upper ? label.toUpperCase() : label, size, theme.fonts.group),
        ),
      });
      collect(g);
    }
  };
  collect(out);

  const routes = new Map<string, EdgeRoute>();
  for (const e of (out.edges ?? []) as ElkExtendedEdge[]) {
    const s = e.sections?.[0];
    if (!s) continue;
    const points = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint].map((p) => ({
      x: r2(p.x),
      y: r2(p.y),
    }));
    if (backward.has(e.id.slice(2))) points.reverse();
    const l = e.labels?.[0];
    const route: EdgeRoute = { points };
    if (l && l.x !== undefined && l.y !== undefined) {
      route.pill = {
        x: r2(l.x + PILL_GAP),
        y: r2(l.y),
        w: r2((l.width ?? 0) - PILL_GAP * 2),
        h: l.height ?? 0,
      };
    }
    routes.set(e.id.slice(2), route);
  }

  return {
    width: Math.ceil(out.width ?? 0),
    height: Math.ceil(out.height ?? 0),
    titleY: 52,
    nodes,
    groups,
    edges: routes,
  };
}
