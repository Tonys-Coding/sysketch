export interface Hue {
  /** strong stroke / accent */
  a: string;
  /** mid fill */
  m: string;
  /** card background tint */
  card: string;
}

export interface Theme {
  name: string;
  bg: string;
  text: string;
  muted: string;
  edge: string;
  edgeWidth: number;
  badge: string;
  badgeText: string;
  pillFill: string;
  pillStroke: string;
  groupFill: string;
  groupStroke: string;
  cardRadius: number;
  cardStroke: number;
  hues: Record<string, Hue>;
}

export const lightTheme: Theme = {
  name: 'light',
  bg: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  edge: '#334155',
  edgeWidth: 2.5,
  badge: '#f97316',
  badgeText: '#ffffff',
  pillFill: '#ffffff',
  pillStroke: '#cbd5e1',
  groupFill: '#f8fafc',
  groupStroke: '#94a3b8',
  cardRadius: 16,
  cardStroke: 2.5,
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

export const themes: Record<string, Theme> = { light: lightTheme };
