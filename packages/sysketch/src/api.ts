import { buildModel, SysketchError, type Model } from './model.js';
import { renderModel, type RenderOptions } from './render.js';
import { themes } from './themes.js';

export interface RenderInputOptions {
  theme?: string;
  direction?: 'right' | 'down';
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
  const model = buildModel(input);
  if (opts.direction) model.direction = opts.direction;
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
