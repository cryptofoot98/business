// Design tokens — TypeScript mirror of the CSS custom properties in
// src/index.css. Use these in inline `style={{}}` props where composing
// gradient strings or rgba() values directly is more ergonomic than
// reaching into CSS variables.

export const palette = {
  // Background canvas
  bgFrom:      '#fef7e8',
  bgTo:        '#fde9c8',
  bgFromSoft:  '#fffaf0',
  bgToSoft:    '#fbeed1',

  // Surfaces
  surface:     '#ffffff',
  surfaceSoft: '#fffaf0',
  surfaceTint: '#fef3e2',

  // Ink ramp
  ink:         '#1a1410',
  inkMuted:    '#5a4a3d',
  inkFaint:    '#a89a8d',

  // Accents
  amber:       '#f59e0b',
  amberDeep:   '#d97706',
  amberSoft:   '#fef3c7',

  coral:       '#e07856',
  coralSoft:   '#ffe4d4',

  emerald:     '#34d399',
  emeraldDeep: '#10b981',
  emeraldSoft: '#d1fae5',

  sky:         '#60a5fa',
  skyDeep:     '#3b82f6',
  skySoft:     '#dbeafe',

  plum:        '#c084fc',
  plumDeep:    '#a855f7',
  plumSoft:    '#f3e8ff',

  rose:        '#fb7185',
  roseDeep:    '#f43f5e',
} as const;

export const shadows = {
  soft:     '0 4px 24px rgba(26, 20, 16, 0.06)',
  elevated: '0 10px 40px rgba(26, 20, 16, 0.10)',
  floating: '0 16px 48px rgba(26, 20, 16, 0.14)',
  amber:    '0 6px 20px rgba(245, 158, 11, 0.30)',
} as const;

export const radii = {
  sm:      8,
  md:      12,
  lg:      16,
  card:    20,
  section: 24,
  xl:      28,
  pill:    9999,
} as const;

// Helpers — compose common style objects
export const cardSurface = (radius: number = radii.card): React.CSSProperties => ({
  background: palette.surface,
  border: '1px solid rgba(26, 20, 16, 0.06)',
  borderRadius: radius,
  boxShadow: shadows.soft,
});

export const pillButton = (): React.CSSProperties => ({
  background: `linear-gradient(135deg, ${palette.amber}, ${palette.amberDeep})`,
  color: '#ffffff',
  borderRadius: radii.pill,
  border: '1px solid rgba(255, 255, 255, 0.30)',
  boxShadow: shadows.amber,
  fontWeight: 600,
  cursor: 'pointer',
});

export const pillOutline = (): React.CSSProperties => ({
  background: palette.surface,
  color: palette.amberDeep,
  borderRadius: radii.pill,
  border: `1px solid rgba(245, 158, 11, 0.30)`,
  boxShadow: shadows.soft,
  fontWeight: 600,
  cursor: 'pointer',
});

// rgba helpers with tunable alpha — keeps style strings readable
const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};
export function alpha(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Accent palette for sections — matches the SECTION_ACCENTS in shared.tsx
export type AccentName = 'sky' | 'amber' | 'plum' | 'emerald' | 'coral';

export interface AccentPalette {
  base: string;        // primary hue
  deep: string;        // hover / pressed
  soft: string;        // background tint
  ink:  string;        // contrast text on `base`
}

export const ACCENTS: Record<AccentName, AccentPalette> = {
  sky:     { base: palette.sky,     deep: palette.skyDeep,     soft: palette.skySoft,     ink: '#1e3a8a' },
  amber:   { base: palette.amber,   deep: palette.amberDeep,   soft: palette.amberSoft,   ink: '#78350f' },
  plum:    { base: palette.plum,    deep: palette.plumDeep,    soft: palette.plumSoft,    ink: '#581c87' },
  emerald: { base: palette.emerald, deep: palette.emeraldDeep, soft: palette.emeraldSoft, ink: '#064e3b' },
  coral:   { base: palette.coral,   deep: '#b34232',           soft: palette.coralSoft,   ink: '#7c2d12' },
};
