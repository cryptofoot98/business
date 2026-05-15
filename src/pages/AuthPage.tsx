import { useState, FormEvent } from 'react';
import { Ship, ArrowRight, AlertTriangle, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'signin' | 'signup';

const GLASS_CARD = {
  background: 'rgba(255,255,255,0.08)',
  backdropFilter: 'blur(32px) saturate(160%)',
  WebkitBackdropFilter: 'blur(32px) saturate(160%)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 24,
  boxShadow: '0 16px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)',
} as const;

export function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setError('Name is required.');
        setLoading(false);
        return;
      }
      const { error: err } = await signUp(email, password, fullName.trim());
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }
      setSuccess(true);
    } else {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err);
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: '#060412' }}>

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div style={{
            background: 'rgba(139,92,246,0.2)',
            border: '1px solid rgba(139,92,246,0.35)',
            borderRadius: 12,
            padding: 3,
          }}>
            <img src="/iO_smartcontainer.png" alt="iO Smart Container" className="w-8 h-8 rounded-lg object-cover" />
          </div>
          <span className="text-white font-bold text-lg">Smart Container</span>
        </div>

        {/* Hero text */}
        <div>
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(196,181,253,0.55)' }}>
              Built for logistics
            </p>
            <h2 className="text-white font-black text-5xl leading-none tracking-tight mb-6">
              Pack smarter.<br />
              <span style={{
                background: 'linear-gradient(135deg, #c63320, #e05a40)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Ship more.</span>
            </h2>
            <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(232,228,248,0.42)' }}>
              Calculate exact carton quantities, weight utilization, and optimal pallet configurations for any shipping container.
            </p>
          </div>

          {/* Stat grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Container Types', value: '12+' },
              { label: 'Orientations Tested', value: '6' },
              { label: 'Units in Seconds', value: '<1s' },
              { label: 'Pallet Standards', value: 'EUR / US' },
            ].map(({ label, value }) => (
              <div key={label} className="p-4" style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 14,
              }}>
                <div className="text-3xl font-black text-white leading-none mb-1">{value}</div>
                <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(232,228,248,0.32)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'rgba(232,228,248,0.18)' }}>
          by Eric Tavares
        </p>
      </div>

      {/* ── RIGHT PANEL (FORM) ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md" style={GLASS_CARD}>
          <div className="p-8">
            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-8">
              <div style={{
                background: 'rgba(139,92,246,0.2)',
                border: '1px solid rgba(139,92,246,0.35)',
                borderRadius: 10,
                padding: 3,
              }}>
                <Ship size={16} className="text-white m-1" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-lg text-white">Smart Container</span>
            </div>

            {/* Mode switcher */}
            <div className="flex mb-7" style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: 4,
            }}>
              {(['signin', 'signup'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className="flex-1 py-2.5 text-sm font-semibold transition-all"
                  style={{
                    borderRadius: 9,
                    color: mode === m ? '#ffffff' : 'rgba(232,228,248,0.45)',
                    background: mode === m
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.85), rgba(99,102,241,0.85))'
                      : 'transparent',
                    border: mode === m ? '1px solid rgba(255,255,255,0.18)' : '1px solid transparent',
                    boxShadow: mode === m ? '0 4px 16px rgba(139,92,246,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' : 'none',
                  }}
                >
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {success ? (
              <div className="p-5" style={{
                background: 'rgba(16,185,129,0.1)',
                border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 14,
                boxShadow: '0 4px 16px rgba(16,185,129,0.15)',
              }}>
                <div className="w-10 h-10 flex items-center justify-center mb-4" style={{
                  background: 'rgba(16,185,129,0.2)',
                  border: '1px solid rgba(16,185,129,0.4)',
                  borderRadius: 10,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </div>
                <p className="font-semibold text-sm text-white mb-2">Account Created</p>
                <p className="text-sm" style={{ color: 'rgba(232,228,248,0.55)' }}>
                  Check your email to confirm your account, then sign in below.
                </p>
                <button
                  onClick={() => switchMode('signin')}
                  className="mt-5 brut-btn px-5 py-3 text-sm w-full"
                >
                  Go to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-2">
                  <h3 className="text-2xl font-black text-white leading-none">
                    {mode === 'signin' ? 'Welcome back' : 'New account'}
                  </h3>
                  <p className="text-[11px] uppercase tracking-widest font-medium mt-1.5" style={{ color: 'rgba(232,228,248,0.38)' }}>
                    {mode === 'signin' ? 'Sign in to continue' : 'Create your account to get started'}
                  </p>
                </div>

                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(232,228,248,0.45)' }}>Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      required
                      className="brut-input w-full px-4 py-3.5 text-sm"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(232,228,248,0.45)' }}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="brut-input w-full px-4 py-3.5 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(232,228,248,0.45)' }}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                    className="brut-input w-full px-4 py-3.5 text-sm"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 p-3" style={{
                    background: 'rgba(198,51,32,0.1)',
                    border: '1px solid rgba(198,51,32,0.3)',
                    borderRadius: 10,
                    boxShadow: '0 4px 12px rgba(198,51,32,0.15)',
                  }}>
                    <AlertTriangle size={14} style={{ color: '#c63320' }} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-medium leading-snug" style={{ color: '#ef9990' }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="brut-btn w-full py-4 text-sm flex items-center justify-center gap-2.5"
                >
                  {loading ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
