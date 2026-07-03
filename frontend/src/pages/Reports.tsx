import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import api from '../lib/axios'
import type { ReportSummary } from '../types'
import { useToast } from '../components/shared/Toast'

async function downloadCsv(path: string, filename: string) {
  const { data } = await api.get(path, { responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function IconDownload() {
  return (
    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 4v12m0 0l-4-4m4 4l4-4" />
    </svg>
  )
}

function ExportCard({ title, description, path, filename }: { title: string; description: string; path: string; filename: string }) {
  const { showToast } = useToast()
  return (
    <div className="bg-white rounded-2xl border border-neutral-100 p-5 flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-semibold text-neutral-800">{title}</div>
        <div className="text-xs text-neutral-500 mt-1 leading-relaxed">{description}</div>
      </div>
      <button
        onClick={() => downloadCsv(path, filename).catch(() => showToast('Export failed', 'error'))}
        className="px-3 py-2 rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:border-sg-lime hover:text-sg-forest transition-colors flex items-center gap-1.5 flex-shrink-0"
      >
        <IconDownload />
        CSV
      </button>
    </div>
  )
}

function ComplianceRing({ pct }: { pct: number }) {
  const radius = 34
  const circumference = 2 * Math.PI * radius
  const filled = (pct / 100) * circumference
  const color = pct >= 90 ? '#15803D' : pct >= 60 ? '#F59E0B' : '#EF4444'
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="#F2F2F2" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-neutral-900">{pct}%</span>
      </div>
    </div>
  )
}

export default function Reports() {
  const { data: summary } = useQuery<ReportSummary>({
    queryKey: ['reports', 'summary'],
    queryFn: () => api.get('/reports/summary').then((r) => r.data),
  })

  const audit = summary?.audit

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Reports</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Compliance evidence and inventory exports</p>
      </div>

      {/* Audit compliance */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 mb-6">
        <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider mb-5">Audit Compliance</h2>
        <div className="flex items-center gap-8 flex-wrap">
          <ComplianceRing pct={audit?.compliance_pct ?? 0} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
            <div>
              <div className="text-2xl font-bold text-neutral-900">{audit?.total ?? 0}</div>
              <div className="text-xs text-neutral-500 mt-0.5">Total assets</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-sg-forest">{audit?.audited_ok ?? 0}</div>
              <div className="text-xs text-neutral-500 mt-0.5">Audited & current</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${(audit?.overdue ?? 0) > 0 ? 'text-red-500' : 'text-neutral-900'}`}>{audit?.overdue ?? 0}</div>
              <div className="text-xs text-neutral-500 mt-0.5">Audit overdue</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${(audit?.never_audited ?? 0) > 0 ? 'text-amber-500' : 'text-neutral-900'}`}>{audit?.never_audited ?? 0}</div>
              <div className="text-xs text-neutral-500 mt-0.5">Never audited</div>
            </div>
          </div>
        </div>
        {(audit?.never_audited ?? 0) + (audit?.overdue ?? 0) > 0 && (
          <p className="text-xs text-neutral-400 mt-4">
            Open an asset and hit <span className="font-semibold text-sg-forest">Audit</span> to record a physical check, or select assets on the{' '}
            <Link to="/assets" className="text-sg-forest hover:underline">Assets</Link> page for a bulk audit.
          </p>
        )}
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="text-2xl font-bold tracking-tight text-neutral-900">
            {summary ? `$${summary.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </div>
          <div className="text-xs font-semibold text-neutral-600 mt-1">Inventory value</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="text-2xl font-bold tracking-tight text-amber-500">{summary?.warranty_expiring_90d ?? 0}</div>
          <div className="text-xs font-semibold text-neutral-600 mt-1">Warranties expiring ≤ 90d</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="text-2xl font-bold tracking-tight text-red-500">{summary?.eol_within_90d ?? 0}</div>
          <div className="text-xs font-semibold text-neutral-600 mt-1">EOL within 90d</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-sm">
          <div className="text-2xl font-bold tracking-tight text-neutral-900">{summary?.maintenance_open ?? 0}</div>
          <div className="text-xs font-semibold text-neutral-600 mt-1">Open maintenance</div>
        </div>
      </div>

      {/* Value by location */}
      {summary && summary.by_location.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm mb-8">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Assets by Location</h2>
          </div>
          <div className="divide-y divide-neutral-50">
            {summary.by_location.map((l) => (
              <div key={l.name} className="flex items-center px-6 py-3">
                <span className="flex-1 text-sm text-neutral-700">{l.name}</span>
                <span className="text-sm font-semibold text-neutral-900 w-16 text-right">{l.count}</span>
                <span className="text-xs font-mono text-neutral-400 w-28 text-right">
                  ${l.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exports */}
      <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider mb-4">Exports</h2>
      <div className="grid sm:grid-cols-2 gap-4">
        <ExportCard
          title="Full asset register"
          description="Every asset with status, location, assignee, purchase and lifecycle data. Your master inventory record."
          path="/assets/export"
          filename="simplegear-assets.csv"
        />
        <ExportCard
          title="Audit compliance"
          description="Per-asset audit status: last audited, by whom, and next due date. Evidence that physical checks are being run."
          path="/reports/export/audit-compliance"
          filename="simplegear-audit-compliance.csv"
        />
        <ExportCard
          title="Warranty & EOL"
          description="Lifecycle report with days to warranty expiry and end-of-life, for budgeting and replacement planning."
          path="/reports/export/lifecycle"
          filename="simplegear-lifecycle.csv"
        />
        <ExportCard
          title="Maintenance history"
          description="All repairs, upgrades and preventive maintenance with costs and providers."
          path="/reports/export/maintenance"
          filename="simplegear-maintenance.csv"
        />
      </div>
    </div>
  )
}
