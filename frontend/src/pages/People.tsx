import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import type { Person, Location } from '../types'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import CsvImport from '../components/shared/CsvImport'
import { useToast } from '../components/shared/Toast'

const labelCls = 'block text-xs font-semibold text-ink-2 mb-1.5'

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

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelCls}>Full name *</label>
          <input required className="input" value={form.name} onChange={set('name')} placeholder="Jane Smith" />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="jane@company.com" />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className="input" value={form.phone} onChange={set('phone')} placeholder="+1 555 0100" />
        </div>
        <div>
          <label className={labelCls}>Department</label>
          <input className="input" value={form.department} onChange={set('department')} placeholder="Engineering" />
        </div>
        <div>
          <label className={labelCls}>Employee ID</label>
          <input className="input" value={form.employee_id} onChange={set('employee_id')} placeholder="EMP-001" />
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
        <div className="col-span-2">
          <label className={labelCls}>Notes</label>
          <textarea className="input resize-none" rows={2} value={form.notes} onChange={set('notes')} placeholder="Any notes..." />
        </div>
      </div>
      <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
        <button type="button" onClick={onClose} className="btn ghost">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn" style={mutation.isPending ? { opacity: 0.6 } : undefined}>
          {mutation.isPending ? 'Saving…' : person ? 'Save changes' : 'Add person'}
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
    <div className="max-w-[1100px]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3.5 flex-wrap">
        <div className="search" style={{ marginLeft: 0, flex: 1, width: 'auto', maxWidth: 380 }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, email, department…"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', font: 'inherit', color: 'var(--ink)' }}
          />
        </div>
        <CsvImport
          importPath="/people/import"
          templatePath="/people/import/template"
          templateFilename="simplegear-people-template.csv"
          invalidateKeys={[['people'], ['people-list'], ['locations']]}
        />
        <button
          onClick={async () => {
            const { data } = await api.get('/people/export', { responseType: 'blob' })
            const url = URL.createObjectURL(data)
            const a = document.createElement('a'); a.href = url; a.download = 'simplegear-people.csv'; a.click()
            URL.revokeObjectURL(url)
          }}
          className="btn ghost sm"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Export
        </button>
        <button onClick={() => setShowCreate(true)} className="btn sm">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add person
        </button>
      </div>

      {/* Table */}
      <div className="panel">
        <div className="tablewrap">
          <table className="w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Email</th>
                <th>Location</th>
                <th className="text-right">Assets</th>
                <th className="w-20" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse"><td colSpan={6}><div className="h-4 rounded" style={{ background: 'var(--field)' }} /></td></tr>
                ))
              ) : people.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-[13px] text-ink-3">
                  {search ? 'No people match your search.' : 'No people yet — add your team members.'}
                </td></tr>
              ) : people.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: 11 }}>
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      <Link to={`/people/${p.id}`} className="font-semibold text-[13px] text-ink hover:text-brand-ink" style={{ textDecoration: 'none' }}>{p.name}</Link>
                    </div>
                  </td>
                  <td className="text-[13px] text-ink-2">{p.department || '—'}</td>
                  <td className="text-[13px] text-ink-3">{p.email || '—'}</td>
                  <td className="text-[13px] text-ink-3">{p.location_name || '—'}</td>
                  <td className="text-right">
                    {p.asset_count > 0 ? (
                      <span className="pill use plain">{p.asset_count}</span>
                    ) : <span className="text-xs text-ink-3">0</span>}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-row-hover bg-transparent border-0 cursor-pointer">
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => setDeleting(p)} aria-label={`Remove ${p.name}`} className="p-1.5 rounded-lg text-ink-3 hover:text-danger-ink bg-transparent border-0 cursor-pointer">
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-track">
            <span className="text-xs font-mono text-ink-3">{data?.total} people</span>
            <div className="flex gap-1.5 items-center">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn ghost sm" style={page === 1 ? { opacity: 0.4 } : undefined}>←</button>
              <span className="px-2 text-[13px] text-ink-2">Page {page} of {data?.pages}</span>
              <button disabled={page >= (data?.pages ?? 1)} onClick={() => setPage(p => p + 1)} className="btn ghost sm" style={page >= (data?.pages ?? 1) ? { opacity: 0.4 } : undefined}>→</button>
            </div>
          </div>
        )}
      </div>

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
