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
      <label className="brut-section-label">{label}</label>
      <div className="relative flex items-center">
        <input
          type="number"
          min={min}
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          onWheel={e => e.currentTarget.blur()}
          className="brut-input w-full pl-3 pr-8 py-2 text-sm"
          placeholder="0"
        />
        <span className="absolute right-2.5 text-[10px] font-medium text-white/30 pointer-events-none select-none">{unit}</span>
      </div>
    </div>
  );
}

interface ConstraintsProps {
  product: Product;
  onUpdate: (field: keyof Product, value: unknown) => void;
  unit: string;
}

function ConstraintsPanel({ product, onUpdate, unit: _unit }: ConstraintsProps) {
  return (
    <div className="space-y-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="brut-section-label">Qty</label>
          <input
            type="number"
            min={0}
            value={product.quantity || ''}
            onChange={e => onUpdate('quantity', parseInt(e.target.value) || undefined)}
            onWheel={e => e.currentTarget.blur()}
            className="brut-input w-full px-3 py-2 text-sm"
            placeholder="∞"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="brut-section-label">Priority</label>
          <input
            type="number"
            min={1}
            max={10}
            value={product.priority ?? 5}
            onChange={e => onUpdate('priority', Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))}
            onWheel={e => e.currentTarget.blur()}
            className="brut-input w-full px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onUpdate('stackable', !product.stackable)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-left text-[11px] font-semibold transition-all ${
            product.stackable === false
              ? 'text-white'
              : 'text-white/50 hover:text-white/75'
          }`}
          style={product.stackable === false
            ? { background: 'rgba(61,178,64,0.20)', border: '1px solid rgba(61,178,64,0.35)' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }
          }
        >
          <Layers size={11} />
          No Stack
        </button>
        <button
          onClick={() => onUpdate('fragile', !product.fragile)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-left text-[11px] font-semibold transition-all ${
            product.fragile
              ? 'text-white'
              : 'text-white/50 hover:text-white/75'
          }`}
          style={product.fragile
            ? { background: 'rgba(245,158,11,0.20)', border: '1px solid rgba(245,158,11,0.35)' }
            : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }
          }
        >
          <AlertTriangle size={11} />
          Fragile
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="brut-section-label">Orientation</label>
        <div className="grid grid-cols-3 gap-1">
          {(['none', 'upright', 'on-side'] as OrientationLock[]).map(lock => (
            <button
              key={lock}
              onClick={() => onUpdate('orientationLock', lock)}
              className={`py-1.5 text-[10px] font-semibold rounded-lg transition-all ${
                (product.orientationLock ?? 'none') === lock
                  ? 'text-white'
                  : 'text-white/45 hover:text-white/70'
              }`}
              style={(product.orientationLock ?? 'none') === lock
                ? { background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.20)' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {lock === 'none' ? 'Free' : lock === 'upright' ? 'Up' : 'Side'}
            </button>
          ))}
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
}

