-- =====================================================================
-- 0006 — Dashboard & P&L become revocable module permissions
-- =====================================================================
-- Previously Dashboard & P&L were implicitly visible to everyone. They are
-- now regular permission keys ('dashboard', 'pnl') that a Super Admin can
-- grant/revoke per user (e.g. kitchen staff don't need the Dashboard).
--
-- Backfill so existing users KEEP their current access (they had these two
-- implicitly). Super Admin ignores the modules array, so it's left untouched.

update public.profiles
set modules = array(select distinct m from unnest(modules || array['dashboard', 'pnl']) m)
where role <> 'Super Admin';
