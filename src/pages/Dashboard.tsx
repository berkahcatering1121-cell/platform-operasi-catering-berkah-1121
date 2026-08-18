import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '@/components/PageHeader'
import { Card, ErrorState, LoadingRows } from '@/components/ui/Card'
import CountUp from '@/components/ui/CountUp'
import { formatPercent, formatRupiah, months as monthNames, monthsShort } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { useT } from '@/lib/i18n'
import { useAuth } from '@/auth/AuthProvider'
import { usePnl } from '@/features/pnl/api'
import { usePurchases } from '@/features/purchases/api'
import { useSales } from '@/features/sales/api'
import { useDebts } from '@/features/debts/api'
import { useAssets } from '@/features/assets/api'
import { usePayroll } from '@/features/payroll/api'
import { useCashFlow } from '@/features/cashflow/api'
import LineChart from '@/features/dashboard/LineChart'
import Donut, { paletteColor, type Segment } from '@/features/dashboard/Donut'
import LiveClock from '@/features/dashboard/LiveClock'
import PeriodPicker from '@/features/dashboard/PeriodPicker'
import SmartAlerts from '@/features/dashboard/SmartAlerts'
import { computeAlerts, computeAnalytics } from '@/features/dashboard/insights'
import { periodRange, formatRangeLabel, isoDate, type PeriodKey } from '@/features/dashboard/period'

const TODAY_YEAR = new Date().getFullYear()

