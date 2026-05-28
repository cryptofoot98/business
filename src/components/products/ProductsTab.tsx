import { useState, useMemo, useCallback } from 'react';
import {
  Database, Search, Plus, Trash2, Save, X, Loader, Check, AlertTriangle, Pencil,
} from 'lucide-react';
import { Product, NewProductInput } from '../../types/product';
import { Section } from '../costings/shared';

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  products: Product[];
  onCreate: (input: NewProductInput) => Promise<Product>;
  onUpdate: (id: string, patch: Partial<NewProductInput>) => Promise<Product>;
  onDelete: (id: string) => Promise<void>;
}

// ── Editing state ─────────────────────────────────────────────────────────────

type EditState = {
  product_no: string;
  description: string;
  net_weight_kg: number;
  container_fill_kg: number;
  container_fill_cases: number;
  packs_per_case: number;
};

function blankRow(): EditState {
  return {
    product_no: '', description: '',
    net_weight_kg: 0, container_fill_kg: 0,
    container_fill_cases: 0, packs_per_case: 0,
  };
}
function fromProduct(p: Product): EditState {
  return {
    product_no: p.product_no,
    description: p.description,
    net_weight_kg: p.net_weight_kg,
    container_fill_kg: p.container_fill_kg,
    container_fill_cases: p.container_fill_cases,
    packs_per_case: p.packs_per_case,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ProductsTab({ products, onCreate, onUpdate, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditState>(blankRow);
  const [creating, setCreating] = useState(false);
  const [newDraft, setNewDraft] = useState<EditState>(blankRow);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(p =>
      p.product_no.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q),
    );
  }, [products, query]);

  const startEdit = useCallback((p: Product) => {
    setEditingId(p.id);
    setEditDraft(fromProduct(p));
    setErr(null);
  }, []);
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft(blankRow());
    setErr(null);
  }, []);

  async function saveEdit(id: string) {
    if (!editDraft.product_no.trim()) { setErr('Product No is required.'); return; }
    setBusy(true); setErr(null);
    try {
      await onUpdate(id, editDraft);
      cancelEdit();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function saveNew() {
    if (!newDraft.product_no.trim()) { setErr('Product No is required.'); return; }
    setBusy(true); setErr(null);
    try {
      await onCreate(newDraft);
      setCreating(false);
      setNewDraft(blankRow());
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  async function confirmDelete(id: string) {
    setBusy(true); setErr(null);
    try {
      await onDelete(id);
      setPendingDelete(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setBusy(false); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">

      <Section title={`Products Catalog (${products.length})`} icon={<Database size={13} />} accent="blue">
        {/* Search + Add row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[240px] relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(30,58,138,0.45)' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search product no or description…"
              className="w-full pl-9 pr-3 py-2 text-sm focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.85)',
                border: '1px solid rgba(37,99,235,0.22)',
                borderRadius: 12,
                color: '#1e3a8a',
              }}
            />
          </div>
          {query && (
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgba(30,58,138,0.55)' }}>
              {filtered.length} match{filtered.length === 1 ? '' : 'es'}
            </span>
          )}
          <button
            onClick={() => { setCreating(true); setNewDraft(blankRow()); setErr(null); }}
            disabled={creating}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff' }}
          >
            <Plus size={12} /> New Product
          </button>
        </div>

        {err && (
          <div className="flex items-start gap-2 p-2 rounded-xl" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}>
            <AlertTriangle size={12} style={{ color: '#dc2626', marginTop: 2 }} />
            <p className="text-xs" style={{ color: '#991b1b' }}>{err}</p>
            <button onClick={() => setErr(null)} className="ml-auto" style={{ color: 'rgba(127,29,29,0.6)' }}><X size={12} /></button>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid rgba(37,99,235,0.22)' }}>
          <table className="w-full text-xs" style={{ minWidth: 920, borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'rgba(37,99,235,0.10)' }}>
                <Th>Product No</Th>
                <Th>Description</Th>
                <Th align="right">Net Wt (kg)</Th>
                <Th align="right">Container Fill (kg)</Th>
                <Th align="right">Fill (cases)</Th>
                <Th align="right">Packs/Case</Th>
                <Th align="right" width={104}>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {creating && (
                <tr style={{ background: 'rgba(37,99,235,0.06)', borderBottom: '1px solid rgba(37,99,235,0.20)' }}>
                  <EditTd><EditText value={newDraft.product_no} onChange={v => setNewDraft({ ...newDraft, product_no: v })} placeholder="C99999" /></EditTd>
                  <EditTd><EditText value={newDraft.description} onChange={v => setNewDraft({ ...newDraft, description: v })} placeholder="Product name on packaging" /></EditTd>
                  <EditTd><EditNum value={newDraft.net_weight_kg} onChange={v => setNewDraft({ ...newDraft, net_weight_kg: v })} step={0.1} /></EditTd>
                  <EditTd><EditNum value={newDraft.container_fill_kg} onChange={v => setNewDraft({ ...newDraft, container_fill_kg: v })} /></EditTd>
                  <EditTd><EditNum value={newDraft.container_fill_cases} onChange={v => setNewDraft({ ...newDraft, container_fill_cases: Math.floor(v) })} step={1} /></EditTd>
                  <EditTd><EditNum value={newDraft.packs_per_case} onChange={v => setNewDraft({ ...newDraft, packs_per_case: Math.floor(v) })} step={1} /></EditTd>
                  <td className="px-2 py-1.5 text-right" style={{ borderBottom: '1px solid rgba(37,99,235,0.15)' }}>
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn onClick={saveNew} tone="primary" busy={busy}><Check size={11} /></IconBtn>
                      <IconBtn onClick={() => { setCreating(false); setErr(null); }}><X size={11} /></IconBtn>
                    </div>
                  </td>
                </tr>
              )}

              {filtered.length === 0 && !creating && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center">
                    <Database size={22} className="mx-auto mb-2" style={{ color: 'rgba(30,58,138,0.2)' }} />
                    <p className="text-xs" style={{ color: 'rgba(30,58,138,0.5)' }}>
                      {query ? 'No products match your search.' : 'Catalog is empty — click "New Product" to add one.'}
                    </p>
                  </td>
                </tr>
              )}

              {filtered.map(p => {
                const isEditing = editingId === p.id;
                const isDeleting = pendingDelete === p.id;
                if (isEditing) {
                  return (
                    <tr key={p.id} style={{ background: 'rgba(37,99,235,0.06)', borderBottom: '1px solid rgba(37,99,235,0.20)' }}>
                      <EditTd><EditText value={editDraft.product_no} onChange={v => setEditDraft({ ...editDraft, product_no: v })} /></EditTd>
                      <EditTd><EditText value={editDraft.description} onChange={v => setEditDraft({ ...editDraft, description: v })} /></EditTd>
                      <EditTd><EditNum value={editDraft.net_weight_kg} onChange={v => setEditDraft({ ...editDraft, net_weight_kg: v })} step={0.1} /></EditTd>
                      <EditTd><EditNum value={editDraft.container_fill_kg} onChange={v => setEditDraft({ ...editDraft, container_fill_kg: v })} /></EditTd>
                      <EditTd><EditNum value={editDraft.container_fill_cases} onChange={v => setEditDraft({ ...editDraft, container_fill_cases: Math.floor(v) })} step={1} /></EditTd>
                      <EditTd><EditNum value={editDraft.packs_per_case} onChange={v => setEditDraft({ ...editDraft, packs_per_case: Math.floor(v) })} step={1} /></EditTd>
                      <td className="px-2 py-1.5 text-right" style={{ borderBottom: '1px solid rgba(37,99,235,0.15)' }}>
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn onClick={() => saveEdit(p.id)} tone="primary" busy={busy}><Save size={11} /></IconBtn>
                          <IconBtn onClick={cancelEdit}><X size={11} /></IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(37,99,235,0.10)' }}>
                    <td className="px-3 py-1.5 font-mono font-bold" style={{ color: '#1e3a8a', borderRight: '1px solid rgba(37,99,235,0.08)' }}>{p.product_no}</td>
                    <td className="px-3 py-1.5" style={{ color: 'rgba(30,58,138,0.85)', borderRight: '1px solid rgba(37,99,235,0.08)' }}>{p.description || '—'}</td>
                    <td className="px-3 py-1.5 text-right font-mono" style={{ color: '#1e3a8a', borderRight: '1px solid rgba(37,99,235,0.08)' }}>{p.net_weight_kg}</td>
                    <td className="px-3 py-1.5 text-right font-mono" style={{ color: '#1e3a8a', borderRight: '1px solid rgba(37,99,235,0.08)' }}>{p.container_fill_kg.toLocaleString('en-GB')}</td>
                    <td className="px-3 py-1.5 text-right font-mono" style={{ color: '#1e3a8a', borderRight: '1px solid rgba(37,99,235,0.08)' }}>{p.container_fill_cases.toLocaleString('en-GB')}</td>
                    <td className="px-3 py-1.5 text-right font-mono" style={{ color: '#1e3a8a', borderRight: '1px solid rgba(37,99,235,0.08)' }}>{p.packs_per_case}</td>
                    <td className="px-2 py-1.5 text-right">
                      {isDeleting ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] font-mono mr-1" style={{ color: '#dc2626' }}>Delete?</span>
                          <IconBtn onClick={() => confirmDelete(p.id)} tone="danger" busy={busy}><Check size={11} /></IconBtn>
                          <IconBtn onClick={() => setPendingDelete(null)}><X size={11} /></IconBtn>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn onClick={() => startEdit(p)}><Pencil size={11} /></IconBtn>
                          <IconBtn onClick={() => setPendingDelete(p.id)} tone="danger"><Trash2 size={11} /></IconBtn>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] font-mono mt-2" style={{ color: 'rgba(30,58,138,0.45)' }}>
          Catalog is shared across all signed-in users. Changes appear in the Product Code dropdown after a reload of the Costings or Import Control tab.
        </p>
      </Section>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Th({ children, align, width }: { children: React.ReactNode; align?: 'right' | 'left'; width?: number }) {
  return (
    <th
      className="px-3 py-2 text-[10px] uppercase tracking-widest"
      style={{
        textAlign: align ?? 'left',
        color: '#1e3a8a',
        fontWeight: 700,
        borderBottom: '1px solid rgba(37,99,235,0.22)',
        borderRight: '1px solid rgba(37,99,235,0.10)',
        width,
      }}
    >
      {children}
    </th>
  );
}

function EditTd({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-1 py-1" style={{ borderBottom: '1px solid rgba(37,99,235,0.15)', borderRight: '1px solid rgba(37,99,235,0.10)' }}>
      {children}
    </td>
  );
}

function EditText({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-2 py-1 text-xs focus:outline-none"
      style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(37,99,235,0.22)', borderRadius: 6, color: '#1e3a8a' }}
    />
  );
}

function EditNum({ value, onChange, step = 0.01 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <input
      type="number" value={value || ''} onChange={e => onChange(parseFloat(e.target.value) || 0)}
      step={step} min={0}
      className="w-full px-2 py-1 text-right text-xs font-mono focus:outline-none"
      style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(37,99,235,0.22)', borderRadius: 6, color: '#1e3a8a' }}
    />
  );
}

function IconBtn({
  onClick, children, tone, busy,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: 'primary' | 'danger';
  busy?: boolean;
}) {
  const palette =
    tone === 'primary' ? { bg: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', border: 'rgba(37,99,235,0.5)' }
    : tone === 'danger' ? { bg: 'rgba(220,38,38,0.08)', color: '#dc2626', border: 'rgba(220,38,38,0.3)' }
    : { bg: 'rgba(30,58,138,0.06)', color: 'rgba(30,58,138,0.7)', border: 'rgba(30,58,138,0.18)' };
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="p-1.5 rounded-md disabled:opacity-40"
      style={{ background: palette.bg, color: palette.color, border: `1px solid ${palette.border}` }}
    >
      {busy && tone === 'primary' ? <Loader size={11} className="animate-spin" /> : children}
    </button>
  );
}
