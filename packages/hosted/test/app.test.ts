import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { fromRewrite, handle } from '../src/app.js';
import { decodeSpec, encodeSpec, LIMITS } from '../src/diagram.js';
import { REDIS_SVG } from './fixtures.js';

const BASE = 'https://sysketch.example';
const SPEC = 'title: URL Shortener\nedges:\n  - client > lb | POST /shorten\n  - lb > api > db';

let ip = 0;
/** Each test gets its own IP so the per-IP rate limit doesn't leak between tests. */
let headers: Record<string, string>;
beforeEach(() => {
  headers = { 'x-real-ip': `10.0.0.${++ip}` };
});

const get = (path: string) => handle(new Request(BASE + path, { headers }));

async function connect(): Promise<Client> {
  const client = new Client({ name: 'test', version: '0' });
  const transport = new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), {
    fetch: (url, init) => {
      const req = new Request(url, init);
      for (const [k, v] of Object.entries(headers)) req.headers.set(k, v);
      return handle(req);
    },
  });
  await client.connect(transport as Transport);
  return client;
}

const text = (r: CallToolResult) => (r.content[0] as { text: string }).text;
const links = (r: CallToolResult) =>
  [...text(r).matchAll(/https:\/\/\S+/g)].map((m) => m[0].slice(BASE.length));

describe('hosted MCP', () => {
  it('lists two small tools without file options', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(['render_diagram', 'list_icons']);
    const render = tools[0]!;
    expect(Object.keys(render.inputSchema.properties ?? {})).toEqual(['spec', 'theme', 'preview']);
    expect(JSON.stringify(tools).length).toBeLessThan(2400);
    // read-only, and the server tells the host to use it instead of drawing an image
    for (const t of tools) {
      expect(t.title).toBeTruthy();
      expect(t.annotations).toMatchObject({
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      });
    }
    expect(client.getInstructions()).toContain('render_diagram');
  });

  it('offers an in-chat viewer to hosts that support MCP Apps', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const uri = (tools[0]!._meta as { ui: { resourceUri: string } }).ui.resourceUri;
    expect(uri).toMatch(/^ui:\/\//);
    const { contents } = await client.readResource({ uri });
    const page = contents[0]!;
    expect(page.mimeType).toBe('text/html;profile=mcp-app');
    expect((page as { text: string }).text).toContain('<!doctype html>');
    // the viewer may only load images from this server
    expect(page._meta).toEqual({ ui: { csp: { resourceDomains: [BASE] }, prefersBorder: true } });

    const r = (await client.callTool({
      name: 'render_diagram',
      arguments: { spec: SPEC, preview: false },
    })) as CallToolResult;
    const data = r.structuredContent as Record<string, unknown>;
    expect(data).toMatchObject({ title: 'URL Shortener', width: expect.any(Number) });
    expect(data.png).toBe(BASE + links(r)[0]);
    expect(data.svg).toBe(BASE + links(r)[1]);
  });

  it('renders a spec to PNG/SVG links plus a preview image', async () => {
    const client = await connect();
    const r = (await client.callTool({
      name: 'render_diagram',
      arguments: { spec: SPEC },
    })) as CallToolResult;
    expect(r.isError).toBeFalsy();
    expect(text(r)).toMatch(/^Rendered "URL Shortener": 4 nodes, \d+x\d+\./);
    const [png, svg] = links(r);
    expect(png).toMatch(/^\/d\/[\w-]+\.png$/);
    expect(svg).toMatch(/^\/d\/[\w-]+\.svg$/);

    const image = r.content[1] as { type: string; data: string };
    expect(image.type).toBe('image');
    const width = Buffer.from(image.data, 'base64').readUInt32BE(16);
    expect(width).toBeLessThanOrEqual(LIMITS.previewWidth);

    // The links draw the same diagram, with nothing stored on the server.
    const res = await get(png!);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    expect(res.headers.get('cache-control')).toContain('immutable');
    const svgRes = await get(svg!);
    expect(await svgRes.text()).toContain('<svg');
    expect(await (await get(png!.replace('.png', '.yaml'))).text()).toBe(SPEC);
  });

  it('skips the preview on request and keeps the theme in links', async () => {
    const client = await connect();
    const r = (await client.callTool({
      name: 'render_diagram',
      arguments: { spec: SPEC, theme: 'blueprint', preview: false },
    })) as CallToolResult;
    expect(r.content).toHaveLength(1);
    expect(links(r)[0]).toMatch(/\.png\?theme=blueprint$/);
    expect((await get(links(r)[0]!)).status).toBe(200);
  });

  it('returns helpful errors to the model', async () => {
    const client = await connect();
    const bad = (await client.callTool({
      name: 'render_diagram',
      arguments: { spec: 'edges:\n  - client > databse' },
    })) as CallToolResult;
    expect(bad.isError).toBe(true);
    expect(text(bad)).toContain('Did you mean');
    const theme = (await client.callTool({
      name: 'render_diagram',
      arguments: { spec: SPEC, theme: 'neon' },
    })) as CallToolResult;
    expect(text(theme)).toContain('Unknown theme "neon"');
  });

  it('draws installed product logos unaltered and refuses logo folders in the spec', async () => {
    const client = await connect();
    const r = (await client.callTool({
      name: 'render_diagram',
      arguments: { spec: 'edges: ["api > redis"]', preview: false },
    })) as CallToolResult;
    const svg = await (await get(links(r)[1]!)).text();
    expect(svg).toContain(Buffer.from(REDIS_SVG).toString('base64'));

    const folder = (await client.callTool({
      name: 'render_diagram',
      arguments: { spec: `logos: /etc\n${SPEC}` },
    })) as CallToolResult;
    expect(folder.isError).toBe(true);
    expect(text(folder)).toContain('not available here');
    expect(text(folder)).not.toContain('/etc');

    const off = (await client.callTool({
      name: 'render_diagram',
      arguments: { spec: 'logos: false\nedges: ["api > redis"]', preview: false },
    })) as CallToolResult;
    expect(await (await get(links(off)[1]!)).text()).not.toContain('<image');
  });

  it('searches the available logos', async () => {
    const client = await connect();
    const r = (await client.callTool({
      name: 'list_icons',
      arguments: { logos: 'redis' },
    })) as CallToolResult;
    expect(text(r)).toContain('redis');
  });

  it('refuses diagrams over the size limits', async () => {
    const client = await connect();
    const ids = Array.from({ length: LIMITS.nodes + 1 }, (_, i) => `n${i}`);
    const nodes = ids.map((id) => `  ${id}: server`).join('\n');
    const edges = ids
      .slice(1)
      .map((id, i) => `  - n${i} > ${id}`)
      .join('\n');
    const r = (await client.callTool({
      name: 'render_diagram',
      arguments: { spec: `nodes:\n${nodes}\nedges:\n${edges}` },
    })) as CallToolResult;
    expect(text(r)).toContain('too big');
  });
});

