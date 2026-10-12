import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { findIcon, iconKeys, type IconDef } from './icons.js';

/** Thrown for any invalid spec. The message is written to be read (and fixed) by an LLM. */
export class SysketchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SysketchError';
  }
}

const nodeValue = z.union([
  z.string(),
  z.object({ icon: z.string(), label: z.string().optional(), sub: z.string().optional() }).strict(),
]);

const edgeValue = z.union([
  z.string(),
  z
    .object({
      from: z.string(),
      to: z.string(),
      label: z.string().optional(),
      step: z.number().int().positive().optional(),
      dashed: z.boolean().optional(),
      color: z.string().optional(),
      note: z.string().optional(),
    })
    .strict(),
  // YAML reads an unquoted "a > b : label" as a one-key map; accept it as a convenience.
  z.record(z.string(), z.string()),
]);

export const specSchema = z
  .object({
    title: z.string().optional(),
    theme: z.string().optional(),
    direction: z.enum(['right', 'down']).optional(),
    steps: z.boolean().optional(),
    legend: z.boolean().optional(),
    nodes: z.record(z.string(), nodeValue).optional(),
    groups: z.record(z.string(), z.array(z.string())).optional(),
    edges: z.array(edgeValue).min(1),
  })
  .strict();

export type Spec = z.infer<typeof specSchema>;

export interface NodeModel {
  id: string;
  label: string;
  /** optional second line, e.g. "stateless, 3 replicas" */
  sub?: string;
  icon: IconDef;
}
export interface GroupModel {
  id: string;
  label: string;
  nodes: string[];
}
export interface EdgeModel {
  id: string;
  from: string;
  to: string;
  label?: string;
  step?: number;
  /** dashed line, for responses and async calls */
  dashed?: boolean;
  /** palette name from EDGE_COLORS */
  color?: string;
  /** legend text for this step (defaults to "from → to · label") */
  note?: string;
}
export interface Model {
  title?: string;
  theme?: string;
  direction: 'right' | 'down';
  legend?: boolean;
  nodes: NodeModel[];
  groups: GroupModel[];
  edges: EdgeModel[];
}

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length]![b.length]!;
}

function suggest(word: string, candidates: string[]): string[] {
  const w = word.toLowerCase();
  return [...new Set(candidates)]
    .map((c) => ({ c, d: c.toLowerCase().startsWith(w) ? 0 : distance(w, c.toLowerCase()) }))
    .filter((x) => x.d <= Math.max(2, Math.floor(w.length / 3)))
    .sort((x, y) => x.d - y.d || x.c.localeCompare(y.c))
    .slice(0, 3)
    .map((x) => x.c);
}

/**
 * Quote plain `key: value` values that contain ": " (e.g. `title: URL Shortener: Read Path`),
 * which YAML rejects but LLMs write all the time.
 */
