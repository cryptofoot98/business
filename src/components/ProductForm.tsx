import { useRef, useState } from 'react';
import { Plus, Trash2, Upload, Download, ChevronDown, ChevronUp, AlertTriangle, Layers, Bookmark, Package, X } from 'lucide-react';
import { Product, OrientationLock } from '../types';
import { PRODUCT_COLORS, PRODUCT_LABELS, MAX_PRODUCTS } from '../utils/colors';
import { parseCSV, downloadCSVTemplate, CSVImportResult } from '../utils/csvImport';
import { saveProduct } from '../lib/savedProducts';
import { SavedProductsModal } from './SavedProductsModal';

export { PRODUCT_COLORS, PRODUCT_LABELS };

interface FieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  min?: number;
}

function NumericField({ label, value, onChange, unit, min = 0 }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-mono text-[10px] font-medium uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.42)' }}>{label}</label>
      <div className="relative flex items-center">
        <input
          type="number"
          min={min}
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          onWheel={e => e.currentTarget.blur()}
          className="w-full pl-3 pr-8 py-2 text-sm font-medium focus:outline-none transition-all placeholder:opacity-30"
          style={{
            background: 'rgba(255,255,255,0.88)',
            border: '1px solid rgba(22,163,74,0.2)',
            borderRadius: 9,
            color: '#14532d',
          }}
          placeholder="0"
        />
        <span className="absolute right-2.5 font-mono text-[10px] pointer-events-none select-none" style={{ color: 'rgba(20,83,45,0.35)' }}>{unit}</span>
      </div>
    </div>
  );
}

interface ConstraintsProps {
  product: Product;
  onUpdate: (field: keyof Product, value: unknown) => void;
  unit: string;
}

