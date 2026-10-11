import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs/lib/elk-api.js';
import type { Model } from './model.js';
import type { Theme } from './themes.js';
import { measure, wrap, type FontRef } from './text.js';

export interface Pt {
  x: number;
  y: number;
}
export interface Box extends Pt {
  w: number;
  h: number;
}
export interface NodeBox extends Box {
  lines: string[];
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
  groups: Map<string, Box>;
  edges: Map<string, EdgeRoute>;
}

export const NODE = {
  minW: 132,
  h: 112,
  icon: 56,
  labelSize: 16,
  labelGap: 10,
  maxLabelW: 150,
} as const;
export const PILL = { h: 28, badge: 26, labelSize: 13 } as const;
/** Extra room reserved on each side of a pill so the arrow stays visible around it. */
const PILL_GAP = 18;

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
  for (const g of model.groups) for (const m of g.nodes.slice(1)) join(g.nodes[0]!, m);

  const parts = new Map<string, Set<string>>();
  for (const n of model.nodes) {
    const root = find(n.id);
    if (!parts.has(root)) parts.set(root, new Set());
    parts.get(root)!.add(n.id);
  }
  return [...parts.values()].map((ids) => ({
    direction: model.direction,
    nodes: model.nodes.filter((n) => ids.has(n.id)),
    groups: model.groups.filter((g) => g.nodes.length > 0 && ids.has(g.nodes[0]!)),
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

async function layoutOnce(model: Model, theme: Theme, topPad: number): Promise<Layout> {
  const nodes = new Map<string, NodeBox>();
  const elkNodes = new Map<string, ElkNode>();

  for (const n of model.nodes) {
    const lines = wrap(n.label, NODE.labelSize, theme.fonts.label, NODE.maxLabelW);
    const textW = Math.max(...lines.map((l) => measure(l, NODE.labelSize, theme.fonts.label)));
    const w = Math.max(NODE.minW, Math.ceil(textW + 36));
    const h = NODE.h + (lines.length - 1) * 19;
    nodes.set(n.id, { x: 0, y: 0, w, h, lines });
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
    'elk.layered.spacing.nodeNodeBetweenLayers': down ? '84' : '70',
    'elk.spacing.edgeNode': '28',
    'elk.spacing.edgeEdge': '22',
    'elk.layered.spacing.edgeNodeBetweenLayers': down ? '34' : '28',
    'elk.spacing.edgeLabel': down ? '12' : '6',
  };

  const grouped = new Set(model.groups.flatMap((g) => g.nodes));
  const groupNodes: ElkNode[] = model.groups.map((g) => ({
    id: `g:${g.id}`,
    layoutOptions: { ...spacing, 'elk.padding': '[top=46,left=26,bottom=26,right=26]' },
    children: g.nodes.map((id) => elkNodes.get(id)!),
  }));
  const loose = model.nodes.filter((n) => !grouped.has(n.id)).map((n) => elkNodes.get(n.id)!);

  const edges: ElkExtendedEdge[] = model.edges.map((e) => {
    const size = pillSize(e.label, e.step, theme.fonts.edge);
    return {
      id: `e:${e.id}`,
      sources: [`n:${e.from}`],
      targets: [`n:${e.to}`],
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
      'elk.json.edgeCoords': 'ROOT',
      'elk.json.shapeCoords': 'ROOT',
    },
    children: [...groupNodes, ...loose],
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

  const groups = new Map<string, Box>();
  for (const g of out.children ?? []) {
    if (g.id.startsWith('g:')) {
      groups.set(g.id.slice(2), {
        x: r2(g.x ?? 0),
        y: r2(g.y ?? 0),
        w: r2(g.width ?? 0),
        h: r2(g.height ?? 0),
      });
    }
  }

  const routes = new Map<string, EdgeRoute>();
  for (const e of (out.edges ?? []) as ElkExtendedEdge[]) {
    const s = e.sections?.[0];
    if (!s) continue;
    const points = [s.startPoint, ...(s.bendPoints ?? []), s.endPoint].map((p) => ({
      x: r2(p.x),
      y: r2(p.y),
    }));
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
