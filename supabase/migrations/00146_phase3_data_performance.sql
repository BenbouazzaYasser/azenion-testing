-- Migration: 00146_phase3_data_performance
--
-- Phase 3 of the consolidated audit (data-layer performance).
--
-- P1: batch visibility RPC. getSavedFeedItems ran is_feed_post_visible once
--     per saved post (N+1 round trips). The batch wrapper delegates to the
--     same audited predicate, so there is exactly one visibility rule.
-- P8: trigram GIN indexes for every ilike '%q%' search column (zero existed),
--     an expression index for the project activity lookup, and composite
--     indexes matching the (foreign key, created_at) sort patterns.

-- ── 1. Batch visibility check (P1) ────────────────────────────────────────

create or replace function public.is_feed_post_visible_batch(
  p_source_types text[],
  p_source_ids uuid[],
  p_user_id uuid default null
)
returns boolean[]
language plpgsql
security definer set search_path = public
stable
as $$
begin
  if coalesce(array_length(p_source_types, 1), 0)
     <> coalesce(array_length(p_source_ids, 1), 0) then
    raise exception 'is_feed_post_visible_batch: array length mismatch';
  end if;

  -- Delegates to the single audited predicate so visibility rules can never
  -- drift between the scalar and batch paths. Order is preserved.
  return array(
    select public.is_feed_post_visible(p_source_types[i], p_source_ids[i], p_user_id)
    from generate_subscripts(p_source_ids, 1) as i
  );
end;
$$;

-- Read-only, same surface as the scalar function (default PUBLIC execute).

-- ── 2. Trigram GIN indexes for ilike '%q%' search (P8) ───────────────────

create extension if not exists pg_trgm;

create index if not exists idx_teams_name_trgm
  on public.teams using gin (name gin_trgm_ops);
create index if not exists idx_projects_name_trgm
  on public.projects using gin (name gin_trgm_ops);
create index if not exists idx_branches_name_trgm
  on public.branches using gin (name gin_trgm_ops);
create index if not exists idx_branches_full_name_trgm
  on public.branches using gin (full_name gin_trgm_ops);
create index if not exists idx_posts_title_trgm
  on public.posts using gin (title gin_trgm_ops);
create index if not exists idx_posts_body_trgm
  on public.posts using gin (body gin_trgm_ops);
create index if not exists idx_live_sessions_title_trgm
  on public.live_sessions using gin (title gin_trgm_ops);
create index if not exists idx_platform_announcements_title_trgm
  on public.platform_announcements using gin (title gin_trgm_ops);
create index if not exists idx_profiles_full_name_trgm
  on public.profiles using gin (full_name gin_trgm_ops);
create index if not exists idx_profiles_username_trgm
  on public.profiles using gin (username gin_trgm_ops);

-- ── 3. Expression + composite indexes (P8) ────────────────────────────────

-- projects/[slug] page filters activities by metadata->>'project_id'.
create index if not exists idx_activities_metadata_project_id
  on public.activities ((metadata->>'project_id'))
  where metadata->>'project_id' is not null;

-- Channel history: newest-window reads per channel (00100 has only singles).
create index if not exists idx_channel_messages_channel_created
  on public.channel_messages (channel_id, created_at);

-- Update lists sorted by (owner, newest first) (00020/00018 have only singles).
create index if not exists idx_team_updates_team_created
  on public.team_updates (team_id, created_at desc);
create index if not exists idx_project_updates_project_created
  on public.project_updates (project_id, created_at desc);

-- ── End of migration ──────────────────────────────────────────────────────
