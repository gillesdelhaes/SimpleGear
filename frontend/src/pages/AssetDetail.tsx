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
      <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">{label}</div>
      <div className={`text-sm text-neutral-800 ${mono ? 'font-mono' : ''}`}>{value}</div>
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
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Assign to *</label>
          <select required value={personId} onChange={(e) => setPersonId(e.target.value)} className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10">
            <option value="">Select a person...</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}{p.department ? ` — ${p.department}` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10"
            placeholder="e.g. Laptop wiped and ready"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg gradient-bg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
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
        <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Release note</label>
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10"
          placeholder="e.g. Broken screen, sent to repair"
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
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
        <p className="text-sm text-neutral-500 leading-relaxed">
          Confirm you have physically sighted <span className="font-semibold text-neutral-800">{asset.name}</span>{' '}
          (<span className="font-mono text-xs">{asset.asset_tag}</span>). This stamps the audit trail and schedules the next check.
        </p>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Location (confirm or correct)</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10">
            <option value="">No location</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-600 mb-1.5">Audit note</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10"
            placeholder="e.g. Sighted at desk 12, condition good"
            autoFocus
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg gradient-bg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
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

  const inputCls = 'w-full border border-neutral-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10'
  const labelCls = 'block text-xs font-semibold text-neutral-600 mb-1.5'

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Type</label>
            <select className={inputCls} value={form.maintenance_type} onChange={set('maintenance_type')}>
              {MAINTENANCE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
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
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg gradient-bg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
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
    return <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Audit overdue</span>
  }
  if (!asset.last_audit_at) {
    return <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Never audited</span>
  }
  return <span className="text-[10px] font-bold uppercase tracking-wider text-sg-forest bg-sg-lime/10 px-2 py-0.5 rounded-full">Audit OK</span>
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
    <div className="p-8 flex justify-center"><div className="w-8 h-8 border-2 border-sg-lime/30 border-t-sg-lime rounded-full animate-spin" /></div>
  )
  if (!asset) return <div className="p-8 text-neutral-500">Asset not found</div>

  return (
    <div className="p-8 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-400 mb-6">
        <Link to="/assets" className="hover:text-neutral-600">Assets</Link>
        <span>/</span>
        <span className="text-neutral-700 font-medium">{asset.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{asset.name}</h1>
            {asset.status && <StatusBadge status={asset.status} />}
            {asset.days_to_eol !== undefined && <EOLBadge days={asset.days_to_eol ?? null} />}
            <AuditBadge asset={asset} />
          </div>
          {(asset.make || asset.model) && (
            <p className="text-neutral-500">{[asset.make, asset.model, asset.model_number].filter(Boolean).join(' · ')}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAudit(true)} className="px-4 py-2 rounded-xl border border-sg-lime/40 bg-sg-lime/8 text-sg-forest text-sm font-semibold hover:bg-sg-lime/15 transition-colors">
            Audit
          </button>
          {asset.assigned_to ? (
            <button onClick={() => setShowRelease(true)} className="px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100">Release</button>
          ) : (
            <button onClick={() => setShowAssign(true)} className="px-4 py-2 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90">Assign</button>
          )}
          <button onClick={() => setShowDelete(true)} className="px-3 py-2 rounded-xl border border-neutral-200 text-neutral-500 text-sm hover:border-red-200 hover:text-red-500 transition-colors">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      {/* Currently assigned banner */}
      {asset.assigned_to && (
        <div className="bg-sg-lime/8 border border-sg-lime/20 rounded-2xl px-5 py-3 mb-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {asset.assigned_to.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-800">
              Assigned to{' '}
              <Link to={`/people/${asset.assigned_to.id}`} className="text-sg-forest hover:underline">{asset.assigned_to.name}</Link>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-neutral-100">
        {(['info', 'history', 'maintenance', 'activity'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold capitalize border-b-2 -mb-px transition-colors ${tab === t ? 'border-sg-lime text-sg-forest' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}
          >{t}</button>
        ))}
      </div>

      {tab === 'info' && (
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Identification</h3>
            <Field label="Asset tag" value={asset.asset_tag} mono />
            <Field label="Serial number" value={asset.serial} mono />
            {asset.asset_model && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">Model</div>
                <div className="text-sm text-neutral-800">{asset.asset_model.name}</div>
                {asset.asset_model.manufacturer && <div className="text-xs text-neutral-400 mt-0.5">{asset.asset_model.manufacturer}</div>}
              </div>
            )}
            <Field label="Make" value={asset.make} />
            <Field label="Model" value={asset.model} />
            <Field label="Model number" value={asset.model_number} mono />
          </div>
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Classification</h3>
            <Field label="Category" value={asset.category?.name} />
            <Field label="Location" value={asset.location?.name} />
            <Field label="Supplier" value={asset.supplier} />
            {asset.purchase_price && <Field label="Purchase price" value={`$${asset.purchase_price.toFixed(2)}`} />}
          </div>
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Dates</h3>
            <Field label="Purchase date" value={asset.purchase_date} />
            <Field label="Warranty expiry" value={asset.warranty_expiry} />
            <Field label="EOL date" value={asset.eol_date} />
            {asset.days_to_eol !== undefined && asset.days_to_eol !== null && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">EOL in</div>
                <EOLBadge days={asset.days_to_eol} />
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-neutral-100 p-6 space-y-5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">Audit</h3>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-0.5">Status</div>
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
              <p className="text-xs text-neutral-400 leading-relaxed">This asset has never been physically verified. Use the Audit button to record a check.</p>
            )}
          </div>
          {asset.notes && (
            <div className="bg-white rounded-2xl border border-neutral-100 p-6">
              <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Notes</h3>
              <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{asset.notes}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-2xl border border-neutral-100">
          {history.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-neutral-400">No assignment history</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {history.map((h) => (
                <div key={h.id} className="flex items-start gap-4 px-6 py-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${h.released_at ? 'bg-neutral-100' : 'bg-sg-lime/10'}`}>
                    <svg width="12" height="12" fill="none" stroke={h.released_at ? '#9CA3AF' : '#15803D'} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-800">
                      {h.person_name ? (
                        <Link to={`/people/${h.person_id}`} className="hover:text-sg-forest">{h.person_name}</Link>
                      ) : 'Unknown'}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {h.assigned_at ? new Date(h.assigned_at).toLocaleDateString() : ''}
                      {h.released_at && ` → ${new Date(h.released_at).toLocaleDateString()}`}
                    </div>
                    {h.note && <div className="text-xs text-neutral-500 mt-1 font-mono bg-neutral-50 rounded px-2 py-1">{h.note}</div>}
                  </div>
                  {!h.released_at && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sg-forest bg-sg-lime/10 px-2 py-0.5 rounded-full flex-shrink-0">Active</span>
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
            <button onClick={() => setShowMaintenance(true)} className="px-4 py-2 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90 flex items-center gap-1.5">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Log maintenance
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-100">
            {maintenance.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-neutral-400">No maintenance recorded for this asset</div>
            ) : (
              <div className="divide-y divide-neutral-50">
                {maintenance.map((m) => (
                  <div key={m.id} className="flex items-start gap-4 px-6 py-4">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${m.completed_date ? 'bg-neutral-100 text-neutral-500' : 'bg-amber-50 text-amber-600'}`}>
                      {m.completed_date ? m.maintenance_type : `${m.maintenance_type} · open`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-800">{m.title}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {m.start_date ?? ''}
                        {m.completed_date && ` → ${m.completed_date}`}
                        {m.provider && ` · ${m.provider}`}
                        {m.created_by_name && ` · logged by ${m.created_by_name}`}
                      </div>
                      {m.notes && <div className="text-xs text-neutral-500 mt-1 font-mono bg-neutral-50 rounded px-2 py-1">{m.notes}</div>}
                    </div>
                    {m.cost !== null && <span className="text-sm font-semibold text-neutral-700 flex-shrink-0">${m.cost.toFixed(2)}</span>}
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditingMaintenance(m)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100">
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => deleteMaintenanceMutation.mutate(m.id)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50">
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
        <div className="bg-white rounded-2xl border border-neutral-100">
          {activity.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-neutral-400">No recorded activity for this asset yet</div>
          ) : (
            <div className="divide-y divide-neutral-50">
              {activity.map((e) => {
                const changes = (e.payload as any)?.changes as Record<string, { from: unknown; to: unknown }> | undefined
                const note = (e.payload as any)?.note as string | undefined
                return (
                  <div key={e.id} className="flex items-start gap-4 px-6 py-3.5">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 ${e.action === 'asset.audited' ? 'bg-sg-lime/10 text-sg-forest' : 'bg-neutral-100 text-neutral-500'}`}>
                      {ACTIVITY_LABELS[e.action] ?? e.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-neutral-700">
                        <span className="font-semibold">{e.actor_name ?? 'System'}</span>
                        {e.action === 'asset.assigned' && (e.payload as any)?.person_name && (
                          <span> → {(e.payload as any).person_name}</span>
                        )}
                      </div>
                      {changes && (
                        <div className="text-xs text-neutral-400 mt-0.5 font-mono">
                          {Object.entries(changes).map(([f, c]) => `${f}: ${c.from ?? '—'} → ${c.to ?? '—'}`).join(' · ')}
                        </div>
                      )}
                      {note && <div className="text-xs text-neutral-500 mt-1 font-mono bg-neutral-50 rounded px-2 py-1">{note}</div>}
                    </div>
                    <span className="text-xs text-neutral-400 flex-shrink-0 pt-0.5 whitespace-nowrap">
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
