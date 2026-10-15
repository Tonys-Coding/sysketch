import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ICONS, SysketchError, themes } from 'sysketch';
import pkg from '../package.json' with { type: 'json' };
import { encodeSpec, logoResolver, renderSpec, toPng, LIMITS } from './diagram.js';
import { VIEWER_HTML } from './viewer.generated.js';

// Loaded into the model's context every session: keep it short.
const GUIDE = `Render a system design diagram from a tiny YAML spec. Returns PNG/SVG links and a small preview. Never write SVG yourself.
Spec keys: title, theme (${Object.keys(themes).join('|')}), direction (omit: auto-fit; right|down only if asked), steps (false hides numbers), legend (true lists steps),
nodes {id: "icon | Label | subtitle"}, groups {Label: [ids]}, edges ["a > b > c | label", "a ..> b" dashed, "a > b [red]" color].
Ids that are icon names/aliases (client, lb, api, db, cache, redis, kafka, s3, cdn...) need no nodes entry.
Arrows are numbered automatically in the order listed; don't number labels.
Product names (stripe, kafka, postgres...) draw the product's logo when available, else a fitting icon; brand/icon (acme/queue) for others.
Give the user the PNG link. To edit, call again with the whole updated spec.`;

/** The in-chat viewer for hosts that support MCP Apps (Claude, ChatGPT, VS Code...). */
export const VIEWER_URI = 'ui://sysketch/viewer.html';

const fail = (text: string): CallToolResult => ({
  isError: true,
  content: [{ type: 'text', text }],
});

/** The MCP server for one request. `base` is the public URL that diagram links point to. */
export function createHostedServer(base: string): McpServer {
  const server = new McpServer({ name: 'sysketch', version: pkg.version });

  registerAppTool(
    server,
    'render_diagram',
    {
      description: GUIDE,
      inputSchema: {
        spec: z.string().max(LIMITS.specChars).describe('YAML spec text'),
        theme: z.string().optional(),
        preview: z
          .boolean()
          .optional()
          .describe('Include a small preview image (default true; ~1k tokens)'),
      },
      _meta: { ui: { resourceUri: VIEWER_URI } },
    },
    async ({ spec, theme, preview }): Promise<CallToolResult> => {
      try {
        const { svg, model, width, height } = await renderSpec(spec, theme);
        const link = (ext: string) =>
          `${base}/d/${encodeSpec(spec)}.${ext}${theme ? `?theme=${theme}` : ''}`;
        const name = model.title ? `"${model.title}"` : 'diagram';
        const text = [
          `Rendered ${name}: ${model.nodes.length} nodes, ${width}x${height}.`,
          `PNG: ${link('png')}`,
          `SVG: ${link('svg')}`,
        ].join('\n');
        const content: CallToolResult['content'] = [{ type: 'text', text }];
        if (preview !== false) {
          const png = toPng(svg, width, height, LIMITS.previewWidth);
          content.push({ type: 'image', data: png.toString('base64'), mimeType: 'image/png' });
        }
        // For the viewer only (MCP Apps keeps structuredContent out of the model's context).
        const structuredContent = {
          ...(model.title ? { title: model.title } : {}),
          png: link('png'),
          svg: link('svg'),
          width,
          height,
        };
        return { content, structuredContent };
      } catch (e) {
        if (e instanceof SysketchError) return fail(e.message);
        return fail(`sysketch failed: ${(e as Error).message}`);
      }
    },
  );

  registerAppResource(
    server,
    'sysketch diagram viewer',
    VIEWER_URI,
    { description: 'Zoomable diagram with PNG and SVG downloads' },
    async () => ({
      contents: [
        {
          uri: VIEWER_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: VIEWER_HTML,
          // The viewer loads the full SVG from this server's diagram links.
          _meta: { ui: { csp: { resourceDomains: [new URL(base).origin] }, prefersBorder: true } },
        },
      ],
    }),
  );

  server.registerTool(
    'list_icons',
    {
      description: 'List sysketch icon names and aliases, or search the available product logos.',
      inputSchema: { logos: z.string().optional().describe('Search product logos by name') },
    },
    async ({ logos }): Promise<CallToolResult> => {
      if (logos !== undefined) {
        const hits = logoResolver()
          .search(logos, 20)
          .map((h) => `${h.key} (${h.title})`);
        return {
          content: [{ type: 'text', text: hits.join(', ') || 'no matching logos; use brand/icon' }],
        };
      }
      const icons = ICONS.map((i) => `${i.name}: ${Object.keys(i.aliases).join(', ')}`).join('\n');
      return { content: [{ type: 'text', text: icons }] };
    },
  );

  return server;
}
