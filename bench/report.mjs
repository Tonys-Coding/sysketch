#!/usr/bin/env node
// Turn a benchmark run into docs/benchmark.md plus side-by-side PNGs in docs/benchmark/.
//
//   node bench/report.mjs [bench/.runs/<stamp>]   (default: the latest run)
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runs = join(root, 'bench/.runs');
// One or more run folders; later ones replace earlier results for the same prompt and mode
// (e.g. re-running only the sysketch half after a sysketch change).
const latest = () =>
  join(
    runs,
    readdirSync(runs)
      .filter((d) => existsSync(join(runs, d, 'results.json')))
      .sort()
      .pop(),
  );
const runDirs = process.argv.length > 2 ? process.argv.slice(2) : [latest()];
let meta;
const merged = new Map();
for (const dir of runDirs) {
  const data = JSON.parse(readFileSync(join(dir, 'results.json'), 'utf8'));
  meta ??= data.meta;
  for (const r of data.results)
    merged.set(`${r.id}:${r.mode}`, { ...r, dir, date: data.meta.date });
}
const results = [...merged.values()];
const imgDir = join(root, 'docs/benchmark');
mkdirSync(imgDir, { recursive: true });

const get = (id, mode) => results.find((r) => r.id === id && r.mode === mode);
const n = (v) => (v == null ? 'n/a' : v.toLocaleString('en-US'));
const usd = (v) => (v == null ? 'n/a' : `$${v.toFixed(2)}`);
const x = (a, b) => (a && b ? `${(b / a).toFixed(1)}x` : 'n/a');
const sum = (mode, phase, key) =>
  results.filter((r) => r.mode === mode).reduce((s, r) => s + (r[phase][key] ?? 0), 0);

// Render in a real browser so hand-written SVGs (CSS variables, web fonts...) show as people see them.
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 600 }, colorScheme: 'light' });
async function png(svgPath, outPath) {
  if (!existsSync(svgPath)) return false;
  const src = `data:image/svg+xml;base64,${readFileSync(svgPath).toString('base64')}`;
  await page.setContent(
    `<html><body style="margin:0;background:#fff"><img id="d" src="${src}" style="display:block;width:900px"></body></html>`,
  );
  await page.waitForFunction('document.getElementById("d").complete');
  await page.locator('#d').screenshot({ path: outPath });
  return true;
}

const measured = () => {
  const when = (mode) =>
    [...new Set(results.filter((r) => r.mode === mode).map((r) => r.date))].join(', ');
  const a = when('sysketch');
  const b = when('raw');
  return a === b ? `Measured ${a}.` : `sysketch runs measured ${a}, hand-written SVG runs ${b}.`;
};

const lines = [];
const out = (s = '') => lines.push(s);
const totals = {};
for (const mode of ['sysketch', 'raw']) {
  totals[mode] = {
    create: sum(mode, 'create', 'outputTokens'),
    edit: sum(mode, 'edit', 'outputTokens'),
    cost: sum(mode, 'create', 'costUsd') + sum(mode, 'edit', 'costUsd'),
    seconds: sum(mode, 'create', 'seconds') + sum(mode, 'edit', 'seconds'),
  };
}
const s = totals.sysketch;
const r = totals.raw;

