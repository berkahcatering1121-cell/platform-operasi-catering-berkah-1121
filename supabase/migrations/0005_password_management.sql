-- =====================================================================
-- 0005 — Password management (temp password + forced first-login change)
-- =====================================================================
-- New users get a random temporary password. On first login they are forced
-- to choose their own. The chosen password is also stored (readable) so a
-- Super Admin can view it in Manajemen Pengguna.
--
-- NOTE: `visible_password` keeps the password in readable form on purpose,
-- per the business requirement that a Super Admin can see each user's current
-- password. It is only ever exposed through the profiles RLS (own row, or
-- Super Admin) — never to other regular users.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false,
  add column if not exists visible_password     text;

comment on column public.profiles.must_change_password is
  'When true, the user must set a new password before using the app (first-login flow).';
comment on column public.profiles.visible_password is
  'Current password in readable form, visible to Super Admin only (business requirement).';
