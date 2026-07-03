import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'

export default function Setup() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [createExamples, setCreateExamples] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    api.get('/setup/status').then((r) => {
      if (r.data.complete) navigate('/login', { replace: true })
      else setChecking(false)
    }).catch(() => setChecking(false))
  }, [])

  useEffect(() => {
    if (!checking) {
      const t = setTimeout(() => setMounted(true), 40)
      return () => clearTimeout(t)
    }
  }, [checking])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await api.post('/setup', { name, email, password, create_examples: createExamples })
      navigate('/login', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9F9F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid #E5E5E5', borderTopColor: '#84CC16', animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#F9F9F9' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>

      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-[58%] relative flex-col justify-between overflow-hidden"
        style={{ background: '#0A0A0A' }}
      >
        {/* Top gradient rule */}
        <div className="absolute top-0 left-0 right-0 z-10" style={{ height: 2, background: 'linear-gradient(90deg, #84CC16 0%, #15803D 100%)' }} />

        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        {/* Ambient glow — lime */}
        <div className="absolute pointer-events-none" style={{ top: '-180px', left: '-180px', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, #84CC16 0%, transparent 70%)', opacity: 0.06, filter: 'blur(50px)' }} />

        {/* Ambient glow — forest */}
        <div className="absolute pointer-events-none" style={{ bottom: '-120px', right: '-120px', width: '560px', height: '560px', borderRadius: '50%', background: 'radial-gradient(circle, #15803D 0%, transparent 70%)', opacity: 0.08, filter: 'blur(50px)' }} />

        {/* Decorative shapes */}
        <div className="absolute pointer-events-none" style={{ bottom: '80px', right: '-60px', width: '460px', height: '300px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(132,204,22,0.07) 0%, rgba(21,128,61,0.05) 100%)', border: '1px solid rgba(132,204,22,0.10)', transform: 'rotate(-12deg)' }} />
        <div className="absolute pointer-events-none" style={{ bottom: '140px', right: '20px', width: '300px', height: '200px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(132,204,22,0.04) 0%, rgba(21,128,61,0.04) 100%)', border: '1px solid rgba(21,128,61,0.09)', transform: 'rotate(-6deg)' }} />

        {/* Notch dots */}
        <div className="absolute pointer-events-none flex flex-col gap-[9px]" style={{ bottom: '198px', right: '269px' }}>
          {['rgba(132,204,22,0.25)', 'rgba(132,204,22,0.18)', 'rgba(21,128,61,0.20)', 'rgba(132,204,22,0.12)', 'rgba(21,128,61,0.15)'].map((c, i) => (
            <span key={i} style={{ display: 'block', width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
        </div>

        {/* Main content */}
        <div
          className="relative z-10 flex flex-col justify-center flex-1 px-16 py-20"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Init badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            height: 26, padding: '0 12px', borderRadius: 99,
            background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.18)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 10, fontWeight: 500,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(132,204,22,0.80)',
            marginBottom: 28, width: 'fit-content',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#84CC16', animation: 'statusPulse 2s ease-in-out infinite', display: 'block' }} />
            System Initialization
          </div>

          {/* Wordmark */}
          <div className="mb-12">
            <h1 className="leading-none select-none" style={{ fontSize: 'clamp(48px, 5.5vw, 80px)', letterSpacing: '-0.04em' }}>
              <span style={{ fontWeight: 200, color: 'rgba(255,255,255,0.90)' }}>Simple</span>
              <span style={{ fontWeight: 800, background: 'linear-gradient(135deg, #84CC16 0%, #15803D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Gear</span>
            </h1>
            <p style={{ marginTop: 18, color: 'rgba(115,115,115,0.60)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              One-time setup · takes under 60 seconds
            </p>
          </div>

          {/* Numbered steps */}
          <div className="flex flex-col gap-[18px]">
            {[
              { n: '01', label: 'Create your admin account' },
              { n: '02', label: 'Optionally load sample IT assets' },
              { n: '03', label: 'Start tracking gear immediately' },
              { n: '✓',  label: 'No config files or env vars needed', small: true },
            ].map(({ n, label, small }) => (
              <div key={n} className="flex items-center gap-4">
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132,204,22,0.15)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: small ? 11 : 13, fontWeight: 500,
                  color: 'rgba(132,204,22,0.75)',
                }}>{n}</div>
                <span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(242,242,242,0.50)', letterSpacing: '0.01em' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom label */}
        <div className="relative z-10 px-16 pb-8">
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'rgba(115,115,115,0.35)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Part of the Simple* Galaxy
          </span>
        </div>
      </div>

      {/* Right form panel */}
      <div
        className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 overflow-y-auto"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateX(0)' : 'translateX(16px)',
          transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
        }}
      >
        {/* Mobile wordmark */}
        <div className="lg:hidden mb-10 text-center">
          <h1 className="leading-none select-none" style={{ fontSize: '40px', letterSpacing: '-0.04em' }}>
            <span style={{ fontWeight: 200, color: '#0A0A0A' }}>Simple</span>
            <span style={{ fontWeight: 800, background: 'linear-gradient(135deg, #84CC16 0%, #15803D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Gear</span>
          </h1>
        </div>

        <div className="w-full max-w-[400px] mx-auto py-12 lg:py-0">
          <div className="mb-8">
            <h2 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.025em', color: '#0A0A0A', marginBottom: 6 }}>
              Create admin account
            </h2>
            <p style={{ fontSize: '14px', color: '#737373', lineHeight: 1.5 }}>
              This is a one-time setup. Your credentials will be used to sign in to SimpleGear.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 500, color: '#262626', letterSpacing: '0.01em' }}>Your name</label>
              <input
                type="text" required autoFocus autoComplete="name"
                value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 transition-all duration-150"
                style={{ height: 46, fontSize: 14, color: '#0A0A0A', outline: 'none' }}
                onFocus={(e) => { e.target.style.borderColor = '#84CC16'; e.target.style.boxShadow = '0 0 0 3px rgba(132,204,22,0.10)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E5E5'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 500, color: '#262626', letterSpacing: '0.01em' }}>Email address</label>
              <input
                type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourcompany.com"
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 transition-all duration-150"
                style={{ height: 46, fontSize: 14, color: '#0A0A0A', outline: 'none' }}
                onFocus={(e) => { e.target.style.borderColor = '#84CC16'; e.target.style.boxShadow = '0 0 0 3px rgba(132,204,22,0.10)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E5E5'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 500, color: '#262626', letterSpacing: '0.01em' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-xl border border-[#E5E5E5] bg-white transition-all duration-150"
                  style={{ height: 46, fontSize: 14, color: '#0A0A0A', outline: 'none', padding: '0 44px 0 16px' }}
                  onFocus={(e) => { e.target.style.borderColor = '#84CC16'; e.target.style.boxShadow = '0 0 0 3px rgba(132,204,22,0.10)' }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E5E5'; e.target.style.boxShadow = 'none' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A3A3A3', padding: 0, display: 'flex', alignItems: 'center' }}>
                  {showPw ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: 13, fontWeight: 500, color: '#262626', letterSpacing: '0.01em' }}>Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 transition-all duration-150"
                style={{ height: 46, fontSize: 14, color: '#0A0A0A', outline: 'none' }}
                onFocus={(e) => { e.target.style.borderColor = '#84CC16'; e.target.style.boxShadow = '0 0 0 3px rgba(132,204,22,0.10)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E5E5'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            {/* Sample assets card */}
            <div
              onClick={() => setCreateExamples(v => !v)}
              style={{
                borderRadius: 12, border: `1px solid ${createExamples ? 'rgba(132,204,22,0.30)' : '#E5E5E5'}`,
                padding: '14px 16px', background: createExamples ? 'rgba(132,204,22,0.03)' : '#FAFAFA',
                cursor: 'pointer', transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox" checked={createExamples}
                  onChange={(e) => { e.stopPropagation(); setCreateExamples(e.target.checked) }}
                  style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, accentColor: '#84CC16', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#262626', marginBottom: 3 }}>Create sample assets</div>
                  <div style={{ fontSize: 12, color: '#737373', lineHeight: 1.5 }}>
                    Add example IT assets (MacBook, ThinkPad, iPhone, Monitor) with models so you can explore SimpleGear right away.
                  </div>
                </div>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div style={{ padding: '12px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 10, fontSize: 13, color: '#DC2626', lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full rounded-xl text-white font-semibold active:scale-[0.99] transition-all duration-150"
              style={{
                height: 48, fontSize: 14, letterSpacing: '0.01em',
                background: loading
                  ? 'linear-gradient(135deg, rgba(132,204,22,0.6) 0%, rgba(21,128,61,0.6) 100%)'
                  : 'linear-gradient(135deg, #84CC16 0%, #15803D 100%)',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(132,204,22,0.25)',
                cursor: loading ? 'not-allowed' : 'pointer',
                border: 'none',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg style={{ animation: 'spin 0.7s linear infinite' }} width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Initializing…
                </span>
              ) : 'Initialize System'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
