import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../lib/axios'
import type { DashboardStats, Alert, ActivityItem } from '../types'
import EOLBadge from '../components/shared/EOLBadge'
import StatusBadge from '../components/shared/StatusBadge'

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm">
      <div className="text-3xl font-bold tracking-tight text-neutral-900 mb-1" style={{ color }}>{value}</div>
      <div className="text-sm font-semibold text-neutral-600">{label}</div>
      {sub && <div className="text-xs text-neutral-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const message = alert.type === 'eol'
    ? `End of life ${alert.days_remaining < 0 ? `${Math.abs(alert.days_remaining)}d ago` : `in ${alert.days_remaining}d`}`
    : `Warranty expires ${alert.days_remaining < 0 ? `${Math.abs(alert.days_remaining)}d ago` : `in ${alert.days_remaining}d`}`
  return (
    <Link
      to={`/assets/${alert.asset_id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 rounded-xl transition-colors group"
    >
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${alert.type === 'eol' ? 'bg-red-400' : 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900 truncate group-hover:text-sg-forest transition-colors">{alert.asset_name}</div>
        <div className="text-xs text-neutral-500">{message}</div>
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
    <div className="flex items-start gap-3 px-4 py-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${item.type === 'assigned' ? 'bg-sg-lime/15' : 'bg-neutral-100'}`}>
        <svg width="10" height="10" fill="none" stroke={item.type === 'assigned' ? '#15803D' : '#9CA3AF'} viewBox="0 0 24 24">
          {item.type === 'assigned'
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
          }
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-neutral-700">
          <Link to={`/assets/${item.asset_id}`} className="font-semibold hover:text-sg-forest">{item.asset_name}</Link>
          {' '}{item.type === 'assigned' ? 'assigned to' : 'released from'}{' '}
          <Link to={`/people/${item.person_id}`} className="font-semibold hover:text-sg-forest">{item.person_name}</Link>
        </div>
        {item.note && <div className="text-xs text-neutral-400 mt-0.5 truncate font-mono">{item.note}</div>}
      </div>
      <span className="text-xs text-neutral-400 flex-shrink-0 pt-0.5">{relative}</span>
    </div>
  )
}

export default function Dashboard() {
  const qc = useQueryClient()

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

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-0.5">Asset overview and recent activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total assets" value={stats?.total ?? 0} />
        <StatCard label="Assigned" value={stats?.assigned_count ?? 0} color="#15803D" />
        <StatCard label="Available" value={stats?.unassigned_count ?? 0} color="#84CC16" />
      </div>

      {/* Category breakdown */}
      {stats?.by_category && stats.by_category.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm p-6 mb-6">
          <h2 className="text-sm font-bold text-neutral-700 mb-4 uppercase tracking-wider">By Category</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {stats.by_category.map((c) => (
              <div key={c.name} className="flex items-center justify-between px-3 py-2 bg-neutral-50 rounded-xl">
                <span className="text-sm text-neutral-700 truncate">{c.name}</span>
                <span className="text-sm font-bold text-neutral-900 ml-2 flex-shrink-0">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">EOL & Warranty Alerts</h2>
            {alerts.length > 0 && (
              <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">{alerts.length}</span>
            )}
          </div>
          {alerts.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="text-2xl mb-2">✓</div>
              <p className="text-sm text-neutral-400">No alerts — all assets look good</p>
            </div>
          ) : (
            <div className="py-1 divide-y divide-neutral-50">
              {alerts.slice(0, 10).map((a, i) => <AlertRow key={i} alert={a} />)}
            </div>
          )}
        </div>

        {/* Activity */}
        <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">Recent Activity</h2>
          </div>
          {activity.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <p className="text-sm text-neutral-400">No activity yet — assign your first asset</p>
            </div>
          ) : (
            <div className="py-1 divide-y divide-neutral-50">
              {activity.map((item, i) => <ActivityRow key={i} item={item} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
