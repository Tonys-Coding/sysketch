import { describe, expect, it } from 'vitest';
import { buildModel, SysketchError } from '../src/index.js';

describe('buildModel', () => {
  it('creates implicit nodes from icon aliases with friendly labels', () => {
    const m = buildModel('edges:\n  - client > lb > api\n  - api > db');
    expect(m.nodes.map((n) => [n.id, n.label, n.icon.name])).toEqual([
      ['client', 'Client', 'user'],
      ['lb', 'Load Balancer', 'load-balancer'],
      ['api', 'API Server', 'server'],
      ['db', 'Database', 'database'],
    ]);
  });

  it('numbers steps in edge order and puts a chain label on the last edge', () => {
    const m = buildModel({ edges: ['client > lb > api | go'] });
    expect(m.edges.map((e) => [e.from, e.to, e.step, e.label])).toEqual([
      ['client', 'lb', 1, undefined],
      ['lb', 'api', 2, 'go'],
    ]);
  });

  it('can turn off step numbers', () => {
    const m = buildModel({ steps: false, edges: ['client > api'] });
    expect(m.edges[0]!.step).toBeUndefined();
  });

  it('supports "icon | Label" node values', () => {
    const m = buildModel({ nodes: { web: 'server | Web Tier' }, edges: ['web > db'] });
    expect(m.nodes[0]).toMatchObject({ id: 'web', label: 'Web Tier' });
  });

  it('accepts the one-key map YAML produces for an unquoted "a > b : label"', () => {
    const m = buildModel('edges:\n  - client > api : hello');
    expect(m.edges[0]).toMatchObject({ from: 'client', to: 'api', label: 'hello' });
  });

  it('accepts JSON text and plain objects', () => {
    expect(buildModel('{"edges":["client > api"]}').edges).toHaveLength(1);
    expect(buildModel({ edges: [{ from: 'client', to: 'api', step: 7 }] }).edges[0]!.step).toBe(7);
  });

  it('suggests fixes for unknown nodes and icons', () => {
    expect(() => buildModel({ edges: ['client > databse'] })).toThrow(/Did you mean: database/);
    expect(() => buildModel({ nodes: { a: 'serv' }, edges: ['a > client'] })).toThrow(
      /unknown icon "serv".*server/,
    );
  });

  it('rejects a node placed in two groups', () => {
    expect(() =>
      buildModel({ groups: { A: ['api'], B: ['api'] }, edges: ['client > api'] }),
    ).toThrow(SysketchError);
  });

  it('reports schema problems briefly', () => {
    expect(() => buildModel({ edgez: [] })).toThrow(/Invalid spec/);
    expect(() => buildModel('edges: ["client"]')).toThrow(/Bad edge/);
  });
});
