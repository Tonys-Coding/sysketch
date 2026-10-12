import pkg from '../package.json' with { type: 'json' };
export { buildModel, SysketchError, type Model, type Spec } from './model.js';
export { ICONS, DRAWN_ICONS, iconKeys, type IconDef } from './icons.js';
export { convertIconSvg, IconImportError, type ConvertedIcon } from './icon-import.js';
export { themes, defaultTheme, iconPaint, mix, type Theme, type Hue } from './themes.js';
export { renderModel, type RenderOptions } from './render.js';
export { render, renderWithModel, type RenderInputOptions } from './api.js';
export { svgToPng } from './png.js';
export { renderToFile, type RenderFileOptions } from './files.js';

/** The installed sysketch version (read from package.json at build time). */
export const VERSION: string = pkg.version;
export {
  createLogoResolver,
  importLogos,
  installSimpleIcons,
  listLogoSources,
  lockLogoFolder,
  logoHome,
  logoInfo,
  removeLogoSource,
  type Logo,
  type LogoMatch,
  type LogoResolver,
  type ResolverOptions,
} from './logos.js';
