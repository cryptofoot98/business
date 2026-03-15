import { useRef, useState } from 'react';
import { Plus, Trash2, Upload, Download, ChevronDown, ChevronUp, AlertTriangle, Layers, Bookmark, Package } from 'lucide-react';
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
      <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/50">{label}</label>
      <div className="relative flex items-center">
        <input
          type="number"
          min={min}
          value={value || ''}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          onWheel={e => e.currentTarget.blur()}
          className="brut-input w-full pl-3 pr-9 py-2.5 text-sm font-black placeholder-brut-black/25"
          placeholder="0"
        />
        <span className="absolute right-2.5 font-mono text-[10px] font-bold text-brut-black/35 pointer-events-none select-none">{unit}</span>
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
  return (
    <div className="space-y-3 pt-3 border-t border-brut-black/10">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/50">Qty to ship</label>
          <div className="relative flex items-center">
            <input
              type="number"
              min={0}
              value={product.quantity || ''}
              onChange={e => onUpdate('quantity', parseInt(e.target.value) || undefined)}
              onWheel={e => e.currentTarget.blur()}
              className="brut-input w-full pl-3 pr-3 py-2 text-sm font-black placeholder-brut-black/25"
              placeholder="∞"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/50">Priority</label>
          <div className="relative flex items-center">
            <input
              type="number"
              min={1}
              max={10}
              value={product.priority ?? 5}
              onChange={e => onUpdate('priority', Math.min(10, Math.max(1, parseInt(e.target.value) || 5)))}
              onWheel={e => e.currentTarget.blur()}
              className="brut-input w-full pl-3 pr-3 py-2 text-sm font-black"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onUpdate('stackable', !product.stackable)}
          className={`flex items-center gap-2 px-3 py-2 border-2 border-brut-black text-left text-[11px] font-black uppercase tracking-tight transition-all ${
            product.stackable === false
              ? 'bg-brut-red text-white'
              : 'bg-white text-brut-black hover:bg-brut-bg'
          }`}
        >
          <Layers size={11} />
          Non-stackable
        </button>
        <button
          onClick={() => onUpdate('fragile', !product.fragile)}
          className={`flex items-center gap-2 px-3 py-2 border-2 border-brut-black text-left text-[11px] font-black uppercase tracking-tight transition-all ${
            product.fragile
              ? 'bg-brut-orange text-white'
              : 'bg-white text-brut-black hover:bg-brut-bg'
          }`}
        >
          <AlertTriangle size={11} />
          Fragile
        </button>
      </div>

      <div className="flex flex-col gap-1">
        <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/50">Orientation</label>
        <div className="grid grid-cols-3 gap-1">
          {(['none', 'upright', 'on-side'] as OrientationLock[]).map(lock => (
            <button
              key={lock}
              onClick={() => onUpdate('orientationLock', lock)}
              className={`py-1.5 text-[10px] font-black uppercase border-2 border-brut-black transition-all ${
                (product.orientationLock ?? 'none') === lock
                  ? 'bg-brut-black text-white'
                  : 'bg-white text-brut-black hover:bg-brut-bg'
              }`}
            >
              {lock === 'none' ? 'Free' : lock === 'upright' ? 'Upright' : 'On Side'}
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
    await saveProduct(userId, p);
    setSavedIds(prev => new Set([...prev, p.id]));
    setSavingId(null);
    setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(p.id); return n; }), 2000);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-brut-black/40 uppercase font-bold">
          {products.length}/{MAX_PRODUCTS} products
        </span>
        <div className="flex items-center gap-1.5">
          {userId && (
            <button
              onClick={() => setSavedModalOpen(true)}
              title="Saved Products"
              className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-brut-black bg-white hover:bg-brut-bg text-[10px] font-black uppercase tracking-wider shadow-brut-sm hover:shadow-brut transition-all"
            >
              <Package size={10} />
              Library
            </button>
          )}
          <button
            onClick={() => setCsvModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-brut-black bg-white hover:bg-brut-bg text-[10px] font-black uppercase tracking-wider shadow-brut-sm hover:shadow-brut transition-all"
          >
            <Upload size={10} />
            CSV import
          </button>
        </div>
      </div>

      {products.map((p, idx) => {
        const isExpanded = expandedConstraints.has(p.id);
        const hasConstraints = hasActiveConstraints(p);
        return (
          <div
            key={p.id}
            className="border-2 border-brut-black bg-brut-white overflow-hidden"
            style={{ boxShadow: `4px 4px 0px ${p.color}` }}
          >
            <div
              className="flex items-center justify-between px-3 py-2 border-b-2 border-brut-black"
              style={{ backgroundColor: p.color }}
            >
              <input
                type="text"
                value={p.name}
                onChange={e => onUpdate(p.id, 'name', e.target.value)}
                className="text-sm font-black uppercase tracking-tight text-white bg-transparent border-none outline-none w-full min-w-0 placeholder-white/60"
                placeholder={PRODUCT_LABELS[idx] ?? `Product ${idx + 1}`}
              />
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {p.quantity && p.quantity > 0 ? (
                  <span className="font-mono text-[9px] text-white/70 font-bold mr-1">×{p.quantity}</span>
                ) : null}
                {userId && (
                  <button
                    onClick={() => handleSaveProduct(p)}
                    disabled={savingId === p.id}
                    title="Save product to library"
                    className={`p-0.5 transition-colors ${savedIds.has(p.id) ? 'text-white' : 'text-white/50 hover:text-white'} disabled:opacity-40`}
                  >
                    <Bookmark size={13} strokeWidth={2.5} fill={savedIds.has(p.id) ? 'currentColor' : 'none'} />
                  </button>
                )}
                {products.length > 1 && (
                  <button
                    onClick={() => onRemove(p.id)}
                    className="text-white/70 hover:text-white transition-colors p-0.5"
                  >
                    <Trash2 size={13} strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <NumericField label="L" value={p.length} onChange={v => onUpdate(p.id, 'length', v)} unit={unit} />
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
                <span className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/50 group-hover:text-brut-black transition-colors">
                  Constraints
                  {hasConstraints && <span className="w-1.5 h-1.5 rounded-full bg-brut-orange" />}
                </span>
                {isExpanded
                  ? <ChevronUp size={12} className="text-brut-black/40" />
                  : <ChevronDown size={12} className="text-brut-black/40" />}
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
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-brut-black/30 hover:border-brut-black bg-transparent hover:bg-brut-bg text-brut-black/50 hover:text-brut-black font-mono text-xs font-bold uppercase tracking-wider transition-all"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-brut-paper border-3 border-brut-black overflow-hidden" style={{ boxShadow: '8px 8px 0px #0d0d0d' }}>
            <div className="flex items-center justify-between px-5 py-4 bg-brut-black">
              <span className="text-sm font-black uppercase tracking-tight text-white">Import Products from CSV</span>
              <button onClick={() => { setCsvModalOpen(false); setCsvPreview(null); }} className="text-white/60 hover:text-white">
                ✕
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
                className={`border-2 border-dashed py-8 text-center cursor-pointer transition-all ${
                  isDragging ? 'border-brut-black bg-brut-bg' : 'border-brut-black/30 hover:border-brut-black'
                }`}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={24} className="mx-auto mb-3 text-brut-black/40" />
                <p className="font-mono text-xs font-bold uppercase tracking-wide text-brut-black/60">
                  Drop CSV here or click to browse
                </p>
                <p className="font-mono text-[10px] text-brut-black/35 mt-1.5">
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
                className="flex items-center gap-2 px-3 py-2 border-2 border-brut-black bg-white hover:bg-brut-bg text-xs font-black uppercase tracking-wider shadow-brut-sm transition-all"
              >
                <Download size={12} />
                Download template
              </button>

              {csvPreview && (
                <div className="space-y-3">
                  {csvPreview.errors.length > 0 && (
                    <div className="bg-brut-red/10 border-2 border-brut-red p-3 space-y-1">
                      {csvPreview.errors.map((err, i) => (
                        <p key={i} className="font-mono text-[10px] font-bold text-brut-red">{err}</p>
                      ))}
                    </div>
                  )}

                  {csvPreview.products.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-2 border-brut-black">
                        <thead>
                          <tr className="bg-brut-black text-white">
                            {['Name', 'L', 'W', 'H', 'Qty'].map(h => (
                              <th key={h} className="px-2 py-2 font-mono text-[10px] font-bold uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {csvPreview.products.map((p, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-brut-bg'}>
                              <td className="px-2 py-1.5 font-mono text-[10px] font-bold truncate max-w-28">{p.name}</td>
                              <td className="px-2 py-1.5 font-mono text-[10px]">{p.length}</td>
                              <td className="px-2 py-1.5 font-mono text-[10px]">{p.width}</td>
                              <td className="px-2 py-1.5 font-mono text-[10px]">{p.height}</td>
                              <td className="px-2 py-1.5 font-mono text-[10px]">{p.quantity ?? '—'}</td>
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
                      className="flex-1 py-3 bg-brut-black text-white font-black text-xs uppercase tracking-wider border-2 border-brut-black hover:bg-brut-red transition-all disabled:opacity-40"
                    >
                      Import {csvPreview.products.length} product{csvPreview.products.length !== 1 ? 's' : ''}
                    </button>
                    <button
                      onClick={() => { setCsvModalOpen(false); setCsvPreview(null); }}
                      className="px-4 py-3 border-2 border-brut-black bg-white hover:bg-brut-bg font-black text-xs uppercase tracking-wider"
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
