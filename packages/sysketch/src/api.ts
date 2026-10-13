import { existsSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
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
  /**
   * If set, logo folders named in the spec (`logos: ./brand`) must be inside this folder.
   * Use it when the spec comes from an untrusted source, such as an AI model.
   */
  logoRoot?: string;
}

const within = (root: string, p: string) => {
  const r = relative(resolve(root), resolve(p));
  return r === '' || (!r.startsWith('..') && !isAbsolute(r));
};

/** Real path (symlinks followed) when the path exists, so links can't escape a root. */
const realpath = (p: string) => (existsSync(p) ? realpathSync(p) : resolve(p));

function logoOption(opts: RenderInputOptions): BuildOptions['logos'] {
  if (opts.logos === false) return undefined;
  return (specValue) => {
    if (specValue === false) return undefined;
    const fromSpec =
      typeof specValue === 'string' ? [specValue] : Array.isArray(specValue) ? specValue : [];
    const base = opts.baseDir ?? process.cwd();
    const specDirs = fromSpec.map((d) => (isAbsolute(d) ? d : resolve(base, d)));
    const root = opts.logoRoot;
    const outside = root ? specDirs.find((d) => !within(realpath(root), realpath(d))) : undefined;
    if (outside) throw new SysketchError(`Logo folder ${outside} must be inside ${root}.`);
    return createLogoResolver({
      dirs: [...(opts.logoDirs ?? []), ...specDirs],
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
