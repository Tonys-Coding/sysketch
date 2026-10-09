import { Resvg } from '@resvg/resvg-js';

/** Rasterize a sysketch SVG. Text is already paths, so no fonts are needed. */
export function svgToPng(svg: string, scale = 2): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: scale },
    font: { loadSystemFonts: false },
  });
  return resvg.render().asPng();
}
