import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import type { DashboardStats, Alert, ActivityItem } from '../types'
import EOLBadge from '../components/shared/EOLBadge'

function StatCard({ label, value, sub, warn }: { label: string; value: number; sub?: string; warn?: boolean }) {
  return (
    <div className="panel stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <span className={`delta${warn ? ' warn' : ''}`}>{sub}</span>}
    </div>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const overdue = alert.days_remaining < 0
  const message = alert.type === 'eol'
    ? `End of life ${overdue ? `${Math.abs(alert.days_remaining)}d ago` : `in ${alert.days_remaining}d`}`
    : alert.type === 'warranty'
      ? `Warranty expires ${overdue ? `${Math.abs(alert.days_remaining)}d ago` : `in ${alert.days_remaining}d`}`
      : `Audit ${overdue ? `overdue by ${Math.abs(alert.days_remaining)}d` : `due in ${alert.days_remaining}d`}`
  const dotColor = alert.type === 'eol' ? 'var(--danger-ink)' : alert.type === 'warranty' ? 'var(--warn-ink)' : 'var(--b1)'
  return (
    <Link to={`/assets/${alert.asset_id}`} className="exp" style={{ textDecoration: 'none', color: 'inherit' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dotColor }} />
      <div className="what">
        <b>{alert.asset_name}</b>
        <span>{message}</span>
      </div>
      <EOLBadge days={alert.days_remaining} />
    </Link>
  )
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const date = item.occurred_at ? new Date(item.occurred_at) : new Date()
  const relative = (() => {
    const diff = Date.now() - date.getTime()
    const h = Math.floor(diff / 3600000)
    const d = Math.floor(diff / 86400000)
    if (h < 1) return 'just now'
    if (h < 24) return `${h}h ago`
    if (d < 7) return `${d}d ago`
    return date.toLocaleDateString()
  })()

  return (
    <div className="exp" style={{ cursor: 'default' }}>
      <span
        className={item.type === 'assigned' ? 'text-brand-ink' : 'text-ink-3'}
        style={{
          width: 26, height: 26, borderRadius: 9, flexShrink: 0,
          display: 'grid', placeItems: 'center',
          background: item.type === 'assigned' ? 'var(--brand-tint)' : 'var(--field)',
          border: item.type === 'assigned' ? 'none' : '1px solid var(--edge)',
        }}
      >
        <svg width="10" height="10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {item.type === 'assigned'
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
          }
        </svg>
      </span>
      <div className="what">
        <b>
          <Link to={`/assets/${item.asset_id}`} className="text-ink hover:text-brand-ink" style={{ textDecoration: 'none' }}>{item.asset_name}</Link>
          <span className="font-normal text-ink-2">
            {' '}{item.type === 'assigned' ? 'assigned to' : 'released from'}{' '}
          </span>
          <Link to={`/people/${item.person_id}`} className="text-ink hover:text-brand-ink" style={{ textDecoration: 'none' }}>{item.person_name}</Link>
        </b>
        {item.note && <span className="font-mono">{item.note}</span>}
      </div>
      <span className="text-[11px] font-mono text-ink-3 flex-shrink-0">{relative}</span>
    </div>
  )
}

export default function Dashboard() {
  const { data: stats } = useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: alerts = [] } = useQuery<Alert[]>({
    queryKey: ['dashboard', 'alerts'],
    queryFn: () => api.get('/dashboard/alerts').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const { data: activity = [] } = useQuery<ActivityItem[]>({
    queryKey: ['dashboard', 'activity'],
    queryFn: () => api.get('/dashboard/activity').then((r) => r.data),
    refetchInterval: 60_000,
  })

  const auditsNeeded = (stats?.audits_overdue ?? 0) + (stats?.audits_never ?? 0)

  return (
    <div className="max-w-[1200px]">
      {/* Stats */}
      <section className="stats" aria-label="Key numbers">
        <StatCard label="Total assets" value={stats?.total ?? 0} />
        <StatCard
          label="Assigned"
          value={stats?.assigned_count ?? 0}
          sub={stats && stats.total > 0 ? `${Math.round((stats.assigned_count / stats.total) * 100)}% of fleet` : undefined}
        />
        <StatCard label="Available" value={stats?.unassigned_count ?? 0} sub="ready to assign" />
        <StatCard
          label="Audits needed"
          value={auditsNeeded}
          sub={stats ? `${stats.audits_overdue} overdue · ${stats.audits_never} never audited` : undefined}
          warn={(stats?.audits_overdue ?? 0) > 0 || (stats?.audits_never ?? 0) > 0}
        />
      </section>

      {/* Category breakdown */}
      {stats?.by_category && stats.by_category.length > 0 && (
        <section className="panel mb-3.5">
          <div className="panel-head">
            <h2>By category</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 p-[18px] pt-3.5">
            {stats.by_category.map((c) => (
              <div key={c.name} className="flex items-center justify-between px-3.5 py-2.5 rounded-control border border-edge" style={{ background: 'var(--field)' }}>
                <span className="text-[13px] text-ink-2 truncate">{c.name}</span>
                <span className="text-[13px] font-bold text-ink ml-2 flex-shrink-0 font-mono">{c.count}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-2 gap-3.5">
        {/* Alerts */}
        <section className="panel">
          <div className="panel-head">
            <h2>EOL & warranty alerts</h2>
            {alerts.length > 0 && <span className="pill danger plain">{alerts.length}</span>}
          </div>
          {alerts.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-[13px] text-ink-3">No alerts — all assets look good.</p>
            </div>
          ) : (
            <div className="explist">
              {alerts.slice(0, 10).map((a, i) => <AlertRow key={i} alert={a} />)}
            </div>
          )}
        </section>

        {/* Activity */}
        <section className="panel">
          <div className="panel-head">
            <h2>Recent activity</h2>
          </div>
          {activity.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-[13px] text-ink-3">No activity yet — assign your first asset.</p>
            </div>
          ) : (
            <div className="explist">
              {activity.map((item, i) => <ActivityRow key={i} item={item} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
