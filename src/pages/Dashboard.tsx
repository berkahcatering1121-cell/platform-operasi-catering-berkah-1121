import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { Card, ErrorState, LoadingRows } from '@/components/ui/Card'
import { formatPercent, formatRupiahShort, months as monthNames, monthsShort } from '@/lib/format'
import { useT } from '@/lib/i18n'
import { usePnl } from '@/features/pnl/api'
import { usePurchases } from '@/features/purchases/api'
import { useSales } from '@/features/sales/api'
import LineChart from '@/features/dashboard/LineChart'
import Donut, { paletteColor, type Segment } from '@/features/dashboard/Donut'
import LiveClock from '@/features/dashboard/LiveClock'
import PeriodPicker from '@/features/dashboard/PeriodPicker'
import { periodRange, formatRangeLabel, isoDate, type PeriodKey } from '@/features/dashboard/period'

const TODAY_YEAR = new Date().getFullYear()

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: 'green' | 'dark' }) {
  return (
    <div className="cb-card p-4">
      {/* Fixed-height label (reserves 2 lines) so every value starts at the
          same vertical position — numbers stay aligned across cards. */}
      <div className="flex min-h-[30px] items-start text-[11.5px] font-semibold leading-[15px] text-ink-muted">
        {label}
      </div>
      <div
        className={`mt-1.5 text-[21px] font-extrabold tracking-[-0.01em] ${
          accent === 'green' ? 'text-ok' : accent === 'dark' ? 'text-brand-dark' : 'text-ink'
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11.5px] text-ink-faint">{sub}</div>
    </div>
  )
}

function composition(rows: { key: string | null; total: number }[]): Segment[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    const k = r.key || 'Lainnya'
    map.set(k, (map.get(k) ?? 0) + r.total)
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: paletteColor(i) }))
}

export default function Dashboard() {
  const { t } = useT()
  const [year, setYear] = useState(TODAY_YEAR)
  // Default to the running month so login/refresh lands on the current month.
  const [month, setMonth] = useState(new Date().getMonth() + 1) // 0 = whole year; 1-12 = month
  const [period, setPeriod] = useState<PeriodKey>('thisMonth')
  const [customDay, setCustomDay] = useState(isoDate(new Date()))
  const pnl = usePnl(year)
  const purchases = usePurchases()
  const sales = useSales()

  // Period summary (Hari ini / Minggu / Bulan / pilih tanggal) computed from the
  // already-loaded sales & purchases lists.
  const range = useMemo(() => periodRange(period, new Date(), customDay), [period, customDay])
  const periodSummary = useMemo(() => {
    const inRange = (d: string) => d >= range.start && d <= range.end
    const s = (sales.data ?? []).filter((x) => inRange(x.sale_date))
    const p = (purchases.data ?? []).filter((x) => inRange(x.purchase_date))
    const rev = s.reduce((t, x) => t + x.total, 0)
    const buy = p.reduce((t, x) => t + x.total, 0)
    return { rev, buy, gross: rev - buy, margin: rev > 0 ? (rev - buy) / rev : 0, nSales: s.length, nBuy: p.length }
  }, [sales.data, purchases.data, range])

  const months = pnl.data ?? []
  // KPI scope: the whole year, or a single month when one is picked.
  const scopedMonths = useMemo(
    () => (month ? months.filter((m) => m.month_no === month) : months),
    [months, month],
  )
  const totals = useMemo(() => {
    const sum = (f: (m: (typeof scopedMonths)[number]) => number) => scopedMonths.reduce((t, m) => t + f(m), 0)
    const rev = sum((m) => m.pendapatan)
    const gross = sum((m) => m.laba_kotor)
    const net = sum((m) => m.laba_bersih)
    return {
      rev,
      purch: sum((m) => m.hpp),
      gaji: sum((m) => m.beban_gaji),
      net,
      marginKotor: rev > 0 ? gross / rev : 0,
      marginBersih: rev > 0 ? net / rev : 0,
    }
  }, [scopedMonths])

  const scopeLabel = month ? `${monthNames()[month - 1]} ${year}` : `${t('tahun')} ${year}`
  const monthPrefix = month ? `${String(month).padStart(2, '0')}` : null

  // Donuts follow the same year (+ optional month) scope as the KPIs.
  const inScope = (d: string) =>
    d.startsWith(String(year)) && (!monthPrefix || d.slice(5, 7) === monthPrefix)
  const purchaseSeg = useMemo(
    () =>
      composition(
        (purchases.data ?? [])
          .filter((p) => inScope(p.purchase_date))
          .map((p) => ({ key: p.category, total: p.total })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [purchases.data, year, monthPrefix],
  )
  const salesSeg = useMemo(
    () =>
      composition(
        (sales.data ?? [])
          .filter((s) => inScope(s.sale_date))
          .map((s) => ({ key: s.menu_category, total: s.total })),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sales.data, year, monthPrefix],
  )

  const kpis = [
    { label: t('Total Pendapatan'), value: formatRupiahShort(totals.rev), sub: `Total ${scopeLabel}` },
    {
      label: t('Total Pembelian Bahan Baku'),
      value: formatRupiahShort(totals.purch),
      sub: totals.rev > 0 ? `${formatPercent(totals.purch / totals.rev)} ${t('dari pendapatan')}` : '—',
    },
    { label: t('Total Beban Gaji'), value: formatRupiahShort(totals.gaji), sub: t('seluruh karyawan') },
    { label: t('Laba Bersih'), value: formatRupiahShort(totals.net), sub: t('setelah semua beban'), accent: 'green' as const },
    { label: t('Margin Kotor'), value: formatPercent(totals.marginKotor), sub: t('laba kotor / pendapatan') },
    { label: t('Margin Bersih'), value: formatPercent(totals.marginBersih), sub: t('laba bersih / pendapatan'), accent: 'dark' as const },
  ]

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Ringkasan keuangan Catering Berkah · Tahun ${year}`}
        actions={
          <div className="flex items-center gap-2">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="cb-select h-[38px] rounded-btn border border-app-border bg-app-card pl-3 pr-8 text-[13px] font-bold text-ink-secondary outline-none hover:bg-app-panel"
              aria-label={t('Pilih bulan')}
            >
              <option value={0}>{t('Semua bulan')}</option>
              {monthNames().map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="rounded-btn border border-app-border bg-app-card px-2.5 py-2 text-[13px] font-bold text-ink-secondary hover:bg-app-panel"
                aria-label={t('Tahun sebelumnya')}
              >
                ‹
              </button>
              <span className="min-w-[52px] text-center text-[14px] font-extrabold text-ink">{year}</span>
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
        <div className="space-y-4">
          {/* Clock + period summary */}
          <div className="cb-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <LiveClock />
              <PeriodPicker
                period={period}
                customDay={customDay}
                onSelect={(p, day) => {
                  setPeriod(p)
                  if (day) setCustomDay(day)
                }}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label={t('Pendapatan')} value={formatRupiahShort(periodSummary.rev)} sub={`${periodSummary.nSales} ${t('penjualan')}`} />
              <Kpi label={t('Pembelian')} value={formatRupiahShort(periodSummary.buy)} sub={`${periodSummary.nBuy} ${t('pembelian')}`} />
              <Kpi label={t('Laba Kotor')} value={formatRupiahShort(periodSummary.gross)} sub={t('pendapatan − pembelian')} accent="green" />
              <Kpi label={t('Margin Kotor')} value={formatPercent(periodSummary.margin)} sub={t('laba kotor / pendapatan')} accent="dark" />
            </div>
            <div className="mt-2.5 text-[11.5px] font-medium text-ink-faint">{t('Periode')}: {formatRangeLabel(range)}</div>
          </div>

          {/* Yearly KPI cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((k) => (
              <Kpi key={k.label} label={k.label} value={k.value} sub={k.sub} accent={k.accent} />
            ))}
          </div>

          {/* Monthly line chart */}
          <Card title="Tren Bulanan" subtitle="Pendapatan · Pembelian · Laba Bersih">
            <div className="mb-3 flex flex-wrap gap-4">
              {[
                ['Pendapatan', '#C9A93B'],
                ['Pembelian', '#6BA588'],
                ['Laba Bersih', '#16603F'],
              ].map(([label, color]) => (
                <span key={label} className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-body">
                  <span className="h-2.5 w-4 rounded-full" style={{ background: color }} />
                  {t(label)}
                </span>
              ))}
            </div>
            <LineChart
              labels={months.map((m) => monthsShort()[m.month_no - 1])}
              series={[
                { label: 'Pendapatan', color: '#C9A93B', values: months.map((m) => m.pendapatan) },
                { label: 'Pembelian', color: '#6BA588', values: months.map((m) => m.hpp) },
                { label: 'Laba Bersih', color: '#16603F', values: months.map((m) => m.laba_bersih) },
              ]}
            />
          </Card>

          {/* Composition donuts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Komposisi Pembelian" subtitle="per kategori bahan baku">
              {purchases.isLoading ? <LoadingRows /> : <Donut segments={purchaseSeg} />}
            </Card>
            <Card title="Komposisi Penjualan" subtitle="per kategori menu">
              {sales.isLoading ? <LoadingRows /> : <Donut segments={salesSeg} />}
            </Card>
          </div>
        </div>
      )}
    </>
  )
}
