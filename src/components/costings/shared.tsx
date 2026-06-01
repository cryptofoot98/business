import { useState } from 'react';
import { Icon } from '../Icon';
import { palette, shadows, radii } from '../../data/designTokens';

// ── Shared input styling tokens ──────────────────────────────────────────────
//
// Inputs visually distinguish empty vs filled state so a long form is easy to
// scan. The signal is intentionally subtle — a warm cream wash + slightly
// stronger amber border on filled inputs, plus an optional 5-px amber dot
// next to the Field label. Nothing flashy, just enough that a glance shows
// which fields are still to do.

const INPUT_BG_EMPTY   = palette.surface;                  // #ffffff
const INPUT_BG_FILLED  = '#fffcf2';                        // very pale amber wash
const INPUT_BORDER_EMPTY  = 'rgba(26, 20, 16, 0.10)';
const INPUT_BORDER_FILLED = 'rgba(245, 158, 11, 0.40)';
const INPUT_INK      = palette.ink;
const AFFIX_BG       = palette.surfaceTint;
const AFFIX_TEXT     = palette.amberDeep;
const AFFIX_BORDER   = 'rgba(245, 158, 11, 0.20)';

const inputBg     = (filled: boolean) => filled ? INPUT_BG_FILLED : INPUT_BG_EMPTY;
const inputBorder = (filled: boolean) => filled ? INPUT_BORDER_FILLED : INPUT_BORDER_EMPTY;
const TRANSITION  = 'background 150ms ease, border-color 150ms ease';

// ── Numeric input with optional prefix/suffix ─────────────────────────────────

export function NumInput({
  value, onChange, prefix, suffix, placeholder = '0.00', step = 0.01, min = 0,
}: {
  value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; placeholder?: string; step?: number; min?: number;
}) {
  const filled = value > 0;
  return (
    <div className="flex items-center overflow-hidden" style={{
      background: inputBg(filled),
      border: `1px solid ${inputBorder(filled)}`,
      borderRadius: 12,
      transition: TRANSITION,
    }}>
      {prefix && (
        <span className="px-2.5 py-2.5 font-mono text-xs font-bold select-none shrink-0"
          style={{ color: AFFIX_TEXT, background: AFFIX_BG, borderRight: `1px solid ${AFFIX_BORDER}` }}>
          {prefix}
        </span>
      )}
      <input
        type="number" value={value || ''} min={min} step={step} placeholder={placeholder}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-3 py-2.5 bg-transparent text-sm font-mono focus:outline-none min-w-0"
        style={{ color: INPUT_INK }}
      />
      {suffix && (
        <span className="px-2.5 py-2.5 font-mono text-xs font-bold select-none shrink-0"
          style={{ color: AFFIX_TEXT, background: AFFIX_BG, borderLeft: `1px solid ${AFFIX_BORDER}` }}>
          {suffix}
        </span>
      )}
    </div>
  );
}

