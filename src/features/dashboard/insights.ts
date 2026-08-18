import { formatRupiah, formatPercent, formatDate } from '@/lib/format'

export type AlertLevel = 'danger' | 'warn' | 'ok'
export interface AlertCalcLine {
  label: string
  value: string
}
export interface AlertCalc {
  /** The formula in words, e.g. "Food Cost = HPP / Pendapatan". */
  formula: string
  /** The real figures the formula pulls from. */
  lines: AlertCalcLine[]
  /** The arithmetic worked out, e.g. "40.000.000 / 100.000.000 = 40,0%". */
  result: string
  /** The benchmark the result is compared against. */
  target?: string
  /** What to actually check or do in the field. */
  action: string
}
export interface Alert {
  level: AlertLevel
  title: string
  detail: string
  /** Optional step-by-step breakdown, shown when the alert is opened. */
  calc?: AlertCalc
}

type T = (id: string, en?: string) => string

/**
 * Automatic finance alerts, derived from the current period + live balances.
 * Each alert carries a calc breakdown so the number can be traced back to the
 * real figures behind it. Returns a healthy state when nothing needs attention.
 */
export function computeAlerts(p: {
  t: T
  rev: number
  hpp: number
  gaji: number
  scopeNetCash: number
  scopeCashIn: number
  scopeCashOut: number
  cashBalance: number
  dueSoon: { creditor: string; due: string; sisa: number }[]
  unpaidPayroll: number
}): Alert[] {
  const { t } = p
  const ratio = (n: number) => (p.rev > 0 ? n / p.rev : 0)
  const fc = ratio(p.hpp)
  const lc = ratio(p.gaji)
  const pc = ratio(p.hpp + p.gaji)
  const over = t('melebihi target', 'exceeds the target of')
  const rp = formatRupiah
  const out: Alert[] = []

  if (p.rev > 0 && fc > 0.35)
    out.push({
      level: fc > 0.4 ? 'danger' : 'warn',
      title: t('Food Cost tinggi'),
      detail: `Food Cost ${formatPercent(fc)} ${over} 35%.`,
      calc: {
        formula: `Food Cost = ${t('HPP')} / ${t('Pendapatan')}`,
        lines: [
          { label: t('HPP (pembelian bahan baku)'), value: rp(p.hpp) },
          { label: t('Pendapatan'), value: rp(p.rev) },
        ],
        result: `${rp(p.hpp)} / ${rp(p.rev)} = ${formatPercent(fc)}`,
        target: `${t('Target')}: ${t('maks')} 35%`,
        action: t('Cek di lapangan: harga jual per porsi, standar porsi & resep (HPP), serta pembelian bahan yang berlebih atau terbuang. Naikkan harga jual atau tekan biaya bahan.'),
      },
    })
  if (p.rev > 0 && lc > 0.3)
    out.push({
      level: lc > 0.35 ? 'danger' : 'warn',
      title: t('Labor Cost tinggi'),
      detail: `Labor Cost ${formatPercent(lc)} ${over} 30%.`,
      calc: {
        formula: `Labor Cost = ${t('Beban Gaji')} / ${t('Pendapatan')}`,
        lines: [
          { label: t('Beban Gaji'), value: rp(p.gaji) },
          { label: t('Pendapatan'), value: rp(p.rev) },
        ],
        result: `${rp(p.gaji)} / ${rp(p.rev)} = ${formatPercent(lc)}`,
        target: `${t('Target')}: ${t('maks')} 30%`,
        action: t('Cek di lapangan: jumlah karyawan, jam kerja & lembur pada periode ini. Sesuaikan jadwal shift atau dorong penjualan agar gaji sebanding dengan omzet.'),
      },
    })
  if (p.rev > 0 && pc > 0.6)
    out.push({
      level: pc > 0.7 ? 'danger' : 'warn',
      title: t('Prime Cost tinggi'),
      detail: `Prime Cost ${formatPercent(pc)} ${over} 60%.`,
      calc: {
        formula: `Prime Cost = (${t('HPP')} + ${t('Beban Gaji')}) / ${t('Pendapatan')}`,
        lines: [
          { label: t('HPP (pembelian bahan baku)'), value: rp(p.hpp) },
          { label: t('Beban Gaji'), value: rp(p.gaji) },
          { label: t('Pendapatan'), value: rp(p.rev) },
        ],
        result: `(${rp(p.hpp)} + ${rp(p.gaji)}) / ${rp(p.rev)} = ${formatPercent(pc)}`,
        target: `${t('Target')}: ${t('maks')} 60%`,
        action: t('Prime Cost menggabungkan bahan baku dan gaji, dua biaya terbesar. Biasanya dipicu Food Cost, jadi tekan HPP dulu, lalu tinjau efisiensi tenaga kerja.'),
      },
    })
  if (p.scopeNetCash < 0)
    out.push({
      level: 'danger',
      title: t('Arus kas negatif'),
      detail: `${t('Pengeluaran melebihi pemasukan')} ${rp(-p.scopeNetCash)} ${t('pada periode ini')}.`,
      calc: {
        formula: `${t('Arus Kas Bersih')} = ${t('Uang Masuk')} - ${t('Uang Keluar')}`,
        lines: [
          { label: t('Uang Masuk'), value: rp(p.scopeCashIn) },
          { label: t('Uang Keluar'), value: rp(p.scopeCashOut) },
        ],
        result: `${rp(p.scopeCashIn)} - ${rp(p.scopeCashOut)} = ${rp(p.scopeNetCash)}`,
        action: t('Buka modul Arus Kas, urutkan pengeluaran terbesar pada periode ini. Tunda pengeluaran yang bisa ditunda dan percepat penagihan piutang.'),
      },
    })
  if (p.cashBalance < 0)
    out.push({
      level: 'danger',
      title: t('Saldo kas negatif'),
      detail: `${t('Saldo kas berjalan')} ${rp(p.cashBalance)}.`,
      calc: {
        formula: `${t('Saldo Kas')} = ${t('Total Uang Masuk')} - ${t('Total Uang Keluar')} (${t('semua waktu')})`,
        lines: [{ label: t('Saldo kas berjalan'), value: rp(p.cashBalance) }],
        result: rp(p.cashBalance),
        action: t('Saldo kas menurut catatan sudah minus. Segera setor modal/kas atau tahan pengeluaran. Pastikan semua pemasukan tunai sudah dicatat agar saldo akurat.'),
      },
    })
  for (const d of p.dueSoon)
    out.push({
      level: 'warn',
      title: t('Hutang segera jatuh tempo'),
      detail: `${d.creditor} · ${formatDate(d.due)}.`,
      calc: {
        formula: t('Hutang dengan jatuh tempo dalam 7 hari ke depan'),
        lines: [
          { label: t('Kreditur'), value: d.creditor },
          { label: t('Jatuh tempo'), value: formatDate(d.due) },
          { label: t('Sisa hutang'), value: rp(d.sisa) },
        ],
        result: `${t('Siapkan dana')} ${rp(d.sisa)}`,
        action: t('Siapkan dana sebesar sisa hutang sebelum tanggal jatuh tempo, atau hubungi kreditur untuk perpanjangan. Catat pembayaran di modul Hutang setelah dibayar.'),
      },
    })
  if (p.unpaidPayroll > 0)
    out.push({
      level: 'warn',
      title: t('Gaji belum dibayar'),
      detail: `${p.unpaidPayroll} ${t('slip gaji belum berstatus Dibayar')}.`,
      calc: {
        formula: t('Slip gaji periode ini yang masih berstatus Belum Dibayar'),
        lines: [{ label: t('Jumlah slip belum dibayar'), value: `${p.unpaidPayroll}` }],
        result: `${p.unpaidPayroll} ${t('slip')}`,
        action: t('Buka modul Gaji, proses pembayaran slip yang tertunda, lalu ubah statusnya menjadi Dibayar agar arus kas tercatat benar.'),
      },
    })

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
