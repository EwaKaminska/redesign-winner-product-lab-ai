import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { FullPageSpinner } from '@/components/FullPageSpinner'
import { InspirationForm, hasNewImage, toApiImage } from '@/components/InspirationForm'
import { useAuth } from '@/context/AuthContext'
import { describeAfterSave } from '@/lib/ai'
import { getInspiration, updateInspiration } from '@/lib/api'

export function EditInspirationPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [item, setItem] = useState(undefined)

  useEffect(() => {
    getInspiration(id)
      .then(setItem)
      .catch((err) => {
        toast.error(err.message)
        setItem(null)
      })
  }, [id])

  if (item === undefined) return <FullPageSpinner />
  if (item === null) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
        <p className="text-[32px] leading-10 font-medium">Not found</p>
        <Button asChild>
          <Link to="/">Back to board</Link>
        </Button>
      </div>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12 sm:px-6">
      <InspirationForm
        title="Edit inspiration"
        submitLabel="Update"
        inspirationId={item.id}
        initial={{
          note: item.note,
          image: item.image_path ? { url: item.imageUrl, path: item.image_path } : null,
          imageDescription: item.image_description,
          tags: item.tags.map((t) => t.name),
        }}
        onCancel={() => navigate(`/i/${item.id}`)}
        onSubmit={async ({ note, image, tagNames, noteLanguage, imageDescription }, { setStatus }) => {
          const apiImage = toApiImage(image, item.image_path)
          await updateInspiration(item.id, {
            userId: user.id,
            note,
            currentNote: item.note,
            currentImagePath: item.image_path,
            noteLanguage,
            imageDescription,
            tagNames,
            ...apiImage,
          })
          toast('Inspiration is updated')
          // A new image gets a new description before the details page opens,
          // unless "Suggest tags" wrote the description before the save.
          if (hasNewImage(apiImage) && !imageDescription) await describeAfterSave(item.id, setStatus)
          navigate(`/i/${item.id}`, { replace: true })
        }}
      />
    </main>
  )
}
