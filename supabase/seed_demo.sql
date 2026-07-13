-- =====================================================================
-- Catering Berkah 1121 — DEMO DATA (Juli–Desember 2026)
-- =====================================================================
-- Mengisi contoh data transaksi untuk SEMUA modul, dimulai Juli 2026.
-- Bulan sebelum Juli 2026 sengaja dikosongkan (tidak ada transaksi), jadi
-- P&L & Dashboard hanya menampilkan Jul–Des 2026 + Total.
--
-- ⚠️ RESET: skrip ini MENGHAPUS lalu mengisi ulang tabel transaksi + suppliers
-- + employees + assets agar hasilnya konsisten dan bisa dijalankan ulang.
-- Data referensi (roles, kategori, metode/status pembayaran), menu, akun
-- login (profiles) TIDAK disentuh. Jalankan sekali di Supabase SQL Editor.
-- =====================================================================

begin;

do $$
declare
  -- master-data ids
  sup_ayam uuid; sup_daging uuid; sup_sayur uuid; sup_sembako uuid; sup_bumbu uuid; sup_box uuid;
  e_irma uuid; e_yuli uuid; e_roni uuid; e_amira uuid; e_maya uuid; e_rina uuid; e_dony uuid;
  -- loop scratch
  i int; m date; mend date; r numeric; p numeric; pid uuid; pp uuid; erow record;
  listrik numeric; transport numeric; marketing numeric; lain numeric;
  thw_p int; krd_p int; bkl_p int; bng_p int; bkl_total numeric;
  revs   numeric[] := array[98600000, 102300000, 110450000, 118200000, 132600000, 145800000];
  ratios numeric[] := array[0.45, 0.44, 0.43, 0.42, 0.41, 0.40];
begin
  ------------------------------------------------------------------
  -- RESET demo tables
  ------------------------------------------------------------------
  delete from public.purchases;
  delete from public.sales;
  delete from public.payroll;             -- cascade -> payroll_days
  delete from public.operational_costs;
  delete from public.debts;
  delete from public.petty_cash_periods;  -- cascade -> petty_cash_entries
  delete from public.assets;
  delete from public.employees;
  delete from public.suppliers;

  ------------------------------------------------------------------
  -- Suppliers
  ------------------------------------------------------------------
  insert into public.suppliers(name, category, phone) values
    ('Agen Ayam Potong Barokah', 'Protein Hewani', '0812-3456-7801') returning id into sup_ayam;
  insert into public.suppliers(name, category, phone) values
    ('Toko Daging H. Somad', 'Protein Hewani', '0813-9922-1144') returning id into sup_daging;
  insert into public.suppliers(name, category, phone) values
    ('Pasar Induk Berkat Jaya', 'Sayur & Buah', '0857-1200-3355') returning id into sup_sayur;
  insert into public.suppliers(name, category, phone) values
    ('CV Sumber Sembako', 'Bahan Kering & Sembako', '0821-4455-6677') returning id into sup_sembako;
  insert into public.suppliers(name, category, phone) values
    ('UD Bumbu Nusantara', 'Bumbu & Rempah', '0812-7788-9900') returning id into sup_bumbu;
  insert into public.suppliers(name, category, phone) values
    ('Berkah Packaging', 'Kemasan & Box', '0851-2233-4455') returning id into sup_box;

  ------------------------------------------------------------------
  -- Employees (4 Harian + 3 Bulanan)
  ------------------------------------------------------------------
  insert into public.employees(name, position, department, salary_type, base_salary, daily_wage) values
    ('Mpok Irma', 'Head Cook', 'Produksi/Dapur', 'Harian', 0, 200000) returning id into e_irma;
  insert into public.employees(name, position, department, salary_type, base_salary, daily_wage) values
    ('Yuli', 'Staff Dapur', 'Produksi/Dapur', 'Harian', 0, 150000) returning id into e_yuli;
  insert into public.employees(name, position, department, salary_type, base_salary, daily_wage) values
    ('Roni', 'Staff Dapur', 'Produksi/Dapur', 'Harian', 0, 100000) returning id into e_roni;
  insert into public.employees(name, position, department, salary_type, base_salary, daily_wage) values
    ('Amira', 'Staff Dapur', 'Produksi/Dapur', 'Harian', 0, 100000) returning id into e_amira;
  insert into public.employees(name, position, department, salary_type, base_salary, daily_wage) values
    ('Maya Putri', 'Marketing', 'Kantor', 'Bulanan', 3500000, 0) returning id into e_maya;
  insert into public.employees(name, position, department, salary_type, base_salary, daily_wage) values
    ('Rina Marlina', 'Admin & Keuangan', 'Kantor', 'Bulanan', 3800000, 0) returning id into e_rina;
  insert into public.employees(name, position, department, salary_type, base_salary, daily_wage) values
    ('Dony Renato', 'Direktur Keuangan', 'Kantor', 'Bulanan', 4000000, 0) returning id into e_dony;

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

    -- ---- Gaji: Harian pakai kalender hari kerja; Bulanan gaji tetap ----
    for erow in select id, salary_type from public.employees loop
      if erow.salary_type = 'Harian' then
        insert into public.payroll(employee_id, period_month, period_label, pay_date, days_worked, allowance, bonus, deduction, status)
          values (erow.id, m,
            'Gaji Bulanan ' || (array['Juli','Agustus','September','Oktober','November','Desember'])[i + 1] || ' 2026',
            mend - 1, 0, 0, 0, 0, case when i <= 1 then 'Dibayar' else 'Belum' end)
          returning id into pid;
        insert into public.payroll_days(payroll_id, work_date)
          select pid, gs::date from generate_series(m, mend - 1, interval '1 day') gs
          where extract(dow from gs) <> 0;   -- semua hari kecuali Minggu
        update public.payroll set days_worked = (select count(*) from public.payroll_days where payroll_id = pid) where id = pid;
      else
        insert into public.payroll(employee_id, period_month, period_label, pay_date, days_worked, allowance, bonus, deduction, status)
          values (erow.id, m,
            'Gaji Bulanan ' || (array['Juli','Agustus','September','Oktober','November','Desember'])[i + 1] || ' 2026',
            mend - 1, 0, 200000, 0, 0, case when i <= 1 then 'Dibayar' else 'Belum' end);
      end if;
    end loop;

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
--   -> baris 1..6 (Jan–Jun) = 0, baris 7..12 (Jul–Des) terisi.
