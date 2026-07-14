import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { Card, ErrorState, LoadingRows } from '@/components/ui/Card'
import { formatPercent, formatRupiahShort } from '@/lib/format'
import { ID_MONTHS_SHORT } from '@/lib/format'
import { usePnl } from '@/features/pnl/api'
import { usePurchases } from '@/features/purchases/api'
import { useSales } from '@/features/sales/api'
import LineChart from '@/features/dashboard/LineChart'
import Donut, { paletteColor, type Segment } from '@/features/dashboard/Donut'
import LiveClock from '@/features/dashboard/LiveClock'
import {
  PERIOD_OPTIONS,
  periodRange,
  formatRangeLabel,
  isoDate,
  type PeriodKey,
} from '@/features/dashboard/period'

const TODAY_YEAR = new Date().getFullYear()

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: 'green' | 'dark' }) {
  return (
    <div className="cb-card p-4">
      <div className="text-[11.5px] font-semibold text-ink-muted">{label}</div>
      <div
        className={`mt-1 text-[21px] font-extrabold tracking-[-0.01em] ${
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
  const [year, setYear] = useState(TODAY_YEAR)
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
  const totals = useMemo(() => {
    const sum = (f: (m: (typeof months)[number]) => number) => months.reduce((t, m) => t + f(m), 0)
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
  }, [months])

  const purchaseSeg = useMemo(
    () =>
      composition(
        (purchases.data ?? [])
          .filter((p) => p.purchase_date.startsWith(String(year)))
          .map((p) => ({ key: p.category, total: p.total })),
      ),
    [purchases.data, year],
  )
  const salesSeg = useMemo(
    () =>
      composition(
        (sales.data ?? [])
          .filter((s) => s.sale_date.startsWith(String(year)))
          .map((s) => ({ key: s.menu_category, total: s.total })),
      ),
    [sales.data, year],
  )

  const kpis = [
    { label: 'Total Pendapatan', value: formatRupiahShort(totals.rev), sub: `Total tahun ${year}` },
    {
      label: 'Total Pembelian Bahan Baku',
      value: formatRupiahShort(totals.purch),
      sub: totals.rev > 0 ? `${formatPercent(totals.purch / totals.rev)} dari pendapatan` : '—',
    },
    { label: 'Total Beban Gaji', value: formatRupiahShort(totals.gaji), sub: 'seluruh karyawan' },
    { label: 'Laba Bersih', value: formatRupiahShort(totals.net), sub: 'setelah semua beban', accent: 'green' as const },
    { label: 'Margin Kotor', value: formatPercent(totals.marginKotor), sub: 'laba kotor / pendapatan' },
    { label: 'Margin Bersih', value: formatPercent(totals.marginBersih), sub: 'laba bersih / pendapatan', accent: 'dark' as const },
  ]

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Ringkasan keuangan Catering Berkah · Tahun ${year}`}
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
        <div className="space-y-4">
          {/* Clock + period summary */}
          <div className="cb-card p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <LiveClock />
              <div className="cb-scroll -mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
                {PERIOD_OPTIONS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`whitespace-nowrap rounded-pill border px-3 py-1.5 text-[12px] font-bold transition ${
                      period === p.key
                        ? 'border-brand bg-brand text-white'
                        : 'border-app-border bg-app-card text-ink-secondary hover:bg-app-panel'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
                <label
                  className={`flex flex-none items-center gap-1.5 rounded-pill border px-3 py-1.5 text-[12px] font-bold transition ${
                    period === 'custom'
                      ? 'border-brand bg-brand text-white'
                      : 'border-app-border bg-app-card text-ink-secondary'
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <span>Pilih hari</span>
                  <input
                    type="date"
                    value={customDay}
                    onChange={(e) => {
                      setCustomDay(e.target.value)
                      setPeriod('custom')
                    }}
                    className="w-0 opacity-0"
                    aria-label="Pilih tanggal"
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label="Pendapatan" value={formatRupiahShort(periodSummary.rev)} sub={`${periodSummary.nSales} penjualan`} />
              <Kpi label="Pembelian" value={formatRupiahShort(periodSummary.buy)} sub={`${periodSummary.nBuy} pembelian`} />
              <Kpi label="Laba Kotor" value={formatRupiahShort(periodSummary.gross)} sub="pendapatan − pembelian" accent="green" />
              <Kpi label="Margin Kotor" value={formatPercent(periodSummary.margin)} sub="laba kotor / pendapatan" accent="dark" />
            </div>
            <div className="mt-2.5 text-[11.5px] font-medium text-ink-faint">Periode: {formatRangeLabel(range)}</div>
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
                  {label}
                </span>
              ))}
            </div>
            <LineChart
              labels={months.map((m) => ID_MONTHS_SHORT[m.month_no - 1])}
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
