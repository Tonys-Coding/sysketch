import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createClient } from 'redis';

/**
 * Anonymous usage counts, kept in Redis when one is connected: Upstash over HTTP
 * (KV_REST_API_URL/KV_REST_API_TOKEN from Vercel's Upstash integration, or UPSTASH_REDIS_REST_*),
 * or any Redis over its normal connection (REDIS_URL, from Vercel's Redis integration).
 * Without them nothing is counted.
 *
 * Per UTC day, kept 400 days: diagrams drawn and failed, diagram types, the app that sent each
 * request (the first word of its user agent), the MCP client names that connect, and an
 * approximate number of distinct sources. A source is a one-way hash of the app's anonymous user
 * id when it sends one (ChatGPT's `openai/subject`, possibly one per conversation), otherwise of
 * IP address + user agent. The hash is salted with a random value that is deleted after two days and only feeds a
 * HyperLogLog, which keeps no hashes at all. Specs, IP addresses and ids are never stored.
 *
 * Counting never blocks or breaks a request: failures are ignored and calls time out quickly.
 */

const KEEP = 400 * 24 * 3600;
const SALT_TTL = 2 * 24 * 3600;
const TIMEOUT = 1500;

type Command = (string | number)[];

type Store = { rest: string; token: string } | { tcp: string };

function store(): Store | undefined {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) return { rest: url.replace(/\/+$/, ''), token };
  return process.env.REDIS_URL ? { tcp: process.env.REDIS_URL } : undefined;
}

export const counting = () => store() !== undefined;

const timeout = <T>(p: Promise<T>) =>
  Promise.race([
    p,
    new Promise<never>((_, no) => setTimeout(() => no(new Error('timeout')), TIMEOUT).unref()),
  ]);

/** One connection per server instance, reused while it stays open. */
let client: ReturnType<typeof createClient> | undefined;

function drop() {
  try {
    client?.destroy();
  } catch {
    // never connected
  }
  client = undefined;
}

async function overTcp(url: string, commands: Command[]): Promise<unknown[] | undefined> {
  try {
    if (!client?.isReady) {
      drop();
      client = createClient({
        url,
        // RESP2 replies (hashes as flat arrays) match what Upstash's HTTP API returns
        RESP: 2,
        socket: { connectTimeout: TIMEOUT, reconnectStrategy: false },
      });
      client.on('error', () => {}); // a dropped connection is replaced on the next count
      await timeout(client.connect());
    }
    const c = client;
    // sent back to back without waiting, so they travel as one pipeline
    return await timeout(Promise.all(commands.map((cmd) => c.sendCommand(cmd.map(String)))));
  } catch {
    drop();
    return undefined;
  }
}

