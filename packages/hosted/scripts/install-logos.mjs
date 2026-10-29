// Install logos into logos/ for the hosted server (run by the Vercel build).
// - Simple Icons: same checked install as `sysketch logos install simple-icons` (npm registry
//   only, sha512 integrity). Always the latest release, so logos that brands asked Simple Icons
//   to remove go away on the next deploy. Logos listed in blocked-logos.txt are removed.
// - Official logo packs listed in logo-packs.json: the AWS, Azure and Google Cloud (core and
//   legacy) architecture icons, which the providers publish for architecture diagrams, and
//   OpenAI's Blossom mark from its brand page. The exact files, checked against their sha256,
//   imported unaltered (same as `sysketch logos import <pack>.zip`); `files` picks single files
//   out of a pack and names them. Never committed. A pack that can't be downloaded or doesn't
//   match is skipped with a warning; /health lists the sources that made it.
// usage: npm run build -w sysketch && node scripts/install-logos.mjs
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';
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

const packs = JSON.parse(readFileSync(new URL('../logo-packs.json', import.meta.url), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'sysketch-packs-'));
for (const [name, pack] of Object.entries(packs)) {
  try {
    const res = await fetch(pack.url, { signal: AbortSignal.timeout(120_000) });
    if (!res.ok) throw new Error(`download failed (${res.status})`);
    const buf = Buffer.from(await res.arrayBuffer());
    const sha = createHash('sha256').update(buf).digest('hex');
    if (sha !== pack.sha256) throw new Error(`checksum ${sha} doesn't match logo-packs.json`);
    let from = join(tmp, `${name}.zip`);
    writeFileSync(from, buf);
    if (pack.files) {
      // only the listed files, under the listed names (OpenAI.svg -> openai, title "OpenAI")
      const entries = unzipSync(new Uint8Array(buf), {
        filter: (f) => Object.values(pack.files).includes(f.name),
      });
      from = join(tmp, name);
      mkdirSync(from);
      for (const [file, path] of Object.entries(pack.files)) {
        if (!entries[path]) throw new Error(`${path} is not in the pack`);
        writeFileSync(join(from, file), entries[path]);
      }
    }
    const r = importLogos(from, name, { home });
    console.log(`${name}: ${r.count} logos`);
  } catch (e) {
    console.warn(
      `WARNING: ${name} logos skipped: ${e.message}. Check ${pack.page} for a new pack.`,
    );
  }
}
rmSync(tmp, { recursive: true, force: true });
