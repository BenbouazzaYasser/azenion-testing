-- Migration: 00151_branch_feed_source_ids_and_counts
--
-- Follow-up to the round-trip / DB-efficiency audit — the parts that needed SQL
-- rather than TypeScript:
--
--   1. get_branch_feed_source_ids()  — derive a branch's feed source ids in
--      SQL (announcements + highlights + team updates of the branch's teams +
--      project updates of those teams' projects).
--   2. get_branch_feed_posts_by_branch() / count_branch_feed_posts_by_branch()
--      — same predicate, ordering and pin semantics as the existing
--      get_branch_feed_posts / count_branch_feed_posts, but they no longer
--      require the caller to ship every source id. Removes 6 ID queries per
--      branch-feed request.
--   3. admin_count_verification_requests() — real COUNT for the admin queue
--      instead of fetching the full table to read .length.
--   4. get_project_technology_facets() — aggregated technology list for the
--      projects catalog filter chips (no 1000-row JS scan, no silent
--      truncation past 1000 projects).
--
-- Existing functions are left untouched so a not-yet-migrated deploy keeps
-- working; the application falls back to the old calls when these are absent.
--
-- Authorization is preserved exactly:
--   * feed visibility still flows through is_feed_post_visible (00146 version
--     is the one in force; this only replaces the id-collection step),
--   * the admin count keeps the same is_platform_admin() guard and the same
--     'Only platform admins can view verification requests' exception,
--   * grants mirror the functions each new RPC replaces.

-- ── 1. Branch feed source ids ────────────────────────────────────────────────

create or replace function public.get_branch_feed_source_ids(p_branch_id uuid)
returns uuid[]
language sql
security definer set search_path = public
stable
as $$
  select array_agg(distinct src.id)
  from (
    select ba.id
    from public.branch_announcements ba
    where ba.branch_id = p_branch_id
    union all
    select bh.id
    from public.branch_highlights bh
    where bh.branch_id = p_branch_id
    union all
    select tu.id
    from public.team_updates tu
    join public.teams t on t.id = tu.team_id
    where t.branch_id = p_branch_id
    union all
    select pu.id
    from public.project_updates pu
    join public.projects p on p.id = pu.project_id
    join public.teams t on t.id = p.team_id
    where t.branch_id = p_branch_id
  ) src;
$$;

revoke execute on function public.get_branch_feed_source_ids(uuid) from public;
revoke execute on function public.get_branch_feed_source_ids(uuid) from anon;
grant execute on function public.get_branch_feed_source_ids(uuid) to authenticated, service_role;

-- ── 2. Branch feed page + total without caller-supplied ids ──────────────────

create or replace function public.get_branch_feed_posts_by_branch(
  p_branch_id uuid,
  p_page int default 1,
  p_page_size int default 20,
  p_viewer uuid default null
)
returns setof public.posts
language sql
security definer set search_path = public
stable
as $$
  select p.*
  from public.posts p
  where p.source_id = any(public.get_branch_feed_source_ids(p_branch_id))
    and public.is_feed_post_visible(p.source_type, p.source_id, p_viewer)
  order by
    (exists (
      select 1 from public.feed_pins fp
      where fp.post_id = p.id
        and fp.scope = 'branch'
        and fp.branch_id = p_branch_id
    )) desc,
    p.created_at desc
  limit p_page_size
  offset (p_page - 1) * p_page_size;
$$;

grant execute on function public.get_branch_feed_posts_by_branch(uuid, int, int, uuid)
  to anon, authenticated, service_role;

create or replace function public.count_branch_feed_posts_by_branch(
  p_branch_id uuid,
  p_viewer uuid default null
)
returns bigint
language sql
security definer set search_path = public
stable
as $$
  select count(*)::bigint
  from public.posts p
  where p.source_id = any(public.get_branch_feed_source_ids(p_branch_id))
    and public.is_feed_post_visible(p.source_type, p.source_id, p_viewer);
$$;

grant execute on function public.count_branch_feed_posts_by_branch(uuid, uuid)
  to anon, authenticated, service_role;

-- ── 3. Verification request count ────────────────────────────────────────────

create or replace function public.admin_count_verification_requests(
  p_status text default null
)
returns bigint
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_total bigint;
begin
  if not public.is_platform_admin() then
    raise exception 'Only platform admins can view verification requests';
  end if;

  select count(*)::bigint
  into v_total
  from public.instructor_verification_requests ivr
  join public.profiles p on p.id = ivr.user_id
  where (p_status is null or ivr.status = p_status);

  return v_total;
end;
$$;

grant execute on function public.admin_count_verification_requests(text)
  to authenticated, service_role;

-- ── 4. Project technology facets (catalog filter chips) ──────────────────────

create or replace function public.get_project_technology_facets()
returns text[]
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    array_agg(distinct tech order by tech),
    '{}'::text[]
  )
  from public.projects p
  cross join lateral unnest(coalesce(p.technologies, '{}'::text[])) as tech
  where p.visibility = 'open';
$$;

grant execute on function public.get_project_technology_facets()
  to anon, authenticated, service_role;
