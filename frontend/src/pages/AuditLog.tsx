import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/axios'
import type { AuditLogPage } from '../types'
import { useToast } from '../components/shared/Toast'

const ACTION_LABELS: Record<string, string> = {
  'asset.created': 'created asset',
  'asset.updated': 'updated asset',
  'asset.deleted': 'deleted asset',
  'asset.assigned': 'assigned asset',
  'asset.released': 'released asset',
  'asset.audited': 'audited asset',
  'asset.maintenance_added': 'logged maintenance on',
  'asset.maintenance_updated': 'updated maintenance on',
  'asset.maintenance_deleted': 'removed maintenance from',
  'person.created': 'added person',
  'person.updated': 'updated person',
  'person.deleted': 'deleted person',
  'user.created': 'created user',
  'user.updated': 'updated user',
  'user.deleted': 'deleted user',
  'user.login': 'signed in',
  'category.created': 'created category',
  'category.updated': 'updated category',
  'category.deleted': 'deleted category',
  'status.created': 'created status',
  'status.updated': 'updated status',
  'status.deleted': 'deleted status',
  'location.created': 'created location',
  'location.updated': 'updated location',
  'location.deleted': 'deleted location',
  'model.created': 'created model',
  'model.updated': 'updated model',
  'model.deleted': 'deleted model',
  'import.completed': 'imported CSV',
  'settings.updated': 'changed settings',
}

const ENTITY_FILTERS = [
  { value: '', label: 'All activity' },
  { value: 'asset', label: 'Assets' },
  { value: 'person', label: 'People' },
  { value: 'user', label: 'Users' },
  { value: 'location', label: 'Locations' },
  { value: 'category', label: 'Categories' },
  { value: 'status', label: 'Statuses' },
  { value: 'model', label: 'Models' },
  { value: 'settings', label: 'Settings' },
  { value: 'system', label: 'System' },
]

function actionColor(action: string): string {
  if (action.endsWith('.deleted')) return 'bg-danger-tint text-danger-ink'
  if (action === 'asset.audited') return 'bg-brand-tint text-brand-ink'
  if (action.endsWith('.created') || action === 'import.completed') return 'bg-brand-tint text-brand-ink'
  if (action === 'user.login') return 'bg-field text-ink-3'
  return 'bg-warn-tint text-warn-ink'
}

function formatPayload(payload: Record<string, unknown> | null): string {
  if (!payload) return ''
  const parts: string[] = []
  const changes = payload.changes as Record<string, { from: unknown; to: unknown }> | undefined
  if (changes) {
    for (const [field, c] of Object.entries(changes)) {
      parts.push(`${field}: ${c.from ?? '—'} → ${c.to ?? '—'}`)
    }
  }
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'changes' || v === null || v === undefined || v === false) continue
    if (k === 'bulk') { parts.push('bulk action'); continue }
    if (typeof v === 'object') continue
    parts.push(`${k}: ${v}`)
  }
  return parts.join(' · ')
}

export default function AuditLog() {
  const { showToast } = useToast()
  const [entityType, setEntityType] = useState('')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery<AuditLogPage>({
    queryKey: ['audit-log', entityType, q, page],
    queryFn: () =>
      api.get('/activity', { params: { entity_type: entityType || undefined, q: q || undefined, page } }).then((r) => r.data),
  })

  async function exportCsv() {
    try {
      const { data: blob } = await api.get('/activity/export', {
        params: { entity_type: entityType || undefined, q: q || undefined },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'simplegear-audit-log.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast('Export failed', 'error')
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-3.5 gap-2 flex-wrap">
        <p className="text-[13px] text-ink-2 m-0">Append-only record of every change — who did what, when.</p>
        <button
          onClick={exportCsv}
          className="btn ghost sm"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="selectwrap" style={{ width: 180 }}>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1) }}
            className="select"
          >
            {ENTITY_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1) }}
          placeholder="Filter by asset, person, action…"
          className="input flex-1 min-w-[200px]"
          style={{ width: 'auto' }}
        />
        {data && <span className="text-xs font-mono text-ink-3">{data.total} entries</span>}
      </div>

      {/* Log */}
      <div className="panel">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--track)', borderTopColor: 'var(--b1)' }} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <div className="px-6 py-12 text-center text-[13px] text-ink-3">No activity recorded yet.</div>
        ) : (
          <div className="divide-y divide-track">
            {data.items.map((e) => {
              const detail = formatPayload(e.payload)
              return (
                <div key={e.id} className="flex items-start gap-4 px-6 py-3.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${actionColor(e.action)}`}>
                    {e.action.split('.')[1]?.replace('_', ' ') ?? e.action}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] text-ink-2">
                      <span className="font-semibold text-ink">{e.actor_name ?? 'System'}</span>{' '}
                      {ACTION_LABELS[e.action] ?? e.action}{' '}
                      {e.entity_label && (
                        e.entity_type === 'asset' && e.entity_id && e.action !== 'asset.deleted' ? (
                          <Link to={`/assets/${e.entity_id}`} className="font-semibold text-brand-ink hover:underline">{e.entity_label}</Link>
                        ) : (
                          <span className="font-semibold text-ink">{e.entity_label}</span>
                        )
                      )}
                    </div>
                    {detail && <div className="text-[11px] text-ink-3 mt-0.5 font-mono truncate">{detail}</div>}
                  </div>
                  <span className="text-[11px] font-mono text-ink-3 flex-shrink-0 pt-0.5 whitespace-nowrap" title={new Date(e.created_at + 'Z').toLocaleString()}>
                    {new Date(e.created_at + 'Z').toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="btn ghost sm"
            style={page <= 1 ? { opacity: 0.4 } : undefined}
          >
            Previous
          </button>
          <span className="text-xs text-ink-3">Page {page} of {data.pages}</span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
            className="btn ghost sm"
            style={page >= data.pages ? { opacity: 0.4 } : undefined}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
