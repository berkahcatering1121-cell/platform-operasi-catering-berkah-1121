import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { Card, ErrorState, LoadingRows } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatPercent, formatPercentInt, months as monthNames, monthsShort } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { usePnl, type PnlMonth } from '@/features/pnl/api'
import { ROWS, computeMetrics, scopeRevenue, verdict } from '@/features/pnl/model'
import PnlDrillModal, { type DrillTarget } from '@/features/pnl/PnlDrillModal'

const TODAY_YEAR = new Date().getFullYear()

// Full Rupiah nominal (thousands-separated). Negatives render in red; a true
// zero shows a dash. The table scrolls horizontally to fit the 13 columns.
function num(n: number) {
  const v = Math.round(n)
  return v === 0 ? '-' : v.toLocaleString('id-ID')
}

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

  // Drill-down: click any P&L line to see its source transactions.
  const [drill, setDrill] = useState<DrillTarget | null>(null)

  // Internal analysis scope: 0 = whole year, 1-12 = a single month.
  const [anMonth, setAnMonth] = useState(0)
  const metrics = useMemo(() => computeMetrics(months, anMonth), [months, anMonth])
  const anRevenue = useMemo(() => scopeRevenue(months, anMonth), [months, anMonth])

  // PDF download.
  const [dlOpen, setDlOpen] = useState(false)
  const [dlBusy, setDlBusy] = useState(false)
  const download = async (scope: number) => {
    setDlOpen(false)
    setDlBusy(true)
    try {
      // Lazy-load jsPDF only when the user actually downloads.
      const { exportPnlPdf } = await import('@/features/pnl/exportPdf')
      await exportPnlPdf({ months, year, scope, t, generatedAt: new Date() })
    } finally {
      setDlBusy(false)
    }
  }

  const labelBase = 'sticky left-0 z-10 px-3 py-[10px] text-[12px] whitespace-nowrap border-t border-[#F1EBE2]'
  const cellBase = 'px-3 py-[10px] text-[12px] text-right tabular-nums whitespace-nowrap border-t border-[#F1EBE2]'

  return (
    <>
      <PageHeader
        title="P&L (Laba Rugi)"
        subtitle="Laporan read-only 12 bulan + total tahunan, roll-up otomatis dari semua modul."
        actions={
          <div className="flex items-center gap-2">
            {/* Download PDF (per month or full year) */}
            <div className="relative">
              <button
                onClick={() => setDlOpen((o) => !o)}
                disabled={dlBusy || months.length === 0}
                className="flex items-center gap-1.5 rounded-btn bg-brand px-3 py-2 text-[13px] font-bold text-white transition hover:bg-brand-dark disabled:opacity-60"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                {dlBusy ? t('Menyiapkan…') : t('Unduh PDF')}
              </button>
              {dlOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setDlOpen(false)} />
                  <div className="absolute right-0 z-50 mt-1.5 w-52 overflow-hidden rounded-field border border-app-border bg-app-card py-1 shadow-card">
                    <button
                      onClick={() => download(0)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] font-bold text-ink hover:bg-app-panel"
                    >
                      {t('Setahun (Total)')} {year}
                    </button>
                    <div className="my-1 border-t border-app-border" />
                    <div className="cb-scroll max-h-[240px] overflow-y-auto">
                      {monthNames().map((m, i) => (
                        <button
                          key={m}
                          onClick={() => download(i + 1)}
                          className="flex w-full items-center px-3 py-1.5 text-left text-[12.5px] font-semibold text-ink-body hover:bg-app-panel"
                        >
                          {m} {year}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

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
                  const drillSpec = row.kind === 'money' ? row.drill : undefined
                  const openDrill = (monthNo: number) =>
                    drillSpec && setDrill({ drill: drillSpec, label: row.label, monthNo })
                  return (
                    <tr key={ri}>
                      <td className={labelCls}>
                        {drillSpec ? (
                          <button
                            type="button"
                            onClick={() => openDrill(0)}
                            className="text-left underline decoration-dotted decoration-ink-faint/60 underline-offset-2 hover:text-brand"
                            title={t('Klik untuk rincian')}
                          >
                            {t(row.label)}
                          </button>
                        ) : (
                          t(row.label)
                        )}
                      </td>
                      {months.map((m) => (
                        <td
                          key={m.month_no}
                          className={valueCls(row.get(m)) + (drillSpec ? ' cursor-pointer hover:bg-app-panel' : '')}
                          onClick={drillSpec ? () => openDrill(m.month_no) : undefined}
                          title={drillSpec ? t('Klik untuk rincian') : undefined}
                        >
                          {num(row.get(m))}
                        </td>
                      ))}
                      <td
                        className={`${cellBase} bg-gold-tint font-extrabold ${
                          annualVal < 0 ? 'text-danger' : accentGreen ? 'text-ok' : 'text-brand-dark'
                        }${drillSpec ? ' cursor-pointer hover:brightness-95' : ''}`}
                        onClick={drillSpec ? () => openDrill(0) : undefined}
                        title={drillSpec ? t('Klik untuk rincian') : undefined}
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

      <PnlDrillModal open={!!drill} onClose={() => setDrill(null)} target={drill} year={year} />
    </>
  )
}
