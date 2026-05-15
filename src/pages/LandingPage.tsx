import { useEffect, useRef, useState } from 'react';
import {
  Ship, ArrowRight, Package, Truck, Wind,
  BarChart3, FileDown, Bot, Layers, Target,
  ChevronDown, CheckCircle,
} from 'lucide-react';
import { HeroCanvas } from '../components/landing/HeroCanvas';

interface Props {
  onGetStarted: () => void;
}

function useScrollFade() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-fade]');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const delay = (e.target as HTMLElement).dataset.fadeDelay ?? '0';
            setTimeout(() => e.target.classList.add('fade-visible'), Number(delay));
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    els.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

function useScrolledNav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return scrolled;
}

function useCountUp(target: number, decimals = 0, suffix = '') {
  const [val, setVal] = useState('0');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        let start: number | null = null;
        const duration = 1400;
        function step(ts: number) {
          if (!start) start = ts;
          const p = Math.min((ts - start) / duration, 1);
          const t = 1 - Math.pow(1 - p, 3);
          const cur = target * t;
          setVal(decimals > 0 ? cur.toFixed(decimals) : Math.round(cur).toString());
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, decimals]);
  return { ref, display: val + suffix };
}

function StatItem({ value, suffix, label, decimals }: { value: number; suffix?: string; label: string; decimals?: number }) {
  const { ref, display } = useCountUp(value, decimals, suffix ?? '');
  return (
    <div ref={ref} className="text-center py-8 px-6" style={{
      background: 'rgba(255,255,255,0.06)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20,
      boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
    }}>
      <div className="text-5xl md:text-6xl font-black text-white leading-none mb-2" style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #c4b5fd 60%, #93c5fd 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        {display}
      </div>
      <div className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(232,228,248,0.45)' }}>{label}</div>
    </div>
  );
}

const FEATURES = [
  {
    icon: <Layers size={20} />,
    color: '#8b5cf6',
    colorRgb: '139,92,246',
    title: 'Real-Time 2D Visualization',
    desc: 'See exactly how every carton fits inside your container. Switch between front, side, and top views. Drag a depth slider to peer inside any layer.',
  },
  {
    icon: <Package size={20} />,
    color: '#c63320',
    colorRgb: '198,51,32',
    title: 'Up to 20 Products at Once',
    desc: 'Mix products with different dimensions, weights, and stacking rules in a single load plan. CSV bulk import included — drop your spreadsheet and go.',
  },
  {
    icon: <BarChart3 size={20} />,
    color: '#22d3ee',
    colorRgb: '34,211,238',
    title: 'Weight Distribution & Axle Loads',
    desc: 'Calculates center of gravity and computes front/rear axle loads against legal limits. No more overloaded axles at the weigh station.',
  },
  {
    icon: <Target size={20} />,
    color: '#10b981',
    colorRgb: '16,185,129',
    title: 'Stacking & Orientation Constraints',
    desc: 'Mark products as fragile, non-stackable, or lock their orientation. The engine respects every rule while maximising your cubic utilisation.',
  },
  {
    icon: <Truck size={20} />,
    color: '#d96a1c',
    colorRgb: '217,106,28',
    title: 'Multi-Container Planning',
    desc: 'Set quantities and Smart Container automatically plans how many containers you need, distributing cargo evenly across the fleet.',
  },
  {
    icon: <FileDown size={20} />,
    color: '#6366f1',
    colorRgb: '99,102,241',
    title: 'Export & Print Ready',
    desc: 'Download a full CSV load manifest or print a formatted load report with a single click. Hand it straight to the warehouse team.',
  },
];

