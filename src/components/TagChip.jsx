import { Icon } from '@/components/Icon'

/** Black tag pill. With onRemove it shows the × icon (form variant). */
export function TagChip({ name, onRemove }) {
  if (!onRemove) {
    return (
      <span className="inline-flex h-8 items-center rounded-full bg-black px-4 text-sm leading-6 font-medium text-white">
        {name}
      </span>
    )
  }
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove tag ${name}`}
      className="inline-flex h-8 items-center gap-2 rounded-full bg-black pr-4 pl-3 text-sm leading-6 font-medium text-white transition-opacity outline-none hover:opacity-80 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Icon name="tagRemove" />
      {name}
    </button>
  )
}
