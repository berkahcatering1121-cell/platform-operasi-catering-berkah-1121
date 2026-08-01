import { useMemo, useState } from 'react'
import PageHeader from '@/components/PageHeader'
import { Card, EmptyState, ErrorState, LoadingRows } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { SelectField } from '@/components/ui/Field'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah, formatMonthLabel } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { MODULE_BY_KEY, type ModuleKey } from '@/lib/modules'
import { useT } from '@/lib/i18n'
import { useCashFlow, type CashSource, type CashRow } from '@/features/cashflow/api'

// Each ledger source maps to an existing module (for its translated label + tone).
const SOURCE_MODULE: Record<CashSource, ModuleKey> = {
  sales: 'penjualan',
  purchases: 'pembelian',
  payroll: 'gaji',
  opex: 'operasional',
  petty: 'petty',
  debts: 'hutang',
  assets: 'aset',
}
const SOURCE_TONE: Record<CashSource, 'green' | 'amber' | 'red' | 'blue' | 'neutral'> = {
  sales: 'green',
  purchases: 'amber',
  payroll: 'blue',
  opex: 'neutral',
  petty: 'neutral',
  debts: 'red',
  assets: 'blue',
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'red' }) {
  return (
    <div className="cb-card p-4">
      <div className="text-[11.5px] font-semibold text-ink-muted">{label}</div>
      <div
        className={`mt-1 text-[21px] font-extrabold tabular-nums tracking-[-0.01em] ${
          tone === 'green' ? 'text-ok' : tone === 'red' ? 'text-danger' : 'text-ink'
        }`}
      >
        {value}
      </div>
    </div>
  )
}

export default function CashFlow() {
  const { t } = useT()
  const { rows, isLoading, error } = useCashFlow()
  const [source, setSource] = useState<CashSource | 'all'>('all')
  const [month, setMonth] = useState('all')
  const [q, setQ] = useState('')

  const sourceLabel = (s: CashSource) => t(MODULE_BY_KEY[SOURCE_MODULE[s]].label)

  // Attach the true running balance over the full chronological ledger.
  const withBalance = useMemo(() => {
    let bal = 0
    return rows.map((r) => {
      bal += r.cashIn - r.cashOut
      return { ...r, balance: bal }
    })
  }, [rows])

  const monthOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.date.slice(0, 7)))
    return [...set].sort((a, b) => (a > b ? -1 : 1))
  }, [rows])

  const term = q.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      withBalance.filter(
        (r) =>
          (source === 'all' || r.source === source) &&
          (month === 'all' || r.date.startsWith(month)) &&
          (!term ||
            r.description.toLowerCase().includes(term) ||
            (r.category ?? '').toLowerCase().includes(term)),
      ),
    [withBalance, source, month, term],
  )

  const totals = useMemo(() => {
    const cashIn = filtered.reduce((s, r) => s + r.cashIn, 0)
    const cashOut = filtered.reduce((s, r) => s + r.cashOut, 0)
    return { cashIn, cashOut, net: cashIn - cashOut }
  }, [filtered])

  // Newest first for display (balance column already carries the true cumulative).
  const display = useMemo(() => [...filtered].reverse(), [filtered])

  return (
    <>
      <PageHeader
        title="Arus Kas"
        subtitle="Buku besar seluruh transaksi keuangan, terhubung otomatis dari semua modul."
      />

      {isLoading ? (
        <LoadingRows />
      ) : error ? (
        <ErrorState message={(error as Error).message} />
      ) : (
        <div className="cb-stagger space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label={t('Total Uang Masuk')} value={formatRupiah(totals.cashIn)} tone="green" />
            <StatCard label={t('Total Uang Keluar')} value={formatRupiah(totals.cashOut)} tone="red" />
            <StatCard label={t('Arus Kas Bersih')} value={formatRupiah(totals.net)} tone={totals.net < 0 ? 'red' : 'green'} />
          </div>

          {/* Filters */}
          <div className="grid gap-3 sm:grid-cols-3">
            <SelectField
              label={t('Sumber Modul')}
              value={source}
              onChange={(e) => setSource(e.target.value as CashSource | 'all')}
              options={[
                { value: 'all', label: 'Semua Sumber' },
                ...(Object.keys(SOURCE_MODULE) as CashSource[]).map((s) => ({ value: s, label: sourceLabel(s) })),
              ]}
            />
            <SelectField
              label={t('Bulan')}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              options={[
                { value: 'all', label: 'Semua Bulan' },
                ...monthOptions.map((m) => ({ value: m, label: formatMonthLabel(`${m}-01`) })),
              ]}
            />
            <div>
              <label className="mb-1 block text-[12px] font-semibold text-ink-body">{t('Cari')}</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t('Cari keterangan / kategori…')}
                className="field-manual h-11 w-full rounded-field px-3 text-[14px] font-semibold outline-none"
              />
            </div>
          </div>

          <Card bodyClassName="">
            <div className="cb-scroll overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>{t('Tanggal')}</th>
                    <th className={TH}>{t('Sumber Modul')}</th>
                    <th className={TH}>{t('Keterangan')}</th>
                    <th className={TH}>{t('Kategori')}</th>
                    <th className={TH}>{t('Metode')}</th>
                    <th className={TH_R}>{t('Uang Masuk')}</th>
                    <th className={TH_R}>{t('Uang Keluar')}</th>
                    <th className={TH_R}>{t('Saldo Berjalan')}</th>
                  </tr>
                </thead>
                <tbody>
                  {display.length > 0 ? (
                    display.map((r: CashRow & { balance: number }) => (
                      <tr key={r.id}>
                        <td className={TD + ' whitespace-nowrap'}>{formatDate(r.date)}</td>
                        <td className={TD}>
                          <Badge tone={SOURCE_TONE[r.source]}>{sourceLabel(r.source)}</Badge>
                        </td>
                        <td className={TD + ' font-bold text-ink'} style={{ whiteSpace: 'normal', maxWidth: 320 }}>
                          {titleCase(r.description)}
                        </td>
                        <td className={TD}>{r.category ? titleCase(r.category) : '-'}</td>
                        <td className={TD}>{r.method ? titleCase(r.method) : '-'}</td>
                        <td className={TD_R + (r.cashIn ? ' font-bold text-ok' : ' text-ink-faint')}>
                          {r.cashIn ? formatRupiah(r.cashIn) : '-'}
                        </td>
                        <td className={TD_R + (r.cashOut ? ' font-bold text-danger' : ' text-ink-faint')}>
                          {r.cashOut ? formatRupiah(r.cashOut) : '-'}
                        </td>
                        <td className={TD_R + ' font-extrabold tabular-nums ' + (r.balance < 0 ? 'text-danger' : 'text-ink')}>
                          {formatRupiah(r.balance)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState message="Belum ada pergerakan kas untuk filter ini." />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