/** Runs commands in one round trip; undefined when Redis is off or unreachable. */
async function redis(commands: Command[]): Promise<unknown[] | undefined> {
  const s = store();
  if (!s || !commands.length) return undefined;
  if ('tcp' in s) return overTcp(s.tcp, commands);
  try {
    const res = await fetch(`${s.rest}/pipeline`, {
      method: 'POST',
      headers: { authorization: `Bearer ${s.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return undefined;
    return ((await res.json()) as { result?: unknown }[]).map((r) => r.result);
  } catch {
    return undefined;
  }
}

const today = () => new Date().toISOString().slice(0, 10);
const key = (day: string, name: string) => `u:${day}:${name}`;

/** Short, lowercase label safe to use as a counter field ("claude-user", "openai-mcp"). */
export function label(value: unknown): string {
  const v = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return (
    v
      .split(/[\s/;(]/)[0]!
      .replace(/[^a-z0-9._-]/g, '')
      .slice(0, 40) || 'unknown'
  );
}

let salt: { day: string; value: string } | undefined;

/** Today's random salt, shared by all server instances through Redis. */
async function saltFor(day: string): Promise<string | undefined> {
  if (salt?.day === day) return salt.value;
  const k = key(day, 'salt');
  const r = await redis([
    ['SET', k, randomBytes(16).toString('hex'), 'NX', 'EX', SALT_TTL],
    ['GET', k],
  ]);
  const value = r?.[1];
  if (typeof value !== 'string') return undefined;
  salt = { day, value };
  return value;
}

/** What a request tells us about where it came from; nothing here is stored. */
export interface Origin {
  ip: string;
  userAgent: string;
  /** an anonymous user id some apps send in the request's `_meta` */
  subject?: string;
}

export function originOf(req: Request): Origin {
  return {
    ip:
      req.headers.get('x-real-ip') ??
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'local',
    userAgent: req.headers.get('user-agent') ?? '',
  };
}

/** Counts one render_diagram call. */
export async function countRender(
  origin: Origin,
  result: { ok: boolean; type?: string },
): Promise<void> {
  if (!counting()) return;
  const day = today();
  const commands: Command[] = [
    ['INCR', key(day, result.ok ? 'renders' : 'errors')],
    ['INCR', `u:all:${result.ok ? 'renders' : 'errors'}`],
    ['SET', 'u:all:since', day, 'NX'],
  ];
  if (result.ok) {
    commands.push(
      ['HINCRBY', key(day, 'types'), result.type ?? 'architecture', 1],
      ['HINCRBY', key(day, 'apps'), label(origin.userAgent), 1],
    );
  }
  const s = await saltFor(day);
  if (s) {
    const who = origin.subject ? `id:${origin.subject}` : `ip:${origin.ip}|${origin.userAgent}`;
    const hash = createHash('sha256').update(`${s}|${who}`).digest('hex');
    commands.push(['PFADD', key(day, 'sources'), hash]);
  }
  for (const name of ['renders', 'errors', 'types', 'apps', 'sources']) {
    commands.push(['EXPIRE', key(day, name), KEEP]);
  }
  await redis(commands);
}

/** Counts an MCP connection by the client's name (sent in `initialize`). */
export async function countConnect(clientName: unknown): Promise<void> {
  if (!counting()) return;
  const k = key(today(), 'clients');
  await redis([
    ['HINCRBY', k, label(clientName), 1],
    ['EXPIRE', k, KEEP],
  ]);
}

export interface Day {
  day: string;
  renders: number;
  errors: number;
  sources: number;
  types: Record<string, number>;
  apps: Record<string, number>;
  clients: Record<string, number>;
}

export interface Stats {
  since?: string;
  total: { renders: number; errors: number };
  days: Day[];
}

const num = (v: unknown) => Number(v ?? 0) || 0;
/** HGETALL comes back as [field, value, field, value, ...]. */
function hash(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (Array.isArray(v)) for (let i = 0; i + 1 < v.length; i += 2) out[String(v[i])] = num(v[i + 1]);
  return out;
}

/** The last `count` days, newest first. Undefined when Redis is off or unreachable. */
export async function readStats(count = 30): Promise<Stats | undefined> {
  const days: string[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) days.push(new Date(now - i * 864e5).toISOString().slice(0, 10));
  const per = ['GET renders', 'GET errors', 'PFCOUNT sources', 'HGETALL types', 'HGETALL apps'];
  const r = await redis([
    ['GET', 'u:all:renders'],
    ['GET', 'u:all:errors'],
    ['GET', 'u:all:since'],
    ...days.flatMap((d) => [
      ...per.map((p) => {
        const [cmd, name] = p.split(' ') as [string, string];
        return [cmd, key(d, name)];
      }),
      ['HGETALL', key(d, 'clients')],
    ]),
  ]);
  if (!r) return undefined;
  const step = per.length + 1;
  return {
    ...(typeof r[2] === 'string' ? { since: r[2] } : {}),
    total: { renders: num(r[0]), errors: num(r[1]) },
    days: days.map((day, i) => {
      const at = 3 + i * step;
      return {
        day,
        renders: num(r[at]),
        errors: num(r[at + 1]),
        sources: num(r[at + 2]),
        types: hash(r[at + 3]),
        apps: hash(r[at + 4]),
        clients: hash(r[at + 5]),
      };
    }),
  };
}

/** Basic auth against STATS_KEY (any user name). False when STATS_KEY isn't set. */
export function statsAllowed(req: Request): boolean {
  const secret = process.env.STATS_KEY;
  if (!secret) return false;
  const m = /^Basic\s+(.+)$/i.exec(req.headers.get('authorization') ?? '');
  if (!m) return false;
  const decoded = Buffer.from(m[1]!, 'base64').toString('utf8');
  const given = decoded.slice(decoded.indexOf(':') + 1);
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(given), digest(secret));
}
