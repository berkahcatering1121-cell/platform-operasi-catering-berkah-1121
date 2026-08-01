import { useMemo } from 'react'
import { useSales } from '@/features/sales/api'
import { usePurchases } from '@/features/purchases/api'
import { useOperationalCosts } from '@/features/opex/api'
import { usePayroll } from '@/features/payroll/api'
import { usePettyEntries } from '@/features/petty/api'
import { useDebts } from '@/features/debts/api'
import { useAssets } from '@/features/assets/api'

// A module the money movement originated from. Used for the "Source Module"
// column and the ledger filter.
export type CashSource =
  | 'sales'
  | 'purchases'
  | 'payroll'
  | 'opex'
  | 'petty'
  | 'debts'
  | 'assets'

export interface CashRow {
  id: string
  date: string // YYYY-MM-DD
  source: CashSource
  description: string
  category: string | null
  method: string | null
  cashIn: number
  cashOut: number
}

/**
 * Unified cash-flow ledger — the master financial transaction record. It
 * auto-aggregates every existing module (Sales, Purchases, Payroll, Operating
 * Costs, Petty Cash, Debts, Assets) into one cash-basis stream. No duplicate
 * input: rows are derived from the transactions users already enter elsewhere.
 *
 * Cash-basis notes (approximate until per-payment/per-account tracking exists):
 *  - Sales    → money in = amount actually received (paid_amount), not credit.
 *  - Purchases→ money out = total (treated as paid at purchase date).
 *  - Payroll  → money out = take-home, only once marked Dibayar.
 *  - Debts    → loan principal in at debt date; repaid amount out.
 *  - Assets   → acquisition cost out (depreciation is non-cash, excluded).
 */
export function useCashFlow() {
  const sales = useSales()
  const purchases = usePurchases()
  const opex = useOperationalCosts()
  const payroll = usePayroll()
  const petty = usePettyEntries()
  const debts = useDebts()
  const assets = useAssets()

  const queries = [sales, purchases, opex, payroll, petty, debts, assets]
  const isLoading = queries.some((q) => q.isLoading)
  const error = queries.find((q) => q.error)?.error ?? null

  const rows = useMemo<CashRow[]>(() => {
    const out: CashRow[] = []

    for (const s of sales.data ?? []) {
      if (s.paid_amount > 0)
        out.push({
          id: `sale-${s.id}`,
          date: s.sale_date,
          source: 'sales',
          description: [s.customer, s.menu_name].filter(Boolean).join(' · '),
          category: s.menu_category ?? 'Penjualan',
          method: s.method,
          cashIn: s.paid_amount,
          cashOut: 0,
        })
    }

    for (const p of purchases.data ?? []) {
      if (p.total > 0)
        out.push({
          id: `buy-${p.id}`,
          date: p.purchase_date,
          source: 'purchases',
          description: [p.material_name, p.supplier_name].filter(Boolean).join(' · '),
          category: p.category ?? 'Pembelian Bahan Baku',
          method: null,
          cashIn: 0,
          cashOut: p.total,
        })
    }

    for (const o of opex.data ?? []) {
      if (o.amount > 0)
        out.push({
          id: `opex-${o.id}`,
          date: o.cost_date,
          source: 'opex',
          description: o.description,
          category: o.category,
          method: o.method,
          cashIn: 0,
          cashOut: o.amount,
        })
    }

    for (const g of payroll.data ?? []) {
      if (g.status === 'Dibayar' && g.take_home > 0)
        out.push({
          id: `pay-${g.id}`,
          date: g.pay_date ?? `${g.month_key}-01`,
          source: 'payroll',
          description: [g.employee_name, g.period_label].filter(Boolean).join(' · '),
          category: 'Gaji Karyawan',
          method: null,
          cashIn: 0,
          cashOut: g.take_home,
        })
    }

    for (const e of petty.data ?? []) {
      if (e.cash_in > 0 || e.cash_out > 0)
        out.push({
          id: `petty-${e.id}`,
          date: e.entry_date,
          source: 'petty',
          description: e.description,
          category: 'Petty Cash',
          method: null,
          cashIn: e.cash_in,
          cashOut: e.cash_out,
        })
    }

    for (const d of debts.data ?? []) {
      if (d.amount > 0)
        out.push({
          id: `debt-in-${d.id}`,
          date: d.debt_date,
          source: 'debts',
          description: `Pinjaman · ${d.creditor}`,
          category: d.debt_type ?? 'Hutang',
          method: null,
          cashIn: d.amount,
          cashOut: 0,
        })
      if (d.paid_amount > 0)
        out.push({
          id: `debt-out-${d.id}`,
          date: d.debt_date,
          source: 'debts',
          description: `Pembayaran · ${d.creditor}`,
          category: d.debt_type ?? 'Hutang',
          method: null,
          cashIn: 0,
          cashOut: d.paid_amount,
        })
    }

    for (const a of assets.data ?? []) {
      if (a.acquisition_cost > 0)
        out.push({
          id: `asset-${a.id}`,
          date: a.acquisition_date,
          source: 'assets',
          description: a.name,
          category: a.category ?? 'Aset',
          method: null,
          cashIn: 0,
          cashOut: a.acquisition_cost,
        })
    }

    // Oldest first so the running balance accumulates correctly.
    out.sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0))
    return out
  }, [sales.data, purchases.data, opex.data, payroll.data, petty.data, debts.data, assets.data])

  return { rows, isLoading, error }
}
