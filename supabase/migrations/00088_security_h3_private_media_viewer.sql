-- Migration: 00088_security_h3_private_media_viewer
--
-- H3 (high): private-media signed URLs were issued without viewer
-- authorization.
--
-- PROBLEM
--   lib/media.ts resolved `private-media/` markers with the service-role
--   admin client and never verified the viewer could access the object.
--   Signed URLs were therefore issued for private team/project media to any
--   caller (including anonymous feed pages), and can_access_private_media was
--   bound to auth.uid(), so the admin client (no sub in its JWT) could never
--   authorize an explicit viewer.
--
-- FIX
--   can_access_private_media gains an optional explicit viewer:
--       can_access_private_media(p_path text, p_user_id uuid default null)
--   Identity is pinned exactly like the H2 oracles:
--     service_role / supabase_admin -> coalesce(p_user_id, auth.uid())
--     everything else               -> auth.uid()
--   The platform-admin check is evaluated against the pinned id so the admin
--   client can authorize an arbitrary viewer. Storage RLS and the user-scoped
--   1-arg RPC path are unchanged (pinned to the requesting user).
--
--   The ORIGINAL 1-arg overload is dropped: keeping both (text) and
--   (text, uuid) makes PostgREST report "Could not choose the best candidate
--   function" for 1-arg calls. A single (text, uuid default null) signature
--   serves both call shapes.
--
--   The app side (lib/media.ts) is updated in parallel to authorize the
--   viewer against this function BEFORE signing, failing closed when no
--   viewer identity is available.

drop policy if exists "members can read private media" on storage.objects;
drop function if exists public.can_access_private_media(text);

create or replace function public.can_access_private_media(
  p_path text,
  p_user_id uuid default null
)
returns boolean
language plpgsql
security definer set search_path = public, storage
stable
as $$
declare
  v_f1  text;
  v_f2  text;
  v_id  uuid;
  v_uid uuid;
begin
  if coalesce(auth.role(), '') in ('service_role', 'supabase_admin') then
    v_uid := coalesce(p_user_id, auth.uid());
  else
    v_uid := auth.uid();
  end if;

  if v_uid is not null and exists (
    select 1 from public.platform_admins where user_id = v_uid
  ) then
    return true;
  end if;

  v_f1 := (storage.foldername(p_path))[1];
  v_f2 := (storage.foldername(p_path))[2];
  if v_f1 is null or v_f2 is null then
    return false;
  end if;

  begin
    v_id := v_f2::uuid;
  exception when others then
    return false; -- malformed path segment
  end;

  if v_f1 = 'team' then
    return exists (
      select 1 from public.team_members
      where team_id = v_id and user_id = v_uid
    )
    or exists (
      select 1 from public.teams
      where id = v_id and owner_id = v_uid
    )
    or exists (
      select 1 from public.teams
      where id = v_id and visibility = 'public'
    );
  elsif v_f1 = 'project' then
    return exists (
      select 1 from public.project_members
      where project_id = v_id and user_id = v_uid
    )
    or exists (
      select 1 from public.projects
      where id = v_id and owner_id = v_uid
    )
    or exists (
      select 1 from public.projects
      where id = v_id and visibility in ('public', 'open')
    );
  end if;

  return false;
end;
$$;

grant execute on function public.can_access_private_media(text, uuid) to anon, authenticated, service_role;

-- Recreate the storage read policy against the single (text, uuid) signature;
-- the 1-arg call in SQL resolves via the p_user_id default.
drop policy if exists "members can read private media"
  on storage.objects;
create policy "members can read private media"
  on storage.objects
  for select
  using (
    bucket_id = 'private-media'
    and public.can_access_private_media(name)
  );