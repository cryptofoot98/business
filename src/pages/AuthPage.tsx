import { useState, FormEvent } from 'react';
import { Ship, ArrowRight, AlertTriangle, Loader, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type Mode = 'signin' | 'signup';

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
    <div
      className="min-h-screen flex overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #060E1A 0%, #0A1628 55%, #122040 100%)' }}
    >
      {/* Left branding panel */}
      <div
        className="hidden lg:flex w-[45%] flex-col justify-between p-12"
        style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(61,178,64,0.15)', border: '1px solid rgba(61,178,64,0.30)' }}
          >
            <Ship size={18} style={{ color: '#3DB240' }} strokeWidth={2} />
          </div>
          <span className="text-white font-bold text-lg">iO Smart Container</span>
        </div>

        <div>
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest mb-6"
            style={{ background: 'rgba(61,178,64,0.10)', border: '1px solid rgba(61,178,64,0.22)', color: '#5DC258' }}
          >
            Built for logistics
          </div>
          <h2 className="text-white font-bold text-5xl leading-tight tracking-tight mb-6">
            Pack smarter.<br />
            <span style={{ color: '#3DB240' }}>Ship more.</span>
          </h2>
          <p className="text-white/45 text-sm leading-relaxed max-w-sm mb-10">
            Calculate exact carton quantities, weight utilization, and optimal pallet configurations for any shipping container.
          </p>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Container Types', value: '22+' },
              { label: 'Orientations', value: '6' },
              { label: 'Response Time', value: '<1s' },
              { label: 'Pallet Standards', value: 'EUR / US' },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="p-4 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="text-3xl font-bold text-white leading-none mb-1">{value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-white/35">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/20 uppercase tracking-widest font-semibold">by Eric Tavares</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(61,178,64,0.15)', border: '1px solid rgba(61,178,64,0.30)' }}
            >
              <Ship size={16} style={{ color: '#3DB240' }} strokeWidth={2} />
            </div>
            <span className="font-bold text-lg text-white">iO Smart Container</span>
          </div>

          {/* Glass card */}
          <div
            className="p-8 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.30)',
            }}
          >
            {/* Mode toggle */}
            <div
              className="flex p-1 rounded-xl mb-8"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {(['signin', 'signup'] as Mode[]).map(m => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
                    mode === m ? 'text-white' : 'text-white/40 hover:text-white/65'
                  }`}
                  style={mode === m ? { background: 'rgba(255,255,255,0.12)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' } : {}}
                >
                  {m === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>

            {success ? (
              <div className="text-center py-6">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: 'rgba(61,178,64,0.15)', border: '1px solid rgba(61,178,64,0.30)' }}
                >
                  <CheckCircle size={22} style={{ color: '#3DB240' }} />
                </div>
                <p className="font-semibold text-base text-white mb-2">Account Created</p>
                <p className="text-sm text-white/50 mb-6">
                  Check your email to confirm your account, then sign in.
                </p>
                <button
                  onClick={() => switchMode('signin')}
                  className="brut-btn w-full py-3 text-sm"
                  style={{ background: '#3DB240', border: '1px solid #3DB240' }}
                >
                  Go to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="mb-2">
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {mode === 'signin' ? 'Welcome back' : 'Get started'}
                  </h3>
                  <p className="text-sm text-white/45">
                    {mode === 'signin' ? 'Sign in to your account to continue' : 'Create your free account today'}
                  </p>
                </div>

                {mode === 'signup' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-white/45">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Your name"
                      autoComplete="name"
                      required
                      className="w-full px-4 py-3 text-sm rounded-lg transition-all outline-none"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.14)',
                        color: 'rgba(255,255,255,0.90)',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = '#3DB240'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(61,178,64,0.20)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-white/45">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    className="w-full px-4 py-3 text-sm rounded-lg transition-all outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: 'rgba(255,255,255,0.90)',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#3DB240'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(61,178,64,0.20)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-white/45">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 text-sm rounded-lg transition-all outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255,255,255,0.14)',
                      color: 'rgba(255,255,255,0.90)',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#3DB240'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(61,178,64,0.20)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {error && (
                  <div
                    className="flex items-start gap-3 p-3.5 rounded-xl"
                    style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}
                  >
                    <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300 leading-snug">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all disabled:opacity-50"
                  style={{ background: '#3DB240', color: 'white', boxShadow: '0 6px 24px rgba(61,178,64,0.35)' }}
                  onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#2D9632'; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#3DB240'; }}
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
