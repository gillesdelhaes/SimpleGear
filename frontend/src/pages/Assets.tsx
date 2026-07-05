import { useState, useRef } from 'react'
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
        <Link to={`/assets/${a.id}`} className="font-semibold text-[13px] text-ink hover:text-brand-ink" style={{ textDecoration: 'none' }}>
          {a.name}
        </Link>
        {a.asset_model ? (
          <div className="text-[11.5px] text-ink-3">{[a.asset_model.manufacturer, a.asset_model.name].filter(Boolean).join(' · ')}</div>
        ) : (a.make || a.model) ? (
          <div className="text-[11.5px] text-ink-3">{[a.make, a.model].filter(Boolean).join(' ')}</div>
        ) : null}
      </>
    ),
  },
  { key: 'asset_tag', label: 'Tag', sortKey: 'asset_tag', render: (a) => <span className="text-[11.5px] font-mono text-ink-2">{a.asset_tag || '—'}</span> },
  { key: 'serial', label: 'Serial', sortKey: 'serial', render: (a) => <span className="text-[11.5px] font-mono text-ink-3">{a.serial || '—'}</span> },
  { key: 'status', label: 'Status', sortKey: 'status', render: (a) => (a.status ? <StatusBadge status={a.status} /> : '—') },
  { key: 'category', label: 'Category', sortKey: 'category', render: (a) => <span className="text-xs text-ink-2">{a.category?.name || '—'}</span> },
  {
    key: 'assigned_to', label: 'Assigned to', sortKey: 'assigned_to',
    render: (a) => a.assigned_to
      ? <Link to={`/people/${a.assigned_to.id}`} className="text-xs text-ink-2 hover:text-brand-ink">{a.assigned_to.name}</Link>
      : <span className="text-xs text-ink-3">—</span>,
  },
  { key: 'location', label: 'Location', sortKey: 'location', render: (a) => <span className="text-xs text-ink-2">{a.location?.name || '—'}</span> },
  { key: 'supplier', label: 'Supplier', sortKey: 'supplier', render: (a) => <span className="text-xs text-ink-2">{a.supplier || '—'}</span> },
  { key: 'purchase_date', label: 'Purchased', sortKey: 'purchase_date', render: (a) => <span className="text-xs text-ink-2">{fmtDate(a.purchase_date)}</span> },
  { key: 'purchase_price', label: 'Price', sortKey: 'purchase_price', align: 'right', render: (a) => <span className="text-xs font-mono text-ink-2">{fmtMoney(a.purchase_price)}</span> },
  { key: 'warranty_expiry', label: 'Warranty until', sortKey: 'warranty_expiry', render: (a) => <span className="text-xs text-ink-2">{fmtDate(a.warranty_expiry)}</span> },
  { key: 'eol_date', label: 'EOL date', sortKey: 'eol_date', render: (a) => <span className="text-xs text-ink-2">{fmtDate(a.eol_date)}</span> },
  { key: 'eol', label: 'EOL', sortKey: 'eol_date', align: 'right', render: (a) => <EOLBadge days={a.days_to_eol ?? null} /> },
  { key: 'next_audit_date', label: 'Next audit', sortKey: 'next_audit_date', render: (a) => <span className={`text-xs ${a.days_to_next_audit != null && a.days_to_next_audit < 0 ? 'text-danger-ink font-semibold' : 'text-ink-2'}`}>{fmtDate(a.next_audit_date)}</span> },
  { key: 'last_audit_at', label: 'Last audit', sortKey: 'last_audit_at', render: (a) => <span className="text-xs text-ink-2">{a.last_audit_at ? new Date(a.last_audit_at + 'Z').toLocaleDateString() : '—'}</span> },
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

