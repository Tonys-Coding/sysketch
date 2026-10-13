import { isAbsolute, resolve } from 'node:path';
import { createLogoResolver } from './logos.js';
import { buildModel, SysketchError, type BuildOptions, type Model } from './model.js';
import { renderModel, type RenderOptions } from './render.js';
import { themes } from './themes.js';

export interface RenderInputOptions {
  theme?: string;
  direction?: 'right' | 'down';
  /** false: never draw brand logos. Default: use installed logos and the spec's `logos:` folders. */
  logos?: boolean;
  /** extra logo folders checked before installed sources */
  logoDirs?: string[];
  /** folder that a spec's relative `logos: ./path` is resolved against (default: cwd) */
  baseDir?: string;
  /** logo home override (default $SYSKETCH_HOME/logos or ~/.sysketch/logos) */
  logoHome?: string;
}

function logoOption(opts: RenderInputOptions): BuildOptions['logos'] {
  if (opts.logos === false) return undefined;
  return (specValue) => {
    if (specValue === false) return undefined;
    const fromSpec =
      typeof specValue === 'string' ? [specValue] : Array.isArray(specValue) ? specValue : [];
    const base = opts.baseDir ?? process.cwd();
    return createLogoResolver({
      dirs: [
        ...(opts.logoDirs ?? []),
        ...fromSpec.map((d) => (isAbsolute(d) ? d : resolve(base, d))),
      ],
      ...(opts.logoHome ? { home: opts.logoHome } : {}),
    });
  };
}

/** Spec (YAML/JSON text or object) in, SVG string out. Deterministic. */
export async function render(
  input: string | object,
  opts: RenderInputOptions = {},
): Promise<string> {
  return (await renderWithModel(input, opts)).svg;
}

/** Like `render`, but also returns the normalized model (for summaries). */
export async function renderWithModel(
  input: string | object,
  opts: RenderInputOptions = {},
): Promise<{ svg: string; model: Model }> {
  const logos = logoOption(opts);
  const model = buildModel(input, logos ? { logos } : {});
  if (opts.direction) {
    model.direction = opts.direction;
    delete model.autoDirection;
  }
  const ro: RenderOptions = {};
  const name = opts.theme ?? model.theme;
  if (name) {
    const t = themes[name];
    if (!t) {
      throw new SysketchError(
        `Unknown theme "${name}". Available: ${Object.keys(themes).join(', ')}`,
      );
    }
    ro.theme = t;
  }
  return { svg: await renderModel(model, ro), model };
}
