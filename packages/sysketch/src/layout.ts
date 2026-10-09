import ELK from 'elkjs/lib/elk.bundled.js';
import type { ElkNode, ElkExtendedEdge, LayoutOptions } from 'elkjs/lib/elk-api.js';
import type { Model } from './model.js';
import { measure, wrap } from './text.js';

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

export function pillSize(
  label: string | undefined,
  step: number | undefined,
): { w: number; h: number } | undefined {
  if (!label && step === undefined) return undefined;
  if (!label) return { w: PILL.badge, h: PILL.badge };
  const tw = measure(label, PILL.labelSize, 700);
  return { w: Math.ceil(tw + 22 + (step === undefined ? 0 : PILL.badge - 4)), h: PILL.h };
}

const elk = new ELK();
const r2 = (n: number) => Math.round(n * 100) / 100;

export async function layout(model: Model): Promise<Layout> {
  const nodes = new Map<string, NodeBox>();
  const elkNodes = new Map<string, ElkNode>();

  for (const n of model.nodes) {
    const lines = wrap(n.label, NODE.labelSize, 700, NODE.maxLabelW);
    const textW = Math.max(...lines.map((l) => measure(l, NODE.labelSize, 700)));
    const w = Math.max(NODE.minW, Math.ceil(textW + 36));
    const h = NODE.h + (lines.length - 1) * 19;
    nodes.set(n.id, { x: 0, y: 0, w, h, lines });
    elkNodes.set(n.id, { id: `n:${n.id}`, width: w, height: h });
  }

  const grouped = new Set(model.groups.flatMap((g) => g.nodes));
  const groupNodes: ElkNode[] = model.groups.map((g) => ({
    id: `g:${g.id}`,
    layoutOptions: { 'elk.padding': '[top=46,left=26,bottom=26,right=26]' },
    children: g.nodes.map((id) => elkNodes.get(id)!),
  }));
  const loose = model.nodes.filter((n) => !grouped.has(n.id)).map((n) => elkNodes.get(n.id)!);

  const edges: ElkExtendedEdge[] = model.edges.map((e) => {
    const size = pillSize(e.label, e.step);
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
                width: size.w,
                height: size.h,
                layoutOptions: { 'elk.edgeLabels.inline': 'true' } as LayoutOptions,
              },
            ],
          }
        : {}),
    };
  });

  const topPad = model.title ? 92 : 36;
  const root: ElkNode = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': model.direction === 'down' ? 'DOWN' : 'RIGHT',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.hierarchyHandling': 'INCLUDE_CHILDREN',
      'elk.padding': `[top=${topPad},left=36,bottom=36,right=36]`,
      'elk.spacing.nodeNode': '56',
      'elk.layered.spacing.nodeNodeBetweenLayers': '70',
      'elk.spacing.edgeNode': '28',
      'elk.spacing.edgeEdge': '22',
      'elk.layered.spacing.edgeNodeBetweenLayers': '28',
      'elk.spacing.edgeLabel': '6',
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
      route.pill = { x: r2(l.x), y: r2(l.y), w: l.width ?? 0, h: l.height ?? 0 };
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
