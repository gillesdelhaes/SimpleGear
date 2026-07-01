import type { AssetStatus } from '../../types'

export default function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: status.color + '20', color: status.color }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: status.color }}
      />
      {status.name}
    </span>
  )
}