const VEHICLES = [
  {
    icon: <Ship size={22} />,
    label: 'ISO Containers',
    badge: '20ft · 40ft · HC · Reefer',
    desc: 'Standard dry, high-cube, reefer, open-top, and flat-rack. Every ISO variant ships with certified inner dimensions.',
    color: '#8b5cf6',
    colorRgb: '139,92,246',
  },
  {
    icon: <Truck size={22} />,
    label: 'Road Freight',
    badge: 'Van · Curtainsider · Flatbed',
    desc: 'European and standard 13m trailers with full axle load calculations. Know before you load.',
    color: '#c63320',
    colorRgb: '198,51,32',
  },
  {
    icon: <Wind size={22} />,
    label: 'Air Freight',
    badge: 'LD3 · LD7 · PMC Pallet',
    desc: 'Major ULD types for belly and main-deck air cargo. Exact pallet footprints and max payload weights.',
    color: '#22d3ee',
    colorRgb: '34,211,238',
  },
  {
    icon: <Package size={22} />,
    label: 'LCL Spaces',
    badge: '5 · 10 · 20 CBM',
    desc: 'Less-than-container-load booking spaces to plan partial shipments and avoid paying for air.',
    color: '#d96a1c',
    colorRgb: '217,106,28',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Choose your transport',
    desc: 'Pick from containers, trucks, air ULDs, or LCL spaces. Every vehicle has precise inner dimensions and payload limits built in.',
  },
  {
    n: '02',
    title: 'Enter your products',
    desc: 'Add up to 20 product types with dimensions, weights, and constraints. Import from a CSV in seconds if you already have a list.',
  },
  {
    n: '03',
    title: 'Get your load plan',
    desc: 'Instant 2D visualisation with utilisation percentages, weight breakdown, and axle loads. Export or print directly.',
  },
];

const GLASS_NAV_SCROLLED = {
  background: 'rgba(6,4,18,0.82)',
  backdropFilter: 'blur(28px) saturate(180%)',
  WebkitBackdropFilter: 'blur(28px) saturate(180%)',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
} as const;

const GLASS_NAV = {
  background: 'transparent',
  backdropFilter: 'none',
  WebkitBackdropFilter: 'none',
  borderBottom: '1px solid transparent',
} as const;

