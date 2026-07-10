# Catering Berkah 1121 — Platform Operasi

Web app Purchasing & Finance untuk Catering Berkah 1121. Responsive (HP +
desktop), bahasa Indonesia, format Rupiah (id-ID).

**Stack:** React + TypeScript + Vite · Tailwind CSS · React Router · TanStack
Query · Supabase (Postgres + Auth + Storage + Row Level Security).

## Status

Fondasi terpasang dan sudah diverifikasi berjalan:

- **Database** — skema lengkap, kebijakan RLS berbasis peran, view/fungsi
  turunan (HPP/margin, subtotal, sisa, saldo berjalan, depresiasi, P&L).
  Lihat [`supabase/README.md`](supabase/README.md).
- **Aplikasi** — proyek Vite, Supabase client, autentikasi asli (login ID
  Pengguna/password), splash bermerek, layar Login, dan layout shell sidebar
  11 modul dengan navigasi terfilter izin, drawer mobile, dan tombol layar
  penuh.

Modul (Dashboard, Master Data, Pembelian, Penjualan, Gaji, Biaya Operasional,
Hutang, Petty Cash, Aset, P&L, Manajemen Pengguna) saat ini berupa placeholder
yang sudah ter-route dan ter-gate izin — konten dibangun bertahap pada tahap
berikutnya.

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
