import { describe, expect, it } from 'vitest';
import { feedbackEdges, layout } from '../src/layout.js';
import { buildModel, defaultTheme } from '../src/index.js';

const bottom = (lay: Awaited<ReturnType<typeof layout>>, ids: string[]) =>
  Math.max(...ids.map((id) => lay.nodes.get(id)!.y + lay.nodes.get(id)!.h));
const top = (lay: Awaited<ReturnType<typeof layout>>, ids: string[]) =>
  Math.min(...ids.map((id) => lay.nodes.get(id)!.y));

describe('layout of independent parts', () => {
  it('stacks unrelated flows instead of sharing columns', async () => {
    const lay = await layout(
      buildModel({ edges: ['client > lb > api > db', 'admin > cron > worker'] }),
      defaultTheme,
    );
    expect(top(lay, ['admin', 'cron', 'worker'])).toBeGreaterThan(
      bottom(lay, ['client', 'lb', 'api', 'db']),
    );
    // the second flow starts at the left edge, not after the first flow's columns
    expect(lay.nodes.get('admin')!.x).toBe(lay.nodes.get('client')!.x);
  });

  it('treats nodes sharing a group as one part', async () => {
    const lay = await layout(
      buildModel({ groups: { Data: ['db', 'cache'] }, edges: ['api > db', 'worker > cache'] }),
      defaultTheme,
    );
    const g = [...lay.groups.values()][0]!;
    for (const id of ['db', 'cache']) {
      const n = lay.nodes.get(id)!;
      expect(n.x).toBeGreaterThanOrEqual(g.x);
      expect(n.y + n.h).toBeLessThanOrEqual(g.y + g.h);
    }
  });

  it('places parts side by side in top-down diagrams', async () => {
    const lay = await layout(
      buildModel({ direction: 'down', edges: ['client > api', 'admin > cron'] }),
      defaultTheme,
    );
    expect(lay.nodes.get('admin')!.x).toBeGreaterThan(lay.nodes.get('client')!.x);
  });
});

describe('flow order with loops', () => {
  const xOf = async (spec: string) => {
    const model = buildModel(spec);
    const lay = await layout(model, defaultTheme);
    return (id: string) => lay.nodes.get(id)!.x;
  };

  it('keeps the first node first when return edges create loops', async () => {
    const x = await xOf(`nodes:
  clients: client
  gw: lb
  chat: service
  push: queue
  notif: notification
  media: service
  store: storage
edges:
  - clients > gw > chat > db
  - chat > gw
  - chat > push > notif
  - notif ..> clients
  - cdn ..> clients
  - clients > media > store > cdn`);
    expect(x('clients')).toBeLessThan(x('gw'));
    expect(x('gw')).toBeLessThan(x('chat'));
    expect(x('chat')).toBeLessThan(x('notif'));
  });

  it('marks only edges that close a cycle, dashed ones first', () => {
    const model = buildModel(`edges:
  - api > db
  - api > kafka
  - kafka ..> db
  - client > api
  - api ..> client`);
    const rank = new Map(['api', 'db', 'kafka', 'client'].map((id, i) => [id, i]));
    const back = feedbackEdges(model, rank);
    const ids = model.edges.filter((e) => back.has(e.id)).map((e) => `${e.from}>${e.to}`);
    expect(ids).toEqual(['api>client']);
  });

  it('brings a too-wide diagram back to a readable shape', async () => {
    const edges = `edges:
  - client > lb | a fairly long request label
  - lb > api | another long label here
  - api > cache | read through cache layer
  - cache > db | fallback to the database`;
    const lay = await layout(buildModel(edges), defaultTheme);
    // one row would be ~9:1; folded into rows (or top-down) it reads on a page
    expect(lay.width / lay.height).toBeLessThan(3.5);
    const fixed = buildModel(`direction: right\n${edges}`);
    await layout(fixed, defaultTheme);
    expect(fixed.direction).toBe('right');
  });
});

describe('long flows fold into rows', () => {
  const chain = `edges:
  - client > lb | HTTPS request
  - lb > gateway | route by path
  - gateway > auth | verify token
  - auth > api | create order
  - api > payment | charge card
  - payment > db | record entry
  - db > warehouse | nightly export
  - warehouse > dashboard | daily report`;

  it('folds a long chain into readable rows that stay on the canvas', async () => {
    const model = buildModel(chain);
    const lay = await layout(model, defaultTheme);
    expect(lay.width / lay.height).toBeLessThan(2.4);
    expect(model.direction).toBe('right');
    const boxes = [...lay.nodes.values()];
    for (const e of lay.edges.values()) {
      for (const p of e.points) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(lay.width);
        expect(p.y).toBeLessThanOrEqual(lay.height);
      }
    }
    for (const a of boxes)
      for (const b of boxes) {
        if (a === b) continue;
        const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        expect(apart).toBe(true);
      }
    // rows read left to right: the first hop stays on one row, going right
    const c = lay.nodes.get('client')!;
    const l = lay.nodes.get('lb')!;
    expect(l.x).toBeGreaterThan(c.x);
    expect(Math.abs(l.y - c.y)).toBeLessThan(40);
  });

  it('respects an explicit top-down direction', async () => {
    const model = buildModel(`direction: down\n${chain}`);
    const lay = await layout(model, defaultTheme);
    expect(model.direction).toBe('down');
    expect(lay.height).toBeGreaterThan(lay.width);
  });
});
