import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import { parsePin, PIN_NAMES, type MapName, type Pin } from './maps.js';
import { SysketchError } from './errors.js';
import { findIcon, iconKeys, type IconDef } from './icons.js';
import type { Logo, LogoResolver } from './logos.js';
import { CATALOG_BRANDS, findProduct } from './products.js';

export { SysketchError };

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
      thick: z.boolean().optional(),
      ends: z.enum(['end', 'both', 'none']).optional(),
      color: z.string().optional(),
      note: z.string().optional(),
    })
    .strict(),
  // YAML reads an unquoted "a > b : label" as a one-key map; accept it as a convenience.
  z.record(z.string(), z.string()),
]);

const mapValue = z.union([
  z.enum(['world']),
  z.object({ map: z.enum(['world']).optional(), pins: z.array(z.string()).optional() }).strict(),
]);

export const specSchema = z
  .object({
    title: z.string().optional(),
    type: z.enum(['architecture', 'sequence']).optional(),
    theme: z.string().optional(),
    direction: z.enum(['right', 'down']).optional(),
    steps: z.boolean().optional(),
    legend: z.boolean().optional(),
    logos: z.union([z.boolean(), z.string(), z.array(z.string())]).optional(),
    nodes: z.record(z.string(), nodeValue).optional(),
    groups: z.record(z.string(), z.array(z.string())).optional(),
    maps: z.record(z.string(), mapValue).optional(),
    edges: z.array(edgeValue).min(1),
  })
  .strict();

export type Spec = z.infer<typeof specSchema>;

/** A map to draw (behind a group, or as a big map node) and the pins on it. */
export interface MapSpec {
  name: MapName;
  pins: Pin[];
}
export interface NodeModel {
  id: string;
  label: string;
  /** optional second line, e.g. "stateless, 3 replicas" */
  sub?: string;
  icon: IconDef;
  /** official brand logo, drawn unaltered in place of the icon */
  logo?: Logo;
  /** a big map card in place of the icon (icon name `world-map`) */
  map?: MapSpec;
}
export interface GroupModel {
  id: string;
  label: string;
  /** nodes directly inside this group */
  nodes: string[];
  /** groups directly inside this group (ids) */
  groups: string[];
  /** id of the group this one sits in */
  parent?: string;
  /** simplified map drawn behind the group's contents */
  map?: MapSpec;
}
export interface EdgeModel {
  id: string;
  from: string;
  to: string;
  label?: string;
  step?: number;
  /** dashed line, for responses and async calls */
  dashed?: boolean;
  /** heavier line, for the main or "hot" path */
  thick?: boolean;
  /** arrowheads: at the target (default), at both ends, or none (a plain line) */
  ends?: 'both' | 'none';
  /** palette name from EDGE_COLORS */
  color?: string;
  /** legend text for this step (defaults to "from → to · label") */
  note?: string;
}
export interface Model {
  title?: string;
  /** `sequence`: participants across the top, messages top to bottom */
  type?: 'sequence';
  theme?: string;
  direction: 'right' | 'down';
  /** the spec left direction out: layout may pick whichever reads better */
  autoDirection?: boolean;
  legend?: boolean;
  /** spec `logos:` value: false turns logos off, a path (or list) adds logo folders */
  logos?: boolean | string | string[];
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
  thick?: boolean | undefined;
  ends?: 'end' | 'both' | 'none' | undefined;
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

/** Arrow operators: `>` arrow, `..>` dashed, `<>` two-way, `<..>` two-way dashed, `=>` thick, `--` line. */
const OPS: Record<string, Pick<RawEdge, 'dashed' | 'thick' | 'ends'>> = {
  '>': {},
  '..>': { dashed: true },
  '<>': { ends: 'both' },
  '<..>': { ends: 'both', dashed: true },
  '=>': { thick: true },
  '--': { ends: 'none' },
};

/**
 * "a > b > c | label [red, dashed]" -> edges a>b, b>c. The label goes on the last hop;
 * the operator sets each hop's style (see OPS); a trailing [...] applies a color, `dashed`
 * and/or `thick` to every hop.
 */
function expandEdge(src: string): RawEdge[] {
  let rest = src;
  let color: string | undefined;
  let dashedAll = false;
  let thickAll = false;
  const attrs = /\[([^\]]*)\]\s*$/.exec(rest);
  if (attrs) {
    rest = rest.slice(0, attrs.index);
    for (const a of attrs[1]!.split(/[\s,]+/).filter(Boolean)) {
      const k = a.toLowerCase();
      if (k === 'dashed') dashedAll = true;
      else if (k === 'thick' || k === 'bold') thickAll = true;
      else color = edgeColor(a, `Edge "${src}"`);
    }
  }
  const sep = rest.indexOf('|');
  // Common spellings: "->" is ">", "<->" is "<>", "==>" is "=>".
  const chain = (sep === -1 ? rest : rest.slice(0, sep))
    .replace(/<-+>/g, '<>')
    .replace(/<\.\.+>/g, '<..>')
    .replace(/=+>/g, '=>')
    .replace(/(^|[^.<-])-+>/g, '$1>');
  const label = sep === -1 ? undefined : rest.slice(sep + 1).trim() || undefined;
  const parts = chain.split(/(<\.\.>|\.\.>|<>|=>|\s--\s|>)/).map((s) => s.trim());
  const ids = parts.filter((_, i) => i % 2 === 0);
  const ops = parts.filter((_, i) => i % 2 === 1);
  if (ids.length < 2 || ids.some((s) => !s)) {
    throw new SysketchError(
      `Bad edge "${src}". Use "from > to", "a > b > c", "a ..> b" (dashed), "a <> b" (two-way), "a => b" (thick), "a -- b" (line) or "a > b | label [red]".`,
    );
  }
  return ids.slice(1).map((to, i) => {
    const e: RawEdge = { from: ids[i]!, to, ...OPS[ops[i]!] };
    if (label && i === ids.length - 2) e.label = label;
    if (dashedAll) e.dashed = true;
    if (thickAll) e.thick = true;
    if (color) e.color = color;
    return e;
  });
}

