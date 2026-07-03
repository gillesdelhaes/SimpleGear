import { useState, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import type { Asset, AssetModel, AssetStatus, AssetCategory, Location } from '../types'
import StatusBadge from '../components/shared/StatusBadge'
import EOLBadge from '../components/shared/EOLBadge'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'

const PER_PAGE = 50

// ─── Configurable columns ──────────────────────────────────────────────────────

interface ColumnDef {
  key: string
  label: string
  sortKey?: string // server-side sort field; absent = not sortable
  align?: 'right'
  always?: boolean // cannot be hidden
  render: (a: Asset) => React.ReactNode
}

const fmtDate = (d: string | null) => (d ? d : '—')
const fmtMoney = (v: number | null) => (v != null ? `$${v.toFixed(2)}` : '—')

const ALL_COLUMNS: ColumnDef[] = [
  {
    key: 'name', label: 'Asset', sortKey: 'name', always: true,
    render: (a) => (
      <>
        <Link to={`/assets/${a.id}`} className="font-semibold text-sm text-neutral-900 hover:text-sg-forest transition-colors">
          {a.name}
        </Link>
        {a.asset_model ? (
          <div className="text-xs text-neutral-400">{[a.asset_model.manufacturer, a.asset_model.name].filter(Boolean).join(' · ')}</div>
        ) : (a.make || a.model) ? (
          <div className="text-xs text-neutral-400">{[a.make, a.model].filter(Boolean).join(' ')}</div>
        ) : null}
      </>
    ),
  },
  { key: 'asset_tag', label: 'Tag', sortKey: 'asset_tag', render: (a) => <span className="text-xs font-mono text-neutral-600">{a.asset_tag || '—'}</span> },
  { key: 'serial', label: 'Serial', sortKey: 'serial', render: (a) => <span className="text-xs font-mono text-neutral-400">{a.serial || '—'}</span> },
  { key: 'status', label: 'Status', sortKey: 'status', render: (a) => (a.status ? <StatusBadge status={a.status} /> : '—') },
  { key: 'category', label: 'Category', sortKey: 'category', render: (a) => <span className="text-xs text-neutral-600">{a.category?.name || '—'}</span> },
  {
    key: 'assigned_to', label: 'Assigned to', sortKey: 'assigned_to',
    render: (a) => a.assigned_to
      ? <Link to={`/people/${a.assigned_to.id}`} className="text-xs text-neutral-600 hover:text-sg-forest">{a.assigned_to.name}</Link>
      : <span className="text-xs text-neutral-600">—</span>,
  },
  { key: 'location', label: 'Location', sortKey: 'location', render: (a) => <span className="text-xs text-neutral-600">{a.location?.name || '—'}</span> },
  { key: 'supplier', label: 'Supplier', sortKey: 'supplier', render: (a) => <span className="text-xs text-neutral-600">{a.supplier || '—'}</span> },
  { key: 'purchase_date', label: 'Purchased', sortKey: 'purchase_date', render: (a) => <span className="text-xs text-neutral-600">{fmtDate(a.purchase_date)}</span> },
  { key: 'purchase_price', label: 'Price', sortKey: 'purchase_price', align: 'right', render: (a) => <span className="text-xs font-mono text-neutral-600">{fmtMoney(a.purchase_price)}</span> },
  { key: 'warranty_expiry', label: 'Warranty until', sortKey: 'warranty_expiry', render: (a) => <span className="text-xs text-neutral-600">{fmtDate(a.warranty_expiry)}</span> },
  { key: 'eol_date', label: 'EOL date', sortKey: 'eol_date', render: (a) => <span className="text-xs text-neutral-600">{fmtDate(a.eol_date)}</span> },
  { key: 'eol', label: 'EOL', sortKey: 'eol_date', align: 'right', render: (a) => <EOLBadge days={a.days_to_eol ?? null} /> },
  { key: 'next_audit_date', label: 'Next audit', sortKey: 'next_audit_date', render: (a) => <span className={`text-xs ${a.days_to_next_audit != null && a.days_to_next_audit < 0 ? 'text-red-500 font-semibold' : 'text-neutral-600'}`}>{fmtDate(a.next_audit_date)}</span> },
  { key: 'last_audit_at', label: 'Last audit', sortKey: 'last_audit_at', render: (a) => <span className="text-xs text-neutral-600">{a.last_audit_at ? new Date(a.last_audit_at + 'Z').toLocaleDateString() : '—'}</span> },
]

const DEFAULT_COLUMNS = ['name', 'asset_tag', 'serial', 'status', 'category', 'assigned_to', 'location', 'eol']
const COLUMNS_KEY = 'sg_asset_columns'

function loadColumns(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(COLUMNS_KEY) ?? '')
    if (Array.isArray(stored) && stored.length > 0) {
      return ALL_COLUMNS.map((c) => c.key).filter((k) => k === 'name' || stored.includes(k))
    }
  } catch { /* fall through */ }
  return DEFAULT_COLUMNS
}

