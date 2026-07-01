import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import type { SearchResults } from '../types'
import StatusBadge from '../components/shared/StatusBadge'

type Tab = 'all' | 'assets' | 'people' | 'notes'

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [tab, setTab] = useState<Tab>('all')
  const q = searchParams.get('q') ?? ''

  useEffect(() => {
    setQuery(q)
  }, [q])

  const { data, isLoading, isFetching } = useQuery<SearchResults>({
    queryKey: ['search-full', q, tab],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(q)}&type=${tab === 'all' ? 'all' : tab}`).then((r) => r.data),
    enabled: q.length >= 2,
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.length >= 2) setSearchParams({ q: query })
  }

  const totalResults = (data?.assets.length ?? 0) + (data?.people.length ?? 0) + (data?.notes.length ?? 0)

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalResults },
    { key: 'assets', label: 'Assets', count: data?.assets.length ?? 0 },
    { key: 'people', label: 'People', count: data?.people.length ?? 0 },
    { key: 'notes', label: 'Notes', count: data?.notes.length ?? 0 },
  ]

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mb-6">Search</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets, serials, people, notes..."
              className="w-full border border-neutral-200 rounded-2xl pl-11 pr-4 py-3 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10 bg-white shadow-sm"
              autoFocus
            />
          </div>
          <button type="submit" className="px-5 py-3 rounded-2xl gradient-bg text-white text-sm font-semibold hover:opacity-90 shadow-sm">Search</button>
        </div>
      </form>

      {q && (
        <>
          {/* Tabs */}
          <div className="flex gap-1 mb-6 border-b border-neutral-100">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors flex items-center gap-2 ${tab === t.key ? 'border-sg-lime text-sg-forest' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
              >
                {t.label}
                {t.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${tab === t.key ? 'bg-sg-lime/20 text-sg-forest' : 'bg-neutral-100 text-neutral-500'}`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          {isLoading || isFetching ? (
            <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-sg-lime/30 border-t-sg-lime rounded-full animate-spin" /></div>
          ) : !data || totalResults === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-neutral-500">No results for "{q}"</p>
              <p className="text-sm text-neutral-400 mt-1">Try a partial serial, asset tag, name, or note keyword</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Assets */}
              {(tab === 'all' || tab === 'assets') && data.assets.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Assets ({data.assets.length})</h2>
                  <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50">
                    {data.assets.map((a) => (
                      <Link key={a.id} to={`/assets/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-neutral-900 group-hover:text-sg-forest">{a.name}</div>
                          <div className="text-xs text-neutral-400 font-mono mt-0.5">
                            {[a.asset_tag, a.serial].filter(Boolean).join(' · ')}
                          </div>
                          {a.category && <div className="text-xs text-neutral-400">{a.category.name}</div>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {a.assigned_to && <span className="text-xs text-neutral-500">{a.assigned_to.name}</span>}
                          {a.status && <StatusBadge status={a.status} />}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* People */}
              {(tab === 'all' || tab === 'people') && data.people.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">People ({data.people.length})</h2>
                  <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50">
                    {data.people.map((p) => (
                      <Link key={p.id} to={`/people/${p.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors group">
                        <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-neutral-900 group-hover:text-sg-forest">{p.name}</div>
                          <div className="text-xs text-neutral-400">
                            {[p.department, p.email].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        {p.asset_count > 0 && (
                          <span className="text-xs font-bold text-sg-forest bg-sg-lime/10 px-2 py-0.5 rounded-full flex-shrink-0">{p.asset_count} assets</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Notes */}
              {(tab === 'all' || tab === 'notes') && data.notes.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Notes ({data.notes.length})</h2>
                  <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50">
                    {data.notes.map((n) => (
                      <Link key={n.assignment_id} to={`/assets/${n.asset_id}`} className="flex items-start gap-4 px-5 py-3.5 hover:bg-neutral-50 transition-colors group">
                        <svg width="14" height="14" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-neutral-800 group-hover:text-sg-forest font-mono">{n.note}</div>
                          <div className="text-xs text-neutral-400 mt-0.5">{n.asset_name} · {n.person_name}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {!q && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-neutral-500 text-sm">Type at least 2 characters to search</p>
          <p className="text-neutral-400 text-xs mt-1">Searches asset names, tags, serials, people, and assignment notes</p>
        </div>
      )}
    </div>
  )
}