function Kpi({
  label,
  value,
  sub,
  accent,
  to,
}: {
  label: string
  value: ReactNode
  sub: string
  accent?: 'green' | 'dark'
  /** When set, the whole card links to that module route. */
  to?: string
}) {
  const valueCls = `mt-1.5 text-[17.5px] font-extrabold tabular-nums tracking-[-0.01em] ${
    accent === 'green' ? 'text-ok' : accent === 'dark' ? 'text-brand-dark' : 'text-ink'
  }`
  const body = (
    <>
      {/* Fixed-height label (reserves 2 lines) so every value starts at the
          same vertical position - numbers stay aligned across cards. */}
      <div className="flex min-h-[30px] items-start justify-between gap-2 text-[11.5px] font-semibold leading-[15px] text-ink-muted">
        <span>{label}</span>
        {to && (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-[1px] flex-none text-ink-faint/70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-brand"
          >
            <path d="M7 17 17 7M7 7h10v10" />
          </svg>
        )}
      </div>
      <div className={valueCls}>{value}</div>
      <div className="mt-0.5 text-[11.5px] text-ink-faint">{sub}</div>
    </>
  )
  if (to) {
    return (
      <Link to={to} aria-label={`Buka ${label}`} className="cb-card group block p-4 hover:border-brand/50">
        {body}
      </Link>
    )
  }
  return <div className="cb-card p-4">{body}</div>
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
  const { canAccess } = useAuth()
  // Deep links: revenue cards jump to Penjualan, purchase cards to Pembelian
  // (only when the user actually has access to that module).
  const salesTo = canAccess('penjualan') ? '/penjualan' : undefined
  const buyTo = canAccess('pembelian') ? '/pembelian' : undefined
  const [year, setYear] = useState(TODAY_YEAR)
  // Default to the running month so login/refresh lands on the current month.
  const [month, setMonth] = useState(new Date().getMonth() + 1) // 0 = whole year; 1-12 = month
  const [period, setPeriod] = useState<PeriodKey>('thisMonth')
  const [customDay, setCustomDay] = useState(isoDate(new Date()))
  const pnl = usePnl(year)
  const purchases = usePurchases()
  const sales = useSales()
  const debts = useDebts()
  const assets = useAssets()
  const payroll = usePayroll()
  const cash = useCashFlow()

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

  // ── Financial analytics + smart alerts (auto-derived from every module) ──
  const inScopeDate = (d: string) => d.startsWith(String(year)) && (!monthPrefix || d.slice(5, 7) === monthPrefix)
  const cashBalance = useMemo(() => cash.rows.reduce((s, r) => s + r.cashIn - r.cashOut, 0), [cash.rows])
  const scopeNetCash = useMemo(
    () => cash.rows.filter((r) => inScopeDate(r.date)).reduce((s, r) => s + r.cashIn - r.cashOut, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cash.rows, year, monthPrefix],
  )
  const analytics = useMemo(() => {
    const exp = scopedMonths.reduce((s, m) => s + m.hpp + m.total_beban_operasional, 0)
    const dep = scopedMonths.reduce((s, m) => s + m.beban_depresiasi, 0)
    const days = month ? new Date(year, month, 0).getDate() : 365
    const prevRev = month && month > 1 ? months.find((m) => m.month_no === month - 1)?.pendapatan ?? null : null
    const ar = (sales.data ?? []).reduce((s, x) => s + x.sisa, 0)
    const debtSisa = (debts.data ?? []).reduce((s, x) => s + x.sisa, 0)
    const assetBook = (assets.data ?? []).reduce((s, x) => s + x.book_value, 0)
    return computeAnalytics({ rev: totals.rev, exp, net: totals.net, dep, days, prevRev, cashBalance, scopeNetCash, ar, debtSisa, assetBook })
  }, [scopedMonths, months, month, year, sales.data, debts.data, assets.data, totals, cashBalance, scopeNetCash])

  const alerts = useMemo(() => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    const todayS = iso(today)
    const in7S = iso(new Date(today.getTime() + 7 * 864e5))
    const dueSoon = (debts.data ?? [])
      .filter((d) => d.due_date && d.status !== 'Lunas' && d.due_date >= todayS && d.due_date <= in7S)
      .map((d) => ({ creditor: d.creditor, due: d.due_date as string }))
    const inScopeKey = (k: string) => k.startsWith(String(year)) && (!monthPrefix || k.slice(5, 7) === monthPrefix)
    const unpaidPayroll = (payroll.data ?? []).filter((g) => g.status === 'Belum Dibayar' && inScopeKey(g.month_key)).length
    return computeAlerts({ t, rev: totals.rev, hpp: totals.purch, gaji: totals.gaji, scopeNetCash, cashBalance, dueSoon, unpaidPayroll })
  }, [debts.data, payroll.data, totals, scopeNetCash, cashBalance, year, monthPrefix, t])

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

  // How many portions of each menu were sold (and the revenue it brought),
  // within the current year (+ optional month) scope, ranked best-seller first.
  const menuSales = useMemo(() => {
    const map = new Map<string, { name: string; category: string; qty: number; revenue: number }>()
    for (const s of sales.data ?? []) {
      if (!inScope(s.sale_date)) continue
      const name = s.menu_name || 'Lainnya'
      const key = name.toLowerCase()
      const cur = map.get(key) ?? { name, category: s.menu_category || 'Lainnya', qty: 0, revenue: 0 }
      cur.qty += s.portions || 0
      cur.revenue += s.total || 0
      map.set(key, cur)
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sales.data, year, monthPrefix])
  const menuTotalQty = useMemo(() => menuSales.reduce((s, m) => s + m.qty, 0), [menuSales])
  const menuMaxQty = menuSales.length ? menuSales[0].qty : 0

  const kpis: { label: string; value: ReactNode; sub: string; accent?: 'green' | 'dark'; to?: string }[] = [
    { label: t('Total Pendapatan'), value: <CountUp to={totals.rev} format={formatRupiah} />, sub: `Total ${scopeLabel}`, to: salesTo },
    {
      label: t('Total Pembelian Bahan Baku'),
      value: <CountUp to={totals.purch} format={formatRupiah} />,
      sub: totals.rev > 0 ? `${formatPercent(totals.purch / totals.rev)} ${t('dari pendapatan')}` : '-',
      to: buyTo,
    },
    { label: t('Total Beban Gaji'), value: <CountUp to={totals.gaji} format={formatRupiah} />, sub: t('seluruh karyawan') },
    { label: t('Laba Bersih'), value: <CountUp to={totals.net} format={formatRupiah} />, sub: t('setelah semua beban'), accent: 'green' as const },
    { label: t('Margin Kotor'), value: <CountUp to={totals.marginKotor} format={formatPercent} />, sub: t('laba kotor / pendapatan') },
    { label: t('Margin Bersih'), value: <CountUp to={totals.marginBersih} format={formatPercent} />, sub: t('laba bersih / pendapatan'), accent: 'dark' as const },
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

            <div className="cb-stagger mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label={t('Pendapatan')} value={<CountUp to={periodSummary.rev} format={formatRupiah} />} sub={`${periodSummary.nSales} ${t('penjualan')}`} to={salesTo} />
              <Kpi label={t('Pembelian')} value={<CountUp to={periodSummary.buy} format={formatRupiah} />} sub={`${periodSummary.nBuy} ${t('pembelian')}`} to={buyTo} />
              <Kpi label={t('Laba Kotor')} value={<CountUp to={periodSummary.gross} format={formatRupiah} />} sub={t('pendapatan − pembelian')} accent="green" />
              <Kpi label={t('Margin Kotor')} value={<CountUp to={periodSummary.margin} format={formatPercent} />} sub={t('laba kotor / pendapatan')} accent="dark" />
            </div>
            <div className="mt-2.5 text-[11.5px] font-medium text-ink-faint">{t('Periode')}: {formatRangeLabel(range)}</div>
          </div>

          {/* Smart alerts */}
          <SmartAlerts alerts={alerts} />

          {/* Yearly KPI cards */}
          <div className="cb-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpis.map((k) => (
              <Kpi key={k.label} label={k.label} value={k.value} sub={k.sub} accent={k.accent} to={k.to} />
            ))}
          </div>

          {/* Financial analytics */}
          <Card title={t('Analitik Keuangan')} subtitle={scopeLabel}>
            <div className="cb-stagger grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi label={t('Saldo Kas Saat Ini')} value={<CountUp to={analytics.cashBalance} format={formatRupiah} />} sub={t('dari buku besar Arus Kas')} />
              <Kpi label={t('Rata-rata Pendapatan / Hari')} value={<CountUp to={analytics.avgDailyRev} format={formatRupiah} />} sub={scopeLabel} accent="green" />
              <Kpi label={t('Rata-rata Pengeluaran / Hari')} value={<CountUp to={analytics.avgDailyExp} format={formatRupiah} />} sub={scopeLabel} />
              <Kpi label="EBITDA" value={<CountUp to={analytics.ebitda} format={formatRupiah} />} sub={t('laba + depresiasi')} accent="green" />
              <Kpi label={t('Cash Burn (periode)')} value={<CountUp to={analytics.cashBurn} format={formatRupiah} />} sub={t('arus kas keluar bersih')} />
              <Kpi
                label={t('Pertumbuhan Pendapatan')}
                value={analytics.revGrowth == null ? '-' : `${analytics.revGrowth >= 0 ? '+' : ''}${formatPercent(analytics.revGrowth)}`}
                sub={t('vs bulan lalu')}
                accent="dark"
              />
              <Kpi
                label="Current Ratio"
                value={analytics.currentRatio == null ? '-' : `${analytics.currentRatio.toFixed(2).replace('.', ',')}x`}
                sub={t('≈ (kas + piutang) / hutang')}
              />
              <Kpi
                label="Debt Ratio"
                value={analytics.debtRatio == null ? '-' : formatPercent(analytics.debtRatio)}
                sub={t('≈ hutang / total aset')}
              />
            </div>
          </Card>

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

          {/* Portions sold per menu (best-seller ranking) */}
          <Card
            title={t('Penjualan per Menu')}
            subtitle={`${t('Jumlah porsi terjual per menu')} · ${scopeLabel}`}
            action={
              menuSales.length > 0 ? (
                <span className="flex-none whitespace-nowrap rounded-pill border border-app-border bg-app-panel px-3 py-1 text-[12px] font-extrabold text-ink-secondary">
                  {menuTotalQty.toLocaleString('id-ID')} {t('porsi')}
                </span>
              ) : undefined
            }
          >
            {sales.isLoading ? (
              <LoadingRows />
            ) : menuSales.length === 0 ? (
              <p className="py-6 text-center text-[12.5px] text-ink-muted">{t('Belum ada penjualan pada periode ini.')}</p>
            ) : (
              <div className="cb-scroll max-h-[380px] space-y-2.5 overflow-y-auto pr-1">
                {menuSales.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-3">
                    <div className="w-5 flex-none text-center text-[12px] font-extrabold tabular-nums text-ink-faint">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <div className="truncate text-[13px] font-bold text-ink">{titleCase(m.name)}</div>
                        <div className="flex-none text-[13px] font-extrabold tabular-nums text-brand-dark">
                          {m.qty.toLocaleString('id-ID')}{' '}
                          <span className="text-[11px] font-semibold text-ink-faint">{t('porsi')}</span>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-app-panel">
                          <div
                            className="h-full rounded-full bg-gold"
                            style={{ width: `${menuMaxQty ? Math.max((m.qty / menuMaxQty) * 100, 2) : 0}%` }}
                          />
                        </div>
                        <div className="flex-none text-[11px] text-ink-faint">
                          {titleCase(m.category)} · {formatRupiah(m.revenue)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}
