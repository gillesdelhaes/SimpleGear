import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import type { AssetCategory, AssetModel } from '../types'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import CsvImport from '../components/shared/CsvImport'
import { useToast } from '../components/shared/Toast'

function ModelForm({ model, onClose }: { model?: AssetModel; onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    name: model?.name ?? '',
    manufacturer: model?.manufacturer ?? '',
    model_number: model?.model_number ?? '',
    category_id: model?.category_id?.toString() ?? '',
    eol_years: model?.eol_years?.toString() ?? '',
    notes: model?.notes ?? '',
  })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const { data: categories = [] } = useQuery<AssetCategory[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) })

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        category_id: form.category_id ? Number(form.category_id) : null,
        eol_years: form.eol_years ? Number(form.eol_years) : null,
        manufacturer: form.manufacturer || null,
        model_number: form.model_number || null,
        notes: form.notes || null,
      }
      return model ? api.patch(`/models/${model.id}`, payload) : api.post('/models', payload)
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }); showToast(model ? 'Model updated' : 'Model created', 'success'); onClose() },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const inputCls = 'w-full border border-neutral-200 rounded-[10px] px-3.5 py-2.5 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10'
  const labelCls = 'block text-[13px] font-medium text-neutral-800 mb-1.5'

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Model name *</label>
          <input required autoFocus className={inputCls} value={form.name} onChange={set('name')} placeholder="MacBook Air M5 16GB" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Manufacturer</label>
            <input className={inputCls} value={form.manufacturer} onChange={set('manufacturer')} placeholder="Apple" />
          </div>
          <div>
            <label className={labelCls}>Model number</label>
            <input className={`${inputCls} font-mono`} value={form.model_number} onChange={set('model_number')} placeholder="MLXY3LL/A" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={form.category_id} onChange={set('category_id')}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>EOL (years from purchase)</label>
            <input type="number" min="1" max="20" className={inputCls} value={form.eol_years} onChange={set('eol_years')} placeholder="3" />
          </div>
        </div>
        <div>
          <label className={labelCls}>Notes</label>
          <textarea className={inputCls} rows={2} value={form.notes} onChange={set('notes')} placeholder="Optional notes about this model" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg gradient-bg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">{mutation.isPending ? 'Saving...' : model ? 'Save' : 'Create'}</button>
      </div>
    </form>
  )
}

function UsageBar({ model }: { model: AssetModel }) {
  const total = model.asset_count
  const used = model.assigned_count
  const available = total - used
  if (total === 0) {
    return <span className="text-xs text-neutral-300">No assets yet</span>
  }
  const pct = Math.round((used / total) * 100)
  return (
    <div className="w-44 flex-shrink-0">
      <div className="flex justify-between mb-1">
        <span className="text-[10px] font-semibold text-neutral-500">{used} in use</span>
        <span className="text-[10px] font-semibold text-sg-forest">{available} available</span>
      </div>
      <div className="h-1.5 bg-sg-lime/20 rounded-full overflow-hidden">
        <div className="h-full gradient-bg rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Models() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<AssetModel | null>(null)
  const [deleting, setDeleting] = useState<AssetModel | null>(null)

  const { data: models = [] } = useQuery<AssetModel[]>({ queryKey: ['models'], queryFn: () => api.get('/models').then(r => r.data) })
  const { data: categories = [] } = useQuery<AssetCategory[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then(r => r.data) })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/models/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }); showToast('Model deleted', 'success'); setDeleting(null) },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const grouped = models.reduce<Record<string, AssetModel[]>>((acc, m) => {
    const key = m.manufacturer || 'Other'
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  const totalAssets = models.reduce((sum, m) => sum + m.asset_count, 0)

  return (
    <div className="px-7 pt-7 pb-12 max-w-4xl">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-neutral-500">
          {models.length} model{models.length !== 1 ? 's' : ''} · {totalAssets} asset{totalAssets !== 1 ? 's' : ''} catalogued
        </p>
        <div className="flex items-center gap-2">
          <CsvImport
            importPath="/models/import"
            templatePath="/models/import/template"
            templateFilename="simplegear-models-template.csv"
            invalidateKeys={[['models'], ['categories']]}
          />
          <button
            onClick={async () => {
              const { data } = await api.get('/models/export', { responseType: 'blob' })
              const url = URL.createObjectURL(data)
              const a = document.createElement('a'); a.href = url; a.download = 'simplegear-models.csv'; a.click()
              URL.revokeObjectURL(url)
            }}
            className="px-3 py-2 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export
          </button>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90 flex items-center gap-1.5">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            New model
          </button>
        </div>
      </div>

      {models.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-neutral-100 p-10 text-center">
          <div className="text-2xl mb-2">📦</div>
          <p className="text-sm font-medium text-neutral-700 mb-1">No models yet</p>
          <p className="text-xs text-neutral-400">Create models like "MacBook Air M5 16GB" to standardise your asset catalogue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([manufacturer, items]) => (
            <div key={manufacturer} className="bg-white rounded-[14px] border border-neutral-100 shadow-sm">
              <div className="px-5 py-2.5 border-b border-neutral-50">
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">{manufacturer}</span>
              </div>
              <div className="divide-y divide-neutral-50">
                {items.map(m => (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-800">{m.name}</span>
                        <span className="text-xs font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">{m.asset_count}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {m.model_number && <span className="text-xs font-mono text-neutral-400">{m.model_number}</span>}
                        {m.category_id && <span className="text-xs text-neutral-400">{categories.find(c => c.id === m.category_id)?.name}</span>}
                        {m.eol_years && <span className="text-xs text-neutral-400">EOL {m.eol_years}y</span>}
                      </div>
                    </div>
                    <UsageBar model={m} />
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditing(m)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100">
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleting(m)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50">
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null) }} title={editing ? 'Edit model' : 'New model'} size="sm">
        <ModelForm model={editing ?? undefined} onClose={() => { setShowCreate(false); setEditing(null) }} />
      </Modal>
      <ConfirmDialog open={!!deleting} title={`Delete "${deleting?.name}"?`} message="Assets using this model will have their model link cleared." confirmLabel="Delete" onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} onCancel={() => setDeleting(null)} />
    </div>
  )
}
