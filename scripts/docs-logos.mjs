// Render the logo showcase in docs/logos/ (README and docs/logos.md).
// usage: npm run build && node scripts/docs-logos.mjs
//
// Only logos that are clearly fine to publish in this repository are used:
// - Simple Icons marks whose license is recorded as open (OPEN_LOGOS below),
// - the made-up Acme logo in docs/logos/brand/,
// - the AWS and Azure architecture icon packs, whose terms allow use in architecture
//   diagrams and documentation.
// The script copies just those into a temporary logo home, so anything else installed on
// this machine can't end up in the images, and fails if a diagram draws anything else.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const OPEN_LOGOS = {
  apachekafka: 'Apache-2.0',
  apachespark: 'Apache-2.0',
  apacheflink: 'Apache-2.0',
  apacheairflow: 'Apache-2.0',
  apachecassandra: 'Apache-2.0',
  opentelemetry: 'CC-BY-4.0',
};
const DIAGRAMS = {
  mixed: ['simple-icons', 'brand'],
  'aws-serverless': ['aws'],
  'azure-events': ['azure'],
};

const home = join(process.env.SYSKETCH_HOME ?? join(homedir(), '.sysketch'), 'logos');
const temp = join(mkdtempSync(join(tmpdir(), 'sysketch-logos-')), 'logos');
const need = (dir, how) => {
  if (!existsSync(join(home, dir))) {
    console.error(`Missing ${dir}: ${how}`);
    process.exit(1);
  }
};

need('aws', 'npx sysketch logos import <AWS icon pack .zip>');
need('azure', 'npx sysketch logos import <Azure icon pack .zip>');
need('simple-icons', 'npx sysketch logos install simple-icons');
for (const pack of ['aws', 'azure']) cpSync(join(home, pack), join(temp, pack), { recursive: true });

// Simple Icons subset, with each license checked against the installed data.
const si = JSON.parse(readFileSync(join(home, 'simple-icons', 'index.json'), 'utf8'));
const subset = { ...si, logos: {} };
mkdirSync(join(temp, 'simple-icons', 'icons'), { recursive: true });
for (const [slug, license] of Object.entries(OPEN_LOGOS)) {
  const entry = si.logos[slug];
  if (entry?.license !== license) {
    console.error(`${slug}: expected license ${license}, found ${entry?.license ?? 'none'}`);
    process.exit(1);
  }
  subset.logos[slug] = entry;
  cpSync(join(home, 'simple-icons', entry.file), join(temp, 'simple-icons', entry.file));
}
writeFileSync(join(temp, 'simple-icons', 'index.json'), JSON.stringify(subset));

process.env.SYSKETCH_HOME = join(temp, '..');
const { renderWithModel } = await import('../packages/sysketch/dist/index.js');

for (const [name, allowed] of Object.entries(DIAGRAMS)) {
  const { svg, model } = await renderWithModel(readFileSync(`docs/logos/${name}.yaml`, 'utf8'), {
    baseDir: 'docs/logos',
  });
  const sources = [...new Set(model.nodes.flatMap((n) => (n.logo ? [n.logo.source] : [])))];
  const stray = sources.filter((s) => !allowed.includes(s));
  if (stray.length) {
    console.error(`docs/logos/${name}: unexpected logo source ${stray.join(', ')}`);
    process.exit(1);
  }
  writeFileSync(`docs/logos/${name}.svg`, svg);
  console.log(`wrote docs/logos/${name}.svg (logos from: ${sources.join(', ')})`);
}
