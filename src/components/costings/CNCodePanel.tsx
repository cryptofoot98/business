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
        <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(20,83,45,0.52)' }}>
          Search commodity (description or HS code)
        </label>
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(20,83,45,0.45)' }} strokeWidth={2.5} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="e.g. t-shirts, 8471, smartphone..."
            className="w-full pl-8 pr-3 py-2.5 text-sm font-mono focus:outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: '12px',
              color: '#14532d',
            }}
          />
        </div>
        {showDropdown && results.length > 0 && (
          <div
            className="absolute z-50 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto"
            style={{
              background: 'rgba(255,255,255,0.96)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            }}
          >
            {results.map(entry => (
              <button
                key={entry.code}
                onClick={() => selectEntry(entry)}
                className="w-full flex items-start gap-3 px-3 py-2.5 transition-colors text-left last:border-0"
                style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(22,163,74,0.06)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span className="font-mono text-xs shrink-0 mt-0.5" style={{ color: '#16a34a' }}>{entry.code}</span>
                <span className="text-xs leading-tight" style={{ color: '#14532d' }}>{entry.description}</span>
                <span className="ml-auto font-mono text-xs shrink-0 mt-0.5" style={{ color: '#d96a1c' }}>
                  {destCode === 'UK' ? entry.ukDutyRate : entry.euDutyRate}%
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(20,83,45,0.52)' }}>
            CN / HS Code
          </label>
          <input
            type="text"
            value={cnCode}
            onChange={e => onCNCodeChange(e.target.value)}
            placeholder="e.g. 61099000"
            maxLength={10}
            className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none transition-colors tracking-widest"
            style={{
              background: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: '12px',
              color: '#14532d',
            }}
          />
        </div>
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(20,83,45,0.52)' }}>
            Customs Duty Rate (%)
          </label>
          <input
            type="number"
            value={dutyRate}
            onChange={e => onDutyRateChange(parseFloat(e.target.value) || 0)}
            min={0}
            max={100}
            step={0.1}
            className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: '12px',
              color: '#14532d',
            }}
          />
        </div>
      </div>

      {isChina && (
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: 'rgba(20,83,45,0.52)' }}>
            Anti-Dumping Duty Rate (%)
          </label>
          <input
            type="number"
            value={antiDumpingRate}
            onChange={e => onAntiDumpingChange(parseFloat(e.target.value) || 0)}
            min={0}
            max={100}
            step={0.1}
            className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.70)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: '12px',
              color: '#14532d',
            }}
          />
        </div>
      )}

      {foundEntry && (
        <div className="space-y-2 pt-1">
          <div
            className="flex items-center gap-2 px-3 py-2"
            style={{
              background: 'rgba(22,163,74,0.08)',
              border: '1px solid rgba(22,163,74,0.22)',
              borderRadius: '12px',
            }}
          >
            <Info size={13} className="shrink-0" style={{ color: '#16a34a' }} strokeWidth={2.5} />
            <div>
              <p className="text-xs font-bold leading-tight" style={{ color: '#14532d' }}>{foundEntry.description}</p>
              <p className="font-mono text-[10px] mt-0.5" style={{ color: 'rgba(20,83,45,0.6)' }}>
                UK duty: <span style={{ color: '#14532d' }}>{foundEntry.ukDutyRate}%</span>
                {' · '}
                EU duty: <span style={{ color: '#14532d' }}>{foundEntry.euDutyRate}%</span>
                {foundEntry.gspReduction !== undefined && (
                  <span style={{ color: '#16a34a' }}> · GSP rate: {foundEntry.gspReduction}%</span>
                )}
              </p>
            </div>
          </div>

          {foundEntry.requiresLicence && (
            <div
              className="flex items-start gap-2 px-3 py-2"
              style={{
                background: 'rgba(217,119,6,0.08)',
                border: '1px solid rgba(217,119,6,0.25)',
                borderRadius: '12px',
              }}
            >
              <ShieldAlert size={13} className="text-amber-500 shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-0.5">Import Licence Required</p>
                <p className="text-xs leading-snug" style={{ color: '#92400e' }}>{foundEntry.licenceNote}</p>
              </div>
            </div>
          )}

          {isChina && foundEntry.antiDumpingChina && (
            <div
              className="flex items-start gap-2 px-3 py-2"
              style={{
                background: 'rgba(220,38,38,0.08)',
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: '12px',
              }}
            >
              <AlertTriangle size={13} className="text-red-500 shrink-0 mt-0.5" strokeWidth={2.5} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-red-500 font-bold mb-0.5">Anti-Dumping Duties — China Origin</p>
                <p className="text-xs leading-snug" style={{ color: '#991b1b' }}>{foundEntry.antiDumpingNote}</p>
              </div>
            </div>
          )}

          {!foundEntry.requiresLicence && !(isChina && foundEntry.antiDumpingChina) && (
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{
                background: 'rgba(22,163,74,0.08)',
                border: '1px solid rgba(22,163,74,0.22)',
                borderRadius: '12px',
              }}
            >
              <CheckCircle size={13} className="shrink-0" style={{ color: '#16a34a' }} strokeWidth={2.5} />
              <p className="text-xs" style={{ color: '#14532d' }}>No special licence or anti-dumping duties identified for this commodity.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
