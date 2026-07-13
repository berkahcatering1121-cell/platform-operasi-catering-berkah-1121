import { useEffect, useState } from 'react'

interface Props {
  urls: string[]
  title?: string
  onClose: () => void
}

/** Full-screen image viewer with prev/next + keyboard nav. */
export default function Lightbox({ urls, title, onClose }: Props) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(urls.length - 1, i + 1))
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(0, i - 1))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [urls.length, onClose])

  if (!urls.length) return null

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/85 animate-fadeIn" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 text-white/90">
        <span className="text-[12.5px] font-semibold">
          {title ? `${title} · ` : ''}
          {idx + 1} / {urls.length}
        </span>
        <button onClick={onClose} aria-label="Tutup" className="rounded-md p-1.5 hover:bg-white/10">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {idx > 0 && (
          <button
            onClick={() => setIdx((i) => i - 1)}
            aria-label="Sebelumnya"
            className="absolute left-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
        )}
        <img src={urls[idx]} alt="" className="max-h-[80vh] max-w-full rounded-lg object-contain shadow-modal" />
        {idx < urls.length - 1 && (
          <button
            onClick={() => setIdx((i) => i + 1)}
            aria-label="Berikutnya"
            className="absolute right-3 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        )}
      </div>
    </div>
  )
}
