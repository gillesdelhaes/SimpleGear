import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import type { Person, Asset, Assignment } from '../types'
import StatusBadge from '../components/shared/StatusBadge'

export default function PersonDetail() {
  const { id } = useParams()

  const { data: person } = useQuery<Person>({
    queryKey: ['person', Number(id)],
    queryFn: () => api.get(`/people/${id}`).then((r) => r.data),
  })

  const { data: assets } = useQuery<{ current: Asset[]; history: Assignment[] }>({
    queryKey: ['person-assets', Number(id)],
    queryFn: () => api.get(`/people/${id}/assets`).then((r) => r.data),
  })

  if (!person) return (
    <div className="p-8 flex justify-center"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--track)', borderTopColor: 'var(--b1)' }} /></div>
  )

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-2 text-[12.5px] text-ink-3 mb-5">
        <Link to="/people" className="hover:text-ink">People</Link>
        <span>/</span>
        <span className="text-ink-2 font-medium">{person.name}</span>
      </div>

      <div className="flex items-center gap-5 mb-8">
        <div className="avatar" style={{ width: 56, height: 56, borderRadius: 18, fontSize: 22 }}>
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight m-0">{person.name}</h1>
          <div className="text-[13.5px] text-ink-2 mt-0.5">
            {person.department || ''}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-ink-3">
            {person.email && <span>{person.email}</span>}
            {person.phone && <span>{person.phone}</span>}
            {person.employee_id && <span className="font-mono">{person.employee_id}</span>}
          </div>
        </div>
      </div>

      {/* Current assets */}
      <div className="mb-6">
        <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-2.5 mt-0">
          Currently assigned ({assets?.current.length ?? 0})
        </h2>
        {!assets?.current.length ? (
          <div className="panel p-6 text-center text-[13px] text-ink-3">
            No assets currently assigned
          </div>
        ) : (
          <div className="panel divide-y divide-track overflow-hidden">
            {assets.current.map((asset) => (
              <div key={asset.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/assets/${asset.id}`} className="font-semibold text-[13.5px] text-ink hover:text-brand-ink">{asset.name}</Link>
                  {(asset.make || asset.model) && (
                    <div className="text-xs text-ink-3">{[asset.make, asset.model].filter(Boolean).join(' ')}</div>
                  )}
                </div>
                {asset.asset_tag && <span className="text-xs font-mono text-ink-2">{asset.asset_tag}</span>}
                {asset.status && <StatusBadge status={asset.status} />}
                {asset.category && <span className="text-xs text-ink-3">{asset.category.name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {assets?.history && assets.history.length > 0 && (
        <div>
          <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-2.5 mt-0">Assignment history</h2>
          <div className="panel divide-y divide-track overflow-hidden">
            {assets.history.map((h) => (
              <div key={h.id} className="flex items-start gap-4 px-5 py-3">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'var(--field)', border: '1px solid var(--edge)' }}>
                  <svg width="10" height="10" fill="none" stroke="var(--ink-3)" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/assets/${h.asset_id}`} className="text-[13.5px] font-medium text-ink hover:text-brand-ink">Asset #{h.asset_id}</Link>
                  <div className="text-xs text-ink-3 mt-0.5">
                    {new Date(String(h.assigned_at)).toLocaleDateString()}
                    {h.released_at && ` → ${new Date(String(h.released_at)).toLocaleDateString()}`}
                  </div>
                  {h.note && <div className="text-xs text-ink-2 mt-1 font-mono rounded px-2 py-0.5" style={{ background: 'var(--field)' }}>{h.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