// Compact variant used in tables
export function NumInputSm({
  value, onChange, prefix, placeholder = '0.00', step = 0.01, min = 0,
}: {
  value: number; onChange: (v: number) => void;
  prefix?: string; placeholder?: string; step?: number; min?: number;
}) {
  const filled = value > 0;
  return (
    <div className="flex items-center overflow-hidden" style={{
      background: inputBg(filled),
      border: `1px solid ${inputBorder(filled)}`,
      borderRadius: 8,
      minWidth: 0,
      transition: TRANSITION,
    }}>
      {prefix && (
        <span className="px-1.5 py-1.5 font-mono text-[10px] font-bold select-none shrink-0"
          style={{ color: AFFIX_TEXT, background: AFFIX_BG, borderRight: `1px solid ${AFFIX_BORDER}` }}>
          {prefix}
        </span>
      )}
      <input
        type="number" value={value || ''} min={min} step={step} placeholder={placeholder}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-2 py-1.5 bg-transparent text-xs font-mono focus:outline-none min-w-0"
        style={{ color: INPUT_INK, width: '100%' }}
      />
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────

export function TextInput({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 text-sm focus:outline-none"
      style={{
        background: inputBg(filled),
        border: `1px solid ${inputBorder(filled)}`,
        borderRadius: 12,
        color: INPUT_INK,
        transition: TRANSITION,
      }}
    />
  );
}

export function TextInputSm({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const filled = value.trim().length > 0;
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-2 py-1.5 text-xs focus:outline-none"
      style={{
        background: inputBg(filled),
        border: `1px solid ${inputBorder(filled)}`,
        borderRadius: 8,
        color: INPUT_INK,
        transition: TRANSITION,
      }}
    />
  );
}

// ── Select input ──────────────────────────────────────────────────────────────

export function SelectInput<T extends string>({
  value, onChange, options,
}: {
  value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value as T)}
      className="w-full px-3 py-2.5 text-sm focus:outline-none appearance-none"
      style={{
        background: INPUT_BG_EMPTY,
        border: `1px solid ${INPUT_BORDER_EMPTY}`,
        borderRadius: 12,
        color: INPUT_INK,
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function SelectInputSm<T extends string>({
  value, onChange, options,
}: {
  value: T; onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <select
      value={value} onChange={e => onChange(e.target.value as T)}
      className="w-full px-2 py-1.5 text-xs focus:outline-none appearance-none"
      style={{
        background: INPUT_BG_EMPTY,
        border: `1px solid ${INPUT_BORDER_EMPTY}`,
        borderRadius: 8,
        color: INPUT_INK,
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Field label wrapper ───────────────────────────────────────────────────────
// Pass `filled` when the wrapped input has a user-entered value — the label
// gets a small amber dot. The dot is purely indicative (a second-layer cue
// alongside the input's own cream/amber wash) and shouldn't change layout.

export function Field({ label, note, filled, children }: {
  label: string; note?: string; filled?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest mb-1.5" style={{ color: filled ? palette.amberDeep : palette.inkFaint, fontWeight: 600, transition: 'color 150ms ease' }}>
        <span>{label}</span>
        {filled && (
          <span
            aria-hidden
            className="inline-block shrink-0"
            style={{
              width: 5, height: 5, borderRadius: 9999,
              background: palette.amber,
              boxShadow: '0 0 6px rgba(245,158,11,0.45)',
            }}
          />
        )}
      </label>
      {children}
      {note && <p className="text-[10px] mt-1" style={{ color: palette.inkFaint }}>{note}</p>}
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────
// Accent palette names match designTokens.ts ACCENTS map. Legacy names
// (green/blue/violet) are aliased to their replacements (emerald/sky/plum) so
// existing call sites don't break — the new canonical names are preferred.

export type SectionAccent =
  | 'emerald' | 'sky' | 'amber' | 'plum' | 'coral'
  | 'green'   | 'blue' | 'violet';

interface AccentPalette {
  from: string;       // gradient start (open header)
  to: string;         // gradient end   (open header)
  closedTint: string; // header bg when closed
  closedIcon: string; // icon colour when closed
  closedText: string; // title colour when closed
  border: string;     // card border
}

export const SECTION_ACCENTS: Record<SectionAccent, AccentPalette> = {
  emerald: { from: '#34d399', to: '#10b981', closedTint: 'rgba(52,211,153,0.10)', closedIcon: '#10b981', closedText: '#064e3b', border: 'rgba(52,211,153,0.22)' },
  sky:     { from: '#60a5fa', to: '#3b82f6', closedTint: 'rgba(96,165,250,0.10)', closedIcon: '#3b82f6', closedText: '#1e3a8a', border: 'rgba(96,165,250,0.22)' },
  amber:   { from: '#f59e0b', to: '#d97706', closedTint: 'rgba(245,158,11,0.10)', closedIcon: '#d97706', closedText: '#78350f', border: 'rgba(245,158,11,0.28)' },
  plum:    { from: '#c084fc', to: '#a855f7', closedTint: 'rgba(192,132,252,0.10)', closedIcon: '#a855f7', closedText: '#581c87', border: 'rgba(192,132,252,0.24)' },
  coral:   { from: '#e07856', to: '#b34232', closedTint: 'rgba(224,120,86,0.10)', closedIcon: '#b34232', closedText: '#7c2d12', border: 'rgba(224,120,86,0.22)' },
  // Legacy aliases ─ keep prior call sites rendering without code-wide rename
  green:   { from: '#34d399', to: '#10b981', closedTint: 'rgba(52,211,153,0.10)', closedIcon: '#10b981', closedText: '#064e3b', border: 'rgba(52,211,153,0.22)' },
  blue:    { from: '#60a5fa', to: '#3b82f6', closedTint: 'rgba(96,165,250,0.10)', closedIcon: '#3b82f6', closedText: '#1e3a8a', border: 'rgba(96,165,250,0.22)' },
  violet:  { from: '#c084fc', to: '#a855f7', closedTint: 'rgba(192,132,252,0.10)', closedIcon: '#a855f7', closedText: '#581c87', border: 'rgba(192,132,252,0.24)' },
};

export function Section({ title, icon, children, defaultOpen = true, accent = 'amber' }: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: SectionAccent;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const a = SECTION_ACCENTS[accent];
  return (
    <div style={{
      background: palette.surface,
      border: '1px solid rgba(26,20,16,0.06)',
      borderRadius: radii.section,
      boxShadow: shadows.soft,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{
          background: open ? `linear-gradient(135deg, ${a.from}, ${a.to})` : a.closedTint,
          borderBottom: open ? `1px solid ${a.border}` : '1px solid transparent',
        }}
      >
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: open ? 'rgba(255,255,255,0.92)' : a.closedIcon, display: 'inline-flex' }}>{icon}</span>}
          <span className="font-bold text-xs uppercase tracking-widest" style={{ color: open ? '#fff' : a.closedText }}>{title}</span>
        </div>
        <Icon name={open ? 'chevronup' : 'chevrondown'} size={12} style={{ color: open ? 'rgba(255,255,255,0.85)' : palette.inkFaint }} />
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// ── Cost breakdown bar ────────────────────────────────────────────────────────

export function CostBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.max((value / total) * 100, 0) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: palette.inkMuted }}>{label}</span>
        <span className="font-mono text-xs font-bold" style={{ color: palette.ink }}>£{value.toFixed(4)}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: palette.surfaceTint }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── GM colour helper ──────────────────────────────────────────────────────────
// Maps gross-margin % to a palette colour. ≥20 strong green, ≥10 amber, else coral.

export function gmColor(pct: number): string {
  if (pct >= 20) return palette.emeraldDeep;
  if (pct >= 10) return palette.amberDeep;
  return palette.coral;
}
