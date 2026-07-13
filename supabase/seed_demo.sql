-- =====================================================================
-- Catering Berkah 1121 — DEMO DATA (Juli–Desember 2026)
-- =====================================================================
-- Mengisi contoh transaksi Jul–Des 2026 TANPA menyentuh:
--   • Master Data  : suppliers, employees (karyawan), menu, kategori
--   • Gaji         : payroll + payroll_days
--   • Akun login   : profiles / roles
-- Hanya me-*reset* & mengisi ulang: purchases, sales, operational_costs,
-- debts, petty_cash, dan assets. Bulan sebelum Juli 2026 tetap kosong.
--
-- Catatan: kolom bulan di P&L (Jan–Des) diatur oleh aplikasi, bukan seed —
-- Jan–Jun tampil kosong karena tidak ada transaksi. Aman dijalankan ulang.
-- Jalankan sekali di Supabase SQL Editor.
-- =====================================================================

begin;

do $$
declare
  sup_ayam uuid; sup_sayur uuid; sup_sembako uuid; sup_bumbu uuid; sup_box uuid;
  e_maya uuid; e_rina uuid;
  i int; m date; mend date; r numeric; p numeric; pp uuid;
  listrik numeric; transport numeric; marketing numeric; lain numeric;
  thw_p int; krd_p int; bkl_p int; bng_p int; bkl_total numeric;
  revs   numeric[] := array[98600000, 102300000, 110450000, 118200000, 132600000, 145800000];
  ratios numeric[] := array[0.45, 0.44, 0.43, 0.42, 0.41, 0.40];
