-- =====================================================================
-- Catering Berkah 1121 — COMBINED migration (0001-0004)
-- Convenience concat for the Supabase SQL Editor. Generated from the
-- individual files in supabase/migrations/. Run once, top to bottom.
-- =====================================================================

-- >>>>>>>>>> FILE: supabase/migrations/0001_schema.sql >>>>>>>>>>

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
  -- Password management: new users get a random temp password and must set
  -- their own on first login. `visible_password` keeps the current password
  -- readable for the Super Admin (per business requirement); it is only ever
  -- exposed via profiles RLS (own row, or Super Admin).
  must_change_password boolean not null default false,
  visible_password     text,
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

-- >>>>>>>>>> FILE: supabase/migrations/0002_rls.sql >>>>>>>>>>

-- =====================================================================
-- Catering Berkah 1121 — Platform Operasi
-- Migration 0002: Role helpers + Row Level Security
-- =====================================================================
-- Access model (enforced in the DB, not just the UI):
--   * Super Admin  -> full access to every table.
--   * Admin & custom roles -> Dashboard + P&L always; other modules only
--     when the module key is present in profiles.modules.
--   * All authenticated users may READ the ledger + master data (Dashboard
--     and P&L are always visible and roll up every module). WRITES are
--     gated per module.
--   * Gaji (payroll) edit/delete is restricted to Super Admin & Admin.
--   * Manajemen Pengguna (profiles, roles) is Super Admin only.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER so they bypass RLS on profiles and
-- can be called safely from inside policies without recursion).
-- ---------------------------------------------------------------------
create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.my_role() = 'Super Admin', false);
$$;

create or replace function public.is_admin_or_super()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.my_role() in ('Super Admin', 'Admin'), false);
$$;

-- True when the current user may operate the given module. Dashboard & P&L
-- are always granted; Super Admin always passes.
create or replace function public.has_module(m text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when m in ('dashboard', 'pnl') then auth.uid() is not null
      else exists (
        select 1 from public.profiles p
        where p.id = auth.uid()
          and (p.role = 'Super Admin' or m = any(p.modules))
      )
    end;
$$;

grant execute on function public.my_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_admin_or_super() to authenticated;
grant execute on function public.has_module(text) to authenticated;

-- ---------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------
alter table public.roles                 enable row level security;
alter table public.profiles              enable row level security;
alter table public.ingredient_categories enable row level security;
alter table public.menu_categories       enable row level security;
alter table public.payment_methods       enable row level security;
alter table public.payment_statuses      enable row level security;
alter table public.suppliers             enable row level security;
alter table public.employees             enable row level security;
alter table public.menu_items            enable row level security;
alter table public.menu_ingredients      enable row level security;
alter table public.purchases             enable row level security;
alter table public.sales                 enable row level security;
alter table public.payroll               enable row level security;
alter table public.payroll_days          enable row level security;
alter table public.operational_costs     enable row level security;
alter table public.debts                 enable row level security;
alter table public.petty_cash_periods    enable row level security;
alter table public.petty_cash_entries    enable row level security;
alter table public.assets                enable row level security;

-- =====================================================================
-- PROFILES  (Manajemen Pengguna — Super Admin only; users read own row)
-- =====================================================================
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());

create policy profiles_insert on public.profiles
  for insert to authenticated
  with check (public.is_super_admin());

create policy profiles_update on public.profiles
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create policy profiles_delete on public.profiles
  for delete to authenticated
  using (public.is_super_admin() and id <> auth.uid());  -- can't delete yourself

-- =====================================================================
-- ROLES  (read: everyone; write: Super Admin; core roles are protected)
-- =====================================================================
create policy roles_select on public.roles
  for select to authenticated using (true);

create policy roles_insert on public.roles
  for insert to authenticated
  with check (public.is_super_admin());

create policy roles_update on public.roles
  for update to authenticated
  using (public.is_super_admin() and is_core = false)
  with check (public.is_super_admin());

create policy roles_delete on public.roles
  for delete to authenticated
  using (public.is_super_admin() and is_core = false);

-- =====================================================================
-- MASTER DATA  (read: everyone; write: has_module('master'))
--   reference lists, suppliers, employees, menu items & recipe rows
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array[
    'ingredient_categories','menu_categories','payment_methods','payment_statuses',
    'suppliers','employees','menu_items','menu_ingredients'
  ] loop
    execute format($f$
      create policy %1$s_select on public.%1$s
        for select to authenticated using (true);
      create policy %1$s_insert on public.%1$s
        for insert to authenticated with check (public.has_module('master'));
      create policy %1$s_update on public.%1$s
        for update to authenticated
        using (public.has_module('master')) with check (public.has_module('master'));
      create policy %1$s_delete on public.%1$s
        for delete to authenticated using (public.has_module('master'));
    $f$, t);
  end loop;
