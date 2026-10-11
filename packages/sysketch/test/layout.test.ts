import { describe, expect, it } from 'vitest';
import { layout } from '../src/layout.js';
import { buildModel, defaultTheme } from '../src/index.js';

const bottom = (lay: Awaited<ReturnType<typeof layout>>, ids: string[]) =>
  Math.max(...ids.map((id) => lay.nodes.get(id)!.y + lay.nodes.get(id)!.h));
const top = (lay: Awaited<ReturnType<typeof layout>>, ids: string[]) =>
  Math.min(...ids.map((id) => lay.nodes.get(id)!.y));

describe('layout of independent parts', () => {
  it('stacks unrelated flows instead of sharing columns', async () => {
    const lay = await layout(
      buildModel({ edges: ['client > lb > api > db', 'admin > cron > worker'] }),
      defaultTheme,
    );
    expect(top(lay, ['admin', 'cron', 'worker'])).toBeGreaterThan(
      bottom(lay, ['client', 'lb', 'api', 'db']),
    );
    // the second flow starts at the left edge, not after the first flow's columns
    expect(lay.nodes.get('admin')!.x).toBe(lay.nodes.get('client')!.x);
  });

  it('treats nodes sharing a group as one part', async () => {
    const lay = await layout(
      buildModel({ groups: { Data: ['db', 'cache'] }, edges: ['api > db', 'worker > cache'] }),
      defaultTheme,
    );
    const g = [...lay.groups.values()][0]!;
    for (const id of ['db', 'cache']) {
      const n = lay.nodes.get(id)!;
      expect(n.x).toBeGreaterThanOrEqual(g.x);
      expect(n.y + n.h).toBeLessThanOrEqual(g.y + g.h);
    }
  });

  it('places parts side by side in top-down diagrams', async () => {
    const lay = await layout(
      buildModel({ direction: 'down', edges: ['client > api', 'admin > cron'] }),
      defaultTheme,
    );
    expect(lay.nodes.get('admin')!.x).toBeGreaterThan(lay.nodes.get('client')!.x);
  });
});
