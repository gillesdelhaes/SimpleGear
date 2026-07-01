import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/shared/Toast'
import api from '../lib/axios'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-[480px] flex-shrink-0 gradient-bg flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative z-10">
          <div style={{ letterSpacing: '-0.04em', fontSize: '28px', lineHeight: 1 }}>
            <span style={{ fontWeight: 200, color: 'rgba(255,255,255,0.9)' }}>Simple</span>
            <span style={{ fontWeight: 800, color: '#fff' }}>Gear</span>
          </div>
          <p className="mt-3 text-white/60 text-sm">IT Asset Management</p>
        </div>
        <div className="relative z-10 space-y-6">
          {[
            { icon: '📦', text: 'Full asset lifecycle — purchase to EOL' },
            { icon: '🔍', text: 'Instant search across serials, notes, people' },
            { icon: '👤', text: 'Track who has what, with history and notes' },
            { icon: '📋', text: 'Import from Snipe-IT with one CSV' },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-white/75 text-sm">{item.text}</span>
            </div>
          ))}
        </div>
        <div className="relative z-10 text-white/30 text-xs">
          Part of the Simple* Galaxy
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-[#F2F2F2] p-8">
        <div className="w-full max-w-[380px]">
          <div className="lg:hidden mb-8" style={{ letterSpacing: '-0.04em', fontSize: '24px', lineHeight: 1 }}>
            <span style={{ fontWeight: 200 }}>Simple</span>
            <span className="gradient-text" style={{ fontWeight: 800 }}>Gear</span>
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-1">Sign in</h1>
          <p className="text-sm text-neutral-500 mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 bg-white outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10 transition-all"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm text-neutral-900 bg-white outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10 transition-all"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full gradient-bg text-white font-semibold py-2.5 rounded-xl text-sm transition-opacity hover:opacity-90 disabled:opacity-60 mt-2"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
