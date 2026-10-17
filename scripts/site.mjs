// Build the GitHub Pages site into _site/ from site/ plus the repo's own images and fonts.
// usage: node scripts/site.mjs   (the Pages workflow runs it; preview with any static server)
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { render } from 'sysketch';

const OUT = '_site';
rmSync(OUT, { recursive: true, force: true });
const copy = (from, to = from) => {
  mkdirSync(dirname(`${OUT}/${to}`), { recursive: true });
  cpSync(from, `${OUT}/${to}`);
};

// Diagrams are drawn fresh with their nodes and edges tagged (annotate), so app.js can send
// packets along the arrows. Without product logos they match the committed example images.
const draw = (file) => render(readFileSync(file, 'utf8'), { logos: false, annotate: true });
const size = (svg) => /viewBox="0 0 (\d+) (\d+)"/.exec(svg).slice(1);

for (const f of ['styles.css', 'app.js']) copy(`site/${f}`, f);
const hero = await draw('site/hero.yaml');
writeFileSync(`${OUT}/hero.svg`, hero);
const [heroW, heroH] = size(hero);
// cache-busting: browsers and the Pages CDN keep old CSS/JS for a while after a deploy
const hash = (f) =>
  createHash('sha256')
    .update(readFileSync(`site/${f}`))
    .digest('hex')
    .slice(0, 10);
writeFileSync(
  `${OUT}/index.html`,
  readFileSync('site/index.html', 'utf8')
    .replace('href="styles.css"', `href="styles.css?v=${hash('styles.css')}"`)
    .replace('src="app.js"', `src="app.js?v=${hash('app.js')}"`)
    .replaceAll('HERO_W', heroW)
    .replaceAll('HERO_H', heroH),
);
writeFileSync(`${OUT}/.nojekyll`, '');

const fonts = {
  'shantell-sans-latin-600-normal.woff': 'packages/sysketch/assets',
  'shantell-sans-latin-800-normal.woff': 'packages/sysketch/assets',
  'jetbrains-mono-latin-500-normal.woff': 'packages/sysketch/assets',
  'atkinson-hyperlegible-next-latin-400-normal.woff2':
    'node_modules/@fontsource/atkinson-hyperlegible-next/files',
  'atkinson-hyperlegible-next-latin-600-normal.woff2':
    'node_modules/@fontsource/atkinson-hyperlegible-next/files',
};
for (const [f, dir] of Object.entries(fonts)) copy(`${dir}/${f}`, `fonts/${f}`);

for (const f of [
  'sysketch-wordmark.svg',
  'sysketch-icon.svg',
  'sysketch-icon-512.png',
  'social-preview.png',
]) {
  copy(`docs/brand/${f}`, `brand/${f}`);
}
// dark header: the same wordmark with light ink (the marker colors stay)
writeFileSync(
  `${OUT}/brand/sysketch-wordmark-dark.svg`,
  readFileSync('docs/brand/sysketch-wordmark.svg', 'utf8').replaceAll('#1f2328', '#f1f3f5'),
);
for (const f of ['ride-sharing-raw.png', 'ride-sharing-sysketch.png'])
  copy(`docs/benchmark/${f}`, `benchmark/${f}`);
for (const t of ['sketch', 'graphite', 'blueprint', 'midnight', 'classic'])
  copy(`docs/themes/${t}.svg`, `themes/${t}.svg`);

const EXAMPLES = {
  'rate-limited-api': { note: '', alt: 'A rate-limited API platform' },
  'web-scale': {
    note: 'The everyday architecture diagram: users, a load balancer, app servers, a cache, a database and background work.',
    alt: 'Scaling a web app: load balancer, API servers, cache, database, queue and worker',
  },
  'login-sequence': {
    note: 'Add type: sequence and the same arrows become a timeline: who calls whom, in order, with dashed replies.',
    alt: 'A sign-in sequence diagram between user, web app, API, auth service and user database',
  },
  'aws-network': {
    note: 'Groups inside groups draw cloud networks: region, VPC and subnets. Thick arrows mark the hot path; two-way arrows show both directions.',
    alt: 'A web app inside nested AWS region, VPC and subnet groups',
  },
  'event-analytics': {
    note: 'Long flows fold into rows, so a pipeline still fits a page and reads left to right.',
    alt: 'An event-driven analytics pipeline folded into rows',
  },
};
const presets = {};
mkdirSync(`${OUT}/examples`, { recursive: true });
for (const [name, meta] of Object.entries(EXAMPLES)) {
  writeFileSync(`${OUT}/examples/${name}.svg`, await draw(`examples/${name}.yaml`));
  presets[name] = {
    ...meta,
    spec: readFileSync(`examples/${name}.yaml`, 'utf8'),
    svg: `examples/${name}.svg`,
  };
}
copy('docs/logos/mixed.svg', 'logos/mixed.svg');
presets.logos = {
  spec: readFileSync('docs/logos/mixed.yaml', 'utf8'),
  svg: 'logos/mixed.svg',
  alt: 'An analytics pipeline mixing a company logo, open-source product logos and sysketch icons',
  note: 'Product names show their official logo when one is available, unaltered: here Apache Kafka, Spark, Flink, Airflow and Cassandra (Apache License 2.0) and OpenTelemetry (CC BY 4.0) from Simple Icons, next to a made-up company logo and sysketch icons. Names and logos belong to their owners.',
};
writeFileSync(`${OUT}/presets.json`, JSON.stringify(presets));
console.log(`site built in ${OUT}/`);
