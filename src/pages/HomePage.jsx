import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { AppHeader, FILTERS } from '@/components/AppHeader'
import { InspirationCard } from '@/components/InspirationCard'
import { InspirationForm, hasNewImage, toApiImage } from '@/components/InspirationForm'
import { Logo } from '@/components/Logo'
import { UserMenu } from '@/components/UserMenu'
import { useAuth } from '@/context/AuthContext'
import { describeAfterSave } from '@/lib/ai'
import { createInspiration, listInspirations } from '@/lib/api'

// An inspiration with both an image and a note shows in both filters.
function matchesFilter(item, filter) {
  if (filter === 'images') return Boolean(item.image_path)
  if (filter === 'notes') return Boolean(item.note)
  return true
}

function matchesSearch(item, query) {
  if (!query) return true
  const q = query.toLowerCase()
  return (
    item.note.toLowerCase().includes(q) ||
    (item.image_description ?? '').toLowerCase().includes(q) ||
    item.tags.some((t) => t.name.toLowerCase().includes(q))
  )
}

function GridSkeleton() {
  const heights = ['h-[336px]', 'h-[480px]', 'h-[400px]', 'h-[420px]', 'h-[336px]', 'h-[540px]']
  return (
    <div className="columns-1 gap-6 sm:columns-2 lg:columns-3" aria-hidden>
      {heights.map((h, i) => (
        <Skeleton key={i} className={`mb-6 w-full break-inside-avoid rounded-card bg-surface ${h}`} />
      ))}
    </div>
  )
}

/** "first" frame: shown when the user has no inspirations yet. */
function FirstInspiration({ onCreated }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-svh px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <Logo />
        <UserMenu />
      </div>
      <main className="flex justify-center py-12 sm:py-16">
        <InspirationForm
          title="Add your first inspiration"
          submitLabel="Add inspiration"
          onSubmit={async ({ note, image, tagNames, noteLanguage, imageDescription }, { setStatus }) => {
            const apiImage = toApiImage(image)
            const id = await createInspiration({
              userId: user.id,
              note,
              tagNames,
              noteLanguage,
              imageDescription,
              ...apiImage,
            })
            toast('Inspiration is added')
            if (!hasNewImage(apiImage)) {
              onCreated()
              return
            }
            // With an image: open the details page only after the description is ready.
            // "Suggest tags" can write the description before the save; then it is saved already.
            if (!imageDescription) await describeAfterSave(id, setStatus)
            navigate(`/i/${id}`)
          }}
        />
      </main>
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  const filter = FILTERS.some((f) => f.value === params.get('type'))
    ? params.get('type')
    : 'all'
  const search = params.get('q') ?? ''

  const updateParam = (key, value, defaultValue) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!value || value === defaultValue) next.delete(key)
        else next.set(key, value)
        return next
      },
      { replace: true },
    )
  }

  const load = useCallback(async () => {
    try {
      setError(null)
      setItems(await listInspirations())
    } catch (err) {
      setError(err.message)
      setItems([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(
    () =>
      (items ?? []).filter(
        (item) => matchesFilter(item, filter) && matchesSearch(item, search.trim()),
      ),
    [items, filter, search],
  )

  if (items && items.length === 0 && !error) {
    return <FirstInspiration onCreated={load} />
  }

  return (
    <div className="flex min-h-svh flex-col px-4 py-6 sm:px-6">
      <AppHeader
        filter={filter}
        onFilterChange={(value) => updateParam('type', value, 'all')}
        search={search}
        onSearchChange={(value) => updateParam('q', value, '')}
      />

      <main className="flex flex-1 flex-col pt-10 lg:pt-20">
        {error && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-card bg-surface p-6 text-sm">
            <p>Could not load your inspirations: {error}</p>
            <Button variant="surface" onClick={load}>
              Try again
            </Button>
          </div>
        )}

        {items === null ? (
          <GridSkeleton />
        ) : visible.length === 0 && !error ? (
          // flex-1 fills the space under the header. The bottom padding equals
          // the space above (header + gap), so the message sits at the
          // vertical centre of the screen.
          <div className="flex flex-1 flex-col items-center justify-center gap-4 pb-[104px] text-center lg:pb-[144px]">
            <p className="text-xl leading-6 font-medium tracking-[-0.4px]">Nothing matches.</p>
            <p className="text-sm text-ink-muted">Try another search or filter.</p>
            <Button variant="secondary" onClick={() => navigate('/', { replace: true })}>
              Show all
            </Button>
          </div>
        ) : (
          <div className="columns-1 gap-6 sm:columns-2 lg:columns-3">
            {visible.map((item) => (
              <InspirationCard key={item.id} inspiration={item} preferNote={filter === 'notes'} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
