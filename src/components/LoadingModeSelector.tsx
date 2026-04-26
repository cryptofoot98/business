import { useState } from 'react';
import { LoadingMode, PalletConfig, STANDARD_PALLETS } from '../types';
import { PackageOpen, Layers3 } from 'lucide-react';

interface Props {
  mode: LoadingMode;
  palletConfig: PalletConfig;
  onModeChange: (mode: LoadingMode) => void;
  onPalletChange: (config: PalletConfig) => void;
}

export function LoadingModeSelector({ mode, palletConfig, onModeChange, onPalletChange }: Props) {
  const [customPallet, setCustomPallet] = useState<PalletConfig>({ ...STANDARD_PALLETS[2] });
  const [selectedStandardId, setSelectedStandardId] = useState<string>('eur');

  const handleStandardSelect = (id: string) => {
    setSelectedStandardId(id);
    const found = STANDARD_PALLETS.find(p => p.id === id);
    if (found && found.id !== 'custom') {
      onPalletChange(found);
    }
  };

  const handleCustomField = (field: keyof PalletConfig, value: number) => {
    const updated = { ...customPallet, [field]: value };
    setCustomPallet(updated);
    if (selectedStandardId === 'custom') {
      onPalletChange(updated);
    }
  };

  const isCustom = selectedStandardId === 'custom';

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div
        className="flex p-0.5 rounded-xl gap-0.5"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        {([
          { value: 'handload' as LoadingMode, label: 'Handload', icon: <PackageOpen size={12} strokeWidth={2} /> },
          { value: 'pallet' as LoadingMode, label: 'Pallet', icon: <Layers3 size={12} strokeWidth={2} /> },
        ]).map(({ value, label, icon }) => {
          const isActive = mode === value;
          return (
            <button
              key={value}
              onClick={() => onModeChange(value)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all"
              style={isActive
                ? { background: 'rgba(255,255,255,0.15)', color: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }
                : { color: 'rgba(255,255,255,0.40)' }
              }
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {mode === 'handload' && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(255,255,255,0.04)', borderLeft: '3px solid rgba(61,178,64,0.45)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[10px] text-white/40 leading-relaxed font-medium">
            Boxes loaded directly into container. All 6 orientations tested for maximum fill.
          </p>
        </div>
      )}

      {mode === 'pallet' && (
        <div className="space-y-3">
          <p className="brut-section-label">Pallet type</p>
          <div className="space-y-1.5">
            {STANDARD_PALLETS.map(pal => {
              const isSelected = selectedStandardId === pal.id;
              return (
                <button
                  key={pal.id}
                  onClick={() => handleStandardSelect(pal.id)}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-all"
                  style={isSelected
                    ? { background: 'rgba(61,178,64,0.15)', border: '1px solid rgba(61,178,64,0.32)', boxShadow: 'inset 3px 0 0 #3DB240' }
                    : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold leading-none ${isSelected ? 'text-white' : 'text-white/75'}`}>
                      {pal.label}
                    </div>
                    {pal.id !== 'custom' && (
                      <div className="font-mono text-[10px] mt-1 text-white/35">
                        Deck {pal.deckHeight} cm · Stack {pal.maxStackHeight} cm
                      </div>
                    )}
                    {pal.id === 'custom' && (
                      <div className="font-mono text-[10px] mt-1 text-white/35">Set your own dimensions</div>
                    )}
                  </div>
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3DB240' }} />}
                </button>
              );
            })}
          </div>

          {isCustom && (
            <div
              className="rounded-xl p-4 space-y-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="brut-section-label">Custom dimensions (cm)</p>
              {[
                { key: 'length' as const, label: 'Depth' },
                { key: 'width' as const, label: 'Width' },
                { key: 'deckHeight' as const, label: 'Deck Height' },
                { key: 'maxStackHeight' as const, label: 'Max Stack Height' },
                { key: 'maxStackWeightKg' as const, label: 'Max Stack Weight (kg)' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-white/35 w-28 shrink-0">{label}</label>
                  <input
                    type="number"
                    min={1}
                    value={customPallet[key] || ''}
                    onChange={e => handleCustomField(key, parseFloat(e.target.value) || 0)}
                    onWheel={e => e.currentTarget.blur()}
                    className="brut-input flex-1 px-3 py-2 text-sm font-semibold"
                  />
                </div>
              ))}
            </div>
          )}

          {!isCustom && (
            <div
              className="rounded-xl p-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span className="brut-section-label">Length × Width</span>
                <span className="font-mono text-xs text-white/60">{palletConfig.length} × {palletConfig.width} cm</span>
                <span className="brut-section-label">Deck height</span>
                <span className="font-mono text-xs text-white/60">{palletConfig.deckHeight} cm</span>
                <span className="brut-section-label">Max stack</span>
                <span className="font-mono text-xs text-white/60">{palletConfig.maxStackHeight} cm</span>
                <span className="brut-section-label">Max weight</span>
                <span className="font-mono text-xs text-white/60">{palletConfig.maxStackWeightKg.toLocaleString()} kg</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
