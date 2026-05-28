import { MultiContainerResult } from '../types';
import { Icon } from './Icon';

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
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'rgba(90, 74, 61, 0.42)' }}>
          Multi-Container Plan
        </p>
        <div className="flex items-center gap-4">
          {[
            { val: result.containersNeeded, label: 'containers' },
            { val: result.totalUnits.toLocaleString(), label: 'total units' },
            { val: formatWeight(result.totalGrossWeight), label: 'total weight' },
          ].map(({ val, label }) => (
            <div key={label} className="text-center">
              <div className="font-mono text-base font-bold leading-none" style={{ color: '#1a1410' }}>{val}</div>
              <div className="font-mono text-[9px] uppercase font-medium mt-0.5" style={{ color: 'rgba(90, 74, 61, 0.4)' }}>{label}</div>
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
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-left transition-all"
              style={isSelected ? {
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                borderRadius: 12,
                color: '#fff',
                boxShadow: '0 3px 14px rgba(245, 158, 11, 0.32)',
              } : {
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(245, 158, 11, 0.15)',
                borderRadius: 12,
                color: '#1a1410',
              }}
            >
              <Icon name="package" size={13} style={{ opacity: isSelected ? 0.9 : 0.45 }} />
              <div>
                <div className="text-xs font-semibold uppercase tracking-tight leading-none">
                  #{idx + 1}
                </div>
                <div className="font-mono text-[10px] mt-0.5" style={{ opacity: isSelected ? 0.65 : 0.45 }}>
                  {r.totalCount} units · {volPct}%
                </div>
              </div>
              {isSelected && <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-white/80" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
