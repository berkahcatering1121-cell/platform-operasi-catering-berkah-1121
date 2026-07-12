# Runbook — menyiapkan database Supabase

> **Kenapa manual?** Sesi agent ini berjalan di lingkungan dengan kebijakan
> egress yang **memblokir host Supabase Anda** (`jjjsjnxprakztdsubsnl.supabase.co`
> → proxy menolak dengan 403), dan host database langsung hanya beralamat IPv6
> (sandbox tanpa IPv6). Jadi migration harus dijalankan dari mesin Anda /
> dashboard Supabase. Langkah di bawah butuh ±5 menit.

Ada dua cara. **Cara A (SQL Editor)** paling cepat dan tidak butuh tool apa pun.

---

## Cara A — SQL Editor (disarankan, tanpa CLI)

### A1. Jalankan skema + RLS + view + seed referensi
1. Buka **Supabase Dashboard → SQL Editor → New query**.
2. Buka file **`supabase/apply_all.sql`** dari repo (branch
   `claude/catering-berkah-platform-orut58`), **salin seluruh isinya**.
3. Tempel ke SQL Editor, klik **Run**.
   - Ini membuat 19 tabel, semua kebijakan RLS, view/fungsi turunan
     (`get_pnl`, dll.), bucket Storage `proofs`, dan data referensi (roles,
     kategori, metode & status pembayaran).
   - Harusnya selesai tanpa error. Jika satu blok Storage gagal karena izin,
     lihat catatan **Troubleshooting** di bawah.

### A2. Verifikasi (opsional tapi bagus)
Jalankan query ini di SQL Editor dan tempelkan hasilnya ke saya:
```sql
select
  (select count(*) from public.roles)                as roles,
  (select count(*) from public.ingredient_categories) as ing_cat,
  (select count(*) from public.menu_categories)      as menu_cat,
  (select count(*) from public.payment_statuses)     as pay_status,
  (select count(*) from pg_policies where schemaname='public') as rls_policies,
  (select count(*) from storage.buckets where id='proofs')     as proofs_bucket;
-- Harapan: roles=5, ing_cat=5, menu_cat=5, pay_status=6, rls_policies≈40+, proofs_bucket=1
select * from public.get_pnl(2026) limit 3;   -- harus mengembalikan 12 baris (di sini 3 saja)
```

### A3. Buat akun login (butuh **service_role key**)
Kunci yang Anda kirim (`sb_publishable_…`) adalah **anon/publishable** — tidak
bisa membuat user Auth. Untuk membuat 3 akun awal (dony/hamada/fahmi):

1. Dashboard → **Project Settings → API → `service_role` secret** → salin.
   ⚠️ Ini rahasia penuh-akses; **jangan** taruh di frontend / commit.
2. Dari mesin Anda (Node 18+), di dalam folder repo:
   ```bash
   npm install
   SUPABASE_URL=https://jjjsjnxprakztdsubsnl.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service_role secret> \
   AUTH_EMAIL_DOMAIN=catering-berkah.local \
   node scripts/seed-users.mjs
   ```
   Output: `✓ dony (Super Admin) …`, `✓ hamada (Admin) …`, `✓ fahmi (Admin) …`.

> **Tidak mau pakai service key?** Alternatif via dashboard: Authentication →
> Add user, buat email `dony@catering-berkah.local` (Auto Confirm) + password,
> lalu di SQL Editor:
> ```sql
> insert into public.profiles (id, username, full_name, role, modules)
> select id, 'dony', 'Dony Renato', 'Super Admin', '{}'
> from auth.users where email = 'dony@catering-berkah.local';
> ```
> Ulangi untuk hamada/fahmi (role `Admin`, `modules '{master,gaji}'`).

---

## Cara B — Supabase CLI dari mesin Anda

```bash
npm install -g supabase          # atau brew install supabase/tap/supabase
supabase link --project-ref jjjsjnxprakztdsubsnl   # minta DB password: cateringberkah1121
supabase db push                 # menjalankan migrations 0001–0004 berurutan
# lalu langkah A3 untuk akun login
```

---

## Edge Function untuk Manajemen Pengguna (opsional, untuk membuat akun dari aplikasi)

Membuat / menghapus akun login butuh **service_role key** (Supabase Auth Admin
API) yang tidak boleh ada di browser. Karena itu modul **Manajemen Pengguna**
memanggil Edge Function `admin-users` yang berjalan di server, memverifikasi
pemanggil adalah **Super Admin**, lalu menjalankan operasinya. Tanpa function
ini, halaman tetap bisa menampilkan & mengedit **profil/role/izin** yang ada,
tetapi tombol tambah/hapus akun akan memberi pesan “belum ter-deploy”.

Deploy dari mesin Anda (butuh Supabase CLI + Docker):

```bash
supabase link --project-ref jjjsjnxprakztdsubsnl
supabase functions deploy admin-users
supabase secrets set AUTH_EMAIL_DOMAIN=catering-berkah.local
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` disuntik
otomatis oleh platform — tidak perlu di-set manual. Setelah deploy, login
sebagai `dony` (Super Admin) → **Manajemen Pengguna** → **+ Pengguna** untuk
membuat akun baru lengkap dengan password, role, dan izin per-modul.

> **Tanpa deploy?** Anda tetap bisa membuat akun lewat Dashboard (Authentication
> → Add user) + query insert profil seperti pada langkah A3.

---

## Setelah database siap

Beri tahu saya (idealnya dengan hasil query verifikasi A2). Frontend sudah
menunjuk ke project Anda via `.env.local`, jadi login `dony` /
`cateringberkah1121` seharusnya langsung berfungsi. Saya lanjut membangun
modul **Master Data**.

---

## Troubleshooting

- **`must be owner of table objects` saat membuat policy Storage** — jalankan
  hanya blok Storage lewat dashboard **Storage → Policies** untuk bucket
  `proofs`, atau abaikan: bucket tetap terbuat, dan kebijakan default
  authenticated bisa Anda tambah dari UI. Sisa migration tidak terpengaruh.
- **Menjalankan ulang** aman: semua seed pakai `on conflict do nothing` dan
  `create or replace`. Untuk tabel, jika perlu mengulang dari nol, drop dulu
  schema `public` (hati-hati) atau pakai `supabase db reset` (lokal saja).
