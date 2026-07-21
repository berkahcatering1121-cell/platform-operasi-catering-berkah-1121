import { formatPercent, formatRupiah } from '@/lib/format'
import { useT } from '@/lib/i18n'

export interface Segment {
  label: string
  value: number
  color: string
}

interface Props {
  segments: Segment[]
}

const PALETTE = ['#14432E', '#2E7D57', '#6BA588', '#C9A93B', '#E2C77E', '#9A7018', '#B79A5A', '#8A7B68']

export function paletteColor(i: number) {
  return PALETTE[i % PALETTE.length]
}

/** Composition donut via CSS conic-gradient + a legend with % and amounts. */
export default function Donut({ segments }: Props) {
  const { t } = useT()
  const total = segments.reduce((t, s) => t + s.value, 0)
  const withPct = segments.map((s) => ({ ...s, pct: total > 0 ? s.value / total : 0 }))

  let acc = 0
  const gradient =
    total > 0
      ? `conic-gradient(${withPct
          .map((s) => {
            const from = acc * 100
            acc += s.pct
            return `${s.color} ${from}% ${acc * 100}%`
          })
          .join(', ')})`
      : '#EDE6DB'

  // Keep "Rp <nominal>" on ONE line, shrinking the font for long amounts so it
  // never wraps to "Rp" above the number.
  const totalStr = formatRupiah(total)
  const totalSize = totalStr.length >= 13 ? 10.5 : totalStr.length >= 11 ? 11.5 : 12.5

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative flex-none" style={{ width: 132, height: 132 }}>
        <div className="h-full w-full rounded-full" style={{ background: gradient }} />
        <div className="absolute inset-[18px] flex flex-col items-center justify-center rounded-full bg-app-card px-1 text-center">
          <span className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-muted">Total</span>
          <span className="whitespace-nowrap font-extrabold leading-tight text-ink" style={{ fontSize: totalSize }}>
            {totalStr}
          </span>
        </div>
      </div>
      <div className="min-w-[180px] flex-1 space-y-1.5">
        {withPct.length === 0 && <div className="text-[12px] text-ink-muted">{t('Belum ada data.')}</div>}
        {withPct.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-[12px]">
            <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: s.color }} />
            <span className="flex-1 truncate text-ink-body">{s.label}</span>
            <span className="font-bold tabular-nums text-ink">{formatPercent(s.pct)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
