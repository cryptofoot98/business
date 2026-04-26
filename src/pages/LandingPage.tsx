import { useEffect, useRef, useState } from 'react';
import {
  Ship, ArrowRight, Package, Truck,
  BarChart3, FileDown, Bot, Layers, Target,
  ChevronDown, CheckCircle, Container, Calculator,
} from 'lucide-react';
import { HeroShader } from '../components/landing/HeroShader';

interface Props {
  onGetStarted: () => void;
}

function useScrollFade() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('fade-visible');
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

function FadeSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useScrollFade();
  return <div ref={ref} className={`fade-init ${className}`}>{children}</div>;
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

function useCountUp(target: number, duration = 1600, start = false) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, start]);
  return value;
}

const FEATURES = [
  { icon: BarChart3, title: 'Real-Time 2D Visualization', desc: 'Watch boxes pack in real time with an interactive 2D canvas view.' },
  { icon: Layers, title: 'Multi-Product Support', desc: 'Up to 20 distinct SKUs per load — colors, names, and constraints.' },
  { icon: Target, title: 'Weight Distribution', desc: 'Axle-load calculations and center-of-gravity tracking for compliance.' },
  { icon: Package, title: 'Loading Constraints', desc: 'Fragile flags, stackability limits, and orientation locks per item.' },
  { icon: Container, title: 'Multi-Container Planning', desc: 'Automatically split a shipment across the minimum containers needed.' },
  { icon: FileDown, title: 'Export & Share', desc: 'PDF load plans, CSV reports, and shareable load summaries.' },
];

const STATS = [
  { label: 'Vehicle Types', value: 22, suffix: '+' },
  { label: 'Box Orientations', value: 6, suffix: '' },
  { label: 'Products per Load', value: 20, suffix: '' },
  { label: 'Packing Accuracy', value: 99, suffix: '%' },
];

function StatItem({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const count = useCountUp(value, 1400, started);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStarted(true); obs.disconnect(); } }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="text-center px-6 py-4">
      <div className="text-4xl lg:text-5xl font-bold text-white leading-none mb-1">
        {count}{suffix}
      </div>
      <div className="text-xs font-semibold uppercase tracking-widest text-white/45">{label}</div>
    </div>
  );
}

