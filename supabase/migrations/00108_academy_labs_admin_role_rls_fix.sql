-- Migration: 00108_academy_labs_admin_role_rls_fix
--
-- 00107 fixed is_lab_creator() to recognize core_team_member, but an
-- automated RLS-level test run after that fix found a second, separate
-- gap: every other admin-facing Labs RLS policy still calls the raw
-- is_platform_admin() RPC directly, which -- unlike is_lab_creator(),
-- which goes through has_platform_role() -- only recognizes a row in
-- public.platform_admins and NOT the 'platform_admin' role in
-- user_roles (the representation /admin/roles actually grants). A
-- direct test confirmed a role-based admin could update a table-based
-- admin's test data but could not update a lab they didn't create when
-- querying through the regular (RLS-respecting) client -- exactly the
-- kind of drift this audit exists to close, now that it's verified
-- rather than theoretical.
--
-- In practice, every Labs server action uses the service-role client for
-- writes (bypassing RLS entirely) and already recognizes both admin
-- representations via lib/labs/authorization.ts, so this had no observed
-- effect on the app's actual behavior. But RLS should reflect the real,
-- intended access rules regardless of which client is used, and reads in
-- particular (e.g. "platform admins can read all labs") could plausibly
-- be relied on directly by a future code path.
--
-- This only swaps is_platform_admin() for has_platform_role('platform_admin')
-- inside six existing policies -- it does not change what any policy is
-- for, does not touch is_platform_admin() or has_platform_role()
-- themselves, and does not touch any policy unrelated to admin access.
-- Policies are dropped and recreated (the standard way to alter a
-- policy's condition, matching the pattern already used in this codebase
-- for course policies), so this is safe to run against the existing,
-- already-populated tables.

-- ── labs ─────────────────────────────────────────────────────────────────

drop policy if exists "platform admins can read all labs" on public.labs;
create policy "platform admins can read all labs"
  on public.labs for select using (public.has_platform_role('platform_admin'));

drop policy if exists "platform admins can update any lab" on public.labs;
create policy "platform admins can update any lab"
  on public.labs for update using (public.has_platform_role('platform_admin'));

drop policy if exists "platform admins can delete any lab" on public.labs;
create policy "platform admins can delete any lab"
  on public.labs for delete using (public.has_platform_role('platform_admin'));

-- ── lab_versions ─────────────────────────────────────────────────────────

drop policy if exists "platform admins can read all lab versions" on public.lab_versions;
create policy "platform admins can read all lab versions"
  on public.lab_versions for select using (public.has_platform_role('platform_admin'));

-- ── lab_submissions ──────────────────────────────────────────────────────

drop policy if exists "instructors can read submissions for their labs" on public.lab_submissions;
create policy "instructors can read submissions for their labs"
  on public.lab_submissions for select
  using (
    exists (
      select 1 from public.labs
      where id = lab_submissions.lab_id
        and (created_by = auth.uid() or public.has_platform_role('platform_admin'))
    )
  );

drop policy if exists "instructors can update submissions (grading)" on public.lab_submissions;
create policy "instructors can update submissions (grading)"
  on public.lab_submissions for update
  using (
    public.has_platform_role('platform_admin')
    or exists (
      select 1 from public.labs
      where id = lab_id and created_by = auth.uid()
    )
  );
