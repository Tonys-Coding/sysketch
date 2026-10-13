import { describe, expect, it } from 'vitest';
import { layout } from '../src/layout.js';
import { buildModel, defaultTheme, render, SysketchError } from '../src/index.js';

describe('0.2.0 spec features', () => {
  it('parses node subtitles from the string and object forms', () => {
    const m = buildModel({
      nodes: {
        api: 'server | API Server | stateless, 3 replicas',
        db: { icon: 'db', sub: 'primary' },
      },
      edges: ['api > db'],
    });
    expect(m.nodes.map((n) => [n.id, n.label, n.sub])).toEqual([
      ['api', 'API Server', 'stateless, 3 replicas'],
      ['db', 'Database', 'primary'],
    ]);
  });

  it('makes a hop dashed with ..> and keeps -> as a solid arrow', () => {
    const m = buildModel({ edges: ['client -> api ..> client | 302'] });
    expect(m.edges.map((e) => [e.from, e.to, !!e.dashed, e.label])).toEqual([
      ['client', 'api', false, undefined],
      ['api', 'client', true, '302'],
    ]);
  });

  it('applies trailing [color, dashed] attributes to every hop', () => {
    const m = buildModel({ edges: ['api > cache > db | read [purple, dashed]'] });
    expect(m.edges.map((e) => [e.color, e.dashed])).toEqual([
      ['violet', true],
      ['violet', true],
    ]);
  });

  it('accepts color and dashed in the object form, and explains unknown colors', () => {
    const m = buildModel({
      edges: [{ from: 'api', to: 'db', color: 'grey', dashed: true, note: 'nightly backup' }],
    });
    expect(m.edges[0]).toMatchObject({ color: 'slate', dashed: true, note: 'nightly backup' });
    expect(() => buildModel({ edges: ['api > db [magenta]'] })).toThrow(SysketchError);
    expect(() => buildModel({ edges: ['api > db [magenta]'] })).toThrow(
      /unknown color "magenta"\. Use one of: blue/,
    );
  });

  it('reads legend: true', () => {
    expect(buildModel('legend: true\nedges: ["client > api"]').legend).toBe(true);
  });

  it('auto-quotes values that contain ": " instead of failing', () => {
    const m = buildModel(
      'title: URL Shortener: Read Path\nnodes:\n  api: server | API: v2\nedges:\n  - client > api',
    );
    expect(m.title).toBe('URL Shortener: Read Path');
    expect(m.nodes[0]!.label).toBe('API: v2');
  });
});

describe('0.2.0 rendering', () => {
  const size = (svg: string) =>
    /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!.slice(1).map(Number) as [number, number];

  it('grows cards for subtitles', async () => {
    const plain = await layout(buildModel({ edges: ['client > api'] }), defaultTheme);
    const sub = await layout(
      buildModel({
        nodes: { api: 'server | API | stateless, 3 replicas' },
        edges: ['client > api'],
      }),
      defaultTheme,
    );
    expect(sub.nodes.get('api')!.h).toBeGreaterThan(plain.nodes.get('api')!.h);
    expect(sub.nodes.get('api')!.subLines).toEqual(['stateless, 3 replicas']);
  });

  it('draws dashed and colored arrows, including in the sketch theme', async () => {
    const spec = 'edges:\n  - client > api | GET [green]\n  - api ..> client | 200';
    for (const theme of ['graphite', 'sketch']) {
      const svg = await render(spec, { theme });
      expect(svg).toContain('stroke-dasharray');
      expect(svg).toBe(await render(spec, { theme }));
    }
    expect(await render(spec, { theme: 'graphite' })).toContain('#4ade80'); // graphite green accent
  });

  it('adds a steps legend below the diagram', async () => {
    const spec = { edges: ['client > lb > api > db'] };
    const [w0, h0] = size(await render(spec));
    const [w1, h1] = size(await render({ ...spec, legend: true }));
    expect(h1).toBeGreaterThan(h0 + 100);
    expect(w1).toBeGreaterThanOrEqual(w0);
  });

  it('keeps "return" edges from flipping the main flow', async () => {
    const lay = await layout(
      buildModel({ edges: ['client > lb > api', 'api ..> client | 302'] }),
      defaultTheme,
    );
    expect(lay.nodes.get('client')!.x).toBeLessThan(lay.nodes.get('lb')!.x);
    expect(lay.nodes.get('lb')!.x).toBeLessThan(lay.nodes.get('api')!.x);
  });
});
