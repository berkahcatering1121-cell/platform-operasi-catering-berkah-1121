-- =====================================================================
-- Catering Berkah 1121 — Platform Operasi
-- Migration 0001: Core schema (tables, constraints, indexes, triggers)
-- =====================================================================
-- Money is stored as numeric(14,2). Dates are real DATE columns.
-- Derived values (row totals, monthly subtotals, HPP, margin, sisa hutang,
-- depreciation, P&L) are NOT stored here — they are computed in views /
-- functions (see 0004_views.sql) so the ledger stays the single source of
-- truth and can never drift from its roll-ups.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =====================================================================
-- ROLES & USERS
-- =====================================================================

-- Roles. Super Admin & Admin are core (is_core = true) and cannot be
-- deleted from the UI. Custom roles can be added/removed.
create table public.roles (
  name        text primary key,
  is_core     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Profiles map 1:1 to auth.users. Login uses "ID Pengguna" (username);
-- the app turns username -> username@<auth-domain> for Supabase Auth,
-- so the real credential (password) lives in auth.users, not here.
-- `modules` holds the per-module permission keys granted to this user.
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text not null unique,
  full_name   text not null,
  role        text not null references public.roles(name) on update cascade,
  modules     text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_role_idx on public.profiles(role);
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Module keys are validated in the app layer. For reference they are:
--   dashboard, master, pembelian, penjualan, gaji, operasional,
--   hutang, petty, aset, pnl, pengguna
comment on column public.profiles.modules is
  'Module keys granted to this user: master, pembelian, penjualan, gaji, operasional, hutang, petty, aset, pengguna. dashboard & pnl are always granted; Super Admin implicitly has all.';

-- =====================================================================
-- REFERENCE / MASTER DATA
-- =====================================================================

create table public.ingredient_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.menu_categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.payment_methods (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  sort        int not null default 0
);

-- kind drives the badge colour: 'green' (Lunas/Dibayar), 'amber' (DP/Belum
-- Lunas), 'red' (Belum Bayar/Jatuh Tempo).
create table public.payment_statuses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  kind        text not null default 'amber' check (kind in ('green','amber','red')),
  sort        int not null default 0
);

create table public.suppliers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category    text references public.ingredient_categories(name) on update cascade on delete set null,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger suppliers_set_updated_at
  before update on public.suppliers
  for each row execute function public.set_updated_at();

