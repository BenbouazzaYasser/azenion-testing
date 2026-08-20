-- Migration: 00100_remove_auto_grant_core_team_role
--
-- Reverses 00096: removes the trigger + function that automatically granted
-- `core_team_member` to new profiles whose username/full_name matched a known
-- core team member. Roles must now be granted explicitly (e.g. by an admin).
--
-- Existing grants on user_roles are left intact; this only disables the
-- self-serve auto-grant on signup.

drop trigger if exists trg_grant_core_team_on_signup on public.profiles;

drop function if exists public.grant_core_team_on_signup();