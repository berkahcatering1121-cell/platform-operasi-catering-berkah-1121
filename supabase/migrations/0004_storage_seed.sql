-- =====================================================================
-- Catering Berkah 1121 — Platform Operasi
-- Migration 0004: Storage bucket for photo proofs + reference-data seed
-- =====================================================================

-- ---------------------------------------------------------------------
-- Storage bucket "proofs" — multi-image proof photos & notas.
-- Private bucket; the app reads via signed URLs or authenticated access.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('proofs', 'proofs', false)
on conflict (id) do nothing;

-- Any authenticated user may read/upload; writes to a transaction row are
-- already gated by table RLS, and object paths are namespaced per module.
create policy "proofs read" on storage.objects
  for select to authenticated using (bucket_id = 'proofs');
create policy "proofs insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'proofs');
create policy "proofs update" on storage.objects
  for update to authenticated using (bucket_id = 'proofs');
create policy "proofs delete" on storage.objects
  for delete to authenticated using (bucket_id = 'proofs');

-- ---------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------
insert into public.roles (name, is_core) values
  ('Super Admin', true),
  ('Admin',       true),
  ('Staff',       false),
  ('Kitchen',     false),
  ('Kasir',       false)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Ingredient categories
-- ---------------------------------------------------------------------
insert into public.ingredient_categories (name, sort) values
  ('Protein Hewani', 1),
  ('Sayur & Buah', 2),
  ('Bahan Kering & Sembako', 3),
  ('Bumbu & Rempah', 4),
  ('Kemasan & Box', 5)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Menu categories
-- ---------------------------------------------------------------------
insert into public.menu_categories (name, sort) values
  ('Nasi Kotak Thinwall', 1),
  ('Nasi Kotak Kardus', 2),
  ('Paket Besek, Bento & Tumpeng Mini', 3),
  ('Paket Bakul (15 pcs)', 4),
  ('Paket Nasi Bungkus', 5)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Payment methods
-- ---------------------------------------------------------------------
insert into public.payment_methods (name, sort) values
  ('Tunai', 1),
  ('Transfer BCA', 2),
  ('Transfer Mandiri', 3),
  ('Transfer BRI', 4),
  ('QRIS', 5)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- Payment statuses (kind drives badge colour)
-- ---------------------------------------------------------------------
insert into public.payment_statuses (name, kind, sort) values
  ('Lunas',       'green', 1),
  ('Dibayar',     'green', 2),
  ('DP',          'amber', 3),
  ('Belum Lunas', 'amber', 4),
  ('Belum Bayar', 'red',   5),
  ('Jatuh Tempo', 'red',   6)
on conflict (name) do nothing;
