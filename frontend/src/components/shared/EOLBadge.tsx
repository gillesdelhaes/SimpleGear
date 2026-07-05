export default function EOLBadge({ days }: { days: number | null }) {
  if (days === null) return null

  let cls = ''
  let label = ''

  if (days < 0) {
    cls = 'bg-danger-tint text-danger-ink'
    label = 'Past EOL'
  } else if (days < 30) {
    cls = 'bg-danger-tint text-danger-ink'
    label = `EOL ${days}d`
  } else if (days < 90) {
    cls = 'bg-warn-tint text-warn-ink'
    label = `EOL ${days}d`
  } else {
    return null
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold whitespace-nowrap ${cls}`}>
      {label}
    </span>
  )
}
