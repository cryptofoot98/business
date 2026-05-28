import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { palette, shadows, radii } from '../data/designTokens';
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

// Floating pill-shaped header. The whole bar sits inside its own padded
// gutter so the rounded corners are visible against the warm cream canvas.

const PILL_ACTIVE = {
  background: `linear-gradient(135deg, ${palette.amber}, ${palette.amberDeep})`,
  border: '1px solid rgba(255,255,255,0.30)',
  borderRadius: radii.pill,
  color: '#fff',
  boxShadow: shadows.amber,
} as const;

const PILL_IDLE = {
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: radii.pill,
  color: palette.inkMuted,
} as const;

const GLASS_BTN = {
  background: palette.surfaceSoft,
  border: '1px solid rgba(26,20,16,0.06)',
  borderRadius: radii.pill,
  color: palette.amberDeep,
} as const;

export function Header({
  unit, onUnitChange, onOpenSaves, sidebarOpen, onToggleSidebar, activePage, onNavigate,
}: Props) {
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
    // Outer wrapper provides the breathing room around the floating bar.
    <div className="shrink-0 px-3 sm:px-4 pt-3 sm:pt-4 pb-2 relative">
      <header
        className="flex items-center justify-between px-3 sm:px-4 relative"
        style={{
          background: palette.surface,
          border: '1px solid rgba(26,20,16,0.06)',
          borderRadius: radii.pill,
          boxShadow: shadows.elevated,
          height: 56,
        }}
      >
        {/* Left cluster — sidebar toggle (mobile) + logo + page tabs (desktop) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden shrink-0 flex items-center justify-center w-9 h-9 rounded-full transition-colors"
            style={{ color: palette.inkMuted, background: palette.surfaceSoft }}
            aria-label="Toggle sidebar"
          >
            <Icon name={sidebarOpen ? 'close' : 'menu'} size={16} />
          </button>

          <div style={{
            background: palette.surfaceSoft,
            border: `1px solid rgba(245,158,11,0.20)`,
            borderRadius: 12,
            padding: 2,
          }}>
            <img
              src="/iO_smartcontainer.png"
              alt="iO Smart Container"
              className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-md object-cover"
            />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="font-bold text-sm sm:text-base leading-none truncate" style={{ color: palette.ink }}>iO Smart Container</h1>
            <span className="hidden sm:block text-[9px] sm:text-[10px] leading-none mt-0.5 font-medium" style={{ color: palette.inkFaint, letterSpacing: '0.1em' }}>by Eric Tavares</span>
          </div>

          {/* Desktop page tabs */}
          <div className="hidden lg:flex items-center ml-3 p-1" style={{
            background: palette.surfaceSoft,
            border: '1px solid rgba(26,20,16,0.06)',
            borderRadius: radii.pill,
          }}>
            <button
              onClick={() => onNavigate('calculator')}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold transition-all"
              style={activePage === 'calculator' ? PILL_ACTIVE : PILL_IDLE}
            >
              <Icon name="container" size={12} />
              <span>Container</span>
            </button>
            <button
              onClick={() => onNavigate('costings')}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold transition-all"
              style={activePage === 'costings' ? PILL_ACTIVE : PILL_IDLE}
            >
              <Icon name="calculator" size={12} />
              <span>Costings</span>
            </button>
          </div>
        </div>

        {/* Desktop right controls */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-semibold uppercase tracking-widest mr-1" style={{ color: palette.inkFaint }}>Unit</span>
          <div className="flex p-1" style={{
            background: palette.surfaceSoft,
            border: '1px solid rgba(26,20,16,0.06)',
            borderRadius: radii.pill,
          }}>
            {(['cm', 'mm', 'in'] as UnitSystem[]).map(u => (
              <button
                key={u}
                onClick={() => onUnitChange(u)}
                className="px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all"
                style={unit === u ? PILL_ACTIVE : PILL_IDLE}
              >
                {u}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenSaves}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
            style={GLASS_BTN}
          >
            <Icon name="bookmark" size={13} />
            <span>Saves</span>
          </button>

          <div className="flex items-center gap-2.5 pl-2" style={{ borderLeft: '1px solid rgba(26,20,16,0.07)' }}>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-medium uppercase tracking-widest" style={{ color: palette.inkFaint }}>Signed in as</span>
              <span className="font-semibold text-xs leading-none" style={{ color: palette.ink }}>{displayName}</span>
            </div>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
              style={GLASS_BTN}
              title="Sign out"
            >
              <Icon name="logout" size={13} />
              <span>Out</span>
            </button>
          </div>
        </div>

        {/* Mobile menu — sliders icon opens a dropdown card */}
        <div className="lg:hidden shrink-0" ref={menuRef}>
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 transition-all"
            style={GLASS_BTN}
            aria-label="Open menu"
          >
            <Icon name="settings" size={15} />
          </button>

          {mobileMenuOpen && (
            <div
              className="absolute right-4 top-[calc(100%+10px)] z-50 w-64 overflow-hidden"
              style={{
                background: palette.surface,
                border: '1px solid rgba(26,20,16,0.08)',
                borderRadius: radii.card,
                boxShadow: shadows.floating,
              }}
            >
              {/* Page tabs */}
              <div className="p-3" style={{ borderBottom: '1px solid rgba(26,20,16,0.06)' }}>
                <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: palette.inkFaint }}>Page</p>
                <div className="flex p-1" style={{
                  background: palette.surfaceSoft,
                  border: '1px solid rgba(26,20,16,0.06)',
                  borderRadius: radii.pill,
                }}>
                  <button
                    onClick={() => { onNavigate('calculator'); setMobileMenuOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
                    style={activePage === 'calculator' ? PILL_ACTIVE : PILL_IDLE}
                  >
                    <Icon name="container" size={11} />
                    Container
                  </button>
                  <button
                    onClick={() => { onNavigate('costings'); setMobileMenuOpen(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-all"
                    style={activePage === 'costings' ? PILL_ACTIVE : PILL_IDLE}
                  >
                    <Icon name="calculator" size={11} />
                    Costings
                  </button>
                </div>
              </div>

              {/* Unit tabs */}
              <div className="p-3" style={{ borderBottom: '1px solid rgba(26,20,16,0.06)' }}>
                <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: palette.inkFaint }}>Unit</p>
                <div className="flex p-1" style={{
                  background: palette.surfaceSoft,
                  border: '1px solid rgba(26,20,16,0.06)',
                  borderRadius: radii.pill,
                }}>
                  {(['cm', 'mm', 'in'] as UnitSystem[]).map(u => (
                    <button
                      key={u}
                      onClick={() => { onUnitChange(u); setMobileMenuOpen(false); }}
                      className="flex-1 py-2 text-xs font-semibold uppercase tracking-wider transition-all"
                      style={unit === u ? PILL_ACTIVE : PILL_IDLE}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>

              {/* Saves */}
              <div className="p-3" style={{ borderBottom: '1px solid rgba(26,20,16,0.06)' }}>
                <button
                  onClick={() => { onOpenSaves(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
                  style={GLASS_BTN}
                >
                  <Icon name="bookmark" size={14} />
                  Saves
                </button>
              </div>

              {/* User & signout */}
              <div className="p-3">
                <div className="mb-2.5">
                  <p className="text-[9px] font-medium uppercase tracking-widest" style={{ color: palette.inkFaint }}>Signed in as</p>
                  <p className="font-semibold text-xs leading-none mt-0.5" style={{ color: palette.ink }}>{displayName}</p>
                </div>
                <button
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all"
                  style={GLASS_BTN}
                >
                  <Icon name="logout" size={14} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}
