import { deflateRawSync, inflateRawSync } from 'node:zlib';
import { buildModel, renderWithModel, svgToPng, SysketchError, themes, type Model } from 'sysketch';

/**
 * Anyone on the internet can call the hosted server, so every render is bounded. The limits
 * are far above real diagrams (the 20-service e-commerce test spec is 2.5 KB, 20 nodes).
 */
export const LIMITS = {
  specChars: 20_000,
  /** encoded spec in a link (deflate + base64url) */
  codeChars: 8_000,
  nodes: 120,
  edges: 300,
  /** longest side of a PNG, in pixels */
  pngSide: 4_000,
  /** width of the preview image returned to the model (~1k tokens) */
  previewWidth: 800,
};

export type Format = 'svg' | 'png' | 'yaml';

/** Spec text to a short, URL-safe code. The same spec always gives the same code. */
export function encodeSpec(spec: string): string {
  return deflateRawSync(Buffer.from(spec, 'utf8'), { level: 9 }).toString('base64url');
}

export function decodeSpec(code: string): string {
  if (code.length > LIMITS.codeChars || !/^[\w-]+$/.test(code)) {
    throw new SysketchError('Invalid diagram link.');
  }
  try {
    // maxOutputLength stops compression bombs before they use memory.
    const raw = inflateRawSync(Buffer.from(code, 'base64url'), {
      maxOutputLength: LIMITS.specChars * 4,
    });
    return raw.toString('utf8');
  } catch {
    throw new SysketchError('Invalid diagram link.');
  }
}

export function checkTheme(theme: string | undefined): void {
  if (theme !== undefined && !themes[theme]) {
    throw new SysketchError(
      `Unknown theme "${theme}". Available: ${Object.keys(themes).join(', ')}`,
    );
  }
}

/** Render a spec with no brand logos (the hosted server never serves logos). */
export async function renderSpec(
  spec: string,
  theme?: string,
): Promise<{ svg: string; model: Model; width: number; height: number }> {
  if (spec.length > LIMITS.specChars) {
    throw new SysketchError(`Spec is too long (max ${LIMITS.specChars} characters).`);
  }
  checkTheme(theme);
  const size = buildModel(spec);
  if (size.nodes.length > LIMITS.nodes || size.edges.length > LIMITS.edges) {
    throw new SysketchError(
      `Diagram is too big (max ${LIMITS.nodes} nodes and ${LIMITS.edges} edges). Split it into several diagrams.`,
    );
  }
  const { svg, model } = await renderWithModel(spec, {
    logos: false,
    ...(theme ? { theme } : {}),
  });
  const [, w = '0', h = '0'] = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg) ?? [];
  return { svg, model, width: Number(w), height: Number(h) };
}

/** PNG at 2x, scaled down so the longest side stays within the limit. */
export function toPng(svg: string, width: number, height: number, maxWidth?: number): Buffer {
  let scale = Math.min(2, LIMITS.pngSide / Math.max(width, height, 1));
  if (maxWidth) scale = Math.min(scale, maxWidth / Math.max(width, 1));
  return svgToPng(svg, scale);
}