const labelCls = 'block text-xs font-semibold text-ink-2 mb-1.5'

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

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="grid grid-cols-2 gap-4">
        {models.length > 0 && (
          <div className="col-span-2">
            <label className={labelCls}>Asset model</label>
            <div className="selectwrap">
              <select className="select" value={form.asset_model_id} onChange={handleModelChange}>
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
            </div>
            {form.asset_model_id && (
              <p className="text-xs text-ink-3 mt-1">Make, model, and category auto-filled from model definition.</p>
            )}
          </div>
        )}
        <div className="col-span-2">
          <label className={labelCls}>Name *</label>
          <input required className="input" value={form.name} onChange={set('name')} placeholder="MacBook Pro 14" />
        </div>
        <div>
          <label className={labelCls}>Asset tag</label>
          <input className="input" value={form.asset_tag} onChange={set('asset_tag')} placeholder="Blank = auto (e.g. SG-0001)" />
        </div>
        <div>
          <label className={labelCls}>Serial number</label>
          <input className="input font-mono" value={form.serial} onChange={set('serial')} placeholder="C02XY1234" />
        </div>
        <div>
          <label className={labelCls}>Make</label>
          <input className="input" value={form.make} onChange={set('make')} placeholder="Apple" />
        </div>
        <div>
          <label className={labelCls}>Model</label>
          <input className="input" value={form.model} onChange={set('model')} placeholder="MacBook Pro" />
        </div>
        <div>
          <label className={labelCls}>Model number</label>
          <input className="input" value={form.model_number} onChange={set('model_number')} placeholder="MNW93LL/A" />
        </div>
        <div>
          <label className={labelCls}>Status *</label>
          <div className="selectwrap">
            <select required className="select" value={form.status_id} onChange={set('status_id')}>
              {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <div className="selectwrap">
            <select className="select" value={form.category_id} onChange={set('category_id')}>
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <div className="selectwrap">
            <select className="select" value={form.location_id} onChange={set('location_id')}>
              <option value="">— None —</option>
              {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls}>Purchase price</label>
          <input type="number" step="0.01" className="input" value={form.purchase_price} onChange={set('purchase_price')} placeholder="1299.00" />
        </div>
        <div>
          <label className={labelCls}>Purchase date</label>
          <input type="date" className="input" value={form.purchase_date} onChange={set('purchase_date')} />
        </div>
        <div>
          <label className={labelCls}>Warranty expiry</label>
          <input type="date" className="input" value={form.warranty_expiry} onChange={set('warranty_expiry')} />
        </div>
        <div>
          <label className={labelCls}>EOL date</label>
          <input type="date" className="input" value={form.eol_date} onChange={set('eol_date')} />
        </div>
        <div>
          <label className={labelCls}>Supplier</label>
          <input className="input" value={form.supplier} onChange={set('supplier')} placeholder="CDW, Apple Store..." />
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} placeholder="Any notes about this asset..." />
        </div>
      </div>

      <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
        <button type="button" onClick={onClose} className="btn ghost">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn" style={mutation.isPending ? { opacity: 0.6 } : undefined}>
          {mutation.isPending ? 'Saving…' : asset ? 'Save changes' : 'Create asset'}
        </button>
      </div>
    </form>
  )
}