create table public.employees (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  position      text,                              -- Jabatan
  department    text,                              -- Departemen
  salary_type   text not null default 'Bulanan' check (salary_type in ('Harian','Bulanan')),
  base_salary   numeric(14,2) not null default 0,  -- Gaji Pokok (Bulanan)
  daily_wage    numeric(14,2) not null default 0,  -- Upah/Hari (Harian)
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger employees_set_updated_at
  before update on public.employees
  for each row execute function public.set_updated_at();

-- =====================================================================
-- MENU & HPP (recipe)
-- =====================================================================

create table public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.menu_categories(id) on delete cascade,
  name         text not null,
  description  text,                               -- komposisi text
  sell_price   numeric(14,2) not null default 0,   -- Harga Jual / Porsi
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items(category_id);
create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- Recipe rows. HPP/Porsi = sum(qty * price). Margin computed downstream.
create table public.menu_ingredients (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid not null references public.menu_items(id) on delete cascade,
  name          text not null,
  qty           numeric(12,3) not null default 0,
  unit          text not null default 'porsi'
                  check (unit in ('pcs','kg','gr','liter','ml','btr','ikat','porsi','bungkus','sdm','sdt')),
  price         numeric(14,2) not null default 0,  -- harga per satuan
  sort          int not null default 0
);
create index menu_ingredients_item_idx on public.menu_ingredients(menu_item_id);

-- =====================================================================
-- TRANSACTIONS
-- =====================================================================

-- Photo proofs are stored as an array of Supabase Storage object paths
-- (bucket "proofs"). Multiple images per row; lightbox reads these.

create table public.purchases (
  id             uuid primary key default gen_random_uuid(),
  purchase_date  date not null,
  material_name  text not null,                    -- Bahan
  category       text references public.ingredient_categories(name) on update cascade on delete set null,
  supplier_id    uuid references public.suppliers(id) on delete set null,
  qty            numeric(12,3) not null default 0,
  unit           text,
  unit_price     numeric(14,2) not null default 0, -- Harga Satuan
  -- Total = qty * unit_price (computed in app / views, never stored)
  status         text not null default 'Lunas',    -- Lunas / DP / Belum Bayar
  pic_employee_id uuid references public.employees(id) on delete set null,
  notes          text,
  photos         text[] not null default '{}',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index purchases_date_idx on public.purchases(purchase_date);
create trigger purchases_set_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

create table public.sales (
  id                 uuid primary key default gen_random_uuid(),
  sale_date          date not null,
  customer           text not null,                -- Customer / Event
  menu_category      text,
  menu_name          text,
  portions           numeric(12,2) not null default 0,  -- Porsi
  price_per_portion  numeric(14,2) not null default 0,  -- Harga/Porsi (dari Master Data, overridable)
  -- Total = portions * price_per_portion (computed)
  -- Sisa Pembayaran = (status = 'Lunas') ? 0 : Total - paid_amount (computed)
  method             text,
  status             text not null default 'Lunas',     -- Lunas / DP / Belum Bayar
  paid_amount        numeric(14,2) not null default 0,  -- Dibayar (DP)
  pic_employee_id    uuid references public.employees(id) on delete set null,
  notes              text,
  photos             text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index sales_date_idx on public.sales(sale_date);
create trigger sales_set_updated_at
  before update on public.sales
  for each row execute function public.set_updated_at();

-- Payroll header. One row per employee per pay event (weekly for harian,
-- monthly for bulanan). Gaji Dasar, Total Beban, Take Home are computed:
--   dasar     = (salary_type='Harian') ? daily_wage * days_worked : base_salary
--   beban     = dasar + allowance + bonus
--   take_home = beban - deduction
create table public.payroll (
  id            uuid primary key default gen_random_uuid(),
  employee_id   uuid not null references public.employees(id) on delete cascade,
  period_month  date not null,                     -- first day of the payroll month
  period_label  text,                              -- e.g. "Gaji Mingguan 6 – 11 Jul"
  pay_date      date,
  days_worked   int not null default 0,            -- authoritative count for Harian
  allowance     numeric(14,2) not null default 0,  -- Tunjangan
  bonus         numeric(14,2) not null default 0,  -- Bonus / Lembur
  deduction     numeric(14,2) not null default 0,  -- Potongan
  status        text not null default 'Belum',     -- Belum / Dibayar (Lunas)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index payroll_month_idx on public.payroll(period_month);
create index payroll_employee_idx on public.payroll(employee_id);
create trigger payroll_set_updated_at
  before update on public.payroll
  for each row execute function public.set_updated_at();

-- Calendar of days worked for Harian employees. The picker ticks dates;
-- days_worked on the header should equal count(payroll_days) for that row.
create table public.payroll_days (
  id          uuid primary key default gen_random_uuid(),
  payroll_id  uuid not null references public.payroll(id) on delete cascade,
  work_date   date not null,
  unique (payroll_id, work_date)
);
create index payroll_days_payroll_idx on public.payroll_days(payroll_id);

create table public.operational_costs (
  id          uuid primary key default gen_random_uuid(),
  cost_date   date not null,
  description text not null,                        -- Keterangan
  category    text not null,                        -- Sewa / Listrik-Air-Gas / Transport / Marketing / Lain-lain
  amount      numeric(14,2) not null default 0,
  method      text,
  notes       text,
  photos      text[] not null default '{}',         -- Foto Nota
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index operational_costs_date_idx on public.operational_costs(cost_date);
create trigger operational_costs_set_updated_at
  before update on public.operational_costs
  for each row execute function public.set_updated_at();

create table public.debts (
  id           uuid primary key default gen_random_uuid(),
  debt_date    date not null,                       -- Tgl Hutang
  creditor     text not null,                       -- Kreditur
  debt_type    text,                                -- Jenis
  description  text,
  amount       numeric(14,2) not null default 0,
  due_date     date,                                -- Jatuh Tempo
  paid_amount  numeric(14,2) not null default 0,    -- Sudah Dibayar
  -- Sisa = amount - paid_amount (computed)
  -- Status = paid>=amount ? 'Lunas' : due_date<today ? 'Jatuh Tempo' : 'Belum Lunas' (computed)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger debts_set_updated_at
  before update on public.debts
  for each row execute function public.set_updated_at();

-- Petty cash grouped per month, each with a Saldo Awal (opening balance)
-- and a Settle flag. Running Saldo is computed per entry.
create table public.petty_cash_periods (
  id               uuid primary key default gen_random_uuid(),
  period_month     date not null unique,            -- first day of the month
  opening_balance  numeric(14,2) not null default 0,
  is_settled       boolean not null default false,  -- Settle / Not Settle Yet
  created_at       timestamptz not null default now()
);

create table public.petty_cash_entries (
  id          uuid primary key default gen_random_uuid(),
  period_id   uuid not null references public.petty_cash_periods(id) on delete cascade,
  entry_date  date not null,
  description text not null,
  cash_in     numeric(14,2) not null default 0,     -- Masuk
  cash_out    numeric(14,2) not null default 0,     -- Keluar
  photos      text[] not null default '{}',         -- Foto Bukti
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index petty_cash_entries_period_idx on public.petty_cash_entries(period_id);

create table public.assets (
  id                    uuid primary key default gen_random_uuid(),
  acquisition_date      date not null,              -- Tgl Perolehan
  name                  text not null,
  category              text,                       -- Kendaraan / Peralatan Dapur / ...
  acquisition_cost      numeric(14,2) not null default 0,
  economic_life_months  int not null default 12 check (economic_life_months > 0),
  residual_value        numeric(14,2) not null default 0,
  -- Depresiasi/Bulan = (acquisition_cost - residual_value) / economic_life_months (straight-line, computed)
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index assets_acq_date_idx on public.assets(acquisition_date);
create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();
