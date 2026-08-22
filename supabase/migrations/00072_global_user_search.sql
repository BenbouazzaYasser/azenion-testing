-- Migration: 00072_global_user_search
--
-- Lets the global search palette discover other members by name or username.
--
-- PROBLEM
--   `profiles` RLS ("users can read own profile", see 00004_rls_fix.sql) means
--   a PostgREST query against `profiles` from an authenticated session can only
--   ever return the caller's own row. The search bar's "Users" group therefore
--   never surfaces other members.
--
-- FIX
--   A SECURITY DEFINER RPC (the established pattern for RLS-bypassing reads in
--   this project, e.g. 00039_session_requests_getters / 00071_user_blocks):
--     * searches `profiles` by full_name / username (case-insensitive),
--     * honors each user's privacy preference
--       `user_settings.privacy.search_visibility` (defaults to true),
--     * hides people the caller has blocked, and people who have blocked the
--       caller (neither is a valid conversation partner), and
--     * never exposes email addresses or other private columns.
--   For anonymous callers the block filters are skipped (no identity to check).

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
  v_uid uuid := coalesce(p_viewer, auth.uid());
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

grant execute on function public.search_users(text, int, uuid)
  to anon, authenticated, service_role;

comment on function public.search_users(text, int, uuid) is
  'Case-insensitive member lookup by full_name/username honoring search_visibility '
  'and both directions of user_blocks. Returns only non-private profile columns.';