function AssetForm({ asset, onClose, statuses, categories, locations }: {
  asset?: Asset
  onClose: () => void
  statuses: AssetStatus[]
  categories: AssetCategory[]
  locations: Location[]
}) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    name: asset?.name ?? '',
    asset_tag: asset?.asset_tag ?? '',
    serial: asset?.serial ?? '',
    asset_model_id: asset?.asset_model_id?.toString() ?? '',
    make: asset?.make ?? '',
    model: asset?.model ?? '',
    model_number: asset?.model_number ?? '',
    status_id: asset?.status?.id ?? statuses[0]?.id ?? '',
    category_id: asset?.category?.id ?? '',
    location_id: asset?.location?.id ?? '',
    purchase_price: asset?.purchase_price?.toString() ?? '',
    purchase_date: asset?.purchase_date ?? '',
    warranty_expiry: asset?.warranty_expiry ?? '',
    eol_date: asset?.eol_date ?? '',
    supplier: asset?.supplier ?? '',
    notes: asset?.notes ?? '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const { data: models = [] } = useQuery<AssetModel[]>({ queryKey: ['models'], queryFn: () => api.get('/models').then(r => r.data) })

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value
    setForm(p => ({ ...p, asset_model_id: id }))
    if (id) {
      const m = models.find(m => m.id === Number(id))
      if (m) {
        setForm(p => ({
          ...p,
          asset_model_id: id,
          make: m.manufacturer ?? p.make,
          model: m.name,
          model_number: m.model_number ?? p.model_number,
          category_id: m.category_id ? String(m.category_id) : p.category_id,
        }))
      }
    }
  }

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        asset_model_id: form.asset_model_id ? Number(form.asset_model_id) : null,
        status_id: Number(form.status_id),
        category_id: form.category_id ? Number(form.category_id) : null,
        location_id: form.location_id ? Number(form.location_id) : null,
        purchase_price: form.purchase_price ? parseFloat(form.purchase_price) : null,
        purchase_date: form.purchase_date || null,
        warranty_expiry: form.warranty_expiry || null,
        eol_date: form.eol_date || null,
      }
      return asset ? api.patch(`/assets/${asset.id}`, payload) : api.post('/assets', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      showToast(asset ? 'Asset updated' : 'Asset created', 'success')
      onClose()
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const labelCls = 'block text-xs font-semibold text-neutral-600 mb-1'
  const inputCls = 'w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10'

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="grid grid-cols-2 gap-4">
        {models.length > 0 && (
          <div className="col-span-2">
            <label className={labelCls}>Asset model</label>
            <select className={inputCls} value={form.asset_model_id} onChange={handleModelChange}>
              <option value="">— Select a model (optional) —</option>
              {Object.entries(
                models.reduce<Record<string, AssetModel[]>>((acc, m) => {
                  const g = m.manufacturer || 'Other'
                  if (!acc[g]) acc[g] = []
                  acc[g].push(m)
                  return acc
                }, {})
              ).sort(([a], [b]) => a.localeCompare(b)).map(([mfr, items]) => (
                <optgroup key={mfr} label={mfr}>
                  {items.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </optgroup>
              ))}
            </select>
            {form.asset_model_id && (
              <p className="text-xs text-neutral-400 mt-1">Make, model, and category auto-filled from model definition.</p>
            )}
          </div>
        )}
        <div className="col-span-2">
          <label className={labelCls}>Name *</label>
          <input required className={inputCls} value={form.name} onChange={set('name')} placeholder="MacBook Pro 14" />
        </div>
        <div>
          <label className={labelCls}>Asset tag</label>
          <input className={inputCls} value={form.asset_tag} onChange={set('asset_tag')} placeholder="Blank = auto (e.g. SG-0001)" />
        </div>
        <div>
          <label className={labelCls}>Serial number</label>
          <input className={`${inputCls} font-mono`} value={form.serial} onChange={set('serial')} placeholder="C02XY1234" />
        </div>
        <div>
          <label className={labelCls}>Make</label>
          <input className={inputCls} value={form.make} onChange={set('make')} placeholder="Apple" />
        </div>
        <div>
          <label className={labelCls}>Model</label>
          <input className={inputCls} value={form.model} onChange={set('model')} placeholder="MacBook Pro" />
        </div>
        <div>
          <label className={labelCls}>Model number</label>
          <input className={inputCls} value={form.model_number} onChange={set('model_number')} placeholder="MNW93LL/A" />
        </div>
        <div>
          <label className={labelCls}>Status *</label>
          <select required className={inputCls} value={form.status_id} onChange={set('status_id')}>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <select className={inputCls} value={form.category_id} onChange={set('category_id')}>
            <option value="">— None —</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <select className={inputCls} value={form.location_id} onChange={set('location_id')}>
            <option value="">— None —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Purchase price</label>
          <input type="number" step="0.01" className={inputCls} value={form.purchase_price} onChange={set('purchase_price')} placeholder="1299.00" />
        </div>
        <div>
          <label className={labelCls}>Purchase date</label>
          <input type="date" className={inputCls} value={form.purchase_date} onChange={set('purchase_date')} />
        </div>
        <div>
          <label className={labelCls}>Warranty expiry</label>
          <input type="date" className={inputCls} value={form.warranty_expiry} onChange={set('warranty_expiry')} />
        </div>
        <div>
          <label className={labelCls}>EOL date</label>
          <input type="date" className={inputCls} value={form.eol_date} onChange={set('eol_date')} />
        </div>
        <div>
          <label className={labelCls}>Supplier</label>
          <input className={inputCls} value={form.supplier} onChange={set('supplier')} placeholder="CDW, Apple Store..." />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes} onChange={set('notes')} placeholder="Any notes about this asset..." />
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg gradient-bg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : asset ? 'Save changes' : 'Create asset'}
        </button>
      </div>
    </form>
  )
}

