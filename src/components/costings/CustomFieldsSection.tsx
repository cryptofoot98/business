import { Plus, Trash2, GripVertical } from 'lucide-react';
import { CustomField, CustomFieldBasis, CustomFieldEffect } from '../../types/costing';

interface Props {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

const BASIS_OPTIONS: { value: CustomFieldBasis; label: string }[] = [
  { value: 'flat_total', label: 'Flat total (£)' },
  { value: 'flat_per_container', label: 'Flat per container (£)' },
  { value: 'flat_per_unit', label: 'Flat per unit (£)' },
  { value: 'percent_of_cif', label: '% of CIF value' },
  { value: 'percent_of_product', label: '% of product cost' },
  { value: 'percent_of_landed', label: '% of landed cost (before customs)' },
];

const isPercent = (basis: CustomFieldBasis) =>
  basis === 'percent_of_cif' || basis === 'percent_of_landed' || basis === 'percent_of_product';

function newField(): CustomField {
  return {
    id: `cf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    basis: 'flat_total',
    value: 0,
    effect: 'cost',
    enabled: true,
  };
}

export function CustomFieldsSection({ fields, onChange }: Props) {
  function update(id: string, patch: Partial<CustomField>) {
    onChange(fields.map(f => (f.id === id ? { ...f, ...patch } : f)));
  }

  function remove(id: string) {
    onChange(fields.filter(f => f.id !== id));
  }

  function add() {
    onChange([...fields, newField()]);
  }

  return (
    <div className="space-y-3">
      {fields.length === 0 && (
        <p className="font-mono text-[10px] italic" style={{ color: 'rgba(20,83,45,0.42)' }}>
          No custom fields yet. Add a field below to include additional costs or benefits.
        </p>
      )}

      {fields.map((field, i) => {
        const cardStyle: React.CSSProperties = field.enabled
          ? field.effect === 'cost'
            ? {
                border: '1px solid rgba(0,0,0,0.08)',
                background: 'rgba(255,255,255,0.68)',
                backdropFilter: 'blur(16px)',
                borderRadius: '12px',
              }
            : {
                border: '1px solid rgba(22,163,74,0.25)',
                background: 'rgba(22,163,74,0.05)',
                backdropFilter: 'blur(16px)',
                borderRadius: '12px',
              }
          : {
              border: '1px solid rgba(0,0,0,0.08)',
              background: 'rgba(255,255,255,0.68)',
              backdropFilter: 'blur(16px)',
              borderRadius: '12px',
              opacity: 0.5,
            };

        return (
          <div key={field.id} className="p-3 space-y-2.5 transition-colors" style={cardStyle}>
            <div className="flex items-center gap-2">
              <GripVertical size={12} className="shrink-0" style={{ color: 'rgba(20,83,45,0.3)' }} strokeWidth={2} />

              <input
                type="checkbox"
                checked={field.enabled}
                onChange={e => update(field.id, { enabled: e.target.checked })}
                className="w-3.5 h-3.5 shrink-0"
                style={{ accentColor: '#16a34a' }}
                title="Enable / disable"
              />

              <input
                type="text"
                value={field.name}
                onChange={e => update(field.id, { name: e.target.value })}
                placeholder={`Custom field ${i + 1} name…`}
                className="flex-1 px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors min-w-0"
                style={{
                  background: 'rgba(255,255,255,0.70)',
                  border: '1px solid rgba(0,0,0,0.09)',
                  borderRadius: '8px',
                  color: '#14532d',
                }}
              />

              <div
                className="flex shrink-0 overflow-hidden"
                style={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '100px' }}
              >
                {(['cost', 'benefit'] as CustomFieldEffect[]).map(eff => (
                  <button
                    key={eff}
                    onClick={() => update(field.id, { effect: eff })}
                    className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors"
                    style={
                      field.effect === eff
                        ? eff === 'cost'
                          ? { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff' }
                          : { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: '#fff' }
                        : { background: 'transparent', color: 'rgba(20,83,45,0.5)' }
                    }
                  >
                    {eff === 'cost' ? '+ Cost' : '- Benefit'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => remove(field.id)}
                className="p-1.5 transition-colors shrink-0"
                style={{ color: 'rgba(20,83,45,0.35)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(20,83,45,0.35)')}
                title="Remove field"
              >
                <Trash2 size={12} strokeWidth={2.5} />
              </button>
            </div>

            <div className="flex gap-2 pl-6">
              <div className="flex-1">
                <select
                  value={field.basis}
                  onChange={e => update(field.id, { basis: e.target.value as CustomFieldBasis })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono focus:outline-none transition-colors appearance-none"
                  style={{
                    background: 'rgba(255,255,255,0.70)',
                    border: '1px solid rgba(0,0,0,0.09)',
                    borderRadius: '8px',
                    color: '#14532d',
                  }}
                >
                  {BASIS_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div
                className="w-32 flex items-center overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.70)',
                  border: '1px solid rgba(0,0,0,0.09)',
                  borderRadius: '8px',
                }}
              >
                <input
                  type="number"
                  value={field.value || ''}
                  onChange={e => update(field.id, { value: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={isPercent(field.basis) ? 0.01 : 1}
                  placeholder="0"
                  className="flex-1 px-2.5 py-1.5 bg-transparent text-xs font-mono focus:outline-none w-0"
                  style={{ color: '#14532d' }}
                />
                <span
                  className="px-2 font-mono text-[10px] select-none"
                  style={{ color: 'rgba(20,83,45,0.52)', borderLeft: '1px solid rgba(0,0,0,0.06)' }}
                >
                  {isPercent(field.basis) ? '%' : '£'}
                </span>
              </div>
            </div>
          </div>
        );
      })}

      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 transition-all text-xs font-black uppercase tracking-wider"
        style={{
          background: 'rgba(255,255,255,0.65)',
          border: '2px dashed rgba(22,163,74,0.3)',
          color: 'rgba(20,83,45,0.52)',
          borderRadius: '100px',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(22,163,74,0.55)';
          e.currentTarget.style.color = '#16a34a';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(22,163,74,0.3)';
          e.currentTarget.style.color = 'rgba(20,83,45,0.52)';
        }}
      >
        <Plus size={12} strokeWidth={2.5} />
        Add Custom Field
      </button>
    </div>
  );
}
