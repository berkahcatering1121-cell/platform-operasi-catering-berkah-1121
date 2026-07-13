import { supabase } from './supabase'

// All proof photos live in the private "proofs" bucket. Paths are namespaced
// per module (e.g. "purchases/<uuid>-<name>") so they don't collide.
const BUCKET = 'proofs'

/** Upload one file, returning its storage path (to store in a `photos[]`). */
export async function uploadProof(prefix: string, file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-60)
  const path = `${prefix}/${crypto.randomUUID()}-${safe}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
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