function ConstraintsPanel({ product, onUpdate, unit }: ConstraintsProps) {
  const pillWrap = {
    background: 'rgba(0,0,0,0.05)',
    border: '1px solid rgba(0,0,0,0.07)',
    borderRadius: 100,
    padding: 2,
  } as const;

  return (
    <div className="space-y-3 pt-3" style={{ borderTop: '1px solid rgba(22,163,74,0.1)' }}>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] font-medium uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.42)' }}>Qty to ship</label>
          <input
            type="number"
            min={0}
            value={product.quantity || ''}
            onChange={e => onUpdate('quantity', parseInt(e.target.value) || undefined)}
            onWheel={e => e.currentTarget.blur()}
            className="w-full px-3 py-2 text-sm font-medium focus:outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 9, color: '#14532d' }}
            placeholder="∞"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] font-medium uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.42)' }}>Priority</label>
          <input
            type="number"
            min={1}
            max={10}
            value={product.priority ?? 5}
            onChange={e => onUpdate('priority', Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))}
            onWheel={e => e.currentTarget.blur()}
            className="w-full px-3 py-2 text-sm font-medium focus:outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 9, color: '#14532d' }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onUpdate('stackable', !product.stackable)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide text-left transition-all"
          style={product.stackable === false ? {
            background: 'rgba(220,38,38,0.1)',
            border: '1px solid rgba(220,38,38,0.3)',
            color: '#dc2626',
          } : {
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(22,163,74,0.15)',
            color: 'rgba(20,83,45,0.55)',
          }}
        >
          <Layers size={11} strokeWidth={2} />
          Non-stackable
        </button>
        <button
          onClick={() => onUpdate('fragile', !product.fragile)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-wide text-left transition-all"
          style={product.fragile ? {
            background: 'rgba(217,119,6,0.1)',
            border: '1px solid rgba(217,119,6,0.3)',
            color: '#d97706',
          } : {
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(22,163,74,0.15)',
            color: 'rgba(20,83,45,0.55)',
          }}
        >
          <AlertTriangle size={11} strokeWidth={2} />
          Fragile
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-mono text-[10px] font-medium uppercase tracking-widest" style={{ color: 'rgba(20,83,45,0.42)' }}>Orientation</label>
        <div className="flex gap-0.5" style={pillWrap}>
          {(['none', 'upright', 'on-side'] as OrientationLock[]).map(lock => {
            const isActive = (product.orientationLock ?? 'none') === lock;
            return (
              <button
                key={lock}
                onClick={() => onUpdate('orientationLock', lock)}
                className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all"
                style={isActive ? {
                  background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  borderRadius: 100,
                  color: '#fff',
                  boxShadow: '0 1px 6px rgba(22,163,74,0.3)',
                } : {
                  background: 'transparent',
                  borderRadius: 100,
                  color: 'rgba(20,83,45,0.5)',
                }}
              >
                {lock === 'none' ? 'Free' : lock === 'upright' ? 'Upright' : 'Side'}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Props {
  products: Product[];
  unit: string;
  userId?: string;
  onUpdate: (id: string, field: keyof Product, value: unknown) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onImportCSV: (products: Product[]) => void;
  onAddProduct: (data: Omit<Product, 'id' | 'color'>) => void;
  maxProducts?: number;
}

export function ProductForm({ products, unit, userId, onUpdate, onAdd, onRemove, onImportCSV, onAddProduct, maxProducts = MAX_PRODUCTS }: Props) {
  const [expandedConstraints, setExpandedConstraints] = useState<Set<string>>(new Set());
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CSVImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [savedModalOpen, setSavedModalOpen] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveErrorId, setSaveErrorId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleConstraints = (id: string) => {
    setExpandedConstraints(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const hasActiveConstraints = (p: Product) =>
    p.stackable === false || p.fragile === true || p.orientationLock !== 'none' || (p.quantity && p.quantity > 0) || (p.priority !== undefined && p.priority !== 5);

  const handleCSVFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const result = parseCSV(text, products.length);
      setCsvPreview(result);
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = () => {
    if (csvPreview && csvPreview.products.length > 0) onImportCSV(csvPreview.products);
    setCsvModalOpen(false);
    setCsvPreview(null);
  };

  const handleSaveProduct = async (p: Product) => {
    if (!userId) return;
    setSavingId(p.id);
    setSaveErrorId(null);
    try {
      await saveProduct(userId, p);
      setSavedIds(prev => new Set([...prev, p.id]));
      setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(p.id); return n; }), 2000);
    } catch {
      setSaveErrorId(p.id);
      setTimeout(() => setSaveErrorId(null), 3000);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] font-medium" style={{ color: 'rgba(20,83,45,0.38)' }}>
          {products.length}/{maxProducts} products
        </span>
        <div className="flex items-center gap-1.5">
          {userId && (
            <button
              onClick={() => setSavedModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all"
              style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(22,163,74,0.18)', borderRadius: 100, color: '#15803d' }}
            >
              <Package size={10} strokeWidth={2} />
              Library
            </button>
          )}
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition-all"
            style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(22,163,74,0.18)', borderRadius: 100, color: '#15803d' }}
          >
            <Upload size={10} strokeWidth={2} />
            CSV
          </button>
        </div>
      </div>

      {/* Product cards */}
      {products.map((p, idx) => {
        const isExpanded = expandedConstraints.has(p.id);
        const hasConstraints = hasActiveConstraints(p);
        return (
          <div
            key={p.id}
            className="overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.82)',
              border: '1px solid rgba(22,163,74,0.14)',
              borderRadius: 14,
              boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
            }}
          >
            {/* Colored header */}
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: p.color }}>
              <input
                type="text"
                value={p.name}
                onChange={e => onUpdate(p.id, 'name', e.target.value)}
                className="text-sm font-semibold text-white bg-transparent border-none outline-none w-full min-w-0"
                style={{ '::placeholder': { color: 'rgba(255,255,255,0.55)' } } as React.CSSProperties}
                placeholder={PRODUCT_LABELS[idx] ?? `Product ${idx + 1}`}
              />
              <div className="flex items-center gap-1 shrink-0">
                {p.quantity && p.quantity > 0 ? (
                  <span className="font-mono text-[9px] text-white/70 font-medium mr-0.5">×{p.quantity}</span>
                ) : null}
                {userId && (
                  <button
                    onClick={() => handleSaveProduct(p)}
                    disabled={savingId === p.id}
                    title={saveErrorId === p.id ? 'Save failed' : 'Save to library'}
                    className="p-0.5 transition-colors disabled:opacity-40"
                    style={{ color: saveErrorId === p.id ? '#fca5a5' : savedIds.has(p.id) ? '#fff' : 'rgba(255,255,255,0.55)' }}
                  >
                    {saveErrorId === p.id
                      ? <X size={12} strokeWidth={2} />
                      : <Bookmark size={12} strokeWidth={2} fill={savedIds.has(p.id) ? 'currentColor' : 'none'} />
                    }
                  </button>
                )}
                {products.length > 1 && (
                  <button
                    onClick={() => onRemove(p.id)}
                    className="p-0.5 transition-colors"
                    style={{ color: 'rgba(255,255,255,0.6)' }}
                  >
                    <Trash2 size={12} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Body */}
            <div className="p-3 space-y-2.5">
              <div className="grid grid-cols-3 gap-2">
                <NumericField label="D" value={p.length} onChange={v => onUpdate(p.id, 'length', v)} unit={unit} />
                <NumericField label="W" value={p.width} onChange={v => onUpdate(p.id, 'width', v)} unit={unit} />
                <NumericField label="H" value={p.height} onChange={v => onUpdate(p.id, 'height', v)} unit={unit} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumericField label="Net wt" value={p.netWeight} onChange={v => onUpdate(p.id, 'netWeight', v)} unit="kg" />
                <NumericField label="Gross wt" value={p.grossWeight} onChange={v => onUpdate(p.id, 'grossWeight', v)} unit="kg" />
              </div>

              {/* Constraints toggle */}
              <button
                onClick={() => toggleConstraints(p.id)}
                className="flex items-center justify-between w-full text-left py-1 group"
              >
                <span className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-widest transition-colors" style={{ color: 'rgba(20,83,45,0.45)' }}>
                  Constraints
                  {hasConstraints && (
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d97706' }} />
                  )}
                </span>
                {isExpanded
                  ? <ChevronUp size={12} strokeWidth={2} style={{ color: 'rgba(20,83,45,0.35)' }} />
                  : <ChevronDown size={12} strokeWidth={2} style={{ color: 'rgba(20,83,45,0.35)' }} />}
              </button>

              {isExpanded && (
                <ConstraintsPanel
                  product={p}
                  onUpdate={(field, value) => onUpdate(p.id, field, value)}
                  unit={unit}
                />
              )}
            </div>
          </div>
        );
      })}

      {/* Add product */}
      {products.length < maxProducts && (
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 py-3 font-mono text-xs font-semibold uppercase tracking-wider transition-all"
          style={{
            border: '1px dashed rgba(22,163,74,0.3)',
            borderRadius: 12,
            color: 'rgba(20,83,45,0.42)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(22,163,74,0.6)'; (e.currentTarget as HTMLButtonElement).style.color = '#15803d'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(22,163,74,0.04)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(22,163,74,0.3)'; (e.currentTarget as HTMLButtonElement).style.color = 'rgba(20,83,45,0.42)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
          <Plus size={14} strokeWidth={2} />
          Add product
        </button>
      )}

      {/* Saved products modal */}
      {savedModalOpen && userId && (
        <SavedProductsModal
          userId={userId}
          onLoad={onAddProduct}
          onClose={() => setSavedModalOpen(false)}
        />
      )}

      {/* CSV modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(22,163,74,0.18)', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ background: 'linear-gradient(135deg, #14532d, #15803d)', borderBottom: '1px solid rgba(22,163,74,0.2)' }}>
              <span className="text-sm font-semibold text-white">Import Products from CSV</span>
              <button onClick={() => { setCsvModalOpen(false); setCsvPreview(null); }} className="transition-colors" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Drop zone */}
              <div
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); setIsDragging(false); const file = e.dataTransfer.files[0]; if (file) handleCSVFile(file); }}
                onClick={() => fileRef.current?.click()}
                className="py-8 text-center cursor-pointer rounded-xl transition-all"
                style={isDragging ? {
                  background: 'rgba(22,163,74,0.08)',
                  border: '2px dashed rgba(22,163,74,0.5)',
                } : {
                  background: 'rgba(22,163,74,0.04)',
                  border: '1px dashed rgba(22,163,74,0.25)',
                }}
              >
                <Upload size={24} className="mx-auto mb-3" style={{ color: 'rgba(20,83,45,0.35)' }} />
                <p className="font-mono text-xs font-medium" style={{ color: 'rgba(20,83,45,0.5)' }}>
                  Drop CSV here or click to browse
                </p>
                <p className="font-mono text-[10px] mt-1.5" style={{ color: 'rgba(20,83,45,0.32)' }}>
                  Columns: name, length, width, height, netWeight, grossWeight, quantity
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); }}
                />
              </div>

              <button
                onClick={downloadCSVTemplate}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
                style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 100, color: '#15803d' }}
              >
                <Download size={12} strokeWidth={2} />
                Download template
              </button>

              {csvPreview && (
                <div className="space-y-3">
                  {csvPreview.errors.length > 0 && (
                    <div className="p-3 rounded-xl space-y-1" style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
                      {csvPreview.errors.map((err, i) => (
                        <p key={i} className="font-mono text-[10px] font-medium" style={{ color: '#dc2626' }}>{err}</p>
                      ))}
                    </div>
                  )}

                  {csvPreview.products.length > 0 && (
                    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(22,163,74,0.15)' }}>
                      <table className="w-full text-left">
                        <thead>
                          <tr style={{ background: 'rgba(22,163,74,0.08)' }}>
                            {['Name', 'L', 'W', 'H', 'Qty'].map(h => (
                              <th key={h} className="px-3 py-2 font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#15803d' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.products.map((p, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(22,163,74,0.03)', borderTop: '1px solid rgba(22,163,74,0.08)' }}>
                              <td className="px-3 py-1.5 font-mono text-[10px] font-medium truncate max-w-28" style={{ color: '#14532d' }}>{p.name}</td>
                              <td className="px-3 py-1.5 font-mono text-[10px]" style={{ color: 'rgba(20,83,45,0.6)' }}>{p.length}</td>
                              <td className="px-3 py-1.5 font-mono text-[10px]" style={{ color: 'rgba(20,83,45,0.6)' }}>{p.width}</td>
                              <td className="px-3 py-1.5 font-mono text-[10px]" style={{ color: 'rgba(20,83,45,0.6)' }}>{p.height}</td>
                              <td className="px-3 py-1.5 font-mono text-[10px]" style={{ color: 'rgba(20,83,45,0.6)' }}>{p.quantity ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleImportConfirm}
                      disabled={csvPreview.products.length === 0}
                      className="flex-1 py-2.5 text-white text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)', borderRadius: 100, boxShadow: '0 3px 12px rgba(22,163,74,0.35)' }}
                    >
                      Import {csvPreview.products.length} product{csvPreview.products.length !== 1 ? 's' : ''}
                    </button>
                    <button
                      onClick={() => { setCsvModalOpen(false); setCsvPreview(null); }}
                      className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
                      style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 100, color: '#15803d' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
