import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import type { Asset, Assignment, AuditLogEntry, Location, Maintenance, Person } from '../types'
import StatusBadge from '../components/shared/StatusBadge'
import EOLBadge from '../components/shared/EOLBadge'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-0.5">{label}</div>
      <div className={`text-[13.5px] text-ink ${mono ? 'font-mono text-[12.5px]' : ''}`}>{value}</div>
    </div>
  )
}

function AssignModal({ assetId, onClose, people }: { assetId: number; onClose: () => void; people: Person[] }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [personId, setPersonId] = useState('')
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.post(`/assets/${assetId}/assign`, { person_id: Number(personId), note: note || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset', assetId] })
      qc.invalidateQueries({ queryKey: ['asset-history', assetId] })
      showToast('Asset assigned', 'success')
      onClose()
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-2 mb-1.5">Assign to *</label>
          <div className="selectwrap">
            <select required value={personId} onChange={(e) => setPersonId(e.target.value)} className="select">
              <option value="">Select a person…</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.department ? ` — ${p.department}` : ''}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-2 mb-1.5">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder="e.g. Laptop wiped and ready"
          />
        </div>
      </div>
      <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
        <button type="button" onClick={onClose} className="btn ghost">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn">
          {mutation.isPending ? 'Assigning...' : 'Assign'}
        </button>
      </div>
    </form>
  )
}

