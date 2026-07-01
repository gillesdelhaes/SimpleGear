import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/axios'
import type { SearchResults } from '../../types'

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 250)
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data } = useQuery<SearchResults>({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(debouncedQuery)}`).then((r) => r.data),
    enabled: debouncedQuery.length >= 2,
    staleTime: 5000,
  })

  const hasResults = data && (data.assets.length > 0 || data.people.length > 0 || data.notes.length > 0)

  useEffect(() => {
    setOpen(debouncedQuery.length >= 2 && !!hasResults)
  }, [debouncedQuery, hasResults])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setOpen(false); setQuery('') }
    if (e.key === 'Enter' && query.length >= 2) {
      setOpen(false)
      navigate(`/search?q=${encodeURIComponent(query)}`)
      setQuery('')
    }
  }

  const goTo = (path: string) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  return (
    <div className="relative px-3 py-2">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
          width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => debouncedQuery.length >= 2 && hasResults && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search assets, serials, people..."
          className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-white/80 placeholder-white/30 outline-none focus:border-sg-lime/50 focus:bg-white/8 transition-all"
        />
      </div>

      {open && data && (
        <div
          ref={dropdownRef}
          className="absolute left-3 right-3 top-full mt-1 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {data.assets.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500">Assets</div>
              {data.assets.slice(0, 5).map((a) => (
                <button
                  key={a.id}
                  onClick={() => goTo(`/assets/${a.id}`)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: a.status?.color || '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/90 truncate">{a.name}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">{a.asset_tag}{a.serial ? ` · ${a.serial}` : ''}</div>
                  </div>
                  {a.assigned_to && (
                    <span className="text-[10px] text-neutral-500 flex-shrink-0">{a.assigned_to.name}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {data.people.length > 0 && (
            <div className={data.assets.length > 0 ? 'border-t border-white/5' : ''}>
              <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500">People</div>
              {data.people.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => goTo(`/people/${p.id}`)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                >
                  <div className="w-6 h-6 rounded-full gradient-bg flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white/90 truncate">{p.name}</div>
                    <div className="text-[10px] text-neutral-500">{p.department || p.email || ''}</div>
                  </div>
                  {p.asset_count > 0 && (
                    <span className="text-[10px] text-neutral-500 flex-shrink-0">{p.asset_count} assets</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {data.notes.length > 0 && (
            <div className={(data.assets.length > 0 || data.people.length > 0) ? 'border-t border-white/5' : ''}>
              <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-neutral-500">Notes</div>
              {data.notes.slice(0, 5).map((n) => (
                <button
                  key={n.assignment_id}
                  onClick={() => goTo(`/assets/${n.asset_id}`)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 text-left transition-colors"
                >
                  <svg width="12" height="12" fill="none" stroke="#6B7280" viewBox="0 0 24 24" className="flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/90 truncate">{n.note}</div>
                    <div className="text-[10px] text-neutral-500">{n.asset_name} · {n.person_name}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="border-t border-white/5 px-3 py-2">
            <button
              onClick={() => goTo(`/search?q=${encodeURIComponent(query)}`)}
              className="text-[10px] text-sg-lime hover:text-sg-lime/80 transition-colors"
            >
              See all results for "{query}" →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-4 py-2 mx-2 rounded-lg text-[13px] transition-all cursor-pointer border-l-2 ${
          isActive
            ? 'text-sg-lime bg-sg-lime/10 border-sg-lime font-semibold'
            : 'text-white/50 border-transparent hover:text-white/80 hover:bg-white/4 font-normal'
        }`
      }
    >
      <span className="flex-shrink-0">{icon}</span>
      {label}
    </NavLink>
  )
}

export default function Sidebar() {
  const { user, logout } = useAuth()

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <aside className="fixed top-0 left-0 bottom-0 w-[220px] bg-[#0A0A0A] flex flex-col z-50 overflow-hidden">
      {/* Gradient top rule */}
      <div className="h-[2px] flex-shrink-0 gradient-bg" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Wordmark */}
      <a href="/" className="relative z-10 flex items-center px-5 h-[60px] flex-shrink-0 no-underline" style={{ letterSpacing: '-0.04em', fontSize: '16px', lineHeight: 1 }}>
        <span style={{ fontWeight: 200, color: 'rgba(255,255,255,0.85)' }}>Simple</span>
        <span className="gradient-text" style={{ fontWeight: 800 }}>Gear</span>
      </a>

      {/* Global search */}
      <div className="relative z-10">
        <GlobalSearch />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 py-1 overflow-y-auto scrollbar-thin">
        <span className="block mx-4 mt-3 mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-600">Inventory</span>
        <NavItem
          to="/assets"
          label="Assets"
          icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
        />
        <NavItem
          to="/people"
          label="People"
          icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        <span className="block mx-4 mt-4 mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-600">Manage</span>
        <NavItem
          to="/locations"
          label="Locations"
          icon={
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />

        {user?.role === 'admin' && (
          <>
            <span className="block mx-4 mt-4 mb-1 text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-600">Configure</span>
            <NavItem
              to="/settings"
              label="Settings"
              icon={
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
          </>
        )}
      </nav>

      {/* User */}
      <div className="relative z-10 border-t border-white/6 px-4 py-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-white/85 truncate">{user?.name}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-600">{user?.role}</div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="text-neutral-600 hover:text-red-400 transition-colors p-1 rounded flex-shrink-0"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
