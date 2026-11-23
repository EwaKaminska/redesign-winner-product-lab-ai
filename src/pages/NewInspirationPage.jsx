import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { InspirationForm, hasNewImage, toApiImage } from '@/components/InspirationForm'
import { useAuth } from '@/context/AuthContext'
import { describeAfterSave } from '@/lib/ai'
import { createInspiration } from '@/lib/api'

export function NewInspirationPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12 sm:px-6">
      <InspirationForm
        title="Add inspiration"
        submitLabel="Add inspiration"
        onCancel={() => navigate('/')}
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
            navigate('/', { replace: true })
            return
          }
          // With an image: open the details page only after the description is ready.
          // "Suggest tags" can write the description before the save; then it is saved already.
          if (!imageDescription) await describeAfterSave(id, setStatus)
          navigate(`/i/${id}`, { replace: true })
        }}
      />
    </main>
  )
}
