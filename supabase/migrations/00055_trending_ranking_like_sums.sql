-- Migration: 00055_trending_ranking_like_sums
--
-- Bug fix for 00054:
--   get_trending_teams and get_featured_projects computed likes_count and
--   reactions_count with `count(lk.update_id)` / `count(cm.update_id)`, which
--   counts how many *distinct updates* received at least one like/comment —
--   not the total number of likes/comments. A team whose 3 posts each got
--   several likes was reported as likes_count = 3 regardless of magnitude.
--
-- Fix: sum the per-update counts (lk.cnt / cm.cnt) instead, cast to bigint to
--   match the declared return column types.
--
-- Only the two aggregate CTEs change; the functions are recreated in place.

create or replace function public.get_trending_teams(
  p_window_days int default 7,
  p_limit int default 12
)
returns table (
  id uuid,
  score numeric,
  posts_count bigint,
  likes_count bigint,
  members_count bigint
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_ws timestamptz := now() - make_interval(days => p_window_days);
  v_posts_w numeric   := (public.trending_weights()->>'team_posts')::numeric;
  v_likes_w numeric   := (public.trending_weights()->>'team_likes')::numeric;
  v_members_w numeric := (public.trending_weights()->>'team_members')::numeric;
begin
  return query
  with u as (
    select tu.id as update_id, tu.team_id as team_id
    from public.team_updates tu
    join public.posts p on p.source_type = 'team_update' and p.source_id = tu.id
    where p.created_at >= v_ws
  ),
  lk as (
    select l.target_id as update_id, count(*) as cnt
    from public.update_likes l
    where l.target_type = 'team_update'
      and l.target_id in (select update_id from u)
      and l.created_at >= v_ws
    group by l.target_id
  ),
  stats as (
    select u.team_id,
           count(*) as posts_count,
           coalesce(sum(lk.cnt), 0)::bigint as likes_count
    from u
    left join lk on lk.update_id = u.update_id
    group by u.team_id
  ),
  m as (
    select team_id, count(*) as members_count
    from public.team_members
    where joined_at >= v_ws
    group by team_id
  )
  select t.id,
         (coalesce(s.posts_count, 0) * v_posts_w
          + coalesce(s.likes_count, 0) * v_likes_w
          + coalesce(m.members_count, 0) * v_members_w) as score,
         coalesce(s.posts_count, 0),
         coalesce(s.likes_count, 0),
         coalesce(m.members_count, 0)
  from public.teams t
  left join stats s on s.team_id = t.id
  left join m on m.team_id = t.id
  where t.visibility = 'public'
    and (coalesce(s.posts_count, 0) + coalesce(s.likes_count, 0) + coalesce(m.members_count, 0)) > 0
  order by (coalesce(s.posts_count, 0) * v_posts_w
           + coalesce(s.likes_count, 0) * v_likes_w
           + coalesce(m.members_count, 0) * v_members_w) desc
  limit p_limit;
end;
$$;

create or replace function public.get_featured_projects(
  p_window_days int default 7,
  p_limit int default 12
)
returns table (
  id uuid,
  score numeric,
  likes_count bigint,
  updates_count bigint,
  reactions_count bigint
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_ws timestamptz := now() - make_interval(days => p_window_days);
  v_likes_w numeric  := (public.trending_weights()->>'project_likes')::numeric;
  v_updates_w numeric := (public.trending_weights()->>'project_updates')::numeric;
  v_reactions_w numeric := (public.trending_weights()->>'project_reactions')::numeric;
begin
  return query
  with u as (
    select pu.id as update_id, pu.project_id as project_id
    from public.project_updates pu
    join public.posts p on p.source_type = 'project_update' and p.source_id = pu.id
    where p.created_at >= v_ws
  ),
  lk as (
    select l.target_id as update_id, count(*) as cnt
    from public.update_likes l
    where l.target_type = 'project_update'
      and l.target_id in (select update_id from u)
      and l.created_at >= v_ws
    group by l.target_id
  ),
  cm as (
    select c.target_id as update_id, count(*) as cnt
    from public.update_comments c
    where c.target_type = 'project_update'
      and c.target_id in (select update_id from u)
      and c.created_at >= v_ws
    group by c.target_id
  ),
  stats as (
    select u.project_id,
           count(*) as updates_count,
           coalesce(sum(lk.cnt), 0)::bigint as likes_count,
           coalesce(sum(cm.cnt), 0)::bigint as reactions_count
    from u
    left join lk on lk.update_id = u.update_id
    left join cm on cm.update_id = u.update_id
    group by u.project_id
  )
  select
    s.project_id as id,
    (s.likes_count * v_likes_w
     + s.updates_count * v_updates_w
     + s.reactions_count * v_reactions_w) as score,
    s.likes_count,
    s.updates_count,
    s.reactions_count
  from stats s
  join public.projects pr on pr.id = s.project_id
  where pr.lifecycle_status is distinct from 'ARCHIVED'
  order by (s.likes_count * v_likes_w
           + s.updates_count * v_updates_w
           + s.reactions_count * v_reactions_w) desc,
           pr.created_at desc
  limit p_limit;
end;
$$;
