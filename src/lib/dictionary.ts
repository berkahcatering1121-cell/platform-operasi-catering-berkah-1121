/**
 * English dictionary keyed by the Indonesian source string.
 *
 * Indonesian is the base language: components keep their Indonesian text and pass
 * it through `t()`. When the language is English, `t(id)` returns the mapping
 * below; if a string isn't listed here it simply falls back to the Indonesian
 * original, so partial coverage never breaks the UI.
 */
export const EN: Record<string, string> = {
  // ── Modules / navigation ──────────────────────────────────────────────
  'Dashboard': 'Dashboard',
  'Master Data': 'Master Data',
  'Pembelian Bahan Baku': 'Raw Material Purchases',
  'Penjualan': 'Sales',
  'Gaji Karyawan': 'Employee Payroll',
  'Biaya Operasional': 'Operating Costs',
  'Hutang': 'Debts',
  'Petty Cash': 'Petty Cash',
  'Aset & Depresiasi': 'Assets & Depreciation',
  'P&L (Laba Rugi)': 'P&L (Profit & Loss)',
  'Manajemen Pengguna': 'User Management',
  'Operasional': 'Operations',
  'Finance': 'Finance',

  // ── App chrome ────────────────────────────────────────────────────────
  'Cari modul…': 'Search module…',
  'Platform Operasi': 'Operations Platform',
  'PLATFORM OPERASI': 'OPERATIONS PLATFORM',
  'Panduan': 'Guide',
  'Keluar': 'Log out',
  'Layar penuh': 'Fullscreen',
  'Keluar layar penuh': 'Exit fullscreen',
  'Buka menu': 'Open menu',
  'Beranda': 'Home',
  'Pembelian': 'Purchases',
  'Menu': 'Menu',
  'Bahasa': 'Language',
  'Welcome back,': 'Welcome back,',

  // ── Common actions / states ───────────────────────────────────────────
  'Simpan': 'Save',
  'Menyimpan…': 'Saving…',
  'Batal': 'Cancel',
  'Hapus': 'Delete',
  'Hapus data': 'Delete data',
  'Menghapus…': 'Deleting…',
  'Edit': 'Edit',
  'Tutup': 'Close',
  'Tambah': 'Add',
  'Memuat data…': 'Loading…',
  'Memproses…': 'Processing…',
  'Bersihkan': 'Clear',
  'Pilih…': 'Select…',

  // ── Status badges ─────────────────────────────────────────────────────
  'Lunas': 'Paid',
  'Belum Lunas': 'Unpaid',
  'Jatuh Tempo': 'Overdue',
  'Dibayar': 'Paid',
  'Belum Bayar': 'Unpaid',
  'Belum Dibayar': 'Unpaid',
  'Settle': 'Settled',
  'Not Settle Yet': 'Not Settled',
  'Aktif': 'Active',
  'Nonaktif': 'Inactive',
  'Harian': 'Daily',
  'Bulanan': 'Monthly',
  'DP': 'Down Payment',

  // ── Margin notes (Menu & pricing) ─────────────────────────────────────
  'Isi HPP dulu': 'Enter COGS first',
  'Harga sehat': 'Healthy price',
  'Margin tipis': 'Thin margin',
  'Rugi / terlalu murah': 'Loss / too cheap',

  // ── Login ─────────────────────────────────────────────────────────────
  'Login': 'Login',
  'ID Pengguna': 'User ID',
  'Password': 'Password',
  'Masuk': 'Sign in',
  'Tampilkan password': 'Show password',
  'Sembunyikan password': 'Hide password',
  'ID Pengguna atau password salah.': 'Wrong user ID or password.',
}
