import { useState } from 'react'
import { PERIOD_OPTIONS, type PeriodKey } from './period'
import { useT } from '@/lib/i18n'
import { monthsShort } from '@/lib/format'

interface Props {
  period: PeriodKey
  customDay: string
  onSelect: (period: PeriodKey, customDay?: string) => void
}

/** Single dropdown box to pick the summary period (incl. a specific day). */
export default function PeriodPicker({ period, customDay, onSelect }: Props) {
  const { t } = useT()
  const [open, setOpen] = useState(false)

  const customLabel = (day: string): string => {
    const [y, m, d] = day.split('-').map(Number)
    if (!y) return t('Pilih tanggal')
    return `${d} ${monthsShort()[m - 1]} ${y}`
  }

  const label =
    period === 'custom'
      ? customLabel(customDay)
      : t(PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? 'Periode')

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-btn border border-app-border bg-app-card px-3 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
        <span className="min-w-[64px] text-left">{label}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-1.5 w-56 overflow-hidden rounded-field border border-app-border bg-app-card p-1 shadow-card">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.key}
                onClick={() => {
                  onSelect(p.key)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-[13px] font-semibold ${
                  period === p.key ? 'bg-brand text-white' : 'text-ink-body hover:bg-app-panel'
                }`}
              >
                {t(p.label)}
                {period === p.key && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </button>
            ))}

            {/* Pick a specific day */}
            <label
              className={`mt-1 flex cursor-pointer items-center justify-between gap-2 rounded-md border-t border-app-border px-3 py-2.5 text-[13px] font-semibold ${
                period === 'custom' ? 'text-brand' : 'text-ink-body'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="17" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                {t('Pilih tanggal')}
              </span>
              <input
                type="date"
                value={customDay}
                onChange={(e) => {
                  onSelect('custom', e.target.value)
                  setOpen(false)
                }}
                className="rounded-md border border-app-border bg-app-panel px-1.5 py-1 text-[12px] text-ink outline-none"
              />
            </label>
          </div>
        </>
      )}
    </div>
  )
}
