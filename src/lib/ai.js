// AI features. All calls go to one Supabase Edge Function
// (supabase/functions/hyper-worker/index.ts). API keys stay on the server.

import { toast } from 'sonner'
import { isMockMode, supabase } from '@/lib/supabase'
import { BUCKETS, removeFiles } from '@/lib/storage'

/** The edge function's name in Supabase. It must match the dashboard exactly. */
const FUNCTION_NAME = 'hyper-worker'

/** Mock mode has no server, so the AI buttons stay disabled. */
export const isAiAvailable = !isMockMode

async function invoke(action, input) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...input },
  })
  if (!error) return data

  // The function sends { error: "..." }. Show that text when we have it.
  let message = 'The AI service is not available. Try again.'
  const response = error.context
  if (response && typeof response.json === 'function') {
    try {
      const body = await response.json()
      if (body?.error) message = body.error
      else if (response.status === 404) {
        message = `The "${FUNCTION_NAME}" edge function is not deployed in Supabase.`
      } else if (body?.message) message = body.message
    } catch {
      // Not JSON: keep the default message.
    }
  } else if (error.name === 'FunctionsFetchError') {
    message = `Cannot reach the AI service. Check that the "${FUNCTION_NAME}" edge function is deployed.`
  }
  throw new Error(message)
}

/** Writes and saves a description for the inspiration's image. */
export function describeImage(inspirationId) {
  return invoke('describe_image', { inspiration_id: inspirationId })
}

const DRAFT_IMAGE_MAX_SIDE = 1024

/**
 * Makes a small JPEG data URL from an image file. The AI does not need
 * the full size, and JPEG also works for formats it cannot read (AVIF).
 */
async function fileToSmallDataUrl(file) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('This browser cannot read the image. Save the inspiration first, then try again.')
  }
  const scale = Math.min(1, DRAFT_IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  // JPEG has no transparency: put white behind transparent images.
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', 0.85)
}

/**
 * Describes the form's image before the save. Nothing is saved.
 * image: { file } (not uploaded yet) or { path } (already in storage).
 * Returns { description, model }.
 */
export async function describeDraftImage(image) {
  if (image.file) {
    return invoke('describe_image', { image: await fileToSmallDataUrl(image.file) })
  }
  return invoke('describe_image', { image_path: image.path })
}

/**
 * Suggests tags from the note and the image description.
 * Returns { tags: string[] } without the tags in currentTags.
 */
export function suggestTags({ note, imageDescription, currentTags, inspirationId }) {
  return invoke('suggest_tags', {
    note,
    image_description: imageDescription ?? '',
    current_tags: currentTags,
    inspiration_id: inspirationId,
  })
}

/**
 * Proofreads a note that is not saved yet (form). Nothing is saved.
 * Returns { text, language: 'pl' | 'en', changed }.
 */
export function proofreadText(text, inspirationId) {
  return invoke('proofread', { text, inspiration_id: inspirationId })
}

/** Proofreads the saved note and saves the result. Returns { text, previous, language, changed }. */
export function proofreadInspiration(inspirationId) {
  return invoke('proofread', { inspiration_id: inspirationId })
}

/** Makes an image from the note. Returns { path, url, prompt }. The file is in storage, not linked yet. */
export function generateImage(note) {
  return invoke('generate_image', { prompt: note })
}

/** Deletes a generated image that the user did not keep. */
export function discardGeneratedImage(path) {
  return removeFiles(BUCKETS.inspirations, [path])
}

/**
 * After a save with a new image: writes the description before the app
 * opens the details page. A failure does not undo the save; the user can
 * press "Regenerate description" later.
 */
export async function describeAfterSave(inspirationId, setStatus) {
  if (!isAiAvailable) return
  setStatus?.('describing')
  try {
    await describeImage(inspirationId)
  } catch (err) {
    toast.error(`Saved, but the image description failed: ${err.message}`)
  }
}
