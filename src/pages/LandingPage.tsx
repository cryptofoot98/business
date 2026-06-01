import { useEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
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
      background: 'rgba(255,255,255,0.62)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.82)',
      borderRadius: 20,
      boxShadow: '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
    }}>
      <div className="text-5xl md:text-6xl font-black leading-none mb-2" style={{ color: '#f59e0b' }}>
        {display}
      </div>
      <div className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(90, 74, 61, 0.5)' }}>{label}</div>
    </div>
  );
}

const FEATURES = [
  {
    icon: <Icon name="layers" size={20} />,
    color: '#f59e0b',
    colorRgb: '22,163,74',
    title: 'Real-Time 2D Visualization',
    desc: 'See exactly how every carton fits inside your container. Switch between front, side, and top views. Drag a depth slider to peer inside any layer.',
  },
  {
    icon: <Icon name="package" size={20} />,
    color: '#dc2626',
    colorRgb: '220,38,38',
    title: 'Up to 20 Products at Once',
    desc: 'Mix products with different dimensions, weights, and stacking rules in a single load plan. CSV bulk import included — drop your spreadsheet and go.',
  },
  {
    icon: <Icon name="barchart" size={20} />,
    color: '#0284c7',
    colorRgb: '2,132,199',
    title: 'Weight Distribution & Axle Loads',
    desc: 'Calculates center of gravity and computes front/rear axle loads against legal limits. No more overloaded axles at the weigh station.',
  },
  {
    icon: <Icon name="target" size={20} />,
    color: '#d97706',
    colorRgb: '21,128,61',
    title: 'Stacking & Orientation Constraints',
    desc: 'Mark products as fragile, non-stackable, or lock their orientation. The engine respects every rule while maximising your cubic utilisation.',
  },
  {
    icon: <Icon name="truck" size={20} />,
    color: '#d97706',
    colorRgb: '217,119,6',
    title: 'Multi-Container Planning',
    desc: 'Set quantities and Smart Container automatically plans how many containers you need, distributing cargo evenly across the fleet.',
  },
  {
    icon: <Icon name="filedown" size={20} />,
    color: '#4f46e5',
    colorRgb: '79,70,229',
    title: 'Export & Print Ready',
    desc: 'Download a full CSV load manifest or print a formatted load report with a single click. Hand it straight to the warehouse team.',
  },
];

