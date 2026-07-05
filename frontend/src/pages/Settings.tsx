import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import type { AppSettings, AssetStatus, AssetCategory, AuthUser } from '../types'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { useToast } from '../components/shared/Toast'
import { useAuth } from '../contexts/AuthContext'

// ─── Statuses ────────────────────────────────────────────────────────────────

const PRESET_COLORS = ['#84CC16', '#15803D', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280']

function StatusForm({ status, onClose }: { status?: AssetStatus; onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [name, setName] = useState(status?.name ?? '')
  const [color, setColor] = useState(status?.color ?? '#84CC16')

  const mutation = useMutation({
    mutationFn: () => {
      return status ? api.patch(`/statuses/${status.id}`, { name, color }) : api.post('/statuses', { name, color })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['statuses'] })
      showToast(status ? 'Status updated' : 'Status created', 'success')
      onClose()
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-ink-2 mb-1.5">Name *</label>
          <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Decommissioned" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-ink-2 mb-2">Color</label>
          <div className="flex gap-2 flex-wrap mb-3">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${color === c ? 'ring-2 ring-offset-2 ring-edge-hi scale-110' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-10 border border-edge rounded-control cursor-pointer" style={{ background: 'var(--field)' }} />
        </div>
        <div className="flex items-center gap-2 p-3 rounded-control" style={{ background: 'var(--field)', border: '1px solid var(--edge)' }}>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: color + '20', color }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
            {name || 'Preview'}
          </span>
        </div>
      </div>
      <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
        <button type="button" onClick={onClose} className="btn ghost">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn">{mutation.isPending ? 'Saving...' : status ? 'Save' : 'Create'}</button>
      </div>
    </form>
  )
}

function StatusesTab() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<AssetStatus | null>(null)
  const [deleting, setDeleting] = useState<AssetStatus | null>(null)

  const { data: statuses = [] } = useQuery<AssetStatus[]>({ queryKey: ['statuses'], queryFn: () => api.get('/statuses').then((r) => r.data) })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/statuses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['statuses'] }); showToast('Status deleted', 'success'); setDeleting(null) },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Status is in use — cannot delete', 'error'),
  })

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowCreate(true)} className="btn sm">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          New status
        </button>
      </div>
      <div className="panel divide-y divide-track overflow-hidden">
        {statuses.map((s) => (
          <div key={s.id} className="flex items-center gap-3 px-5 py-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
            <span className="flex-1 text-[13.5px] font-medium text-ink">{s.name}</span>
            <span className="text-xs font-mono text-ink-3">{s.color}</span>
            <div className="flex gap-1">
              <button onClick={() => setEditing(s)} className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-row-hover bg-transparent border-0 cursor-pointer">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => setDeleting(s)} className="p-1.5 rounded-lg text-ink-3 hover:text-danger-ink bg-transparent border-0 cursor-pointer">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null) }} title={editing ? 'Edit status' : 'New status'} size="sm">
        <StatusForm status={editing ?? undefined} onClose={() => { setShowCreate(false); setEditing(null) }} />
      </Modal>
      <ConfirmDialog open={!!deleting} title={`Delete "${deleting?.name}"?`} message="Assets with this status must be updated first." confirmLabel="Delete" onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── Categories ──────────────────────────────────────────────────────────────

function CategoriesTab() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [editingName, setEditingName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<AssetCategory | null>(null)
  const [newName, setNewName] = useState('')

  const { data: categories = [] } = useQuery<AssetCategory[]>({ queryKey: ['categories'], queryFn: () => api.get('/categories').then((r) => r.data) })

  const createMutation = useMutation({
    mutationFn: () => api.post('/categories', { name: newName }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); showToast('Category created', 'success'); setNewName(''); setShowCreate(false) },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.patch(`/categories/${id}`, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditingId(null) },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); showToast('Category deleted', 'success'); setDeleting(null) },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Category is in use', 'error'),
  })

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowCreate(true)} className="btn sm">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          New category
        </button>
      </div>
      <div className="panel divide-y divide-track overflow-hidden">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-5 py-3">
            {editingId === c.id ? (
              <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: c.id, name: editingName }) }}>
                <input autoFocus value={editingName} onChange={(e) => setEditingName(e.target.value)} className="input flex-1" style={{ padding: '6px 10px' }} />
                <button type="submit" className="text-xs font-semibold text-brand-ink bg-transparent border-0 cursor-pointer">Save</button>
                <button type="button" onClick={() => setEditingId(null)} className="text-xs text-ink-2 bg-transparent border-0 cursor-pointer">Cancel</button>
              </form>
            ) : (
              <>
                <span className="flex-1 text-[13.5px] font-medium text-ink">{c.name}</span>
                <div className="flex gap-1">
                  <button onClick={() => { setEditingId(c.id); setEditingName(c.name) }} className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-row-hover bg-transparent border-0 cursor-pointer">
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setDeleting(c)} className="p-1.5 rounded-lg text-ink-3 hover:text-danger-ink bg-transparent border-0 cursor-pointer">
                    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New category" size="sm">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}>
          <input required autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} className="input" placeholder="e.g. Networking Equipment" />
          <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
            <button type="button" onClick={() => setShowCreate(false)} className="btn ghost">Cancel</button>
            <button type="submit" disabled={createMutation.isPending} className="btn">{createMutation.isPending ? 'Creating...' : 'Create'}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog open={!!deleting} title={`Delete "${deleting?.name}"?`} message="Assets with this category will lose their category assignment." confirmLabel="Delete" onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── Users ───────────────────────────────────────────────────────────────────

