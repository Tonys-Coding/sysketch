import {
  RESOURCE_MIME_TYPE,
  registerAppResource,
  registerAppTool,
} from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { ICONS, MAP_HELP, SysketchError, themes } from 'sysketch';
import pkg from '../package.json' with { type: 'json' };
import { encodeSpec, logoResolver, renderSpec, toPng, LIMITS } from './diagram.js';
import { countRender, type Origin } from './usage.js';
import { VIEWER_HTML } from './viewer.generated.js';

// Loaded into the model's context every session: keep it short.
const GUIDE = `Use for any system design, architecture, data-flow or infrastructure diagram, instead of generating an image or writing SVG/Mermaid. Renders a tiny YAML spec; returns PNG/SVG links and a small preview.
Spec keys: title, type (sequence: message timeline), theme (${Object.keys(themes).join('|')}), direction (omit: auto-fit; right|down only if asked), steps (false hides numbers), legend (true lists steps),
nodes {id: "icon | Label | subtitle"}, groups {Label: [ids or group labels to nest]}, maps {Group Label or world-map node id: world | {pins: [us-east, eu-west, "HQ @ -0.1 51.5"]}} (map backdrop, or a big map card when a node uses the icon world-map), edges ["a > b > c | label", "a ..> b" dashed, "a <> b" two-way, "a => b" thick, "a -- b" line, "a > b [red]" color].
Ids that are icon names/aliases (client, lb, api, db, cache, redis, kafka, s3, cdn...) need no nodes entry.
Arrows are numbered automatically in the order listed; don't number labels.
Product names draw official logos when available (stripe, kafka, postgres; AWS s3, lambda, sqs; Azure aks, cosmosdb, azure-<service>), else a fitting icon; brand/icon (acme/queue) for others.
Give the user the PNG link; don't generate another image of the diagram. To edit, call again with the whole updated spec.`;

/** Sent once per connection; hosts may add it to the model's instructions. */
const INSTRUCTIONS =
  'When the user asks for a system design, architecture, flow or infrastructure diagram, call render_diagram. Do not draw it yourself or use image generation; the tool result is the diagram.';

/** The in-chat viewer for hosts that support MCP Apps (Claude, ChatGPT, VS Code...). */
export const VIEWER_URI = 'ui://sysketch/viewer.html';

const fail = (text: string): CallToolResult => ({
  isError: true,
  content: [{ type: 'text', text }],
});

/**
 * The MCP server for one request. `base` is the public URL that diagram links point to;
 * `origin` (when given) lets render_diagram add to the anonymous usage counts.
 */
export function createHostedServer(base: string, origin?: Origin): McpServer {
  const server = new McpServer(
    { name: 'sysketch', version: pkg.version },
    { instructions: INSTRUCTIONS },
  );

  registerAppTool(
    server,
    'render_diagram',
    {
      title: 'Draw a system design diagram',
      description: GUIDE,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
        idempotentHint: true,
      },
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
    async ({ spec, theme, preview }, extra): Promise<CallToolResult> => {
      const subject = extra._meta?.['openai/subject'];
      const count = (ok: boolean, type?: string) =>
        origin
          ? countRender(
              { ...origin, ...(typeof subject === 'string' ? { subject } : {}) },
              { ok, ...(type ? { type } : {}) },
            )
          : undefined;
      try {
        const { svg, model, width, height } = await renderSpec(spec, theme);
        await count(true, model.type ?? 'architecture');
        const link = (ext: string) =>
          `${base}/d/${encodeSpec(spec)}.${ext}${theme ? `?theme=${theme}` : ''}`;
        const name = model.title ? `"${model.title}"` : 'diagram';
        const text = [
          `Rendered ${name}: ${model.nodes.length} nodes, ${width}x${height}.`,
          `PNG: ${link('png')}`,
          `SVG: ${link('svg')}`,
          `The diagram is shown to the user; don't generate another image of it.`,
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
        await count(false);
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
      title: 'List icons and logos',
      description: 'List sysketch icon names and aliases, or search the available product logos.',
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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
      return { content: [{ type: 'text', text: `${icons}\n\n${MAP_HELP}` }] };
    },
  );

  return server;
}