describe('diagram links', () => {
  it('round-trips specs, including non-ASCII text', () => {
    const spec = 'title: Café → API\nedges: ["client > api | héllo"]';
    expect(decodeSpec(encodeSpec(spec))).toBe(spec);
  });

  it('rejects broken links and compression bombs', async () => {
    expect((await get('/d/not*valid.png')).status).toBe(404);
    expect((await get('/d/AAAA.png')).status).toBe(400);
    const bomb = encodeSpec('a'.repeat(LIMITS.specChars * 10));
    expect(bomb.length).toBeLessThan(LIMITS.codeChars);
    const res = await get(`/d/${bomb}.svg`);
    expect(res.status).toBe(400);
    expect(await res.text()).toBe('Invalid diagram link.');
  });

  it('serves SVGs with a no-script content security policy', async () => {
    const res = await get(`/d/${encodeSpec(SPEC)}.svg`);
    expect(res.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

describe('http', () => {
  it('answers health checks and CORS preflights', async () => {
    const health = await get('/health');
    expect(await health.json()).toMatchObject({ ok: true });
    const pre = await handle(new Request(`${BASE}/mcp`, { method: 'OPTIONS' }));
    expect(pre.status).toBe(204);
    expect(pre.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('only accepts POST on /mcp and rejects oversized bodies', async () => {
    expect((await get('/mcp')).status).toBe(405);
    const big = await handle(
      new Request(`${BASE}/mcp`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json', 'content-length': '999999' },
        body: '{}',
      }),
    );
    expect(big.status).toBe(413);
  });

  it('serves directory verification files only when configured', async () => {
    expect((await get('/.well-known/openai-apps-challenge')).status).toBe(404);
    process.env.OPENAI_APPS_CHALLENGE = 'token-123';
    try {
      const res = await get('/.well-known/openai-apps-challenge');
      expect(await res.text()).toBe('token-123');
      // also through the Vercel rewrite
      const via = await handle(
        await fromRewrite(new Request(`${BASE}/api?route=.well-known/openai-apps-challenge`)),
      );
      expect(await via.text()).toBe('token-123');
    } finally {
      delete process.env.OPENAI_APPS_CHALLENGE;
    }
  });

  it('rate-limits each IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 62; i++) statuses.push((await get('/d/AAAA.yaml')).status);
    expect(statuses.slice(0, 60).every((s) => s !== 429)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });

  it('uses SYSKETCH_PUBLIC_URL for links when set', async () => {
    process.env.SYSKETCH_PUBLIC_URL = 'https://diagrams.example/';
    try {
      const client = await connect();
      const r = (await client.callTool({
        name: 'render_diagram',
        arguments: { spec: SPEC, preview: false },
      })) as CallToolResult;
      expect(text(r)).toContain('PNG: https://diagrams.example/d/');
    } finally {
      delete process.env.SYSKETCH_PUBLIC_URL;
    }
  });

  it('restores the original path from a Vercel rewrite', async () => {
    const code = encodeSpec(SPEC);
    const png = await fromRewrite(
      new Request(`${BASE}/api?route=d&file=${code}.png&theme=blueprint`),
    );
    expect(png.url).toBe(`${BASE}/d/${code}.png?theme=blueprint`);
    const post = await fromRewrite(
      new Request(`${BASE}/api?route=mcp`, { method: 'POST', body: '{"a":1}' }),
    );
    expect(post.url).toBe(`${BASE}/mcp`);
    expect(await post.text()).toBe('{"a":1}');
    const original = new Request(`${BASE}/mcp?route=mcp`);
    expect(await fromRewrite(original)).toBe(original);
    expect((await handle(await fromRewrite(new Request(`${BASE}/api`)))).status).toBe(404);
  });
});