end $$;

-- =====================================================================
-- TRANSACTION LEDGER
--   read: every authenticated user (Dashboard & P&L roll up all modules)
--   write: the owning module's permission
-- =====================================================================

-- Generic module-gated tables: (table, module_key)
do $$
declare
  rec record;
begin
  for rec in
    select * from (values
      ('purchases',         'pembelian'),
      ('sales',             'penjualan'),
      ('operational_costs', 'operasional'),
      ('debts',             'hutang'),
      ('petty_cash_periods','petty'),
      ('petty_cash_entries','petty'),
      ('assets',            'aset')
    ) as v(tbl, module)
  loop
    execute format($f$
      create policy %1$s_select on public.%1$s
        for select to authenticated using (true);
      create policy %1$s_insert on public.%1$s
        for insert to authenticated with check (public.has_module(%2$L));
      create policy %1$s_update on public.%1$s
        for update to authenticated
        using (public.has_module(%2$L)) with check (public.has_module(%2$L));
      create policy %1$s_delete on public.%1$s
        for delete to authenticated using (public.has_module(%2$L));
    $f$, rec.tbl, rec.module);
  end loop;
end $$;

-- =====================================================================
-- PAYROLL  (Gaji Karyawan)
--   read:   every authenticated user
--   insert: has_module('gaji')
--   update/delete: Super Admin & Admin ONLY (per spec)
-- =====================================================================
create policy payroll_select on public.payroll
  for select to authenticated using (true);
create policy payroll_insert on public.payroll
  for insert to authenticated with check (public.has_module('gaji'));
create policy payroll_update on public.payroll
  for update to authenticated
  using (public.is_admin_or_super()) with check (public.is_admin_or_super());
create policy payroll_delete on public.payroll
  for delete to authenticated using (public.is_admin_or_super());

create policy payroll_days_select on public.payroll_days
  for select to authenticated using (true);
create policy payroll_days_insert on public.payroll_days
  for insert to authenticated with check (public.has_module('gaji'));
create policy payroll_days_update on public.payroll_days
  for update to authenticated
  using (public.is_admin_or_super()) with check (public.is_admin_or_super());
create policy payroll_days_delete on public.payroll_days
  for delete to authenticated using (public.is_admin_or_super());

-- >>>>>>>>>> FILE: supabase/migrations/0003_views.sql >>>>>>>>>>

-- =====================================================================
-- Catering Berkah 1121 — Platform Operasi
-- Migration 0003: Derived / computed views + P&L roll-up
-- =====================================================================
-- Every view uses security_invoker so the caller's RLS still applies.
-- Nothing here stores derived numbers; they are always computed live.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Menu items with HPP + margin + health band
--   hpp        = sum(qty * price) of the recipe
--   margin     = (sell_price - hpp) / sell_price
--   health     = 'green' (>=50%), 'amber' (35–50%), 'red' (<35%),
--                'none' when no recipe rows exist yet
-- ---------------------------------------------------------------------
create or replace view public.v_menu_items
with (security_invoker = true) as
select
  mi.id,
  mi.category_id,
  mc.name as category_name,
  mi.name,
  mi.description,
  mi.sell_price,
  mi.sort,
  coalesce(ing.hpp, 0)             as hpp,
  coalesce(ing.ingredient_count,0) as ingredient_count,
  case
    when coalesce(ing.ingredient_count, 0) = 0 then null
    when mi.sell_price > 0 then round((mi.sell_price - coalesce(ing.hpp,0)) / mi.sell_price, 4)
    else 0
  end as margin,
  case
    when coalesce(ing.ingredient_count, 0) = 0 then 'none'
    when mi.sell_price <= 0 then 'red'
    when (mi.sell_price - coalesce(ing.hpp,0)) / mi.sell_price >= 0.50 then 'green'
    when (mi.sell_price - coalesce(ing.hpp,0)) / mi.sell_price >= 0.35 then 'amber'
    else 'red'
  end as margin_health
from public.menu_items mi
join public.menu_categories mc on mc.id = mi.category_id
left join lateral (
  select sum(qty * price) as hpp, count(*) as ingredient_count
  from public.menu_ingredients where menu_item_id = mi.id
) ing on true;

