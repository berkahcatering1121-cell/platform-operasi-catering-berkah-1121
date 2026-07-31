import type { PnlMonth } from './api'

// ── P&L row definitions (shared by the on-screen table and the PDF export) ──
export type RowDef =
  | { kind: 'header'; label: string }
  | {
      kind: 'money'
      label: string
      get: (m: PnlMonth) => number
      strong?: boolean
      tint?: string
      indent?: boolean
      accent?: 'green'
    }
  | { kind: 'pct'; label: string; numr: (m: PnlMonth) => number; den: (m: PnlMonth) => number }

export const ROWS: RowDef[] = [
  { kind: 'money', label: 'Pendapatan', get: (m) => m.pendapatan, strong: true },
  { kind: 'money', label: 'HPP (Pembelian Bahan Baku)', get: (m) => m.hpp },
  { kind: 'money', label: 'Laba Kotor', get: (m) => m.laba_kotor, strong: true, tint: 'bg-app-panel' },
  { kind: 'pct', label: 'Margin Kotor (%)', numr: (m) => m.laba_kotor, den: (m) => m.pendapatan },
  { kind: 'header', label: 'Beban Operasional' },
  { kind: 'money', label: 'Gaji Karyawan', get: (m) => m.beban_gaji, indent: true },
  { kind: 'money', label: 'Sewa Tempat & Dapur', get: (m) => m.beban_sewa, indent: true },
  { kind: 'money', label: 'Listrik, Air & Gas', get: (m) => m.beban_listrik, indent: true },
  { kind: 'money', label: 'Transportasi & Pengiriman', get: (m) => m.beban_transport, indent: true },
  { kind: 'money', label: 'Marketing & Promosi', get: (m) => m.beban_marketing, indent: true },
  { kind: 'money', label: 'Biaya Lain-lain', get: (m) => m.beban_lain, indent: true },
  { kind: 'money', label: 'Depresiasi Aset', get: (m) => m.beban_depresiasi, indent: true },
  { kind: 'money', label: 'Total Beban Operasional', get: (m) => m.total_beban_operasional, strong: true, tint: 'bg-app-panel' },
  { kind: 'money', label: 'EBITDA', get: (m) => m.laba_bersih + m.beban_depresiasi, strong: true, tint: 'bg-[#EDF5EF]', accent: 'green' },
  { kind: 'pct', label: '% EBITDA', numr: (m) => m.laba_bersih + m.beban_depresiasi, den: (m) => m.pendapatan },
  { kind: 'money', label: 'Laba Bersih', get: (m) => m.laba_bersih, strong: true, tint: 'bg-gold-tint', accent: 'green' },
  { kind: 'pct', label: 'Margin Bersih (%)', numr: (m) => m.laba_bersih, den: (m) => m.pendapatan },
]

// ── Internal analysis (cost/margin ratios vs. F&B benchmarks) ──
export type Metric = {
  label: string
  hint: string
  value: number
  target: number
  kind: 'cost' | 'margin'
  /** Short auto-tip shown when the metric is not ideal (Over / below target). */
  note: string
}

/** Sum the given months (scope 0 = whole year, 1-12 = a single month). */
function scoped(months: PnlMonth[], scope: number): PnlMonth[] {
  return scope === 0 ? months : months.filter((m) => m.month_no === scope)
}

export function scopeRevenue(months: PnlMonth[], scope: number): number {
  return scoped(months, scope).reduce((a, m) => a + m.pendapatan, 0)
}

export function computeMetrics(months: PnlMonth[], scope: number): Metric[] {
  const src = scoped(months, scope)
  const sum = (f: (m: PnlMonth) => number) => src.reduce((a, m) => a + f(m), 0)
  const rev = sum((m) => m.pendapatan)
  const p = (n: number) => (rev > 0 ? n / rev : 0)
  const hpp = sum((m) => m.hpp)
  const gaji = sum((m) => m.beban_gaji)
  const opex = sum((m) => m.total_beban_operasional)
  return [
    {
      label: 'Food Cost (COGS)', hint: 'HPP ÷ Pendapatan', value: p(hpp), target: 0.35, kind: 'cost',
      note: 'Biaya bahan baku terlalu tinggi. Cek harga jual, standar porsi/HPP, dan stok pembelian yang berlebih.',
    },
    {
      label: 'Labor Cost', hint: 'Beban Gaji ÷ Pendapatan', value: p(gaji), target: 0.3, kind: 'cost',
      note: 'Beban gaji tinggi terhadap pendapatan. Tinjau jumlah staf & lembur, atau dorong penjualan.',
    },
    {
      label: 'Prime Cost', hint: '(HPP + Gaji) ÷ Pendapatan', value: p(hpp + gaji), target: 0.6, kind: 'cost',
      note: 'Bahan baku + gaji melebihi ideal, umumnya dipicu Food Cost. Tekan HPP lebih dulu.',
    },
    {
      label: 'Overhead (Opex non-Gaji)', hint: '(Opex − Gaji) ÷ Pendapatan', value: p(opex - gaji), target: 0.25, kind: 'cost',
      note: 'Biaya operasional non-gaji tinggi (sewa, listrik, transport, marketing). Tinjau pos terbesar.',
    },
    {
      label: 'Margin Kotor', hint: 'Laba Kotor ÷ Pendapatan', value: p(sum((m) => m.laba_kotor)), target: 0.65, kind: 'margin',
      note: 'Margin kotor di bawah ideal, biasanya akibat Food Cost tinggi. Naikkan harga jual atau tekan HPP.',
    },
    {
      label: 'Margin Bersih', hint: 'Laba Bersih ÷ Pendapatan', value: p(sum((m) => m.laba_bersih)), target: 0.1, kind: 'margin',
      note: 'Laba bersih tipis. Tinjau biaya terbesar (bahan baku, gaji, atau operasional).',
    },
  ]
}

export function verdict(m: Metric): { label: string; tone: 'green' | 'amber' | 'red' } {
  if (m.kind === 'cost') {
    if (m.value <= m.target) return { label: 'Ideal', tone: 'green' }
    if (m.value <= m.target * 1.15) return { label: 'Sedikit Over', tone: 'amber' }
    return { label: 'Over', tone: 'red' }
  }
  if (m.value >= m.target) return { label: 'Sehat', tone: 'green' }
  if (m.value >= m.target * 0.7) return { label: 'Cukup', tone: 'amber' }
  return { label: 'Kurang', tone: 'red' }
}
