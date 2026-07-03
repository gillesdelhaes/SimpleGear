import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/axios'
import type { SearchResults } from '../../types'

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.2" />
      <rect x="10.5" y="1.5" width="6" height="6" rx="1.2" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1.2" />
      <rect x="10.5" y="10.5" width="6" height="6" rx="1.2" />
    </svg>
  )
}

function IconAssets() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L16 6v6L9 16 2 12V6L9 2z" />
      <path d="M9 8v8M2 6l7 4 7-4" />
    </svg>
  )
}

function IconPeople() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="3" />
      <path d="M1.5 15c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" />
      <path d="M13 4a3 3 0 0 1 0 6M16.5 15c0-2-1.12-3.75-2.75-4.65" />
    </svg>
  )
}

function IconLocation() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1.5A5 5 0 0 1 14 6.5c0 3.5-5 10-5 10S4 10 4 6.5a5 5 0 0 1 5-5z" />
      <circle cx="9" cy="6.5" r="1.5" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M12.5 12.5L16 16" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconModels() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="6" height="6" rx="1.2" />
      <rect x="10" y="2" width="6" height="6" rx="1.2" />
      <rect x="2" y="10" width="6" height="6" rx="1.2" />
      <path d="M13 10.5v5M10.5 13h5" />
    </svg>
  )
}

function IconReports() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="14" height="14" rx="2" />
      <path d="M5.5 12V9M9 12V7M12.5 12V5" />
    </svg>
  )
}

function IconAudit() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path d="M6.5 6.5h5M6.5 9.5h5M6.5 12.5h3" />
    </svg>
  )
}

function IconChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11L5 7l4-4" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 3l4 4-4 4" />
    </svg>
  )
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
      <path d="M11 11l3-3-3-3M14 8H6" />
    </svg>
  )
}

// ── Nav items ──────────────────────────────────────────────────────────────────

const NAV_MAIN = [
  { to: '/', label: 'Dashboard', icon: <IconDashboard />, end: true },
  { to: '/assets', label: 'Assets', icon: <IconAssets />, end: false },
  { to: '/models', label: 'Models', icon: <IconModels />, end: false },
  { to: '/people', label: 'People', icon: <IconPeople />, end: false },
  { to: '/search', label: 'Search', icon: <IconSearch />, end: false },
  { to: '/locations', label: 'Locations', icon: <IconLocation />, end: false },
  { to: '/reports', label: 'Reports', icon: <IconReports />, end: false },
]

const NAV_ADMIN = [
  { to: '/audit-log', label: 'Audit Log', icon: <IconAudit />, end: false },
  { to: '/settings', label: 'Settings', icon: <IconSettings />, end: false },
]

// ── Debounce hook ──────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

// ── Top-bar search with real-time dropdown ────────────────────────────────────

