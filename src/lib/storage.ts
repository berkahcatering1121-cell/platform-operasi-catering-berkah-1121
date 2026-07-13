import { supabase } from './supabase'

// All proof photos live in the private "proofs" bucket. Paths are namespaced
// per module (e.g. "purchases/<uuid>-<name>") so they don't collide.
const BUCKET = 'proofs'

// Downscale + re-encode an image so multi-MB phone photos become ~150–350 KB
// JPEGs — saves storage and speeds up uploads. Falls back to the original file
// if the image can't be decoded (e.g. HEIC in a browser without support).
async function compressImage(file: File, maxDim = 1600, quality = 0.72): Promise<Blob> {
  if (!file.type.startsWith('image/')) return file
  try {
    const dataUrl: string = await new Promise((res, rej) => {
      const r = new FileReader()
      r.onload = () => res(r.result as string)
      r.onerror = rej
      r.readAsDataURL(file)
    })
    const img: HTMLImageElement = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = dataUrl
    })
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, w, h)
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality))
    // Only keep the compressed version if it is actually smaller.
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file
  }
}

/** Upload one file (compressed if it's an image), returning its storage path. */
export async function uploadProof(prefix: string, file: File): Promise<string> {
  const data = await compressImage(file)
  const isJpeg = data !== file
  const ext = isJpeg ? 'jpg' : file.name.split('.').pop()?.toLowerCase() || 'bin'
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, data, {
    cacheControl: '3600',
    upsert: false,
    contentType: isJpeg ? 'image/jpeg' : file.type || undefined,
  })
  if (error) throw new Error(error.message)
  return path
}

/** Signed URLs for a set of storage paths (bucket is private). */
export async function signedUrls(paths: string[], expiresIn = 3600): Promise<string[]> {
  if (!paths.length) return []
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, expiresIn)
  if (error) throw new Error(error.message)
  // Keep order aligned with the input paths.
  const map = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
  return paths.map((p) => map.get(p) ?? '').filter(Boolean)
}
