-- Migration: 00150_audit_perf_indexes_and_batch_rpcs
--
-- Follow-up to the round-trip / DB-efficiency audit:
--   1. Missing index on team_open_roles(team_id) (FK, queried per team page).
--   2. Missing visibility+created_at composites for the two hottest listing
--      queries (project/team catalog, sitemap, onboarding).
--   3. get_branch_member_counts() — single grouped count replacing full-table
--      branch_members scans in onboarding + branches/manage.
--   4. has_team_permissions() — batched wrapper around has_team_permission()
--      so team pages issue 1 RPC instead of 14. Delegates per-permission to
--      the existing function, so the authoritative answer is unchanged.
--
-- All additive: no existing object, policy, or grant is altered.

-- 1. team_open_roles(team_id) — table created in 00008 with no index.
create index if not exists idx_team_open_roles_team_id
  on public.team_open_roles(team_id);

-- 2. Listing composites (filter visibility + order created_at).
create index if not exists idx_projects_visibility_created_at
  on public.projects(visibility, created_at desc);
create index if not exists idx_teams_visibility_created_at
  on public.teams(visibility, created_at desc);

-- 3. Grouped branch member counts.
create or replace function public.get_branch_member_counts()
returns table (
  branch_id uuid,
  member_count bigint
)
language sql
security definer set search_path = public
stable
as $$
  select bm.branch_id, count(*)::bigint
  from public.branch_members bm
  group by bm.branch_id;
$$;

grant execute on function public.get_branch_member_counts()
  to anon, authenticated, service_role;

-- 4. Batched team-permission check. Same per-permission answer as
-- has_team_permission (owner + platform admin implicitly hold everything).
create or replace function public.has_team_permissions(
  p_team_id uuid,
  p_permissions text[]
)
returns table (
  permission text,
  has_permission boolean
)
language sql
security definer set search_path = public
stable
as $$
  select perm, public.has_team_permission(p_team_id, perm)
  from unnest(p_permissions) as perm;
$$;

revoke execute on function public.has_team_permissions(uuid, text[]) from public;
revoke execute on function public.has_team_permissions(uuid, text[]) from anon;
grant execute on function public.has_team_permissions(uuid, text[]) to authenticated, service_role;
