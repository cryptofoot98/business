import { useState, useEffect, useRef } from 'react';
import { Search, AlertTriangle, Info, ShieldAlert, CheckCircle } from 'lucide-react';
import { CNCodeEntry } from '../../types/costing';
import { searchCNCodes, lookupCNCode } from '../../data/cnCodes';

interface Props {
  cnCode: string;
  dutyRate: number;
  antiDumpingRate: number;
  isChina: boolean;
  onCNCodeChange: (code: string) => void;
  onDutyRateChange: (rate: number) => void;
  onAntiDumpingChange: (rate: number) => void;
  destCode: 'UK' | 'EU';
}

export function CNCodePanel({
  cnCode,
  dutyRate,
  antiDumpingRate,
  isChina,
  onCNCodeChange,
  onDutyRateChange,
  onAntiDumpingChange,
  destCode,
}: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<CNCodeEntry[]>([]);
  const [foundEntry, setFoundEntry] = useState<CNCodeEntry | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (cnCode.length >= 4) {
      const entry = lookupCNCode(cnCode);
      setFoundEntry(entry);
    } else {
      setFoundEntry(null);
    }
  }, [cnCode]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      setResults(searchCNCodes(searchQuery));
      setShowDropdown(true);
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectEntry(entry: CNCodeEntry) {
    onCNCodeChange(entry.code);
    onDutyRateChange(destCode === 'UK' ? entry.ukDutyRate : entry.euDutyRate);
    if (isChina && entry.antiDumpingChina) {
      onAntiDumpingChange(antiDumpingRate);
    }
    setSearchQuery('');
    setShowDropdown(false);
  }

  return (
    <div className="space-y-3">
      <div className="relative" ref={dropdownRef}>
        <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-1">
          Search commodity (description or HS code)
        </label>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" strokeWidth={2.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="e.g. t-shirts, 8471, smartphone..."
            className="w-full pl-8 pr-3 py-2.5 bg-slate-800 border-2 border-slate-600 text-white text-sm font-mono focus:border-sky-500 focus:outline-none transition-colors"
          />
        </div>
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border-2 border-slate-600 shadow-xl max-h-56 overflow-y-auto">
            {results.map(entry => (
              <button
                key={entry.code}
                onClick={() => selectEntry(entry)}
                className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-slate-700 transition-colors text-left border-b border-slate-700 last:border-0"
              >
                <span className="font-mono text-xs text-sky-400 shrink-0 mt-0.5">{entry.code}</span>
                <span className="text-xs text-white leading-tight">{entry.description}</span>
                <span className="ml-auto font-mono text-xs text-amber-400 shrink-0 mt-0.5">
                  {destCode === 'UK' ? entry.ukDutyRate : entry.euDutyRate}%
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-1">
            CN / HS Code
          </label>
          <input
            type="text"
            value={cnCode}
            onChange={e => onCNCodeChange(e.target.value)}
            placeholder="e.g. 61099000"
            maxLength={10}
            className="w-full px-3 py-2.5 bg-slate-800 border-2 border-slate-600 text-white text-sm font-mono focus:border-sky-500 focus:outline-none transition-colors tracking-widest"
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-1">
            Customs Duty Rate (%)
          </label>
          <input
            type="number"
            value={dutyRate}
            onChange={e => onDutyRateChange(parseFloat(e.target.value) || 0)}
            min={0}
            max={100}
            step={0.1}
            className="w-full px-3 py-2.5 bg-slate-800 border-2 border-slate-600 text-white text-sm font-mono focus:border-sky-500 focus:outline-none transition-colors"
          />
        </div>
      </div>

      {isChina && (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest text-slate-400 mb-1">
            Anti-Dumping Duty Rate (%)
          </label>
          <input
            type="number"
            value={antiDumpingRate}
            onChange={e => onAntiDumpingChange(parseFloat(e.target.value) || 0)}
            min={0}
            max={100}
            step={0.1}
            className="w-full px-3 py-2.5 bg-slate-800 border-2 border-slate-600 text-white text-sm font-mono focus:border-sky-500 focus:outline-none transition-colors"
          />
        </div>
      )}

      {foundEntry && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2 px-3 py-2 bg-sky-950 border border-sky-800">
            <Info size={13} className="text-sky-400 shrink-0" strokeWidth={2.5} />
            <div>
              <p className="text-xs text-sky-300 font-bold leading-tight">{foundEntry.description}</p>
              <p className="font-mono text-[10px] text-sky-500 mt-0.5">
                UK duty: <span className="text-sky-300">{foundEntry.ukDutyRate}%</span>
                {' · '}
                EU duty: <span className="text-sky-300">{foundEntry.euDutyRate}%</span>
                {foundEntry.gspReduction !== undefined && (
                  <span className="text-emerald-400"> · GSP rate: {foundEntry.gspReduction}%</span>
                )}
              </p>
            </div>
          </div>

          {foundEntry.requiresLicence && (
            <div className="flex items-start gap-2 px-3 py-2 bg-amber-950 border border-amber-700">
              <ShieldAlert size={13} className="text-amber-400 shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-amber-400 font-bold mb-0.5">Import Licence Required</p>
                <p className="text-xs text-amber-300 leading-snug">{foundEntry.licenceNote}</p>
              </div>
            </div>
          )}

          {isChina && foundEntry.antiDumpingChina && (
            <div className="flex items-start gap-2 px-3 py-2 bg-red-950 border border-red-800">
              <AlertTriangle size={13} className="text-red-400 shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-red-400 font-bold mb-0.5">Anti-Dumping Duties — China Origin</p>
                <p className="text-xs text-red-300 leading-snug">{foundEntry.antiDumpingNote}</p>
              </div>
            </div>
          )}

          {!foundEntry.requiresLicence && !(isChina && foundEntry.antiDumpingChina) && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-950 border border-emerald-800">
              <CheckCircle size={13} className="text-emerald-400 shrink-0" strokeWidth={2.5} />
              <p className="text-xs text-emerald-300">No special licence or anti-dumping duties identified for this commodity.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
