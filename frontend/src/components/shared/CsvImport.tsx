import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '../../lib/axios'
import type { ImportResult } from '../../types'
import Modal from './Modal'
import { useToast } from './Toast'

interface CsvImportProps {
  importPath: string // e.g. /people/import
  templatePath: string // e.g. /people/import/template
  templateFilename: string
  invalidateKeys: string[][] // query keys to refresh after import
}

export default function CsvImport({ importPath, templatePath, templateFilename, invalidateKeys }: CsvImportProps) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function downloadTemplate() {
    try {
      const { data } = await api.get(templatePath, { responseType: 'blob' })
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = templateFilename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast('Could not download template', 'error')
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(importPath, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(data)
      invalidateKeys.forEach((key) => qc.invalidateQueries({ queryKey: key }))
    } catch (err: any) {
      showToast(err.response?.data?.detail || 'Import failed', 'error')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <>
      <button
        onClick={downloadTemplate}
        title="Download a CSV template with the expected columns"
        className="px-3 py-2 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        Template
      </button>
      <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={importing}
        className="px-3 py-2 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 flex items-center gap-1.5"
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
        {importing ? 'Importing...' : 'Import CSV'}
      </button>

      <Modal open={!!result} onClose={() => setResult(null)} title="Import complete" size="sm">
        {result && (
          <div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Total', value: result.total, color: 'text-neutral-700' },
                { label: 'Imported', value: result.imported, color: 'text-sg-forest' },
                { label: 'Skipped', value: result.skipped, color: 'text-amber-500' },
                { label: 'Errors', value: result.errors, color: 'text-red-500' },
              ].map((s) => (
                <div key={s.label} className="bg-neutral-50 rounded-xl p-3 text-center">
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{s.label}</div>
                </div>
              ))}
            </div>
            {result.rows.filter((r) => r.status !== 'imported').length > 0 && (
              <div className="max-h-48 overflow-y-auto scrollbar-thin border border-neutral-100 rounded-xl divide-y divide-neutral-50 mb-4">
                {result.rows.filter((r) => r.status !== 'imported').map((r, i) => (
                  <div key={i} className="px-3 py-2 text-xs flex items-center gap-2">
                    <span className={`font-bold uppercase ${r.status === 'error' ? 'text-red-500' : 'text-amber-500'}`}>{r.status}</span>
                    <span className="text-neutral-600 truncate">row {r.row}{r.name ? ` · ${r.name}` : ''}{r.reason ? ` — ${r.reason}` : ''}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setResult(null)} className="w-full gradient-bg text-white py-2 rounded-xl text-sm font-semibold">Done</button>
          </div>
        )}
      </Modal>
    </>
  )
}