-- ---------------------------------------------------------------------
-- Purchases with line total
-- ---------------------------------------------------------------------
create or replace view public.v_purchases
with (security_invoker = true) as
select
  p.*,
  (p.qty * p.unit_price) as total,
  to_char(p.purchase_date, 'YYYY-MM') as month_key,
  s.name as supplier_name
from public.purchases p
left join public.suppliers s on s.id = p.supplier_id;

-- ---------------------------------------------------------------------
-- Sales with total + sisa pembayaran
-- ---------------------------------------------------------------------
create or replace view public.v_sales
with (security_invoker = true) as
select
  s.*,
  (s.portions * s.price_per_portion) as total,
  case when s.status = 'Lunas' then 0
       else greatest(0, s.portions * s.price_per_portion - s.paid_amount) end as sisa,
  to_char(s.sale_date, 'YYYY-MM') as month_key,
  e.name as pic_name
from public.sales s
left join public.employees e on e.id = s.pic_employee_id;

-- ---------------------------------------------------------------------
-- Payroll with computed Gaji Dasar / Total Beban / Take Home Pay
--   dasar     = Harian ? daily_wage * days_worked : base_salary
--   beban     = dasar + allowance + bonus
--   take_home = beban - deduction
-- ---------------------------------------------------------------------
create or replace view public.v_payroll
with (security_invoker = true) as
select
  pr.*,
  e.name        as employee_name,
  e.position    as employee_position,
  e.department  as employee_department,
  e.salary_type,
  e.daily_wage,
  e.base_salary,
  case when e.salary_type = 'Harian' then e.daily_wage * pr.days_worked
       else e.base_salary end as base_pay,
  (case when e.salary_type = 'Harian' then e.daily_wage * pr.days_worked
        else e.base_salary end) + pr.allowance + pr.bonus as total_beban,
  (case when e.salary_type = 'Harian' then e.daily_wage * pr.days_worked
        else e.base_salary end) + pr.allowance + pr.bonus - pr.deduction as take_home,
  to_char(pr.period_month, 'YYYY-MM') as month_key
from public.payroll pr
join public.employees e on e.id = pr.employee_id;

-- ---------------------------------------------------------------------
-- Debts with sisa + automatic status
--   Lunas        : paid >= amount
--   Jatuh Tempo  : not paid off and due_date < today
--   Belum Lunas  : otherwise
-- ---------------------------------------------------------------------
create or replace view public.v_debts
with (security_invoker = true) as
select
  d.*,
  greatest(0, d.amount - d.paid_amount) as sisa,
  case
    when d.paid_amount >= d.amount then 'Lunas'
    when d.due_date is not null and d.due_date < current_date then 'Jatuh Tempo'
    else 'Belum Lunas'
  end as status
from public.debts d;

-- ---------------------------------------------------------------------
-- Petty cash entries with running Saldo (opening balance + net flow)
-- ---------------------------------------------------------------------
create or replace view public.v_petty_cash_entries
with (security_invoker = true) as
select
  e.*,
  pp.period_month,
  pp.opening_balance,
  pp.is_settled,
  pp.opening_balance + sum(e.cash_in - e.cash_out) over (
    partition by e.period_id
    order by e.entry_date, e.sort, e.created_at
    rows between unbounded preceding and current row
  ) as running_balance
from public.petty_cash_entries e
join public.petty_cash_periods pp on pp.id = e.period_id;

-- ---------------------------------------------------------------------
-- Assets with straight-line depreciation (as of current_date)
--   dep_per_month = (cost - residual) / life
--   months_elapsed = whole months since acquisition (capped at life)
--   accumulated    = dep_per_month * months_elapsed
--   book_value     = cost - accumulated
-- ---------------------------------------------------------------------
create or replace view public.v_assets
with (security_invoker = true) as
select
  a.*,
  round((a.acquisition_cost - a.residual_value) / a.economic_life_months, 2) as dep_per_month,
  least(
    a.economic_life_months,
    greatest(0,
      (extract(year from age(current_date, a.acquisition_date)) * 12
        + extract(month from age(current_date, a.acquisition_date)))::int)
  ) as months_elapsed,
  round((a.acquisition_cost - a.residual_value) / a.economic_life_months
    * least(
        a.economic_life_months,
        greatest(0,
          (extract(year from age(current_date, a.acquisition_date)) * 12
            + extract(month from age(current_date, a.acquisition_date)))::int)
      ), 2) as accumulated_depreciation,
  a.acquisition_cost - round((a.acquisition_cost - a.residual_value) / a.economic_life_months
    * least(
        a.economic_life_months,
        greatest(0,
          (extract(year from age(current_date, a.acquisition_date)) * 12
            + extract(month from age(current_date, a.acquisition_date)))::int)
      ), 2) as book_value
