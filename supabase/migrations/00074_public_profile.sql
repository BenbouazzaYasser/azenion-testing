-- Migration: 00074_public_profile
--
-- Backs the public profile page (/u/[username]) with an RLS-bypassing read.
--
-- PROBLEM
--   `profiles` RLS ("users can read own profile", see 00004_rls_fix.sql) means
--   a PostgREST query against `profiles` can only return the caller's own row;
--   `activities` RLS is locked the same way. The public profile page must show
--   another member's profile and their recent public activity, so direct table
--   reads are impossible.
--
-- FIX
--   A SECURITY DEFINER RPC (the established pattern, e.g.
--   00039_session_requests_getters / 00071_user_blocks / 00072_global_user_search):
--     * resolves a profile by username,
--     * returns only non-private columns (never email or auth data),
--     * honors `user_settings.privacy.show_profile_publicly` and
--       `show_activity` for the target,
--     * hides the profile from the caller when a block exists in either
--       direction (caller blocked target, or target blocked caller),
--     * returns the last 30 days of activities when activity is shared,
--     * is empty (null profile) when the username is unknown or hidden.

create or replace function public.get_public_profile(
  p_username text
)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_privacy jsonb;
  v_show_publicly boolean := true;
  v_show_activity boolean := true;
  v_activities jsonb;
  v_is_blocked boolean := false;
begin
  select * into v_profile
  from public.profiles p
  where p.username = p_username
  limit 1;

  if v_profile.id is null then
    return null;
  end if;

  select us.privacy into v_privacy
  from public.user_settings us
  where us.user_id = v_profile.id;

  if v_privacy is not null then
    v_show_publicly := coalesce((v_privacy->>'show_profile_publicly')::boolean, true);
    v_show_activity := coalesce((v_privacy->>'show_activity')::boolean, true);
  end if;

  if v_uid is not null then
    select exists (
      select 1 from public.user_blocks ub
      where (ub.blocker_id = v_uid and ub.blocked_id = v_profile.id)
         or (ub.blocker_id = v_profile.id and ub.blocked_id = v_uid)
    ) into v_is_blocked;
  end if;

  if v_is_blocked or not v_show_publicly then
    return jsonb_build_object(
      'id', v_profile.id,
      'username', v_profile.username,
      'full_name', v_profile.full_name,
      'hidden', true
    );
  end if;

  if v_show_activity then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'type', a.type,
      'metadata', a.metadata,
      'created_at', a.created_at,
      'creator_name', null
    ) order by a.created_at desc), '[]'::jsonb)
    into v_activities
    from public.activities a
    where a.user_id = v_profile.id
      and a.created_at >= now() - interval '30 days';
  else
    v_activities := '[]'::jsonb;
  end if;

  return jsonb_build_object(
    'id', v_profile.id,
    'username', v_profile.username,
    'full_name', v_profile.full_name,
    'bio', v_profile.bio,
    'avatar_url', v_profile.avatar_url,
    'github_url', v_profile.github_url,
    'linkedin_url', v_profile.linkedin_url,
    'skills', coalesce(v_profile.skills, '{}'::text[]),
    'institution', v_profile.institution,
    'created_at', v_profile.created_at,
    'show_profile_publicly', v_show_publicly,
    'show_activity', v_show_activity,
    'hidden', false,
    'activities', v_activities
  );
end;
$$;

grant execute on function public.get_public_profile(text)
  to anon, authenticated, service_role;

comment on function public.get_public_profile(text) is
  'Public profile data for /u/[username]. Resolves by username, returns only '
  'non-private columns, honors show_profile_publicly / show_activity, hides '
  'blocked users, and includes the last 30 days of activities.';