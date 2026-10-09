import { buildModel, SysketchError } from './model.js';
import { renderModel, type RenderOptions } from './render.js';
import { themes } from './themes.js';

export { buildModel, SysketchError, type Model, type Spec } from './model.js';
export { ICONS, iconKeys } from './icons.js';
export { themes, lightTheme, type Theme } from './themes.js';
export { renderModel, type RenderOptions } from './render.js';

export const VERSION = '0.0.0';

/** Spec (YAML/JSON text or object) in, SVG string out. Deterministic. */
export async function render(
  input: string | object,
  opts: { theme?: string; direction?: 'right' | 'down' } = {},
): Promise<string> {
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
  return renderModel(model, ro);
}
