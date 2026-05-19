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
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 12,
    }}>
      {prefix && (
        <span className="px-2.5 py-2.5 font-mono text-xs font-bold select-none shrink-0"
          style={{ color: '#64748b', background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>
          {prefix}
        </span>
      )}
      <input
        type="number" value={value || ''} min={min} step={step} placeholder={placeholder}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-3 py-2.5 bg-transparent text-sm font-mono focus:outline-none min-w-0"
        style={{ color: '#0f172a' }}
      />
      {suffix && (
        <span className="px-2.5 py-2.5 font-mono text-xs font-bold select-none shrink-0"
          style={{ color: '#64748b', background: '#f8fafc', borderLeft: '1px solid #e2e8f0' }}>
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
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 8,
      minWidth: 0,
    }}>
      {prefix && (
        <span className="px-1.5 py-1.5 font-mono text-[10px] font-bold select-none shrink-0"
          style={{ color: '#64748b', background: '#f8fafc', borderRight: '1px solid #e2e8f0' }}>
          {prefix}
        </span>
      )}
      <input
        type="number" value={value || ''} min={min} step={step} placeholder={placeholder}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="flex-1 px-2 py-1.5 bg-transparent text-xs font-mono focus:outline-none min-w-0"
        style={{ color: '#0f172a', width: '100%' }}
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
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        color: '#0f172a',
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
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        color: '#0f172a',
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
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        color: '#0f172a',
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
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        color: '#0f172a',
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
      <label className="block font-mono text-[10px] uppercase tracking-widest mb-1.5" style={{ color: '#94a3b8' }}>
        {label}
      </label>
      {children}
      {note && <p className="font-mono text-[10px] mt-1" style={{ color: '#cbd5e1' }}>{note}</p>}
    </div>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────────

export function Section({ title, icon, children, defaultOpen = true }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{
          background: open ? 'linear-gradient(135deg, #4f46e5, #4338ca)' : '#f8fafc',
          borderBottom: open ? '1px solid rgba(79,70,229,0.2)' : 'none',
        }}
      >
        <div className="flex items-center gap-2">
          {icon && <span style={{ color: open ? 'rgba(255,255,255,0.8)' : '#6366f1' }}>{icon}</span>}
          <span className="font-bold text-xs uppercase tracking-widest" style={{ color: open ? '#fff' : '#334155' }}>{title}</span>
        </div>
        {open
          ? <ChevronUp size={13} style={{ color: open ? 'rgba(255,255,255,0.7)' : '#94a3b8' }} />
          : <ChevronDown size={13} style={{ color: '#94a3b8' }} />}
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
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: '#94a3b8' }}>{label}</span>
        <span className="font-mono text-xs font-bold" style={{ color: '#1e293b' }}>£{value.toFixed(4)}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: '#f1f5f9' }}>
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── GM colour helper ──────────────────────────────────────────────────────────

export function gmColor(pct: number): string {
  if (pct >= 20) return '#059669';
  if (pct >= 10) return '#ca8a04';
  return '#dc2626';
}