export function ProductForm({ products, unit, userId, onUpdate, onAdd, onRemove, onImportCSV, onAddProduct }: Props) {
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
    if (csvPreview && csvPreview.products.length > 0) {
      onImportCSV(csvPreview.products);
    }
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
      <div className="flex items-center justify-between">
        <span className="brut-section-label">{products.length}/{MAX_PRODUCTS} products</span>
        <div className="flex items-center gap-1.5">
          {userId && (
            <button
              onClick={() => setSavedModalOpen(true)}
              title="Saved Products"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white/50 hover:text-white/80 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <Package size={10} />
              Library
            </button>
          )}
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold text-white/50 hover:text-white/80 transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <Upload size={10} />
            CSV
          </button>
        </div>
      </div>

      {products.map((p, idx) => {
        const isExpanded = expandedConstraints.has(p.id);
        const hasConstraints = hasActiveConstraints(p);
        return (
          <div
            key={p.id}
            className="rounded-xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderLeft: `3px solid ${p.color}` }}
          >
            <div
              className="flex items-center justify-between px-3 py-2.5"
              style={{ background: `${p.color}18`, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
                <input
                  type="text"
                  value={p.name}
                  onChange={e => onUpdate(p.id, 'name', e.target.value)}
                  className="text-sm font-semibold bg-transparent border-none outline-none w-full min-w-0 text-white placeholder-white/35"
                  placeholder={PRODUCT_LABELS[idx] ?? `Product ${idx + 1}`}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {p.quantity && p.quantity > 0 ? (
                  <span className="text-[9px] text-white/40 font-medium mr-1">×{p.quantity}</span>
                ) : null}
                {userId && (
                  <button
                    onClick={() => handleSaveProduct(p)}
                    disabled={savingId === p.id}
                    title={saveErrorId === p.id ? 'Save failed' : 'Save product'}
                    className={`p-0.5 transition-colors disabled:opacity-40 ${saveErrorId === p.id ? 'text-red-400' : savedIds.has(p.id) ? 'text-white' : 'text-white/35 hover:text-white/70'}`}
                  >
                    {saveErrorId === p.id
                      ? <X size={13} strokeWidth={2} />
                      : <Bookmark size={13} strokeWidth={2} fill={savedIds.has(p.id) ? 'currentColor' : 'none'} />
                    }
                  </button>
                )}
                {products.length > 1 && (
                  <button
                    onClick={() => onRemove(p.id)}
                    className="text-white/30 hover:text-red-400 transition-colors p-0.5"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <NumericField label="D" value={p.length} onChange={v => onUpdate(p.id, 'length', v)} unit={unit} />
                <NumericField label="W" value={p.width} onChange={v => onUpdate(p.id, 'width', v)} unit={unit} />
                <NumericField label="H" value={p.height} onChange={v => onUpdate(p.id, 'height', v)} unit={unit} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <NumericField label="Net wt" value={p.netWeight} onChange={v => onUpdate(p.id, 'netWeight', v)} unit="kg" />
                <NumericField label="Gross wt" value={p.grossWeight} onChange={v => onUpdate(p.id, 'grossWeight', v)} unit="kg" />
              </div>

              <button
                onClick={() => toggleConstraints(p.id)}
                className="flex items-center justify-between w-full text-left py-1.5 px-0 group"
              >
                <span className="flex items-center gap-2 brut-section-label group-hover:text-white/60 transition-colors">
                  Constraints
                  {hasConstraints && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#3DB240' }} />}
                </span>
                {isExpanded
                  ? <ChevronUp size={12} className="text-white/30" />
                  : <ChevronDown size={12} className="text-white/30" />}
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

      {products.length < MAX_PRODUCTS && (
        <button
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-semibold text-white/40 hover:text-white/70 transition-all"
          style={{ border: '1px dashed rgba(255,255,255,0.15)', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
        >
          <Plus size={14} />
          Add product
        </button>
      )}

      {savedModalOpen && userId && (
        <SavedProductsModal
          userId={userId}
          onLoad={onAddProduct}
          onClose={() => setSavedModalOpen(false)}
        />
      )}

      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(10,22,40,0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.40)',
            }}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <span className="text-sm font-semibold text-white">Import Products from CSV</span>
              <button onClick={() => { setCsvModalOpen(false); setCsvPreview(null); }} className="text-white/40 hover:text-white transition-colors">
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div
                onDragEnter={() => setIsDragging(true)}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleCSVFile(file);
                }}
                className="border-2 border-dashed rounded-xl py-8 text-center cursor-pointer transition-all"
                style={{ borderColor: isDragging ? '#3DB240' : 'rgba(255,255,255,0.15)', background: isDragging ? 'rgba(61,178,64,0.06)' : 'rgba(255,255,255,0.03)' }}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={22} className="mx-auto mb-3 text-white/30" />
                <p className="text-xs font-semibold text-white/55">Drop CSV here or click to browse</p>
                <p className="text-[10px] text-white/30 mt-1.5">name, length, width, height, netWeight, grossWeight, quantity</p>
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
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white/50 hover:text-white/80 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
              >
                <Download size={12} />
                Download template
              </button>

              {csvPreview && (
                <div className="space-y-3">
                  {csvPreview.errors.length > 0 && (
                    <div className="rounded-xl p-3 space-y-1" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.22)' }}>
                      {csvPreview.errors.map((err, i) => (
                        <p key={i} className="text-[10px] font-medium text-red-400">{err}</p>
                      ))}
                    </div>
                  )}

                  {csvPreview.products.length > 0 && (
                    <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
                      <table className="w-full text-left">
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.07)' }}>
                            {['Name', 'L', 'W', 'H', 'Qty'].map(h => (
                              <th key={h} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-white/50">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.products.map((p, i) => (
                            <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <td className="px-3 py-1.5 text-[10px] font-medium truncate max-w-28 text-white/80">{p.name}</td>
                              <td className="px-3 py-1.5 font-mono text-[10px] text-white/45">{p.length}</td>
                              <td className="px-3 py-1.5 font-mono text-[10px] text-white/45">{p.width}</td>
                              <td className="px-3 py-1.5 font-mono text-[10px] text-white/45">{p.height}</td>
                              <td className="px-3 py-1.5 font-mono text-[10px] text-white/45">{p.quantity ?? '—'}</td>
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
                      className="flex-1 py-3 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40"
                      style={{ background: '#3DB240', boxShadow: '0 4px 16px rgba(61,178,64,0.30)' }}
                    >
                      Import {csvPreview.products.length} product{csvPreview.products.length !== 1 ? 's' : ''}
                    </button>
                    <button
                      onClick={() => { setCsvModalOpen(false); setCsvPreview(null); }}
                      className="px-4 py-3 rounded-xl text-xs font-semibold text-white/50 hover:text-white/80 transition-all"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
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
