import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import api from './lib/axios'
import Layout from './components/layout/Layout'

import Login from './pages/Login'
import Setup from './pages/Setup'
import Dashboard from './pages/Dashboard'
import Assets from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import People from './pages/People'
import PersonDetail from './pages/PersonDetail'
import Locations from './pages/Locations'
import Models from './pages/Models'
import Search from './pages/Search'
import Reports from './pages/Reports'
import AuditLog from './pages/AuditLog'
import Settings from './pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const location = useLocation()
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
  return <Layout>{children}</Layout>
}

export default function App() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [setupChecked, setSetupChecked] = useState(false)

  useEffect(() => {
    if (location.pathname === '/setup') { setSetupChecked(true); return }
    api.get('/setup/status')
      .then((r) => { if (!r.data.complete) navigate('/setup', { replace: true }) })
      .catch(() => {})
      .finally(() => setSetupChecked(true))
  }, [])

  if (!setupChecked && location.pathname !== '/setup') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--track)', borderTopColor: 'var(--b1)' }}
          />
          <span className="text-ink-3 text-sm">Loading SimpleGear…</span>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/setup" element={<Setup />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/assets" element={<ProtectedRoute><Assets /></ProtectedRoute>} />
      <Route path="/assets/:id" element={<ProtectedRoute><AssetDetail /></ProtectedRoute>} />
      <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
      <Route path="/people/:id" element={<ProtectedRoute><PersonDetail /></ProtectedRoute>} />
      <Route path="/models" element={<ProtectedRoute><Models /></ProtectedRoute>} />
      <Route path="/locations" element={<ProtectedRoute><Locations /></ProtectedRoute>} />
      <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute><AuditLog /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
