import { formatRupiah, formatPercent, formatDate } from '@/lib/format'

export type AlertLevel = 'danger' | 'warn' | 'ok'
export interface Alert {
  level: AlertLevel
  title: string
  detail: string
}

type T = (id: string, en?: string) => string

/**
 * Automatic finance alerts, derived from the current period + live balances.
 * Returns a healthy state when nothing needs attention.
 */
export function computeAlerts(p: {
  t: T
  rev: number
  hpp: number
  gaji: number
  scopeNetCash: number
  cashBalance: number
  dueSoon: { creditor: string; due: string }[]
  unpaidPayroll: number
}): Alert[] {
  const { t } = p
  const ratio = (n: number) => (p.rev > 0 ? n / p.rev : 0)
  const fc = ratio(p.hpp)
  const lc = ratio(p.gaji)
  const pc = ratio(p.hpp + p.gaji)
  const over = t('melebihi target', 'exceeds the target of')
  const out: Alert[] = []

  if (p.rev > 0 && fc > 0.35)
    out.push({ level: fc > 0.4 ? 'danger' : 'warn', title: t('Food Cost tinggi'), detail: `Food Cost ${formatPercent(fc)} ${over} 35%.` })
  if (p.rev > 0 && lc > 0.3)
    out.push({ level: lc > 0.35 ? 'danger' : 'warn', title: t('Labor Cost tinggi'), detail: `Labor Cost ${formatPercent(lc)} ${over} 30%.` })
  if (p.rev > 0 && pc > 0.6)
    out.push({ level: pc > 0.7 ? 'danger' : 'warn', title: t('Prime Cost tinggi'), detail: `Prime Cost ${formatPercent(pc)} ${over} 60%.` })
  if (p.scopeNetCash < 0)
    out.push({ level: 'danger', title: t('Arus kas negatif'), detail: `${t('Pengeluaran melebihi pemasukan')} ${formatRupiah(-p.scopeNetCash)} ${t('pada periode ini')}.` })
  if (p.cashBalance < 0)
    out.push({ level: 'danger', title: t('Saldo kas negatif'), detail: `${t('Saldo kas berjalan')} ${formatRupiah(p.cashBalance)}.` })
  for (const d of p.dueSoon)
    out.push({ level: 'warn', title: t('Hutang segera jatuh tempo'), detail: `${d.creditor} · ${formatDate(d.due)}.` })
  if (p.unpaidPayroll > 0)
    out.push({ level: 'warn', title: t('Gaji belum dibayar'), detail: `${p.unpaidPayroll} ${t('slip gaji belum berstatus Dibayar')}.` })

  if (out.length === 0)
    out.push({ level: 'ok', title: t('Kondisi keuangan sehat'), detail: t('Tidak ada peringatan aktif saat ini.') })
  return out
}

export interface Analytics {
  cashBalance: number
  avgDailyRev: number
  avgDailyExp: number
  ebitda: number
  cashBurn: number
  currentRatio: number | null
  debtRatio: number | null
  revGrowth: number | null
}

export function computeAnalytics(p: {
  rev: number
  exp: number
  net: number
  dep: number
  days: number
  prevRev: number | null
  cashBalance: number
  scopeNetCash: number
  ar: number
  debtSisa: number
  assetBook: number
}): Analytics {
  const assets = p.cashBalance + p.assetBook + p.ar
  return {
    cashBalance: p.cashBalance,
    avgDailyRev: p.days ? p.rev / p.days : 0,
    avgDailyExp: p.days ? p.exp / p.days : 0,
    ebitda: p.net + p.dep,
    cashBurn: Math.max(0, -p.scopeNetCash),
    currentRatio: p.debtSisa > 0 ? (p.cashBalance + p.ar) / p.debtSisa : null,
    debtRatio: assets > 0 ? p.debtSisa / assets : null,
    revGrowth: p.prevRev && p.prevRev > 0 ? (p.rev - p.prevRev) / p.prevRev : null,
  }
}
