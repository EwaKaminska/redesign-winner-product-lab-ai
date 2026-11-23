import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/Icon'
import { cn } from '@/lib/utils'

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // matches the bucket limit

export function validateImage(file, maxBytes = MAX_IMAGE_BYTES) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Use a JPG, PNG, WebP, GIF, or AVIF image.'
  }
  if (file.size > maxBytes) {
    return `The image is too large. The limit is ${Math.round(maxBytes / 1024 / 1024)} MB.`
  }
  return null
}

function fileNameFromPath(path) {
  return path?.split('/').pop() ?? 'Image'
}

/**
 * Empty: "Drag and drop or click to upload image".
 * Filled: thumbnail + file name + "Remove" (edit-inspiration frame).
 *
 * value: { file?: File, url?: string, path?: string } | null
 */
export function ImageDropzone({ id, value, onChange, disabled = false }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

  useEffect(() => {
    if (!value?.file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value.file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value?.file])

  function pick(file) {
    if (!file) return
    const problem = validateImage(file)
    if (problem) {
      toast.error(problem)
      return
    }
    onChange({ file })
  }

  if (value) {
    const src = previewUrl ?? value.url
    const name = value.file?.name ?? (value.generated ? 'Generated image' : fileNameFromPath(value.path))
    return (
      <div className="flex w-full items-center gap-3 rounded-card bg-surface p-2">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-2xl bg-surface-strong">
            {src && <img src={src} alt="" className="size-full object-cover" />}
          </div>
          <p className="truncate text-sm leading-5 font-medium tracking-[-0.14px]">{name}</p>
        </div>
        <Button type="button" variant="ghost" className="hover:bg-surface-strong" onClick={() => onChange(null)} disabled={disabled}>
          Remove
        </Button>
      </div>
    )
  }

  return (
    <>
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (disabled) return
          pick(e.dataTransfer.files?.[0])
        }}
        className={cn(
          'flex w-full flex-col items-center justify-center gap-4 rounded-card bg-surface p-6 transition-colors outline-none hover:bg-surface-strong focus-visible:ring-3 focus-visible:ring-ring/40',
          dragging && 'bg-surface-strong ring-2 ring-black/20',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <Icon name="upload" />
        <span className="text-sm leading-6 font-medium tracking-[-0.14px] text-black/40">
          Drag and drop or click to upload image
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ''
        }}
      />
    </>
  )
}
