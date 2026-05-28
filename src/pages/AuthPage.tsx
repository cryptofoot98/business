import { useState, FormEvent } from 'react';
import { Icon, Spinner } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'signin' | 'signup';

const GLASS_CARD = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(32px) saturate(180%)',
  WebkitBackdropFilter: 'blur(32px) saturate(180%)',
  border: '1px solid rgba(255,255,255,0.85)',
  borderRadius: 24,
  boxShadow: '0 8px 40px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.95)',
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
    <div className="h-screen flex overflow-hidden" style={{ background: '#fef7e8' }}>

      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex w-1/2 flex-col justify-between p-12"
        style={{
          background: 'rgba(255,255,255,0.48)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <img src="/business_logo.png" alt="iO Smart Container" className="w-12 h-12 object-contain" />
          <span className="font-bold text-lg" style={{ color: '#1a1410' }}>Smart Container</span>
        </div>

        {/* Hero text */}
        <div>
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-4" style={{ color: 'rgba(245, 158, 11, 0.6)' }}>
              Built for logistics
            </p>
            <h2 className="font-black text-5xl leading-none tracking-tight mb-6" style={{ color: '#1a1410' }}>
              Pack smarter.<br />
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Ship more.</span>
            </h2>
            <p className="text-sm leading-relaxed max-w-sm" style={{ color: 'rgba(90, 74, 61, 0.55)' }}>
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
                background: 'rgba(255,255,255,0.68)',
                border: '1px solid rgba(255,255,255,0.85)',
                borderRadius: 14,
                boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
              }}>
                <div className="text-3xl font-black leading-none mb-1" style={{ color: '#f59e0b' }}>{value}</div>
                <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: 'rgba(90, 74, 61, 0.42)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] uppercase tracking-widest font-medium" style={{ color: 'rgba(90, 74, 61, 0.25)' }}>
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
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: 10,
                padding: 3,
              }}>
                <Icon name="ship" size={16} style={{ color: '#f59e0b', margin: 4 }} />
              </div>
              <span className="font-bold text-lg" style={{ color: '#1a1410' }}>Smart Container</span>
            </div>

            {/* Mode switcher */}
            <div className="flex mb-7 p-1" style={{
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 100,
            }}>
              {(['signin', 'signup'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className="flex-1 py-2.5 text-sm font-semibold transition-all"
                  style={{
                    borderRadius: 100,
                    color: mode === m ? '#ffffff' : 'rgba(90, 74, 61, 0.5)',
                    background: mode === m
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : 'transparent',
                    border: mode === m ? '1px solid rgba(255,255,255,0.28)' : '1px solid transparent',
                    boxShadow: mode === m ? '0 4px 16px rgba(245, 158, 11, 0.38), inset 0 1px 0 rgba(255,255,255,0.28)' : 'none',
                  }}
                >
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {success ? (
              <div className="p-5" style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.22)',
                borderRadius: 16,
                boxShadow: '0 2px 12px rgba(245, 158, 11, 0.1)',
              }}>
                <div className="w-10 h-10 flex items-center justify-center mb-4" style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.28)',
                  borderRadius: 10,
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                </div>
                <p className="font-semibold text-sm mb-2" style={{ color: '#1a1410' }}>Account Created</p>
                <p className="text-sm" style={{ color: 'rgba(90, 74, 61, 0.58)' }}>
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
                  <h3 className="text-2xl font-black leading-none" style={{ color: '#1a1410' }}>
                    {mode === 'signin' ? 'Welcome back' : 'New account'}
                  </h3>
                  <p className="text-[11px] uppercase tracking-widest font-medium mt-1.5" style={{ color: 'rgba(90, 74, 61, 0.42)' }}>
                    {mode === 'signin' ? 'Sign in to continue' : 'Create your account to get started'}
                  </p>
                </div>

                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.5)' }}>Full Name</label>
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
                  <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.5)' }}>Email</label>
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
                  <label className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(90, 74, 61, 0.5)' }}>Password</label>
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
                    background: 'rgba(220,38,38,0.07)',
                    border: '1px solid rgba(220,38,38,0.2)',
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(220,38,38,0.08)',
                  }}>
                    <Icon name="alert" size={14} style={{ color: '#dc2626' }} className="shrink-0 mt-0.5" />
                    <p className="text-xs font-medium leading-snug" style={{ color: '#b91c1c' }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="brut-btn w-full py-4 text-sm flex items-center justify-center gap-2.5"
                >
                  {loading ? (
                    <Spinner size={16} />
                  ) : (
                    <>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                      <Icon name="arrowright" size={15} />
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
