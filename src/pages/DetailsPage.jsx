import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { AiButton } from '@/components/AiButton'
import { FlipCard } from '@/components/FlipCard'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { Icon } from '@/components/Icon'
import { TagChip } from '@/components/TagChip'
import { describeImage, proofreadInspiration, suggestTags } from '@/lib/ai'
import {
  deleteInspiration,
  getInspiration,
  setInspirationNote,
  setInspirationTags,
} from '@/lib/api'
import { formatAdded } from '@/lib/format'
import { cn } from '@/lib/utils'

function Section({ title, children }) {
  return (
    <section className="flex w-full flex-col gap-2">
      <h2 className="text-sm leading-6 font-medium">{title}</h2>
      {children}
    </section>
  )
}

function noteSizeClass(note) {
  // Font size follows note length and screen width, so the note fits the panel.
  if (note.length <= 200) return 'text-[28px] leading-9 sm:text-[40px] sm:leading-12'
  if (note.length <= 700) return 'text-[clamp(20px,2.3vw,36px)] leading-[1.25]'
  return 'text-[clamp(16px,1.5vw,24px)] leading-[1.4]'
}

/** The image. With onClick it is a button that flips to the note. */
function ImageView({ item, onClick, label }) {
  if (!item.imageUrl) return <p className="text-sm text-ink-muted">Image is not available.</p>

  const img = (
    <img
      src={item.imageUrl}
      alt={item.note ? item.note.slice(0, 120) : 'Inspiration image'}
      className="max-h-full max-w-full rounded-lg object-contain"
      draggable={false}
    />
  )
  if (!onClick) return img

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex max-h-full max-w-full cursor-pointer rounded-lg outline-none transition-transform duration-200 hover:scale-[1.01] focus-visible:ring-3 focus-visible:ring-ring/60 active:scale-[0.99]"
    >
      {img}
    </button>
  )
}

/**
 * The note. Very long notes scroll without a visible bar.
 * The text block is as wide as its text (w-fit) and sits in the centre,
 * so a short note is centred and a long note still reads from the left.
 */
function NoteView({ note, onClick, label }) {
  const text = (
    <p className={cn('mx-auto w-fit max-w-full font-medium tracking-[-0.02em] break-words whitespace-pre-line', noteSizeClass(note))}>
      {note}
    </p>
  )
  return (
    <div className="scrollbar-none max-h-full w-full overflow-y-auto">
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          title={label}
          className="mx-auto block w-fit max-w-full cursor-pointer rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          {text}
        </button>
      ) : (
        text
      )}
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-[32px] leading-10 font-medium tracking-[-0.64px]">Not found</p>
      <p className="text-sm text-ink-muted">This inspiration does not exist or is not yours.</p>
      <Button asChild>
        <Link to="/">Back to board</Link>
      </Button>
    </div>
  )
}

