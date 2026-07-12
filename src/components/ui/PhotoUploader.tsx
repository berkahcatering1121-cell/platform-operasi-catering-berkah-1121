import { useEffect, useRef, useState } from 'react'
import { signedUrls, uploadProof } from '@/lib/storage'

interface Props {
  /** Storage path prefix, e.g. "purchases". */
  prefix: string
  /** Current photo storage paths. */
  value: string[]
  onChange: (paths: string[]) => void
  label?: string
}

/**
 * Multi-image proof field: upload to the private "proofs" bucket, show
 * removable thumbnails (via signed URLs). Removing only detaches the path
 * from the row — orphaned objects are harmless and can be swept later.
 */
export default function PhotoUploader({ prefix, value, onChange, label = 'Foto Bukti' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resolve signed URLs for any paths we don't have yet.
  useEffect(() => {
    const missing = value.filter((p) => !urls[p])
    if (!missing.length) return
    let active = true
    signedUrls(missing)
      .then((resolved) => {
        if (!active) return
        setUrls((prev) => {
          const next = { ...prev }
          missing.forEach((p, i) => {
            if (resolved[i]) next[p] = resolved[i]
          })
          return next
        })
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [value, urls])

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    setError(null)
    try {
      const paths: string[] = []
      for (const f of files) paths.push(await uploadProof(prefix, f))
      onChange([...value, ...paths])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-ink-body">{label}</span>
        <span className="text-[10.5px] text-ink-faint">{value.length} foto</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((p) => (
          <div key={p} className="relative h-16 w-16 overflow-hidden rounded-lg border border-app-border bg-app-panel">
            {urls[p] ? (
              <img src={urls[p]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-ink-faint">…</div>
            )}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== p))}
              aria-label="Hapus foto"
              className="absolute right-0.5 top-0.5 rounded-full bg-black/55 p-0.5 text-white hover:bg-black/75"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-app-border bg-app-panel text-ink-muted hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {busy ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-app-border border-t-brand" />
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="text-[9px] font-bold">Tambah</span>
            </>
          )}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={onPick} />
      </div>
      {error && <p className="mt-1 text-[11px] text-danger">{error}</p>}
    </div>
  )
}
