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

const GLASS_NAV = {
  background: 'rgba(6,4,18,0.82)',
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  height: 56,
} as const;

const GLASS_BTN_ACTIVE = {
  background: 'linear-gradient(135deg, rgba(139,92,246,0.8), rgba(99,102,241,0.8))',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 8,
  color: '#fff',
  boxShadow: '0 2px 12px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
} as const;

const GLASS_BTN_IDLE = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  color: 'rgba(232,228,248,0.5)',
} as const;

const GLASS_BTN = {
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: 'rgba(232,228,248,0.65)',
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
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <header className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-0 relative" style={GLASS_NAV}>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden shrink-0 flex items-center justify-center w-8 h-8 transition-colors"
          style={{ color: 'rgba(232,228,248,0.6)' }}
          aria-label="Toggle sidebar"
          onMouseEnter={e => (e.currentTarget.style.color = 'white')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,228,248,0.6)')}
        >
          {sidebarOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
        </button>

        <div style={{
          background: 'rgba(139,92,246,0.18)',
          border: '1px solid rgba(139,92,246,0.3)',
          borderRadius: 9,
          padding: 2,
        }}>
          <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-md object-cover" />
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-white font-bold text-sm sm:text-base leading-none truncate">iO Smart Container</h1>
          <span className="hidden sm:block text-[9px] sm:text-[10px] leading-none mt-0.5 font-medium" style={{ color: 'rgba(232,228,248,0.3)', letterSpacing: '0.1em' }}>by Eric Tavares</span>
        </div>

        {/* Desktop page tabs */}
        <div className="hidden lg:flex items-center ml-3 p-0.5" style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
        }}>
          <button
            onClick={() => onNavigate('calculator')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-all"
            style={activePage === 'calculator' ? GLASS_BTN_ACTIVE : { ...GLASS_BTN_IDLE, background: 'transparent', border: '1px solid transparent' }}
          >
            <Container size={12} strokeWidth={2.5} />
            <span>Container</span>
          </button>
          <button
            onClick={() => onNavigate('costings')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold transition-all"
            style={activePage === 'costings' ? GLASS_BTN_ACTIVE : { ...GLASS_BTN_IDLE, background: 'transparent', border: '1px solid transparent' }}
          >
            <Calculator size={12} strokeWidth={2.5} />
            <span>Costings</span>
          </button>
        </div>
      </div>

      {/* Desktop right controls */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest mr-1" style={{ color: 'rgba(232,228,248,0.35)' }}>Unit</span>
        <div className="flex p-0.5" style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
        }}>
          {(['cm', 'mm', 'in'] as UnitSystem[]).map(u => (
            <button
              key={u}
              onClick={() => onUnitChange(u)}
              className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
              style={unit === u ? GLASS_BTN_ACTIVE : { background: 'transparent', border: '1px solid transparent', borderRadius: 8, color: 'rgba(232,228,248,0.45)' }}
            >
              {u}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenSaves}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
          style={GLASS_BTN}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)';
            (e.currentTarget as HTMLButtonElement).style.color = 'white';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(232,228,248,0.65)';
          }}
        >
          <Bookmark size={13} strokeWidth={2.5} />
          <span>Saves</span>
        </button>

        <div className="flex items-center gap-2.5 pl-2" style={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'rgba(232,228,248,0.28)' }}>Signed in as</span>
            <span className="font-semibold text-xs text-white leading-none">{displayName}</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
            style={GLASS_BTN}
            title="Sign out"
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(198,51,32,0.15)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(198,51,32,0.35)';
              (e.currentTarget as HTMLButtonElement).style.color = '#ef9990';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
              (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.12)';
              (e.currentTarget as HTMLButtonElement).style.color = 'rgba(232,228,248,0.65)';
            }}
          >
            <LogOut size={13} strokeWidth={2.5} />
            <span>Out</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="lg:hidden shrink-0" ref={menuRef}>
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-2 transition-all"
          style={GLASS_BTN}
          aria-label="Open menu"
        >
          <SlidersHorizontal size={15} strokeWidth={2.5} />
        </button>

        {mobileMenuOpen && (
          <div
            className="absolute right-4 top-[calc(100%+6px)] z-50 w-64 overflow-hidden"
            style={{
              background: 'rgba(10,8,32,0.92)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 16,
              boxShadow: '0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
            }}
          >
            {/* Page tabs */}
            <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(232,228,248,0.35)' }}>Page</p>
              <div className="flex p-0.5" style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
              }}>
                <button
                  onClick={() => { onNavigate('calculator'); setMobileMenuOpen(false); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all"
                  style={activePage === 'calculator' ? { ...GLASS_BTN_ACTIVE, borderRadius: 8 } : { background: 'transparent', border: '1px solid transparent', borderRadius: 8, color: 'rgba(232,228,248,0.45)' }}
                >
                  <Container size={11} strokeWidth={2.5} />
                  Container
                </button>
                <button
                  onClick={() => { onNavigate('costings'); setMobileMenuOpen(false); }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-all"
                  style={activePage === 'costings' ? { ...GLASS_BTN_ACTIVE, borderRadius: 8 } : { background: 'transparent', border: '1px solid transparent', borderRadius: 8, color: 'rgba(232,228,248,0.45)' }}
                >
                  <Calculator size={11} strokeWidth={2.5} />
                  Costings
                </button>
              </div>
            </div>

            {/* Unit tabs */}
            <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(232,228,248,0.35)' }}>Unit</p>
              <div className="flex p-0.5" style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
              }}>
                {(['cm', 'mm', 'in'] as UnitSystem[]).map(u => (
                  <button
                    key={u}
                    onClick={() => { onUnitChange(u); setMobileMenuOpen(false); }}
                    className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
                    style={unit === u ? { ...GLASS_BTN_ACTIVE, borderRadius: 8 } : { background: 'transparent', border: '1px solid transparent', borderRadius: 8, color: 'rgba(232,228,248,0.45)' }}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            {/* Saves */}
            <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => { onOpenSaves(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
                style={GLASS_BTN}
              >
                <Bookmark size={14} strokeWidth={2.5} />
                Saves
              </button>
            </div>

            {/* User & signout */}
            <div className="p-3">
              <div className="mb-2.5">
                <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: 'rgba(232,228,248,0.28)' }}>Signed in as</p>
                <p className="font-semibold text-xs text-white leading-none mt-0.5">{displayName}</p>
              </div>
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
                style={GLASS_BTN}
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
