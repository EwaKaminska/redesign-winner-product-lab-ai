import { Link } from 'react-router-dom'
import { Icon } from '@/components/Icon'
import { isShortNote } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Grey card from the "home" frame. Shows the image when there is one,
 * otherwise the note (preferNote flips this for image + note cards).
 * Hover shows the expand icon ("interactions" frame).
 * Padding is 120px at 472px width in Figma, so it is kept as 25% here.
 */
export function InspirationCard({ inspiration, preferNote = false }) {
  const { id, note, imageUrl, image_path: imagePath } = inspiration
  // Under the Notes filter, an image + note card shows its note.
  const showImage = Boolean(imagePath) && !(preferNote && note)
  const label = note ? note.slice(0, 80) : 'Image inspiration'

  return (
    <Link
      to={`/i/${id}`}
      aria-label={`Open: ${label}`}
      className="group relative mb-6 block break-inside-avoid overflow-hidden rounded-card bg-surface p-[25%] outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
    >
      {showImage ? (
        <div className="overflow-hidden rounded-lg bg-surface-strong">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={note ? note.slice(0, 120) : ''}
              loading="lazy"
              className="block h-auto w-full transition-transform duration-300 ease-out group-hover:scale-[1.06]"
            />
          ) : (
            <div className="aspect-[4/3] w-full" />
          )}
        </div>
      ) : (
        <p
          className={cn(
            'font-medium break-words whitespace-pre-line text-black',
            isShortNote(note)
              ? 'text-xl leading-6 tracking-[-0.4px]'
              : 'line-clamp-[16] text-sm leading-5 tracking-[-0.14px]',
          )}
        >
          {note}
        </p>
      )}

      <span
        aria-hidden
        className="absolute top-2 right-2 flex size-10 items-center justify-center rounded-full opacity-0 transition-[opacity,background-color] group-hover:opacity-100 group-focus-visible:opacity-100 hover:bg-surface-strong"
      >
        <Icon name="expand" />
      </span>
    </Link>
  )
}
