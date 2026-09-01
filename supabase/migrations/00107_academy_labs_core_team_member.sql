-- Migration: 00107_academy_labs_core_team_member
--
-- Brings the database-level Labs authorization gate in line with the
-- application-level one. During this audit, academy-labs.actions.ts and
-- app/academy/labs/page.tsx were updated so core_team_member can create
-- and manage their own labs (in addition to instructor/creator/platform
-- admin) -- matching the platform's intended authorization model. The
-- SQL-level is_lab_creator() RPC, which the labs table's RLS policies
-- rely on, still only checked instructor/creator/admin. This left the
-- database-level gate stricter than the application-level one.
--
-- In practice every Labs write today goes through the service-role
-- client (which bypasses RLS entirely), so this inconsistency has no
-- observed functional impact -- but leaving the database-level model out
-- of sync with the intended one is exactly the kind of drift this audit
-- was meant to close, and RLS should reflect the real intended access
-- rules regardless of which client happens to be used today.
--
-- This does not touch is_platform_admin() or has_platform_role() -- those
-- are shared, platform-wide functions used well beyond Labs, and were
-- intentionally left alone (see the audit report for why the deeper
-- auth.uid()-default-parameter question wasn't addressed at this level).
-- This migration only changes what counts as a "lab creator" for Labs'
-- own RLS policies, via the same create-or-replace pattern already used
-- elsewhere in this codebase (e.g. 00100b, 00101).

create or replace function public.is_lab_creator()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_platform_admin()
     or public.has_platform_role('instructor')
     or public.has_platform_role('creator')
     or public.has_platform_role('core_team_member');
$$;
