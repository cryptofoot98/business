import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

// ── Numeric input with optional prefix/suffix ─────────────────────────────────

export function NumInput({
  value, onChange, prefix, suffix, placeholder = '0.00', step = 0.01, min = 0,
}: {
  value: number; onChange: (v: number) => void;
  prefix?: string; suffix?: string; placeholder?: string; step?: number; min?: number;
}) {
  return (
    <div className="flex items-center overflow-hidden" style={{
      background: 'rgba(255,255,255,0.85)',
      border: '1px solid rgba(22,163,74,0.22)',
      borderRadius: 12,
    }}>
      {prefix && (
        <span className="px-2.5 py-2.5 font-mono text-xs font-bold select-none shrink-0"
          style={{ color: '#16a34a', background: 'rgba(22,163,74,0.08)', borderRight: '1px solid rgba(22,163,74,0.15)' }}>
          {prefix}
        </span>
      )}
      <input
        type="number" value={value || ''} min={min} step={step} placeholder={placeholder}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-3 py-2.5 bg-transparent text-sm font-mono focus:outline-none min-w-0"
        style={{ color: '#14532d' }}
      />
      {suffix && (
        <span className="px-2.5 py-2.5 font-mono text-xs font-bold select-none shrink-0"
          style={{ color: '#16a34a', background: 'rgba(22,163,74,0.08)', borderLeft: '1px solid rgba(22,163,74,0.15)' }}>
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
  return (
    <div className="flex items-center overflow-hidden" style={{
      background: 'rgba(255,255,255,0.85)',
      border: '1px solid rgba(22,163,74,0.2)',
      borderRadius: 8,
      minWidth: 0,
    }}>
      {prefix && (
        <span className="px-1.5 py-1.5 font-mono text-[10px] font-bold select-none shrink-0"
          style={{ color: '#16a34a', background: 'rgba(22,163,74,0.08)', borderRight: '1px solid rgba(22,163,74,0.12)' }}>
          {prefix}
        </span>
      )}
      <input
        type="number" value={value || ''} min={min} step={step} placeholder={placeholder}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-2 py-1.5 bg-transparent text-xs font-mono focus:outline-none min-w-0"
        style={{ color: '#14532d', width: '100%' }}
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
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none transition-colors"
      style={{
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(22,163,74,0.22)',
        borderRadius: 12,
        color: '#14532d',
      }}
    />
  );
}

export function TextInputSm({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input
      type="text" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full px-2 py-1.5 text-xs font-mono focus:outline-none"
      style={{
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(22,163,74,0.2)',
        borderRadius: 8,
        color: '#14532d',
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
      className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none appearance-none"
      style={{
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(22,163,74,0.22)',
        borderRadius: 12,
        color: '#14532d',
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
      className="w-full px-2 py-1.5 text-xs font-mono focus:outline-none appearance-none"
      style={{
        background: 'rgba(255,255,255,0.85)',
        border: '1px solid rgba(22,163,74,0.2)',
        borderRadius: 8,
        color: '#14532d',
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Field label wrapper ───────────────────────────────────────────────────────

export function Field({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: 'rgba(20,83,45,0.52)' }}>
        {label}
      </label>
      {children}
      {note && <p className="font-mono text-[10px] mt-1" style={{ color: 'rgba(20,83,45,0.38)' }}>{note}</p>}
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

export function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'rgba(255,255,255,0.75)', backdropFilter: 'blur(20px)', border: '1px solid rgba(22,163,74,0.18)', borderRadius: 16, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{
          background: open ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'rgba(22,163,74,0.06)',
          borderBottom: open ? '1px solid rgba(22,163,74,0.25)' : 'none',
        }}
      >
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: open ? 'rgba(255,255,255,0.8)' : '#16a34a' }}>{icon}</span>}
          <span className="font-bold text-xs uppercase tracking-widest" style={{ color: open ? '#fff' : '#15803d' }}>{title}</span>
        </div>
        {open
          ? <ChevronUp size={13} style={{ color: open ? 'rgba(255,255,255,0.7)' : 'rgba(20,83,45,0.4)' }} />
          : <ChevronDown size={13} style={{ color: 'rgba(20,83,45,0.4)' }} />}
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
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'rgba(20,83,45,0.55)' }}>{label}</span>
        <span className="font-mono text-xs font-bold" style={{ color: '#14532d' }}>£{value.toFixed(4)}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'rgba(22,163,74,0.1)' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── GM colour helper ──────────────────────────────────────────────────────────

export function gmColor(pct: number): string {
  if (pct >= 20) return '#16a34a';
  if (pct >= 10) return '#ca8a04';
  return '#dc2626';
}
