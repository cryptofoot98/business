import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Icon, Spinner } from '../Icon';
import { Product, NewProductInput } from '../../types/product';

interface Props {
  products: Product[];
  value: string;                  // current product_no in the form
  onSelect: (product: Product) => void;
  onCreate: (input: NewProductInput) => Promise<Product>;
  onTextChange?: (text: string) => void;  // free-text fallback, used while typing
  placeholder?: string;
  accentColor?: string;           // override input/border tint (default blue to match Product Details section)
}

// Case-insensitive substring match against product_no + description.
function filterProducts(list: Product[], query: string): Product[] {
  const q = query.trim().toLowerCase();
  if (!q) return list.slice(0, 50);
  return list.filter(p =>
    p.product_no.toLowerCase().includes(q) ||
    p.description.toLowerCase().includes(q),
  ).slice(0, 50);
}

export function ProductCombobox({
  products, value, onSelect, onCreate, onTextChange,
  placeholder = 'e.g. C10028A',
  accentColor = '#2563eb',
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlighted, setHighlighted] = useState(0);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync external value into internal query (e.g. on load)
  useEffect(() => { setQuery(value); }, [value]);

  const filtered = useMemo(() => filterProducts(products, query), [products, query]);

  // Has the user typed a product_no that doesn't exist yet? Then offer create.
  const exactMatch = useMemo(
    () => products.some(p => p.product_no.toLowerCase() === query.trim().toLowerCase()),
    [products, query],
  );
  const canCreate = !exactMatch && query.trim().length > 0;

  // Reset highlight when filter changes
  useEffect(() => { setHighlighted(0); }, [query]);

  // Outside-click closes the popover
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setCreating(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Keep highlighted row in view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${highlighted}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlighted, open]);

  const handleSelect = useCallback((p: Product) => {
    setQuery(p.product_no);
    onSelect(p);
    setOpen(false);
  }, [onSelect]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }
    const total = filtered.length + (canCreate ? 1 : 0);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(i => Math.min(i + 1, total - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted < filtered.length) {
        handleSelect(filtered[highlighted]);
      } else if (canCreate) {
        setCreating(true);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setCreating(false);
    }
  };

  return (
    <div ref={rootRef} className="relative" style={{ width: '100%' }}>
      <div className="flex items-center overflow-hidden" style={{
        background: 'rgba(255,255,255,0.85)',
        border: `1px solid ${accentColor}33`,
        borderRadius: 12,
      }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); onTextChange?.(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 bg-transparent text-sm focus:outline-none min-w-0"
          style={{ color: '#1e3a8a' }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); onTextChange?.(''); inputRef.current?.focus(); }}
            className="px-1.5 py-1"
            style={{ color: 'rgba(30,58,138,0.4)' }}
            title="Clear"
          >
            <Icon name="close" size={13} />
          </button>
        )}
        <button
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}
          className="px-2 py-2.5"
          style={{ color: accentColor }}
        >
          <Icon name="chevrondown" size={14} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }} />
        </button>
      </div>

      {open && (
        <div
          className="absolute z-30 mt-1 w-full overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(16px)',
            border: `1px solid ${accentColor}33`,
            borderRadius: 12,
            boxShadow: '0 16px 40px rgba(0,0,0,0.12)',
            maxHeight: 320,
          }}
        >
          {creating ? (
            <CreateForm
              productNo={query.trim()}
              onCancel={() => setCreating(false)}
              onCreated={p => { handleSelect(p); setCreating(false); }}
              onCreate={onCreate}
              accentColor={accentColor}
            />
          ) : (
            <div
              ref={listRef}
              className="overflow-y-auto"
              style={{ maxHeight: 320, scrollbarWidth: 'thin' }}
            >
              {filtered.length === 0 && !canCreate && (
                <div className="px-3 py-4 text-xs text-center" style={{ color: 'rgba(30,58,138,0.5)' }}>
                  No products match — keep typing or clear.
                </div>
              )}
              {filtered.map((p, idx) => {
                const isHi = idx === highlighted;
                return (
                  <button
                    key={p.id}
                    data-idx={idx}
                    onMouseDown={e => { e.preventDefault(); handleSelect(p); }}
                    onMouseEnter={() => setHighlighted(idx)}
                    className="w-full px-3 py-2 text-left flex items-baseline gap-3"
                    style={{
                      background: isHi ? `${accentColor}14` : 'transparent',
                      borderLeft: isHi ? `3px solid ${accentColor}` : '3px solid transparent',
                    }}
                  >
                    <span className="font-mono text-xs font-bold shrink-0" style={{ color: '#1e3a8a', minWidth: 96 }}>
                      {p.product_no}
                    </span>
                    <span className="text-xs truncate flex-1" style={{ color: 'rgba(30,58,138,0.75)' }}>
                      {p.description || '—'}
                    </span>
                    <span className="font-mono text-[10px] shrink-0" style={{ color: 'rgba(30,58,138,0.4)' }}>
                      {p.net_weight_kg}kg · {p.container_fill_cases} cs
                    </span>
                  </button>
                );
              })}

              {canCreate && (
                <button
                  data-idx={filtered.length}
                  onMouseDown={e => { e.preventDefault(); setCreating(true); }}
                  onMouseEnter={() => setHighlighted(filtered.length)}
                  className="w-full px-3 py-2.5 flex items-center gap-2"
                  style={{
                    background: highlighted === filtered.length ? `${accentColor}14` : 'rgba(245,247,255,0.6)',
                    borderTop: `1px solid ${accentColor}22`,
                    borderLeft: highlighted === filtered.length ? `3px solid ${accentColor}` : '3px solid transparent',
                    color: accentColor,
                  }}
                >
                  <Icon name="plus" size={12} />
                  <span className="text-xs font-bold">Create</span>
                  <span className="font-mono text-xs">"{query.trim()}"</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline create form ────────────────────────────────────────────────────────

function CreateForm({
  productNo, onCancel, onCreated, onCreate, accentColor,
}: {
  productNo: string;
  onCancel: () => void;
  onCreated: (p: Product) => void;
  onCreate: (input: NewProductInput) => Promise<Product>;
  accentColor: string;
}) {
  const [description, setDescription] = useState('');
  const [netWeight, setNetWeight] = useState(0);
  const [fillKg, setFillKg] = useState(0);
  const [fillCases, setFillCases] = useState(0);
  const [packsPerCase, setPacksPerCase] = useState(0);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!productNo.trim()) return;
    setSaving(true); setErr(null);
    try {
      const p = await onCreate({
        product_no: productNo.trim(),
        description: description.trim(),
        net_weight_kg: netWeight,
        container_fill_kg: fillKg,
        container_fill_cases: fillCases,
        packs_per_case: packsPerCase,
      });
      onCreated(p);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full px-2 py-1.5 text-xs focus:outline-none";
  const inputStyle = { background: '#fff', border: `1px solid ${accentColor}33`, borderRadius: 8, color: '#1e3a8a' };

  return (
    <div className="p-3 space-y-2.5" style={{ background: 'rgba(245,247,255,0.5)' }}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold" style={{ color: accentColor }}>Create "{productNo}"</p>
        <button onClick={onCancel} style={{ color: 'rgba(30,58,138,0.4)' }}><Icon name="close" size={13} /></button>
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(30,58,138,0.55)' }}>Description</label>
        <input type="text" className={inputCls} style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Product name as it appears on packaging" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(30,58,138,0.55)' }}>Net Weight (kg)</label>
          <input type="number" step={0.1} className={inputCls} style={inputStyle} value={netWeight || ''} onChange={e => setNetWeight(parseFloat(e.target.value) || 0)} placeholder="10" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(30,58,138,0.55)' }}>Packs / Case</label>
          <input type="number" step={1} className={inputCls} style={inputStyle} value={packsPerCase || ''} onChange={e => setPacksPerCase(parseInt(e.target.value) || 0)} placeholder="10" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(30,58,138,0.55)' }}>Container Fill (kg)</label>
          <input type="number" step={1} className={inputCls} style={inputStyle} value={fillKg || ''} onChange={e => setFillKg(parseFloat(e.target.value) || 0)} placeholder="19270" />
        </div>
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(30,58,138,0.55)' }}>Container Fill (cases)</label>
          <input type="number" step={1} className={inputCls} style={inputStyle} value={fillCases || ''} onChange={e => setFillCases(parseInt(e.target.value) || 0)} placeholder="1927" />
        </div>
      </div>
      {err && <p className="text-[10px] text-red-600 font-mono">{err}</p>}
      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-bold" style={{ color: 'rgba(30,58,138,0.6)' }}>
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg disabled:opacity-40 flex items-center gap-1.5"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`, color: '#fff' }}
        >
          {saving ? <Spinner size={11} /> : <Icon name="plus" size={11} />}
          Save Product
        </button>
      </div>
    </div>
  );
}
