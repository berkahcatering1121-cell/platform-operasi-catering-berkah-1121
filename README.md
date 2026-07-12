# Catering Berkah 1121 — Platform Operasi

Web app Purchasing & Finance untuk Catering Berkah 1121. Responsive (HP +
desktop), bahasa Indonesia, format Rupiah (id-ID).

**Stack:** React + TypeScript + Vite · Tailwind CSS · React Router · TanStack
Query · Supabase (Postgres + Auth + Storage + Row Level Security).

## Status

- **Database** — skema lengkap, kebijakan RLS berbasis peran, view/fungsi
  turunan (HPP/margin, subtotal, sisa, saldo berjalan, depresiasi, P&L), dan
  Edge Function `admin-users` untuk manajemen akun. Lihat
  [`supabase/README.md`](supabase/README.md) & [`supabase/RUNBOOK.md`](supabase/RUNBOOK.md).
- **Aplikasi** — proyek Vite, Supabase client, autentikasi asli (login ID
  Pengguna/password), splash bermerek, layar Login, layout shell sidebar dengan
  navigasi terfilter izin, drawer mobile, dan tombol layar penuh.

**Modul (semua terpasang & wired ke Supabase):**

| Modul | Isi |
| --- | --- |
| Master Data | Kategori & Referensi, Supplier, Karyawan, Menu & Harga Jual + editor resep HPP/margin |
| Pembelian | Grup per bulan + subtotal, foto bukti, PIC, satuan dropdown |
| Penjualan | Sisa Pembayaran (DP), harga/porsi dari Master Data (overridable) |
| Gaji | Kalender hari kerja (harian) + gaji bulanan; edit/hapus khusus Super Admin & Admin |
| Biaya Operasional | Kategori + foto nota, subtotal per bulan |
| Hutang | Kartu ringkasan, sisa & status otomatis |
| Petty Cash | Saldo berjalan otomatis, badge Settle per bulan |
| Aset & Depresiasi | Garis lurus, akumulasi & nilai buku otomatis → P&L |
| P&L | 12 bulan + total tahunan, EBITDA, margin, kolom sticky, read-only |
| Manajemen Pengguna | Akun + role + izin per-modul, Daftar Peran (Super Admin only) |
| Dashboard | (belum dibangun — placeholder) |

## Menjalankan

```bash
# 1. Dependencies
npm install

# 2. Konfigurasi Supabase
cp .env.example .env.local     # isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY

# 3. Database (butuh Docker + Supabase CLI)
supabase start
supabase db reset              # menjalankan semua migration
node scripts/seed-users.mjs    # provisi akun awal (lihat supabase/README.md)

# 4. Dev server
npm run dev                    # http://localhost:5173
```

Skrip lain: `npm run build` (produksi), `npm run typecheck`, `npm run preview`.

## Struktur

```
supabase/migrations/   Skema, RLS, view/fungsi turunan, storage + seed
scripts/seed-users.mjs Provisi akun Auth + profil awal
src/
  auth/                AuthProvider (sesi + peran + izin modul)
  components/          Splash, layout shell + sidebar, primitives
  lib/                 Supabase client, env, format Rupiah, definisi modul
  pages/               Login + 11 halaman modul
  routes/              Guard izin per-modul
design_handoff_catering_berkah/   Paket handoff desain (referensi)
```

## Konvensi desain

Token warna & tipografi mengikuti handoff (brand hijau `#16603F`, emas
`#C9A93B`, font Plus Jakarta Sans). Konvensi warna input: **biru** = manual,
**hijau** = dari Master Data, **netral/hitam** = otomatis (read-only).
