import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from '../src/index.js';

const example = (name: string) =>
  readFileSync(new URL(`../../../examples/${name}.yaml`, import.meta.url), 'utf8');

describe('render', () => {
  it('is deterministic', async () => {
    const spec = example('url-shortener');
    expect(await render(spec)).toBe(await render(spec));
  });

  it('draws text as paths, never <text>, and keeps accessibility tags', async () => {
    const svg = await render(example('url-shortener'));
    expect(svg).not.toContain('<text');
    expect(svg).toContain('<title>URL Shortener</title>');
    expect(svg).toContain('role="img"');
  });

  it('defines each glyph once and reuses it', async () => {
    const svg = await render('edges: ["client > api | Service Service Service"]');
    const ids = [...svg.matchAll(/<path id="(t\d+-\d+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(5);
    expect((svg.match(/<use xlink:href="#t/g) ?? []).length).toBeGreaterThan(ids.length);
    expect(svg).toContain('xmlns:xlink="http://www.w3.org/1999/xlink"');
  });

  it('supports vertical direction', async () => {
    const down = await render('edges:\n  - client > lb > api', { direction: 'down' });
    const right = await render('edges:\n  - client > lb > api');
    const size = (s: string) =>
      /viewBox="0 0 (\d+) (\d+)"/.exec(s)!.slice(1).map(Number) as [number, number];
    expect(size(down)[1]).toBeGreaterThan(size(down)[0]);
    expect(size(right)[0]).toBeGreaterThan(size(right)[1]);
  });

  it('keeps the reference spec tiny', () => {
    expect(example('url-shortener').length).toBeLessThan(260);
  });

  it.each(['url-shortener', 'web-scale', 'microservices'])(
    'matches the golden SVG for %s',
    async (name) => {
      await expect(await render(example(name))).toMatchFileSnapshot(
        `../../../examples/${name}.svg`,
      );
    },
  );
});

describe('themes', () => {
  it.each(['graphite', 'blueprint', 'midnight', 'classic', 'sketch'])(
    'renders with %s',
    async (theme) => {
      const svg = await render(example('web-scale'), { theme });
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).not.toContain('<text');
    },
  );

  it('reads the theme from the spec, and rejects unknown themes', async () => {
    const dark = await render('theme: midnight\nedges:\n  - client > api');
    expect(dark).toContain('#070b16');
    await expect(render('theme: neon\nedges:\n  - client > api')).rejects.toThrow(
      /Unknown theme "neon"\. Available: sketch, graphite, blueprint, midnight, classic/,
    );
  });
});

describe('sketch theme', () => {
  it('is deterministic and draws rough paths instead of crisp shapes', async () => {
    const spec = example('url-shortener');
    const a = await render(spec, { theme: 'sketch' });
    expect(a).toBe(await render(spec, { theme: 'sketch' }));
    expect(a).not.toMatch(/<rect x=|<circle |<ellipse /);
  });
});
