-- Migration: 00060_private_entity_media
--
-- C3 (storage privacy) fix — Phase 1.
--
-- Private team/project media currently lives in public buckets and is
-- downloadable anonymously (public=true + anonymous SELECT policies on
-- storage.objects allow unrestricted listing and direct /object/public/ access).
--
-- This migration introduces a single NON-public bucket, `private-media`:
--
--   bucket:  private-media        (public = false)
--   paths:   team/{teamId}/{filename}
--            project/{projectId}/{filename}
--
-- Public entities keep their existing public buckets and public URLs.
-- Private entities upload to `private-media`; the app stores a stable
-- object *path* marker (never an expiring URL) and renders it through an
-- authorized signed-URL resolver at read time.
--
-- RLS:
--   read    -> platform admins, private team/project members, and anyone when
--              the owning entity is itself public (covers visibility flips).
--   write   -> members of the owning team/project (mirrors the existing
--              team-updates / project-updates member-upload pattern) plus
--              platform admins. Uploads already go through RLS-scoped clients.

-- ── Helper: can viewer access an object in private-media? ────────────────

create or replace function public.can_access_private_media(p_path text)
returns boolean
language plpgsql
security definer set search_path = public, storage
stable
as $$
declare
  v_f1  text;
  v_f2  text;
  v_id  uuid;
  v_uid uuid := auth.uid();
begin
  if public.is_platform_admin() then
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

grant execute on function public.can_access_private_media(text)
  to anon, authenticated, service_role;

-- ── Helper: can this authenticated user write into private-media? ────────

create or replace function public.can_manage_private_media(p_path text)
returns boolean
language plpgsql
security definer set search_path = public, storage
stable
as $$
declare
  v_fold text;
  v_f2   text;
  v_id   uuid;
begin
  if public.is_platform_admin() then
    return true;
  end if;
  if auth.uid() is null then
    return false;
  end if;

  v_fold := (storage.foldername(p_path))[1];
  v_f2   := (storage.foldername(p_path))[2];
  if v_fold is null or v_f2 is null then
    return false;
  end if;

  begin
    v_id := v_f2::uuid;
  exception when others then
    return false;
  end;

  if v_fold = 'team' then
    return exists (
      select 1 from public.team_members
      where team_id = v_id and user_id = auth.uid()
    );
  elsif v_fold = 'project' then
    return exists (
      select 1 from public.project_members
      where project_id = v_id and user_id = auth.uid()
    );
  end if;

  return false;
end;
$$;

grant execute on function public.can_manage_private_media(text)
  to anon, authenticated, service_role;

-- ── Bucket ──────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('private-media', 'private-media', false)
on conflict (id) do nothing;

-- ── RLS policies: private-media ─────────────────────────────────────────

drop policy if exists "members can read private media"
  on storage.objects;
create policy "members can read private media"
  on storage.objects
  for select
  using (
    bucket_id = 'private-media'
    and public.can_access_private_media(name)
  );

drop policy if exists "members can upload private media"
  on storage.objects;
create policy "members can upload private media"
  on storage.objects
  for insert
  with check ( public.can_manage_private_media(name) );

drop policy if exists "members can update private media"
  on storage.objects;
create policy "members can update private media"
  on storage.objects
  for update
  using ( public.can_manage_private_media(name) );

drop policy if exists "members can delete private media"
  on storage.objects;
create policy "members can delete private media"
  on storage.objects
  for delete
  using ( public.can_manage_private_media(name) );