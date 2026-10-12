#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { ICONS, SysketchError, VERSION, renderToFile, themes } from './index.js';
import {
  createLogoResolver,
  importLogos,
  installSimpleIcons,
  listLogoSources,
  lockLogoFolder,
  logoHome,
  logoInfo,
  removeLogoSource,
} from './logos.js';
import { PRODUCTS } from './products.js';

const HELP = `sysketch ${VERSION}
  sysketch render <spec.yaml|-> [-o out.svg|out.png] [--png] [--scale 2]
                  [--direction right|down] [--theme ${Object.keys(themes).join('|')}]
                  [--logos <folder>] [--no-logos]
  sysketch icons
  sysketch logos                         list installed logo sources
  sysketch logos install simple-icons    download official brand marks (npm, integrity-checked)
  sysketch logos import <folder|zip> [--as <name>]   add an AWS/Azure/Google Cloud icon pack
                                         or a company logo folder
  sysketch logos lock <folder>           fingerprint a project logo folder
  sysketch logos find <text>             search installed logos
  sysketch logos info <name>             source, license and brand guidelines for a logo
  sysketch logos remove <name>`;

async function logosCmd(args: string[]): Promise<number> {
  const [sub, ...rest] = args;
  const flag = (f: string) => {
    const i = rest.indexOf(f);
    return i === -1 ? undefined : rest[i + 1];
  };
  const positional = rest.filter((a, i) => !a.startsWith('--') && !rest[i - 1]?.startsWith('--'));
  if (!sub) {
    const list = listLogoSources();
    if (!list.length)
      console.log(`No logos installed (${logoHome()}). Try: sysketch logos install simple-icons`);
    for (const s of list)
      console.log(`${s.source}${s.version ? ` ${s.version}` : ''}: ${s.count} logos`);
    return 0;
  }
  if (sub === 'install') {
    if (positional[0] !== 'simple-icons') {
      console.error(
        'Only "simple-icons" downloads automatically. For AWS, Azure or Google Cloud icon packs, download the ' +
          'pack from the vendor (accepting its terms), then run: sysketch logos import <downloaded.zip>',
      );
      return 1;
    }
    const version = flag('--version');
    const r = await installSimpleIcons(version ? { version } : {});
    console.log(`installed simple-icons ${r.version}: ${r.count} logos in ${r.dir}`);
    console.log("Check each brand's guidelines before publishing: sysketch logos info <name>");
    return 0;
  }
  if (sub === 'import') {
    const name = flag('--as');
    if (!positional[0]) {
      console.error('Usage: sysketch logos import <folder|pack.zip> [--as <name>]');
      return 1;
    }
    const r = importLogos(positional[0], name);
    console.log(`imported ${r.count} logos as "${r.source}" into ${r.dir}`);
    return 0;
  }
  if (sub === 'lock') {
    if (!positional[0]) return (console.error('Usage: sysketch logos lock <folder>'), 1);
    const r = lockLogoFolder(positional[0]);
    console.log(`fingerprinted ${r.count} logos: ${r.path}`);
    return 0;
  }
  if (sub === 'find') {
    const hits = createLogoResolver().search(positional.join(' '), 50);
    for (const h of hits) console.log(`${h.key}  ${h.title} (${h.source})`);
    if (!hits.length) console.log('no matches');
    return 0;
  }
  if (sub === 'info') {
    const info = positional[0] ? logoInfo(positional[0]) : undefined;
    if (!info) return (console.error('No installed logo by that name.'), 1);
    console.log(`${info.title} (${info.name}) from ${info.source}`);
    if (info.license) console.log(`license: ${info.license}`);
    if (info.guidelines) console.log(`brand guidelines: ${info.guidelines}`);
    if (info.origin) console.log(`original artwork: ${info.origin}`);
    console.log(`sha256: ${info.sha256}`);
    return 0;
  }
  if (sub === 'remove') {
    const ok = positional[0] ? removeLogoSource(positional[0]) : false;
    console.log(ok ? `removed ${positional[0]}` : 'No installed source by that name.');
    return ok ? 0 : 1;
  }
  console.log(HELP);
  return 1;
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  if (cmd === 'icons') {
    for (const i of ICONS) {
      const note = i.borrowed ? ' (art not drawn yet)' : '';
      console.log(`${i.name}${note}: ${Object.keys(i.aliases).join(', ')}`);
    }
    console.log(`\nProducts (an installed logo, else the icon shown):`);
    const byIcon = new Map<string, string[]>();
    for (const [name, [icon]] of Object.entries(PRODUCTS))
      byIcon.set(icon, [...(byIcon.get(icon) ?? []), name]);
    for (const [icon, names] of byIcon) console.log(`${icon}: ${names.join(', ')}`);
    return 0;
  }
  if (cmd === 'logos') return logosCmd(rest);
  if (cmd !== 'render') {
    console.log(HELP);
    return cmd === undefined || cmd === '--help' ? 0 : 1;
  }

  let file: string | undefined;
  let outPath: string | undefined;
  let direction: 'right' | 'down' | undefined;
  let theme: string | undefined;
  let png = false;
  let scale: number | undefined;
  let logos = true;
  const logoDirs: string[] = [];
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === '-o' || a === '--out') outPath = rest[++i];
    else if (a === '--direction') direction = rest[++i] === 'down' ? 'down' : 'right';
    else if (a === '--theme') theme = rest[++i];
    else if (a === '--png') png = true;
    else if (a === '--scale') scale = Number(rest[++i]);
    else if (a === '--no-logos') logos = false;
    else if (a === '--logos') logoDirs.push(rest[++i]!);
    else file = a;
  }
  if (!file) {
    console.error('Missing spec file. ' + HELP);
    return 1;
  }

  const text = readFileSync(file === '-' ? 0 : file, 'utf8');
  const ext = png ? '.png' : '.svg';
  const dest =
    outPath ?? (file === '-' ? `diagram${ext}` : `${basename(file, extname(file))}${ext}`);
  const { summary } = await renderToFile(text, dest, {
    ...(direction ? { direction } : {}),
    ...(theme ? { theme } : {}),
    ...(scale ? { scale } : {}),
    ...(logos ? {} : { logos: false }),
    ...(logoDirs.length ? { logoDirs } : {}),
    baseDir: file === '-' ? process.cwd() : dirname(resolve(file)),
  });
  console.log(summary);
  return 0;
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err) => {
    console.error(
      err instanceof SysketchError ? err.message : `Unexpected error: ${(err as Error).message}`,
    );
    process.exit(1);
  },
);
