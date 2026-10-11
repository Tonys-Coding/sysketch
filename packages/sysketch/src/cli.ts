#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { ICONS, SysketchError, VERSION, renderToFile, themes } from './index.js';

const HELP = `sysketch ${VERSION}
  sysketch render <spec.yaml|-> [-o out.svg|out.png] [--png] [--scale 2]
                  [--direction right|down] [--theme ${Object.keys(themes).join('|')}]
  sysketch icons`;

async function main(argv: string[]): Promise<number> {
  const [cmd, ...rest] = argv;
  if (cmd === 'icons') {
    for (const i of ICONS) {
      const note = i.borrowed ? ' (art not drawn yet)' : '';
      console.log(`${i.name}${note}: ${Object.keys(i.aliases).join(', ')}`);
    }
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
  let png = false;
  let scale: number | undefined;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]!;
    if (a === '-o' || a === '--out') outPath = rest[++i];
    else if (a === '--direction') direction = rest[++i] === 'down' ? 'down' : 'right';
    else if (a === '--theme') theme = rest[++i];
    else if (a === '--png') png = true;
    else if (a === '--scale') scale = Number(rest[++i]);
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
