import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  ICONS,
  SysketchError,
  VERSION,
  createLogoResolver,
  renderToFile,
  svgToPng,
  themes,
} from 'sysketch';

// Loaded into the model's context every session: keep it short.
const GUIDE = `Render a system design diagram from a tiny YAML spec. Writes an .svg/.png file and returns its path. Never write SVG yourself.
Spec keys: title, theme (${Object.keys(themes).join('|')}), direction (omit: auto-fit; right|down only if asked), steps (false hides numbers), legend (true lists steps),
nodes {id: "icon | Label | subtitle"}, groups {Label: [ids]}, edges ["a > b > c | label", "a ..> b" dashed, "a > b [red]" color].
Ids that are icon names/aliases (client, lb, api, db, cache, redis, kafka, s3, cdn...) need no nodes entry.
Product names (stripe, s3, sendgrid, aks...) draw official logos if installed, else a fitting icon; brand/icon (acme/queue) for others.
To edit, change the spec file and call again with file=.`;

const PREVIEW_MAX_W = 1000;

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'diagram'
  );
}

const fail = (text: string): CallToolResult => ({
  isError: true,
  content: [{ type: 'text', text }],
});

export function createServer(cwd: string = process.cwd()): McpServer {
  const server = new McpServer({ name: 'sysketch', version: VERSION });
  const abs = (p: string) => (isAbsolute(p) ? p : resolve(cwd, p));
  /** Shorter paths in replies = fewer tokens. */
  const show = (p: string) => {
    const r = relative(cwd, p);
    return r && !r.startsWith('..') && !isAbsolute(r) ? r : p;
  };

  server.registerTool(
    'render_diagram',
    {
      description: GUIDE,
      inputSchema: {
        spec: z.string().optional().describe('YAML spec text'),
        file: z
          .string()
          .optional()
          .describe('Path to a spec file (preferred; edit it, then re-render)'),
        out: z.string().optional().describe('Output path, .svg (default) or .png'),
        theme: z.string().optional(),
        preview: z
          .boolean()
          .optional()
          .describe(
            'Return a PNG image to inspect. Only when the user asks you to look (~1-2k tokens)',
          ),
      },
    },
    async ({ spec, file, out, theme, preview }): Promise<CallToolResult> => {
      if (!spec && !file) return fail('Pass either spec (YAML text) or file (path to a spec).');
      try {
        const text = spec ?? readFileSync(abs(file!), 'utf8');
        let dest: string;
        if (out) dest = abs(out);
        else if (file) {
          const f = abs(file);
          dest = join(dirname(f), `${basename(f, extname(f))}.svg`);
        } else {
          const title = /^title:\s*(.+)$/m.exec(text)?.[1]?.replace(/^["']|["']$/g, '');
          dest = join(cwd, 'diagrams', `${slug(title ?? 'diagram')}.svg`);
        }

        const result = await renderToFile(text, dest, {
          ...(theme ? { theme } : {}),
          baseDir: file ? dirname(abs(file)) : cwd,
        });
        let summary = result.summary.replace(dest, show(dest));
        if (!file) {
          // Keep the spec so later edits are a one-line change + file= re-render.
          const specPath = join(dirname(dest), `${basename(dest, extname(dest))}.yaml`);
          writeFileSync(specPath, text.endsWith('\n') ? text : `${text}\n`);
          summary += `; spec: ${show(specPath)}`;
        }
        const content: CallToolResult['content'] = [{ type: 'text', text: summary }];

        if (preview) {
          const svg = extname(dest).toLowerCase() === '.png' ? null : readFileSync(dest, 'utf8');
          const width = Number(/viewBox="0 0 (\d+)/.exec(svg ?? '')?.[1] ?? PREVIEW_MAX_W);
          const png = svg ? svgToPng(svg, Math.min(1, PREVIEW_MAX_W / width)) : result.png!;
          content.push({ type: 'image', data: png.toString('base64'), mimeType: 'image/png' });
        }
        return { content };
      } catch (e) {
        if (e instanceof SysketchError) return fail(e.message);
        return fail(`sysketch failed: ${(e as Error).message}`);
      }
    },
  );

  server.registerTool(
    'list_icons',
    {
      description: 'List sysketch icon names and aliases, or search installed brand logos.',
      inputSchema: { logos: z.string().optional().describe('Search installed logos by name') },
    },
    async ({ logos }): Promise<CallToolResult> => {
      const resolver = createLogoResolver();
      const count = resolver.names().length;
      if (logos !== undefined) {
        const hits = resolver.search(logos, 20).map((h) => `${h.key} (${h.title})`);
        const text = count
          ? hits.join(', ') || 'no matching logos; use brand/icon'
          : 'no logos installed; use brand/icon';
        return { content: [{ type: 'text', text }] };
      }
      const icons = ICONS.map((i) => `${i.name}: ${Object.keys(i.aliases).join(', ')}`).join('\n');
      const note = count ? `\n${count} brand logos installed (search with logos=).` : '';
      return { content: [{ type: 'text', text: icons + note }] };
    },
  );

  return server;
}
