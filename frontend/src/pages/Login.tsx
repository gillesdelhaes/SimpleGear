import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/shared/Toast'
import api from '../lib/axios'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      login(data.access_token)
      navigate(from, { replace: true })
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Invalid credentials', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="split">
      <section className="brand-side">
        <div className="wordmark-xl">
          <span className="lite">Simple</span>
          <span className="brand">Gear</span>
        </div>
        <p className="tag">
          Know what you own, who has it, and when it expires. IT asset management
          without the enterprise weight.
        </p>
        <div className="family">
          <span className="dots">
            <i style={{ '--c1': '#84CC16', '--c2': '#15803D' } as React.CSSProperties} />
            <i style={{ '--c1': '#FF4713', '--c2': '#AD1164' } as React.CSSProperties} />
            <i style={{ '--c1': '#00C896', '--c2': '#3B82F6' } as React.CSSProperties} />
          </span>
          Part of the Simple* galaxy
        </div>

        <div className="shard s1">
          <span className="ico">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2L16 6v6L9 16 2 12V6L9 2z" />
            </svg>
          </span>
          <span><b>Every asset</b><br />purchase to end-of-life</span>
        </div>
        <div className="shard s2">
          <span className="ico">
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="8" cy="8" r="5.5" />
              <path d="M12.5 12.5L16 16" />
            </svg>
          </span>
          <span><b>Instant search</b><br />serials, people, notes</span>
        </div>
      </section>

      <section className="form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <h1>Welcome back</h1>
          <p className="sub">Sign in to your SimpleGear workspace.</p>

          <div className="fieldrow">
            <label htmlFor="email">Email</label>
            <input
              className="input"
              id="email"
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div className="fieldrow">
            <label htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="text-ink-3 hover:text-ink"
                style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPw ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button className="btn" type="submit" disabled={loading} style={loading ? { opacity: 0.7, cursor: 'wait' } : undefined}>
            {loading ? (
              <>
                <svg className="animate-spin" width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                  <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </section>
    </div>
  )
}
