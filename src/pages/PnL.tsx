import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { Card, ErrorState, LoadingRows } from '@/components/ui/Card'
import { formatPercent, ID_MONTHS_SHORT } from '@/lib/format'
import { usePnl, type PnlMonth } from '@/features/pnl/api'

const TODAY_YEAR = new Date().getFullYear()

// Values are shown in thousands of Rupiah (Rp '000) to keep the 13-column
// report compact. Negatives render in red; a true zero shows an em dash.
function num(n: number) {
  const v = Math.round(n / 1000)
  return v === 0 ? '—' : v.toLocaleString('id-ID')
}

type RowDef =
  | { kind: 'header'; label: string }
  | {
      kind: 'money'
      label: string
      get: (m: PnlMonth) => number
      strong?: boolean
      tint?: string
      indent?: boolean
      accent?: 'green'
    }
  | { kind: 'pct'; label: string; numr: (m: PnlMonth) => number; den: (m: PnlMonth) => number }

const ROWS: RowDef[] = [
  { kind: 'money', label: 'Pendapatan', get: (m) => m.pendapatan, strong: true },
  { kind: 'money', label: 'HPP — Pembelian Bahan Baku', get: (m) => m.hpp },
  { kind: 'money', label: 'Laba Kotor', get: (m) => m.laba_kotor, strong: true, tint: 'bg-app-panel' },
  { kind: 'pct', label: 'Margin Kotor (%)', numr: (m) => m.laba_kotor, den: (m) => m.pendapatan },
  { kind: 'header', label: 'Beban Operasional' },
  { kind: 'money', label: 'Gaji Karyawan', get: (m) => m.beban_gaji, indent: true },
  { kind: 'money', label: 'Sewa Tempat & Dapur', get: (m) => m.beban_sewa, indent: true },
  { kind: 'money', label: 'Listrik, Air & Gas', get: (m) => m.beban_listrik, indent: true },
  { kind: 'money', label: 'Transportasi & Pengiriman', get: (m) => m.beban_transport, indent: true },
  { kind: 'money', label: 'Marketing & Promosi', get: (m) => m.beban_marketing, indent: true },
  { kind: 'money', label: 'Biaya Lain-lain', get: (m) => m.beban_lain, indent: true },
  { kind: 'money', label: 'Depresiasi Aset', get: (m) => m.beban_depresiasi, indent: true },
  { kind: 'money', label: 'Total Beban Operasional', get: (m) => m.total_beban_operasional, strong: true, tint: 'bg-app-panel' },
  // EBITDA = Laba Bersih + Depresiasi Aset (no interest/tax/amortisation tracked here).
  { kind: 'money', label: 'EBITDA', get: (m) => m.laba_bersih + m.beban_depresiasi, strong: true, tint: 'bg-[#EDF5EF]', accent: 'green' },
  { kind: 'pct', label: '% EBITDA', numr: (m) => m.laba_bersih + m.beban_depresiasi, den: (m) => m.pendapatan },
  { kind: 'money', label: 'Laba Bersih', get: (m) => m.laba_bersih, strong: true, tint: 'bg-gold-tint', accent: 'green' },
  { kind: 'pct', label: 'Margin Bersih (%)', numr: (m) => m.laba_bersih, den: (m) => m.pendapatan },
]