export function LandingPage({ onGetStarted }: Props) {
  useScrollFade();
  const scrolled = useScrolledNav();

  return (
    <div className="relative overflow-x-hidden" style={{ background: '#060412' }}>

      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={scrolled ? GLASS_NAV_SCROLLED : GLASS_NAV}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div style={{
              background: 'rgba(139,92,246,0.2)',
              border: '1px solid rgba(139,92,246,0.4)',
              borderRadius: 10,
              padding: 2,
              backdropFilter: 'blur(12px)',
            }}>
              <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-8 h-8 rounded-lg object-cover" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-white font-bold text-base leading-none">iO Smart Container</span>
              <span className="hidden sm:block text-[10px] font-medium mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em' }}>by Eric Tavares</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 text-sm font-semibold transition-all"
              style={{
                color: 'rgba(255,255,255,0.65)',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 10,
                backdropFilter: 'blur(12px)',
              }}
              onMouseEnter={e => {
                (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.13)';
                (e.target as HTMLButtonElement).style.color = 'white';
              }}
              onMouseLeave={e => {
                (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)';
                (e.target as HTMLButtonElement).style.color = 'rgba(255,255,255,0.65)';
              }}
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(198,51,32,0.9), rgba(150,30,15,0.9))',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 10,
                boxShadow: '0 4px 20px rgba(198,51,32,0.35), inset 0 1px 0 rgba(255,255,255,0.2)',
                backdropFilter: 'blur(12px)',
              }}
            >
              Get Started <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <HeroCanvas />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(6,4,18,0) 30%, rgba(6,4,18,0.8) 80%, #060412 100%)',
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full" style={{
            background: 'rgba(139,92,246,0.12)',
            border: '1px solid rgba(139,92,246,0.3)',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 0 24px rgba(139,92,246,0.1), inset 0 1px 0 rgba(255,255,255,0.12)',
          }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#8b5cf6', boxShadow: '0 0 6px #8b5cf6' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(196,181,253,0.85)' }}>Load optimization for logistics teams</span>
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black text-white leading-none tracking-tighter mb-6">
            Load<br />
            <span style={{
              background: 'linear-gradient(135deg, #c63320 0%, #e05a40 50%, #ff7a60 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Smarter.</span><br />
            Ship More.
          </h1>

          <p className="text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10" style={{ color: 'rgba(232,228,248,0.55)' }}>
            Calculate exact carton quantities, weight distribution, and optimal packing configurations for any container or vehicle — in under a second.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 text-sm font-semibold text-white flex items-center justify-center gap-3 transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(198,51,32,0.92), rgba(150,30,15,0.92))',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(198,51,32,0.4), inset 0 1px 0 rgba(255,255,255,0.22)',
                backdropFilter: 'blur(12px)',
              }}
            >
              Start Optimizing Free <ArrowRight size={15} />
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                color: 'rgba(232,228,248,0.65)',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
                borderRadius: 14,
                backdropFilter: 'blur(12px)',
              }}
            >
              See How It Works
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10">
            {['No credit card needed', 'Free forever', 'No install required'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle size={12} style={{ color: '#8b5cf6' }} />
                <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'rgba(232,228,248,0.38)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <a href="#stats" className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 transition-all animate-bounce"
          style={{ color: 'rgba(232,228,248,0.3)' }}>
          <span className="text-[9px] uppercase tracking-widest font-semibold">Scroll</span>
          <ChevronDown size={16} />
        </a>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section id="stats" className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatItem value={22} suffix="+" label="Vehicle & Container Types" />
          <StatItem value={6} label="Orientations per Product" />
          <StatItem value={20} label="Products Per Load Plan" />
          <StatItem value={99} suffix="%" label="Utilisation Accuracy" />
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section id="features" className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div data-fade className="fade-init mb-16 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(196,181,253,0.6)' }}>What you get</p>
            <h2 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tight">
              Everything a<br />
              <span style={{
                background: 'linear-gradient(135deg, #c63320, #e05a40)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>logistics team needs.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                data-fade
                data-fade-delay={i * 80}
                className="fade-init p-6 flex flex-col gap-4 group transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(${f.colorRgb},0.08)`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(${f.colorRgb},0.2), 0 0 32px rgba(${f.colorRgb},0.1)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${f.colorRgb},0.25)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(${f.colorRgb},0.08)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center text-white shrink-0"
                  style={{
                    background: `linear-gradient(135deg, rgba(${f.colorRgb},0.3), rgba(${f.colorRgb},0.15))`,
                    border: `1px solid rgba(${f.colorRgb},0.35)`,
                    borderRadius: 12,
                    boxShadow: `0 4px 12px rgba(${f.colorRgb},0.2)`,
                    color: f.color,
                  }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white leading-tight mb-2">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,228,248,0.5)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div data-fade className="fade-init mb-16">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(196,181,253,0.6)' }}>The process</p>
            <h2 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tight">
              Three steps.<br />
              <span style={{
                background: 'linear-gradient(135deg, #c63320, #e05a40)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Infinite cargo.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                data-fade
                data-fade-delay={i * 120}
                className="fade-init relative p-8 h-full"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 20,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
              >
                <div
                  className="text-6xl font-black leading-none mb-6"
                  style={{
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {s.n}
                </div>
                <h3 className="font-bold text-lg text-white leading-tight mb-3">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(232,228,248,0.45)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VEHICLE TYPES ─── */}
      <section id="vehicles" className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div data-fade className="fade-init mb-16 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(196,181,253,0.6)' }}>Supported transport modes</p>
            <h2 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tight">
              Every mode.<br />
              <span style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>One tool.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VEHICLES.map((v, i) => (
              <div
                key={v.label}
                data-fade
                data-fade-delay={i * 100}
                className="fade-init p-6 flex flex-col gap-4 transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 20,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(${v.colorRgb},0.06)`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 16px 48px rgba(0,0,0,0.4), 0 0 24px rgba(${v.colorRgb},0.12)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${v.colorRgb},0.3)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(${v.colorRgb},0.06)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.1)';
                }}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center shrink-0"
                  style={{
                    background: `linear-gradient(135deg, rgba(${v.colorRgb},0.28), rgba(${v.colorRgb},0.12))`,
                    border: `1px solid rgba(${v.colorRgb},0.35)`,
                    borderRadius: 14,
                    color: v.color,
                    boxShadow: `0 4px 16px rgba(${v.colorRgb},0.2)`,
                  }}
                >
                  {v.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight mb-1">{v.label}</h3>
                  <div
                    className="inline-block text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 mb-3"
                    style={{
                      background: `rgba(${v.colorRgb},0.18)`,
                      border: `1px solid rgba(${v.colorRgb},0.3)`,
                      borderRadius: 6,
                      color: v.color,
                    }}
                  >
                    {v.badge}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(232,228,248,0.48)' }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI SECTION ─── */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div
            data-fade
            className="fade-init text-center px-8 md:px-16 py-16 md:py-20 relative overflow-hidden"
            style={{
              background: 'rgba(139,92,246,0.08)',
              backdropFilter: 'blur(32px)',
              WebkitBackdropFilter: 'blur(32px)',
              border: '1px solid rgba(139,92,246,0.22)',
              borderRadius: 28,
              boxShadow: '0 0 80px rgba(139,92,246,0.12), 0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.12)',
            }}
          >
            {/* Glow orb */}
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 70%)',
            }} />

            <div
              className="inline-flex items-center justify-center w-16 h-16 mb-8 relative"
              style={{
                background: 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: 20,
                boxShadow: '0 8px 32px rgba(139,92,246,0.3)',
              }}
            >
              <Bot size={28} style={{ color: '#c4b5fd' }} />
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-white leading-none tracking-tight mb-6 relative">
              Your AI<br />Load Planner.
            </h2>
            <p className="text-sm leading-relaxed max-w-xl mx-auto mb-10 relative" style={{ color: 'rgba(232,228,248,0.55)' }}>
              Describe your shipment in plain English. The AI assistant picks the right container, sets your dimensions, and builds a full load plan — ready to tweak or export instantly.
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-3 px-8 py-4 text-sm font-semibold text-white transition-all relative"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.88), rgba(99,102,241,0.88))',
                border: '1px solid rgba(255,255,255,0.22)',
                borderRadius: 14,
                boxShadow: '0 8px 32px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.22)',
                backdropFilter: 'blur(12px)',
              }}
            >
              Try the AI Assistant <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 md:py-32 px-6">
        <div
          className="max-w-3xl mx-auto text-center px-8 py-16 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.05)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 28,
            boxShadow: '0 8px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
          }}
        >
          <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(198,51,32,0.08) 0%, transparent 70%)',
          }} />

          <div data-fade className="fade-init relative">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-6" style={{ color: 'rgba(232,228,248,0.35)' }}>Ready to stop guessing?</p>
            <h2 className="text-6xl md:text-8xl font-black text-white leading-none tracking-tighter mb-6">
              Ship Zero Air.
            </h2>
            <p className="text-sm leading-relaxed max-w-lg mx-auto mb-10" style={{ color: 'rgba(232,228,248,0.45)' }}>
              Join freight teams who calculate exact load plans before they pick up a single carton. Free to use, no credit card, no install.
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-3 px-10 py-5 text-base font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(198,51,32,0.92), rgba(150,30,15,0.92))',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 16,
                boxShadow: '0 8px 32px rgba(198,51,32,0.4), inset 0 1px 0 rgba(255,255,255,0.22)',
                backdropFilter: 'blur(12px)',
              }}
            >
              Get Started Free <ArrowRight size={17} />
            </button>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
              {['No credit card', 'Always free', 'Instant results'].map(t => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle size={12} style={{ color: '#8b5cf6' }} />
                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'rgba(232,228,248,0.32)' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10 px-6" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-7 h-7 rounded-md object-cover" style={{ opacity: 0.8 }} />
            <span className="font-bold text-sm text-white">iO Smart Container</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'rgba(232,228,248,0.2)' }}>
            Built by Eric Tavares · {new Date().getFullYear()}
          </p>
          <button
            onClick={onGetStarted}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-medium transition-colors"
            style={{ color: 'rgba(232,228,248,0.35)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(232,228,248,0.8)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,228,248,0.35)')}
          >
            Sign In <ArrowRight size={10} />
          </button>
        </div>
      </footer>
    </div>
  );
}
