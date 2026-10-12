import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, extname } from 'node:path';
import { renderWithModel, type RenderInputOptions } from './api.js';
import { svgToPng } from './png.js';

export interface RenderFileOptions extends RenderInputOptions {
  /** PNG zoom factor (default 2). Ignored for SVG. */
  scale?: number;
}

/**
 * Render a spec and write it to `out` (.svg or .png, chosen by extension).
 * Returns a one-line summary meant to be cheap for an LLM to read.
 */
export async function renderToFile(
  input: string | object,
  out: string,
  opts: RenderFileOptions = {},
): Promise<{ path: string; summary: string; png?: Buffer }> {
  const { svg, model } = await renderWithModel(input, opts);
  const [, w, h] = /viewBox="0 0 (\d+) (\d+)"/.exec(svg) ?? [];
  mkdirSync(dirname(out), { recursive: true });
  const isPng = extname(out).toLowerCase() === '.png';
  const scale = opts.scale ?? 2;
  const data = isPng ? svgToPng(svg, scale) : svg;
  writeFileSync(out, data);
  const size = isPng
    ? `${Math.round(Number(w) * scale)}x${Math.round(Number(h) * scale)}`
    : `${w}x${h}`;
  const summary =
    `wrote ${out} (${size}, ${model.nodes.length} nodes, ${model.edges.length} edges, ` +
    `${(data.length / 1024).toFixed(1)} KB)`;
  return isPng ? { path: out, summary, png: data as Buffer } : { path: out, summary };
}
