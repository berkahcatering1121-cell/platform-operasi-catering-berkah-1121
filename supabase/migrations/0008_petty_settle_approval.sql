-- =====================================================================
-- 0008 — Approval settle Petty Cash (khusus Super Admin / tim Finance)
-- =====================================================================
-- Hanya Super Admin (Departemen Keuangan) atau pengguna yang ditunjuk
-- (profiles.can_settle = true) yang boleh mengubah status settle periode
-- kas kecil. Pengguna lain tetap bisa mengisi periode & transaksi.

alter table public.profiles
  add column if not exists can_settle boolean not null default false;

comment on column public.profiles.can_settle is
  'Boleh meng-approve/ubah status settle Petty Cash (tim Finance). Super Admin selalu boleh.';

-- Approver check (SECURITY DEFINER agar bisa membaca profiles saat RLS aktif).
create or replace function public.can_settle()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select public.is_super_admin()
      or coalesce((select can_settle from public.profiles where id = auth.uid()), false);
$$;

-- Cegah perubahan is_settled oleh non-approver (jaring pengaman di database).
create or replace function public.enforce_settle_approval()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and new.is_settled is distinct from old.is_settled and not public.can_settle() then
    raise exception 'Hanya Super Admin / tim Finance yang dapat mengubah status settle.';
  end if;
  if tg_op = 'INSERT' and new.is_settled = true and not public.can_settle() then
    raise exception 'Hanya Super Admin / tim Finance yang dapat menandai settle.';
  end if;
  return new;
end $$;

drop trigger if exists petty_settle_guard on public.petty_cash_periods;
create trigger petty_settle_guard
  before insert or update on public.petty_cash_periods
  for each row execute function public.enforce_settle_approval();
