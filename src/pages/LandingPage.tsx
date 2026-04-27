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
    <div ref={ref} className="text-center">
      <div className="font-display text-5xl md:text-6xl text-white leading-none mb-2" style={{ textShadow: '3px 3px 0px #c63320' }}>
        {display}
      </div>
      <div className="font-mono text-[11px] uppercase tracking-widest text-white/40 font-bold">{label}</div>
    </div>
  );
}

const FEATURES = [
  {
    icon: <Layers size={20} />,
    color: '#c63320',
    title: 'Real-Time 2D Visualization',
    desc: 'See exactly how every carton fits inside your container. Switch between front, side, and top views. Drag a depth slider to peer inside any layer.',
  },
  {
    icon: <Package size={20} />,
    color: '#d96a1c',
    title: 'Up to 20 Products at Once',
    desc: 'Mix products with different dimensions, weights, and stacking rules in a single load plan. CSV bulk import included — drop your spreadsheet and go.',
  },
  {
    icon: <BarChart3 size={20} />,
    color: '#1572b6',
    title: 'Weight Distribution & Axle Loads',
    desc: 'Calculates center of gravity and computes front/rear axle loads against legal limits. No more overloaded axles at the weigh station.',
  },
  {
    icon: <Target size={20} />,
    color: '#1a4f7a',
    title: 'Stacking & Orientation Constraints',
    desc: 'Mark products as fragile, non-stackable, or lock their orientation. The engine respects every rule while maximising your cubic utilisation.',
  },
  {
    icon: <Truck size={20} />,
    color: '#df9a10',
    title: 'Multi-Container Planning',
    desc: 'Set quantities and Smart Container automatically plans how many containers you need, distributing cargo evenly across the fleet.',
  },
  {
    icon: <FileDown size={20} />,
    color: '#2d6a9a',
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
    color: '#0c2844',
  },
  {
    icon: <Truck size={22} />,
    label: 'Road Freight',
    badge: 'Van · Curtainsider · Flatbed',
    desc: 'European and standard 13m trailers with full axle load calculations. Know before you load.',
    color: '#c63320',
  },
  {
    icon: <Wind size={22} />,
    label: 'Air Freight',
    badge: 'LD3 · LD7 · PMC Pallet',
    desc: 'Major ULD types for belly and main-deck air cargo. Exact pallet footprints and max payload weights.',
    color: '#1a4f7a',
  },
  {
    icon: <Package size={22} />,
    label: 'LCL Spaces',
    badge: '5 · 10 · 20 CBM',
    desc: 'Less-than-container-load booking spaces to plan partial shipments and avoid paying for air.',
    color: '#d96a1c',
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

export function LandingPage({ onGetStarted }: Props) {
  useScrollFade();
  const scrolled = useScrolledNav();

  return (
    <div className="relative overflow-x-hidden" style={{ background: '#0d0d0d' }}>
      {/* ─── NAV ─── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(13,13,13,0.96)' : 'transparent',
          borderBottom: scrolled ? '2px solid rgba(255,255,255,0.08)' : '2px solid transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-9 h-9 rounded-lg object-cover shrink-0" />
            <div className="flex flex-col justify-center">
              <span className="text-white font-black text-base uppercase tracking-tight leading-none">iO Smart Container</span>
              <span className="hidden sm:block font-mono text-[10px] text-white/25 uppercase tracking-widest font-bold mt-0.5">by Eric Tavares</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white/70 hover:text-white transition-colors border-2 border-white/20 hover:border-white/50"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              Sign In
            </button>
            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white flex items-center gap-2 transition-all hover:gap-3"
              style={{ background: '#c63320', border: '2px solid #952515', boxShadow: '3px 3px 0px #0d0d0d' }}
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
            background: 'radial-gradient(ellipse 70% 60% at 50% 55%, rgba(13,13,13,0) 30%, rgba(13,13,13,0.85) 80%, #0d0d0d 100%)',
          }}
        />

        <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 border border-brut-hdr/60 mb-8"
            style={{ background: 'rgba(27,107,64,0.15)' }}>
            <div className="w-1.5 h-1.5 bg-brut-hdr rounded-full animate-pulse" />
            <span className="font-mono text-[10px] text-brut-hdr uppercase tracking-widest font-bold">Load optimization for logistics teams</span>
          </div>

          <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-white uppercase leading-none tracking-tighter mb-6"
            style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}>
            Load<br />
            <span style={{ color: '#c63320', textShadow: '4px 4px 0px rgba(0,0,0,0.5)' }}>Smarter.</span><br />
            Ship More.
          </h1>

          <p className="text-white/55 font-mono text-sm md:text-base leading-relaxed max-w-xl mx-auto mb-10">
            Calculate exact carton quantities, weight distribution, and optimal packing configurations for any container or vehicle — in under a second.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-8 py-4 text-sm font-black uppercase tracking-wider text-white flex items-center justify-center gap-3 transition-all hover:gap-4 hover:-translate-y-0.5"
              style={{ background: '#c63320', border: '3px solid #952515', boxShadow: '5px 5px 0px #0d0d0d' }}
            >
              Start Optimizing Free <ArrowRight size={15} />
            </button>
            <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 text-sm font-black uppercase tracking-wider text-white/60 hover:text-white flex items-center justify-center gap-2 transition-colors border-2 border-white/15 hover:border-white/40">
              See How It Works
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-10">
            {['No credit card needed', 'Free forever', 'No install required'].map(t => (
              <div key={t} className="flex items-center gap-2">
                <CheckCircle size={12} className="text-brut-hdr" />
                <span className="font-mono text-[11px] text-white/35 font-bold uppercase tracking-wide">{t}</span>
              </div>
            ))}
          </div>
        </div>

        <a href="#stats" className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors animate-bounce">
          <span className="font-mono text-[9px] uppercase tracking-widest font-bold">Scroll</span>
          <ChevronDown size={16} />
        </a>
      </section>

      {/* ─── STATS STRIP ─── */}
      <section id="stats" className="py-20 border-y border-white/8" style={{ background: '#111' }}>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-10">
          <StatItem value={22} suffix="+" label="Vehicle & Container Types" />
          <StatItem value={6} label="Orientations per Product" />
          <StatItem value={20} label="Products Per Load Plan" />
          <StatItem value={99} suffix="%" label="Utilisation Accuracy" />
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section
        id="features"
        className="py-24 md:py-32"
        style={{ background: '#ede8df' }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div data-fade className="fade-init mb-16 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/35 mb-3">What you get</p>
            <h2 className="font-display text-5xl md:text-6xl text-brut-black uppercase leading-none tracking-tighter"
              style={{ textShadow: '3px 3px 0px rgba(0,0,0,0.12)' }}>
              Everything a<br />
              <span style={{ color: '#c63320' }}>logistics team needs.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                data-fade
                data-fade-delay={i * 80}
                className="fade-init bg-white border-3 border-brut-black p-6 flex flex-col gap-4 group hover:-translate-y-1 transition-transform"
                style={{ boxShadow: `5px 5px 0px ${f.color}` }}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center text-white border-2 border-brut-black shrink-0"
                  style={{ background: f.color }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-black text-base uppercase tracking-tight text-brut-black leading-tight mb-2">{f.title}</h3>
                  <p className="font-mono text-xs text-brut-black/55 leading-relaxed font-medium">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section
        id="how-it-works"
        className="py-24 md:py-32"
        style={{ background: '#0d0d0d' }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div data-fade className="fade-init mb-16">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">The process</p>
            <h2 className="font-display text-5xl md:text-6xl text-white uppercase leading-none tracking-tighter">
              Three steps.<br />
              <span style={{ color: '#c63320' }}>Infinite cargo.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                data-fade
                data-fade-delay={i * 120}
                className="fade-init relative"
              >
                {i < STEPS.length - 1 && (
                  <div
                    className="hidden md:block absolute top-8 left-full w-8 h-[2px] z-10"
                    style={{ background: 'rgba(255,255,255,0.1)', transform: 'translateX(-16px)' }}
                  />
                )}
                <div className="border-2 border-white/12 p-8 h-full" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <div
                    className="font-display text-6xl leading-none mb-6"
                    style={{ color: '#c63320', textShadow: '2px 2px 0px rgba(0,0,0,0.5)' }}
                  >
                    {s.n}
                  </div>
                  <h3 className="font-black text-lg uppercase tracking-tight text-white leading-tight mb-3">{s.title}</h3>
                  <p className="font-mono text-xs text-white/40 leading-relaxed font-medium">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VEHICLE TYPES ─── */}
      <section
        id="vehicles"
        className="py-24 md:py-32"
        style={{ background: '#f7f4ef' }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div data-fade className="fade-init mb-16 text-center">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/35 mb-3">Supported transport modes</p>
            <h2 className="font-display text-5xl md:text-6xl text-brut-black uppercase leading-none tracking-tighter">
              Every mode.<br />
              <span style={{ color: '#0c2844' }}>One tool.</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {VEHICLES.map((v, i) => (
              <div
                key={v.label}
                data-fade
                data-fade-delay={i * 100}
                className="fade-init border-3 border-brut-black bg-white p-6 flex flex-col gap-4 hover:-translate-y-1 transition-transform"
                style={{ boxShadow: `5px 5px 0px ${v.color}` }}
              >
                <div
                  className="w-12 h-12 flex items-center justify-center text-white border-2 border-brut-black shrink-0"
                  style={{ background: v.color }}
                >
                  {v.icon}
                </div>
                <div>
                  <h3 className="font-black text-sm uppercase tracking-tight text-brut-black leading-tight mb-1">{v.label}</h3>
                  <div
                    className="inline-block font-mono text-[9px] font-bold uppercase tracking-wider text-white px-2 py-1 mb-3"
                    style={{ background: v.color }}
                  >
                    {v.badge}
                  </div>
                  <p className="font-mono text-xs text-brut-black/50 leading-relaxed font-medium">{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI SECTION ─── */}
      <section
        className="py-24 md:py-32 relative overflow-hidden"
        style={{ background: '#0c2844' }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #ffffff 0, #ffffff 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <div data-fade className="fade-init">
            <div className="inline-flex items-center justify-center w-16 h-16 border-3 border-white/30 mb-8" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <Bot size={28} className="text-white" />
            </div>
            <h2 className="font-display text-5xl md:text-6xl text-white uppercase leading-none tracking-tighter mb-6">
              Your AI<br />Load Planner.
            </h2>
            <p className="font-mono text-sm text-white/60 leading-relaxed max-w-xl mx-auto mb-10 font-medium">
              Describe your shipment in plain English. The AI assistant picks the right container, sets your dimensions, and builds a full load plan — ready to tweak or export instantly.
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-3 px-8 py-4 text-sm font-black uppercase tracking-wider transition-all hover:gap-4 hover:-translate-y-0.5"
              style={{ background: '#0d0d0d', color: '#fff', border: '3px solid #0d0d0d', boxShadow: '5px 5px 0px rgba(0,0,0,0.3)' }}
            >
              Try the AI Assistant <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section
        className="py-24 md:py-32"
        style={{ background: '#0d0d0d' }}
      >
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div data-fade className="fade-init">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-6">Ready to stop guessing?</p>
            <h2 className="font-display text-6xl md:text-8xl text-white uppercase leading-none tracking-tighter mb-6"
              style={{ textShadow: '4px 4px 0px #c63320' }}>
              Ship Zero Air.
            </h2>
            <p className="font-mono text-sm text-white/40 leading-relaxed max-w-lg mx-auto mb-10 font-medium">
              Join freight teams who calculate exact load plans before they pick up a single carton. Free to use, no credit card, no install.
            </p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-3 px-10 py-5 text-base font-black uppercase tracking-wider text-white transition-all hover:gap-4 hover:-translate-y-0.5"
              style={{ background: '#c63320', border: '3px solid #952515', boxShadow: '6px 6px 0px rgba(255,255,255,0.08)' }}
            >
              Get Started Free <ArrowRight size={17} />
            </button>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-8">
              {['No credit card', 'Always free', 'Instant results'].map(t => (
                <div key={t} className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-brut-hdr" />
                  <span className="font-mono text-[10px] text-white/30 font-bold uppercase tracking-wide">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer
        className="py-10 border-t border-white/8"
        style={{ background: '#080808' }}
      >
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-7 h-7 rounded-md object-cover shrink-0" />
            <span className="font-black text-sm uppercase tracking-tight text-white">iO Smart Container</span>
          </div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/20 font-bold">
            Built by Eric Tavares · {new Date().getFullYear()}
          </p>
          <button
            onClick={onGetStarted}
            className="font-mono text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors font-bold flex items-center gap-1.5"
          >
            Sign In <ArrowRight size={10} />
          </button>
        </div>
      </footer>
    </div>
  );
}
