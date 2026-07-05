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

  useEffect(() => {
    api.get('/setup/status').then((r) => {
      if (r.data.complete) navigate('/login', { replace: true })
      else setChecking(false)
    }).catch(() => setChecking(false))
  }, [])

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--track)', borderTopColor: 'var(--b1)' }} />
      </div>
    )
  }

  return (
    <div className="split">
      <section className="brand-side">
        <div className="wordmark-xl">
          <span className="lite">Simple</span>
          <span className="brand">Gear</span>
        </div>
        <p className="tag">
          One-time setup, under a minute. Create the admin account, optionally load
          sample assets, start tracking gear.
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
              <path d="M3 9l4 4 8-8" />
            </svg>
          </span>
          <span><b>No config files</b><br />no env vars needed</span>
        </div>
      </section>

      <section className="form-side">
        <form className="login-card" onSubmit={handleSubmit}>
          <h1>Create admin account</h1>
          <p className="sub">One-time setup — these credentials sign in to SimpleGear.</p>

          <div className="fieldrow">
            <label htmlFor="su-name">Your name</label>
            <input
              className="input" id="su-name" type="text" required autoFocus autoComplete="name"
              value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith"
            />
          </div>

          <div className="fieldrow">
            <label htmlFor="su-email">Email</label>
            <input
              className="input" id="su-email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@yourcompany.com"
            />
          </div>

          <div className="fieldrow">
            <label htmlFor="su-pw">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                className="input" id="su-pw" type={showPw ? 'text' : 'password'} required autoComplete="new-password"
                value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters"
                style={{ paddingRight: 42 }}
              />
              <button
                type="button" onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="text-ink-3 hover:text-ink"
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
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

          <div className="fieldrow">
            <label htmlFor="su-confirm">Confirm password</label>
            <input
              className="input" id="su-confirm" type={showPw ? 'text' : 'password'} required autoComplete="new-password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password"
            />
          </div>

          <label
            className="so-block"
            style={{ display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer', marginBottom: 16 }}
          >
            <input
              type="checkbox" checked={createExamples}
              onChange={(e) => setCreateExamples(e.target.checked)}
              style={{ width: 15, height: 15, marginTop: 2, flexShrink: 0, accentColor: 'var(--b1)', cursor: 'pointer' }}
            />
            <span>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 2 }}>Create sample assets</span>
              <span className="text-ink-3" style={{ fontSize: 12, lineHeight: 1.5 }}>
                Example assets (MacBook, ThinkPad, iPhone, monitor) so you can explore right away.
              </span>
            </span>
          </label>

          {error && (
            <div
              role="alert"
              style={{
                padding: '11px 14px', marginBottom: 16, borderRadius: 12,
                background: 'var(--danger-bg)', color: 'var(--danger-ink)',
                fontSize: 13, lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <button className="btn" type="submit" disabled={loading} style={loading ? { opacity: 0.7, cursor: 'wait' } : undefined}>
            {loading ? (
              <>
                <svg className="animate-spin" width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
                  <path d="M8 2a6 6 0 0 1 6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Setting up…
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>
      </section>
    </div>
  )
}
