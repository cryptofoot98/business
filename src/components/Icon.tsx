// Central Icon component — every emoji in the app routes through here so
// substitutions stay consistent and we can tune choices in one place.
//
// Usage: <Icon name="save" size={14} />
//
// Loader replacement: <Spinner size={12} /> — emoji rendering of animated
// hourglass is unreliable across platforms, so spinners use a CSS conic
// gradient. See .spinner / .spinner-sm / .spinner-lg in src/index.css.

import type { CSSProperties } from 'react';

// ── Emoji map ─────────────────────────────────────────────────────────────────
// Names map roughly to the lucide-react icon they replace, lowercased.

export const ICONS = {
  // Actions
  save:       '💾',
  trash:      '🗑️',
  reset:      '↩️',
  download:   '⬇️',
  upload:     '⬆️',
  filedown:   '📄',
  filetext:   '📋',
  pencil:     '✏️',
  bookmark:   '🔖',
  bookmarkplus: '🔖',
  folder:     '📁',
  folderopen: '📁',
  search:     '🔍',
  send:       '➤',
  logout:     '🚪',

  // Navigation / state
  menu:       '☰',
  close:      '✕',
  x:          '✕',
  check:      '✓',
  checkcircle: '✅',
  alert:      '⚠️',
  info:       'ℹ️',
  lightbulb:  '💡',
  chevronup:   '▲',
  chevrondown: '▼',
  chevronleft: '◀',
  chevronright: '▶',
  arrowright: '→',

  // Domain — logistics
  package:    '📦',
  container:  '🟧',
  ship:       '🚢',
  truck:      '🚛',
  plane:      '✈️',
  receipt:    '🧾',
  database:   '🗄️',
  layers:     '🧱',
  layersopen: '🧱',
  printer:    '🖨️',
  thermometer:'🌡️',
  wind:       '💨',
  maximize:   '⛶',
  grid:       '▦',
  columns:    '🟦',

  // Status / scoring
  trophy:     '🏆',
  trendingup: '📈',
  trendingdown: '📉',

  // Analysis
  calculator: '🧮',
  barchart:   '📊',
  target:     '🎯',
  settings:   '⚙️',

  // Chat
  bot:        '🤖',
  message:    '💬',
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  style?: CSSProperties;
  className?: string;
  title?: string;
}

export function Icon({ name, size = 14, style, className, title }: IconProps) {
  const glyph = ICONS[name];
  return (
    <span
      role="img"
      aria-label={title ?? name}
      title={title}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        fontSize: size,
        fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
        ...style,
      }}
    >
      {glyph}
    </span>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
// Drop-in replacement for `<Loader className="animate-spin" />` usages.

interface SpinnerProps {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

export function Spinner({ size = 12, color = 'currentColor', className, style }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`spinner ${className ?? ''}`}
      style={{ width: size, height: size, color, ...style }}
    />
  );
}
