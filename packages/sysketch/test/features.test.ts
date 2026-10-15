import { describe, expect, it } from 'vitest';
import { buildModel, render, themes } from '../src/index.js';
import { layout } from '../src/layout.js';

const classic = { theme: 'classic' };
const edge = (spec: string) => buildModel(`edges: ["${spec}"]`).edges;

describe('arrow types', () => {
  it('parses two-way, thick and plain arrows, and their common spellings', () => {
    expect(edge('a/api <> b/db')[0]).toMatchObject({ ends: 'both' });
    expect(edge('a/api <-> b/db')[0]).toMatchObject({ ends: 'both' });
    expect(edge('a/api <..> b/db')[0]).toMatchObject({ ends: 'both', dashed: true });
    expect(edge('a/api => b/db')[0]).toMatchObject({ thick: true });
    expect(edge('a/api ==> b/db')[0]).toMatchObject({ thick: true });
    expect(edge('a/api -- b/db')[0]).toMatchObject({ ends: 'none' });
    expect(edge('a/api --> b/db')[0]!.ends).toBeUndefined();
    expect(edge('a/api > b/db [red, thick]')[0]).toMatchObject({ thick: true, color: 'red' });
    // hyphenated ids are not lines
    expect(edge('api-gateway > db')[0]).toMatchObject({ from: 'api-gateway', to: 'db' });
  });

  it('draws two heads, no head, or a heavier line', async () => {
    const heads = (svg: string) => (svg.match(/<polygon /g) ?? []).length;
    const one = await render('edges: ["api > db"]', classic);
    expect(heads(await render('edges: ["api <> db"]', classic))).toBe(heads(one) + 1);
    expect(heads(await render('edges: ["api -- db"]', classic))).toBe(heads(one) - 1);
    const w = themes.classic!.edgeWidth;
    expect(await render('edges: ["api => db"]', classic)).toContain(`stroke-width="${w * 2}"`);
  });
});

describe('nested groups', () => {
  const spec = `groups:
  AWS Region: [VPC, s3]
  VPC: [Public, Private]
  Public: [lb]
  Private: [api, db]
edges:
  - client > lb > api > db
  - api > s3`;

  it('links groups to their parents', () => {
    const m = buildModel(spec);
    const g = (label: string) => m.groups.find((x) => x.label === label)!;
    expect(g('VPC').parent).toBe(g('AWS Region').id);
    expect(g('Private').parent).toBe(g('VPC').id);
    expect(g('AWS Region').nodes).toEqual(['s3']);
    expect(g('AWS Region').groups).toEqual([g('VPC').id]);
  });

  it('lays inner groups out inside outer ones', async () => {
    const m = buildModel(spec);
    const lay = await layout(m, themes.classic!);
    const box = (label: string) => lay.groups.get(m.groups.find((x) => x.label === label)!.id)!;
    const inside = (a: ReturnType<typeof box>, b: ReturnType<typeof box>) =>
      a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
    expect(inside(box('VPC'), box('AWS Region'))).toBe(true);
    expect(inside(box('Private'), box('VPC'))).toBe(true);
    const api = lay.nodes.get('api')!;
    expect(inside({ ...api, labelW: 0 }, box('Private'))).toBe(true);
  });

  it('keeps the flow between sibling groups that point at each other', async () => {
    // lb > api goes Public -> Private, api ..> nat comes back: the reply must not flip the subnets
    const m = buildModel(`nodes:
  nat: gateway | NAT Gateway
groups:
  Private Subnet: [api, db]
  Public Subnet: [lb, nat]
  VPC: [Public Subnet, Private Subnet]
edges:
  - client => lb => api => db
  - api ..> nat`);
    const lay = await layout(m, themes.classic!);
    const box = (label: string) => lay.groups.get(m.groups.find((g) => g.label === label)!.id)!;
    expect(box('Public Subnet').x).toBeLessThan(box('Private Subnet').x);
  });

  it('refuses a group in two places and groups that contain each other', () => {
    expect(() => buildModel('groups:\n  A: [C]\n  B: [C]\n  C: [db]\nedges: ["api > db"]')).toThrow(
      /in two groups/,
    );
    expect(() => buildModel('groups:\n  A: [B]\n  B: [A, db]\nedges: ["api > db"]')).toThrow(
      /contain each other/,
    );
  });
});

describe('sequence diagrams', () => {
  const spec = `type: sequence
groups:
  Backend: [api, db]
edges:
  - user > app | sign in
  - app > api | POST /login
  - api > db | find user
  - db ..> api | row
  - api > api | hash check
  - api ..> app | token`;

  it('puts participants in a row and messages top to bottom', async () => {
    const m = buildModel(spec);
    expect(m.type).toBe('sequence');
    const lay = await layout(m, themes.classic!);
    const order = ['user', 'app', 'api', 'db'].map((id) => lay.nodes.get(id)!);
    expect(new Set(order.map((b) => b.y)).size).toBe(1);
    for (let i = 1; i < order.length; i++) expect(order[i]!.x).toBeGreaterThan(order[i - 1]!.x);
    const ys = m.edges.map((e) => lay.edges.get(e.id)!.points[0]!.y);
    for (let i = 1; i < ys.length; i++) expect(ys[i]!).toBeGreaterThan(ys[i - 1]!);
    expect(lay.lifelines).toHaveLength(4);
    // a message to itself loops out and back to the same lifeline
    const self = lay.edges.get(m.edges[4]!.id)!.points;
    expect(self).toHaveLength(4);
    expect(self[0]!.x).toBe(self[3]!.x);
    // labels stay between their lifelines and on the canvas
    for (const r of lay.edges.values()) {
      expect(r.pill!.x).toBeGreaterThanOrEqual(0);
      expect(r.pill!.x + r.pill!.w).toBeLessThanOrEqual(lay.width);
    }
  });

  it('keeps group members next to each other and boxes them', async () => {
    const m = buildModel(`type: sequence
groups:
  Backend: [api, db]
edges:
  - api > app
  - app > db
  - db > user`);
    const lay = await layout(m, themes.classic!);
    const x = (id: string) => lay.nodes.get(id)!.x;
    expect(Math.abs(['api', 'app', 'db'].sort((a, b) => x(a) - x(b)).indexOf('app') - 1)).toBe(1);
    const g = lay.groups.get(m.groups[0]!.id)!;
    for (const id of ['api', 'db']) {
      expect(x(id)).toBeGreaterThan(g.x);
      expect(x(id) + lay.nodes.get(id)!.w).toBeLessThan(g.x + g.w);
    }
  });

  it('renders lifelines', async () => {
    expect(await render(spec, classic)).toContain('stroke-dasharray="7 6"');
  });
});
