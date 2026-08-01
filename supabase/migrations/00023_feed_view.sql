-- Migration: 00023_feed_view
--
-- Creates a unified feed view that aggregates project updates, team updates,
-- and platform activities into a single queryable shape.
-- New content types (hackathons, achievements, events) can be added as
-- additional UNION ALL branches.

-- ── Feed items view ─────────────────────────────────────────────────────

create or replace view public.feed_items as

-- Project updates
select
  pu.id as id,
  'project_update'::text as source_type,
  pu.id as source_id,
  pu.author_id,
  p.name as group_name,
  pu.project_id as group_id,
  pu.title,
  pu.body,
  pu.image_url,
  pu.created_at
from public.project_updates pu
join public.projects p on p.id = pu.project_id

union all

-- Team updates
select
  tu.id as id,
  'team_update'::text as source_type,
  tu.id as source_id,
  tu.author_id,
  t.name as group_name,
  tu.team_id as group_id,
  tu.title,
  tu.body,
  tu.image_url,
  tu.created_at
from public.team_updates tu
join public.teams t on t.id = tu.team_id

union all

-- Platform activities (gives the feed life)
select
  a.id as id,
  'activity'::text as source_type,
  a.id as source_id,
  a.user_id as author_id,
  null::text as group_name,
  null::uuid as group_id,
  case
    when a.type = 'created_project' then 'created ' || (a.metadata->>'project_name')
    when a.type = 'created_team' then 'created ' || (a.metadata->>'team_name')
    when a.type = 'joined_branch' then 'joined ' || (a.metadata->>'branch_name')
    when a.type = 'created_branch' then 'created ' || (a.metadata->>'branch_name')
    when a.type = 'created_project_update' then 'posted an update in ' || (a.metadata->>'project_name')
    when a.type = 'created_team_update' then 'posted an update in ' || (a.metadata->>'team_name')
    else a.type
  end as title,
  null::text as body,
  null::text as image_url,
  a.created_at
from public.activities a
where a.type not like 'deleted_%';

grant select on public.feed_items to anon, authenticated, service_role;
