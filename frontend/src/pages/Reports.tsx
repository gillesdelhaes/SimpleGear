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
    <div className="panel p-5 flex items-start justify-between gap-4">
      <div>
        <div className="text-[13.5px] font-semibold text-ink">{title}</div>
        <div className="text-xs text-ink-2 mt-1 leading-relaxed">{description}</div>
      </div>
      <button
        onClick={() => downloadCsv(path, filename).catch(() => showToast('Export failed', 'error'))}
        className="btn ghost sm flex-shrink-0"
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
  const color = pct >= 90 ? 'var(--brand-ink)' : pct >= 60 ? 'var(--warn-ink)' : 'var(--danger-ink)'
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="var(--track)" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-ink">{pct}%</span>
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
    <div className="max-w-5xl">
      {/* Audit compliance */}
      <div className="panel p-6 mb-3.5">
        <h2 className="text-[14.5px] font-semibold text-ink mb-5 mt-0">Audit compliance</h2>
        <div className="flex items-center gap-8 flex-wrap">
          <ComplianceRing pct={audit?.compliance_pct ?? 0} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 flex-1">
            <div>
              <div className="text-2xl font-bold text-ink">{audit?.total ?? 0}</div>
              <div className="text-xs text-ink-2 mt-0.5">Total assets</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-brand-ink">{audit?.audited_ok ?? 0}</div>
              <div className="text-xs text-ink-2 mt-0.5">Audited & current</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${(audit?.overdue ?? 0) > 0 ? 'text-danger-ink' : 'text-ink'}`}>{audit?.overdue ?? 0}</div>
              <div className="text-xs text-ink-2 mt-0.5">Audit overdue</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${(audit?.never_audited ?? 0) > 0 ? 'text-warn-ink' : 'text-ink'}`}>{audit?.never_audited ?? 0}</div>
              <div className="text-xs text-ink-2 mt-0.5">Never audited</div>
            </div>
          </div>
        </div>
        {(audit?.never_audited ?? 0) + (audit?.overdue ?? 0) > 0 && (
          <p className="text-xs text-ink-3 mt-4">
            Open an asset and hit <span className="font-semibold text-brand-ink">Audit</span> to record a physical check, or select assets on the{' '}
            <Link to="/assets" className="text-brand-ink hover:underline">Assets</Link> page for a bulk audit.
          </p>
        )}
      </div>

      {/* Key figures */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
        <div className="panel p-5">
          <div className="text-2xl font-bold tracking-tight text-ink">
            {summary ? `$${summary.total_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—'}
          </div>
          <div className="text-xs font-medium text-ink-2 mt-1">Inventory value</div>
        </div>
        <div className="panel p-5">
          <div className="text-2xl font-bold tracking-tight text-warn-ink">{summary?.warranty_expiring_90d ?? 0}</div>
          <div className="text-xs font-medium text-ink-2 mt-1">Warranties expiring ≤ 90d</div>
        </div>
        <div className="panel p-5">
          <div className="text-2xl font-bold tracking-tight text-danger-ink">{summary?.eol_within_90d ?? 0}</div>
          <div className="text-xs font-medium text-ink-2 mt-1">EOL within 90d</div>
        </div>
        <div className="panel p-5">
          <div className="text-2xl font-bold tracking-tight text-ink">{summary?.maintenance_open ?? 0}</div>
          <div className="text-xs font-medium text-ink-2 mt-1">Open maintenance</div>
        </div>
      </div>

      {/* Value by location */}
      {summary && summary.by_location.length > 0 && (
        <div className="panel mb-3.5">
          <div className="panel-head">
            <h2>Assets by location</h2>
          </div>
          <div className="divide-y divide-track px-2 py-2">
            {summary.by_location.map((l) => (
              <div key={l.name} className="flex items-center px-6 py-3">
                <span className="flex-1 text-[13px] text-ink-2">{l.name}</span>
                <span className="text-[13px] font-semibold text-ink w-16 text-right">{l.count}</span>
                <span className="text-xs font-mono text-ink-3 w-28 text-right">
                  ${l.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exports */}
      <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-3 mb-3 mt-6">Exports</h2>
      <div className="grid sm:grid-cols-2 gap-3.5">
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
