import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'

export default function Setup() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
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
    setLoading(true)
    try {
      await api.post('/setup', { name, email, password })
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
    <div className="min-h-screen flex overflow-hidden bg-[#F9F9F9]">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-[58%] relative flex-col justify-between overflow-hidden"
        style={{ background: '#0A0A0A' }}
      >
        {/* Top gradient rule */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] z-10"
          style={{ background: 'linear-gradient(90deg, #84CC16 0%, #15803D 100%)' }}
        />

        {/* Dot-grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Ambient glow — primary */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-180px', left: '-180px',
            width: '600px', height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #84CC16 0%, transparent 70%)',
            opacity: 0.06,
            filter: 'blur(50px)',
          }}
        />

        {/* Ambient glow — secondary */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '-120px', right: '-120px',
            width: '560px', height: '560px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, #15803D 0%, transparent 70%)',
            opacity: 0.08,
            filter: 'blur(50px)',
          }}
        />

        {/* Decorative gear silhouette */}
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '80px', right: '-60px',
            width: '480px', height: '480px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(132,204,22,0.05) 0%, rgba(21,128,61,0.04) 100%)',
            border: '1px solid rgba(132,204,22,0.08)',
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: '140px', right: '40px',
            width: '280px', height: '280px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(132,204,22,0.04) 0%, rgba(21,128,61,0.03) 100%)',
            border: '1px solid rgba(21,128,61,0.08)',
          }}
        />

        {/* Main content */}
        <div
          className="relative z-10 flex flex-col justify-center flex-1 px-16 py-20"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(20px)',
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Wordmark */}
          <div className="mb-16">
            <h1
              className="leading-none select-none"
              style={{ fontSize: 'clamp(48px, 5.5vw, 80px)', letterSpacing: '-0.04em' }}
            >
              <span style={{ fontWeight: 200, color: 'rgba(255,255,255,0.90)' }}>Simple</span>
              <span
                style={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #84CC16 0%, #15803D 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                Gear
              </span>
            </h1>
            <p
              className="mt-5"
              style={{
                color: 'rgba(115,115,115,0.60)',
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
              }}
            >
              IT asset management — simple, fast, yours
            </p>
          </div>

          {/* Feature callouts */}
          <div className="flex flex-col gap-5">
            {[
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2"/>
                    <line x1="8" y1="21" x2="16" y2="21"/>
                    <line x1="12" y1="17" x2="12" y2="21"/>
                  </svg>
                ),
                label: 'Full asset lifecycle — purchase to EOL',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                ),
                label: 'Instant search across serials, notes, people',
              },
              {
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
                label: 'Track who has what, with history and notes',
              },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0"
                  style={{
                    background: 'rgba(132,204,22,0.08)',
                    border: '1px solid rgba(132,204,22,0.15)',
                    color: 'rgba(132,204,22,0.7)',
                  }}
                >
                  {icon}
                </div>
                <span style={{ color: 'rgba(242,242,242,0.55)', fontSize: '14px', fontWeight: 400, letterSpacing: '0.01em' }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom version label */}
        <div className="relative z-10 px-16 pb-8">
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '10px', color: 'rgba(115,115,115,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            first-time setup
          </span>
        </div>
      </div>

      {/* Right form panel */}
      <div
        className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20"
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
            <span style={{ fontWeight: 800, background: 'linear-gradient(135deg, #84CC16 0%, #15803D 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              Gear
            </span>
          </h1>
        </div>

        <div className="w-full max-w-[400px] mx-auto">
          <div className="mb-8">
            <h2 className="text-[#0A0A0A] mb-1.5" style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.025em' }}>
              Create your admin account
            </h2>
            <p style={{ fontSize: '14px', color: '#737373', fontWeight: 400 }}>
              This takes 30 seconds — you'll be in the dashboard right after.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="name" style={{ fontSize: '13px', fontWeight: 500, color: '#262626', letterSpacing: '0.01em' }}>
                Your name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 transition-all duration-150"
                style={{ height: '46px', fontSize: '14px', color: '#0A0A0A', outline: 'none' }}
                onFocus={(e) => { e.target.style.borderColor = '#84CC16'; e.target.style.boxShadow = '0 0 0 3px rgba(132,204,22,0.10)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E5E5'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 500, color: '#262626', letterSpacing: '0.01em' }}>
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@yourcompany.com"
                className="w-full rounded-xl border border-[#E5E5E5] bg-white px-4 transition-all duration-150"
                style={{ height: '46px', fontSize: '14px', color: '#0A0A0A', outline: 'none' }}
                onFocus={(e) => { e.target.style.borderColor = '#84CC16'; e.target.style.boxShadow = '0 0 0 3px rgba(132,204,22,0.10)' }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E5E5'; e.target.style.boxShadow = 'none' }}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 500, color: '#262626', letterSpacing: '0.01em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full rounded-xl border border-[#E5E5E5] bg-white transition-all duration-150"
                  style={{ height: '46px', fontSize: '14px', color: '#0A0A0A', outline: 'none', padding: '0 44px 0 16px' }}
                  onFocus={(e) => { e.target.style.borderColor = '#84CC16'; e.target.style.boxShadow = '0 0 0 3px rgba(132,204,22,0.10)' }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E5E5'; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#A3A3A3', padding: 0, display: 'flex', alignItems: 'center' }}
                >
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

            {error && (
              <div
                className="rounded-xl px-4 py-3"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '13px', color: '#DC2626', lineHeight: 1.5 }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl text-white font-semibold transition-all duration-150 active:scale-[0.99]"
              style={{
                height: '48px',
                fontSize: '14px',
                letterSpacing: '0.01em',
                background: loading
                  ? 'linear-gradient(135deg, rgba(132,204,22,0.6) 0%, rgba(21,128,61,0.6) 100%)'
                  : 'linear-gradient(135deg, #84CC16 0%, #15803D 100%)',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(132,204,22,0.25)',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                    <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Setting up…
                </span>
              ) : (
                'Create admin account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center" style={{ fontSize: '12px', color: '#A3A3A3' }}>
            Default statuses and categories will be created automatically
          </p>
        </div>
      </div>
    </div>
  )
}
