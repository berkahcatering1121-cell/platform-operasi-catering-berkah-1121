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
