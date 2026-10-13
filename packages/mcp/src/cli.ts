#!/usr/bin/env node
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

/**
 * The folder diagrams are read from and saved to: `--dir <path>`, else $SYSKETCH_DIR, else
 * the folder the client started us in. Desktop apps (Claude Desktop) often start servers in
 * `/`, which is neither writable nor a sensible project, so that falls back to ~/sysketch.
 */
function projectDir(argv: string[]): string {
  const i = argv.indexOf('--dir');
  const chosen = (i !== -1 ? argv[i + 1] : undefined) ?? process.env.SYSKETCH_DIR;
  const expand = (p: string) => (p === '~' || p.startsWith('~/') ? join(homedir(), p.slice(1)) : p);
  const dir = chosen
    ? resolve(expand(chosen))
    : process.cwd() === '/'
      ? join(homedir(), 'sysketch')
      : process.cwd();
  mkdirSync(dir, { recursive: true });
  return dir;
}

const dir = projectDir(process.argv.slice(2));
await createServer(dir, { fullPaths: dir !== process.cwd() }).connect(new StdioServerTransport());
