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
  const pnl = usePnl(year)
  const purchases = usePurchases()
  const sales = useSales()

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
          {/* KPI cards */}
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