export function LandingPage({ onGetStarted }: Props) {
  const scrolled = useScrolledNav();

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#060E1A', color: 'white' }}>

      {/* ── Navigation ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(6,14,26,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-base text-white">iO Smart Container</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onGetStarted}
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={{ background: '#3DB240', color: 'white', boxShadow: '0 4px 20px rgba(61,178,64,0.35)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#2D9632'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#3DB240'; }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <HeroShader />

        {/* Gradient overlay so text is readable */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(6,14,26,0.88) 0%, rgba(6,14,26,0.55) 60%, rgba(6,14,26,0.15) 100%)' }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 pt-24 pb-20">
          <div className="max-w-2xl">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
              style={{ background: 'rgba(61,178,64,0.12)', border: '1px solid rgba(61,178,64,0.30)', color: '#5DC258' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Load Optimization for Logistics Teams
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.04] tracking-tight text-white mb-6">
              Pack Smarter,<br />
              <span style={{ color: '#3DB240' }}>Ship Faster</span>
            </h1>

            <p className="text-lg sm:text-xl text-white/60 leading-relaxed mb-10 max-w-xl">
              Intelligent container load planning that maximizes volume, tracks weight distribution, and generates professional load plans in seconds.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={onGetStarted}
                className="flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-semibold transition-all group"
                style={{ background: '#3DB240', color: 'white', boxShadow: '0 8px 32px rgba(61,178,64,0.40)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#2D9632'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(61,178,64,0.50)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#3DB240'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(61,178,64,0.40)'; }}
              >
                Start Planning Free
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={onGetStarted}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold transition-all"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.80)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; }}
              >
                See How It Works
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Trust bullets */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8">
              {['No credit card required', 'Instant setup', '22+ vehicle types'].map(t => (
                <div key={t} className="flex items-center gap-2 text-sm text-white/50">
                  <CheckCircle size={13} style={{ color: '#3DB240' }} />
                  {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/30">
          <span className="text-[10px] font-semibold uppercase tracking-widest">Scroll</span>
          <ChevronDown size={16} className="animate-bounce" />
        </div>
      </section>

      {/* ── Stats ── */}
      <section
        style={{ background: 'rgba(255,255,255,0.04)', borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-white/10">
            {STATS.map(s => <StatItem key={s.label} {...s} />)}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeSection className="text-center mb-16">
            <div
              className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ background: 'rgba(61,178,64,0.12)', border: '1px solid rgba(61,178,64,0.25)', color: '#5DC258' }}
            >
              Features
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">Everything you need to<br />optimize every shipment</h2>
            <p className="text-white/50 text-lg max-w-2xl mx-auto">
              From single cartons to multi-container LCL shipments, iO Smart Container handles every scenario.
            </p>
          </FadeSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <FadeSection key={i} className="h-full">
                <div
                  className="h-full p-6 rounded-2xl group hover:-translate-y-1 transition-transform duration-300"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(61,178,64,0.25)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(61,178,64,0.12)', border: '1px solid rgba(61,178,64,0.20)' }}
                  >
                    <f.icon size={20} style={{ color: '#3DB240' }} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        className="py-24 lg:py-32"
        style={{ background: 'rgba(255,255,255,0.025)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeSection className="text-center mb-16">
            <div
              className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-4"
              style={{ background: 'rgba(27,48,128,0.20)', border: '1px solid rgba(27,48,128,0.35)', color: '#8099D8' }}
            >
              How It Works
            </div>
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">Three steps to a perfect load plan</h2>
          </FadeSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {[
              { n: '01', title: 'Select your container', desc: 'Choose from 22+ vehicle and container types — ISO, road freight, air pallets, and more.' },
              { n: '02', title: 'Add your products', desc: 'Enter dimensions, weights, and constraints for up to 20 distinct SKUs — or import from CSV.' },
              { n: '03', title: 'Get your load plan', desc: 'Instantly see a 2D packed view, weight distribution, and export a professional PDF load plan.' },
            ].map((step, i) => (
              <FadeSection key={i}>
                <div className="flex flex-col gap-4">
                  <div
                    className="text-5xl font-bold leading-none"
                    style={{ color: 'rgba(61,178,64,0.35)' }}
                  >
                    {step.n}
                  </div>
                  <h3 className="text-xl font-semibold text-white">{step.title}</h3>
                  <p className="text-white/50 leading-relaxed">{step.desc}</p>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Vehicle types ── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeSection className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">Every mode of transport, covered</h2>
            <p className="text-white/50 text-lg max-w-xl mx-auto">Standardized data for every major container and vehicle type used in global logistics.</p>
          </FadeSection>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: Ship, label: 'ISO Containers', sub: '20ft, 40ft, HC, Reefer' },
              { icon: Truck, label: 'Road Freight', sub: 'Curtainsider, Box, Flatbed' },
              { icon: Package, label: 'Air Cargo', sub: 'ULD Pallets, LD3, P6P' },
              { icon: Container, label: 'LCL Spaces', sub: 'CBM-based shared loads' },
            ].map((v, i) => (
              <FadeSection key={i}>
                <div
                  className="p-6 rounded-2xl text-center group hover:-translate-y-1 transition-transform duration-300"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(27,48,128,0.25)', border: '1px solid rgba(27,48,128,0.35)' }}
                  >
                    <v.icon size={22} style={{ color: '#8099D8' }} />
                  </div>
                  <div className="font-semibold text-white text-sm mb-1">{v.label}</div>
                  <div className="text-xs text-white/40">{v.sub}</div>
                </div>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI section ── */}
      <section
        className="py-24 lg:py-32"
        style={{ background: 'rgba(255,255,255,0.025)', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <FadeSection>
              <div
                className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
                style={{ background: 'rgba(61,178,64,0.12)', border: '1px solid rgba(61,178,64,0.25)', color: '#5DC258' }}
              >
                AI Assistant
              </div>
              <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Your AI-powered logistics partner</h2>
              <p className="text-white/55 text-lg leading-relaxed mb-8">
                Just describe your shipment in plain English. The AI assistant configures your container, adds products, and explains the optimal load strategy — all in one conversation.
              </p>
              <button
                onClick={onGetStarted}
                className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all"
                style={{ background: '#3DB240', color: 'white', boxShadow: '0 6px 24px rgba(61,178,64,0.35)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#2D9632'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#3DB240'; }}
              >
                <Bot size={16} />
                Try the AI Planner
                <ArrowRight size={16} />
              </button>
            </FadeSection>

            <FadeSection>
              <div
                className="p-6 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(61,178,64,0.15)', border: '1px solid rgba(61,178,64,0.25)' }}
                  >
                    <Bot size={14} style={{ color: '#3DB240' }} />
                  </div>
                  <span className="text-sm font-semibold text-white/70">AI Assistant</span>
                  <div className="ml-auto flex gap-1">
                    {[0, 1, 2].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: '#3DB240', opacity: 0.4 + i * 0.3 }} />)}
                  </div>
                </div>

                {[
                  { role: 'user', msg: "I need to ship 200 boxes of electronics, 60×40×30 cm, 8 kg each. What's the best container?" },
                  { role: 'ai', msg: "Based on your dimensions and weight, a 20ft ISO container is ideal. I've calculated you can fit 192 boxes with 96% volume utilization at 1,536 kg gross. Want me to set this up?" },
                ].map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div
                      className="max-w-xs px-4 py-3 rounded-xl text-sm leading-relaxed"
                      style={m.role === 'user'
                        ? { background: 'rgba(27,48,128,0.40)', color: 'rgba(255,255,255,0.80)', border: '1px solid rgba(27,48,128,0.50)' }
                        : { background: 'rgba(61,178,64,0.12)', color: 'rgba(255,255,255,0.80)', border: '1px solid rgba(61,178,64,0.20)' }
                      }
                    >
                      {m.msg}
                    </div>
                  </div>
                ))}

                <div
                  className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
                >
                  <span className="text-sm text-white/30 flex-1">Ask me about your shipment...</span>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#3DB240' }}>
                    <ArrowRight size={13} color="white" />
                  </div>
                </div>
              </div>
            </FadeSection>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <FadeSection>
            <div
              className="text-center px-8 py-16 rounded-3xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(135deg, rgba(27,48,128,0.55) 0%, rgba(10,22,40,0.60) 60%, rgba(61,178,64,0.20) 100%)',
                border: '1px solid rgba(255,255,255,0.10)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
              }}
            >
              <div className="absolute inset-0 opacity-30" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(61,178,64,0.25), transparent 60%)' }} />
              <div className="relative z-10">
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6"
                  style={{ background: 'rgba(61,178,64,0.12)', border: '1px solid rgba(61,178,64,0.30)', color: '#5DC258' }}
                >
                  <Calculator size={12} />
                  Free to use — no account required
                </div>
                <h2 className="text-4xl lg:text-5xl font-bold text-white mb-6">Ready to optimize your loads?</h2>
                <p className="text-white/55 text-lg mb-10 max-w-xl mx-auto">
                  Start packing smarter in under 60 seconds. No setup, no credit card, no complexity.
                </p>
                <button
                  onClick={onGetStarted}
                  className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-base font-semibold transition-all group"
                  style={{ background: '#3DB240', color: 'white', boxShadow: '0 8px 32px rgba(61,178,64,0.40)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#2D9632'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(61,178,64,0.50)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#3DB240'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(61,178,64,0.40)'; }}
                >
                  Launch Load Planner
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        className="py-12"
        style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/iO_smartcontainer.png" alt="" className="w-7 h-7 rounded-md object-cover" />
            <span className="font-semibold text-sm text-white/70">iO Smart Container</span>
          </div>
          <p className="text-xs text-white/30">
            Built for logistics professionals · Powered by AI
          </p>
        </div>
      </footer>
    </div>
  );
}
