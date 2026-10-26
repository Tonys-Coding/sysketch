import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handle } from '../src/app.js';
import { label, type Stats } from '../src/usage.js';

const BASE = 'https://sysketch.example';
const REDIS = 'https://redis.example';
const SPEC = 'title: Secret Project Atlas\nedges:\n  - client > lb > api > db';

/** Just enough of Redis for the usage counts, plus a log of every command sent. */
function fakeRedis() {
  const data = new Map<string, unknown>();
  const sent: unknown[][] = [];
  const run = ([cmd, k, ...a]: (string | number)[]): unknown => {
    const key = String(k);
    switch (cmd) {
      case 'INCR': {
        const n = Number(data.get(key) ?? 0) + 1;
        data.set(key, String(n));
        return n;
      }
      case 'SET':
        if (a.includes('NX') && data.has(key)) return null;
        data.set(key, String(a[0]));
        return 'OK';
      case 'GET':
        return data.get(key) ?? null;
      case 'HINCRBY': {
        const h = (data.get(key) as Map<string, number>) ?? new Map<string, number>();
        h.set(String(a[0]), (h.get(String(a[0])) ?? 0) + Number(a[1]));
        data.set(key, h);
        return h.get(String(a[0]));
      }
      case 'HGETALL':
        return [...((data.get(key) as Map<string, number>) ?? new Map())].flatMap(([f, v]) => [
          f,
          String(v),
        ]);
      case 'PFADD': {
        const s = (data.get(key) as Set<string>) ?? new Set<string>();
        s.add(String(a[0]));
        data.set(key, s);
        return 1;
      }
      case 'PFCOUNT':
        return ((data.get(key) as Set<string>) ?? new Set()).size;
      case 'EXPIRE':
        return 1;
      default:
        throw new Error(`unexpected ${cmd}`);
    }
  };
  const fetch = vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe(`${REDIS}/pipeline`);
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer t0ken');
    const commands = JSON.parse(String(init.body)) as (string | number)[][];
    sent.push(...commands);
    return Response.json(commands.map((c) => ({ result: run(c) })));
  });
  return { data, sent, fetch };
}

let ip = 100;
let headers: Record<string, string>;
let redis: ReturnType<typeof fakeRedis>;

beforeEach(() => {
  headers = { 'x-real-ip': `10.1.0.${++ip}`, 'user-agent': 'Claude-User/1.0 (+claude.ai)' };
  redis = fakeRedis();
  vi.stubGlobal('fetch', redis.fetch);
  process.env.KV_REST_API_URL = REDIS;
  process.env.KV_REST_API_TOKEN = 't0ken';
  process.env.STATS_KEY = 'open sesame';
});
afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of ['KV_REST_API_URL', 'KV_REST_API_TOKEN', 'STATS_KEY']) delete process.env[k];
});

