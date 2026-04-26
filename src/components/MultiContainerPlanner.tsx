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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748B' }}>Multi-Container Plan</p>
        <div className="flex items-center gap-5">
          {[
            { value: result.containersNeeded, label: 'containers' },
            { value: result.totalUnits.toLocaleString(), label: 'total units' },
            { value: formatWeight(result.totalGrossWeight), label: 'total weight' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-mono text-base font-bold leading-none" style={{ color: '#1B3080' }}>{value}</div>
              <div className="font-mono text-[9px] uppercase tracking-wide mt-0.5" style={{ color: '#94A3B8' }}>{label}</div>
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
                ? { background: 'rgba(61,178,64,0.12)', border: '1px solid rgba(61,178,64,0.30)', boxShadow: '0 4px 16px rgba(61,178,64,0.15)' }
                : { background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(27,48,128,0.10)', boxShadow: '0 2px 8px rgba(10,22,40,0.06)' }
              }
              onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(10,22,40,0.10)'; } }}
              onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = 'rgba(255,255,255,0.80)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(10,22,40,0.06)'; } }}
            >
              <Package size={13} style={{ color: isSelected ? '#3DB240' : '#94A3B8' }} />
              <div>
                <div className="text-xs font-semibold leading-none" style={{ color: isSelected ? '#2D9632' : '#1B3080' }}>
                  #{idx + 1}
                </div>
                <div className="font-mono text-[10px] mt-0.5" style={{ color: '#94A3B8' }}>
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
