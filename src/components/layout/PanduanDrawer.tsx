import { MODULES } from '@/lib/modules'

const DESCRIPTIONS: Record<string, string> = {
  dashboard: 'Ringkasan keuangan: KPI pendapatan, pembelian, beban gaji, laba bersih, margin, grafik bulanan & komposisi.',
  master: 'Data referensi: kategori, supplier, karyawan, dan menu & harga jual dengan editor resep HPP + margin.',
  pembelian: 'Catat pembelian bahan baku per bulan dengan subtotal otomatis, foto bukti, dan PIC.',
  penjualan: 'Pesanan customer & event; harga per porsi dari Master Data, Total & Sisa Pembayaran dihitung otomatis.',
  gaji: 'Gaji harian (kalender hari kerja) & bulanan. Edit/Hapus khusus Super Admin & Admin.',
  operasional: 'Beban sewa, utilitas, transport, marketing, dan lain-lain per kategori dengan foto nota.',
  hutang: 'Daftar hutang dengan sisa & status otomatis (Lunas / Belum Lunas / Jatuh Tempo).',
  petty: 'Kas kecil dengan saldo berjalan otomatis dan badge Settle per bulan.',
  aset: 'Aset & depresiasi garis lurus; beban depresiasi mengalir otomatis ke P&L.',
  pnl: 'Laporan Laba Rugi (read-only) 12 bulan + total tahunan, roll-up otomatis dari semua modul.',
  pengguna: 'Kelola akun pengguna, peran, dan izin per-modul (khusus Super Admin).',
}

interface Props {
  open: boolean
  onClose: () => void
}

export default function PanduanDrawer({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex justify-end animate-fadeIn">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[440px] flex-col bg-app-card shadow-modal">
        <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
          <div>
            <h2 className="text-[15.5px] font-extrabold text-ink">Panduan Penggunaan</h2>
            <p className="mt-0.5 text-[12px] text-ink-muted">Ringkasan fungsi tiap modul</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-md p-1.5 text-ink-secondary hover:bg-app-panel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="cb-scroll flex-1 overflow-y-auto p-5">
          <div className="space-y-2.5">
            {MODULES.map((m) => (
              <div key={m.key} className="cb-card p-3.5">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-[10px] font-extrabold text-gold-pale">
                    {m.code}
                  </span>
                  <span className="text-[13px] font-extrabold text-ink">{m.label}</span>
                </div>
                <p className="mt-2 text-[12px] leading-relaxed text-ink-secondary">
                  {DESCRIPTIONS[m.key]}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
