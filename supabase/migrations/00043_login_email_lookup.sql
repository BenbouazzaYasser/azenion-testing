-- ── RPC: get_login_email_by_username ────────────────────────────────────────
-- Resolves a profile username (case-insensitive, matching the pattern used by
-- invite_team_member) to the associated auth.users email.
--
-- Used by the login server action so users can sign in with either their email
-- or their username. Password verification stays entirely with Supabase Auth;
-- this RPC only maps a username to the account's email.
--
-- SECURITY
--   Execute is granted to service_role ONLY. It is never exposed through the
--   public API, so it cannot be used to enumerate emails by username. The
--   profiles table is not publicly readable (RLS: "users can read own
--   profile"), so a plain PostgREST lookup is not possible from the anon role
--   either.

create or replace function public.get_login_email_by_username(p_username text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select u.email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(p_username)
  limit 1;
$$;

revoke all on function public.get_login_email_by_username(text) from public;

grant execute on function public.get_login_email_by_username(text) to service_role;
