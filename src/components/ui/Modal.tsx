import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  /** Wider modal for editors (e.g. HPP recipe). */
  wide?: boolean
}

/**
 * Centered on desktop, bottom-sheet on mobile. Locks body scroll while open
 * and closes on Esc / scrim click.
 */
export default function Modal({ open, onClose, title, subtitle, children, footer, wide }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/45 animate-fadeIn" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden bg-app-card shadow-modal ${
          wide ? 'sm:max-w-[720px]' : 'sm:max-w-[460px]'
        } rounded-t-modal sm:rounded-modal animate-sheetUp sm:animate-fadeIn`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-app-border px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15.5px] font-extrabold text-ink">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12px] text-ink-muted">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="-mr-1.5 rounded-md p-1.5 text-ink-secondary hover:bg-app-panel"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="cb-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-app-border bg-app-panel px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
