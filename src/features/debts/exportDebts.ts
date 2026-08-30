// Builds the debt list as spreadsheet data (CSV + XLSX). Column order matches
// the import template so an exported file can be re-imported. Dates stay in ISO
// (YYYY-MM-DD) so they round-trip cleanly; money cells stay numeric.
import type { CsvCell, XSheet, XCell } from '@/lib/export'
import type { DebtView } from '@/lib/db'

type T = (id: string, en?: string) => string

function header(t: T): string[] {
  return [
    t('Tanggal'),
    t('Kreditur'),
    t('Jenis'),
    t('Keterangan'),
    t('Jumlah'),
    t('Jatuh Tempo'),
    t('Sudah Dibayar'),
    t('Sisa'),
    t('Status'),
  ]
}

const paidOf = (r: DebtView) => Math.min(r.paid_amount, r.amount)

export function debtsCsvRows(rows: DebtView[], t: T): CsvCell[][] {
  return [
    [`Catering Berkah 1121 - ${t('Hutang')}`],
    [],
    header(t),
    ...rows.map((r): CsvCell[] => [
      r.debt_date,
      r.creditor,
      r.debt_type ?? '',
      r.description ?? '',
      Math.round(r.amount),
      r.due_date ?? '',
      Math.round(paidOf(r)),
      Math.round(r.sisa),
      r.status,
    ]),
  ]
}

export function debtsXlsxSheets(rows: DebtView[], t: T): XSheet[] {
  const body: XCell[][] = rows.map((r): XCell[] => [
    r.debt_date,
    r.creditor,
    r.debt_type ?? '',
    r.description ?? '',
    { v: Math.round(r.amount), s: 2 },
    r.due_date ?? '',
    { v: Math.round(paidOf(r)), s: 2 },
    { v: Math.round(r.sisa), s: 2 },
    r.status,
  ])
  return [
    {
      name: t('Hutang'),
      rows: [header(t).map((h): XCell => ({ v: h, s: 1 })), ...body],
      cols: [12, 22, 16, 30, 15, 12, 15, 15, 14],
    },
  ]
}
