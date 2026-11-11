-- =====================================================================
-- Catering Berkah 1121 — Platform Operasi
-- Migration 0009: Persisted bank mutations (Rekonsiliasi Bank)
-- =====================================================================
-- Stores every line of an uploaded BCA statement in the system so the
-- reconciliation survives reloads / other devices and unrecorded rows stay
-- until acted on. The bank statement is the authoritative cash record.
--   read:  every authenticated user (like the rest of the ledger)
--   write: has_module('rekonsiliasi')
-- =====================================================================

create table if not exists public.bank_transactions (
  id               uuid primary key default gen_random_uuid(),
  txn_date         date not null,                               -- tanggal mutasi
  description      text not null default '',                    -- keterangan
  direction        text not null check (direction in ('in', 'out')),
  amount           numeric(14,2) not null default 0,            -- selalu positif
  balance          numeric(14,2),                               -- saldo berjalan dari statement
  month_key        text not null,                               -- YYYY-MM (diisi aplikasi dari txn_date)
  source           text,                                        -- nama file / 'tempel'
  account_last4    text,                                        -- 4 digit akhir rekening (tampilan)
  dedup_key        text not null unique,                        -- cegah duplikat saat unggah ulang
  recorded         boolean not null default false,              -- sudah di-"Catat" ke sistem
  recorded_cost_id uuid references public.operational_costs(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists bank_transactions_month_idx on public.bank_transactions(month_key);

drop trigger if exists bank_transactions_set_updated_at on public.bank_transactions;
create trigger bank_transactions_set_updated_at
  before update on public.bank_transactions
  for each row execute function public.set_updated_at();

alter table public.bank_transactions enable row level security;

grant select, insert, update, delete on public.bank_transactions to authenticated;

drop policy if exists bank_transactions_select on public.bank_transactions;
drop policy if exists bank_transactions_insert on public.bank_transactions;
drop policy if exists bank_transactions_update on public.bank_transactions;
drop policy if exists bank_transactions_delete on public.bank_transactions;

create policy bank_transactions_select on public.bank_transactions
  for select to authenticated using (true);
create policy bank_transactions_insert on public.bank_transactions
  for insert to authenticated with check (public.has_module('rekonsiliasi'));
create policy bank_transactions_update on public.bank_transactions
  for update to authenticated
  using (public.has_module('rekonsiliasi')) with check (public.has_module('rekonsiliasi'));
create policy bank_transactions_delete on public.bank_transactions
  for delete to authenticated using (public.has_module('rekonsiliasi'));