/** Brand logos for this spec, or undefined when logos are off / none are installed. */
export type LogoLookup = LogoResolver & { names?: () => string[] };

export interface BuildOptions {
  /** Called with the spec's `logos:` value; returns the logo lookup to use. */
  logos?: (specValue: Spec['logos']) => LogoLookup | undefined;
}

const GENERIC = findIcon('service')!.icon;

/** Icon names that draw a big map card instead of an icon. */
const MAP_ICON_KEYS = new Set(['world-map', 'map']);
const WORLD: MapSpec = { name: 'world', pins: [] };

const titleCase = (s: string) =>
  s.replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** A sysketch icon for a name: catalog names and aliases first, then known products. */
function known(key: string): { icon: IconDef; label: string; generic: boolean } | undefined {
  const hit = findIcon(key);
  if (hit) return { ...hit, generic: !CATALOG_BRANDS.has(key.toLowerCase()) };
  const product = findProduct(key);
  const icon = product && findIcon(product[0]);
  return icon && product ? { icon: icon.icon, label: product[1], generic: false } : undefined;
}

/**
 * Icon and/or official logo for a name. Generic names (database, queue, api...) always use
 * the sysketch icon; product names (redis, stripe, sendgrid...) use an installed logo when
 * there is one, else their matching icon. `brand/icon` (e.g. `acme/queue`) uses the brand's
 * logo if installed, else that icon.
 */
function lookup(
  key: string,
  logoOf: LogoLookup | undefined,
): { icon: IconDef; label: string; logo?: Logo; map?: true } | undefined {
  if (MAP_ICON_KEYS.has(key.toLowerCase()))
    return { icon: findIcon('location')!.icon, label: 'World Map', map: true };
  const slash = key.indexOf('/');
  if (slash > 0) {
    const brand = key.slice(0, slash).trim();
    const fallback = findIcon(key.slice(slash + 1).trim());
    if (!fallback) return undefined;
    const own = known(brand);
    const logo = own?.generic ? undefined : logoOf?.(brand);
    return {
      icon: fallback.icon,
      label: own && !own.generic ? own.label : (logo?.title ?? titleCase(brand)),
      ...(logo ? { logo } : {}),
    };
  }
  const own = known(key);
  const logo = own?.generic || !logoOf ? undefined : logoOf(key);
  if (!own && !logo) return undefined;
  return {
    icon: own?.icon ?? GENERIC,
    label: own?.label ?? logo!.title,
    ...(logo ? { logo } : {}),
  };
}

