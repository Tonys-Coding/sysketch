import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { SysketchError } from 'sysketch';
import pkg from '../package.json' with { type: 'json' };
import { decodeSpec, renderSpec, toPng, type Format } from './diagram.js';
import { createHostedServer } from './server.js';

/**
 * One handler for every route, using web-standard Request/Response so the same code runs on
 * Vercel, in the bundled Node server (serve.ts) or any other runtime.
 *
 *   POST /mcp               MCP over Streamable HTTP (stateless, JSON responses)
 *   GET  /d/<code>.png|svg  a diagram drawn from the spec encoded in the link (?theme=)
 *   GET  /d/<code>.yaml     the spec itself
 *   GET  /health
 *
 * Nothing is stored: diagram links carry their own spec, so they work forever and the server
 * keeps no data. Specs are never logged.
 */

const MAX_BODY = 256 * 1024;
/** Requests per minute per IP, per server instance. A cheap guard, not a firewall. */
const RATE = 60;

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, accept, mcp-protocol-version, mcp-session-id',
  'access-control-expose-headers': 'mcp-session-id',
};

const TYPES: Record<Format, string> = {
  svg: 'image/svg+xml',
  png: 'image/png',
  yaml: 'text/yaml; charset=utf-8',
};

const hits = new Map<string, { count: number; reset: number }>();

function limited(req: Request): boolean {
  const ip =
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'local';
  const now = Date.now();
  if (hits.size > 10_000) hits.clear();
  const hit = hits.get(ip);
  if (!hit || hit.reset < now) {
    hits.set(ip, { count: 1, reset: now + 60_000 });
    return false;
  }
  return ++hit.count > RATE;
}

const text = (status: number, body: string, headers: Record<string, string> = {}) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', ...CORS, ...headers },
  });

function publicBase(req: Request): string {
  const env = process.env.SYSKETCH_PUBLIC_URL?.replace(/\/+$/, '');
  return env || new URL(req.url).origin;
}

async function mcp(req: Request): Promise<Response> {
  if (req.method !== 'POST') return text(405, 'Use POST.', { allow: 'POST, OPTIONS' });
  if (Number(req.headers.get('content-length') ?? 0) > MAX_BODY) {
    return text(413, 'Request too large.');
  }
  // Stateless (no session ids): a fresh server per request, so any instance can answer.
  const server = createHostedServer(publicBase(req));
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    maxRequestBodySize: MAX_BODY,
  });
  await server.connect(transport);
  try {
    const res = await transport.handleRequest(req);
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
    return new Response(res.body, { status: res.status, headers });
  } finally {
    await server.close();
  }
}

async function diagram(req: Request, path: string): Promise<Response> {
  const m = /^\/d\/([\w-]+)\.(svg|png|yaml)$/.exec(path);
  if (!m) return text(404, 'Not found.');
  const [, code = '', format] = m as unknown as [string, string, Format];
  const theme = new URL(req.url).searchParams.get('theme') ?? undefined;
  try {
    const spec = decodeSpec(code);
    let body: string | ArrayBuffer;
    if (format === 'yaml') body = spec;
    else {
      const { svg, width, height } = await renderSpec(spec, theme);
      const png = format === 'png' ? toPng(svg, width, height) : undefined;
      body = png
        ? (png.buffer.slice(png.byteOffset, png.byteOffset + png.length) as ArrayBuffer)
        : svg;
    }
    return new Response(body, {
      headers: {
        'content-type': TYPES[format],
        // The same link always draws the same diagram, so the CDN can keep it for a year.
        'cache-control': 'public, max-age=86400, s-maxage=31536000, immutable',
        'x-content-type-options': 'nosniff',
        // An SVG opened directly must not run anything (sysketch never emits scripts anyway).
        'content-security-policy': "default-src 'none'; img-src data:; style-src 'unsafe-inline'",
        ...CORS,
      },
    });
  } catch (e) {
    if (e instanceof SysketchError) return text(400, e.message);
    return text(500, 'Render failed.');
  }
}

/**
 * vercel.json rewrites /mcp, /health and /d/<file> to /api?route=...&file=... . If the
 * function sees that rewritten URL instead of the original, rebuild the original path.
 */
export async function fromRewrite(req: Request): Promise<Request> {
  const url = new URL(req.url);
  if (url.pathname !== '/api') return req;
  const route = url.searchParams.get('route') ?? '';
  const file = url.searchParams.get('file');
  url.pathname = route === 'd' && file ? `/d/${file}` : `/${route}`;
  url.searchParams.delete('route');
  url.searchParams.delete('file');
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();
  return new Request(url, { method: req.method, headers: req.headers, ...(body ? { body } : {}) });
}

export async function handle(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname.replace(/\/+$/, '') || '/';
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (path === '/health') {
    return Response.json({ ok: true, version: pkg.version }, { headers: CORS });
  }
  if (path !== '/mcp' && !path.startsWith('/d/')) return text(404, 'Not found.');
  if (limited(req)) return text(429, 'Too many requests. Try again in a minute.');
  return path === '/mcp' ? mcp(req) : diagram(req, path);
}
