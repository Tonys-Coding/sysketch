#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { handle } from './app.js';

/**
 * Plain Node server for local testing or for hosts that run a container (Render, Fly.io,
 * Cloud Run...). On Vercel, api/index.js calls `handle` directly instead.
 */
const port = Number(process.env.PORT ?? 3000);
const file = (name: string) => readFileSync(new URL(`../public/${name}`, import.meta.url));
const landing = file('index.html');

createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(', ') : v);
    }
    const url = `http://${req.headers.host ?? `localhost:${port}`}${req.url ?? '/'}`;
    // The static landing page (on Vercel, served from public/ directly).
    const path = new URL(url).pathname;
    if (req.method === 'GET' && path === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(landing);
      return;
    }
    if (req.method === 'GET' && /^\/brand\/[\w-]+\.svg$/.test(path)) {
      res.writeHead(200, { 'content-type': 'image/svg+xml' }).end(file(path.slice(1)));
      return;
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && chunks.length > 0;
    const response = await handle(
      new Request(url, {
        method: req.method ?? 'GET',
        headers,
        ...(hasBody ? { body: Buffer.concat(chunks) } : {}),
      }),
    );
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (!res.headersSent) res.writeHead(500);
    res.end();
  }
}).listen(port, () => console.log(`sysketch hosted MCP: http://localhost:${port}/mcp`));
