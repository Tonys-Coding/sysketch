// Regenerate every diagram image the README and docs use, from the example specs.
// usage: npm run build && node scripts/docs.mjs
//
// Always renders with an empty logo home, so brand logos installed on this machine
// never end up in the repository's images.
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.SYSKETCH_HOME = mkdtempSync(join(tmpdir(), 'sysketch-docs-'));
const { render, svgToPng } = await import('../packages/sysketch/dist/index.js');

const spec = (name) => readFileSync(`examples/${name}.yaml`, 'utf8');
const write = (path, data) => {
  writeFileSync(path, data);
  console.log(`wrote ${path}`);
};

// Golden examples (also checked by the core test suite).
for (const f of readdirSync('examples')
  .filter((f) => f.endsWith('.yaml'))
  .sort()) {
  const name = f.replace(/\.yaml$/, '');
  write(`examples/${name}.svg`, await render(spec(name)));
}

// Theme strip.
for (const theme of ['sketch', 'graphite', 'blueprint', 'midnight', 'classic']) {
  write(`docs/themes/${theme}.svg`, await render(spec('url-shortener'), { theme }));
}

// Showcase.
const showcase = {
  'secure-data-platform-blueprint': ['secure-data-platform', 'blueprint'],
  'smart-commerce-midnight': ['smart-commerce', 'midnight'],
};
for (const [out, [name, theme]] of Object.entries(showcase)) {
  write(`docs/showcase/${out}.svg`, await render(spec(name), { theme }));
}

// PNG for the npm READMEs (npm can't show repo-relative SVGs).
write('docs/hero.png', svgToPng(await render(spec('rate-limited-api')), 1));
