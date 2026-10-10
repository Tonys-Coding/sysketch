import type { SketchStyle } from './sketch.js';
import type { FontRef } from './text.js';

export interface Hue {
  /** strong stroke / accent */
  a: string;
  /** mid fill */
  m: string;
  /** card background tint (used when the theme has no uniform card fill) */
  card: string;
  /** {L}: lit/top surface. Defaults to the theme's iconLight. */
  l?: string;
  /** {S}: shaded/right surface of 3D icons. Defaults to a mix of m and a. */
  s?: string;
}

/** Linear blend of two #rrggbb colors (t = 0 gives a, t = 1 gives b). */
export function mix(a: string, b: string, t: number): string {
  const p = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i]! - v) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** Resolve the four icon paint slots for a hue in a theme. */
export function iconPaint(theme: Theme, hue: Hue): Record<'{A}' | '{M}' | '{L}' | '{S}', string> {
  return {
    '{A}': hue.a,
    '{M}': hue.m,
    '{L}': hue.l ?? theme.iconLight,
    '{S}': hue.s ?? mix(hue.m, hue.a, 0.5),
  };
}

/** Fill every hue of a palette with explicit lit/shade colors. */
function withSurfaces(
  hues: Record<string, Hue>,
  f: (h: Hue) => { l?: string; s?: string },
): Record<string, Hue> {
  return Object.fromEntries(Object.entries(hues).map(([k, h]) => [k, { ...h, ...f(h) }]));
}

export interface Theme {
  name: string;
  fonts: { title: FontRef; label: FontRef; edge: FontRef; group: FontRef; badge: FontRef };
  bg: string;
  /** subtle canvas texture */
  backdrop?: { kind: 'dots' | 'grid'; color: string; size: number };
  title: string;
  text: string;
  edge: string;
  edgeWidth: number;
  badge: string;
  badgeText: string;
  pill: { fill: string; stroke: string; text: string };
  group: { fill: string; stroke: string; dashed: boolean; label: string; uppercase: boolean };
  card: {
    radius: number;
    stroke: number;
    /** outline: accent-colored border. bar: neutral border + accent strip on top */
    style: 'outline' | 'bar';
    /** uniform card fill; omit to tint each card by its hue */
    fill?: string;
    /** neutral border for the bar style */
    border?: string;
    shadow?: { color: string; opacity: number; blur: number; dy: number };
  };
  /** the {L} highlight color inside icons */
  iconLight: string;
  /** draw every shape hand-made (rough strokes, crayon fills) */
  sketch?: SketchStyle;
  hues: Record<string, Hue>;
}

const nunito = (weight: number): FontRef => ({ family: 'nunito', weight });
const inter = (weight: number): FontRef => ({ family: 'inter', weight });
const mono = (weight: number): FontRef => ({ family: 'jetbrains-mono', weight });
const hand: FontRef = { family: 'patrick-hand', weight: 400 };

/** Bright accents over deep fills, for dark canvases. */
const darkHues: Record<string, Hue> = withSurfaces(
  {
    blue: { a: '#60a5fa', m: '#1e3a8a', card: '#0f1b33' },
    green: { a: '#4ade80', m: '#14532d', card: '#0d1f17' },
    amber: { a: '#fbbf24', m: '#78350f', card: '#1f1709' },
    red: { a: '#f87171', m: '#7f1d1d', card: '#211012' },
    violet: { a: '#a78bfa', m: '#4c1d95', card: '#1a1430' },
    teal: { a: '#2dd4bf', m: '#134e4a', card: '#0b1f1e' },
    pink: { a: '#f472b6', m: '#831843', card: '#221020' },
    sky: { a: '#38bdf8', m: '#0c4a6e', card: '#0a1a28' },
    orange: { a: '#fb923c', m: '#7c2d12', card: '#22140b' },
    slate: { a: '#94a3b8', m: '#334155', card: '#151b26' },
  },
  // lit tops glow toward the accent; shaded sides sink toward black
  (h) => ({ l: mix(h.m, h.a, 0.55), s: mix(h.m, '#000000', 0.35) }),
);

