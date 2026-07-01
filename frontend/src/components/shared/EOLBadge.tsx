export default function EOLBadge({ days }: { days: number | null }) {
  if (days === null) return null

  let cls = ''
  let label = ''

  if (days < 0) {
    cls = 'bg-neutral-800 text-white'
    label = 'Past EOL'
  } else if (days < 30) {
    cls = 'bg-red-100 text-red-700'
    label = `EOL ${days}d`
  } else if (days < 90) {
    cls = 'bg-amber-100 text-amber-700'
    label = `EOL ${days}d`
  } else {
    return null
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>
      {label}
    </span>
  )
}
