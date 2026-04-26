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
    <header
      className="shrink-0 flex items-center justify-between px-3 sm:px-5 py-0 relative"
      style={{
        height: 56,
        background: 'rgba(6,14,26,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        zIndex: 40,
      }}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden shrink-0 flex items-center justify-center w-8 h-8 text-white/60 hover:text-white transition-colors"
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
        </button>

        <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-lg object-cover" />
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="text-white font-semibold text-sm sm:text-base leading-none truncate">iO Smart Container</h1>
          <span className="text-white/30 text-[9px] font-medium uppercase tracking-widest leading-none hidden sm:block mt-0.5">by Eric Tavares</span>
        </div>

        {/* Desktop nav tabs */}
        <div className="hidden lg:flex items-center ml-4 h-full gap-1">
          {(['calculator', 'costings'] as AppPage[]).map((page) => (
            <button
              key={page}
              onClick={() => onNavigate(page)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={activePage === page
                ? { background: 'rgba(61,178,64,0.15)', color: '#5DC258', border: '1px solid rgba(61,178,64,0.25)' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid transparent' }
              }
              onMouseEnter={e => { if (activePage !== page) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
              onMouseLeave={e => { if (activePage !== page) e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
            >
              {page === 'calculator' ? <Container size={12} strokeWidth={2} /> : <Calculator size={12} strokeWidth={2} />}
              <span className="capitalize">{page}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop right controls */}
      <div className="hidden lg:flex items-center gap-2 shrink-0">
        {/* Unit selector */}
        <div
          className="flex p-0.5 rounded-lg gap-0.5"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
        >
          {(['cm', 'mm', 'in'] as UnitSystem[]).map((u) => (
            <button
              key={u}
              onClick={() => onUnitChange(u)}
              className="px-3 py-1.5 text-xs font-semibold rounded-md transition-all"
              style={unit === u
                ? { background: 'rgba(255,255,255,0.18)', color: 'white' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.40)' }
              }
            >
              {u}
            </button>
          ))}
        </div>

        <button
          onClick={onOpenSaves}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.60)'; }}
        >
          <Bookmark size={12} strokeWidth={2} />
          <span>Saves</span>
        </button>

        <div
          className="flex items-center gap-2.5 pl-3"
          style={{ borderLeft: '1px solid rgba(255,255,255,0.10)' }}
        >
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-medium uppercase tracking-widest text-white/30">Signed in</span>
            <span className="text-xs font-semibold text-white/80 leading-none">{displayName}</span>
          </div>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.45)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.12)'; e.currentTarget.style.color = 'rgba(255,100,100,0.85)'; e.currentTarget.style.borderColor = 'rgba(220,38,38,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
            title="Sign out"
          >
            <LogOut size={12} strokeWidth={2} />
            <span>Out</span>
          </button>
        </div>
      </div>

      {/* Mobile menu button */}
      <div className="lg:hidden shrink-0" ref={menuRef}>
        <button
          onClick={() => setMobileMenuOpen(o => !o)}
          className="flex items-center gap-1.5 p-2 rounded-lg transition-all"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.60)' }}
          aria-label="Open menu"
        >
          <SlidersHorizontal size={15} strokeWidth={2} />
        </button>

        {mobileMenuOpen && (
          <div
            className="absolute right-3 top-[calc(100%+6px)] z-50 w-60 rounded-xl overflow-hidden"
            style={{
              background: 'rgba(10,22,40,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
            }}
          >
            <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-white/35 mb-2">Page</p>
              <div className="flex gap-1.5">
                {(['calculator', 'costings'] as AppPage[]).map(page => (
                  <button
                    key={page}
                    onClick={() => { onNavigate(page); setMobileMenuOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all capitalize"
                    style={activePage === page
                      ? { background: 'rgba(61,178,64,0.15)', color: '#5DC258', border: '1px solid rgba(61,178,64,0.25)' }
                      : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    {page === 'calculator' ? <Container size={11} strokeWidth={2} /> : <Calculator size={11} strokeWidth={2} />}
                    {page}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-white/35 mb-2">Unit</p>
              <div
                className="flex p-0.5 rounded-lg gap-0.5"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {(['cm', 'mm', 'in'] as UnitSystem[]).map(u => (
                  <button
                    key={u}
                    onClick={() => { onUnitChange(u); setMobileMenuOpen(false); }}
                    className="flex-1 py-2 text-xs font-semibold rounded-md transition-all"
                    style={unit === u
                      ? { background: 'rgba(255,255,255,0.16)', color: 'white' }
                      : { color: 'rgba(255,255,255,0.40)' }
                    }
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => { onOpenSaves(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.60)' }}
              >
                <Bookmark size={13} strokeWidth={2} />
                Saves
              </button>
            </div>

            <div className="p-3">
              <div className="mb-3">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-white/30 mb-0.5">Signed in as</p>
                <p className="text-sm font-semibold text-white">{displayName}</p>
              </div>
              <button
                onClick={() => { signOut(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.18)', color: 'rgba(255,100,100,0.80)' }}
              >
                <LogOut size={13} strokeWidth={2} />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
