-- Migration: 00122_fix_role_oracle_functions
-- (renumbered from PR #31's 00117; 00117 is taken by 00117_google_oauth on main.
-- Original author: Ayoub Elouafi; resolved onto current main.)
--
-- Security audit bug #3: close the anonymous / arbitrary-user "role oracle"
-- on six public SECURITY DEFINER helpers.
--
-- Prior state: every helper below carried the implicit PUBLIC EXECUTE granted
-- by CREATE FUNCTION (plus explicit grants to anon, authenticated and
-- service_role). Any caller -- including anonymous -- could pass an arbitrary
-- p_user_id and probe whether another user holds a privileged platform role,
-- team ownership / permission, or branch leadership.
--
-- This migration:
--   1. revokes the implicit PUBLIC grant on all six signatures (the gap that
--      00116 left when it revoked only anon/authenticated from
--      delete_storage_prefix -- revoking from PUBLIC is required);
--   2. pins has_platform_role / has_team_permission / is_branch_leader to the
--      caller's identity (auth.uid()) unless the call comes from
--      service_role / supabase_admin -- the same pattern as the C1 fix in
--      00061_security_hardening.sql (is_feed_post_visible);
--   3. revokes direct EXECUTE from anon / authenticated where the caller and
--      RLS audit confirmed there is no legitimate client path.
--
-- No function signatures change, no application code changes are required,
-- and no public-table RLS policies are modified. The separate table-visibility
-- question (platform_admins / user_roles / branch_leaders are intentionally
-- publicly readable) is out of scope for this migration.
--
-- Verified against prod (2026-09-06) before renumber:
--   - prod has PUBLIC EXECUTE on has_platform_role, is_branch_leader and both
--     is_platform_admin overloads -> oracle still open, fix still needed.
--   - no live RLS policy and no function body on prod references
--     is_team_leader -> service_role-only restriction is safe.
--   - prod policy "platform admins can read all labs" calls
--     has_platform_role('platform_admin') for anon reads -> anon EXECUTE kept.

-- 1) is_platform_admin(p_user_id uuid) -- arbitrary-user oracle.
--    The only caller is has_platform_role() (SECURITY DEFINER, owner context),
--    which needs no grant on this function. No app callers, no RLS policies.
--    Drop PUBLIC, anon and authenticated; keep service_role for admin tooling.
revoke execute on function public.is_platform_admin(uuid) from public;
revoke execute on function public.is_platform_admin(uuid) from anon;
revoke execute on function public.is_platform_admin(uuid) from authenticated;
grant execute on function public.is_platform_admin(uuid) to service_role;

-- 2) is_platform_admin() -- self-only (auth.uid()), never an oracle.
--    Referenced by storage branch-assets RLS policies and by many SECURITY
--    DEFINER guards, and called by anonymous self-checks through client code.
--    Drop PUBLIC and re-assert the roles that legitimately evaluate it.
revoke execute on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to anon, authenticated, service_role;

-- 3) has_platform_role(text, uuid default auth.uid()) -- pin identity.
--    anon keeps EXECUTE because the 00108 RLS policies on labs / lab_versions
--    / lab_submissions are evaluated for anon reads (00104 grants anon SELECT
--    on those tables). Pinned, anon always evaluates against auth.uid() (= NULL
--    for anon) so the call can never return true for an arbitrary user.
create or replace function public.has_platform_role(
  p_role_name text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin(
      case when coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
           then p_user_id
           else auth.uid()
      end
    )
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = case when coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
                              then p_user_id
                              else auth.uid()
                         end
        and r.name = p_role_name
    );
$$;

revoke execute on function public.has_platform_role(text, uuid) from public;
grant execute on function public.has_platform_role(text, uuid) to anon, authenticated, service_role;

-- 4) has_team_permission(uuid, text, uuid default auth.uid()) -- pin identity.
--    authenticated is required by RLS policies on team_updates DML, team
--    join-request / invitation reads, storage team-updates uploads, and by
--    the server-action helper (lib/team-permissions.server.ts).
--    anon has no SELECT grant on the gated tables and no legitimate DML path,
--    so anon EXECUTE is revoked.
create or replace function public.has_team_permission(
  p_team_id uuid,
  p_permission text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin()
    or exists (
      select 1 from public.team_members
      where team_id = p_team_id
        and user_id = case when coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
                           then p_user_id
                           else auth.uid()
                      end
        and role = 'owner'
    )
    or exists (
      select 1
      from public.team_member_roles tmr
      join public.team_role_permissions trp on trp.role_id = tmr.role_id
      where tmr.team_id = p_team_id
        and tmr.member_id = case when coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
                                 then p_user_id
                                 else auth.uid()
                            end
        and trp.permission = p_permission
    );
$$;

revoke execute on function public.has_team_permission(uuid, text, uuid) from public;
revoke execute on function public.has_team_permission(uuid, text, uuid) from anon;
grant execute on function public.has_team_permission(uuid, text, uuid) to authenticated, service_role;

-- 5) is_branch_leader(uuid, uuid default auth.uid()) -- pin identity.
--    authenticated is required by branch DML + branch-assets storage RLS
--    policies and by the branch management action/page self-checks.
--    anon has no legitimate write path, so anon EXECUTE is revoked.
create or replace function public.is_branch_leader(
  p_branch_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.branch_leaders
    where branch_id = p_branch_id
      and user_id = case when coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
                         then p_user_id
                         else auth.uid()
                    end
  );
$$;

revoke execute on function public.is_branch_leader(uuid, uuid) from public;
revoke execute on function public.is_branch_leader(uuid, uuid) from anon;
grant execute on function public.is_branch_leader(uuid, uuid) to authenticated, service_role;

-- 6) is_team_leader(uuid, uuid default auth.uid()) -- dead code.
--    Created in 00040; every caller (00040 / 00041 policies and RPCs) was
--    replaced by has_team_permission in 00042. No app callers, no RLS use.
--    Restrict EXECUTE to service_role only.
revoke execute on function public.is_team_leader(uuid, uuid) from public;
revoke execute on function public.is_team_leader(uuid, uuid) from anon;
revoke execute on function public.is_team_leader(uuid, uuid) from authenticated;
grant execute on function public.is_team_leader(uuid, uuid) to service_role;
