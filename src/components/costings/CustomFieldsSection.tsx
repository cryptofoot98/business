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
        <p className="font-mono text-[10px] text-slate-500 italic">
          No custom fields yet. Add a field below to include additional costs or benefits.
        </p>
      )}

      {fields.map((field, i) => (
        <div
          key={field.id}
          className={`border-2 p-3 space-y-2.5 transition-colors ${
            field.enabled
              ? field.effect === 'cost'
                ? 'border-slate-600 bg-slate-900'
                : 'border-emerald-800 bg-emerald-950/30'
              : 'border-slate-700 bg-slate-900/40 opacity-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <GripVertical size={12} className="text-slate-600 shrink-0" strokeWidth={2} />

            <input
              type="checkbox"
              checked={field.enabled}
              onChange={e => update(field.id, { enabled: e.target.checked })}
              className="w-3.5 h-3.5 accent-sky-500 shrink-0"
              title="Enable / disable"
            />

            <input
              type="text"
              value={field.name}
              onChange={e => update(field.id, { name: e.target.value })}
              placeholder={`Custom field ${i + 1} name…`}
              className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-600 text-white text-xs font-mono focus:border-sky-500 focus:outline-none transition-colors min-w-0"
            />

            <div className="flex border border-slate-600 shrink-0">
              {(['cost', 'benefit'] as CustomFieldEffect[]).map(eff => (
                <button
                  key={eff}
                  onClick={() => update(field.id, { effect: eff })}
                  className={`px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                    field.effect === eff
                      ? eff === 'cost'
                        ? 'bg-red-600 text-white'
                        : 'bg-emerald-600 text-white'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  } ${eff === 'benefit' ? 'border-l border-slate-600' : ''}`}
                >
                  {eff === 'cost' ? '+ Cost' : '- Benefit'}
                </button>
              ))}
            </div>

            <button
              onClick={() => remove(field.id)}
              className="p-1.5 text-slate-600 hover:text-red-400 transition-colors shrink-0"
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
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-600 text-white text-xs font-mono focus:border-sky-500 focus:outline-none transition-colors appearance-none"
              >
                {BASIS_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="w-32 flex items-center border border-slate-600 bg-slate-800 focus-within:border-sky-500 transition-colors">
              <input
                type="number"
                value={field.value || ''}
                onChange={e => update(field.id, { value: parseFloat(e.target.value) || 0 })}
                min={0}
                step={isPercent(field.basis) ? 0.01 : 1}
                placeholder="0"
                className="flex-1 px-2.5 py-1.5 bg-transparent text-white text-xs font-mono focus:outline-none w-0"
              />
              <span className="px-2 font-mono text-[10px] text-slate-400 border-l border-slate-600 select-none">
                {isPercent(field.basis) ? '%' : '£'}
              </span>
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={add}
        className="w-full flex items-center justify-center gap-2 px-3 py-2.5 border-2 border-dashed border-slate-600 text-slate-400 hover:border-sky-500 hover:text-sky-400 transition-all text-xs font-black uppercase tracking-wider"
      >
        <Plus size={12} strokeWidth={2.5} />
        Add Custom Field
      </button>
    </div>
  );
}