export default function Assets() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [bulkAction, setBulkAction] = useState('')
  const [showBulkConfirm, setShowBulkConfirm] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const [visibleKeys, setVisibleKeys] = useState<string[]>(loadColumns)
  const [colPickerOpen, setColPickerOpen] = useState(false)
  const [sort, setSort] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const visibleColumns = ALL_COLUMNS.filter((c) => visibleKeys.includes(c.key))

  const toggleColumn = (key: string) => {
    setVisibleKeys((prev) => {
      const next = prev.includes(key)
        ? prev.filter((k) => k !== key)
        : ALL_COLUMNS.map((c) => c.key).filter((k) => prev.includes(k) || k === key)
      localStorage.setItem(COLUMNS_KEY, JSON.stringify(next))
      return next
    })
  }

  const handleSort = (sortKey: string) => {
    if (sort === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(sortKey)
      setSortDir('asc')
    }
    setPage(1)
  }

  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (filterStatus) params.set('status_id', filterStatus)
  if (filterCategory) params.set('category_id', filterCategory)
  if (filterLocation) params.set('location_id', filterLocation)
  if (sort) { params.set('sort', sort); params.set('dir', sortDir) }
  params.set('page', String(page))
  params.set('per_page', String(PER_PAGE))

  const { data, isLoading } = useQuery<{ items: Asset[]; total: number; pages: number }>({
    queryKey: ['assets', params.toString()],
    queryFn: () => api.get(`/assets?${params}`).then((r) => r.data),
  })
  const { data: statuses = [] } = useQuery<AssetStatus[]>({ queryKey: ['statuses'], queryFn: () => api.get('/statuses').then((r) => r.data) })
  const { data: categories = [] } = useQuery<AssetCategory[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data) })
  const { data: locations = [] } = useQuery<Location[]>({ queryKey: ['locations-flat'], queryFn: () => api.get('/locations').then((r) => r.data) })

  const assets = data?.items ?? []
  const totalPages = data?.pages ?? 1

  const toggleAll = () => {
    if (selected.size === assets.length) setSelected(new Set())
    else setSelected(new Set(assets.map((a) => a.id)))
  }
  const toggleOne = (id: number) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const bulkMutation = useMutation({
    mutationFn: (payload: any) => api.post('/assets/bulk', payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      setSelected(new Set())
      setBulkAction('')
      showToast(`Bulk ${vars.action} applied to ${vars.ids.length} assets`, 'success')
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Bulk action failed', 'error'),
  })

  const handleBulkConfirm = () => {
    if (!bulkAction) return
    const ids = Array.from(selected)
    if (bulkAction === 'delete') {
      bulkMutation.mutate({ action: 'delete', ids })
    } else if (bulkAction === 'audit') {
      bulkMutation.mutate({ action: 'audit', ids })
    } else if (bulkAction.startsWith('status:')) {
      bulkMutation.mutate({ action: 'status', ids, status_id: parseInt(bulkAction.split(':')[1]) })
    } else if (bulkAction.startsWith('location:')) {
      bulkMutation.mutate({ action: 'location', ids, location_id: parseInt(bulkAction.split(':')[1]) })
    }
    setShowBulkConfirm(false)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post('/assets/import', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImportResult(data)
      qc.invalidateQueries({ queryKey: ['assets'] })
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Import failed', 'error')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleExport = async () => {
    const { data } = await api.get('/assets/export', { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a'); a.href = url; a.download = 'assets.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleTemplate = async () => {
    const { data } = await api.get('/assets/import/template', { responseType: 'blob' })
    const url = URL.createObjectURL(data)
    const a = document.createElement('a'); a.href = url; a.download = 'simplegear-assets-template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Filter sidebar */}
      <aside className="w-[200px] flex-shrink-0 bg-white border-r border-neutral-100 overflow-y-auto p-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3">Status</h3>
        <button
          onClick={() => setFilterStatus('')}
          className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg mb-0.5 transition-colors ${!filterStatus ? 'bg-sg-lime/10 text-sg-forest font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}
        >All</button>
        {statuses.map((s) => (
          <button
            key={s.id}
            onClick={() => setFilterStatus(filterStatus === String(s.id) ? '' : String(s.id))}
            className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg mb-0.5 flex items-center gap-2 transition-colors ${filterStatus === String(s.id) ? 'bg-sg-lime/10 text-sg-forest font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            {s.name}
          </button>
        ))}

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3 mt-5">Category</h3>
        <button onClick={() => setFilterCategory('')} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg mb-0.5 transition-colors ${!filterCategory ? 'bg-sg-lime/10 text-sg-forest font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>All</button>
        {categories.map((c) => (
          <button key={c.id} onClick={() => setFilterCategory(filterCategory === String(c.id) ? '' : String(c.id))} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg mb-0.5 transition-colors ${filterCategory === String(c.id) ? 'bg-sg-lime/10 text-sg-forest font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>
            {c.name}
          </button>
        ))}

        <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3 mt-5">Location</h3>
        <button onClick={() => setFilterLocation('')} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg mb-0.5 transition-colors ${!filterLocation ? 'bg-sg-lime/10 text-sg-forest font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>All</button>
        {locations.map((l) => (
          <button key={l.id} onClick={() => setFilterLocation(filterLocation === String(l.id) ? '' : String(l.id))} className={`w-full text-left text-xs px-2.5 py-1.5 rounded-lg mb-0.5 transition-colors ${filterLocation === String(l.id) ? 'bg-sg-lime/10 text-sg-forest font-semibold' : 'text-neutral-600 hover:bg-neutral-50'}`}>
            {l.name}
          </button>
        ))}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-neutral-100 px-6 py-4 flex items-center gap-3 flex-shrink-0">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search assets..."
              className="w-full border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10"
            />
          </div>
          <button onClick={handleTemplate} title="Download a CSV template with the expected columns" className="px-3 py-2 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Template
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="px-3 py-2 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            {importing ? 'Importing...' : 'Import CSV'}
          </button>
          <button onClick={handleExport} className="px-3 py-2 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90 flex items-center gap-1.5">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New asset
          </button>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="bg-sg-forest/5 border-b border-sg-forest/10 px-6 py-3 flex items-center gap-3 flex-shrink-0">
            <span className="text-sm font-semibold text-sg-forest">{selected.size} selected</span>
            <div className="flex-1" />
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="border border-neutral-200 rounded-lg px-3 py-1.5 text-sm outline-none"
            >
              <option value="">Bulk action...</option>
              <option value="audit">Mark as audited</option>
              <optgroup label="Set status">
                {statuses.map((s) => <option key={s.id} value={`status:${s.id}`}>→ {s.name}</option>)}
              </optgroup>
              <optgroup label="Set location">
                {locations.map((l) => <option key={l.id} value={`location:${l.id}`}>→ {l.name}</option>)}
              </optgroup>
              <option value="delete">Delete selected</option>
            </select>
            <button
              disabled={!bulkAction}
              onClick={() => setShowBulkConfirm(true)}
              className="px-3 py-1.5 rounded-lg gradient-bg text-white text-sm font-semibold disabled:opacity-40"
            >Apply</button>
            <button onClick={() => setSelected(new Set())} className="text-sm text-neutral-500 hover:text-neutral-700">Clear</button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full">
            <thead className="bg-white border-b border-neutral-100 sticky top-0 z-10">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={assets.length > 0 && selected.size === assets.length} onChange={toggleAll} className="rounded" />
                </th>
                {visibleColumns.map((col) => (
                  <th
                    key={col.key}
                    onClick={col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                    className={`px-3 py-3 text-xs font-bold uppercase tracking-wider select-none ${col.align === 'right' ? 'text-right' : 'text-left'} ${
                      col.sortKey
                        ? `cursor-pointer transition-colors ${sort === col.sortKey ? 'text-sg-forest' : 'text-neutral-500 hover:text-neutral-800'}`
                        : 'text-neutral-500'
                    }`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortKey && sort === col.sortKey && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className={sortDir === 'desc' ? 'rotate-180' : ''}>
                          <path d="M5 2l3.5 4h-7L5 2z" />
                        </svg>
                      )}
                    </span>
                  </th>
                ))}
                <th className="w-10 px-2 py-3 text-right relative">
                  <button
                    onClick={() => setColPickerOpen((o) => !o)}
                    title="Choose columns"
                    className={`p-1.5 rounded-lg transition-colors ${colPickerOpen ? 'bg-neutral-100 text-neutral-700' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100'}`}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M15 4v16M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                    </svg>
                  </button>
                  {colPickerOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setColPickerOpen(false)} />
                      <div className="absolute right-2 top-full mt-1 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl z-30 py-2 text-left normal-case tracking-normal">
                        <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-neutral-400">Columns</div>
                        <div className="max-h-72 overflow-y-auto scrollbar-thin">
                          {ALL_COLUMNS.map((col) => (
                            <label key={col.key} className={`flex items-center gap-2.5 px-3 py-1.5 text-sm font-normal text-neutral-700 ${col.always ? 'opacity-50' : 'cursor-pointer hover:bg-neutral-50'}`}>
                              <input
                                type="checkbox"
                                className="rounded"
                                disabled={col.always}
                                checked={visibleKeys.includes(col.key)}
                                onChange={() => toggleColumn(col.key)}
                              />
                              {col.label}
                            </label>
                          ))}
                        </div>
                        <div className="border-t border-neutral-100 mt-1 pt-1.5 px-3">
                          <button
                            onClick={() => { setVisibleKeys(DEFAULT_COLUMNS); localStorage.removeItem(COLUMNS_KEY) }}
                            className="text-xs font-semibold text-neutral-400 hover:text-sg-forest"
                          >
                            Reset to default
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {isLoading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={visibleColumns.length + 2} className="px-4 py-3"><div className="h-4 bg-neutral-100 rounded" /></td>
                  </tr>
                ))
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 2} className="px-4 py-16 text-center text-sm text-neutral-400">
                    {search || filterStatus || filterCategory ? 'No assets match your filters' : 'No assets yet — create one or import a CSV'}
                  </td>
                </tr>
              ) : assets.map((asset) => (
                <tr key={asset.id} className={`hover:bg-white transition-colors ${selected.has(asset.id) ? 'bg-sg-lime/3' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(asset.id)} onChange={() => toggleOne(asset.id)} className="rounded" />
                  </td>
                  {visibleColumns.map((col) => (
                    <td key={col.key} className={`px-3 py-3 ${col.align === 'right' ? 'text-right' : ''}`}>
                      {col.render(asset)}
                    </td>
                  ))}
                  <td />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white border-t border-neutral-100 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-neutral-500">{data?.total} assets</span>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">←</button>
              <span className="px-3 py-1.5 text-sm text-neutral-600">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">→</button>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New asset" size="lg">
        <AssetForm onClose={() => setShowCreate(false)} statuses={statuses} categories={categories} locations={locations} />
      </Modal>

      {/* Import result */}
      {importResult && (
        <Modal open={!!importResult} onClose={() => setImportResult(null)} title="Import complete" size="sm">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Imported', value: importResult.imported, color: 'text-sg-forest' },
                { label: 'Skipped', value: importResult.skipped, color: 'text-neutral-500' },
                { label: 'Failed', value: importResult.failed, color: 'text-red-500' },
              ].map((s) => (
                <div key={s.label} className="bg-neutral-50 rounded-xl p-3 text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-neutral-500">{s.label}</div>
                </div>
              ))}
            </div>
            {importResult.errors?.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3">
                <div className="text-xs font-semibold text-red-700 mb-2">Errors</div>
                {importResult.errors.slice(0, 5).map((e: string, i: number) => <div key={i} className="text-xs text-red-600">{e}</div>)}
              </div>
            )}
            <button onClick={() => setImportResult(null)} className="w-full gradient-bg text-white py-2 rounded-xl text-sm font-semibold">Done</button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={showBulkConfirm}
        title={bulkAction === 'delete' ? `Delete ${selected.size} assets?` : `Apply to ${selected.size} assets?`}
        message={bulkAction === 'delete' ? 'This cannot be undone. Assignment history will be preserved.' : 'This will update all selected assets.'}
        confirmLabel={bulkAction === 'delete' ? 'Delete all' : 'Apply'}
        danger={bulkAction === 'delete'}
        onConfirm={handleBulkConfirm}
        onCancel={() => setShowBulkConfirm(false)}
      />
    </div>
  )
}
