import { describe, expect, it } from 'vitest';
import { ICONS, IconImportError, convertIconSvg } from '../src/index.js';

const figma = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#clip0_1_2)">
<path d="M8 12v24" stroke="#0000FF" stroke-width="2.5" stroke-linecap="round"/>
<ellipse cx="24" cy="12" rx="16" ry="7" fill="#FF0000" stroke="#0000FF" stroke-width="2.5"/>
<rect x="8" y="20" width="32" height="10" fill="#00FF00"/>
</g>
<defs><clipPath id="clip0_1_2"><rect width="48" height="48" fill="white"/></clipPath></defs>
</svg>`;

describe('convertIconSvg', () => {
  it('converts a Figma export to placeholder colors and drops the frame clip', () => {
    const { body, warnings } = convertIconSvg(figma);
    expect(body).toMatch(/^<g fill="none">/);
    expect(body).toContain('stroke="{A}"');
    expect(body).toContain('fill="{L}"');
    expect(body).toContain('fill="{M}"');
    expect(body).not.toMatch(/clip|id=|#0000FF/i);
    expect(warnings).toContain('removed frame clip path');
  });

  it('scales a 24px (Lucide-style) icon up to 48 and warns about thick strokes', () => {
    const { body, warnings } = convertIconSvg(
      '<svg viewBox="0 0 24 24" fill="none" stroke="#0000ff" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>',
    );
    expect(body).toContain('transform="scale(2)"');
    expect(body).toContain('stroke="{A}"');
    expect(warnings.join(' ')).toMatch(/stroke width 4 at 48px/);
  });

  it('does not warn about round-cap dots, tiny circles or solid shapes', () => {
    const { warnings } = convertIconSvg(
      '<svg viewBox="0 0 48 48" fill="none">' +
        '<path d="M14 23.5L14 23.5M24 28.5L24 28.5" stroke="#0000FF" stroke-width="7.2" stroke-linecap="round"/>' +
        '<circle cx="30" cy="30" r="1.6" fill="#FFFF00" stroke="#0000FF" stroke-width="1.6"/>' +
        '<path d="M13 12L9 12L11 8Z" fill="#0000FF" stroke="#0000FF" stroke-width="1.4"/>' +
        '<path d="M8 40L40 40" stroke="#0000FF" stroke-width="2.5"/></svg>',
    );
    expect(warnings).toEqual([]);
  });

  it('still warns about a heavy outline', () => {
    const { warnings } = convertIconSvg(
      '<svg viewBox="0 0 48 48"><path d="M8 40L40 20" fill="none" stroke="#0000FF" stroke-width="4.6"/></svg>',
    );
    expect(warnings.join(' ')).toMatch(/stroke width 4.6/);
  });

  it.each([
    ['<svg viewBox="0 0 48 48"><path fill="#123456" d="M0 0"/></svg>', /found #123456/],
    ['<svg viewBox="0 0 48 48"><text>hi</text></svg>', /<text> is not allowed/],
    ['<svg viewBox="0 0 48 40"><path d="M0 0" stroke="#00f"/></svg>', /must be square/],
    ['<svg viewBox="0 0 48 48"><path style="fill:red" d="M0 0"/></svg>', /presentation attributes/],
    ['<svg><path d="M0 0"/></svg>', /missing viewBox/],
    ['<div/>', /not an SVG/],
  ])('rejects bad input %#', (src, msg) => {
    expect(() => convertIconSvg(src)).toThrow(IconImportError);
    expect(() => convertIconSvg(src)).toThrow(msg);
  });
});

describe('catalog', () => {
  it('has every checklist icon, each with art and only placeholder colors', () => {
    expect(ICONS).toHaveLength(81);
    for (const icon of ICONS) {
      expect(icon.body, icon.name).not.toBe('');
      const colors = [...icon.body.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1]);
      expect(
        colors.filter((c) => !['{A}', '{M}', '{L}', '{S}', 'none'].includes(c!)),
        icon.name,
      ).toEqual([]);
    }
  });

  it('resolves aliases to their own icon and label, drawn or not', async () => {
    const { buildModel } = await import('../src/index.js');
    const m = buildModel({ edges: ['phone > kafka'] });
    expect(m.nodes.map((n) => [n.label, n.icon.name])).toEqual([
      ['Phone', 'mobile'],
      ['Kafka', 'stream'],
    ]);
  });

  it("gives every icon without art of its own a fallback icon's art", () => {
    const owned = new Set(ICONS.filter((i) => !i.borrowed).map((i) => i.body));
    for (const icon of ICONS.filter((i) => i.borrowed)) {
      expect(owned.has(icon.body), icon.name).toBe(true);
    }
  });
});
