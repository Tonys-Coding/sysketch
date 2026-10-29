import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import { layout, nodeBox } from '../src/layout.js';
import { parsePin } from '../src/maps.js';
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

  it('drops step numbers that models put in labels', () => {
    const m = buildModel({
      edges: [
        'a/server > b/db | 1. Upload',
        'b/db > c/cache | Step 2: Save',
        'c/cache > d/queue | 3) Fetch',
      ],
    });
    expect(m.edges.map((e) => e.label)).toEqual(['Upload', 'Save', 'Fetch']);
    const kept = buildModel({ steps: false, edges: ['a/server > b/db | 1. Upload'] });
    expect(kept.edges[0]!.label).toBe('1. Upload');
    expect(buildModel({ edges: ['a/server > b/db | 2xx retries'] }).edges[0]!.label).toBe(
      '2xx retries',
    );
  });
});

describe('map backdrop', () => {
  const spec = `
nodes:
  us: cluster | US East
  eu: cluster | EU West
groups:
  Regions: [us, eu]
maps:
  Regions: world
edges:
  - us > eu
`;

  it('draws a simplified map behind the group', async () => {
    expect(await render(spec)).toContain('data-map="world"');
    expect(await render(spec.replace('maps:\n  Regions: world\n', ''))).not.toContain('data-map');
  });

  it('draws in every theme, including the hand-drawn one', async () => {
    for (const theme of ['classic', 'graphite', 'blueprint', 'midnight', 'sketch']) {
      expect(await render(spec, { theme })).toContain('data-map="world"');
    }
  });

  it('names the group when the map targets one that does not exist', () => {
    expect(() =>
      buildModel(parseYaml(spec.replace('  Regions: world', '  Regoins: world'))),
    ).toThrow(/maps\.Regoins: no group or map node with that name/);
  });

  it('rejects unknown map names', () => {
    expect(() => buildModel(parseYaml(spec.replace('world', 'mars')))).toThrow();
  });

  it('draws pins at named places and at custom coordinates', async () => {
    const svg = await render(
      spec.replace('  Regions: world', '  Regions:\n    pins: [us-east, tokyo, HQ @ -0.12 51.5]'),
    );
    expect(svg).toContain('data-pin="us-east"');
    expect(svg).toContain('data-pin="tokyo"');
    expect(svg).toContain('data-pin="HQ"');
  });

  it('suggests a place for a misspelled pin', () => {
    expect(() =>
      buildModel(parseYaml(spec.replace('  Regions: world', '  Regions:\n    pins: [us-eest]'))),
    ).toThrow(/unknown pin "us-eest".*Did you mean: us-east/);
  });
});

describe('map node', () => {
  const spec = `
nodes:
  world: world-map | Our regions
  db: database
maps:
  world:
    pins: [eu-west, sydney]
edges:
  - world > db
`;

  it('draws a big map card with pins in place of an icon', async () => {
    const svg = await render(spec);
    expect(svg).toContain('data-map="world"');
    expect(svg).toContain('data-pin="sydney"');
    for (const theme of ['classic', 'midnight', 'sketch']) {
      expect(await render(spec, { theme })).toContain('data-map="world"');
    }
  });

  it('is wider and taller than a normal node', () => {
    const normal = buildModel({ edges: ['api > db'] }).nodes[0]!;
    const big = buildModel(parseYaml(spec)).nodes[0]!;
    expect(big.map).toBeDefined();
    expect(nodeBox(big, defaultTheme).w).toBeGreaterThan(nodeBox(normal, defaultTheme).w * 2);
    expect(nodeBox(big, defaultTheme).h).toBeGreaterThan(nodeBox(normal, defaultTheme).h + 50);
  });

  it('refuses a map entry for a node that is not a map node', () => {
    expect(() =>
      buildModel(parseYaml('nodes:\n  api: server\nmaps:\n  api: world\nedges:\n  - api > db')),
    ).toThrow(/is a node without a map/);
  });
});

describe('parsePin', () => {
  it('reads place names and coordinates', () => {
    expect(parsePin('us-east')).toMatchObject({ label: 'us-east', lon: -77.4 });
    expect(parsePin('HQ @ -0.12, 51.5')).toEqual({ label: 'HQ', lon: -0.12, lat: 51.5 });
    expect(parsePin('Lab @ 10 -20')).toEqual({ label: 'Lab', lon: 10, lat: -20 });
    expect(parsePin('nowhere')).toBeUndefined();
    expect(parsePin('Far @ 200 10')).toBeUndefined();
  });
});
