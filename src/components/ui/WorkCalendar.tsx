import { useMemo } from 'react'

interface Props {
  /** Month shown, as "YYYY-MM". */
  monthKey: string
  /** Selected work dates as ISO "YYYY-MM-DD". */
  selected: string[]
  onChange: (dates: string[]) => void
}

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] // Monday-first

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/**
 * Month calendar for ticking days worked (Harian payroll). Week starts Monday;
 * Sundays are marked red. Selected count drives Gaji Dasar upstream.
 */
export default function WorkCalendar({ monthKey, selected, onChange }: Props) {
  const [yStr, mStr] = monthKey.split('-')
  const year = Number(yStr)
  const month = Number(mStr) // 1..12
  const sel = useMemo(() => new Set(selected), [selected])

  const cells = useMemo(() => {
    const first = new Date(year, month - 1, 1)
    const daysInMonth = new Date(year, month, 0).getDate()
    const lead = (first.getDay() + 6) % 7 // Monday-first offset
    const out: (number | null)[] = Array.from({ length: lead }, () => null)
    for (let d = 1; d <= daysInMonth; d++) out.push(d)
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [year, month])

  const toggle = (d: number) => {
    const iso = `${year}-${pad(month)}-${pad(d)}`
    const next = new Set(sel)
    if (next.has(iso)) next.delete(iso)
    else next.add(iso)
    onChange([...next].sort())
  }

  const isSunday = (d: number) => new Date(year, month - 1, d).getDay() === 0

  const selectAllWeekdays = () => {
    const daysInMonth = new Date(year, month, 0).getDate()
    const all: string[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      if (!isSunday(d)) all.push(`${year}-${pad(month)}-${pad(d)}`)
    }
    onChange(all)
  }

  return (
    <div className="rounded-field border border-app-border bg-app-panel p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-bold text-ink">
          Hari kerja · <span className="text-brand">{selected.length} hari</span>
        </span>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={selectAllWeekdays}
            className="rounded-md border border-app-border bg-app-card px-2 py-1 text-[10.5px] font-bold text-ink-secondary hover:bg-app-panel"
          >
            Sen–Sab
          </button>
          <button
            type="button"
            onClick={() => onChange([])}
            className="rounded-md border border-app-border bg-app-card px-2 py-1 text-[10.5px] font-bold text-ink-secondary hover:bg-app-panel"
          >
            Kosongkan
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`py-1 text-center text-[10px] font-extrabold uppercase ${
              i === 6 ? 'text-danger' : 'text-ink-muted'
            }`}
          >
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />
          const iso = `${year}-${pad(month)}-${pad(d)}`
          const on = sel.has(iso)
          const sun = isSunday(d)
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(d)}
              className={`aspect-square rounded-md text-[12px] font-bold transition ${
                on
                  ? 'bg-brand text-white'
                  : sun
                    ? 'bg-app-card text-danger hover:bg-danger-bg'
                    : 'bg-app-card text-ink-body hover:bg-app-panel'
              }`}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