function UserForm({ user, onClose }: { user?: AuthUser; onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', role: user?.role ?? 'viewer', password: '' })
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: () => {
      const payload: any = { name: form.name, email: form.email, role: form.role }
      if (form.password) payload.password = form.password
      return user ? api.patch(`/users/${user.id}`, payload) : api.post('/users', { ...payload, password: form.password })
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); showToast(user ? 'User updated' : 'User created', 'success'); onClose() },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const inputCls = 'input'
  const labelCls = 'block text-xs font-semibold text-ink-2 mb-1.5'

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="space-y-4">
        <div><label className={labelCls}>Name *</label><input required className={inputCls} value={form.name} onChange={set('name')} placeholder="Jane Smith" /></div>
        <div><label className={labelCls}>Email *</label><input required type="email" className={inputCls} value={form.email} onChange={set('email')} placeholder="jane@company.com" /></div>
        <div><label className={labelCls}>{user ? 'New password (leave blank to keep)' : 'Password *'}</label><input type="password" required={!user} className={inputCls} value={form.password} onChange={set('password')} placeholder="Min. 8 characters" /></div>
        <div>
          <label className={labelCls}>Role</label>
          <select className={inputCls} value={form.role} onChange={set('role')}>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>
      <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
        <button type="button" onClick={onClose} className="btn ghost">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn">{mutation.isPending ? 'Saving...' : user ? 'Save' : 'Create user'}</button>
      </div>
    </form>
  )
}