/** The original friendly look: pastel cards, rounded Nunito. */
export const classicTheme: Theme = {
  name: 'classic',
  fonts: {
    title: nunito(800),
    label: nunito(700),
    edge: nunito(700),
    group: nunito(800),
    badge: nunito(800),
  },
  bg: '#ffffff',
  title: '#0f172a',
  text: '#0f172a',
  edge: '#334155',
  edgeWidth: 2.5,
  badge: '#f97316',
  badgeText: '#ffffff',
  pill: { fill: '#ffffff', stroke: '#cbd5e1', text: '#0f172a' },
  group: { fill: '#f8fafc', stroke: '#94a3b8', dashed: true, label: '#64748b', uppercase: false },
  card: { radius: 16, stroke: 2.5, style: 'outline' },
  iconLight: '#ffffff',
  hues: {
    blue: { a: '#2563eb', m: '#93c5fd', card: '#eff6ff' },
    green: { a: '#16a34a', m: '#86efac', card: '#f0fdf4' },
    amber: { a: '#d97706', m: '#fcd34d', card: '#fffbeb' },
    red: { a: '#dc2626', m: '#fca5a5', card: '#fef2f2' },
    violet: { a: '#7c3aed', m: '#c4b5fd', card: '#f5f3ff' },
    teal: { a: '#0d9488', m: '#5eead4', card: '#f0fdfa' },
    pink: { a: '#db2777', m: '#f9a8d4', card: '#fdf2f8' },
    sky: { a: '#0284c7', m: '#7dd3fc', card: '#f0f9ff' },
    orange: { a: '#ea580c', m: '#fdba74', card: '#fff7ed' },
    slate: { a: '#475569', m: '#cbd5e1', card: '#f8fafc' },
  },
};

/** Dark & techy: deep navy, dot grid, neon outlines, monospace annotations. */
export const midnightTheme: Theme = {
  name: 'midnight',
  fonts: {
    title: inter(800),
    label: inter(600),
    edge: mono(500),
    group: mono(600),
    badge: inter(800),
  },
  bg: '#070b16',
  backdrop: { kind: 'dots', color: '#1a2338', size: 22 },
  title: '#e2e8f0',
  text: '#e2e8f0',
  edge: '#5b6b88',
  edgeWidth: 2,
  badge: '#22d3ee',
  badgeText: '#04111d',
  pill: { fill: '#0d1426', stroke: '#24314f', text: '#cbd5e1' },
  group: { fill: '#0a1020', stroke: '#24314f', dashed: true, label: '#64748b', uppercase: true },
  card: {
    radius: 14,
    stroke: 1.75,
    style: 'outline',
    fill: '#0d1426',
    shadow: { color: '#000000', opacity: 0.55, blur: 10, dy: 6 },
  },
  iconLight: '#1e293b',
  hues: darkHues,
};

/** Corporate dark: graphite surfaces, accent strip per card, solid containers. */
export const graphiteTheme: Theme = {
  name: 'graphite',
  fonts: {
    title: inter(800),
    label: inter(600),
    edge: mono(500),
    group: inter(700),
    badge: inter(800),
  },
  bg: '#16171b',
  title: '#f4f4f5',
  text: '#e4e4e7',
  edge: '#8b8f98',
  edgeWidth: 2,
  badge: '#f59e0b',
  badgeText: '#16171b',
  pill: { fill: '#222329', stroke: '#3a3c44', text: '#e4e4e7' },
  group: { fill: '#1c1d22', stroke: '#2e3036', dashed: false, label: '#a1a1aa', uppercase: false },
  card: {
    radius: 10,
    stroke: 1.25,
    style: 'bar',
    fill: '#222329',
    border: '#34363d',
    shadow: { color: '#000000', opacity: 0.45, blur: 8, dy: 4 },
  },
  iconLight: '#2c2d34',
  hues: darkHues,
};

