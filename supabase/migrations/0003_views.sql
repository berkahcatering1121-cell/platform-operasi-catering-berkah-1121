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
