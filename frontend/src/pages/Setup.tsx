import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/axios'
import { useAuth } from '../contexts/AuthContext'

export default function Setup() {
  const navigate = useNavigate()
  const { setToken } = useAuth()
  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/setup/status').then((r) => {
      if (r.data.completed) navigate('/login', { replace: true })
      else setChecking(false)
    }).catch(() => setChecking(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/setup', { name, email, password })
      setToken(data.access_token)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Setup failed')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-sg-lime/30 border-t-sg-lime rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center p-6">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 w-full max-w-[440px]">
        <div className="text-center mb-10">
          <div className="mb-4" style={{ letterSpacing: '-0.04em', fontSize: '32px', lineHeight: 1 }}>
            <span style={{ fontWeight: 200, color: 'rgba(255,255,255,0.85)' }}>Simple</span>
            <span className="gradient-text" style={{ fontWeight: 800 }}>Gear</span>
          </div>
          <h1 className="text-xl font-bold text-white mb-1">First-time setup</h1>
          <p className="text-white/40 text-sm">Create your admin account to get started</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-sg-lime/50 focus:ring-2 focus:ring-sg-lime/10 transition-all placeholder-white/20"
                placeholder="Jane Smith"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-sg-lime/50 focus:ring-2 focus:ring-sg-lime/10 transition-all placeholder-white/20"
                placeholder="admin@yourcompany.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-white/60 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-sg-lime/50 focus:ring-2 focus:ring-sg-lime/10 transition-all placeholder-white/20"
                placeholder="Min. 8 characters"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-bg text-white font-semibold py-2.5 rounded-xl text-sm transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
            >
              {loading ? 'Setting up...' : 'Create admin account'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Default statuses and categories will be created automatically.
        </p>
      </div>
    </div>
  )
}
