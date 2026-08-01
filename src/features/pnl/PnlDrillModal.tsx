import { useMemo } from 'react'
import Modal from '@/components/ui/Modal'
import { EmptyState, LoadingRows } from '@/components/ui/Card'
import { TD, TD_R, TH, TH_R } from '@/components/ui/table'
import { formatDate, formatRupiah, months as monthNames } from '@/lib/format'
import { titleCase } from '@/lib/text'
import { useT } from '@/lib/i18n'
import { useSales } from '@/features/sales/api'
import { usePurchases } from '@/features/purchases/api'
import { useOperationalCosts } from '@/features/opex/api'
import { usePayroll } from '@/features/payroll/api'
import { useAssets } from '@/features/assets/api'
import type { DrillSpec } from './model'

export interface DrillTarget {
  drill: DrillSpec
  label: string
  monthNo: number // 0 = whole year, 1-12 = a single month
}

interface Props {
  open: boolean
  onClose: () => void
  target: DrillTarget | null
  year: number
}

interface Line {
  id: string
  date: string
  primary: string
  secondary?: string
  amount: number
}

export default function PnlDrillModal({ open, onClose, target, year }: Props) {
  const { t } = useT()
  const sales = useSales()
  const purchases = usePurchases()
  const opex = useOperationalCosts()
  const payroll = usePayroll()
  const assets = useAssets()

  const source = target?.drill.source
  const monthNo = target?.monthNo ?? 0
  const monthKey = monthNo ? `${year}-${String(monthNo).padStart(2, '0')}` : String(year)
  const inPeriod = (d: string) => (monthNo ? d.startsWith(monthKey) : d.startsWith(String(year)))

  const q =
    source === 'sales' ? sales
    : source === 'purchases' ? purchases
    : source === 'opex' ? opex
    : source === 'payroll' ? payroll
    : source === 'assets' ? assets
    : null
  const isLoading = q?.isLoading ?? false

  const lines = useMemo<Line[]>(() => {
    if (!target) return []
    const { drill } = target
    if (drill.source === 'sales')
      return (sales.data ?? [])
        .filter((s) => inPeriod(s.sale_date))
        .map((s) => ({ id: s.id, date: s.sale_date, primary: s.customer, secondary: s.menu_name ?? undefined, amount: s.total }))
    if (drill.source === 'purchases')
      return (purchases.data ?? [])
        .filter((p) => inPeriod(p.purchase_date))
        .map((p) => ({ id: p.id, date: p.purchase_date, primary: p.material_name, secondary: p.supplier_name ?? undefined, amount: p.total }))
    if (drill.source === 'opex')
      return (opex.data ?? [])
        .filter((o) => inPeriod(o.cost_date) && o.category === drill.category)
        .map((o) => ({ id: o.id, date: o.cost_date, primary: o.description, secondary: o.category, amount: o.amount }))
    if (drill.source === 'payroll')
      return (payroll.data ?? [])
        .filter((g) => (monthNo ? g.month_key === monthKey : g.month_key.startsWith(String(year))))
        .map((g) => ({ id: g.id, date: g.pay_date ?? `${g.month_key}-01`, primary: g.employee_name, secondary: g.period_label ?? undefined, amount: g.total_beban }))
    if (drill.source === 'assets') {
      const end = monthNo ? `${monthKey}-31` : `${year}-12-31`
      return (assets.data ?? [])
        .filter((a) => a.dep_per_month > 0 && a.acquisition_date <= end)
        .map((a) => ({ id: a.id, date: a.acquisition_date, primary: a.name, secondary: a.category ?? undefined, amount: a.dep_per_month }))
    }
    return []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, sales.data, purchases.data, opex.data, payroll.data, assets.data, year, monthNo])

  const total = lines.reduce((s, l) => s + l.amount, 0)
  const periodLabel = monthNo ? `${monthNames()[monthNo - 1]} ${year}` : `${t('Tahun')} ${year}`
  const amountHeader = source === 'assets' ? t('Penyusutan / Bulan') : t('Jumlah')

  return (
    <Modal open={open} onClose={onClose} title={target ? `${t(target.label)} · ${periodLabel}` : ''} wide>
      {isLoading ? (
        <LoadingRows />
      ) : lines.length === 0 ? (
        <EmptyState message={t('Tidak ada transaksi untuk baris & periode ini.')} />
      ) : (
        <div className="cb-scroll -mx-1 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={TH}>{t('Tanggal')}</th>
                <th className={TH}>{t('Keterangan')}</th>
                <th className={TH_R}>{amountHeader}</th>
              </tr>
            </thead>
            <tbody>
              {lines
                .slice()
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .map((l) => (
                  <tr key={l.id}>
                    <td className={TD + ' whitespace-nowrap'}>{formatDate(l.date)}</td>
                    <td className={TD}>
                      <div className="font-bold text-ink">{titleCase(l.primary)}</div>
                      {l.secondary && <div className="text-[11px] text-ink-faint">{titleCase(l.secondary)}</div>}
                    </td>
                    <td className={TD_R + ' font-bold text-ink'}>{formatRupiah(l.amount)}</td>
                  </tr>
                ))}
              <tr>
                <td className={TD + ' font-extrabold text-ink'} colSpan={2}>
                  {t('Total')} · {lines.length} {t('transaksi')}
                </td>
                <td className={TD_R + ' font-extrabold text-brand-dark'}>{formatRupiah(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}