export default function PnL() {
  const [year, setYear] = useState(TODAY_YEAR)
  const pnl = usePnl(year)
  const months = pnl.data ?? []

  // Annual totals always sum the whole year.
  const annual = useMemo(() => {
    const sum = (f: (m: PnlMonth) => number) => months.reduce((t, m) => t + f(m), 0)
    return { sum }
  }, [months])

  // Only show the contiguous range of months that actually have activity, so a
  // business that started mid-year (e.g. Juli) shows Jul–Des instead of leading
  // empty columns. Falls back to all 12 months when there is no data at all.
  const shownMonths = useMemo(() => {
    const active = (m: PnlMonth) =>
      m.pendapatan !== 0 || m.hpp !== 0 || m.total_beban_operasional !== 0 || m.laba_bersih !== 0
    const idxs = months.map((m, i) => (active(m) ? i : -1)).filter((i) => i >= 0)
    if (!idxs.length) return months
    return months.slice(Math.min(...idxs), Math.max(...idxs) + 1)
  }, [months])

  const labelBase = 'sticky left-0 z-10 px-3 py-[10px] text-[12px] whitespace-nowrap border-t border-[#F1EBE2]'
  const cellBase = 'px-3 py-[10px] text-[12px] text-right tabular-nums whitespace-nowrap border-t border-[#F1EBE2]'

  return (
    <>
      <PageHeader
        title="P&L (Laba Rugi)"
        subtitle="Laporan read-only 12 bulan + total tahunan, roll-up otomatis dari semua modul."
        actions={
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setYear((y) => y - 1)}
              className="rounded-btn border border-app-border bg-app-card px-2.5 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
              aria-label="Tahun sebelumnya"
            >
              ‹
            </button>
            <span className="min-w-[62px] text-center text-[14px] font-extrabold text-ink">{year}</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="rounded-btn border border-app-border bg-app-card px-2.5 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
              aria-label="Tahun berikutnya"
            >
              ›
            </button>
          </div>
        }
      />

      {pnl.isLoading ? (
        <LoadingRows />
      ) : pnl.error ? (
        <ErrorState message={(pnl.error as Error).message} />
      ) : (
        <Card bodyClassName="">
          <div className="border-b border-app-border px-4 py-2 text-[11px] text-ink-muted">
            Semua angka dalam ribu Rupiah (Rp '000) · read-only, dihitung otomatis · EBITDA = Laba Bersih + Depresiasi Aset
          </div>
          <div className="cb-scroll overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th
                    className={`${labelBase} sticky top-0 bg-app-panel text-left text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-ink-muted`}
                  >
                    Keterangan
                  </th>
                  {shownMonths.map((m) => (
                    <th
                      key={m.month_no}
                      className={`${cellBase} bg-app-panel text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-ink-muted`}
                    >
                      {ID_MONTHS_SHORT[m.month_no - 1]}
                    </th>
                  ))}
                  <th
                    className={`${cellBase} bg-gold-tint text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-brand-dark`}
                  >
                    Total {year}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, ri) => {
                  if (row.kind === 'header') {
                    return (
                      <tr key={ri}>
                        <td className={`${labelBase} bg-[#F1F6F2] text-[11px] font-extrabold uppercase tracking-[0.05em] text-brand`}>
                          {row.label}
                        </td>
                        <td className="bg-[#F1F6F2] border-t border-[#E1EBE3]" colSpan={shownMonths.length + 1} />
                      </tr>
                    )
                  }

                  if (row.kind === 'pct') {
                    const annNum = annual.sum(row.numr)
                    const annDen = annual.sum(row.den)
                    return (
                      <tr key={ri}>
                        <td className={`${labelBase} bg-app-card italic text-ink-muted`}>{row.label}</td>
                        {shownMonths.map((m) => {
                          const d = row.den(m)
                          return (
                            <td key={m.month_no} className={`${cellBase} bg-app-card text-ink-muted`}>
                              {d > 0 ? formatPercent(row.numr(m) / d) : '—'}
                            </td>
                          )
                        })}
                        <td className={`${cellBase} bg-gold-tint font-bold text-brand-dark`}>
                          {annDen > 0 ? formatPercent(annNum / annDen) : '—'}
                        </td>
                      </tr>
                    )
                  }

                  // money row
                  const tint = row.tint ?? 'bg-app-card'
                  const strong = !!row.strong
                  const accentGreen = row.accent === 'green'
                  const labelCls = `${labelBase} ${tint} ${
                    row.indent
                      ? 'pl-6 text-ink-secondary'
                      : accentGreen
                        ? 'font-extrabold text-ok'
                        : strong
                          ? 'font-extrabold text-ink'
                          : 'text-ink-body'
                  }`
                  const valueCls = (v: number) =>
                    `${cellBase} ${tint} ${
                      v < 0
                        ? 'text-danger font-bold'
                        : accentGreen
                          ? 'font-extrabold text-ok'
                          : strong
                            ? 'font-extrabold text-ink'
                            : 'text-ink-body'
                    }`
                  const annualVal = annual.sum(row.get)
                  return (
                    <tr key={ri}>
                      <td className={labelCls}>{row.label}</td>
                      {shownMonths.map((m) => (
                        <td key={m.month_no} className={valueCls(row.get(m))}>
                          {num(row.get(m))}
                        </td>
                      ))}
                      <td
                        className={`${cellBase} bg-gold-tint font-extrabold ${
                          annualVal < 0 ? 'text-danger' : accentGreen ? 'text-ok' : 'text-brand-dark'
                        }`}
                      >
                        {num(annualVal)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
