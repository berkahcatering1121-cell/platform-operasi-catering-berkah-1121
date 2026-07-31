import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { Card, ErrorState, LoadingRows } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatPercent, formatPercentInt, months as monthNames, monthsShort } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { usePnl, type PnlMonth } from '@/features/pnl/api'

// F&B / catering reference targets (as % of revenue). `cost` = lower is better,
// `margin` = higher is better. Adjust to the business as needed.
type Metric = {
  label: string
  hint: string
  value: number
  target: number
  kind: 'cost' | 'margin'
  /** Short auto-tip shown when the metric is not ideal (Over / below target). */
  note: string
}

function verdict(m: Metric): { label: string; tone: 'green' | 'amber' | 'red' } {
  if (m.kind === 'cost') {
    if (m.value <= m.target) return { label: 'Ideal', tone: 'green' }
    if (m.value <= m.target * 1.15) return { label: 'Sedikit Over', tone: 'amber' }
    return { label: 'Over', tone: 'red' }
  }
  if (m.value >= m.target) return { label: 'Sehat', tone: 'green' }
  if (m.value >= m.target * 0.7) return { label: 'Cukup', tone: 'amber' }
  return { label: 'Kurang', tone: 'red' }
}

const TODAY_YEAR = new Date().getFullYear()

