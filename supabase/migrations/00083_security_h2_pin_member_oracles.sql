-- Migration: 00083_security_h2_pin_member_oracles
--
-- H2 (high): anonymous SECURITY DEFINER "membership oracle" functions.
--
-- PROBLEM
--   is_team_owner / is_team_leader / is_branch_leader / has_team_permission /
--   is_conversation_member take an explicit `p_user_id` (defaulting to
--   auth.uid()) and were granted EXECUTE to `anon`. Because they are
--   SECURITY DEFINER and trust the supplied id verbatim, an anonymous caller
--   could pass another user's id and learn whether that user is a team owner,
--   branch leader, team member, or conversation participant — leaking internal
--   membership structure and enabling targeted enumeration.
--
-- FIX
--   Pin the evaluated user id to auth.uid() for every NON-service caller
--   (anon/authenticated). Only service_role / supabase_admin may evaluate the
--   function for an arbitrary supplied id (this is what the server's admin
--   client does today when it needs an explicit viewer).
--
--   Identity resolution:
--     service_role / supabase_admin -> coalesce(p_user_id, auth.uid())
--     everything else               -> auth.uid()
--
--   The default argument changes from `auth.uid()` to `null`; a null default
--   is required so `coalesce(p_user_id, auth.uid())` can distinguish "not
--   supplied" from a real id. Changing a default value is allowed by
--   CREATE OR REPLACE (defaults are not part of the function identity).
--
--   EXECUTE revocations (defense-in-depth): anon no longer needs these
--   helpers directly except where RLS policies on anon-readable tables call
--   them. is_branch_leader and is_conversation_member MUST keep anon EXECUTE:
--     * branch_announcements / branch_events / branch_highlights and storage
--       branch-assets policies use is_branch_leader and anon holds SELECT on
--       the branch tables (00030).
--     * conversations / conversation_members / messages SELECT policies use
--       is_conversation_member and anon holds SELECT on the chat tables
--       (00024/00047). Revoking would turn anon reads into errors instead of
--       empty result sets.
--   is_team_owner / is_team_leader / has_team_permission are only referenced
--   by RLS policies on authenticated-only tables (team_join_requests,
--   team_invitations, team_updates DML) or inside SECURITY DEFINER RPCs
--   (which execute as the function owner and do not need the grant), so anon
--   EXECUTE is revoked there.
--
--   NOTE: revoking from `anon` alone is NOT enough — these functions were
--   originally `grant ... to anon, authenticated, service_role`, which leaves
--   the implicit PUBLIC EXECUTE grant in place (`=X/postgres` on the live
--   project), and anon inherits EXECUTE through PUBLIC membership. The same
--   was documented in 00081. So we revoke from public AND anon, then re-grant
--   to authenticated + service_role.

-- ── is_team_owner ────────────────────────────────────────────────────────────

create or replace function public.is_team_owner(
  p_team_id uuid,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_uid uuid;
begin
  if coalesce(auth.role(), '') in ('service_role', 'supabase_admin') then
    v_uid := coalesce(p_user_id, auth.uid());
  else
    v_uid := auth.uid();
  end if;

  return exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = v_uid
      and role = 'owner'
  );
end;
$$;

revoke execute on function public.is_team_owner(uuid, uuid) from public;
revoke execute on function public.is_team_owner(uuid, uuid) from anon;
grant execute on function public.is_team_owner(uuid, uuid) to authenticated, service_role;

-- ── is_team_leader ───────────────────────────────────────────────────────────

create or replace function public.is_team_leader(
  p_team_id uuid,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_uid uuid;
begin
  if coalesce(auth.role(), '') in ('service_role', 'supabase_admin') then
    v_uid := coalesce(p_user_id, auth.uid());
  else
    v_uid := auth.uid();
  end if;

  return exists (
    select 1 from public.team_members
    where team_id = p_team_id
      and user_id = v_uid
      and role in ('owner', 'admin')
  );
end;
$$;

revoke execute on function public.is_team_leader(uuid, uuid) from public;
revoke execute on function public.is_team_leader(uuid, uuid) from anon;
grant execute on function public.is_team_leader(uuid, uuid) to authenticated, service_role;

-- ── is_branch_leader ─────────────────────────────────────────────────────────
-- KEEPS anon EXECUTE: branch-table SELECT policies and storage policies call
-- it, and anon holds SELECT on the branch tables.

create or replace function public.is_branch_leader(
  p_branch_id uuid,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_uid uuid;
begin
  if coalesce(auth.role(), '') in ('service_role', 'supabase_admin') then
    v_uid := coalesce(p_user_id, auth.uid());
  else
    v_uid := auth.uid();
  end if;

  return exists (
    select 1 from public.branch_leaders
    where branch_id = p_branch_id and user_id = v_uid
  );
end;
$$;

grant execute on function public.is_branch_leader(uuid, uuid) to anon, authenticated, service_role;

-- ── has_team_permission ──────────────────────────────────────────────────────
-- The platform-admin check is evaluated against the pinned id (v_uid) so a
-- service_role caller may ask about an arbitrary user, matching the previous
-- behaviour for authenticated callers (auth.uid()).

create or replace function public.has_team_permission(
  p_team_id uuid,
  p_permission text,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_uid uuid;
begin
  if coalesce(auth.role(), '') in ('service_role', 'supabase_admin') then
    v_uid := coalesce(p_user_id, auth.uid());
  else
    v_uid := auth.uid();
  end if;

  return
    exists (
      select 1 from public.platform_admins
      where user_id = v_uid
    )
    or exists (
      select 1 from public.team_members
      where team_id = p_team_id
        and user_id = v_uid
        and role = 'owner'
    )
    or exists (
      select 1
      from public.team_member_roles tmr
      join public.team_role_permissions trp on trp.role_id = tmr.role_id
      where tmr.team_id = p_team_id
        and tmr.member_id = v_uid
        and trp.permission = p_permission
    );
end;
$$;

revoke execute on function public.has_team_permission(uuid, text, uuid) from public;
revoke execute on function public.has_team_permission(uuid, text, uuid) from anon;
grant execute on function public.has_team_permission(uuid, text, uuid) to authenticated, service_role;

-- ── is_conversation_member ───────────────────────────────────────────────────
-- KEEPS anon EXECUTE: conversations / conversation_members / messages SELECT
-- policies call it and anon holds SELECT on those tables (00024/00047).

create or replace function public.is_conversation_member(
  p_conversation_id uuid,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer set search_path = public
stable
as $$
declare
  v_uid uuid;
begin
  if coalesce(auth.role(), '') in ('service_role', 'supabase_admin') then
    v_uid := coalesce(p_user_id, auth.uid());
  else
    v_uid := auth.uid();
  end if;

  return exists (
    select 1 from public.conversation_members
    where conversation_id = p_conversation_id
      and user_id = v_uid
  );
end;
$$;

grant execute on function public.is_conversation_member(uuid, uuid) to anon, authenticated, service_role;
