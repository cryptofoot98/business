import { MultiContainerResult } from '../types';
import { Package } from 'lucide-react';

interface Props {
  result: MultiContainerResult;
  selectedIndex: number;
  onSelectContainer: (index: number) => void;
}

function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${kg.toFixed(0)} kg`;
}

export function MultiContainerPlanner({ result, selectedIndex, onSelectContainer }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="brut-section-label">Multi-Container Plan</p>
        <div className="flex items-center gap-5">
          {[
            { value: result.containersNeeded, label: 'containers' },
            { value: result.totalUnits.toLocaleString(), label: 'total units' },
            { value: formatWeight(result.totalGrossWeight), label: 'total weight' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-mono text-base font-bold leading-none text-white">{value}</div>
              <div className="font-mono text-[9px] uppercase tracking-wide mt-0.5 text-white/35">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {result.results.map((r, idx) => {
          const isSelected = idx === selectedIndex;
          const volPct = Math.round(r.volumeUtilization * 100);
          return (
            <button
              key={idx}
              onClick={() => onSelectContainer(idx)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all"
              style={isSelected
                ? { background: 'rgba(61,178,64,0.15)', border: '1px solid rgba(61,178,64,0.30)', boxShadow: 'inset 3px 0 0 #3DB240' }
                : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }
              }
              onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; }}
              onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
            >
              <Package size={13} style={{ color: isSelected ? '#3DB240' : 'rgba(255,255,255,0.35)' }} />
              <div>
                <div className={`text-xs font-semibold leading-none ${isSelected ? 'text-white' : 'text-white/65'}`}>
                  #{idx + 1}
                </div>
                <div className="font-mono text-[10px] mt-0.5 text-white/35">
                  {r.totalCount} units · {volPct}%
                </div>
              </div>
              {isSelected && <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#3DB240' }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
