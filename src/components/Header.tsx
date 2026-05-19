import { useState, useRef, useEffect } from 'react';
import { LogOut, Bookmark, Menu, X, SlidersHorizontal, Calculator, Container } from 'lucide-react';
import { UnitSystem } from '../types';
import { useAuth } from '../contexts/AuthContext';

type AppPage = 'calculator' | 'costings';

interface Props {
  unit: UnitSystem;
  onUnitChange: (u: UnitSystem) => void;
  onOpenSaves: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
}

const NAV_STYLE = {
  background: 'rgba(255,255,255,0.96)',
  backdropFilter: 'blur(24px) saturate(180%)',
  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
  borderBottom: '1px solid #e2e8f0',
  boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
  height: 56,
} as const;

const PILL_ACTIVE = {
  background: '#4f46e5',
  border: '1px solid #4338ca',
  borderRadius: 100,
  color: '#fff',
  boxShadow: '0 2px 8px rgba(79,70,229,0.30)',
} as const;

const PILL_IDLE = {
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: 100,
  color: '#64748b',
} as const;

const GLASS_BTN = {
  background: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: 100,
  color: '#334155',
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
} as const;

export function Header({ unit, onUnitChange, onOpenSaves, sidebarOpen, onToggleSidebar, activePage, onNavigate }: Props) {
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
    if (mobileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <header className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-0 relative" style={NAV_STYLE}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden shrink-0 flex items-center justify-center w-8 h-8 transition-colors rounded-lg"
          style={{ color: '#94a3b8' }}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        </button>

        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 9, padding: 3 }}>
          <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-md object-cover" />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="font-bold text-sm sm:text-base leading-none truncate" style={{ color: '#0f172a' }}>iO Smart Container</h1>
          <span className="hidden sm:block text-[9px] sm:text-[10px] leading-none mt-0.5 font-medium" style={{ color: '#94a3b8', letterSpacing: '0.1em' }}>by Eric Tavares</span>
        </div>

        <nav className="hidden lg:flex items-center ml-3 p-1" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 100 }}>
          <button onClick={() => onNavigate('calculator')} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold transition-all" style={activePage === 'calculator' ? PILL_ACTIVE : PILL_IDLE}>
            <Container size={12} strokeWidth={2.5} /> Container
          </button>
          <button onClick={() => onNavigate('costings')} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold transition-all" style={activePage === 'costings' ? PILL_ACTIVE : PILL_IDLE}>
            <Calculator size={12} strokeWidth={2.5} /> Costings
          </button>
        </nav>
      </div>

      {/* Desktop right */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest mr-1" style={{ color: '#94a3b8' }}>Unit</span>
        <div className="flex p-1" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 100 }}>
          {(['cm', 'mm', 'in'] as UnitSystem[]).map(u => (
            <button key={u} onClick={() => onUnitChange(u)} className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all" style={unit === u ? PILL_ACTIVE : PILL_IDLE}>{u}</button>
          ))}
        </div>

        <button onClick={onOpenSaves} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-slate-50" style={GLASS_BTN}>
          <Bookmark size={13} strokeWidth={2.5} /> Saves
        </button>

        <div className="flex items-center gap-2.5 pl-3" style={{ borderLeft: '1px solid #e2e8f0' }}>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: '#94a3b8' }}>Signed in as</span>
            <span className="font-semibold text-xs leading-none mt-0.5" style={{ color: '#0f172a' }}>{displayName}</span>
          </div>
          <button onClick={signOut} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all hover:bg-slate-50" style={GLASS_BTN} title="Sign out">
            <LogOut size={13} strokeWidth={2.5} /> Out
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="lg:hidden shrink-0" ref={menuRef}>
        <button onClick={() => setMobileMenuOpen(o => !o)} className="flex items-center gap-1.5 px-3 py-2 transition-all" style={GLASS_BTN} aria-label="Open menu">
          <SlidersHorizontal size={15} strokeWidth={2} />
        </button>

        {mobileMenuOpen && (
          <div className="absolute right-4 top-[calc(100%+6px)] z-50 w-64 overflow-hidden" style={{
            background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
          }}>
            <div className="p-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Page</p>
              <div className="flex p-1" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 100 }}>
                <button onClick={() => { onNavigate('calculator'); setMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all" style={activePage === 'calculator' ? PILL_ACTIVE : PILL_IDLE}>
                  <Container size={11} strokeWidth={2.5} /> Container
                </button>
                <button onClick={() => { onNavigate('costings'); setMobileMenuOpen(false); }} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all" style={activePage === 'costings' ? PILL_ACTIVE : PILL_IDLE}>
                  <Calculator size={11} strokeWidth={2.5} /> Costings
                </button>
              </div>
            </div>
            <div className="p-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#94a3b8' }}>Unit</p>
              <div className="flex p-1" style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 100 }}>
                {(['cm', 'mm', 'in'] as UnitSystem[]).map(u => (
                  <button key={u} onClick={() => { onUnitChange(u); setMobileMenuOpen(false); }} className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-all" style={unit === u ? PILL_ACTIVE : PILL_IDLE}>{u}</button>
                ))}
              </div>
            </div>
            <div className="p-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
              <button onClick={() => { onOpenSaves(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={GLASS_BTN}>
                <Bookmark size={14} strokeWidth={2.5} /> Saves
              </button>
            </div>
            <div className="p-3">
              <div className="mb-2.5">
                <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: '#94a3b8' }}>Signed in as</p>
                <p className="font-semibold text-xs leading-none mt-0.5" style={{ color: '#0f172a' }}>{displayName}</p>
              </div>
              <button onClick={() => { signOut(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider" style={GLASS_BTN}>
                <LogOut size={14} strokeWidth={2.5} /> Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