function parseNodeValue(
  id: string,
  v: z.infer<typeof nodeValue>,
  logoOf: LogoLookup | undefined,
): NodeModel {
  const [iconKey, labelPart, ...subParts] = (typeof v === 'string' ? v : v.icon).split('|');
  const key = iconKey!.trim();
  const hit = lookup(key, logoOf);
  if (!hit) {
    const tip = suggest(key, [...iconKeys(), ...(logoOf?.names?.() ?? [])]);
    throw new SysketchError(
      `Node "${id}": unknown icon "${key}".` +
        (tip.length ? ` Did you mean: ${tip.join(', ')}?` : '') +
        ` Run "sysketch icons" for the full list, or write brand/icon (e.g. cloudflare/cdn).`,
    );
  }
  const written = typeof v === 'string' ? labelPart?.trim() : v.label;
  const label = written || hit.label;
  const sub = (typeof v === 'string' ? subParts.join('|').trim() : v.sub) || undefined;
  // A generic icon on a node named after a product ("db: database | DynamoDB") still draws
  // that product's logo when one is installed: writers often pick the generic icon.
  // The id counts only when sysketch knows it as a product (apigw, cognito); ids are often
  // arbitrary. A label counts unless it's a generic name ("API Gateway", "Cache").
  let logo = hit.logo;
  if (!logo && logoOf && known(key)?.generic) {
    const kind = (name: string) => known(name) ?? known(name.toLowerCase().replace(/\s+/g, '-'));
    const product = known(id);
    if (product && !product.generic) logo = logoOf(id);
    if (!logo && written && !kind(written)?.generic) logo = logoOf(written);
  }
  return {
    id,
    label,
    icon: hit.icon,
    ...(sub ? { sub } : {}),
    ...(logo ? { logo } : {}),
    ...(hit.map ? { map: { ...WORLD } } : {}),
  };
}

/** A leading step number in a label: "1. ", "2) ", "3: ", "Step 4 - ". */
const STEP_PREFIX = /^\s*(?:step\s*)?\d+\s*[.):-]\s+/i;

