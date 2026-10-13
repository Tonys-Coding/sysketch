#!/usr/bin/env node
// Token benchmark: the same prompts through headless Claude Code, once with the sysketch
// MCP server and once with the model writing the SVG itself, plus one follow-up edit each.
//
//   npm run build && node bench/run.mjs [--model sonnet] [--only url-shortener] [--modes sysketch,raw] [--jobs 3]
//
// Needs the Claude Code CLI: `claude` on PATH, or CLAUDE_BIN=/path/to/claude.
// Results go to bench/.runs/<timestamp>/ (gitignored); bench/report.mjs turns them into docs.
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? dflt : args[i + 1];
};
const model = opt('model', 'sonnet');
const jobs = Number(opt('jobs', '3'));
const only = opt('only', '');
const modes = opt('modes', 'sysketch,raw').split(',');
const claude = process.env.CLAUDE_BIN ?? 'claude';
const mcpCli = join(root, 'packages/mcp/dist/cli.js');
if (!existsSync(mcpCli)) throw new Error('Build first: npm run build');

const prompts = JSON.parse(readFileSync(join(root, 'bench/prompts.json'), 'utf8')).filter(
  (p) => !only || p.id === only,
);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
// Runs happen outside the repo so Claude Code doesn't load this project's CLAUDE.md;
// everything is copied to bench/.runs/<stamp>/ at the end.
const work = join(tmpdir(), 'sysketch-bench', stamp);
const out = join(root, 'bench/.runs', stamp);
const emptyHome = join(work, '.sysketch-home'); // no logos: results must not depend on the machine
mkdirSync(emptyHome, { recursive: true });

const MODES = {
  sysketch: {
    create: (p) =>
      `Create a system design diagram of ${p.topic} Use the sysketch tools and save it as ./diagrams/${p.id}.svg.`,
    tools: 'mcp__sysketch__render_diagram,mcp__sysketch__list_icons,Read,Edit,Write,Glob',
    mcp: true,
  },
  raw: {
    create: (p) =>
      `Create a system design diagram of ${p.topic} Write it yourself as a polished SVG file at ./diagrams/${p.id}.svg.`,
    tools: 'Read,Edit,Write,Glob',
    mcp: false,
  },
};
const editPrompt = (p) => `Update the ${p.id} diagram in ./diagrams: ${p.edit}.`;

function runClaude(cwd, prompt, mode) {
  const a = [
    '-p',
    prompt,
    '--model',
    model,
    '--output-format',
    'json',
    '--allowedTools',
    MODES[mode].tools,
  ];
  if (MODES[mode].mcp) {
    const cfg = join(cwd, 'mcp.json');
    writeFileSync(
      cfg,
      JSON.stringify({ mcpServers: { sysketch: { command: process.execPath, args: [mcpCli] } } }),
    );
    a.push('--mcp-config', cfg, '--strict-mcp-config');
  } else {
    a.push('--strict-mcp-config');
  }
  return new Promise((done) => {
    const child = spawn(claude, a, {
      cwd,
      env: { ...process.env, SYSKETCH_HOME: emptyHome },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => {
      try {
        done({ code, ...JSON.parse(stdout) });
      } catch {
        done({ code, is_error: true, error: (stderr || stdout).slice(0, 500) });
      }
    });
  });
}

function summarize(r, file) {
  const u = r.usage ?? {};
  return {
    ok: !r.is_error && existsSync(file),
    outputTokens: u.output_tokens ?? null,
    inputTokens:
      (u.input_tokens ?? 0) +
      (u.cache_creation_input_tokens ?? 0) +
      (u.cache_read_input_tokens ?? 0),
    costUsd: r.total_cost_usd ?? null,
    turns: r.num_turns ?? null,
    seconds: r.duration_ms ? Math.round(r.duration_ms / 100) / 10 : null,
    fileBytes: existsSync(file) ? statSync(file).size : null,
    ...(r.error ? { error: r.error } : {}),
  };
}

async function one(p, mode) {
  const cwd = join(work, p.id, mode);
  mkdirSync(join(cwd, 'diagrams'), { recursive: true });
  const file = join(cwd, 'diagrams', `${p.id}.svg`);
  const create = await runClaude(cwd, MODES[mode].create(p), mode);
  writeFileSync(join(cwd, 'create.json'), JSON.stringify(create, null, 1));
  const c = summarize(create, file);
  if (existsSync(file)) writeFileSync(join(cwd, 'create.svg'), readFileSync(file));
  const edit = await runClaude(cwd, editPrompt(p), mode);
  writeFileSync(join(cwd, 'edit.json'), JSON.stringify(edit, null, 1));
  const e = summarize(edit, file);
  console.log(
    `${p.id.padEnd(16)} ${mode.padEnd(9)} create ${c.outputTokens} out / $${c.costUsd?.toFixed(3)}  ` +
      `edit ${e.outputTokens} out / $${e.costUsd?.toFixed(3)}${c.ok && e.ok ? '' : '  (FAILED)'}`,
  );
  return { id: p.id, mode, create: c, edit: e };
}

const tasks = prompts.flatMap((p) => modes.map((mode) => () => one(p, mode)));
const results = [];
await Promise.all(
  Array.from({ length: Math.min(jobs, tasks.length) }, async () => {
    while (tasks.length) results.push(await tasks.shift()());
  }),
);
const meta = { stamp, model, date: new Date().toISOString().slice(0, 10), prompts };
writeFileSync(join(work, 'results.json'), JSON.stringify({ meta, results }, null, 1));
cpSync(work, out, { recursive: true, filter: (f) => !f.includes('.sysketch-home') });
console.log(`\nresults: ${join(out, 'results.json')}`);