function FilterGroup({ title, items, active, onPick }: {
  title: string
  items: { id: number; name: string; color?: string | null }[]
  active: string
  onPick: (v: string) => void
}) {
  const btnBase = 'w-full text-left text-xs px-2.5 py-1.5 rounded-control mb-0.5 flex items-center gap-2 border-0 cursor-pointer transition-colors'
  return (
    <>
      <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-2 mt-5 first:mt-0">{title}</h3>
      <button
        onClick={() => onPick('')}
        className={`${btnBase} ${!active ? 'bg-brand-tint text-brand-ink font-semibold' : 'bg-transparent text-ink-2 hover:bg-row-hover'}`}
      >All</button>
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onPick(active === String(it.id) ? '' : String(it.id))}
          className={`${btnBase} ${active === String(it.id) ? 'bg-brand-tint text-brand-ink font-semibold' : 'bg-transparent text-ink-2 hover:bg-row-hover'}`}
        >
          {it.color && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: it.color }} />}
          {it.name}
        </button>
      ))}
    </>
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
    <div className="flex gap-3.5 items-start">
      {/* Filter rail */}
      <aside className="panel w-[200px] flex-shrink-0 p-4 sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto scrollbar-thin">
        <FilterGroup title="Status" items={statuses} active={filterStatus} onPick={(v) => { setFilterStatus(v); setPage(1) }} />
        <FilterGroup title="Category" items={categories} active={filterCategory} onPick={(v) => { setFilterCategory(v); setPage(1) }} />
        <FilterGroup title="Location" items={locations} active={filterLocation} onPick={(v) => { setFilterLocation(v); setPage(1) }} />
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-3.5 flex-wrap">
          <div className="search" style={{ marginLeft: 0, flex: 1, width: 'auto', maxWidth: 380 }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search assets…"
              style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', font: 'inherit', color: 'var(--ink)' }}
            />
          </div>
          <button onClick={handleTemplate} title="Download a CSV template with the expected columns" className="btn ghost sm">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Template
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn ghost sm">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button onClick={handleExport} className="btn ghost sm">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
          <button onClick={() => setShowCreate(true)} className="btn sm">
            <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New asset
          </button>
        </div>

        {/* Bulk bar */}
        {selected.size > 0 && (
          <div className="panel flex items-center gap-3 px-4 py-2.5 mb-3.5">
            <span className="text-[13px] font-semibold text-brand-ink">{selected.size} selected</span>
            <div className="flex-1" />
            <div className="selectwrap" style={{ width: 220 }}>
              <select value={bulkAction} onChange={(e) => setBulkAction(e.target.value)} className="select" style={{ padding: '7px 13px' }}>
                <option value="">Bulk action…</option>
                <option value="audit">Mark as audited</option>
                <optgroup label="Set status">
                  {statuses.map((s) => <option key={s.id} value={`status:${s.id}`}>→ {s.name}</option>)}
                </optgroup>
                <optgroup label="Set location">
                  {locations.map((l) => <option key={l.id} value={`location:${l.id}`}>→ {l.name}</option>)}
                </optgroup>
                <option value="delete">Delete selected</option>
              </select>
            </div>
            <button disabled={!bulkAction} onClick={() => setShowBulkConfirm(true)} className="btn sm" style={!bulkAction ? { opacity: 0.4 } : undefined}>Apply</button>
            <button onClick={() => setSelected(new Set())} className="btn ghost sm">Clear</button>
          </div>
        )}

        {/* Table */}
        <div className="panel">
          <div className="tablewrap">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-10">
                    <input type="checkbox" checked={assets.length > 0 && selected.size === assets.length} onChange={toggleAll} className="rounded accent-b1" />
                  </th>
                  {visibleColumns.map((col) => (
                    <th
                      key={col.key}
                      onClick={col.sortKey ? () => handleSort(col.sortKey!) : undefined}
                      className={`select-none ${col.align === 'right' ? 'text-right' : ''} ${col.sortKey ? `cursor-pointer ${sort === col.sortKey ? 'text-brand-ink' : 'hover:text-ink'}` : ''}`}
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
                  <th className="w-10 text-right relative">
                    <button
                      onClick={() => setColPickerOpen((o) => !o)}
                      title="Choose columns"
                      className={`icon-btn ${colPickerOpen ? 'text-ink' : ''}`}
                      style={{ width: 30, height: 30 }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 4v16M15 4v16M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                      </svg>
                    </button>
                    {colPickerOpen && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setColPickerOpen(false)} />
                        <div className="overlay-surface absolute right-2 top-full mt-1 w-52 z-30 py-2 text-left normal-case tracking-normal" style={{ borderRadius: 16 }}>
                          <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Columns</div>
                          <div className="max-h-72 overflow-y-auto scrollbar-thin">
                            {ALL_COLUMNS.map((col) => (
                              <label key={col.key} className={`flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-normal text-ink ${col.always ? 'opacity-50' : 'cursor-pointer hover:bg-row-hover'}`}>
                                <input
                                  type="checkbox"
                                  className="rounded accent-b1"
                                  disabled={col.always}
                                  checked={visibleKeys.includes(col.key)}
                                  onChange={() => toggleColumn(col.key)}
                                />
                                {col.label}
                              </label>
                            ))}
                          </div>
                          <div className="border-t border-track mt-1 pt-1.5 px-3">
                            <button
                              onClick={() => { setVisibleKeys(DEFAULT_COLUMNS); localStorage.removeItem(COLUMNS_KEY) }}
                              className="text-xs font-semibold text-ink-3 hover:text-brand-ink bg-transparent border-0 cursor-pointer p-0"
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
              <tbody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={visibleColumns.length + 2}><div className="h-4 rounded" style={{ background: 'var(--field)' }} /></td>
                    </tr>
                  ))
                ) : assets.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="py-16 text-center text-[13px] text-ink-3">
                      {search || filterStatus || filterCategory ? 'No assets match your filters.' : 'No assets yet — create one or import a CSV.'}
                    </td>
                  </tr>
                ) : assets.map((asset) => (
                  <tr key={asset.id} aria-selected={selected.has(asset.id) || undefined}>
                    <td>
                      <input type="checkbox" checked={selected.has(asset.id)} onChange={() => toggleOne(asset.id)} className="rounded accent-b1" />
                    </td>
                    {visibleColumns.map((col) => (
                      <td key={col.key} className={col.align === 'right' ? 'text-right' : ''}>
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-track">
              <span className="text-xs font-mono text-ink-3">{data?.total} assets</span>
              <div className="flex gap-1.5 items-center">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn ghost sm" style={page === 1 ? { opacity: 0.4 } : undefined}>←</button>
                <span className="px-2 text-[13px] text-ink-2">Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn ghost sm" style={page >= totalPages ? { opacity: 0.4 } : undefined}>→</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New asset" size="lg">
        <AssetForm onClose={() => setShowCreate(false)} statuses={statuses} categories={categories} locations={locations} />
      </Modal>

      {/* Import result */}
      {importResult && (
        <Modal open={!!importResult} onClose={() => setImportResult(null)} title="Import complete" size="sm">
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Imported', value: importResult.imported, cls: 'text-brand-ink' },
                { label: 'Skipped', value: importResult.skipped, cls: 'text-ink-2' },
                { label: 'Failed', value: importResult.failed, cls: 'text-danger-ink' },
              ].map((s) => (
                <div key={s.label} className="so-block text-center" style={{ marginBottom: 0 }}>
                  <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
                  <div className="text-xs text-ink-3">{s.label}</div>
                </div>
              ))}
            </div>
            {importResult.errors?.length > 0 && (
              <div className="rounded-block p-3" style={{ background: 'var(--danger-bg)' }}>
                <div className="text-xs font-semibold text-danger-ink mb-2">Errors</div>
                {importResult.errors.slice(0, 5).map((e: string, i: number) => <div key={i} className="text-xs text-danger-ink">{e}</div>)}
              </div>
            )}
            <button onClick={() => setImportResult(null)} className="btn w-full">Done</button>
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
