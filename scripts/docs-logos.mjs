// Render the official-logo showcase in docs/logos/ (README "Official brand logos").
// usage: npm run build && node scripts/docs-logos.mjs
//
// Uses only the AWS and Azure architecture icon packs, whose terms allow their icons in
// architecture diagrams and documentation. Import them first (see the README); this
// script copies just those two packs from your logo home into a temporary one, so other
// installed logos (Simple Icons...) can't end up in the repository.
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';

const home = join(process.env.SYSKETCH_HOME ?? join(homedir(), '.sysketch'), 'logos');
const temp = mkdtempSync(join(tmpdir(), 'sysketch-logos-'));
for (const pack of ['aws', 'azure']) {
  if (!existsSync(join(home, pack))) {
    console.error(`Missing the ${pack} icon pack: npx sysketch logos import <pack.zip>`);
    process.exit(1);
  }
  cpSync(join(home, pack), join(temp, 'logos', pack), { recursive: true });
}
process.env.SYSKETCH_HOME = temp;
const { renderWithModel } = await import('../packages/sysketch/dist/index.js');

for (const name of ['aws-serverless', 'azure-events']) {
  const { svg, model } = await renderWithModel(readFileSync(`docs/logos/${name}.yaml`, 'utf8'));
  const sources = [...new Set(model.nodes.flatMap((n) => (n.logo ? [n.logo.source] : [])))];
  writeFileSync(`docs/logos/${name}.svg`, svg);
  console.log(`wrote docs/logos/${name}.svg (logos from: ${sources.join(', ')})`);
}
