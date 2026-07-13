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
