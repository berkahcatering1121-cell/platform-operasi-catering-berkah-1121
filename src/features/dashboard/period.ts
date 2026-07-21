import { monthsShort } from '@/lib/format'

export type PeriodKey =
  | 'today'
  | 'yesterday'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'custom'

export interface Range {
  start: string // inclusive ISO date (YYYY-MM-DD)
  end: string // inclusive ISO date
}

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
// Week starts Monday (Indonesian convention).
const startOfWeek = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return addDays(x, -((x.getDay() + 6) % 7))
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Hari ini' },
  { key: 'yesterday', label: 'Kemarin' },
  { key: 'thisWeek', label: 'Minggu ini' },
  { key: 'lastWeek', label: 'Minggu lalu' },
  { key: 'thisMonth', label: 'Bulan ini' },
  { key: 'lastMonth', label: 'Bulan lalu' },
]

export function periodRange(key: PeriodKey, ref: Date, customDay?: string): Range {
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())
  switch (key) {
    case 'yesterday': {
      const y = addDays(today, -1)
      return { start: isoDate(y), end: isoDate(y) }
    }
    case 'thisWeek': {
      const s = startOfWeek(today)
      return { start: isoDate(s), end: isoDate(addDays(s, 6)) }
    }
    case 'lastWeek': {
      const s = addDays(startOfWeek(today), -7)
      return { start: isoDate(s), end: isoDate(addDays(s, 6)) }
    }
    case 'thisMonth': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1)
      const e = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      return { start: isoDate(s), end: isoDate(e) }
    }
    case 'lastMonth': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const e = new Date(today.getFullYear(), today.getMonth(), 0)
      return { start: isoDate(s), end: isoDate(e) }
    }
    case 'custom': {
      const d = customDay || isoDate(today)
      return { start: d, end: d }
    }
    case 'today':
    default:
      return { start: isoDate(today), end: isoDate(today) }
  }
}

// Human label like "14 Jul 2026" or "14 – 20 Jul 2026" / "28 Jun – 04 Jul 2026".
export function formatRangeLabel(r: Range): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    return { d, m: monthsShort()[m - 1], y }
  }
  const a = fmt(r.start)
  const b = fmt(r.end)
  if (r.start === r.end) return `${a.d} ${a.m} ${a.y}`
  if (a.m === b.m && a.y === b.y) return `${a.d} – ${b.d} ${b.m} ${b.y}`
  if (a.y === b.y) return `${a.d} ${a.m} – ${b.d} ${b.m} ${b.y}`
  return `${a.d} ${a.m} ${a.y} – ${b.d} ${b.m} ${b.y}`
}
