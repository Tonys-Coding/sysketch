import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { beforeEach, describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

let dir: string;
let client: Client;

beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'sysketch-mcp-'));
  const [a, b] = InMemoryTransport.createLinkedPair();
  await createServer(dir).connect(a);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(b);
});

const call = async (name: string, args: Record<string, unknown> = {}) =>
  (await client.callTool({ name, arguments: args })) as CallToolResult;
const text = (r: CallToolResult) => (r.content[0] as { text: string }).text;

describe('sysketch-mcp', () => {
  it('exposes two small tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).toEqual(['render_diagram', 'list_icons']);
    // Tool definitions sit in context every session; keep them lean.
    expect(JSON.stringify(tools).length).toBeLessThan(2000);
  });

  it('renders inline spec to diagrams/<title>.svg and returns only a summary', async () => {
    const r = await call('render_diagram', {
      spec: 'title: URL Shortener\nedges:\n  - client > lb > api',
    });
    expect(r.isError).toBeFalsy();
    expect(text(r)).toMatch(
      /^wrote diagrams\/url-shortener\.svg \(\d+x\d+, 3 nodes, 2 edges.*; spec: diagrams\/url-shortener\.yaml$/,
    );
    expect(readFileSync(join(dir, 'diagrams/url-shortener.yaml'), 'utf8')).toContain('client > lb');
    expect(text(r)).not.toContain('<svg');
    expect(readFileSync(join(dir, 'diagrams/url-shortener.svg'), 'utf8')).toMatch(/^<svg/);
  });

  it('renders a spec file next to itself, and to PNG when asked', async () => {
    writeFileSync(join(dir, 'flow.yaml'), 'edges:\n  - client > db');
    expect(text(await call('render_diagram', { file: 'flow.yaml' }))).toContain('flow.svg');
    expect(existsSync(join(dir, 'flow.svg'))).toBe(true);

    await call('render_diagram', { file: 'flow.yaml', out: 'out/flow.png', theme: 'midnight' });
    expect(readFileSync(join(dir, 'out/flow.png')).subarray(1, 4).toString()).toBe('PNG');
  });

  it('returns an image only when preview is requested', async () => {
    const r = await call('render_diagram', { spec: 'edges:\n  - client > api', preview: true });
    expect(r.content.map((c) => c.type)).toEqual(['text', 'image']);
  });

  it('returns short, fixable errors', async () => {
    const r = await call('render_diagram', { spec: 'edges:\n  - client > databse' });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/Did you mean: database/);
    expect((await call('render_diagram', {})).isError).toBe(true);
  });

  it('lists icons', async () => {
    expect(text(await call('list_icons'))).toMatch(/^user: client/);
  });
});
