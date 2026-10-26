import type { Day, Stats } from './usage.js';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmt = (n: number) => n.toLocaleString('en-US');

function sum(days: Day[], field: 'renders' | 'errors'): number {
  return days.reduce((n, d) => n + d[field], 0);
}

function merge(days: Day[], field: 'types' | 'apps' | 'clients'): [string, number][] {
  const out: Record<string, number> = {};
  for (const d of days) for (const [k, v] of Object.entries(d[field])) out[k] = (out[k] ?? 0) + v;
  return Object.entries(out).sort((a, b) => b[1] - a[1]);
}

function list(title: string, rows: [string, number][], note: string): string {
  const body = rows.length
    ? rows.map(([k, v]) => `<li><span>${esc(k)}</span><b>${fmt(v)}</b></li>`).join('')
    : '<li class="none">Nothing yet</li>';
  return `<section><h2>${title}</h2><p class="note">${note}</p><ul class="kv">${body}</ul></section>`;
}

/** The owner's usage page: totals, breakdowns and the last 30 days. */
export function statsPage(s: Stats): string {
  const week = s.days.slice(0, 7);
  const peak = Math.max(1, ...s.days.map((d) => d.renders));
  const tiles: [string, number][] = [
    ['Diagrams drawn, all time', s.total.renders],
    ['Last 7 days', sum(week, 'renders')],
    ['Last 30 days', sum(s.days, 'renders')],
    ['Today (UTC)', s.days[0]?.renders ?? 0],
  ];
  const rows = s.days
    .map(
      (d) =>
        `<tr><td>${d.day}</td><td class="n">${fmt(d.renders)}<span class="bar" style="width:${Math.round((d.renders / peak) * 100)}%"></span></td><td class="n">${fmt(d.errors)}</td><td class="n">${fmt(d.sources)}</td></tr>`,
    )
    .join('');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>sysketch usage</title>
<style>
:root { --bg:#fbf8f1; --card:#fffdf7; --ink:#1f2430; --muted:#5b6372; --line:#e3ddcf; --bar:#f783ac; color-scheme:light; }
@media (prefers-color-scheme: dark) {
  :root { --bg:#15181f; --card:#1c1f27; --ink:#eceae4; --muted:#a3a9b5; --line:#2f333d; --bar:#f783ac; color-scheme:dark; }
}
* { box-sizing:border-box; }
body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif; }
main { max-width:960px; margin:0 auto; padding:32px 16px 64px; }
h1 { font-size:1.5rem; margin:0 0 4px; }
h2 { font-size:1rem; margin:0 0 2px; }
.note, .sub { color:var(--muted); font-size:.88rem; margin:0 0 10px; }
.tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin:20px 0 28px; }
.tile { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; }
.tile b { display:block; font-size:1.8rem; font-variant-numeric:tabular-nums; }
.tile span { color:var(--muted); font-size:.85rem; }
.cols { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:24px; margin-bottom:28px; }
.kv { list-style:none; margin:0; padding:0; }
.kv li { display:flex; justify-content:space-between; gap:12px; padding:5px 0; border-bottom:1px solid var(--line); }
.kv b { font-variant-numeric:tabular-nums; }
.none { color:var(--muted); }
.table { overflow-x:auto; }
table { width:100%; border-collapse:collapse; font-variant-numeric:tabular-nums; }
th, td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); white-space:nowrap; }
th { color:var(--muted); font-weight:600; font-size:.85rem; }
td.n, th.n { text-align:right; }
td.n { position:relative; }
.bar { position:absolute; right:0; bottom:2px; height:3px; background:var(--bar); border-radius:2px; }
</style>
</head>
<body>
<main>
<h1>sysketch usage</h1>
<p class="sub">Hosted connector only (local installs aren't counted). ${s.since ? `Counting since ${s.since}. ` : ''}${fmt(s.total.errors)} failed attempts all time. Your own tests count too.</p>
<div class="tiles">${tiles.map(([k, v]) => `<div class="tile"><b>${fmt(v)}</b><span>${k}</span></div>`).join('')}</div>
<div class="cols">
${list('Apps', merge(s.days, 'apps'), 'Diagrams drawn in the last 30 days, by the app that sent them.')}
${list('Connections', merge(s.days, 'clients'), 'Chats that connected in the last 30 days, by client name.')}
${list('Diagram types', merge(s.days, 'types'), 'Diagrams drawn in the last 30 days.')}
</div>
<h2>Last 30 days</h2>
<p class="note">Sources estimates distinct users per day: closest for ChatGPT, which sends an anonymous id (possibly one per conversation); requests through Claude and similar apps come from the app's servers, so there it undercounts.</p>
<div class="table"><table>
<thead><tr><th>Day (UTC)</th><th class="n">Drawn</th><th class="n">Failed</th><th class="n">Sources</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
</main>
</body>
</html>`;
}