from public.assets a;

-- ---------------------------------------------------------------------
-- P&L roll-up: one row per month (1..12) for a given year.
-- Rolls up sales, purchases (HPP), payroll, opex by category, and
-- straight-line asset depreciation active in that month.
-- ---------------------------------------------------------------------
create or replace function public.get_pnl(p_year int)
returns table (
  month_no          int,
  pendapatan        numeric,
  hpp               numeric,
  laba_kotor        numeric,
  margin_kotor      numeric,
  beban_gaji        numeric,
  beban_sewa        numeric,
  beban_listrik     numeric,
  beban_transport   numeric,
  beban_marketing   numeric,
  beban_lain        numeric,
  beban_depresiasi  numeric,
  total_beban_operasional numeric,
  laba_bersih       numeric,
  margin_bersih     numeric
)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  m           int;
  m_start     date;
  m_end       date;
  v_rev       numeric;
  v_hpp       numeric;
  v_gross     numeric;
  v_gaji      numeric;
  v_sewa      numeric;
  v_listrik   numeric;
  v_trans     numeric;
  v_mkt       numeric;
  v_lain      numeric;
  v_dep       numeric;
  v_opex      numeric;
  v_net       numeric;
begin
  for m in 1..12 loop
    m_start := make_date(p_year, m, 1);
    m_end   := (m_start + interval '1 month')::date;

    select coalesce(sum(portions * price_per_portion), 0) into v_rev
      from public.sales where sale_date >= m_start and sale_date < m_end;

    select coalesce(sum(qty * unit_price), 0) into v_hpp
      from public.purchases where purchase_date >= m_start and purchase_date < m_end;

    select coalesce(sum(
      (case when e.salary_type = 'Harian' then e.daily_wage * pr.days_worked
            else e.base_salary end) + pr.allowance + pr.bonus
    ), 0) into v_gaji
      from public.payroll pr
      join public.employees e on e.id = pr.employee_id
      where pr.period_month = m_start;

    -- Opex bucketed by keyword in the category label.
    select
      coalesce(sum(amount) filter (where category ilike '%sewa%'), 0),
      coalesce(sum(amount) filter (where category ilike '%listrik%' or category ilike '%air%' or category ilike '%gas%'), 0),
      coalesce(sum(amount) filter (where category ilike '%transport%' or category ilike '%kirim%'), 0),
      coalesce(sum(amount) filter (where category ilike '%marketing%' or category ilike '%promosi%'), 0),
      coalesce(sum(amount) filter (where
        category not ilike '%sewa%'
        and category not ilike '%listrik%' and category not ilike '%air%' and category not ilike '%gas%'
        and category not ilike '%transport%' and category not ilike '%kirim%'
        and category not ilike '%marketing%' and category not ilike '%promosi%'), 0)
      into v_sewa, v_listrik, v_trans, v_mkt, v_lain
      from public.operational_costs
      where cost_date >= m_start and cost_date < m_end;

    -- Depreciation for assets active in this month.
    select coalesce(sum(
      round((acquisition_cost - residual_value) / economic_life_months, 2)
    ), 0) into v_dep
      from public.assets
      where (extract(year from m_start) - extract(year from acquisition_date)) * 12
          + (extract(month from m_start) - extract(month from acquisition_date))
          between 0 and economic_life_months - 1;

    v_gross := v_rev - v_hpp;
    v_opex  := v_gaji + v_sewa + v_listrik + v_trans + v_mkt + v_lain + v_dep;
    v_net   := v_gross - v_opex;

    month_no                := m;
    pendapatan              := v_rev;
    hpp                     := v_hpp;
    laba_kotor              := v_gross;
    margin_kotor            := case when v_rev > 0 then round(v_gross / v_rev, 4) else 0 end;
    beban_gaji              := v_gaji;
    beban_sewa              := v_sewa;
    beban_listrik           := v_listrik;
    beban_transport         := v_trans;
    beban_marketing         := v_mkt;
    beban_lain              := v_lain;
    beban_depresiasi        := v_dep;
    total_beban_operasional := v_opex;
    laba_bersih             := v_net;
    margin_bersih           := case when v_rev > 0 then round(v_net / v_rev, 4) else 0 end;
    return next;
  end loop;
end;
$$;

grant execute on function public.get_pnl(int) to authenticated;

-- >>>>>>>>>> FILE: supabase/migrations/0004_storage_seed.sql >>>>>>>>>>

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
