import { useState, FormEvent } from 'react';
import { Ship, ArrowRight, AlertTriangle, Loader } from 'lucide-react';
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
    <div className="h-screen flex overflow-hidden bg-brut-black">
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 border-r-3 border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brut-red border-2 border-white/20 flex items-center justify-center">
            <Ship size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-black text-xl uppercase tracking-tight">Smart Container</span>
        </div>

        <div>
          <div className="mb-8">
            <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-white/30 mb-4">Built for logistics</p>
            <h2 className="text-white font-black text-5xl uppercase leading-none tracking-tighter mb-6">
              Pack smarter.<br />
              <span className="text-brut-red">Ship more.</span>
            </h2>
            <p className="text-white/40 font-mono text-sm leading-relaxed max-w-sm">
              Calculate exact carton quantities, weight utilization, and optimal pallet configurations for any shipping container.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Container Types', value: '12+' },
              { label: 'Orientations Tested', value: '6' },
              { label: 'Units in Seconds', value: '<1s' },
              { label: 'Pallet Standards', value: 'EUR / US' },
            ].map(({ label, value }) => (
              <div key={label} className="border-2 border-white/10 p-4 bg-white/[0.03]">
                <div className="text-3xl font-black text-white leading-none mb-1">{value}</div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-white/30 font-bold">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="font-mono text-[10px] uppercase tracking-widest text-white/15 font-bold">
          by Eric Tavares
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center bg-brut-bg p-8">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-brut-red border-2 border-brut-black flex items-center justify-center">
              <Ship size={16} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="font-black text-xl uppercase tracking-tight text-brut-black">Smart Container</span>
          </div>

          <div className="flex mb-8 border-3 border-brut-black overflow-hidden" style={{ boxShadow: '4px 4px 0px #0d0d0d' }}>
            {(['signin', 'signup'] as Mode[]).map((m, i) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider transition-colors ${
                  i > 0 ? 'border-l-3 border-brut-black' : ''
                } ${mode === m ? 'bg-brut-black text-white' : 'bg-white text-brut-black hover:bg-brut-paper'}`}
              >
                {m === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {success ? (
            <div className="border-3 border-brut-green p-6 bg-white" style={{ boxShadow: '4px 4px 0px #0e5590' }}>
              <div className="w-10 h-10 bg-brut-green flex items-center justify-center mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20,6 9,17 4,12" />
                </svg>
              </div>
              <p className="font-black text-sm uppercase tracking-tight text-brut-black mb-2">Account Created</p>
              <p className="font-mono text-xs text-brut-black/50 font-bold">
                Check your email to confirm your account, then sign in below.
              </p>
              <button
                onClick={() => switchMode('signin')}
                className="mt-4 brut-btn px-5 py-3 text-xs w-full"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="mb-2">
                <h3 className="text-2xl font-black uppercase tracking-tight text-brut-black leading-none">
                  {mode === 'signin' ? 'Welcome back' : 'New account'}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-widest text-brut-black/40 font-bold mt-1.5">
                  {mode === 'signin' ? 'Sign in to continue' : 'Create your account to get started'}
                </p>
              </div>

              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/50">Full Name</label>
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
                <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/50">Email</label>
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
                <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-brut-black/50">Password</label>
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
                <div className="flex items-start gap-2.5 border-2 border-brut-red p-3 bg-white" style={{ boxShadow: '3px 3px 0px #c63320' }}>
                  <AlertTriangle size={14} className="text-brut-red shrink-0 mt-0.5" />
                  <p className="font-mono text-xs font-bold text-brut-red leading-snug">{error}</p>
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
  );
}
