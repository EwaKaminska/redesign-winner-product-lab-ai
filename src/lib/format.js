const time = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' })
const date = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/** "Added today at 12:40", "Added yesterday at 12:40", "Added on 3 Nov 2026 at 12:40". */
export function formatAdded(isoString) {
  const d = new Date(isoString)
  const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86_400_000)
  const at = time.format(d)
  if (days === 0) return `Added today at ${at}`
  if (days === 1) return `Added yesterday at ${at}`
  return `Added on ${date.format(d)} at ${at}`
}

/** Short notes use the large quote style from the design. */
export function isShortNote(note) {
  return (note ?? '').length <= 120
}
