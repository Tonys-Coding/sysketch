#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { ICONS, SysketchError, VERSION, render } from './index.js';

const HELP = `sysketch ${VERSION}
  sysketch render <spec.yaml|-> [-o out.svg] [--direction right|down] [--theme graphite|blueprint|midnight|classic]
  sysketch icons`;

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  if (cmd === 'icons') {
    for (const i of ICONS) console.log(`${i.name}: ${Object.keys(i.aliases).join(', ')}`);
    return 0;
  }
  if (cmd !== 'render') {
    console.log(HELP);
    return cmd === undefined || cmd === '--help' ? 0 : 1;
  }

  let file: string | undefined;
  let outPath: string | undefined;
  let direction: 'right' | 'down' | undefined;
  let theme: string | undefined;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === '-o' || a === '--out') outPath = rest[++i];
    else if (a === '--direction') direction = rest[++i] === 'down' ? 'down' : 'right';
    else if (a === '--theme') theme = rest[++i];
    else file = a;
  }
  if (!file) {
    console.error('Missing spec file. ' + HELP);
    return 1;
  }

  const text = readFileSync(file === '-' ? 0 : file, 'utf8');
  const svg = await render(text, {
    ...(direction ? { direction } : {}),
    ...(theme ? { theme } : {}),
  });
  const dest = outPath ?? (file === '-' ? 'diagram.svg' : `${basename(file, extname(file))}.svg`);
  writeFileSync(dest, svg);
  const m = /viewBox="0 0 (\d+) (\d+)"/.exec(svg);
  console.log(`wrote ${dest} (${m?.[1]}x${m?.[2]}, ${(svg.length / 1024).toFixed(1)} KB)`);
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
