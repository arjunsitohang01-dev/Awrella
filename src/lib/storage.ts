import { getSupabaseServerClient } from '@/lib/supabase'

export const PHOTO_BUCKET = 'awrella-photos'
export const AVATAR_BUCKET = 'awrella-avatars'
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024

function sanitizeFileName(fileName: string) {
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : ''
  const baseName = fileName.replace(extension, '')

  const safeBaseName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'image'

  return `${safeBaseName}${extension.toLowerCase()}`
}

export function validateImageFile(file: File) {
  if (!IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error('Only JPG, PNG, WEBP, and GIF images are allowed.')
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image size must be 5MB or less.')
  }
}

export async function uploadImageToStorage(options: {
  bucket: typeof PHOTO_BUCKET | typeof AVATAR_BUCKET
  file: File
  folder: string
}) {
  validateImageFile(options.file)

  const supabase = getSupabaseServerClient()
  const fileBuffer = Buffer.from(await options.file.arrayBuffer())
  const objectPath = `${options.folder}/${Date.now()}-${sanitizeFileName(options.file.name)}`

  const { error } = await supabase.storage
    .from(options.bucket)
    .upload(objectPath, fileBuffer, {
      contentType: options.file.type,
      upsert: false,
      cacheControl: '3600',
    })

  if (error) {
    throw error
  }

  const { data } = supabase.storage.from(options.bucket).getPublicUrl(objectPath)

  return {
    objectPath,
    publicUrl: data.publicUrl,
  }
}

export function extractStoragePathFromPublicUrl(url: string, bucket: string) {
  try {
    const parsedUrl = new URL(url)
    const marker = `/storage/v1/object/public/${bucket}/`
    const index = parsedUrl.pathname.indexOf(marker)

    if (index === -1) {
      return null
    }

    return decodeURIComponent(parsedUrl.pathname.slice(index + marker.length))
  } catch {
    return null
  }
}

export async function deleteStorageObjectByPublicUrl(url: string | null | undefined, bucket: string) {
  if (!url) {
    return
  }

  const objectPath = extractStoragePathFromPublicUrl(url, bucket)
  if (!objectPath) {
    return
  }

  const supabase = getSupabaseServerClient()
  const { error } = await supabase.storage.from(bucket).remove([objectPath])

  if (error) {
    throw error
  }
}