out('# Token benchmark');
out();
out(
  `The same ${meta.prompts.length} system design requests, sent to Claude Code (\`${meta.model}\`, headless) twice: once with the sysketch MCP server, once asking the model to write the SVG itself. Each run then gets one follow-up edit. ${measured()}`,
);
out();
out('## Results');
out();
out('| | sysketch | AI writes SVG | Difference |');
out('| --- | ---: | ---: | ---: |');
out(
  `| Output tokens, creating ${meta.prompts.length} diagrams | **${n(s.create)}** | ${n(r.create)} | ${x(s.create, r.create)} fewer |`,
);
out(
  `| Output tokens, ${meta.prompts.length} follow-up edits | **${n(s.edit)}** | ${n(r.edit)} | ${x(s.edit, r.edit)} fewer |`,
);
out(
  `| Total cost (${meta.prompts.length * 2} runs each) | **${usd(s.cost)}** | ${usd(r.cost)} | ${x(s.cost, r.cost)} cheaper |`,
);
out(
  `| Total time | **${Math.round(s.seconds / 60)} min** | ${Math.round(r.seconds / 60)} min | ${x(s.seconds, r.seconds)} faster |`,
);
out();
out(
  'Output tokens are what the model writes, and they count most against usage limits. Dollar cost differs less than output tokens because every Claude Code session also reads the same fixed context (system prompt, tool definitions), which is billed as cached input.',
);
out();
out('### Per diagram');
out();
out(
  '| Diagram | sysketch create | raw create | sysketch edit | raw edit | sysketch file | raw file |',
);
out('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const p of meta.prompts) {
  const a = get(p.id, 'sysketch');
  const b = get(p.id, 'raw');
  const kb = (v) => (v == null ? 'n/a' : `${(v / 1024).toFixed(1)} KB`);
  const flag = (o) => (o.ok ? '' : ' (failed)');
  out(
    `| ${p.id} | ${n(a.create.outputTokens)}${flag(a.create)} | ${n(b.create.outputTokens)}${flag(b.create)} | ${n(a.edit.outputTokens)}${flag(a.edit)} | ${n(b.edit.outputTokens)}${flag(b.edit)} | ${kb(a.edit.fileBytes)} | ${kb(b.edit.fileBytes)} |`,
  );
}
out();
out(
  'Token counts are output tokens per run (the request and every tool call it took). File sizes are after the edit.',
);
out();
out('## What each approach drew');
out();
out(
  'First drafts, screenshotted in Chromium. Left: sysketch. Right: the model writing SVG by hand.',
);
out();
for (const p of meta.prompts) {
  const pair = [];
  for (const mode of ['sysketch', 'raw']) {
    const file = `${p.id}-${mode}.png`;
    pair.push(
      (await png(join(get(p.id, mode).dir, p.id, mode, 'create.svg'), join(imgDir, file)))
        ? file
        : null,
    );
  }
  out(`**${p.id}**`);
  out();
  out('| sysketch | AI writes SVG |');
  out('| --- | --- |');
  out(
    `| ${pair.map((f) => (f ? `![${p.id}, ${f.includes('raw') ? 'raw SVG' : 'sysketch'}](benchmark/${f})` : 'no file')).join(' | ')} |`,
  );
  out();
}
out('## Method');
out();
out(
  `- Claude Code headless (\`claude -p --output-format json\`), model \`${meta.model}\`, one run per prompt and mode.`,
);
out(
  '- sysketch runs: only the sysketch MCP server (`--strict-mcp-config`), tools `render_diagram`, `list_icons`, Read, Edit, Write, Glob. No brand logos installed.',
);
out('- Raw runs: no MCP servers, tools Read, Edit, Write, Glob.');
out(
  '- Each run starts in an empty temporary folder outside any project, so no CLAUDE.md or memory is loaded. The edit runs in the same folder as its create.',
);
out(
  '- Prompts: "Create a system design diagram of _topic_", plus "Use the sysketch tools" or "Write it yourself as a polished SVG file". Edit: "Update the _id_ diagram in ./diagrams: _change_".',
);
out(
  '- Reproduce: `npm run build && node bench/run.mjs && node bench/report.mjs` (needs the Claude Code CLI; set `CLAUDE_BIN` if `claude` is not on PATH). Prompts are in [bench/prompts.json](../bench/prompts.json).',
);
out();
out('### Prompts');
out();
for (const p of meta.prompts) out(`- **${p.id}**: ${p.topic} Edit: ${p.edit}.`);
out();
out(
  'Single runs vary; treat the per-diagram numbers as indicative and the totals as the headline.',
);

await browser.close();
writeFileSync(join(root, 'docs/benchmark.md'), lines.join('\n') + '\n');
console.log(`wrote docs/benchmark.md from ${runDirs.join(', ')}`);
