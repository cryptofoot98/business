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
      <div className="flex border-2 border-brut-black overflow-hidden" style={{ boxShadow: '3px 3px 0px #0d0d0d' }}>
        <button
          onClick={() => onModeChange('handload')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 text-xs font-black uppercase tracking-wider transition-colors border-r-2 border-brut-black ${
            mode === 'handload' ? 'bg-brut-black text-white' : 'bg-white text-brut-black hover:bg-brut-paper'
          }`}
        >
          <PackageOpen size={14} strokeWidth={2.5} />
          Handload
        </button>
        <button
          onClick={() => onModeChange('pallet')}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-3 text-xs font-black uppercase tracking-wider transition-colors ${
            mode === 'pallet' ? 'bg-brut-black text-white' : 'bg-white text-brut-black hover:bg-brut-paper'
          }`}
        >
          <Layers3 size={14} strokeWidth={2.5} />
          Pallet
        </button>
      </div>

      {mode === 'handload' && (
        <div className="border-l-4 border-brut-black bg-brut-paper px-4 py-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-brut-black/50 leading-relaxed">
            Boxes loaded directly into container. All 6 orientations tested for maximum fill.
          </p>
        </div>
      )}

      {mode === 'pallet' && (
        <div className="space-y-3">
          <p className="brut-section-label">Pallet type</p>
          <div className="space-y-1.5">
            {STANDARD_PALLETS.map(pal => (
              <button
                key={pal.id}
                onClick={() => handleStandardSelect(pal.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 border-2 border-brut-black text-left transition-all ${
                  selectedStandardId === pal.id
                    ? 'bg-brut-black text-white shadow-brut-orange'
                    : 'bg-white text-brut-black hover:bg-brut-paper shadow-brut-sm hover:shadow-brut'
                }`}
              >
                <div className="flex-1">
                  <div className="text-xs font-black uppercase tracking-tight leading-none">{pal.label}</div>
                  {pal.id !== 'custom' && (
                    <div className={`font-mono text-[10px] mt-1 ${selectedStandardId === pal.id ? 'text-white/55' : 'text-brut-black/40'}`}>
                      Deck {pal.deckHeight} cm · Max stack {pal.maxStackHeight} cm
                    </div>
                  )}
                  {pal.id === 'custom' && (
                    <div className={`font-mono text-[10px] mt-1 ${selectedStandardId === pal.id ? 'text-white/55' : 'text-brut-black/40'}`}>
                      Set your own dimensions
                    </div>
                  )}
                </div>
                {selectedStandardId === pal.id && <div className="w-2 h-2 bg-brut-orange shrink-0" />}
              </button>
            ))}
          </div>

          {isCustom && (
            <div className="border-2 border-brut-black bg-brut-paper p-4 space-y-3">
              <p className="brut-section-label">Custom pallet dimensions (cm)</p>
              {[
                { key: 'length' as const, label: 'Length' },
                { key: 'width' as const, label: 'Width' },
                { key: 'deckHeight' as const, label: 'Deck Height' },
                { key: 'maxStackHeight' as const, label: 'Max Stack Height' },
                { key: 'maxStackWeightKg' as const, label: 'Max Stack Weight (kg)' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/50 w-28 shrink-0">{label}</label>
                  <input
                    type="number"
                    min={1}
                    value={customPallet[key] || ''}
                    onChange={e => handleCustomField(key, parseFloat(e.target.value) || 0)}
                    onWheel={e => e.currentTarget.blur()}
                    className="brut-input flex-1 px-3 py-2 text-sm font-black"
                  />
                </div>
              ))}
            </div>
          )}

          {!isCustom && (
            <div className="border-2 border-brut-black bg-brut-paper p-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <span className="brut-section-label">Length × Width</span>
                <span className="font-mono text-xs font-bold">{palletConfig.length} × {palletConfig.width} cm</span>
                <span className="brut-section-label">Deck height</span>
                <span className="font-mono text-xs font-bold">{palletConfig.deckHeight} cm</span>
                <span className="brut-section-label">Max stack</span>
                <span className="font-mono text-xs font-bold">{palletConfig.maxStackHeight} cm</span>
                <span className="brut-section-label">Max weight</span>
                <span className="font-mono text-xs font-bold">{palletConfig.maxStackWeightKg.toLocaleString()} kg</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
