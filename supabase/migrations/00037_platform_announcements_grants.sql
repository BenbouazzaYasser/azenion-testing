-- ── Harden platform_announcements ───────────────────────────────────────────
-- Prevent direct SQL writes to public.platform_announcements.
-- All writes must go through the SECURITY DEFINER RPCs:
--   create_platform_announcement(...)
--   update_platform_announcement(...)
--   delete_platform_announcement(...)
-- which each re-check can_manage_announcements().
--
-- anon / authenticated keep SELECT (public read-only board).
-- service_role privileges are intentionally left untouched.

revoke insert, update, delete on public.platform_announcements from anon, authenticated;
