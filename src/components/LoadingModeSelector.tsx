import { useState } from 'react';
import { LoadingMode, PalletConfig, STANDARD_PALLETS } from '../types';
import { Icon } from './Icon';

interface Props {
  mode: LoadingMode;
  palletConfig: PalletConfig;
  onModeChange: (mode: LoadingMode) => void;
  onPalletChange: (config: PalletConfig) => void;
}

const pillWrap = {
  background: 'rgba(0,0,0,0.05)',
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 100,
  padding: 3,
} as const;

const pillActive = {
  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
  borderRadius: 100,
  color: '#fff',
  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.32)',
} as const;

const pillIdle = {
  background: 'transparent',
  borderRadius: 100,
  color: 'rgba(90, 74, 61, 0.5)',
} as const;

export function LoadingModeSelector({ mode, palletConfig, onModeChange, onPalletChange }: Props) {
  const [customPallet, setCustomPallet] = useState<PalletConfig>({ ...STANDARD_PALLETS[2] });
  const [selectedStandardId, setSelectedStandardId] = useState<string>('eur');

  const handleStandardSelect = (id: string) => {
    setSelectedStandardId(id);
    const found = STANDARD_PALLETS.find(p => p.id === id);
    if (found && found.id !== 'custom') onPalletChange(found);
  };

  const handleCustomField = (field: keyof PalletConfig, value: number) => {
    const updated = { ...customPallet, [field]: value };
    setCustomPallet(updated);
    if (selectedStandardId === 'custom') onPalletChange(updated);
  };

  const isCustom = selectedStandardId === 'custom';

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex gap-1" style={pillWrap}>
        <button
          onClick={() => onModeChange('handload')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
          style={mode === 'handload' ? pillActive : pillIdle}
        >
          <Icon name="package" size={13} />
          Handload
        </button>
        <button
          onClick={() => onModeChange('pallet')}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
          style={mode === 'pallet' ? pillActive : pillIdle}
        >
          <Icon name="layers" size={13} />
          Pallet
        </button>
      </div>

      {mode === 'handload' && (
        <div className="px-3 py-2.5 rounded-xl" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
          <p className="font-mono text-[10px] leading-relaxed" style={{ color: 'rgba(90, 74, 61, 0.5)' }}>
            Boxes loaded directly into container. All 6 orientations tested for maximum fill.
          </p>
        </div>
      )}

      {mode === 'pallet' && (
        <div className="space-y-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(90, 74, 61, 0.42)' }}>Pallet type</p>
          <div className="space-y-1.5">
            {STANDARD_PALLETS.map(pal => {
              const isActive = selectedStandardId === pal.id;
              return (
                <button
                  key={pal.id}
                  onClick={() => handleStandardSelect(pal.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all"
                  style={isActive ? {
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    borderRadius: 12,
                    color: '#fff',
                    boxShadow: '0 3px 14px rgba(245, 158, 11, 0.32)',
                  } : {
                    background: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(245, 158, 11, 0.14)',
                    borderRadius: 12,
                    color: '#1a1410',
                  }}
                >
                  <div className="flex-1">
                    <div className="text-xs font-semibold leading-none">{pal.label}</div>
                    <div className="font-mono text-[10px] mt-0.5" style={{ opacity: isActive ? 0.7 : 0.45 }}>
                      {pal.id !== 'custom'
                        ? `Deck ${pal.deckHeight} cm · Max stack ${pal.maxStackHeight} cm`
                        : 'Set your own dimensions'
                      }
                    </div>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-white/80" />}
                </button>
              );
            })}
          </div>

          {isCustom && (
            <div className="rounded-xl p-3 space-y-2.5" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(90, 74, 61, 0.42)' }}>Custom dimensions (cm)</p>
              {[
                { key: 'length' as const,           label: 'Depth' },
                { key: 'width' as const,            label: 'Width' },
                { key: 'deckHeight' as const,       label: 'Deck height' },
                { key: 'maxStackHeight' as const,   label: 'Max stack ht.' },
                { key: 'maxStackWeightKg' as const, label: 'Max weight (kg)' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <label className="font-mono text-[10px] w-28 shrink-0" style={{ color: 'rgba(90, 74, 61, 0.45)' }}>{label}</label>
                  <input
                    type="number"
                    min={1}
                    value={customPallet[key] || ''}
                    onChange={e => handleCustomField(key, parseFloat(e.target.value) || 0)}
                    onWheel={e => e.currentTarget.blur()}
                    className="flex-1 px-2.5 py-1.5 text-sm font-medium focus:outline-none transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.88)',
                      border: '1px solid rgba(245, 158, 11, 0.22)',
                      borderRadius: 8,
                      color: '#1a1410',
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {!isCustom && (
            <div className="rounded-xl p-3" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.12)' }}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  ['L × W', `${palletConfig.length} × ${palletConfig.width} cm`],
                  ['Deck ht.', `${palletConfig.deckHeight} cm`],
                  ['Max stack', `${palletConfig.maxStackHeight} cm`],
                  ['Max wt.', `${palletConfig.maxStackWeightKg.toLocaleString()} kg`],
                ].map(([label, value]) => (
                  <>
                    <span key={label + 'l'} className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'rgba(90, 74, 61, 0.42)' }}>{label}</span>
                    <span key={label + 'v'} className="font-mono text-xs font-semibold" style={{ color: '#1a1410' }}>{value}</span>
                  </>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
