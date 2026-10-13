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

  it('switches a too-wide diagram without a direction to top-down', async () => {
    const edges = `edges:
  - client > lb | a fairly long request label
  - lb > api | another long label here
  - api > cache | read through cache layer
  - cache > db | fallback to the database`;
    const auto = buildModel(edges);
    const lay = await layout(auto, defaultTheme);
    expect(auto.direction).toBe('down');
    expect(lay.height).toBeGreaterThan(lay.width);
    const fixed = buildModel(`direction: right\n${edges}`);
    const lay2 = await layout(fixed, defaultTheme);
    expect(fixed.direction).toBe('right');
    expect(lay2.width).toBeGreaterThan(lay2.height);
  });
});
