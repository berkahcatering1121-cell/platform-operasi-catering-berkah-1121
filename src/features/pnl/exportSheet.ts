// Builds the P&L report as spreadsheet data (shared by the CSV and XLSX
// exporters). Money cells stay numeric so Excel can sum them; percentage and
// ratio rows render as readable text.
import { months as monthNames, monthsShort } from '@/lib/format'
import type { CsvCell, XSheet, XCell } from '@/lib/export'
import type { PnlMonth } from './api'
import { ROWS, computeMetrics, scopeRevenue, verdict } from './model'

export interface PnlExportCtx {
  months: PnlMonth[]
  year: number
  scope: number // 0 = whole year, 1-12 = single month
  t: (id: string, en?: string) => string
}

const round = (n: number) => Math.round(n)
const pct = (r: number) => (r * 100).toFixed(1).replace('.', ',') + '%'
const pctInt = (r: number) => Math.round(r * 100) + '%'

export function pnlPeriodLabel({ year, scope, t }: PnlExportCtx): string {
  return scope === 0 ? `${t('Tahun')} ${year}` : `${monthNames()[scope - 1]} ${year}`
}

interface Row {
  cells: (string | number)[]
  kind: 'header' | 'money' | 'pct'
  strong: boolean
}

// The report as structured rows (header + P&L table), independent of format.
function tableRows(ctx: PnlExportCtx): { header: string[]; rows: Row[] } {
  const { months, year, scope, t } = ctx
  const isYear = scope === 0
  const cols = isYear ? months : months.filter((m) => m.month_no === scope)

  const header = [
    t('Keterangan'),
    ...cols.map((m) => monthsShort()[m.month_no - 1]),
    ...(isYear ? [`${t('Total')} ${year}`] : []),
  ]

  const rows: Row[] = ROWS.map((row): Row => {
    if (row.kind === 'header') {
      return { cells: [t(row.label)], kind: 'header', strong: true }
    }
    const strong = row.kind === 'money' ? !!row.strong : false
    const label = (row.kind === 'money' && row.indent ? '   ' : '') + t(row.label)
    if (row.kind === 'money') {
      const vals = cols.map((m) => round(row.get(m)))
      const total = isYear ? [round(cols.reduce((a, m) => a + row.get(m), 0))] : []
      return { cells: [label, ...vals, ...total], kind: 'money', strong }
    }
    const vals = cols.map((m) => {
      const d = row.den(m)
      return d > 0 ? pct(row.numr(m) / d) : '-'
    })
    const total = isYear
      ? [
          (() => {
            const nn = cols.reduce((a, m) => a + row.numr(m), 0)
            const dd = cols.reduce((a, m) => a + row.den(m), 0)
            return dd > 0 ? pct(nn / dd) : '-'
          })(),
        ]
      : []
    return { cells: [label, ...vals, ...total], kind: 'pct', strong: false }
  })

  return { header, rows }
}

// Internal analysis rows (Metrik / Nilai / Target / Status / Catatan).
function analysisRows(ctx: PnlExportCtx): { header: string[]; rows: string[][] } | null {
  const { months, scope, t } = ctx
  if (scopeRevenue(months, scope) <= 0) return null
  const header = [t('Metrik'), t('Nilai'), t('Target'), t('Status'), t('Catatan')]
  const rows = computeMetrics(months, scope).map((m) => {
    const v = verdict(m)
    return [
      t(m.label),
      pct(m.value),
      `${m.kind === 'cost' ? t('maks') : t('min')} ${pctInt(m.target)}`,
      t(v.label),
      v.tone !== 'green' ? t(m.note) : '',
    ]
  })
  return { header, rows }
}

// ── CSV: one flat sheet (P&L table, blank line, then analysis) ──
export function pnlCsvRows(ctx: PnlExportCtx): CsvCell[][] {
  const { header, rows } = tableRows(ctx)
  const out: CsvCell[][] = [
    [`Catering Berkah 1121 - ${ctx.t('Laporan Laba Rugi (P&L)')} - ${pnlPeriodLabel(ctx)}`],
    [],
    header,
    ...rows.map((r) => r.cells),
  ]
  const an = analysisRows(ctx)
  if (an) {
    out.push([], [ctx.t('Catatan Analisis Internal')], an.header, ...an.rows)
  }
  return out
}

// ── XLSX: a "P&L" sheet plus an "Analisis" sheet ──
export function pnlXlsxSheets(ctx: PnlExportCtx): XSheet[] {
  const { header, rows } = tableRows(ctx)
  const styled: XCell[][] = [
    header.map((h): XCell => ({ v: h, s: 1 })),
    ...rows.map((r): XCell[] =>
      r.cells.map((c, i): XCell => {
        if (i === 0) return { v: c, s: r.strong || r.kind === 'header' ? 1 : 0 }
        if (typeof c === 'number') return { v: c, s: r.strong ? 3 : 2 }
        return { v: c, s: r.strong ? 1 : 0 }
      }),
    ),
  ]
  const cols = ctx.scope === 0 ? ctx.months : ctx.months.filter((m) => m.month_no === ctx.scope)
  const sheets: XSheet[] = [
    { name: ctx.t('P&L'), rows: styled, cols: [26, ...cols.map(() => 13), ...(ctx.scope === 0 ? [15] : [])] },
  ]

  const an = analysisRows(ctx)
  if (an) {
    sheets.push({
      name: ctx.t('Analisis'),
      rows: [an.header.map((h): XCell => ({ v: h, s: 1 })), ...an.rows.map((r) => r as XCell[])],
      cols: [24, 12, 14, 14, 60],
    })
  }
  return sheets
}
