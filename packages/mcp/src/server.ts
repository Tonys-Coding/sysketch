import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
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
const SPEC_EXTS = ['.yaml', '.yml', '.json'];

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

export interface ServerOptions {
  /**
   * Report full paths (`~/sysketch/diagrams/x.svg`) instead of project-relative ones. Used
   * when the folder isn't the one the client started us in, so the user can find the file.
   */
  fullPaths?: boolean;
}

export function createServer(cwd: string = process.cwd(), opts: ServerOptions = {}): McpServer {
  const server = new McpServer({ name: 'sysketch', version: VERSION });
  const abs = (p: string) => (isAbsolute(p) ? p : resolve(cwd, p));
  const root = realpathSync(cwd);
  /** Real path of p, or of its nearest existing parent plus the rest (symlinks followed). */
  const real = (p: string): string => {
    if (existsSync(p)) return realpathSync(p);
    const parent = dirname(p);
    return parent === p ? p : join(real(parent), basename(p));
  };
  /**
   * Tool arguments come from the model, which may be following instructions planted in a
   * document or web page. Keep every read and write inside the project folder.
   */
  const inProject = (p: string, what: string, exts: string[]): string => {
    const full = abs(p);
    const r = relative(root, real(full));
    if (r.startsWith('..') || isAbsolute(r)) {
      throw new SysketchError(`${what} must be inside the project folder: ${p}`);
    }
    if (!exts.includes(extname(full).toLowerCase())) {
      throw new SysketchError(`${what} must end in ${exts.join(', ')}: ${p}`);
    }
    return full;
  };
  /** Shorter paths in replies = fewer tokens. */
  const show = (p: string) => {
    if (opts.fullPaths) {
      const home = homedir();
      return p === home || p.startsWith(home + sep) ? `~${p.slice(home.length)}` : p;
    }
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
        const specFile = file ? inProject(file, 'file', SPEC_EXTS) : undefined;
        const text = spec ?? readFileSync(specFile!, 'utf8');
        let dest: string;
        if (out) dest = inProject(out, 'out', ['.svg', '.png']);
        else if (specFile) {
          dest = join(dirname(specFile), `${basename(specFile, extname(specFile))}.svg`);
        } else {
          const title = /^title:\s*(.+)$/m.exec(text)?.[1]?.replace(/^["']|["']$/g, '');
          dest = join(cwd, 'diagrams', `${slug(title ?? 'diagram')}.svg`);
        }

        const result = await renderToFile(text, dest, {
          ...(theme ? { theme } : {}),
          baseDir: specFile ? dirname(specFile) : cwd,
          logoRoot: cwd,
        });
        let summary = result.summary.replace(dest, show(dest));
        if (!file) {
          // Keep the spec so later edits are a one-line change + file= re-render.
          const specPath = join(dirname(dest), `${basename(dest, extname(dest))}.yaml`);
          // Only replace a spec we saved before, never an unrelated YAML file
          // (out: docker-compose.svg must not overwrite docker-compose.yaml).
          if (existsSync(specPath) && !/^edges\s*:/m.test(readFileSync(specPath, 'utf8'))) {
            throw new SysketchError(
              `Not overwriting ${show(specPath)}: it isn't a sysketch spec. Pick another out name.`,
            );
          }
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
