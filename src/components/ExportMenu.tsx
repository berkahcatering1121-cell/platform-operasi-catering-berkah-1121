import { useState } from 'react'
import { useT } from '@/lib/i18n'

export interface ExportItem {
  label: string
  sub?: string
  onSelect: () => void
}

// A compact "Unduh" dropdown listing export formats. Used where a single
// current view is exported (e.g. the cash-flow ledger).
export default function ExportMenu({
  items,
  disabled,
  busy,
}: {
  items: ExportItem[]
  disabled?: boolean
  busy?: boolean
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled || busy}
        className="flex items-center gap-1.5 rounded-btn bg-brand px-3 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
        </svg>
        {busy ? t('Menyiapkan…') : t('Unduh')}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-field border border-app-border bg-app-card py-1 shadow-card">
            {items.map((it) => (
              <button
                key={it.label}
                onClick={() => {
                  setOpen(false)
                  it.onSelect()
                }}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-app-panel"
              >
                <span className="text-[13px] font-bold text-ink">{it.label}</span>
                {it.sub && <span className="text-[11px] text-ink-faint">{it.sub}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