function ReleaseModal({ assetId, onClose }: { assetId: number; onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [note, setNote] = useState('')

  const mutation = useMutation({
    mutationFn: () => api.post(`/assets/${assetId}/release`, { note: note || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset', assetId] })
      qc.invalidateQueries({ queryKey: ['asset-history', assetId] })
      showToast('Asset released', 'success')
      onClose()
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div>
        <label className="block text-xs font-semibold text-ink-2 mb-1.5">Release note</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="input"
          placeholder="e.g. Broken screen, sent to repair"
          autoFocus
        />
      </div>
      <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
        <button type="button" onClick={onClose} className="btn ghost">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn ghost text-warn-ink">
          {mutation.isPending ? 'Releasing...' : 'Release'}
        </button>
      </div>
    </form>
  )
}

function AuditModal({ asset, onClose, locations }: { asset: Asset; onClose: () => void; locations: Location[] }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [note, setNote] = useState('')
  const [locationId, setLocationId] = useState(asset.location_id?.toString() ?? '')

  const mutation = useMutation({
    mutationFn: () => api.post(`/assets/${asset.id}/audit`, {
      note: note || null,
      location_id: locationId ? Number(locationId) : null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset', asset.id] })
      qc.invalidateQueries({ queryKey: ['asset-activity', asset.id] })
      showToast('Audit recorded', 'success')
      onClose()
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="space-y-4">
        <p className="text-[13px] text-ink-2 leading-relaxed m-0">
          Confirm you have physically sighted <span className="font-semibold text-ink">{asset.name}</span>{' '}
          (<span className="font-mono text-xs">{asset.asset_tag}</span>). This stamps the audit trail and schedules the next check.
        </p>
        <div>
          <label className="block text-xs font-semibold text-ink-2 mb-1.5">Location (confirm or correct)</label>
          <div className="selectwrap">
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="select">
              <option value="">No location</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-2 mb-1.5">Audit note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            placeholder="e.g. Sighted at desk 12, condition good"
            autoFocus
          />
        </div>
      </div>
      <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
        <button type="button" onClick={onClose} className="btn ghost">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn">
          {mutation.isPending ? 'Recording...' : 'Confirm audit'}
        </button>
      </div>
    </form>
  )
}

const MAINTENANCE_TYPES = [
  { value: 'repair', label: 'Repair' },
  { value: 'upgrade', label: 'Upgrade' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'other', label: 'Other' },
]

function MaintenanceForm({ assetId, record, onClose }: { assetId: number; record?: Maintenance; onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    maintenance_type: record?.maintenance_type ?? 'repair',
    title: record?.title ?? '',
    notes: record?.notes ?? '',
    start_date: record?.start_date ?? '',
    completed_date: record?.completed_date ?? '',
    cost: record?.cost?.toString() ?? '',
    provider: record?.provider ?? '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        maintenance_type: form.maintenance_type,
        title: form.title,
        notes: form.notes || null,
        start_date: form.start_date || null,
        completed_date: form.completed_date || null,
        cost: form.cost ? Number(form.cost) : null,
        provider: form.provider || null,
      }
      return record
        ? api.patch(`/assets/${assetId}/maintenance/${record.id}`, payload)
        : api.post(`/assets/${assetId}/maintenance`, payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-maintenance', assetId] })
      qc.invalidateQueries({ queryKey: ['asset-activity', assetId] })
      showToast(record ? 'Maintenance updated' : 'Maintenance logged', 'success')
      onClose()
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const inputCls = 'input'
  const labelCls = 'block text-xs font-semibold text-ink-2 mb-1.5'

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <div className="selectwrap">
              <select className="select" value={form.maintenance_type} onChange={set('maintenance_type')}>
                {MAINTENANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Cost</label>
            <input type="number" step="0.01" min="0" className={inputCls} value={form.cost} onChange={set('cost')} placeholder="0.00" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Title *</label>
          <input required autoFocus className={inputCls} value={form.title} onChange={set('title')} placeholder="e.g. Battery replacement" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Started</label>
            <input type="date" className={inputCls} value={form.start_date} onChange={set('start_date')} />
          </div>
          <div>
            <label className={labelCls}>Completed (blank = open)</label>
            <input type="date" className={inputCls} value={form.completed_date} onChange={set('completed_date')} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Provider</label>
          <input className={inputCls} value={form.provider} onChange={set('provider')} placeholder="e.g. Apple Store, internal IT" />
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea rows={2} className={inputCls} value={form.notes} onChange={set('notes')} placeholder="Optional details" />
        </div>
      </div>
      <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
        <button type="button" onClick={onClose} className="btn ghost">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn">
          {mutation.isPending ? 'Saving...' : record ? 'Save' : 'Log maintenance'}
        </button>
      </div>
    </form>
  )
}

const ACTIVITY_LABELS: Record<string, string> = {
  'asset.created': 'Created',
  'asset.updated': 'Updated',
  'asset.deleted': 'Deleted',
  'asset.assigned': 'Assigned',
  'asset.released': 'Released',
  'asset.audited': 'Audited',
  'asset.maintenance_added': 'Maintenance logged',
  'asset.maintenance_updated': 'Maintenance updated',
  'asset.maintenance_deleted': 'Maintenance removed',
}

function AuditBadge({ asset }: { asset: Asset }) {
  if (asset.days_to_next_audit !== null && asset.days_to_next_audit < 0) {
    return <span className="text-[10px] font-bold uppercase tracking-wider text-danger-ink bg-danger-tint px-2 py-0.5 rounded-full">Audit overdue</span>
  }
  if (!asset.last_audit_at) {
    return <span className="text-[10px] font-bold uppercase tracking-wider text-warn-ink bg-warn-tint px-2 py-0.5 rounded-full">Never audited</span>
  }
  return <span className="text-[10px] font-bold uppercase tracking-wider text-brand-ink bg-brand-tint px-2 py-0.5 rounded-full">Audit OK</span>
}

export default function AssetDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [tab, setTab] = useState<'info' | 'history' | 'maintenance' | 'activity'>('info')
  const [showAssign, setShowAssign] = useState(false)
  const [showRelease, setShowRelease] = useState(false)
  const [showAudit, setShowAudit] = useState(false)
  const [showMaintenance, setShowMaintenance] = useState(false)
  const [editingMaintenance, setEditingMaintenance] = useState<Maintenance | null>(null)
  const [showDelete, setShowDelete] = useState(false)

  const { data: asset, isLoading } = useQuery<Asset>({
    queryKey: ['asset', Number(id)],
    queryFn: () => api.get(`/assets/${id}`).then((r) => r.data),
  })
  const { data: history = [] } = useQuery<Assignment[]>({
    queryKey: ['asset-history', Number(id)],
    queryFn: () => api.get(`/assets/${id}/history`).then((r) => r.data),
    enabled: tab === 'history',
  })
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ['people-list'],
    queryFn: () => api.get('/people?per_page=500').then((r) => r.data.items ?? []),
  })
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })
  const { data: maintenance = [] } = useQuery<Maintenance[]>({
    queryKey: ['asset-maintenance', Number(id)],
    queryFn: () => api.get(`/assets/${id}/maintenance`).then((r) => r.data),
    enabled: tab === 'maintenance',
  })
  const { data: activity = [] } = useQuery<AuditLogEntry[]>({
    queryKey: ['asset-activity', Number(id)],
    queryFn: () => api.get(`/assets/${id}/activity`).then((r) => r.data),
    enabled: tab === 'activity',
  })

  const deleteMaintenanceMutation = useMutation({
    mutationFn: (mid: number) => api.delete(`/assets/${id}/maintenance/${mid}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['asset-maintenance', Number(id)] })
      showToast('Maintenance record deleted', 'success')
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/assets/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); navigate('/assets') },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  if (isLoading) return (
    <div className="p-8 flex justify-center"><div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--track)', borderTopColor: 'var(--b1)' }} /></div>
  )
  if (!asset) return <div className="p-8 text-ink-2">Asset not found.</div>

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12.5px] text-ink-3 mb-5">
        <Link to="/assets" className="hover:text-ink">Assets</Link>
        <span>/</span>
        <span className="text-ink-2 font-medium">{asset.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-ink tracking-tight m-0">{asset.name}</h1>
            {asset.status && <StatusBadge status={asset.status} />}
            {asset.days_to_eol !== undefined && <EOLBadge days={asset.days_to_eol ?? null} />}
            <AuditBadge asset={asset} />
          </div>
          {asset.asset_model ? (
            <p className="text-ink-2 m-0">{[asset.asset_model.manufacturer, asset.asset_model.name, asset.asset_model.model_number].filter(Boolean).join(' · ')}</p>
          ) : (asset.make || asset.model) && (
            <p className="text-ink-2 m-0">{[asset.make, asset.model, asset.model_number].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAudit(true)} className="btn ghost text-brand-ink">
            Audit
          </button>
          {asset.assigned_to ? (
            <button onClick={() => setShowRelease(true)} className="btn ghost text-warn-ink">Release</button>
          ) : (
            <button onClick={() => setShowAssign(true)} className="btn">Assign</button>
          )}
          <button onClick={() => setShowDelete(true)} className="btn ghost text-ink-3 hover:text-danger-ink" aria-label="Delete asset">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Currently assigned banner */}
      {asset.assigned_to && (
        <div className="rounded-block px-5 py-3 mb-5 flex items-center gap-3" style={{ background: 'var(--brand-tint)', border: '1px solid color-mix(in oklab, var(--b1) 30%, transparent)' }}>
          <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
            {asset.assigned_to.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-[13.5px] font-semibold text-ink">
              Assigned to{' '}
              <Link to={`/people/${asset.assigned_to.id}`} className="text-brand-ink hover:underline">{asset.assigned_to.name}</Link>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {(['info', 'history', 'maintenance', 'activity'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`chip capitalize${tab === t ? ' on' : ''}`}>{t}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-2 gap-3.5">
          <div className="panel p-6 space-y-5">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 m-0">Identification</h3>
            <Field label="Asset tag" value={asset.asset_tag} mono />
            <Field label="Serial number" value={asset.serial} mono />
            {asset.asset_model ? (
              <>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-0.5">Model</div>
                  <div className="text-[13.5px] text-ink">{asset.asset_model.name}</div>
                  {asset.asset_model.manufacturer && <div className="text-xs text-ink-3 mt-0.5">{asset.asset_model.manufacturer}</div>}
                </div>
                <Field label="Model number" value={asset.asset_model.model_number ?? asset.model_number} mono />
              </>
            ) : (
              <>
                <Field label="Make" value={asset.make} />
                <Field label="Model" value={asset.model} />
                <Field label="Model number" value={asset.model_number} mono />
              </>
            )}
          </div>
          <div className="panel p-6 space-y-5">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 m-0">Classification</h3>
            <Field label="Category" value={asset.category?.name} />
            <Field label="Location" value={asset.location?.name} />
            <Field label="Supplier" value={asset.supplier} />
            {asset.purchase_price && <Field label="Purchase price" value={`$${asset.purchase_price.toFixed(2)}`} />}
          </div>
          <div className="panel p-6 space-y-5">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 m-0">Dates</h3>
            <Field label="Purchase date" value={asset.purchase_date} />
            <Field label="Warranty expiry" value={asset.warranty_expiry} />
            <Field label="EOL date" value={asset.eol_date} />
            {asset.days_to_eol != null && (
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-0.5">EOL in</div>
                <div className={`text-sm font-semibold ${
                  asset.days_to_eol < 0 ? 'text-ink' : asset.days_to_eol < 30 ? 'text-danger-ink' : asset.days_to_eol < 90 ? 'text-warn-ink' : 'text-brand-ink'
                }`}>
                  {asset.days_to_eol < 0
                    ? `${Math.abs(asset.days_to_eol)} days past EOL`
                    : asset.days_to_eol >= 365
                      ? `${(asset.days_to_eol / 365).toFixed(1)} years (${asset.days_to_eol} days)`
                      : `${asset.days_to_eol} days`}
                </div>
              </div>
            )}
          </div>
          <div className="panel p-6 space-y-5">
            <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 m-0">Audit</h3>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-0.5">Status</div>
              <AuditBadge asset={asset} />
            </div>
            <Field
              label="Last audited"
              value={asset.last_audit_at
                ? `${new Date(asset.last_audit_at + 'Z').toLocaleDateString()}${asset.last_audit_by_name ? ` by ${asset.last_audit_by_name}` : ''}`
                : null}
            />
            <Field
              label="Next audit due"
              value={asset.next_audit_date
                ? `${asset.next_audit_date}${asset.days_to_next_audit !== null ? asset.days_to_next_audit < 0 ? ` (${Math.abs(asset.days_to_next_audit)}d overdue)` : ` (in ${asset.days_to_next_audit}d)` : ''}`
                : null}
            />
            {!asset.last_audit_at && (
              <p className="text-xs text-ink-3 leading-relaxed m-0">This asset has never been physically verified. Use the Audit button to record a check.</p>
            )}
          </div>
          {asset.notes && (
            <div className="panel p-6">
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-3 mt-0">Notes</h3>
              <p className="text-[13px] text-ink-2 leading-relaxed whitespace-pre-wrap m-0">{asset.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="panel">
          {history.length === 0 ? (
            <div className="px-6 py-12 text-center text-[13px] text-ink-3">No assignment history</div>
          ) : (
            <div className="divide-y divide-track">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-4 px-6 py-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${h.released_at ? 'bg-field' : 'bg-brand-tint'}`}>
                    <svg width="12" height="12" fill="none" stroke={h.released_at ? 'var(--ink-3)' : 'var(--brand-ink)'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-medium text-ink">
                      {h.person_name ? (
                        <Link to={`/people/${h.person_id}`} className="hover:text-brand-ink">{h.person_name}</Link>
                      ) : 'Unknown'}
                    </div>
                    <div className="text-xs text-ink-3 mt-0.5">
                      {h.assigned_at ? new Date(h.assigned_at).toLocaleDateString() : ''}
                      {h.released_at && ` → ${new Date(h.released_at).toLocaleDateString()}`}
                    </div>
                    {h.note && <div className="text-xs text-ink-2 mt-1 font-mono rounded px-2 py-1" style={{ background: 'var(--field)' }}>{h.note}</div>}
                  </div>
                  {!h.released_at && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-ink bg-brand-tint px-2 py-0.5 rounded-full flex-shrink-0">Active</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'maintenance' && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowMaintenance(true)} className="btn sm">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Log maintenance
            </button>
          </div>
          <div className="panel">
            {maintenance.length === 0 ? (
              <div className="px-6 py-12 text-center text-[13px] text-ink-3">No maintenance recorded for this asset</div>
            ) : (
              <div className="divide-y divide-track">
                {maintenance.map((m) => (
                  <div key={m.id} className="flex items-start gap-4 px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${m.completed_date ? 'bg-field text-ink-3' : 'bg-warn-tint text-warn-ink'}`}>
                      {m.completed_date ? m.maintenance_type : `${m.maintenance_type} · open`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] font-medium text-ink">{m.title}</div>
                      <div className="text-xs text-ink-3 mt-0.5">
                        {m.start_date ?? ''}
                        {m.completed_date && ` → ${m.completed_date}`}
                        {m.provider && ` · ${m.provider}`}
                        {m.created_by_name && ` · logged by ${m.created_by_name}`}
                      </div>
                      {m.notes && <div className="text-xs text-ink-2 mt-1 font-mono rounded px-2 py-1" style={{ background: 'var(--field)' }}>{m.notes}</div>}
                    </div>
                    {m.cost !== null && <span className="text-[13px] font-semibold font-mono text-ink flex-shrink-0">${m.cost.toFixed(2)}</span>}
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditingMaintenance(m)} className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-row-hover bg-transparent border-0 cursor-pointer">
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => deleteMaintenanceMutation.mutate(m.id)} className="p-1.5 rounded-lg text-ink-3 hover:text-danger-ink bg-transparent border-0 cursor-pointer">
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'activity' && (
        <div className="panel">
          {activity.length === 0 ? (
            <div className="px-6 py-12 text-center text-[13px] text-ink-3">No recorded activity for this asset yet</div>
          ) : (
            <div className="divide-y divide-track">
              {activity.map((e) => {
                const changes = (e.payload as any)?.changes as Record<string, { from: unknown; to: unknown }> | undefined
                const note = (e.payload as any)?.note as string | undefined
                return (
                  <div key={e.id} className="flex items-start gap-4 px-6 py-3.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${e.action === 'asset.audited' ? 'bg-brand-tint text-brand-ink' : 'bg-field text-ink-3'}`}>
                      {ACTIVITY_LABELS[e.action] ?? e.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] text-ink-2">
                        <span className="font-semibold text-ink">{e.actor_name ?? 'System'}</span>
                        {e.action === 'asset.assigned' && (e.payload as any)?.person_name && (
                          <span> → {(e.payload as any).person_name}</span>
                        )}
                      </div>
                      {changes && (
                        <div className="text-[11px] text-ink-3 mt-0.5 font-mono">
                          {Object.entries(changes).map(([f, c]) => `${f}: ${c.from ?? '—'} → ${c.to ?? '—'}`).join(' · ')}
                        </div>
                      )}
                      {note && <div className="text-xs text-ink-2 mt-1 font-mono rounded px-2 py-1" style={{ background: 'var(--field)' }}>{note}</div>}
                    </div>
                    <span className="text-[11px] font-mono text-ink-3 flex-shrink-0 pt-0.5 whitespace-nowrap">
                      {new Date(e.created_at + 'Z').toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign asset" size="sm">
        <AssignModal assetId={asset.id} onClose={() => setShowAssign(false)} people={people} />
      </Modal>

      <Modal open={showRelease} onClose={() => setShowRelease(false)} title="Release asset" size="sm">
        <ReleaseModal assetId={asset.id} onClose={() => setShowRelease(false)} />
      </Modal>

      <Modal open={showAudit} onClose={() => setShowAudit(false)} title="Record physical audit" size="sm">
        <AuditModal asset={asset} onClose={() => setShowAudit(false)} locations={locations} />
      </Modal>

      <Modal
        open={showMaintenance || !!editingMaintenance}
        onClose={() => { setShowMaintenance(false); setEditingMaintenance(null) }}
        title={editingMaintenance ? 'Edit maintenance' : 'Log maintenance'}
        size="sm"
      >
        <MaintenanceForm
          assetId={asset.id}
          record={editingMaintenance ?? undefined}
          onClose={() => { setShowMaintenance(false); setEditingMaintenance(null) }}
        />
      </Modal>

      <ConfirmDialog
        open={showDelete}
        title="Delete this asset?"
        message="Assignment history will be preserved in the database but the asset record will be removed."
        confirmLabel="Delete asset"
        onConfirm={() => { setShowDelete(false); deleteMutation.mutate() }}
        onCancel={() => setShowDelete(false)}
      />
    </div>
  )
}