function UsersTab() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { user: me } = useAuth()
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<AuthUser | null>(null)
  const [deleting, setDeleting] = useState<AuthUser | null>(null)

  const { data: users = [] } = useQuery<AuthUser[]>({ queryKey: ['users'], queryFn: () => api.get('/users').then((r) => r.data) })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/users/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); showToast('User deleted', 'success'); setDeleting(null) },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={() => setShowCreate(true)} className="btn sm">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          New user
        </button>
      </div>
      <div className="panel divide-y divide-track overflow-hidden">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 px-5 py-3">
            <div className="avatar" style={{ width: 30, height: 30, fontSize: 12 }}>
              {u.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-ink">{u.name} {u.id === me?.id && <span className="text-xs text-ink-3">(you)</span>}</div>
              <div className="text-xs text-ink-2 bg-transparent border-0 cursor-pointer">{u.email}</div>
            </div>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-brand-tint text-brand-ink' : 'bg-field text-ink-2'}`}>{u.role}</span>
            {u.id !== me?.id && (
              <div className="flex gap-1">
                <button onClick={() => setEditing(u)} className="p-1.5 rounded-lg text-ink-3 hover:text-ink hover:bg-row-hover bg-transparent border-0 cursor-pointer">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => setDeleting(u)} className="p-1.5 rounded-lg text-ink-3 hover:text-danger-ink bg-transparent border-0 cursor-pointer">
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null) }} title={editing ? 'Edit user' : 'New user'} size="sm">
        <UserForm user={editing ?? undefined} onClose={() => { setShowCreate(false); setEditing(null) }} />
      </Modal>
      <ConfirmDialog open={!!deleting} title={`Delete ${deleting?.name}?`} message="This user will lose access to SimpleGear." confirmLabel="Delete" onConfirm={() => deleting && deleteMutation.mutate(deleting.id)} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── General ─────────────────────────────────────────────────────────────────

function GeneralTab() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { data: settings } = useQuery<AppSettings>({ queryKey: ['app-settings'], queryFn: () => api.get('/settings').then((r) => r.data) })
  const [interval, setInterval] = useState('')
  const [prefix, setPrefix] = useState('')

  useEffect(() => {
    if (settings) {
      setInterval(String(settings.audit_interval_months))
      setPrefix(settings.asset_tag_prefix)
    }
  }, [settings])

  const mutation = useMutation({
    mutationFn: () => api.patch('/settings', { audit_interval_months: Number(interval), asset_tag_prefix: prefix }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['app-settings'] }); showToast('Settings saved', 'success') },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  const inputCls = 'input'

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }} className="space-y-6">
      <div className="panel p-6">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-4 mt-0">Physical Audits</h3>
        <div className="max-w-md">
          <label className="block text-xs font-semibold text-ink-2 mb-1.5">Audit interval (months)</label>
          <input
            type="number" min="1" max="120" required
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className={inputCls}
          />
        </div>
        <p className="text-xs text-ink-3 mt-3 leading-relaxed max-w-md">
          When an asset is audited, its next audit is automatically scheduled this many months out.
          Overdue audits appear on the Dashboard and in the audit compliance report.
        </p>
      </div>

      <div className="panel p-6">
        <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-4 mt-0">Asset Tags</h3>
        <div className="max-w-md">
          <label className="block text-xs font-semibold text-ink-2 mb-1.5">Tag prefix</label>
          <input
            required maxLength={10}
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            className={`${inputCls} font-mono`}
            placeholder="SG-"
          />
        </div>
        <p className="text-xs text-ink-3 mt-3 leading-relaxed max-w-md">
          Assets created without a tag get the next sequential number with this prefix
          {prefix ? <> (next looks like <span className="font-mono text-ink-2">{prefix}0001</span>)</> : ''}.
          You can still type a tag manually, e.g. when migrating existing labels.
        </p>
      </div>

      <button type="submit" disabled={mutation.isPending || !interval || !prefix} className="btn">
        {mutation.isPending ? 'Saving...' : 'Save settings'}
      </button>
    </form>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

type Tab = 'general' | 'statuses' | 'categories' | 'users'

export default function Settings() {
  const [tab, setTab] = useState<Tab>('general')
  const TABS: { key: Tab; label: string }[] = [
    { key: 'general', label: 'General' },
    { key: 'statuses', label: 'Statuses' },
    { key: 'categories', label: 'Categories' },
    { key: 'users', label: 'Users' },
  ]

  return (
    <div className="max-w-3xl">
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`chip${tab === t.key ? ' on' : ''}`}>{t.label}</button>
        ))}
      </div>

      {tab === 'general' && <GeneralTab />}
      {tab === 'statuses' && <StatusesTab />}
      {tab === 'categories' && <CategoriesTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  )
}