// Values are shown in thousands of Rupiah (Rp '000) to keep the 13-column
// report compact. Negatives render in red; a true zero shows a dash.
function num(n: number) {
  const v = Math.round(n / 1000)
  return v === 0 ? '-' : v.toLocaleString('id-ID')
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
  { kind: 'money', label: 'HPP (Pembelian Bahan Baku)', get: (m) => m.hpp },
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
  const { t } = useT()
  const [year, setYear] = useState(TODAY_YEAR)
  const pnl = usePnl(year)
  const months = pnl.data ?? []

  // Annual totals sum the whole year. All 12 months (Jan–Des) are always shown;
  // months with no activity simply render empty.
  const annual = useMemo(() => {
    const sum = (f: (m: PnlMonth) => number) => months.reduce((t, m) => t + f(m), 0)
    return { sum }
  }, [months])

  // Internal analysis scope: 0 = whole year, 1-12 = a single month.
  const [anMonth, setAnMonth] = useState(0)
  const metrics = useMemo<Metric[]>(() => {
    const src = anMonth === 0 ? months : months.filter((m) => m.month_no === anMonth)
    const sum = (f: (m: PnlMonth) => number) => src.reduce((a, m) => a + f(m), 0)
    const rev = sum((m) => m.pendapatan)
    const p = (n: number) => (rev > 0 ? n / rev : 0)
    const hpp = sum((m) => m.hpp)
    const gaji = sum((m) => m.beban_gaji)
    const opex = sum((m) => m.total_beban_operasional)
    return [
      {
        label: 'Food Cost (COGS)', hint: 'HPP ÷ Pendapatan', value: p(hpp), target: 0.35, kind: 'cost',
        note: 'Biaya bahan baku terlalu tinggi. Cek harga jual, standar porsi/HPP, dan stok pembelian yang berlebih.',
      },
      {
        label: 'Labor Cost', hint: 'Beban Gaji ÷ Pendapatan', value: p(gaji), target: 0.3, kind: 'cost',
        note: 'Beban gaji tinggi terhadap pendapatan. Tinjau jumlah staf & lembur, atau dorong penjualan.',
      },
      {
        label: 'Prime Cost', hint: '(HPP + Gaji) ÷ Pendapatan', value: p(hpp + gaji), target: 0.6, kind: 'cost',
        note: 'Bahan baku + gaji melebihi ideal, umumnya dipicu Food Cost. Tekan HPP lebih dulu.',
      },
      {
        label: 'Overhead (Opex non-Gaji)', hint: '(Opex − Gaji) ÷ Pendapatan', value: p(opex - gaji), target: 0.25, kind: 'cost',
        note: 'Biaya operasional non-gaji tinggi (sewa, listrik, transport, marketing). Tinjau pos terbesar.',
      },
      {
        label: 'Margin Kotor', hint: 'Laba Kotor ÷ Pendapatan', value: p(sum((m) => m.laba_kotor)), target: 0.65, kind: 'margin',
        note: 'Margin kotor di bawah ideal, biasanya akibat Food Cost tinggi. Naikkan harga jual atau tekan HPP.',
      },
      {
        label: 'Margin Bersih', hint: 'Laba Bersih ÷ Pendapatan', value: p(sum((m) => m.laba_bersih)), target: 0.1, kind: 'margin',
        note: 'Laba bersih tipis. Tinjau biaya terbesar (bahan baku, gaji, atau operasional).',
      },
    ]
  }, [months, anMonth])
  const anRevenue = useMemo(() => {
    const src = anMonth === 0 ? months : months.filter((m) => m.month_no === anMonth)
    return src.reduce((a, m) => a + m.pendapatan, 0)
  }, [months, anMonth])

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
              aria-label={t('Tahun sebelumnya')}
            >
              ‹
            </button>
            <span className="min-w-[62px] text-center text-[14px] font-extrabold text-ink">{year}</span>
            <button
              onClick={() => setYear((y) => y + 1)}
              className="rounded-btn border border-app-border bg-app-card px-2.5 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
              aria-label={t('Tahun berikutnya')}
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
        <>
        <Card bodyClassName="">
          <div className="cb-scroll overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th
                    className={`${labelBase} sticky top-0 bg-app-panel text-left text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-ink-muted`}
                  >
                    {t('Keterangan')}
                  </th>
                  {months.map((m) => (
                    <th
                      key={m.month_no}
                      className={`${cellBase} bg-app-panel text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-ink-muted`}
                    >
                      {monthsShort()[m.month_no - 1]}
                    </th>
                  ))}
                  <th
                    className={`${cellBase} bg-gold-tint text-[10.5px] font-extrabold uppercase tracking-[0.05em] text-brand-dark`}
                  >
                    {t('Total')} {year}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, ri) => {
                  if (row.kind === 'header') {
                    return (
                      <tr key={ri}>
                        <td className={`${labelBase} bg-[#F1F6F2] text-[11px] font-extrabold uppercase tracking-[0.05em] text-brand`}>
                          {t(row.label)}
                        </td>
                        <td className="bg-[#F1F6F2] border-t border-[#E1EBE3]" colSpan={13} />
                      </tr>
                    )
                  }

                  if (row.kind === 'pct') {
                    const annNum = annual.sum(row.numr)
                    const annDen = annual.sum(row.den)
                    return (
                      <tr key={ri}>
                        <td className={`${labelBase} bg-app-card italic text-ink-muted`}>{t(row.label)}</td>
                        {months.map((m) => {
                          const d = row.den(m)
                          return (
                            <td key={m.month_no} className={`${cellBase} bg-app-card text-ink-muted`}>
                              {d > 0 ? formatPercent(row.numr(m) / d) : '-'}
                            </td>
                          )
                        })}
                        <td className={`${cellBase} bg-gold-tint font-bold text-brand-dark`}>
                          {annDen > 0 ? formatPercent(annNum / annDen) : '-'}
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
                      <td className={labelCls}>{t(row.label)}</td>
                      {months.map((m) => (
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

        {/* ---------- Internal analysis notes (cost/margin ratios) ---------- */}
        <div className="mt-4">
          <Card
            title={t('Catatan Analisis Internal')}
            subtitle={t('Rasio biaya & margin terhadap pendapatan · acuan umum industri F&B, sesuaikan dengan bisnis Anda.')}
            action={
              <select
                value={anMonth}
                onChange={(e) => setAnMonth(Number(e.target.value))}
                className="cb-select h-[36px] rounded-btn border border-app-border bg-app-card pl-3 pr-8 text-[12.5px] font-bold text-ink-secondary outline-none hover:bg-app-panel"
                aria-label={t('Pilih bulan')}
              >
                <option value={0}>{t('Setahun (Total)')}</option>
                {monthNames().map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m} {year}
                  </option>
                ))}
              </select>
            }
          >
            {anRevenue <= 0 ? (
              <p className="py-6 text-center text-[12.5px] text-ink-muted">
                {t('Belum ada pendapatan pada periode ini, rasio belum dapat dihitung.')}
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {metrics.map((m) => {
                  const v = verdict(m)
                  const numColor =
                    v.tone === 'green' ? 'text-ok' : v.tone === 'amber' ? 'text-warn' : 'text-danger'
                  return (
                    <div key={m.label} className="cb-card p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-extrabold text-ink">{t(m.label)}</div>
                          <div className="mt-0.5 text-[10.5px] text-ink-faint">{m.hint}</div>
                        </div>
                        <Badge tone={v.tone}>{t(v.label)}</Badge>
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-2">
                        <div className={`text-[23px] font-extrabold tabular-nums ${numColor}`}>
                          {formatPercent(m.value)}
                        </div>
                        <div className="pb-0.5 text-[10.5px] font-semibold text-ink-muted">
                          {t('Target')} {m.kind === 'cost' ? '≤' : '≥'} {formatPercentInt(m.target)}
                        </div>
                      </div>
                      {/* Auto tip - only when the metric needs attention */}
                      {v.tone !== 'green' && (
                        <div className="mt-2.5 flex gap-1.5 border-t border-app-border pt-2 text-[10.5px] leading-snug text-ink-muted">
                          <svg
                            width="13"
                            height="13"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`mt-[1px] flex-none ${v.tone === 'red' ? 'text-danger' : 'text-warn'}`}
                          >
                            <path d="M12 9v4M12 17h.01" />
                            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                          </svg>
                          <span>{t(m.note)}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
        </>
      )}
    </>
  )
}
