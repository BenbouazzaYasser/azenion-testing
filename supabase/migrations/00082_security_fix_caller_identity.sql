-- Security remediation: pin caller identity to auth.uid() for non-service callers.
--
-- The latest security audit confirmed two remaining identity-parameter findings
-- in the same class as the feed RPCs fixed in 00061 (C1) and the get_unread_counts
-- IDOR fixed in 00081:
--
--   1. search_users(p_query, p_limit, p_viewer)
--      The p_viewer parameter was used verbatim: v_uid := coalesce(p_viewer, auth.uid()).
--      Any caller (including anon) could pass an arbitrary viewer id and run the
--      search with another user's block list — leaking block relationships and
--      bypassing the caller's own block filters.
--
--   2. record_post_view(p_post_id, p_viewer_id, p_session_token)
--      The p_viewer_id parameter was inserted verbatim into post_views. Any
--      authenticated caller could attribute a view to an arbitrary user.
--
-- Both now honor a client-supplied identity only for service_role / supabase_admin
-- (the app calls record_post_view via the service-role admin client with a
-- server-derived viewer id). For every other caller the identity is pinned to
-- auth.uid(). Grants are unchanged; create or replace preserves existing grants.

-- ── 1. search_users ─────────────────────────────────────────────────────────

create or replace function public.search_users(
  p_query text default null,
  p_limit int default 20,
  p_viewer uuid default null
)
returns table (
  id uuid,
  username text,
  full_name text,
  institution text,
  avatar_url text,
  created_at timestamptz
)
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_uid uuid := case
    when coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
      then coalesce(p_viewer, auth.uid())
    else auth.uid()
  end;
  v_needle text := trim(coalesce(p_query, ''));
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 50);
begin
  return query
  select
    p.id,
    p.username,
    p.full_name,
    p.institution,
    p.avatar_url,
    p.created_at
  from public.profiles p
  left join public.user_settings us on us.user_id = p.id
  where
    (
      v_needle = ''
      or p.full_name ilike '%' || v_needle || '%'
      or p.username ilike '%' || v_needle || '%'
    )
    and coalesce(us.privacy->>'search_visibility', 'true')::boolean
    and not exists (
      select 1 from public.user_blocks ub
      where ub.blocker_id = v_uid and ub.blocked_id = p.id
    )
    and not exists (
      select 1 from public.user_blocks ub
      where ub.blocker_id = p.id and ub.blocked_id = v_uid
    )
  order by
    case when v_needle <> '' then
      case
        when p.username ilike v_needle or p.full_name ilike v_needle then 0
        when p.username ilike v_needle || '%' or p.full_name ilike v_needle || '%' then 1
        else 2
      end
    else 1 end,
    p.created_at desc
  limit v_limit;
end;
$$;

-- ── 2. record_post_view ─────────────────────────────────────────────────────

create or replace function public.record_post_view(
  p_post_id uuid,
  p_viewer_id uuid default null,
  p_session_token text default null
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_viewer_id uuid := case
    when coalesce(auth.role(), '') in ('service_role', 'supabase_admin')
      then p_viewer_id
    else auth.uid()
  end;
begin
  insert into public.post_views (post_id, viewer_id, session_token)
  values (p_post_id, v_viewer_id, p_session_token)
  on conflict do nothing;
  return found;
end;
$$;