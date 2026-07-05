import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/axios'
import type { LocationTree } from '../types'
import Modal from '../components/shared/Modal'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import CsvImport from '../components/shared/CsvImport'
import { useToast } from '../components/shared/Toast'

const labelCls = 'block text-xs font-semibold text-ink-2 mb-1.5'

function LocationForm({ location, parentId, onClose, allLocations }: {
  location?: LocationTree
  parentId?: number
  onClose: () => void
  allLocations: LocationTree[]
}) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [name, setName] = useState(location?.name ?? '')
  const [pid, setPid] = useState(location?.parent_id?.toString() ?? parentId?.toString() ?? '')

  const flattenLocations = (locs: LocationTree[], depth = 0): { id: number; name: string; depth: number }[] =>
    locs.flatMap((l) => [{ id: l.id, name: l.name, depth }, ...flattenLocations(l.children ?? [], depth + 1)])

  const flat = flattenLocations(allLocations).filter((l) => !location || l.id !== location.id)

  const mutation = useMutation({
    mutationFn: () => {
      const payload = { name, parent_id: pid ? Number(pid) : null }
      return location ? api.patch(`/locations/${location.id}`, payload) : api.post('/locations', payload)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['locations-flat'] })
      showToast(location ? 'Location updated' : 'Location created', 'success')
      onClose()
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Error', 'error'),
  })

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}>
      <div className="space-y-4">
        <div>
          <label className={labelCls}>Name *</label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="e.g. New York Office"
          />
        </div>
        <div>
          <label className={labelCls}>Parent location</label>
          <div className="selectwrap">
            <select value={pid} onChange={(e) => setPid(e.target.value)} className="select">
              <option value="">— Top level —</option>
              {flat.map((l) => (
                <option key={l.id} value={l.id}>{'  '.repeat(l.depth)}{l.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
      <div className="modal-actions" style={{ borderTop: '1px solid var(--track)', paddingTop: 16 }}>
        <button type="button" onClick={onClose} className="btn ghost">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn" style={mutation.isPending ? { opacity: 0.6 } : undefined}>
          {mutation.isPending ? 'Saving…' : location ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  )
}

function LocationNode({ loc, depth = 0, allLocations, onEdit, onDelete, onAdd }: {
  loc: LocationTree
  depth?: number
  allLocations: LocationTree[]
  onEdit: (l: LocationTree) => void
  onDelete: (l: LocationTree) => void
  onAdd: (parentId: number) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = (loc.children ?? []).length > 0

  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-4 hover:bg-row-hover rounded-control group transition-colors" style={{ paddingLeft: `${16 + depth * 24}px` }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className={`w-4 h-4 flex items-center justify-center text-ink-3 bg-transparent border-0 cursor-pointer transition-transform ${expanded ? '' : '-rotate-90'} ${!hasChildren ? 'invisible' : ''}`}
        >
          <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
        </button>
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" className="text-ink-3">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="flex-1 text-[13.5px] font-medium text-ink">{loc.name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onAdd(loc.id)} className="p-1 rounded text-ink-3 hover:text-brand-ink bg-transparent border-0 cursor-pointer" title="Add child">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          </button>
          <button onClick={() => onEdit(loc)} className="p-1 rounded text-ink-3 hover:text-ink bg-transparent border-0 cursor-pointer" title="Edit">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
          </button>
          <button onClick={() => onDelete(loc)} className="p-1 rounded text-ink-3 hover:text-danger-ink bg-transparent border-0 cursor-pointer" title="Delete">
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-track ml-8">
          {(loc.children ?? []).map((child) => (
            <LocationNode key={child.id} loc={child} depth={depth + 1} allLocations={allLocations} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Locations() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [showCreate, setShowCreate] = useState(false)
  const [addParentId, setAddParentId] = useState<number | undefined>()
  const [editing, setEditing] = useState<LocationTree | null>(null)
  const [deleting, setDeleting] = useState<LocationTree | null>(null)

  const { data: tree = [], isLoading } = useQuery<LocationTree[]>({
    queryKey: ['locations'],
    queryFn: () => api.get('/locations/tree').then((r) => r.data),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/locations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['locations'] })
      qc.invalidateQueries({ queryKey: ['locations-flat'] })
      showToast('Location deleted', 'success')
      setDeleting(null)
    },
    onError: (e: any) => showToast(e.response?.data?.detail || 'Cannot delete — location may be in use', 'error'),
  })

  const flatTree = (locs: LocationTree[]): LocationTree[] => locs.flatMap((l) => [l, ...flatTree(l.children ?? [])])

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-end mb-3.5 gap-2">
        <CsvImport
          importPath="/locations/import"
          templatePath="/locations/import/template"
          templateFilename="simplegear-locations-template.csv"
          invalidateKeys={[['locations'], ['locations-flat']]}
        />
        <button onClick={() => { setAddParentId(undefined); setShowCreate(true) }} className="btn sm">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add location
        </button>
      </div>

      <div className="panel p-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--track)', borderTopColor: 'var(--b1)' }} />
          </div>
        ) : tree.length === 0 ? (
          <div className="py-12 text-center text-[13px] text-ink-3">No locations yet — create one above.</div>
        ) : (
          tree.map((loc) => (
            <LocationNode
              key={loc.id}
              loc={loc}
              allLocations={tree}
              onEdit={(l) => setEditing(l)}
              onDelete={(l) => setDeleting(l)}
              onAdd={(pid) => { setAddParentId(pid); setShowCreate(true) }}
            />
          ))
        )}
      </div>

      <Modal open={showCreate || !!editing} onClose={() => { setShowCreate(false); setEditing(null) }} title={editing ? 'Edit location' : 'New location'} size="sm">
        <LocationForm
          location={editing ?? undefined}
          parentId={addParentId}
          onClose={() => { setShowCreate(false); setEditing(null) }}
          allLocations={flatTree(tree)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete "${deleting?.name}"?`}
        message="This cannot be undone. Assets and people at this location will lose their location assignment."
        confirmLabel="Delete"
        onConfirm={() => deleting && deleteMutation.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}