async function connect(name = 'claude-ai'): Promise<Client> {
  const client = new Client({ name, version: '0' });
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

const draw = (client: Client, spec = SPEC, _meta?: Record<string, unknown>) =>
  client.callTool({
    name: 'render_diagram',
    arguments: { spec, preview: false },
    ...(_meta ? { _meta } : {}),
  }) as Promise<CallToolResult>;

const day = () => new Date().toISOString().slice(0, 10);
const count = (name: string) => redis.data.get(`u:${day()}:${name}`);
const auth = (password: string) => ({
  authorization: `Basic ${Buffer.from(`me:${password}`).toString('base64')}`,
});

describe('usage counts', () => {
  it('counts diagrams, failures, types, apps and connections', async () => {
    const client = await connect();
    expect((await draw(client)).isError).toBeFalsy();
    await draw(client, 'type: sequence\nedges: ["user > app > api"]');
    expect((await draw(client, 'edges: ["a > b"]\nnodes: {a: nosuchicon}')).isError).toBe(true);

    expect(count('renders')).toBe('2');
    expect(count('errors')).toBe('1');
    expect(redis.data.get('u:all:renders')).toBe('2');
    expect(redis.data.get('u:all:since')).toBe(day());
    expect(Object.fromEntries(count('types') as Map<string, number>)).toEqual({
      architecture: 1,
      sequence: 1,
    });
    expect(Object.fromEntries(count('apps') as Map<string, number>)).toEqual({ 'claude-user': 2 });
    expect(Object.fromEntries(count('clients') as Map<string, number>)).toEqual({ 'claude-ai': 1 });
  });

  it('never sends specs, IP addresses or user ids, only salted hashes', async () => {
    const client = await connect();
    await draw(client, SPEC, { 'openai/subject': 'user-123' });
    const sent = JSON.stringify(redis.sent);
    for (const secret of ['Secret Project Atlas', headers['x-real-ip']!, 'user-123']) {
      expect(sent).not.toContain(secret);
    }
    const added = redis.sent.filter((c) => c[0] === 'PFADD');
    expect(added).toHaveLength(1);
    expect(added[0]![2]).toMatch(/^[0-9a-f]{64}$/);
    // every daily key expires
    const expiring = new Set(redis.sent.filter((c) => c[0] === 'EXPIRE').map((c) => c[1]));
    for (const c of redis.sent.filter((c) => ['INCR', 'HINCRBY', 'PFADD'].includes(String(c[0])))) {
      if (String(c[1]).startsWith(`u:${day()}`)) expect(expiring).toContain(c[1]);
    }
  });

  it('estimates distinct sources per day', async () => {
    const client = await connect();
    await draw(client);
    await draw(client); // same IP and app: same source
    headers['x-real-ip'] = '10.9.9.9';
    await draw(client);
    expect((count('sources') as Set<string>).size).toBe(2);
    // an app's anonymous user id wins over the IP address
    await draw(client, SPEC, { 'openai/subject': 'u1' });
    headers['x-real-ip'] = '10.9.9.10';
    await draw(client, SPEC, { 'openai/subject': 'u1' });
    expect((count('sources') as Set<string>).size).toBe(3);
  });

  it('keeps drawing when Redis is down or not set up', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down');
      }),
    );
    expect((await draw(await connect())).isError).toBeFalsy();

    delete process.env.KV_REST_API_URL;
    const off = vi.fn();
    vi.stubGlobal('fetch', off);
    expect((await draw(await connect())).isError).toBeFalsy();
    expect(off).not.toHaveBeenCalled();
    const health = await (await handle(new Request(`${BASE}/health`))).json();
    expect(health).toMatchObject({ ok: true, counting: false });
  });

  it('shows the counts to the owner only', async () => {
    await draw(await connect());
    const get = (path: string, extra: Record<string, string> = {}) =>
      handle(new Request(BASE + path, { headers: { ...headers, ...extra } }));

    const denied = await get('/stats');
    expect(denied.status).toBe(401);
    expect(denied.headers.get('www-authenticate')).toMatch(/^Basic/);
    expect((await get('/stats', auth('wrong'))).status).toBe(401);

    const page = await get('/stats', auth('open sesame'));
    expect(page.status).toBe(200);
    expect(page.headers.get('cache-control')).toBe('no-store');
    const html = await page.text();
    expect(html).toContain('Diagrams drawn, all time');
    expect(html).toContain('claude-user');

    const json = (await (await get('/stats.json', auth('open sesame'))).json()) as Stats;
    expect(json.total.renders).toBe(1);
    expect(json.days).toHaveLength(30);
    expect(json.days[0]).toMatchObject({ day: day(), renders: 1, sources: 1 });
    expect(JSON.stringify(json)).not.toContain('salt');

    delete process.env.STATS_KEY;
    expect((await get('/stats', auth('open sesame'))).status).toBe(404);
  });

  it('labels apps by the first word of a name', () => {
    expect(label('Claude-User/1.0 (+https://claude.ai)')).toBe('claude-user');
    expect(label('openai-mcp/1.0.0')).toBe('openai-mcp');
    expect(label('Mozilla/5.0 (Macintosh)')).toBe('mozilla');
    expect(label('<script>')).toBe('script');
    expect(label(undefined)).toBe('unknown');
  });
});