const VEHICLES = [
  {
    icon: <Icon name="ship" size={22} />,
    label: 'ISO Containers',
    badge: '20ft · 40ft · HC · Reefer',
    desc: 'Standard dry, high-cube, reefer, open-top, and flat-rack. Every ISO variant ships with certified inner dimensions.',
    color: '#f59e0b',
    colorRgb: '22,163,74',
  },
  {
    icon: <Icon name="truck" size={22} />,
    label: 'Road Freight',
    badge: 'Van · Curtainsider · Flatbed',
    desc: 'European and standard 13m trailers with full axle load calculations. Know before you load.',
    color: '#dc2626',
    colorRgb: '220,38,38',
  },
  {
    icon: <Icon name="wind" size={22} />,
    label: 'Air Freight',
    badge: 'LD3 · LD7 · PMC Pallet',
    desc: 'Major ULD types for belly and main-deck air cargo. Exact pallet footprints and max payload weights.',
    color: '#0284c7',
    colorRgb: '2,132,199',
  },
  {
    icon: <Icon name="package" size={22} />,
    label: 'LCL Spaces',
    badge: '5 · 10 · 20 CBM',
    desc: 'Less-than-container-load booking spaces to plan partial shipments and avoid paying for air.',
    color: '#d97706',
    colorRgb: '217,119,6',
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

const GLASS_CARD = {
  background: 'rgba(255,255,255,0.62)',
  backdropFilter: 'blur(24px) saturate(160%)',
  WebkitBackdropFilter: 'blur(24px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.80)',
  borderRadius: 20,
  boxShadow: '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
} as const;

export function LandingPage({ onGetStarted }: Props) {
  useScrollFade();
  const scrolled = useScrolledNav();

  return (
    <div className="relative overflow-x-hidden" style={{ background: '#fef7e8' }}>

      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={scrolled ? {
          background: 'rgba(240,248,240,0.88)',
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
        } : {
          background: 'transparent',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none',
          borderBottom: '1px solid transparent',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/business_logo.png" alt="iO Smart Container" className="w-10 h-10 object-contain shrink-0" />
            <div className="flex flex-col justify-center">
              <span className="font-bold text-base leading-none" style={{ color: '#1a1410' }}>iO Smart Container</span>
              <span className="hidden sm:block text-[10px] font-medium mt-0.5" style={{ color: 'rgba(90, 74, 61, 0.38)', letterSpacing: '0.12em' }}>by Eric Tavares</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 text-sm font-semibold transition-all"
              style={{
                color: '#d97706',
                background: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(245, 158, 11, 0.22)',
                borderRadius: 100,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              }}
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 text-sm font-semibold text-white flex items-center gap-2 transition-all"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: '1px solid rgba(255,255,255,0.28)',
                borderRadius: 100,
                boxShadow: '0 4px 16px rgba(245, 158, 11, 0.38), inset 0 1px 0 rgba(255,255,255,0.28)',
              }}
            >
              Get Started <Icon name="arrowright" size={13} />
            </button>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <HeroCanvas />
        </div>
        {/* Heavy light overlay so canvas is just a subtle texture */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(240,248,240,0.82) 0%, rgba(240,248,240,0.94) 60%, #fef7e8 100%)',
        }} />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8" style={{
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid rgba(245, 158, 11, 0.28)',
            borderRadius: 100,
            backdropFilter: 'blur(16px)',
            boxShadow: '0 2px 16px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#f59e0b', boxShadow: '0 0 6px #f59e0b' }} />
            <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#d97706' }}>Load optimization for logistics teams</span>
          </div>

          <h1 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-black leading-none tracking-tighter mb-6" style={{ color: '#1a1410' }}>
            Load<br />
            <span style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 60%, #b45309 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>Smarter.</span><br />
            Ship More.
          </h1>

          <p className="text-base md:text-lg leading-relaxed max-w-xl mx-auto mb-10" style={{ color: 'rgba(90, 74, 61, 0.6)' }}>
            Calculate exact carton quantities, weight distribution, and optimal packing configurations for any container or vehicle — in under a second.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 text-sm font-semibold text-white flex items-center justify-center gap-3 transition-all"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: '1px solid rgba(255,255,255,0.28)',
                borderRadius: 100,
                boxShadow: '0 8px 28px rgba(245, 158, 11, 0.42), inset 0 1px 0 rgba(255,255,255,0.28)',
              }}
            >
              Start Optimizing Free <Icon name="arrowright" size={15} />
            </button>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{
                color: '#d97706',
                background: 'rgba(255,255,255,0.65)',
                border: '1px solid rgba(245, 158, 11, 0.2)',
                borderRadius: 100,
                backdropFilter: 'blur(12px)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              }}
            >
              See How It Works
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10">
            {['No credit card needed', 'Free forever', 'No install required'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <Icon name="checkcircle" size={12} style={{ color: '#f59e0b' }} />
                <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: 'rgba(90, 74, 61, 0.45)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        <a href="#stats" className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 transition-all animate-bounce"
          style={{ color: 'rgba(90, 74, 61, 0.4)' }}>
          <span className="text-[9px] uppercase tracking-widest font-semibold">Scroll</span>
          <Icon name="chevrondown" size={16} />
        </a>
      </section>

      {/* ─── STATS ─── */}
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
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(245, 158, 11, 0.7)' }}>What you get</p>
            <h2 className="text-5xl md:text-6xl font-black leading-none tracking-tight" style={{ color: '#1a1410' }}>
              Everything a<br />
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
                className="fade-init p-6 flex flex-col gap-4 transition-all duration-300"
                style={{
                  ...GLASS_CARD,
                  boxShadow: `0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(${f.colorRgb},0.06), inset 0 1px 0 rgba(255,255,255,0.95)`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(${f.colorRgb},0.18), inset 0 1px 0 rgba(255,255,255,0.95)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${f.colorRgb},0.22)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px rgba(0,0,0,0.07), 0 0 0 1px rgba(${f.colorRgb},0.06), inset 0 1px 0 rgba(255,255,255,0.95)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.80)';
                }}
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{
                  background: `rgba(${f.colorRgb},0.1)`,
                  border: `1px solid rgba(${f.colorRgb},0.22)`,
                  borderRadius: 12,
                  color: f.color,
                  boxShadow: `0 2px 8px rgba(${f.colorRgb},0.15)`,
                }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight mb-2" style={{ color: '#1a1410' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(90, 74, 61, 0.55)' }}>{f.desc}</p>
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
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(245, 158, 11, 0.7)' }}>The process</p>
            <h2 className="text-5xl md:text-6xl font-black leading-none tracking-tight" style={{ color: '#1a1410' }}>
              Three steps.<br />
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
                className="fade-init p-8 h-full"
                style={GLASS_CARD}
              >
                <div className="text-6xl font-black leading-none mb-6" style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {s.n}
                </div>
                <h3 className="font-bold text-lg leading-tight mb-3" style={{ color: '#1a1410' }}>{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'rgba(90, 74, 61, 0.55)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VEHICLE TYPES ─── */}
      <section id="vehicles" className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div data-fade className="fade-init mb-16 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(245, 158, 11, 0.7)' }}>Supported transport modes</p>
            <h2 className="text-5xl md:text-6xl font-black leading-none tracking-tight" style={{ color: '#1a1410' }}>
              Every mode.<br />
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
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
                style={GLASS_CARD}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(${v.colorRgb},0.15), inset 0 1px 0 rgba(255,255,255,0.95)`;
                  (e.currentTarget as HTMLDivElement).style.borderColor = `rgba(${v.colorRgb},0.25)`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)';
                  (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.80)';
                }}
              >
                <div className="w-12 h-12 flex items-center justify-center shrink-0" style={{
                  background: `rgba(${v.colorRgb},0.1)`,
                  border: `1px solid rgba(${v.colorRgb},0.22)`,
                  borderRadius: 14,
                  color: v.color,
                  boxShadow: `0 2px 10px rgba(${v.colorRgb},0.15)`,
                }}>
                  {v.icon}
                </div>
                <div>
                  <h3 className="font-bold text-sm leading-tight mb-1" style={{ color: '#1a1410' }}>{v.label}</h3>
                  <div className="inline-block text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 mb-3" style={{
                    background: `rgba(${v.colorRgb},0.1)`,
                    border: `1px solid rgba(${v.colorRgb},0.22)`,
                    borderRadius: 100,
                    color: v.color,
                  }}>
                    {v.badge}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(90, 74, 61, 0.52)' }}>{v.desc}</p>
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
              background: 'rgba(255,255,255,0.72)',
              backdropFilter: 'blur(32px) saturate(180%)',
              WebkitBackdropFilter: 'blur(32px) saturate(180%)',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: 28,
              boxShadow: '0 8px 40px rgba(245, 158, 11, 0.1), 0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.95)',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(245, 158, 11, 0.06) 0%, transparent 65%)',
            }} />

            <div className="inline-flex items-center justify-center w-16 h-16 mb-8 relative" style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              borderRadius: 20,
              boxShadow: '0 4px 20px rgba(245, 158, 11, 0.2)',
            }}>
              <Icon name="bot" size={28} style={{ color: '#f59e0b' }} />
            </div>
            <h2 className="text-5xl md:text-6xl font-black leading-none tracking-tight mb-6 relative" style={{ color: '#1a1410' }}>
              Your AI<br />Load Planner.
            </h2>
            <p className="text-sm leading-relaxed max-w-xl mx-auto mb-10 relative" style={{ color: 'rgba(90, 74, 61, 0.58)' }}>
              Describe your shipment in plain English. The AI assistant picks the right container, sets your dimensions, and builds a full load plan — ready to tweak or export instantly.
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-3 px-8 py-4 text-sm font-semibold text-white transition-all relative"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: '1px solid rgba(255,255,255,0.28)',
                borderRadius: 100,
                boxShadow: '0 8px 28px rgba(245, 158, 11, 0.42), inset 0 1px 0 rgba(255,255,255,0.28)',
              }}
            >
              Try the AI Assistant <Icon name="arrowright" size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="py-24 md:py-32 px-6">
        <div
          className="max-w-3xl mx-auto text-center px-8 py-16 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.72)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.85)',
            borderRadius: 28,
            boxShadow: '0 4px 32px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.95)',
          }}
        >
          <div data-fade className="fade-init relative">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-6" style={{ color: 'rgba(90, 74, 61, 0.4)' }}>Ready to stop guessing?</p>
            <h2 className="text-6xl md:text-8xl font-black leading-none tracking-tighter mb-6" style={{ color: '#1a1410' }}>
              Ship Zero Air.
            </h2>
            <p className="text-sm leading-relaxed max-w-lg mx-auto mb-10" style={{ color: 'rgba(90, 74, 61, 0.55)' }}>
              Join freight teams who calculate exact load plans before they pick up a single carton. Free to use, no credit card, no install.
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-3 px-10 py-5 text-base font-semibold text-white transition-all"
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: '1px solid rgba(255,255,255,0.28)',
                borderRadius: 100,
                boxShadow: '0 8px 32px rgba(245, 158, 11, 0.42), inset 0 1px 0 rgba(255,255,255,0.28)',
              }}
            >
              Get Started Free <Icon name="arrowright" size={17} />
            </button>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
              {['No credit card', 'Always free', 'Instant results'].map(t => (
                <div key={t} className="flex items-center gap-2">
                  <Icon name="checkcircle" size={12} style={{ color: '#f59e0b' }} />
                  <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'rgba(90, 74, 61, 0.38)' }}>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10 px-6" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/business_logo.png" alt="iO Smart Container" className="w-8 h-8 object-contain" style={{ opacity: 0.9 }} />
            <span className="font-bold text-sm" style={{ color: '#1a1410' }}>iO Smart Container</span>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'rgba(90, 74, 61, 0.28)' }}>
            Built by Eric Tavares · {new Date().getFullYear()}
          </p>
          <button
            onClick={onGetStarted}
            className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-medium transition-colors"
            style={{ color: 'rgba(90, 74, 61, 0.42)' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#f59e0b')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(90, 74, 61, 0.42)')}
          >
            Sign In <Icon name="arrowright" size={10} />
          </button>
        </div>
      </footer>
    </div>
  );
}
