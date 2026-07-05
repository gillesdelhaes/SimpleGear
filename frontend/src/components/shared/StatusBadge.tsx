import type { AssetStatus } from '../../types'

// Status colors are user-configured data (from the API), so they stay inline —
// the pill shape and dot follow the Glasshouse .pill anatomy.
export default function StatusBadge({ status }: { status: AssetStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold whitespace-nowrap"
      style={{ backgroundColor: status.color + '24', color: status.color }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full flex-shrink-0"
        style={{ backgroundColor: status.color }}
      />
      {status.name}
    </span>
  )
}
