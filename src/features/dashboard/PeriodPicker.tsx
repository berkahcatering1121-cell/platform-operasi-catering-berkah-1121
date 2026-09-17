import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { PERIOD_OPTIONS, type PeriodKey } from './period'
import { useT } from '@/lib/i18n'
import { months, monthsShort } from '@/lib/format'

interface Props {
  period: PeriodKey
  customDay: string
  /** Year the month grid / whole-year option apply to. */
  year: number
  onYearChange: (year: number) => void
  onSelect: (period: PeriodKey, customDay?: string) => void
}

const W = 268 // dropdown width (px)

/** One dropdown to pick the dashboard period: relative range, a whole year, a
 *  specific month, or a specific day. Rendered in a portal so it always sits
 *  above the cards. */
export default function PeriodPicker({ period, customDay, year, onYearChange, onSelect }: Props) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const place = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (!r) return
    setPos({ top: r.bottom + 6, left: Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8)) })
  }
  useLayoutEffect(() => {
    if (!open) return
    place()
    const on = () => place()
    window.addEventListener('resize', on)
    window.addEventListener('scroll', on, true)
    return () => {
      window.removeEventListener('resize', on)
      window.removeEventListener('scroll', on, true)
    }
  }, [open])

  const customLabel = (day: string): string => {
    const [y, m, d] = day.split('-').map(Number)
    if (!y) return t('Pilih tanggal')
    return `${d} ${monthsShort()[m - 1]} ${y}`
  }
  const label =
    period === 'custom'
      ? customLabel(customDay)
      : period === 'month'
        ? `${months()[Number(customDay.slice(5, 7)) - 1]} ${customDay.slice(0, 4)}`
        : period === 'year'
          ? `${t('Setahun')} ${customDay.slice(0, 4)}`
          : t(PERIOD_OPTIONS.find((p) => p.key === period)?.label ?? 'Periode')

  const pick = (p: PeriodKey, day?: string) => {
    onSelect(p, day)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
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

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <div
              className="cb-scroll fixed z-[61] max-h-[80vh] overflow-y-auto rounded-field border border-app-border bg-app-card p-1 shadow-card"
              style={{ top: pos.top, left: pos.left, width: W }}
            >
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => pick(p.key)}
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

              {/* Whole year + specific month, with year navigation */}
              <div className="mt-1 border-t border-app-border px-1.5 pt-2">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onYearChange(year - 1)}
                    aria-label={t('Tahun sebelumnya')}
                    className="rounded-md px-2 py-1 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => pick('year', `${year}-01-01`)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-[12.5px] font-extrabold ${
                      period === 'year' && customDay.slice(0, 4) === String(year)
                        ? 'bg-brand text-white'
                        : 'text-brand-dark hover:bg-app-panel'
                    }`}
                  >
                    {t('Setahun')} {year}
                  </button>
                  <button
                    onClick={() => onYearChange(year + 1)}
                    aria-label={t('Tahun berikutnya')}
                    className="rounded-md px-2 py-1 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
                  >
                    ›
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1 pb-1">
                  {monthsShort().map((m, i) => {
                    const key = `${year}-${String(i + 1).padStart(2, '0')}-01`
                    const active = period === 'month' && customDay.slice(0, 7) === key.slice(0, 7)
                    return (
                      <button
                        key={m}
                        onClick={() => pick('month', key)}
                        className={`rounded-md px-2 py-1.5 text-[12px] font-bold ${
                          active ? 'bg-brand text-white' : 'text-ink-body hover:bg-app-panel'
                        }`}
                      >
                        {m}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Specific day */}
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
                  value={period === 'custom' ? customDay : ''}
                  onChange={(e) => e.target.value && pick('custom', e.target.value)}
                  className="rounded-md border border-app-border bg-app-panel px-1.5 py-1 text-[12px] text-ink outline-none"
                />
              </label>
            </div>
          </>,
          document.body,
        )}
    </div>
  )
}