function TopBarSearch() {
  const [searchVal, setSearchVal] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedQ = useDebounce(searchVal, 250)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery<SearchResults>({
    queryKey: ['search', debouncedQ],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(debouncedQ)}`).then((r) => r.data),
    enabled: debouncedQ.length >= 2,
    staleTime: 5000,
  })

  const hasResults = data && (data.assets.length > 0 || data.people.length > 0 || data.notes.length > 0)

  useEffect(() => {
    setOpen(debouncedQ.length >= 2 && !!hasResults)
  }, [debouncedQ, hasResults])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function goTo(path: string) {
    setOpen(false)
    setSearchVal('')
    navigate(path)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') { setOpen(false); setSearchVal('') }
    if (e.key === 'Enter' && searchVal.trim().length >= 2) {
      setOpen(false)
      navigate(`/search?q=${encodeURIComponent(searchVal.trim())}`)
      setSearchVal('')
    }
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#A3A3A3', pointerEvents: 'none', display: 'flex' }}>
          <IconSearch />
        </span>
        <input
          ref={inputRef}
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onFocus={() => debouncedQ.length >= 2 && hasResults && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search assets, serials, people…"
          style={{
            height: 34, paddingLeft: 34, paddingRight: 12,
            border: '1px solid #E5E5E5', borderRadius: 8,
            fontSize: 13, background: '#F9F9F9', color: '#0A0A0A',
            outline: 'none', width: 220,
            transition: 'border-color 0.15s, box-shadow 0.15s, width 0.2s',
          }}
          onMouseEnter={(e) => { (e.target as HTMLInputElement).style.width = '260px' }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.target)
              (e.target as HTMLInputElement).style.width = '220px'
          }}
          onFocusCapture={(e) => {
            e.target.style.borderColor = '#84CC16'
            e.target.style.boxShadow = '0 0 0 3px rgba(132,204,22,0.10)'
            e.target.style.width = '260px'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#E5E5E5'
            e.target.style.boxShadow = 'none'
            e.target.style.width = '220px'
          }}
        />
      </div>

      {open && data && (
        <div
          ref={dropRef}
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 340, background: '#fff',
            border: '1px solid #E5E5E5', borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            zIndex: 100, overflow: 'hidden',
          }}
        >
          {data.assets.length > 0 && (
            <div>
              <div style={{ padding: '8px 12px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A3A3A3' }}>Assets</div>
              {data.assets.slice(0, 5).map((a) => (
                <button
                  key={a.id}
                  onClick={() => goTo(`/assets/${a.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#F9F9F9')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.status?.color || '#6B7280', flexShrink: 0, display: 'block' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                    <div style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', color: '#A3A3A3' }}>{a.asset_tag}{a.serial ? ` · ${a.serial}` : ''}</div>
                  </div>
                  {a.assigned_to && <span style={{ fontSize: 10, color: '#A3A3A3', flexShrink: 0 }}>{a.assigned_to.name}</span>}
                </button>
              ))}
            </div>
          )}

          {data.people.length > 0 && (
            <div style={data.assets.length > 0 ? { borderTop: '1px solid #F2F2F2' } : {}}>
              <div style={{ padding: '8px 12px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A3A3A3' }}>People</div>
              {data.people.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => goTo(`/people/${p.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#F9F9F9')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #84CC16, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#0A0A0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: '#A3A3A3' }}>{p.department || p.email || ''}</div>
                  </div>
                  {p.asset_count > 0 && <span style={{ fontSize: 10, color: '#A3A3A3', flexShrink: 0 }}>{p.asset_count} assets</span>}
                </button>
              ))}
            </div>
          )}

          {data.notes.length > 0 && (
            <div style={(data.assets.length > 0 || data.people.length > 0) ? { borderTop: '1px solid #F2F2F2' } : {}}>
              <div style={{ padding: '8px 12px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A3A3A3' }}>Notes</div>
              {data.notes.slice(0, 5).map((n) => (
                <button
                  key={n.assignment_id}
                  onClick={() => goTo(`/assets/${n.asset_id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s' }}
                  onMouseOver={(e) => (e.currentTarget.style.background = '#F9F9F9')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'none')}
                >
                  <svg width="12" height="12" fill="none" stroke="#A3A3A3" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, color: '#0A0A0A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.note}</div>
                    <div style={{ fontSize: 10, color: '#A3A3A3' }}>{n.asset_name} · {n.person_name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid #F2F2F2', padding: '8px 12px' }}>
            <button
              onClick={() => goTo(`/search?q=${encodeURIComponent(searchVal)}`)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#84CC16', padding: 0 }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#15803D')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#84CC16')}
            >
              See all results for "{searchVal}" →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── NavItem ────────────────────────────────────────────────────────────────────

function NavItem({ to, label, icon, end, collapsed }: { to: string; label: string; icon: React.ReactNode; end: boolean; collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: collapsed ? '9px 0' : '9px 16px',
        margin: '1px 8px',
        borderRadius: 7,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? '#84CC16' : 'rgba(242,242,242,0.50)',
        background: isActive ? 'rgba(132,204,22,0.08)' : 'transparent',
        borderLeft: isActive ? '3px solid #84CC16' : '3px solid transparent',
        transition: 'background 0.15s, color 0.15s',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        justifyContent: collapsed ? 'center' : 'flex-start',
      })}
      title={collapsed ? label : undefined}
    >
      {({ isActive }) => (
        <>
          <span style={{ flexShrink: 0, color: isActive ? '#84CC16' : 'rgba(242,242,242,0.35)', display: 'flex' }}>
            {icon}
          </span>
          {!collapsed && <span>{label}</span>}
        </>
      )}
    </NavLink>
  )
}

// ── Page title from route ──────────────────────────────────────────────────────

function usePageTitle() {
  const { pathname } = useLocation()
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/assets') && pathname !== '/assets') return 'Asset Detail'
  if (pathname === '/assets') return 'Assets'
  if (pathname.startsWith('/people') && pathname !== '/people') return 'Person Detail'
  if (pathname === '/people') return 'People'
  if (pathname === '/models') return 'Asset Models'
  if (pathname === '/locations') return 'Locations'
  if (pathname === '/search') return 'Search'
  if (pathname === '/reports') return 'Reports'
  if (pathname === '/audit-log') return 'Audit Log'
  if (pathname === '/settings') return 'Settings'
  return 'SimpleGear'
}

// ── Main Layout (AppShell) ─────────────────────────────────────────────────────

const SIDEBAR_COLLAPSED_KEY = 'sg_sidebar_collapsed'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const title = usePageTitle()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  useEffect(() => { }, [navigate])

  const sidebarWidth = collapsed ? 60 : 220
  const isAdmin = user?.role === 'admin'
  const avatarInitial = user?.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: sidebarWidth,
          minWidth: sidebarWidth,
          background: '#0A0A0A',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          zIndex: 50,
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Top gradient rule */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, #84CC16, #15803D)', flexShrink: 0 }} />

        {/* Dot grid */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Wordmark */}
        <div style={{
          padding: collapsed ? '16px 0' : '18px 20px 16px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          height: 60,
          overflow: 'hidden',
        }}>
          {collapsed ? (
            <div style={{
              width: 28, height: 28, borderRadius: 6, flexShrink: 0,
              background: 'linear-gradient(135deg, #84CC16, #15803D)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 13, letterSpacing: '-0.03em' }}>S</span>
            </div>
          ) : (
            <a href="/" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 16, letterSpacing: '-0.04em', lineHeight: 1 }}>
                <span style={{ fontWeight: 200, color: 'rgba(255,255,255,0.85)' }}>Simple</span>
                <span style={{
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #84CC16, #15803D)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Gear</span>
              </span>
            </a>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 0', overflowY: 'auto', overflowX: 'hidden', position: 'relative', zIndex: 10 }}>
          {NAV_MAIN.map(item => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}

          {isAdmin && (
            <>
              <div style={{ margin: '12px 0 6px', padding: collapsed ? '0 10px' : '0 16px' }}>
                {!collapsed && (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(115,115,115,0.6)' }}>Admin</span>
                )}
                {collapsed && <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />}
              </div>
              {NAV_ADMIN.map(item => (
                <NavItem key={item.to} {...item} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        {/* User section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: collapsed ? '12px 0' : '12px 16px', flexShrink: 0, position: 'relative', zIndex: 10 }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #84CC16, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {avatarInitial}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(242,242,242,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.name ?? user?.email}
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(115,115,115,0.65)' }}>
                  {user?.role}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(115,115,115,0.6)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s', flexShrink: 0 }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#EF4444')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(115,115,115,0.6)')}
              >
                <IconLogout />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #84CC16, #15803D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff' }}>
                {avatarInitial}
              </div>
              <button
                onClick={logout}
                title="Sign out"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(115,115,115,0.5)', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                onMouseOver={(e) => (e.currentTarget.style.color = '#EF4444')}
                onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(115,115,115,0.5)')}
              >
                <IconLogout />
              </button>
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              marginTop: 10, width: '100%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 6, cursor: 'pointer',
              color: 'rgba(115,115,115,0.6)',
              padding: '5px 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(242,242,242,0.8)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(115,115,115,0.6)' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{
        flex: 1,
        marginLeft: sidebarWidth,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#F2F2F2',
        transition: 'margin-left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>

        {/* Top bar */}
        <header style={{
          height: 56,
          background: '#fff',
          borderBottom: '1px solid #E5E5E5',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          gap: 16,
          position: 'sticky',
          top: 0,
          zIndex: 30,
          flexShrink: 0,
        }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#0A0A0A', letterSpacing: '-0.02em', margin: 0, flex: 1 }}>
            {title}
          </h1>
          <TopBarSearch />
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '24px 24px 40px', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}
