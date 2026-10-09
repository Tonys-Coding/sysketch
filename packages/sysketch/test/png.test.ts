import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { render, renderToFile, svgToPng } from '../src/index.js';

const pngSize = (b: Buffer) => [b.readUInt32BE(16), b.readUInt32BE(20)];

describe('png', () => {
  it('rasterizes at the requested scale', async () => {
    const svg = await render('edges:\n  - client > api');
    const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg)!.map(Number);
    expect(pngSize(svgToPng(svg, 2))).toEqual([w! * 2, h! * 2]);
  });

  it('renderToFile picks the format from the extension', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'sysketch-'));
    const svg = await renderToFile('edges:\n  - client > api', join(dir, 'a.svg'));
    const png = await renderToFile('edges:\n  - client > api', join(dir, 'nested/a.png'), {
      scale: 1,
    });
    expect(readFileSync(svg.path, 'utf8')).toMatch(/^<svg/);
    expect(readFileSync(png.path).subarray(1, 4).toString()).toBe('PNG');
    expect(png.summary).toMatch(/2 nodes, 1 edges/);
  });
});
