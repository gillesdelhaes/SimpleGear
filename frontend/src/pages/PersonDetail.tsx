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
    <div className="p-8 flex justify-center"><div className="w-8 h-8 border-2 border-sg-lime/30 border-t-sg-lime rounded-full animate-spin" /></div>
  )

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
        <Link to="/people" className="hover:text-neutral-600">People</Link>
        <span>/</span>
        <span className="text-neutral-700 font-medium">{person.name}</span>
      </div>

      <div className="flex items-center gap-5 mb-8">
        <div className="w-16 h-16 rounded-full gradient-bg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
          {person.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{person.name}</h1>
          <div className="text-sm text-neutral-500 mt-0.5">
            {person.department || ''}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400">
            {person.email && <span>{person.email}</span>}
            {person.phone && <span>{person.phone}</span>}
            {person.employee_id && <span className="font-mono">{person.employee_id}</span>}
          </div>
        </div>
      </div>

      {/* Current assets */}
      <div className="mb-6">
        <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-3">
          Currently assigned ({assets?.current.length ?? 0})
        </h2>
        {!assets?.current.length ? (
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 text-center text-sm text-neutral-400">
            No assets currently assigned
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50">
            {assets.current.map((asset) => (
              <div key={asset.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <Link to={`/assets/${asset.id}`} className="font-semibold text-sm text-neutral-900 hover:text-sg-forest">{asset.name}</Link>
                  {(asset.make || asset.model) && (
                    <div className="text-xs text-neutral-400">{[asset.make, asset.model].filter(Boolean).join(' ')}</div>
                  )}
                </div>
                {asset.asset_tag && <span className="text-xs font-mono text-neutral-500">{asset.asset_tag}</span>}
                {asset.status && <StatusBadge status={asset.status} />}
                {asset.category && <span className="text-xs text-neutral-400">{asset.category.name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {assets?.history && assets.history.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-neutral-400 mb-3">Assignment history</h2>
          <div className="bg-white rounded-2xl border border-neutral-100 divide-y divide-neutral-50">
            {assets.history.map((h) => (
              <div key={h.id} className="flex items-start gap-4 px-5 py-3">
                <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="10" height="10" fill="none" stroke="#9CA3AF" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <Link to={`/assets/${h.asset_id}`} className="text-sm font-medium text-neutral-800 hover:text-sg-forest">Asset #{h.asset_id}</Link>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {new Date(String(h.assigned_at)).toLocaleDateString()}
                    {h.released_at && ` → ${new Date(String(h.released_at)).toLocaleDateString()}`}
                  </div>
                  {h.note && <div className="text-xs text-neutral-500 mt-1 font-mono bg-neutral-50 rounded px-2 py-0.5">{h.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
