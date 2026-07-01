import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import type { Person, Location } from '../types'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'

function PersonForm({ person, onClose, locations }: { person?: Person; onClose: () => void; locations: Location[] }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    name: person?.name ?? '',
    email: person?.email ?? '',
    phone: person?.phone ?? '',
    department: person?.department ?? '',
    employee_id: person?.employee_id ?? '',
    location_id: person?.location_id?.toString() ?? '',
    notes: person?.notes ?? '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, location_id: form.location_id ? Number(form.location_id) : null }
      return person ? api.patch(`/people/${person.id}`, payload) : api.post('/people', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] })
      showToast(person ? 'Person updated' : 'Person added', 'success')
      onClose()
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const inputCls = 'w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm text-neutral-900 outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10'
  const labelCls = 'block text-xs font-semibold text-neutral-600 mb-1'

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Full name *</label>
          <input required className={inputCls} value={form.name} onChange={set('name')} placeholder="Jane Smith" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="jane@company.com" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={form.phone} onChange={set('phone')} placeholder="+1 555 0100" />
        </div>
        <div>
          <label className={labelCls}>Department</label>
          <input className={inputCls} value={form.department} onChange={set('department')} placeholder="Engineering" />
        </div>
        <div>
          <label className={labelCls}>Employee ID</label>
          <input className={inputCls} value={form.employee_id} onChange={set('employee_id')} placeholder="EMP-001" />
        </div>
        <div>
          <label className={labelCls}>Location</label>
          <select className={inputCls} value={form.location_id} onChange={set('location_id')}>
            <option value="">— None —</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea className={`${inputCls} resize-none`} rows={2} value={form.notes} onChange={set('notes')} placeholder="Any notes..." />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-neutral-100">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="px-4 py-2 rounded-lg gradient-bg text-white text-sm font-semibold hover:opacity-90 disabled:opacity-60">
          {mutation.isPending ? 'Saving...' : person ? 'Save changes' : 'Add person'}
        </button>
      </div>
    </form>
  )
}

export default function People() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [deleting, setDeleting] = useState<Person | null>(null)

  const params = new URLSearchParams()
  if (search) params.set('q', search)
  params.set('page', String(page))
  params.set('per_page', '50')

  const { data, isLoading } = useQuery<{ items: Person[]; total: number; pages: number }>({
    queryKey: ['people', params.toString()],
    queryFn: () => api.get(`/people?${params}`).then((r) => r.data),
  })
  const { data: locations = [] } = useQuery<Location[]>({
    queryKey: ['locations-flat'],
    queryFn: () => api.get('/locations').then((r) => r.data),
  })

  const people = data?.items ?? []

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/people/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['people'] })
      showToast('Person removed', 'success')
      setDeleting(null)
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">People</h1>
          <p className="text-sm text-neutral-500 mt-0.5">Device users and contacts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-xl gradient-bg text-white text-sm font-semibold hover:opacity-90 flex items-center gap-1.5">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add person
        </button>
      </div>

      <div className="mb-4 relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name, email, department..."
          className="w-full border border-neutral-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-sg-lime focus:ring-2 focus:ring-sg-lime/10 bg-white"
        />
      </div>

      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-neutral-100">
            <tr>
              <th className="text-left px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Department</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Location</th>
              <th className="text-right px-5 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider">Assets</th>
              <th className="w-20 px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="animate-pulse"><td colSpan={6} className="px-5 py-3"><div className="h-4 bg-neutral-100 rounded" /></td></tr>
              ))
            ) : people.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-neutral-400">
                {search ? 'No people match your search' : 'No people yet — add your team members'}
              </td></tr>
            ) : people.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link to={`/people/${p.id}`} className="font-semibold text-sm text-neutral-900 hover:text-sg-forest">{p.name}</Link>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-neutral-600">{p.department || '—'}</td>
                <td className="px-5 py-3 text-sm text-neutral-500">{p.email || '—'}</td>
                <td className="px-5 py-3 text-sm text-neutral-500">{p.location_name || '—'}</td>
                <td className="px-5 py-3 text-right">
                  {p.asset_count > 0 ? (
                    <span className="text-xs font-bold text-sg-forest bg-sg-lime/10 px-2 py-0.5 rounded-full">{p.asset_count}</span>
                  ) : <span className="text-xs text-neutral-300">0</span>}
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditing(p)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors">
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => setDeleting(p)} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(data?.pages ?? 1) > 1 && (
        <div className="flex justify-end gap-1 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">←</button>
          <span className="px-3 py-1.5 text-sm text-neutral-600">Page {page} of {data?.pages}</span>
          <button disabled={page >= (data?.pages ?? 1)} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg text-sm border border-neutral-200 disabled:opacity-40 hover:bg-neutral-50">→</button>
        </div>
      )}

      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null) }} title={editing ? 'Edit person' : 'Add person'} size="md">
        <PersonForm person={editing ?? undefined} onClose={() => { setShowCreate(false); setEditing(null) }} locations={locations} />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`Remove ${deleting?.name}?`}
        message="This person will be removed. Assets they held will show the history but the person record will be deleted."
        confirmLabel="Remove"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
