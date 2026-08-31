import { formatMonthLabel } from './format'

export interface MonthGroup<T> {
  key: string // "YYYY-MM"
  label: string // "Juni 2026"
  rows: T[]
}

/**
 * Group ledger rows by their month key (newest month first). Used by every
 * transaction module that renders per-month tables with subtotals.
 */
export function groupByMonth<T>(rows: T[], keyOf: (row: T) => string): MonthGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const k = keyOf(r)
    const arr = map.get(k) ?? []
    arr.push(r)
    map.set(k, arr)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, rs]) => ({ key, label: formatMonthLabel(key + '-01'), rows: rs }))
}

export interface WeekGroup<T> {
  monthKey: string // "YYYY-MM"
  weekNo: number // 1-5 (by day-of-month: 1-7, 8-14, 15-21, 22-28, 29-31)
  rows: T[]
}

// Which week-of-month a date falls in, by 7-day blocks from the 1st.
export function weekOfMonth(isoDate: string): number {
  const day = parseInt(isoDate.slice(8, 10), 10) || 1
  return Math.min(5, Math.ceil(day / 7))
}

/**
 * Group rows by month and then by week-of-month. Months are newest first;
 * weeks run ascending within a month (Minggu Pertama first).
 */
export function groupByMonthWeek<T>(
  rows: T[],
  monthKeyOf: (row: T) => string,
  dateOf: (row: T) => string,
): WeekGroup<T>[] {
  const map = new Map<string, T[]>()
  for (const r of rows) {
    const key = `${monthKeyOf(r)}#${weekOfMonth(dateOf(r))}`
    const arr = map.get(key) ?? []
    arr.push(r)
    map.set(key, arr)
  }
  return [...map.entries()]
    .map(([key, rs]) => {
      const [monthKey, w] = key.split('#')
      return { monthKey, weekNo: Number(w), rows: rs }
    })
    .sort((a, b) => (a.monthKey === b.monthKey ? a.weekNo - b.weekNo : b.monthKey.localeCompare(a.monthKey)))
}
