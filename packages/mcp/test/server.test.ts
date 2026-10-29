import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
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
  it("reports the MCP package's own version", () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(client.getServerVersion()?.version).toBe(pkg.version);
  });

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

  it('lists the world-map card and its pin places, which are not in the icon catalog', async () => {
    const out = text(await call('list_icons'));
    expect(out).toContain('world-map');
    expect(out).toContain('Pin places:');
  });

  it('resolves logos: ./folder next to the spec file and searches logos', async () => {
    mkdirSync(join(dir, 'brand'));
    writeFileSync(
      join(dir, 'brand', 'acme.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8"/></svg>',
    );
    writeFileSync(join(dir, 'flow.yaml'), 'logos: ./brand\nedges:\n  - client > acme');
    expect((await call('render_diagram', { file: 'flow.yaml' })).isError).toBeFalsy();
    expect(readFileSync(join(dir, 'flow.svg'), 'utf8')).toContain('<image ');
    expect(text(await call('list_icons', { logos: 'stripe' }))).toBe(
      'no logos installed; use brand/icon',
    );
  });

  it('keeps reads and writes inside the project folder', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'sysketch-outside-'));
    writeFileSync(join(outside, 'secret.yaml'), 'edges:\n  - a > b');
    const spec = 'edges:\n  - client > db';
    const err = async (args: Record<string, unknown>) => {
      const r = await call('render_diagram', args);
      expect(r.isError).toBe(true);
      return text(r);
    };
    expect(await err({ spec, out: join(outside, 'x.svg') })).toMatch(/inside the project/);
    expect(await err({ spec, out: '../escape.svg' })).toMatch(/inside the project/);
    expect(await err({ file: join(outside, 'secret.yaml') })).toMatch(/inside the project/);
    expect(await err({ spec, out: 'notes.sh' })).toMatch(/must end in \.svg, \.png/);
    writeFileSync(join(dir, 'notes.txt'), 'hello');
    expect(await err({ file: 'notes.txt' })).toMatch(/must end in \.yaml/);
    expect(existsSync(join(outside, 'x.svg'))).toBe(false);
  });

  it('never overwrites an unrelated YAML file with a spec', async () => {
    writeFileSync(join(dir, 'docker-compose.yaml'), 'services:\n  web:\n    image: nginx\n');
    const r = await call('render_diagram', {
      spec: 'edges: ["client > db"]',
      out: 'docker-compose.svg',
    });
    expect(r.isError).toBe(true);
    expect(readFileSync(join(dir, 'docker-compose.yaml'), 'utf8')).toContain('image: nginx');
    // re-rendering its own spec is still fine
    const ok = await call('render_diagram', { spec: 'edges: ["client > db"]', out: 'flow.svg' });
    const again = await call('render_diagram', {
      spec: 'edges: ["client > api"]',
      out: 'flow.svg',
    });
    expect(ok.isError || again.isError).toBeFalsy();
  });

  it('refuses spec logo folders outside the project', async () => {
    const outside = mkdtempSync(join(tmpdir(), 'sysketch-logos-'));
    const r = await call('render_diagram', {
      spec: `logos: ${outside}\nedges: ["client > db"]`,
    });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/must be inside/);
  });

  it('reports full paths when asked, so desktop users can find the file', async () => {
    const [a, b] = InMemoryTransport.createLinkedPair();
    await createServer(dir, { fullPaths: true }).connect(a);
    const c = new Client({ name: 'test', version: '0' });
    await c.connect(b);
    const r = (await c.callTool({
      name: 'render_diagram',
      arguments: { spec: 'title: Full\nedges: ["client > db"]' },
    })) as CallToolResult;
    expect(text(r)).toContain(join(dir, 'diagrams', 'full.svg').replace(homedir(), '~'));
  });
});