/** Clean corporate with a technical edge: white cards on a faint blueprint grid. */
export const blueprintTheme: Theme = {
  name: 'blueprint',
  fonts: {
    title: inter(800),
    label: inter(600),
    edge: mono(500),
    group: mono(600),
    badge: inter(800),
  },
  bg: '#f7f9fc',
  backdrop: { kind: 'grid', color: '#e6ebf3', size: 24 },
  title: '#0b1b3f',
  text: '#0f172a',
  edge: '#475569',
  edgeWidth: 2,
  badge: '#1e3a8a',
  badgeText: '#ffffff',
  pill: { fill: '#ffffff', stroke: '#cbd5e1', text: '#0f172a' },
  group: { fill: '#ffffffb3', stroke: '#9fb0c8', dashed: true, label: '#475569', uppercase: true },
  card: {
    radius: 10,
    stroke: 1.25,
    style: 'bar',
    fill: '#ffffff',
    border: '#d5dce6',
    shadow: { color: '#0f172a', opacity: 0.08, blur: 6, dy: 3 },
  },
  iconLight: '#ffffff',
  hues: {
    blue: { a: '#2563eb', m: '#bfdbfe', card: '#ffffff' },
    green: { a: '#16a34a', m: '#bbf7d0', card: '#ffffff' },
    amber: { a: '#d97706', m: '#fde68a', card: '#ffffff' },
    red: { a: '#dc2626', m: '#fecaca', card: '#ffffff' },
    violet: { a: '#7c3aed', m: '#ddd6fe', card: '#ffffff' },
    teal: { a: '#0d9488', m: '#99f6e4', card: '#ffffff' },
    pink: { a: '#db2777', m: '#fbcfe8', card: '#ffffff' },
    sky: { a: '#0284c7', m: '#bae6fd', card: '#ffffff' },
    orange: { a: '#ea580c', m: '#fed7aa', card: '#ffffff' },
    slate: { a: '#475569', m: '#e2e8f0', card: '#ffffff' },
  },
};

const INK = '#1f2328';

/** Hand-drawn: ink outlines, crayon-scribbled icon fills, paper background. */
export const sketchTheme: Theme = {
  name: 'sketch',
  fonts: { title: hand, label: hand, edge: hand, group: hand, badge: hand },
  bg: '#fffdf7',
  title: INK,
  text: INK,
  edge: INK,
  edgeWidth: 2,
  badge: '#ffd43b',
  badgeText: INK,
  pill: { fill: '#fffdf7', stroke: INK, text: INK },
  group: { fill: '#f5f1e6', stroke: '#8a8577', dashed: false, label: '#5c574b', uppercase: false },
  card: { radius: 12, stroke: 2.25, style: 'outline', fill: '#ffffff' },
  iconLight: '#ffffff',
  sketch: { roughness: 1.2, bowing: 1, iconRoughness: 0.8, hachureGap: 1.9 },
  hues: withSurfaces(
    {
      blue: { a: INK, m: '#4cc3fc', card: '#ffffff' },
      green: { a: INK, m: '#69db7c', card: '#ffffff' },
      amber: { a: INK, m: '#ffc93c', card: '#ffffff' },
      red: { a: INK, m: '#ff6b6b', card: '#ffffff' },
      violet: { a: INK, m: '#b197fc', card: '#ffffff' },
      teal: { a: INK, m: '#38d9a9', card: '#ffffff' },
      pink: { a: INK, m: '#f783ac', card: '#ffffff' },
      sky: { a: INK, m: '#74c0fc', card: '#ffffff' },
      orange: { a: INK, m: '#ffa94d', card: '#ffffff' },
      slate: { a: INK, m: '#adb5bd', card: '#ffffff' },
    },
    (h) => ({ s: mix(h.m, INK, 0.35) }),
  ),
};

/** Default: corporate dark. */
export const defaultTheme = graphiteTheme;

export const themes: Record<string, Theme> = {
  graphite: graphiteTheme,
  blueprint: blueprintTheme,
  midnight: midnightTheme,
  classic: classicTheme,
  sketch: sketchTheme,
};
