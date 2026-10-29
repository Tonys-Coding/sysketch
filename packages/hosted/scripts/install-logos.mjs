// Install logos into logos/ for the hosted server (run by the Vercel build).
// - Simple Icons: same checked install as `sysketch logos install simple-icons` (npm registry
//   only, sha512 integrity). Always the latest release, so logos that brands asked Simple Icons
//   to remove go away on the next deploy. Logos listed in blocked-logos.txt are removed.
// - The official AWS and Azure architecture icon packs, published by AWS and Microsoft for
//   architecture diagrams: the exact files in cloud-packs.json, checked against their sha256,
//   imported unaltered (same as `sysketch logos import <pack>.zip`). Never committed. A pack
//   that can't be downloaded or doesn't match is skipped with a warning; /health lists the
//   sources that made it.
// usage: npm run build -w sysketch && node scripts/install-logos.mjs
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { importLogos, installSimpleIcons } from 'sysketch';

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

const packs = JSON.parse(readFileSync(new URL('../cloud-packs.json', import.meta.url), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'sysketch-packs-'));
for (const [name, pack] of Object.entries(packs)) {
  try {
    const res = await fetch(pack.url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`download failed (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    const sha = createHash('sha256').update(buf).digest('hex');
    if (sha !== pack.sha256) throw new Error(`checksum ${sha} doesn't match cloud-packs.json`);
    const zip = join(tmp, `${name}.zip`);
    writeFileSync(zip, buf);
    const r = importLogos(zip, name, { home });
    console.log(`${name}: ${r.count} icons`);
  } catch (e) {
    console.warn(
      `WARNING: ${name} icons skipped: ${e.message}. Check ${pack.page} for a new pack.`,
    );
  }
}
rmSync(tmp, { recursive: true, force: true });
