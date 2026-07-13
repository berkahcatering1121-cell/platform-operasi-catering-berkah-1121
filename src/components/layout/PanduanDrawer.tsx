import { MODULE_BY_KEY, type ModuleKey } from '@/lib/modules'

interface Guide {
  key: ModuleKey
  fungsi: string
  cara: string[]
  terhubung: string
}

// Detailed, beginner-friendly guide for every module — what it does, how to use
// it, and how it connects to the rest of the app (data flow).
const GUIDE: Record<ModuleKey, Guide> = {
  dashboard: {
    key: 'dashboard',
    fungsi:
      'Ringkasan keuangan sekilas: kartu KPI (total pendapatan, pembelian, beban gaji, laba bersih, margin), grafik tren bulanan, dan komposisi pembelian & penjualan.',
    cara: [
      'Cukup dilihat — tidak ada input di sini.',
      'Pilih tahun di kanan atas untuk mengganti periode.',
      'Semua angka terisi otomatis dari transaksi yang Anda catat.',
    ],
    terhubung:
      'Menarik data dari P&L (untuk KPI & grafik) serta dari Penjualan & Pembelian (untuk grafik komposisi). Ikut ter-update otomatis setiap kali ada transaksi baru.',
  },
  master: {
    key: 'master',
    fungsi:
      'Gudang “data induk” yang dipakai modul lain. Terdiri dari 4 tab: Kategori & Referensi, Supplier, Karyawan, dan Menu & Harga Jual (lengkap dengan editor resep untuk hitung HPP & margin otomatis).',
    cara: [
      'ISI INI PALING DULU sebelum mencatat transaksi.',
      'Tambah Supplier (untuk Pembelian), Karyawan (untuk PIC & Gaji), dan Menu + harga jual + resep bahan.',
      'Saat resep menu diisi, HPP, laba, dan margin dihitung otomatis.',
    ],
    terhubung:
      'Supplier & Kategori Bahan → dipakai di Pembelian. Karyawan → jadi PIC di Pembelian/Penjualan & dasar perhitungan Gaji. Menu & Harga Jual → mengisi harga per porsi otomatis di Penjualan. Metode & Status Pembayaran → pilihan di semua transaksi.',
  },
  pembelian: {
    key: 'pembelian',
    fungsi: 'Mencatat semua pembelian bahan baku beserta foto invoice/nota.',
    cara: [
      'Klik “+ Pembelian”, isi tanggal, bahan, kategori, supplier, qty & satuan, harga satuan (Total otomatis).',
      'Pilih status (Lunas/DP/Belum Bayar) dan PIC, lalu unggah foto invoice.',
      'Transaksi otomatis dikelompokkan per bulan lengkap dengan subtotal.',
    ],
    terhubung:
      'Mengambil Supplier, Kategori Bahan & PIC dari Master Data. Nilainya mengalir ke P&L (sebagai HPP/Pembelian) dan ke Dashboard (total pembelian + komposisi bahan).',
  },
  penjualan: {
    key: 'penjualan',
    fungsi: 'Mencatat pesanan & penjualan ke customer/event.',
    cara: [
      'Klik “+ Penjualan”, pilih Kategori & Menu → harga per porsi terisi otomatis dari Master Data (boleh diubah).',
      'Isi jumlah porsi (Total otomatis). Jika status DP, isi “Dibayar” → Sisa Pembayaran dihitung otomatis.',
      'Pilih PIC & metode pembayaran. Dikelompokkan per bulan + subtotal.',
    ],
    terhubung:
      'Mengambil Menu & harga dari Master Data. Nilainya mengalir ke P&L (Pendapatan & Laba Kotor) dan ke Dashboard (pendapatan + komposisi menu).',
  },
  petty: {
    key: 'petty',
    fungsi: 'Mengelola kas kecil (uang tunai operasional harian) dengan saldo berjalan otomatis.',
    cara: [
      'Buat “Periode” per bulan beserta Saldo Awal.',
      'Tambah transaksi Masuk (top up) atau Keluar (pengeluaran) + foto bukti.',
      'Saldo berjalan & Saldo Akhir dihitung otomatis; tandai Settle bila sudah direkonsiliasi.',
    ],
    terhubung:
      'Berdiri sendiri sebagai catatan kas kecil (alat pemantauan). Tidak ikut dihitung ke P&L.',
  },
  operasional: {
    key: 'operasional',
    fungsi:
      'Mencatat beban operasional: Sewa Tempat & Dapur, Listrik-Air-Gas, Transportasi, Marketing, dan Biaya Lain-lain.',
    cara: [
      'Klik “+ Biaya”, isi tanggal, keterangan, kategori, jumlah, metode, dan foto nota.',
      'Dikelompokkan per bulan + subtotal.',
    ],
    terhubung:
      'Semua biaya mengalir ke P&L masuk ke bagian Beban Operasional sesuai kategorinya.',
  },
  gaji: {
    key: 'gaji',
    fungsi: 'Menghitung & mencatat gaji karyawan (harian maupun bulanan).',
    cara: [
      'Klik “+ Gaji”, pilih karyawan.',
      'Karyawan Harian: centang kalender hari kerja → Gaji Dasar = Upah/Hari × jumlah hari.',
      'Karyawan Bulanan: gaji pokok tetap. Isi tunjangan/bonus/potongan → Total Beban & Take Home otomatis.',
      'Catatan: tombol Edit/Hapus hanya untuk Super Admin & Admin.',
    ],
    terhubung:
      'Mengambil data & tipe gaji karyawan dari Master Data. Nilainya mengalir ke P&L (Beban Gaji) dan Dashboard.',
  },
  hutang: {
    key: 'hutang',
    fungsi:
      'Memantau hutang ke bank/supplier. Sisa dan status (Lunas / Belum Lunas / Jatuh Tempo) dihitung otomatis.',
    cara: [
      'Klik “+ Hutang”, isi kreditur, jumlah, jatuh tempo, dan sudah dibayar.',
      'Kartu ringkasan di atas menunjukkan Total Hutang, Sudah Dibayar, dan Total Sisa.',
    ],
    terhubung:
      'Alat pemantauan mandiri untuk kewajiban/hutang. Tidak ikut dihitung ke P&L.',
  },
  aset: {
    key: 'aset',
    fungsi:
      'Mencatat aset (kendaraan, peralatan, dll.) dan menghitung penyusutan (depresiasi) garis lurus otomatis.',
    cara: [
      'Klik “+ Aset”, isi harga perolehan, umur ekonomis (bulan), dan nilai residu.',
      'Depresiasi/Bulan, Akumulasi, dan Nilai Buku dihitung otomatis.',
    ],
    terhubung:
      'Beban depresiasi otomatis mengalir ke P&L (baris “Depresiasi Aset”) mulai bulan perolehan.',
  },
  pnl: {
    key: 'pnl',
    fungsi:
      'Laporan Laba Rugi otomatis: 12 bulan + total tahunan, lengkap dengan EBITDA & margin. Bersifat read-only (hanya lihat).',
    cara: [
      'Cukup dilihat — tidak ada input.',
      'Pilih tahun di kanan atas. Semua baris terisi & dijumlah otomatis.',
    ],
    terhubung:
      'Ini “muara” semua modul. Menarik otomatis dari: Penjualan (Pendapatan), Pembelian (HPP), Gaji (Beban Gaji), Biaya Operasional (Sewa/Listrik/Transport/Marketing/Lain), dan Aset (Depresiasi).',
  },
  pengguna: {
    key: 'pengguna',
    fungsi: 'Mengelola akun pengguna, peran (role), dan izin akses per-modul. Khusus Super Admin.',
    cara: [
      'Klik “+ Pengguna”, isi Nama, ID, Password, pilih Role, dan centang modul yang boleh diakses.',
      'Kelola daftar peran pada kartu “Daftar Peran”.',
    ],
    terhubung:
      'Menentukan siapa boleh membuka & mengedit modul apa — menegakkan hak akses di seluruh aplikasi.',
  },
}