begin
  ------------------------------------------------------------------
  -- Ambil referensi Master Data yang SUDAH ADA (tidak diubah)
  ------------------------------------------------------------------
  select id into sup_ayam    from public.suppliers where category = 'Protein Hewani'         order by name limit 1;
  select id into sup_sayur   from public.suppliers where category = 'Sayur & Buah'           order by name limit 1;
  select id into sup_sembako from public.suppliers where category = 'Bahan Kering & Sembako' order by name limit 1;
  select id into sup_bumbu   from public.suppliers where category = 'Bumbu & Rempah'         order by name limit 1;
  select id into sup_box     from public.suppliers where category = 'Kemasan & Box'          order by name limit 1;

  -- PIC diambil dari karyawan yang ada (fallback ke karyawan mana pun)
  select id into e_maya from public.employees where name ilike '%maya%' order by name limit 1;
  select id into e_rina from public.employees where name ilike '%rina%' order by name limit 1;
  if e_rina is null then select id into e_rina from public.employees order by name limit 1; end if;
  if e_maya is null then e_maya := e_rina; end if;

  ------------------------------------------------------------------
  -- RESET hanya transaksi non-Gaji (Master Data, Menu & Gaji dibiarkan)
  ------------------------------------------------------------------
  delete from public.purchases;
  delete from public.sales;
  delete from public.operational_costs;
  delete from public.debts;
  delete from public.petty_cash_periods;   -- cascade -> petty_cash_entries
  delete from public.assets;

  ------------------------------------------------------------------
  -- Assets (diperoleh Juli 2026 -> depresiasi mengalir Jul–Des)
  ------------------------------------------------------------------
  insert into public.assets(acquisition_date, name, category, acquisition_cost, economic_life_months, residual_value) values
    ('2026-07-01', 'Mobil Box Grand Max', 'Kendaraan', 145000000, 60, 25000000),
    ('2026-07-05', 'Freezer Box 600 L', 'Peralatan Dapur', 12000000, 48, 0),
    ('2026-07-10', 'Oven Gas Besar', 'Peralatan Dapur', 8000000, 48, 320000),
    ('2026-07-12', 'Kompor & Kwali Set Besar', 'Peralatan Dapur', 6000000, 36, 600000),
    ('2026-07-20', 'Laptop Admin', 'Elektronik', 7200000, 36, 0);

  ------------------------------------------------------------------
  -- Hutang (semua tanggal Juli 2026 ke atas)
  ------------------------------------------------------------------
  insert into public.debts(debt_date, creditor, debt_type, description, amount, due_date, paid_amount) values
    ('2026-07-15', 'Bank BRI', 'Pinjaman Bank (KUR)', 'Modal kerja, cicilan 12×', 50000000, '2027-07-15', 8000000),
    ('2026-07-02', 'Toko Daging H. Somad', 'Hutang Dagang', 'Tempo pembelian daging sapi', 6750000, '2026-07-10', 3000000),
    ('2026-08-05', 'CV Sumber Sembako', 'Hutang Dagang', 'Tempo sembako bulanan', 4350000, '2026-09-05', 4350000),
    ('2026-09-10', 'Berkah Packaging', 'Hutang Dagang', 'Tempo kemasan event besar', 2800000, '2026-10-10', 0),
    ('2026-10-01', 'Koperasi Maju Bersama', 'Pinjaman Koperasi', 'Pembelian freezer & oven', 8000000, '2027-04-01', 2000000);

  ------------------------------------------------------------------
  -- Loop bulan Juli (i=0) .. Desember (i=5)
  ------------------------------------------------------------------
  for i in 0..5 loop
    m := make_date(2026, 7 + i, 1);
    mend := (m + interval '1 month')::date;
    r := revs[i + 1];
    p := round(r * ratios[i + 1]);

    -- ---- Penjualan (4 kategori, jumlah ~ target bulan) ----
    thw_p := greatest(1, round(r * 0.40 / 32000));
    krd_p := greatest(1, round(r * 0.28 / 28000));
    bkl_p := greatest(1, round(r * 0.20 / 360000));
    bng_p := greatest(1, round(r * 0.12 / 22000));
    bkl_total := bkl_p * 360000;
    insert into public.sales(sale_date, customer, menu_category, menu_name, portions, price_per_portion, method, status, paid_amount, pic_employee_id, notes) values
      (m + 4,  'Pesanan Kantor & Instansi', 'Nasi Kotak Thinwall', 'Aneka Nasi Kotak Thinwall', thw_p, 32000, 'Transfer BCA', 'Lunas', 0, e_maya, null),
      (m + 9,  'Pesanan Ramesan Harian',    'Nasi Kotak Kardus',   'Aneka Nasi Ramesan',        krd_p, 28000, 'Transfer BCA', 'Lunas', 0, e_maya, null),
      (m + 14, 'Event & Hajatan',           'Paket Bakul (15 pcs)', 'Nasi Liwet Bakul',         bkl_p, 360000, 'Transfer BCA',
        case when i >= 4 then 'DP' else 'Lunas' end,
        case when i >= 4 then round(bkl_total * 0.5) else 0 end, e_maya, null),
      (m + 20, 'Pesanan Nasi Bungkus',      'Paket Nasi Bungkus',  'Nasbung Berkah',            bng_p, 22000, 'Tunai', 'Lunas', 0, e_maya, null);

    -- ---- Pembelian bahan baku (5 kategori) ----
    insert into public.purchases(purchase_date, material_name, category, supplier_id, qty, unit, unit_price, status, pic_employee_id, notes) values
      (m + 2,  'Ayam & Protein Hewani',  'Protein Hewani',          sup_ayam,    1, 'paket', round(p * 0.38), 'Lunas', e_rina, null),
      (m + 3,  'Sayur & Buah Segar',     'Sayur & Buah',            sup_sayur,   1, 'paket', round(p * 0.22), 'Lunas', e_rina, null),
      (m + 6,  'Beras & Sembako',        'Bahan Kering & Sembako',  sup_sembako, 1, 'paket', round(p * 0.18), 'Lunas', e_rina, null),
      (m + 8,  'Bumbu & Rempah',         'Bumbu & Rempah',          sup_bumbu,   1, 'paket', round(p * 0.12), 'Lunas', e_rina, null),
      (m + 11, 'Kemasan & Box Makan',    'Kemasan & Box',           sup_box,     1, 'paket', round(p * 0.10),
        case when i = 5 then 'Belum Bayar' else 'Lunas' end, e_rina, null);

    -- ---- Biaya operasional (5 kategori) ----
    listrik   := round((2 + (i % 3) * 0.18) * 1e6);
    transport := round(r * 0.026);
    marketing := round((1.1 + (i % 4) * 0.22) * 1e6);
    lain      := round((0.85 + (i % 5) * 0.14) * 1e6);
    insert into public.operational_costs(cost_date, description, category, amount, method, notes) values
      (m,      'Sewa dapur & tempat bulanan', 'Sewa Tempat & Dapur',        4000000,   'Transfer BCA',     'Kontrak s/d Des 2026'),
      (m + 4,  'Tagihan listrik, air & gas',  'Listrik, Air & Gas',         listrik,   'Transfer Mandiri', null),
      (m + 10, 'BBM & tol pengiriman',        'Transportasi & Pengiriman',  transport, 'Tunai',            null),
      (m + 13, 'Iklan & promosi',             'Marketing & Promosi',        marketing, 'QRIS',             null),
      (m + 17, 'Biaya lain-lain operasional', 'Biaya Lain-lain',            lain,      'Tunai',            null);

    -- ---- Petty cash: satu periode per bulan + beberapa transaksi ----
    insert into public.petty_cash_periods(period_month, opening_balance, is_settled)
      values (m, 5000000, i <= 3) returning id into pp;
    insert into public.petty_cash_entries(period_id, entry_date, description, cash_in, cash_out, sort) values
      (pp, m + 1,  'Beli galon & es batu',        0,       85000,  1),
      (pp, m + 4,  'Parkir & tol kurir',          0,       45000,  2),
      (pp, m + 9,  'Top up dari kas besar',       1000000, 0,      3),
      (pp, m + 14, 'Token listrik darurat',       0,       200000, 4),
      (pp, m + 21, 'ATK nota & pulpen',           0,       35000,  5);
  end loop;
end $$;

commit;

-- Verifikasi cepat (opsional):
--   select month_no, pendapatan, laba_bersih from public.get_pnl(2026) order by month_no;
--   -> Jan–Jun (1..6) = 0, Jul–Des (7..12) terisi. Gaji & Master Data tetap.