function quoteColonValues(text: string): string {
  return text
    .split('\n')
    .map((line) => {
      const m = /^(\s*[\w.-]+:\s+)(.*:\s.*)$/.exec(line);
      if (!m || /^\s*#/.test(line)) return line;
      const [, head, value] = m as unknown as [string, string, string];
      if (/^["'[{|>&*!]/.test(value.trim())) return line;
      return `${head}"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    })
    .join('\n');
}

function parseInput(input: string | object): unknown {
  if (typeof input !== 'string') return input;
  try {
    return parseYaml(input);
  } catch (e) {
    try {
      return parseYaml(quoteColonValues(input));
    } catch {
      throw new SysketchError(
        `Could not parse spec as YAML/JSON: ${(e as Error).message.split('\n')[0]}. Quote values that contain ": ".`,
      );
    }
  }
}

/** Arrow colors, named after theme hues (plus a few friendly synonyms). */
export const EDGE_COLORS = [
  'blue',
  'green',
  'amber',
  'red',
  'violet',
  'teal',
  'pink',
  'sky',
  'orange',
  'slate',
];
const COLOR_SYNONYMS: Record<string, string> = {
  yellow: 'amber',
  purple: 'violet',
  cyan: 'sky',
  gray: 'slate',
  grey: 'slate',
};

interface RawEdge {
  from: string;
  to: string;
  label?: string | undefined;
  step?: number | undefined;
  dashed?: boolean | undefined;
  color?: string | undefined;
  note?: string | undefined;
}

function edgeColor(name: string, where: string): string {
  const c = COLOR_SYNONYMS[name.toLowerCase()] ?? name.toLowerCase();
  if (!EDGE_COLORS.includes(c)) {
    throw new SysketchError(
      `${where}: unknown color "${name}". Use one of: ${EDGE_COLORS.join(', ')}.`,
    );
  }
  return c;
}

/**
 * "a > b > c | label [red, dashed]" -> edges a>b, b>c. The label goes on the last hop;
 * `..>` makes a hop dashed; a trailing [...] applies a color and/or `dashed` to every hop.
 */
function expandEdge(src: string): RawEdge[] {
  let rest = src;
  let color: string | undefined;
  let dashedAll = false;
  const attrs = /\[([^\]]*)\]\s*$/.exec(rest);
  if (attrs) {
    rest = rest.slice(0, attrs.index);
    for (const a of attrs[1]!.split(/[\s,]+/).filter(Boolean)) {
      if (a.toLowerCase() === 'dashed') dashedAll = true;
      else color = edgeColor(a, `Edge "${src}"`);
    }
  }
  const sep = rest.indexOf('|');
  const chain = (sep === -1 ? rest : rest.slice(0, sep)).replace(/(^|[^.-])->/g, '$1>');
  const label = sep === -1 ? undefined : rest.slice(sep + 1).trim() || undefined;
  const parts = chain.split(/(\.\.>|>)/).map((s) => s.trim());
  const ids = parts.filter((_, i) => i % 2 === 0);
  const ops = parts.filter((_, i) => i % 2 === 1);
  if (ids.length < 2 || ids.some((s) => !s)) {
    throw new SysketchError(
      `Bad edge "${src}". Use "from > to", "a > b > c", "a ..> b" (dashed) or "a > b | label [red]".`,
    );
  }
  return ids.slice(1).map((to, i) => {
    const e: RawEdge = { from: ids[i]!, to };
    if (label && i === ids.length - 2) e.label = label;
    if (dashedAll || ops[i] === '..>') e.dashed = true;
    if (color) e.color = color;
    return e;
  });
}

function parseNodeValue(id: string, v: z.infer<typeof nodeValue>): NodeModel {
  const [iconKey, labelPart, ...subParts] = (typeof v === 'string' ? v : v.icon).split('|');
  const key = iconKey!.trim();
  const hit = findIcon(key);
  if (!hit) {
    const tip = suggest(key, iconKeys());
    throw new SysketchError(
      `Node "${id}": unknown icon "${key}".` +
        (tip.length ? ` Did you mean: ${tip.join(', ')}?` : '') +
        ` Run "sysketch icons" for the full list.`,
    );
  }
  const label = (typeof v === 'string' ? labelPart?.trim() : v.label) || hit.label;
  const sub = (typeof v === 'string' ? subParts.join('|').trim() : v.sub) || undefined;
  return { id, label, icon: hit.icon, ...(sub ? { sub } : {}) };
}

export function buildModel(input: string | object): Model {
  const parsed = specSchema.safeParse(parseInput(input));
  if (!parsed.success) {
    const msg = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.') || 'spec'}: ${i.message}`)
      .join('; ');
    throw new SysketchError(
      `Invalid spec. ${msg}. Expected keys: title, theme, direction, steps, legend, nodes, groups, edges.`,
    );
  }
  const spec = parsed.data;

  const nodes = new Map<string, NodeModel>();
  for (const [id, v] of Object.entries(spec.nodes ?? {})) nodes.set(id, parseNodeValue(id, v));

  const rawEdges: RawEdge[] = spec.edges.flatMap((e): RawEdge[] => {
    if (typeof e === 'string') return expandEdge(e);
    if ('from' in e && 'to' in e && typeof e.from === 'string' && typeof e.to === 'string') {
      const raw: RawEdge = { ...(e as RawEdge) };
      if (raw.color) raw.color = edgeColor(raw.color, `Edge ${raw.from} > ${raw.to}`);
      return [raw];
    }
    const [k, v] = Object.entries(e)[0] ?? ['', ''];
    return expandEdge(`${k} | ${v}`);
  });

  const resolve = (id: string, where: string): string => {
    if (nodes.has(id)) return id;
    const hit = findIcon(id);
    if (hit) {
      nodes.set(id, { id, label: hit.label, icon: hit.icon });
      return id;
    }
    const tip = suggest(id, [...nodes.keys(), ...iconKeys()]);
    throw new SysketchError(
      `${where}: unknown node "${id}".` +
        (tip.length ? ` Did you mean: ${tip.join(', ')}?` : '') +
        ` Declare it under nodes (e.g. ${id}: server) or use a known icon name.`,
    );
  };

  const edges: EdgeModel[] = rawEdges.map((e, i) => {
    const edge: EdgeModel = {
      id: `e${i}`,
      from: resolve(e.from, `edges[${i}]`),
      to: resolve(e.to, `edges[${i}]`),
    };
    if (e.label) edge.label = e.label;
    if (spec.steps !== false) edge.step = e.step ?? i + 1;
    if (e.dashed) edge.dashed = true;
    if (e.color) edge.color = e.color;
    if (e.note) edge.note = e.note;
    return edge;
  });

  const seen = new Map<string, string>();
  const groups: GroupModel[] = Object.entries(spec.groups ?? {}).map(([label, members], gi) => {
    for (const m of members) {
      resolve(m, `groups.${label}`);
      const prev = seen.get(m);
      if (prev)
        throw new SysketchError(
          `Node "${m}" is in two groups ("${prev}" and "${label}"). Use one.`,
        );
      seen.set(m, label);
    }
    return { id: `g${gi}`, label, nodes: members };
  });

  return {
    ...(spec.title ? { title: spec.title } : {}),
    ...(spec.theme ? { theme: spec.theme } : {}),
    direction: spec.direction ?? 'right',
    ...(spec.legend ? { legend: true } : {}),
    nodes: [...nodes.values()],
    groups,
    edges,
  };
}
