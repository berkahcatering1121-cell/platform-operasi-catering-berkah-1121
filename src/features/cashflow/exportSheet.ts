// Builds the cash-flow ledger as spreadsheet data (shared by CSV and XLSX).
// Money cells stay numeric so Excel can sum them.
import { formatDate } from '@/lib/format'
import type { CsvCell, XSheet, XCell } from '@/lib/export'

export interface CashExportRow {
  date: string
  sourceLabel: string
  description: string
  category: string
  method: string
  cashIn: number
  cashOut: number
  balance: number
}

export interface CashExportCtx {
  rows: CashExportRow[] // chronological (oldest first)
  totals: { cashIn: number; cashOut: number; net: number }
  t: (id: string, en?: string) => string
}

function headerRow(t: CashExportCtx['t']): string[] {
  return [
    t('Tanggal'),
    t('Sumber Modul'),
    t('Keterangan'),
    t('Kategori'),
    t('Metode'),
    t('Uang Masuk'),
    t('Uang Keluar'),
    t('Saldo Berjalan'),
  ]
}

export function cashCsvRows({ rows, totals, t }: CashExportCtx): CsvCell[][] {
  const out: CsvCell[][] = [
    [`Catering Berkah 1121 - ${t('Arus Kas')}`],
    [],
    headerRow(t),
    ...rows.map((r): CsvCell[] => [
      formatDate(r.date),
      r.sourceLabel,
      r.description,
      r.category,
      r.method,
      Math.round(r.cashIn),
      Math.round(r.cashOut),
      Math.round(r.balance),
    ]),
    [t('Total'), '', '', '', '', Math.round(totals.cashIn), Math.round(totals.cashOut), Math.round(totals.net)],
  ]
  return out
}

export function cashXlsxSheets({ rows, totals, t }: CashExportCtx): XSheet[] {
  const body: XCell[][] = rows.map((r): XCell[] => [
    formatDate(r.date),
    r.sourceLabel,
    r.description,
    r.category,
    r.method,
    { v: Math.round(r.cashIn), s: 2 },
    { v: Math.round(r.cashOut), s: 2 },
    { v: Math.round(r.balance), s: 2 },
  ])
  const totalRow: XCell[] = [
    { v: t('Total'), s: 1 },
    '',
    '',
    '',
    '',
    { v: Math.round(totals.cashIn), s: 3 },
    { v: Math.round(totals.cashOut), s: 3 },
    { v: Math.round(totals.net), s: 3 },
  ]
  return [
    {
      name: t('Arus Kas'),
      rows: [headerRow(t).map((h): XCell => ({ v: h, s: 1 })), ...body, totalRow],
      cols: [13, 18, 34, 20, 12, 15, 15, 16],
    },
  ]
}
