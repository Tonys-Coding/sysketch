// Install Simple Icons into logos/ for the hosted server (run by the Vercel build).
// Same checked install as `sysketch logos install simple-icons` (npm registry only, sha512
// integrity). Always the latest release, so logos that brands asked Simple Icons to remove go
// away on the next deploy. Logos listed in blocked-logos.txt are removed afterwards.
// usage: npm run build -w sysketch && node scripts/install-logos.mjs
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSimpleIcons } from 'sysketch';

const home = fileURLToPath(new URL('../logos', import.meta.url));
const r = await installSimpleIcons({ home });

const blocked = readFileSync(new URL('../blocked-logos.txt', import.meta.url), 'utf8')
  .split('\n')
  .map((l) => l.replace(/#.*/, '').trim().toLowerCase())
  .filter(Boolean);
const indexPath = join(r.dir, 'index.json');
const index = JSON.parse(readFileSync(indexPath, 'utf8'));
const removed = [];
for (const slug of blocked) {
  const entry = index.logos[slug];
  if (!entry) continue;
  rmSync(join(r.dir, entry.file), { force: true });
  delete index.logos[slug];
  removed.push(slug);
}
writeFileSync(indexPath, JSON.stringify(index, null, 1));
console.log(
  `simple-icons ${r.version}: ${r.count - removed.length} logos` +
    (removed.length ? ` (blocked: ${removed.join(', ')})` : ''),
);
