-- =====================================================================
-- Catering Berkah 1121 — Platform Operasi
-- Migration 0010: Per-month bank statement summary (Rekonsiliasi Bank)
-- =====================================================================
-- Stores the official statement figures (opening/closing + totals) per month
-- in the system so the Dashboard shows the real bank numbers on every device,
-- not only the browser that uploaded the statement.
--   read:  every authenticated user
--   write: has_module('rekonsiliasi')
-- =====================================================================

create table if not exists public.bank_statements (
  id            uuid primary key default gen_random_uuid(),
  month_key     text not null unique,                 -- YYYY-MM
  opening       numeric(16,2) not null default 0,
  closing       numeric(16,2) not null default 0,
  total_in      numeric(16,2) not null default 0,
  total_out     numeric(16,2) not null default 0,
  in_count      int,
  out_count     int,
  account_last4 text,
  source        text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists bank_statements_set_updated_at on public.bank_statements;
create trigger bank_statements_set_updated_at
  before update on public.bank_statements
  for each row execute function public.set_updated_at();

alter table public.bank_statements enable row level security;

grant select, insert, update, delete on public.bank_statements to authenticated;

drop policy if exists bank_statements_select on public.bank_statements;
drop policy if exists bank_statements_insert on public.bank_statements;
drop policy if exists bank_statements_update on public.bank_statements;
drop policy if exists bank_statements_delete on public.bank_statements;

create policy bank_statements_select on public.bank_statements
  for select to authenticated using (true);
create policy bank_statements_insert on public.bank_statements
  for insert to authenticated with check (public.has_module('rekonsiliasi'));
create policy bank_statements_update on public.bank_statements
  for update to authenticated
  using (public.has_module('rekonsiliasi')) with check (public.has_module('rekonsiliasi'));
create policy bank_statements_delete on public.bank_statements
  for delete to authenticated using (public.has_module('rekonsiliasi'));
