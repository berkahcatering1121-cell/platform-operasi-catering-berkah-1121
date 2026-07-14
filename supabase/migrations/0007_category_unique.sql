-- =====================================================================
-- 0007 — Nama kategori unik (case-insensitive) di level database
-- =====================================================================
-- Mencegah nama kategori ganda pada ingredient_categories & menu_categories,
-- mengabaikan huruf besar/kecil dan spasi di ujung ("Nasi Campur" == "nasi campur").
-- Ini pelengkap validasi di aplikasi — jaring pengaman terakhir.
--
-- CATATAN: jalankan query pengecekan di bawah lebih dulu. Jika ada baris yang
-- muncul, berarti sudah ada duplikat — rapikan (rename/hapus salah satu) dulu,
-- baru buat unique index-nya (kalau tidak, pembuatan index akan gagal).

-- 1) Cek duplikat yang sudah ada (idealnya 0 baris):
-- select 'ingredient_categories' tbl, lower(trim(name)) k, count(*)
--   from public.ingredient_categories group by 1,2 having count(*) > 1
-- union all
-- select 'menu_categories', lower(trim(name)), count(*)
--   from public.menu_categories group by 1,2 having count(*) > 1;

-- 2) Buat unique index case-insensitive:
create unique index if not exists ingredient_categories_name_ci_uidx
  on public.ingredient_categories (lower(trim(name)));

create unique index if not exists menu_categories_name_ci_uidx
  on public.menu_categories (lower(trim(name)));
