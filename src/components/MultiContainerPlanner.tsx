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
        <p className="text-xs font-black uppercase tracking-tight text-brut-black">Multi-Container Plan</p>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="font-mono text-lg font-black text-brut-black leading-none">{result.containersNeeded}</div>
            <div className="font-mono text-[9px] uppercase text-brut-black/40 font-bold mt-0.5">containers</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-lg font-black text-brut-black leading-none">{result.totalUnits.toLocaleString()}</div>
            <div className="font-mono text-[9px] uppercase text-brut-black/40 font-bold mt-0.5">total units</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-lg font-black text-brut-black leading-none">{formatWeight(result.totalGrossWeight)}</div>
            <div className="font-mono text-[9px] uppercase text-brut-black/40 font-bold mt-0.5">total weight</div>
          </div>
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
              className={`flex items-center gap-2.5 px-3.5 py-2.5 border-2 border-brut-black text-left transition-all ${
                isSelected
                  ? 'bg-brut-black text-white'
                  : 'bg-white text-brut-black hover:bg-brut-bg shadow-brut-sm hover:shadow-brut'
              }`}
            >
              <Package size={13} className={isSelected ? 'text-white' : 'text-brut-black/50'} />
              <div>
                <div className={`text-xs font-black uppercase tracking-tight leading-none ${isSelected ? 'text-white' : 'text-brut-black'}`}>
                  #{idx + 1}
                </div>
                <div className={`font-mono text-[10px] mt-0.5 font-bold ${isSelected ? 'text-white/60' : 'text-brut-black/40'}`}>
                  {r.totalCount} units · {volPct}%
                </div>
              </div>
              {isSelected && <div className="w-1.5 h-1.5 bg-brut-red shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
