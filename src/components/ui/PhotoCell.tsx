import { useEffect, useState } from 'react'
import { signedUrls } from '@/lib/storage'
import Lightbox from './Lightbox'

interface Props {
  paths: string[]
  title?: string
}

/**
 * Table "Foto" cell: shows up to two thumbnails + a count; clicking opens a
 * lightbox of all photos. Signed URLs are resolved lazily on first render.
 */
export default function PhotoCell({ paths, title }: Props) {
  const [urls, setUrls] = useState<string[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!paths.length) return
    let active = true
    signedUrls(paths)
      .then((u) => active && setUrls(u))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [paths])

  if (!paths.length) return <span className="text-ink-faint">—</span>

  const shown = urls.slice(0, 2)
  return (
    <>
      <button
        type="button"
        onClick={() => urls.length && setOpen(true)}
        className="flex items-center gap-1"
        aria-label={`Lihat ${paths.length} foto`}
      >
        <span className="flex -space-x-2">
          {shown.length ? (
            shown.map((u, i) => (
              <img
                key={i}
                src={u}
                alt=""
                className="h-8 w-8 rounded-md border-2 border-app-card object-cover"
              />
            ))
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-app-border bg-app-panel text-[9px] text-ink-faint">
              …
            </span>
          )}
        </span>
        {paths.length > 2 && (
          <span className="text-[11px] font-bold text-ink-muted">+{paths.length - 2}</span>
        )}
      </button>
      {open && <Lightbox urls={urls} title={title} onClose={() => setOpen(false)} />}
    </>
  )
}
