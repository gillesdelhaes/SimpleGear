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

  const sectionHead = 'text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-2.5'
  const rowLink = 'flex items-center gap-4 px-5 py-3.5 hover:bg-row-hover transition-colors no-underline'

  return (
    <div className="max-w-4xl">
      <form onSubmit={handleSearch} className="mb-5">
        <div className="flex gap-2">
          <div className="search" style={{ marginLeft: 0, flex: 1, width: 'auto', maxWidth: 'none', padding: '11px 16px' }}>
            <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search assets, serials, people, notes…"
              autoFocus
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', font: 'inherit', color: 'var(--ink)' }}
            />
          </div>
          <button type="submit" className="btn">Search</button>
        </div>
      </form>

      {q && (
        <>
          {/* Tabs */}
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`chip${tab === t.key ? ' on' : ''}`}>
                {t.label}
                {t.count > 0 && <b>{t.count}</b>}
              </button>
            ))}
          </div>

          {isLoading || isFetching ? (
            <div className="flex justify-center py-16">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--track)', borderTopColor: 'var(--b1)' }} />
            </div>
          ) : !data || totalResults === 0 ? (
            <div className="text-center py-16">
              <p className="text-ink-2 text-[14px] mb-1">No results for "{q}".</p>
              <p className="text-[12.5px] text-ink-3 m-0">Try a partial serial, asset tag, name, or note keyword.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Assets */}
              {(tab === 'all' || tab === 'assets') && data.assets.length > 0 && (
                <section>
                  <h2 className={sectionHead}>Assets ({data.assets.length})</h2>
                  <div className="panel divide-y divide-track overflow-hidden">
                    {data.assets.map((a) => (
                      <Link key={a.id} to={`/assets/${a.id}`} className={rowLink}>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[13.5px] text-ink">{a.name}</div>
                          <div className="text-[11px] text-ink-3 font-mono mt-0.5">
                            {[a.asset_tag, a.serial].filter(Boolean).join(' · ')}
                          </div>
                          {a.category && <div className="text-xs text-ink-3">{a.category.name}</div>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {a.assigned_to && <span className="text-xs text-ink-2">{a.assigned_to.name}</span>}
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
                  <h2 className={sectionHead}>People ({data.people.length})</h2>
                  <div className="panel divide-y divide-track overflow-hidden">
                    {data.people.map((p) => (
                      <Link key={p.id} to={`/people/${p.id}`} className={rowLink}>
                        <div className="avatar" style={{ width: 34, height: 34, borderRadius: 11, fontSize: 13 }}>
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-[13.5px] text-ink">{p.name}</div>
                          <div className="text-xs text-ink-3">
                            {[p.department, p.email].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                        {p.asset_count > 0 && (
                          <span className="pill use plain flex-shrink-0">{p.asset_count} assets</span>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Notes */}
              {(tab === 'all' || tab === 'notes') && data.notes.length > 0 && (
                <section>
                  <h2 className={sectionHead}>Notes ({data.notes.length})</h2>
                  <div className="panel divide-y divide-track overflow-hidden">
                    {data.notes.map((n) => (
                      <Link key={n.assignment_id} to={`/assets/${n.asset_id}`} className={rowLink} style={{ alignItems: 'flex-start' }}>
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="flex-shrink-0 mt-0.5 text-ink-3">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] text-ink font-mono">{n.note}</div>
                          <div className="text-xs text-ink-3 mt-0.5">{n.asset_name} · {n.person_name}</div>
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
          <p className="text-ink-2 text-[13.5px] mb-1">Type at least 2 characters to search.</p>
          <p className="text-ink-3 text-xs m-0">Searches asset names, tags, serials, people, and assignment notes.</p>
        </div>
      )}
    </div>
  )
}
