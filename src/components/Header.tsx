import { useState, useRef, useEffect } from 'react';
import { LogOut, Bookmark, Menu, X, SlidersHorizontal } from 'lucide-react';
import { UnitSystem } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  unit: UnitSystem;
  onUnitChange: (u: UnitSystem) => void;
  onOpenSaves: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function Header({ unit, onUnitChange, onOpenSaves, sidebarOpen, onToggleSidebar }: Props) {
  const { user, profile, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = profile?.full_name?.trim() || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <header className="shrink-0 flex items-center justify-between px-4 py-0 bg-brut-hdr border-b-3 border-brut-hdr-dark relative" style={{ height: 56 }}>
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="md:hidden flex items-center justify-center w-8 h-8 text-white/70 hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
        </button>

        <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-9 h-9 rounded-lg object-cover" />
        <div className="flex flex-col justify-center">
          <h1 className="text-white font-black text-base sm:text-lg uppercase tracking-tight leading-none">iO Smart Container</h1>
          <span className="text-white/35 font-mono text-[10px] uppercase tracking-widest leading-none hidden sm:block mt-0.5">by Eric Tavares</span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40 hidden lg:inline">Unit</span>
        <div className="flex border-2 border-white/30">
          {(['cm', 'mm', 'in'] as UnitSystem[]).map((u, i) => (
            <button
              key={u}
              onClick={() => onUnitChange(u)}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-colors ${
                i > 0 ? 'border-l-2 border-white/30' : ''
              } ${
                unit === u
                  ? 'bg-white text-brut-hdr'
                  : 'bg-transparent text-white/50 hover:text-white'
              }`}
              style={unit !== u ? { background: 'rgba(255,255,255,0.06)' } : {}}
            >
              {u}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenSaves}
          className="flex items-center gap-1.5 px-3.5 py-2 border-2 border-white/30 text-white/70 hover:text-white transition-all text-xs font-black uppercase tracking-wider"
          style={{ background: 'rgba(255,255,255,0.07)' }}
        >
          <Bookmark size={13} strokeWidth={2.5} />
          <span>Saves</span>
        </button>

        <div className="flex items-center gap-3 border-l-2 border-white/20 pl-3">
          <div className="flex flex-col items-end">
            <span className="font-mono text-[9px] uppercase tracking-widest text-white/30 font-bold">Signed in as</span>
            <span className="font-black text-xs text-white leading-none">{displayName}</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-2 border-2 border-white/25 text-white/55 hover:border-white/70 hover:text-white transition-all text-xs font-black uppercase tracking-wider"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            title="Sign out"
          >
            <LogOut size={13} strokeWidth={2.5} />
            <span>Out</span>
          </button>
        </div>
      </div>

      <div className="md:hidden" ref={menuRef}>
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2 border-2 border-white/30 text-white/70 hover:text-white transition-all"
          style={{ background: 'rgba(255,255,255,0.07)' }}
          aria-label="Open menu"
        >
          <SlidersHorizontal size={15} strokeWidth={2.5} />
        </button>

        {mobileMenuOpen && (
          <div
            className="absolute right-4 top-[calc(100%+6px)] z-50 w-60 border-3 border-brut-hdr-dark bg-brut-hdr shadow-xl"
            style={{ boxShadow: '4px 4px 0px #0d0d0d' }}
          >
            <div className="p-3 border-b-2 border-white/15">
              <p className="font-mono text-[9px] uppercase tracking-widest text-white/40 mb-2">Unit</p>
              <div className="flex border-2 border-white/30">
                {(['cm', 'mm', 'in'] as UnitSystem[]).map((u, i) => (
                  <button
                    key={u}
                    onClick={() => { onUnitChange(u); setMobileMenuOpen(false); }}
                    className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-colors ${
                      i > 0 ? 'border-l-2 border-white/30' : ''
                    } ${
                      unit === u
                        ? 'bg-white text-brut-hdr'
                        : 'bg-transparent text-white/50 hover:text-white'
                    }`}
                    style={unit !== u ? { background: 'rgba(255,255,255,0.06)' } : {}}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 border-b-2 border-white/15">
              <button
                onClick={() => { onOpenSaves(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 border-2 border-white/30 text-white/70 hover:text-white transition-all text-xs font-black uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <Bookmark size={14} strokeWidth={2.5} />
                Saves
              </button>
            </div>

            <div className="p-3">
              <div className="mb-2.5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-white/30 font-bold">Signed in as</p>
                <p className="font-black text-xs text-white leading-none mt-0.5">{displayName}</p>
              </div>
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 border-2 border-white/25 text-white/55 hover:border-white/70 hover:text-white transition-all text-xs font-black uppercase tracking-wider"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <LogOut size={14} strokeWidth={2.5} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