export function DetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState(undefined) // undefined = loading, null = not found
  const [view, setView] = useState('image')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [describing, setDescribing] = useState(false)
  const [proofreading, setProofreading] = useState(false)
  const [tagStatus, setTagStatus] = useState(null) // null | 'describing' | 'suggesting'

  useEffect(() => {
    let cancelled = false
    getInspiration(id)
      .then((data) => {
        if (cancelled) return
        setItem(data)
        setView(data?.image_path ? 'image' : 'note')
      })
      .catch((err) => {
        if (cancelled) return
        toast.error(err.message)
        setItem(null)
      })
    return () => {
      cancelled = true
    }
  }, [id])

  // Esc closes the details view. Esc inside a dialog or menu only closes
  // that layer: Radix closes it first, so a state check here comes too late.
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key !== 'Escape') return
      if (event.target instanceof Element && event.target.closest('[role="alertdialog"], [role="menu"]')) return
      navigate('/')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  if (item === undefined) return <FullPageSpinner />
  if (item === null) return <NotFound />

  const hasImage = Boolean(item.image_path)
  const hasNote = Boolean(item.note)

  async function handleRegenerateDescription() {
    setDescribing(true)
    try {
      const { description } = await describeImage(item.id)
      setItem((current) => ({ ...current, image_description: description }))
      toast('Description is updated')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDescribing(false)
    }
  }

  async function handleProofread() {
    setProofreading(true)
    try {
      const result = await proofreadInspiration(item.id)
      if (!result.changed) {
        toast('No changes needed')
        return
      }
      setItem((current) => ({ ...current, note: result.text }))
      setView('note')
      toast('Note is proofread', {
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await setInspirationNote(item.id, result.previous)
              setItem((current) => ({ ...current, note: result.previous }))
            } catch (err) {
              toast.error(err.message)
            }
          },
        },
      })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setProofreading(false)
    }
  }

  /** Reads the tags again, so the page has the saved rows (with ids). */
  async function reloadTags() {
    const fresh = await getInspiration(item.id)
    if (fresh) setItem((current) => ({ ...current, tags: fresh.tags }))
  }

  // Only for an inspiration with no tags: the result is saved directly.
  async function handleSuggestTags() {
    try {
      // Tags come from the note and the image description. An image with
      // no description gets one first (the function saves it).
      let description = item.image_description ?? ''
      if (hasImage && !description) {
        setTagStatus('describing')
        const result = await describeImage(item.id)
        description = result.description
        setItem((current) => ({ ...current, image_description: description }))
      }

      setTagStatus('suggesting')
      const { tags } = await suggestTags({
        note: item.note,
        imageDescription: description,
        currentTags: [],
        inspirationId: item.id,
      })
      if (tags.length === 0) {
        toast('No tag ideas for this inspiration')
        return
      }

      await setInspirationTags(item.id, tags)
      await reloadTags()
      toast(tags.length === 1 ? '1 tag is added' : `${tags.length} tags are added`, {
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: async () => {
            try {
              await setInspirationTags(item.id, [])
              setItem((current) => ({ ...current, tags: [] }))
            } catch (err) {
              toast.error(err.message)
            }
          },
        },
      })
    } catch (err) {
      toast.error(err.message)
    } finally {
      setTagStatus(null)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      await deleteInspiration(item.id, item.image_path)
      toast('Inspiration is removed')
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.message)
      setRemoving(false)
      setConfirmOpen(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col-reverse gap-6 p-4 sm:p-6 lg:h-svh lg:flex-row lg:items-start">
      {/* Sidebar (Figma "Frame 12") */}
      <aside className="flex w-full shrink-0 flex-col gap-12 rounded-card bg-surface p-6 lg:w-[320px]">
        {hasImage && (
          <Section title="Image description">
            <p className="text-sm leading-5 text-ink-muted" aria-live="polite" aria-busy={describing || undefined}>
              {describing
                ? 'Writing a new description…'
                : item.image_description || 'No description yet.'}
            </p>
          </Section>
        )}

        <Section title="Details">
          <p className="text-sm leading-5 text-ink-muted">{formatAdded(item.created_at)}</p>
          {item.image_source === 'generated' && hasImage && (
            <p className="text-sm leading-5 text-ink-muted">Image is generated with AI from the note.</p>
          )}
        </Section>

        {item.tags.length > 0 && (
          <Section title="Tags">
            <div className="flex flex-wrap gap-2">
              {item.tags.map((tag) => (
                <TagChip key={tag.id} name={tag.name} />
              ))}
            </div>
          </Section>
        )}

        <Section title="Edit">
          <div className="flex flex-col gap-2">
            {hasImage && (
              <AiButton
                variant="surface"
                onClick={handleRegenerateDescription}
                loading={describing}
                loadingLabel="Describing…"
                disabled={tagStatus !== null}
              >
                Regenerate description
              </AiButton>
            )}
            {hasNote && (
              <AiButton
                variant="surface"
                onClick={handleProofread}
                loading={proofreading}
                loadingLabel="Proofreading…"
                disabled={tagStatus !== null}
              >
                Proofread
              </AiButton>
            )}
            {item.tags.length === 0 && (
              <AiButton
                variant="surface"
                onClick={handleSuggestTags}
                loading={tagStatus !== null}
                loadingLabel={tagStatus === 'describing' ? 'Describing image…' : 'Suggesting tags…'}
                disabled={describing || proofreading}
              >
                Suggest tags
              </AiButton>
            )}
          </div>
        </Section>

        <Section title="Options">
          <div className="flex gap-2">
            <Button asChild variant="surface" className="flex-1">
              <Link to={`/i/${item.id}/edit`}>Edit</Link>
            </Button>
            <AlertDialog open={confirmOpen} onOpenChange={(open) => !removing && setConfirmOpen(open)}>
              <AlertDialogTrigger asChild>
                <Button variant="surface" className="flex-1">
                  Remove
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogMedia className="bg-destructive/10 text-destructive">
                    <Trash2 />
                  </AlertDialogMedia>
                  <AlertDialogTitle>Remove this inspiration?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This deletes the note and the image. Your tags stay. You cannot undo it.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={removing}
                    onClick={(e) => {
                      // Keep the dialog open until the delete finishes.
                      e.preventDefault()
                      handleRemove()
                    }}
                  >
                    {removing ? 'Removing…' : 'Remove'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </Section>
      </aside>

      {/* Main panel (Figma "Frame 9") */}
      <main className="relative flex min-h-[70svh] flex-1 flex-col items-center justify-center overflow-hidden rounded-card bg-surface px-6 pt-20 pb-12 sm:px-12 lg:h-full lg:min-h-0 lg:px-[120px] lg:py-[clamp(80px,12vh,120px)]">
        {hasImage && hasNote && (
          <div className="absolute top-6 left-1/2 flex -translate-x-1/2 gap-1" role="tablist">
            {['image', 'note'].map((v) => (
              <Button
                key={v}
                role="tab"
                aria-selected={view === v}
                variant="ghost"
                className={cn('capitalize hover:bg-surface-strong', view === v && 'bg-surface-strong')}
                onClick={() => setView(v)}
              >
                {v}
              </Button>
            ))}
          </div>
        )}

        <Button asChild variant="ghost" size="icon" className="absolute top-2 right-2 hover:bg-surface-strong">
          <Link to="/" aria-label="Close">
            <Icon name="close" />
          </Link>
        </Button>

        {hasImage && hasNote ? (
          // Both: click the image or the note to flip the card over.
          <FlipCard
            flipped={view === 'note'}
            className="w-full flex-1 self-stretch"
            front={
              <ImageView
                item={item}
                onClick={() => setView('note')}
                label="Show note"
              />
            }
            back={
              <NoteView note={item.note} onClick={() => setView('image')} label="Show image" />
            }
          />
        ) : hasImage ? (
          <ImageView item={item} />
        ) : (
          <NoteView note={item.note} />
        )}
      </main>
    </div>
  )
}