const GROUPS: { title: string; keys: ModuleKey[] }[] = [
  { title: 'Umum', keys: ['dashboard', 'master'] },
  { title: 'Operasional', keys: ['pembelian', 'penjualan', 'petty', 'operasional'] },
  { title: 'Finance', keys: ['gaji', 'hutang', 'aset', 'pnl'] },
  { title: 'Pengaturan', keys: ['pengguna'] },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function PanduanDrawer({ open, onClose }: Props) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] flex justify-end animate-fadeIn">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[460px] flex-col bg-app-card shadow-modal">
        <div className="flex items-center justify-between border-b border-app-border px-5 py-4">
          <div>
            <h2 className="text-[15.5px] font-extrabold text-ink">Panduan Penggunaan</h2>
            <p className="mt-0.5 text-[12px] text-ink-muted">Penjelasan tiap modul & cara semuanya terhubung</p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-md p-1.5 text-ink-secondary hover:bg-app-panel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="cb-scroll flex-1 overflow-y-auto p-5">
          {/* Alur singkat */}
          <div className="mb-4 rounded-card border border-master-border bg-master-bg p-4">
            <div className="text-[13px] font-extrabold text-master">Cara kerja singkat</div>
            <ol className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-ink-body">
              <li><b>1. Isi Master Data dulu</b> — supplier, karyawan, dan menu (+ harga & resep).</li>
              <li><b>2. Catat transaksi harian</b> — Pembelian, Penjualan, Gaji, Biaya Operasional, Petty Cash, Hutang, Aset.</li>
              <li><b>3. Hasil muncul otomatis</b> — semua mengalir ke <b>P&L</b> & <b>Dashboard</b> tanpa dihitung manual.</li>
            </ol>
          </div>

          {GROUPS.map((g) => (
            <div key={g.title} className="mb-2">
              <div className="mb-2 mt-3 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">
                {g.title}
              </div>
              <div className="space-y-2.5">
                {g.keys.map((k) => {
                  const m = MODULE_BY_KEY[k]
                  const guide = GUIDE[k]
                  return (
                    <div key={k} className="cb-card p-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand text-gold-pale">
                          {m.icon}
                        </span>
                        <span className="text-[13.5px] font-extrabold text-ink">{m.label}</span>
                      </div>

                      <p className="mt-2.5 text-[12.5px] leading-relaxed text-ink-body">{guide.fungsi}</p>

                      <div className="mt-2.5 text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">
                        Cara pakai
                      </div>
                      <ul className="mt-1 space-y-1">
                        {guide.cara.map((c, i) => (
                          <li key={i} className="flex gap-1.5 text-[12px] leading-relaxed text-ink-secondary">
                            <span className="mt-[6px] h-1 w-1 flex-none rounded-full bg-gold" />
                            <span>{c}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-2.5 rounded-field border border-app-border bg-app-panel px-3 py-2">
                        <span className="text-[11px] font-extrabold uppercase tracking-wide text-brand">
                          Terhubung ke →{' '}
                        </span>
                        <span className="text-[12px] leading-relaxed text-ink-body">{guide.terhubung}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Tips umum */}
          <div className="mb-2 mt-4 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-ink-muted">
            Tips Penting
          </div>
          <div className="cb-card space-y-2.5 p-4 text-[12px] leading-relaxed text-ink-body">
            <div>
              <b>Warna kolom isian:</b>
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-manual" /> Biru = diketik manual.
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-master" /> Hijau = otomatis dari Master Data (masih bisa diubah).
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-[#9A8E7C]" /> Abu/hitam = otomatis, tidak bisa diubah (mis. Total).
                </div>
              </div>
            </div>
            <div><b>Foto bukti:</b> bisa banyak gambar per transaksi; klik untuk memperbesar. Foto otomatis dikecilkan agar hemat penyimpanan.</div>
            <div><b>Pengelompokan:</b> transaksi selalu dikelompokkan per bulan lengkap dengan subtotal otomatis.</div>
            <div><b>Hak akses:</b> menu yang tampil mengikuti izin peran Anda. Edit/Hapus Gaji & Manajemen Pengguna khusus Super Admin/Admin.</div>
          </div>
        </div>
      </div>
    </div>
  )
}