export function buildModel(input: string | object, opts: BuildOptions = {}): Model {
  const parsed = specSchema.safeParse(parseInput(input));
  if (!parsed.success) {
    const msg = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join('.') || 'spec'}: ${i.message}`)
      .join('; ');
    throw new SysketchError(
      `Invalid spec. ${msg}. Expected keys: title, type, theme, direction, steps, legend, logos, nodes, groups, maps, edges.`,
    );
  }
  const spec = parsed.data;
  const logoOf = opts.logos?.(spec.logos);

  const nodes = new Map<string, NodeModel>();
  for (const [id, v] of Object.entries(spec.nodes ?? {}))
    nodes.set(id, parseNodeValue(id, v, logoOf));

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
    const hit = lookup(id, logoOf);
    if (hit) {
      nodes.set(id, {
        id,
        label: hit.label,
        icon: hit.icon,
        ...(hit.logo ? { logo: hit.logo } : {}),
        ...(hit.map ? { map: { ...WORLD } } : {}),
      });
      return id;
    }
    const tip = suggest(id, [...nodes.keys(), ...iconKeys(), ...(logoOf?.names?.() ?? [])]);
    throw new SysketchError(
      `${where}: unknown node "${id}".` +
        (tip.length ? ` Did you mean: ${tip.join(', ')}?` : '') +
        ` Declare it under nodes (e.g. ${id}: server), use a known icon name, or write brand/icon (e.g. cloudflare/cdn).`,
    );
  };

  const edges: EdgeModel[] = rawEdges.map((e, i) => {
    const edge: EdgeModel = {
      id: `e${i}`,
      from: resolve(e.from, `edges[${i}]`),
      to: resolve(e.to, `edges[${i}]`),
    };
    // Models often number labels themselves ("1. Upload"); sysketch numbers the steps
    // already, so a leading number would duplicate (or contradict) the badge.
    const label = spec.steps === false ? e.label : e.label?.replace(STEP_PREFIX, '');
    if (label) edge.label = label;
    if (spec.steps !== false) edge.step = e.step ?? i + 1;
    if (e.dashed) edge.dashed = true;
    if (e.thick) edge.thick = true;
    if (e.ends && e.ends !== 'end') edge.ends = e.ends;
    if (e.color) edge.color = e.color;
    if (e.note) edge.note = e.note;
    return edge;
  });

  // A group may list other groups by name (nesting): AWS: [VPC], VPC: [Public, Private].
  const specGroups = Object.entries(spec.groups ?? {});
  const groupId = new Map(specGroups.map(([label], gi) => [label, `g${gi}`]));
  const seen = new Map<string, string>();
  const groups: GroupModel[] = specGroups.map(([label, members]) => {
    const g: GroupModel = { id: groupId.get(label)!, label, nodes: [], groups: [] };
    for (const m of members) {
      const prev = seen.get(m);
      if (prev) {
        const what = groupId.has(m) ? 'Group' : 'Node';
        throw new SysketchError(
          `${what} "${m}" is in two groups ("${prev}" and "${label}"). Use one.`,
        );
      }
      seen.set(m, label);
      if (groupId.has(m)) {
        if (m === label) throw new SysketchError(`Group "${label}" can't contain itself.`);
        g.groups.push(groupId.get(m)!);
      } else {
        resolve(m, `groups.${label}`);
        g.nodes.push(m);
      }
    }
    return g;
  });
  const byId = new Map(groups.map((g) => [g.id, g]));
  for (const g of groups) for (const c of g.groups) byId.get(c)!.parent = g.id;
  // maps: {Group or map node: world | {pins: [...]}} draws a map behind a group or in a map node
  for (const [key, val] of Object.entries(spec.maps ?? {})) {
    const conf = typeof val === 'string' ? { map: val } : val;
    const pins = (conf.pins ?? []).map((text) => {
      const pin = parsePin(text);
      if (pin) return pin;
      const tip = suggest(text, PIN_NAMES);
      throw new SysketchError(
        `maps.${key}: unknown pin "${text}".` +
          (tip.length ? ` Did you mean: ${tip.join(', ')}?` : '') +
          ' Use a place like us-east or tokyo, or write Label @ lon lat (HQ @ -0.12 51.5).',
      );
    });
    const map: MapSpec = { name: conf.map ?? 'world', pins };
    const g = groups.find((m) => m.label === key);
    const n = nodes.get(key);
    if (g) g.map = map;
    else if (n?.map) n.map = map;
    else if (n)
      throw new SysketchError(
        `maps.${key}: "${key}" is a node without a map. Give it the icon world-map, or use a group name.`,
      );
    else {
      const names = [
        ...specGroups.map(([l]) => l),
        ...[...nodes.values()].filter((m) => m.map).map((m) => m.id),
      ];
      const tip = suggest(key, names);
      throw new SysketchError(
        `maps.${key}: no group or map node with that name.` +
          (tip.length
            ? ` Did you mean: ${tip.join(', ')}?`
            : ' Add it under groups, or as a world-map node.'),
      );
    }
  }
  for (const g of groups) {
    // walking up must end at a top-level group, or the nesting loops
    const path = new Set<string>();
    for (let at: GroupModel | undefined = g; at; at = at.parent ? byId.get(at.parent) : undefined) {
      if (path.has(at.id))
        throw new SysketchError(`Groups "${g.label}" and "${at.label}" contain each other.`);
      path.add(at.id);
    }
  }

  return {
    ...(spec.title ? { title: spec.title } : {}),
    ...(spec.type === 'sequence' ? { type: 'sequence' as const } : {}),
    ...(spec.theme ? { theme: spec.theme } : {}),
    direction: spec.direction ?? 'right',
    ...(spec.direction ? {} : { autoDirection: true }),
    ...(spec.legend ? { legend: true } : {}),
    ...(spec.logos !== undefined ? { logos: spec.logos } : {}),
    nodes: [...nodes.values()],
    groups,
    edges,
  };
}

/** Every node inside a group, including nodes of the groups nested in it. */
export function groupNodes(model: Pick<Model, 'groups'>, g: GroupModel): string[] {
  return [
    ...g.nodes,
    ...g.groups.flatMap((id) => {
      const child = model.groups.find((c) => c.id === id);
      return child ? groupNodes(model, child) : [];
    }),
  ];
}
