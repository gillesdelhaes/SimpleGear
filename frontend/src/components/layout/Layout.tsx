import { useState, useEffect, useRef } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../hooks/useTheme'
import api from '../../lib/axios'
import type { SearchResults } from '../../types'

// ── Icons ──────────────────────────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="1.5" width="6" height="6" rx="1.5" />
      <rect x="10.5" y="1.5" width="6" height="6" rx="1.5" />
      <rect x="1.5" y="10.5" width="6" height="6" rx="1.5" />
      <rect x="10.5" y="10.5" width="6" height="6" rx="1.5" />
    </svg>
  )
}

function IconAssets() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 2L16 6v6L9 16 2 12V6L9 2z" />
      <path d="M9 8v8M2 6l7 4 7-4" />
    </svg>
  )
}

function IconPeople() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7" cy="6" r="3" />
      <path d="M1.5 15c0-3.038 2.462-5.5 5.5-5.5s5.5 2.462 5.5 5.5" />
      <path d="M13 4a3 3 0 0 1 0 6M16.5 15c0-2-1.12-3.75-2.75-4.65" />
    </svg>
  )
}

function IconLocation() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1.5A5 5 0 0 1 14 6.5c0 3.5-5 10-5 10S4 10 4 6.5a5 5 0 0 1 5-5z" />
      <circle cx="9" cy="6.5" r="1.5" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M12.5 12.5L16 16" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconModels() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="6" height="6" rx="1.5" />
      <rect x="10" y="2" width="6" height="6" rx="1.5" />
      <rect x="2" y="10" width="6" height="6" rx="1.5" />
      <path d="M13 10.5v5M10.5 13h5" />
    </svg>
  )
}

function IconReports() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 15V9M7.5 15V3M13 15v-4" />
    </svg>
  )
}

function IconAudit() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3h12M3 7.5h12M3 12h7" />
      <circle cx="14" cy="13.5" r="2.5" />
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
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
      <path d="M11 11l3-3-3-3M14 8H6" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
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
  { to: '/audit-log', label: 'Audit log', icon: <IconAudit />, end: false },
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

  const sectionLabel = 'px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3'
  const rowBase = 'flex items-center gap-2.5 w-full px-3 py-2 text-left bg-transparent border-0 cursor-pointer hover:bg-row-hover'

  return (
    <div className="search" style={{ position: 'relative', overflow: 'visible' }}>
      <IconSearch />
      <input
        ref={inputRef}
        value={searchVal}
        onChange={(e) => setSearchVal(e.target.value)}
        onFocus={() => debouncedQ.length >= 2 && hasResults && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search assets, serials, people…"
        style={{
          flex: 1, minWidth: 0, background: 'transparent', border: 'none',
          outline: 'none', font: 'inherit', color: 'var(--ink)',
        }}
      />

      {open && data && (
        <div
          ref={dropRef}
          className="overlay-surface"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            width: 340, zIndex: 100, overflow: 'hidden', borderRadius: 16, padding: '4px 0',
          }}
        >
          {data.assets.length > 0 && (
            <div>
              <div className={sectionLabel}>Assets</div>
              {data.assets.slice(0, 5).map((a) => (
                <button key={a.id} onClick={() => goTo(`/assets/${a.id}`)} className={rowBase}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: a.status?.color || 'var(--ink-3)', flexShrink: 0, display: 'block' }} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-medium text-ink truncate">{a.name}</span>
                    <span className="block font-mono text-[10px] text-ink-3">{a.asset_tag}{a.serial ? ` · ${a.serial}` : ''}</span>
                  </span>
                  {a.assigned_to && <span className="text-[10.5px] text-ink-3 flex-shrink-0">{a.assigned_to.name}</span>}
                </button>
              ))}
            </div>
          )}

          {data.people.length > 0 && (
            <div className={data.assets.length > 0 ? 'border-t border-track' : ''}>
              <div className={sectionLabel}>People</div>
              {data.people.slice(0, 5).map((p) => (
                <button key={p.id} onClick={() => goTo(`/people/${p.id}`)} className={rowBase}>
                  <span className="avatar" style={{ width: 24, height: 24, borderRadius: 8, fontSize: 9.5 }}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] font-medium text-ink truncate">{p.name}</span>
                    <span className="block text-[10.5px] text-ink-3">{p.department || p.email || ''}</span>
                  </span>
                  {p.asset_count > 0 && <span className="text-[10.5px] text-ink-3 flex-shrink-0">{p.asset_count} assets</span>}
                </button>
              ))}
            </div>
          )}

          {data.notes.length > 0 && (
            <div className={(data.assets.length > 0 || data.people.length > 0) ? 'border-t border-track' : ''}>
              <div className={sectionLabel}>Notes</div>
              {data.notes.slice(0, 5).map((n) => (
                <button key={n.assignment_id} onClick={() => goTo(`/assets/${n.asset_id}`)} className={rowBase}>
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-ink-3 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[12.5px] text-ink truncate">{n.note}</span>
                    <span className="block text-[10.5px] text-ink-3">{n.asset_name} · {n.person_name}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-track px-3 py-2">
            <button
              onClick={() => goTo(`/search?q=${encodeURIComponent(searchVal)}`)}
              className="bg-transparent border-0 cursor-pointer p-0 text-[11.5px] font-semibold text-brand-ink"
            >
              See all results for "{searchVal}" →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page title from route ──────────────────────────────────────────────────────

function usePageTitle() {
  const { pathname } = useLocation()
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/assets') && pathname !== '/assets') return 'Asset detail'
  if (pathname === '/assets') return 'Assets'
  if (pathname.startsWith('/people') && pathname !== '/people') return 'Person detail'
  if (pathname === '/people') return 'People'
  if (pathname === '/models') return 'Models'
  if (pathname === '/locations') return 'Locations'
  if (pathname === '/search') return 'Search'
  if (pathname === '/reports') return 'Reports'
  if (pathname === '/audit-log') return 'Audit log'
  if (pathname === '/settings') return 'Settings'
  return 'SimpleGear'
}

// ── Main Layout (AppShell) ─────────────────────────────────────────────────────

const SIDEBAR_COLLAPSED_KEY = 'sg_sidebar_collapsed'

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const title = usePageTitle()
  const { theme, toggleTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true')

  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed))
  }, [collapsed])

  const isAdmin = user?.role === 'admin'
  const avatarInitial = user?.name?.charAt(0).toUpperCase() ?? '?'

  return (
    <>
      <div className="aura" aria-hidden="true" />
      <div className="shell">
        <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
          <div className="wordmark">
            <span className="lite">Simple</span>
            <span className="brand">Gear</span>
          </div>

          <nav aria-label="Main">
            {NAV_MAIN.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}

            {isAdmin && (
              <>
                <div className="nav-sep">Admin</div>
                {NAV_ADMIN.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    title={collapsed ? item.label : undefined}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          <div className="side-foot">
            <div className="avatar">{avatarInitial}</div>
            <div className="who">
              <b>{user?.name ?? user?.email}</b>
              <span>{user?.role}</span>
            </div>
            <button
              onClick={logout}
              aria-label="Sign out"
              className="text-ink-3 hover:text-danger-ink"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0 }}
            >
              <IconLogout />
            </button>
          </div>

          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="collapse-toggle"
          >
            {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
          </button>
        </aside>

        <main>
          <header className="topbar">
            <div>
              <h1>{title}</h1>
            </div>
            <TopBarSearch />
            <button
              className="icon-btn"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
          </header>
          {children}
        </main>
      </div>
    </>
  )
}
