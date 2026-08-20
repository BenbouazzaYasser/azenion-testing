-- ── Session Requests: getters ───────────────────────────────────────────────
-- Read helpers for the session-request feature.
--
-- The live profiles RLS policy is "users can read own profile" (auth.uid() = id),
-- so PostgREST embeds of profiles hide other users' rows even from admins.
-- These SECURITY DEFINER getters join profiles/branches internally and are the
-- single source of request data for future pages:
--   * Profile  → "My Session Requests"  → get_my_session_requests()
--   * Admin    → "Session Requests"     → get_all_session_requests()
--
-- Each getter re-checks authorization itself:
--   * get_my_session_requests  filters by auth.uid() (never forgeable).
--   * get_all_session_requests raises unless can_manage_session_requests().

-- ── RPC: my session requests ────────────────────────────────────────────────
drop function if exists public.get_my_session_requests();
create or replace function public.get_my_session_requests()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  title text,
  description text,
  preferred_format text,
  preferred_branch_id uuid,
  status text,
  admin_notes text,
  branch_name text
)
language sql
security definer set search_path = public
stable
as $$
  select sr.id, sr.created_at, sr.updated_at, sr.user_id, sr.title, sr.description,
         sr.preferred_format, sr.preferred_branch_id, sr.status, sr.admin_notes,
         b.name as branch_name
  from public.session_requests sr
  left join public.branches b on b.id = sr.preferred_branch_id
  where sr.user_id = auth.uid()
  order by sr.created_at desc;
$$;

grant execute on function public.get_my_session_requests() to authenticated, service_role;

-- ── RPC: all session requests (admin) ───────────────────────────────────────
drop function if exists public.get_all_session_requests();
create or replace function public.get_all_session_requests()
returns table (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  user_id uuid,
  title text,
  description text,
  preferred_format text,
  preferred_branch_id uuid,
  status text,
  admin_notes text,
  branch_name text,
  requester_username text,
  requester_full_name text,
  requester_avatar_url text
)
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.can_manage_session_requests() then
    raise exception 'Only platform admins can view all session requests';
  end if;

  return query
    select sr.id, sr.created_at, sr.updated_at, sr.user_id, sr.title, sr.description,
           sr.preferred_format, sr.preferred_branch_id, sr.status, sr.admin_notes,
           b.name as branch_name,
           p.username as requester_username,
           p.full_name as requester_full_name,
           p.avatar_url as requester_avatar_url
    from public.session_requests sr
    left join public.branches b on b.id = sr.preferred_branch_id
    left join public.profiles p on p.id = sr.user_id
    order by sr.created_at desc;
end;
$$;

grant execute on function public.get_all_session_requests() to authenticated, service_role;
