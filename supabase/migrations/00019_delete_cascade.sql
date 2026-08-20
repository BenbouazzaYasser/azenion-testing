-- Migration: 00019_delete_cascade
--
-- Replaces delete_project and delete_team RPCs with comprehensive
-- versions that cascade through storage, project updates, activities,
-- and all related records — leaving zero orphaned data.

-- ── RPC: delete_project ──────────────────────────────────────────────────────

create or replace function public.delete_project(p_project_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_project_name text;
  v_project_slug text;
begin
  select owner_id, name, slug into v_owner_id, v_project_name, v_project_slug
  from public.projects
  where id = p_project_id;

  if v_owner_id is null then
    raise exception 'Project not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Only the owner can delete this project';
  end if;

  -- Delete storage: project logos
  delete from storage.objects
  where bucket_id = 'project-logos'
    and name like p_project_id || '/%';

  -- Delete storage: project update images
  delete from storage.objects
  where bucket_id = 'project-updates'
    and name like p_project_id || '/%';

  -- Delete activities referencing this project (before insert below)
  delete from public.activities
  where metadata->>'project_id' = p_project_id::text;

  -- Log the deletion
  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_project',
    jsonb_build_object(
      'project_id', p_project_id,
      'project_name', v_project_name,
      'project_slug', v_project_slug
    )
  );

  -- Delete the project (cascades to project_members, project_updates via FK)
  delete from public.projects where id = p_project_id;
end;
$$;

-- ── RPC: delete_team ─────────────────────────────────────────────────────────

create or replace function public.delete_team(p_team_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_team_name text;
  v_team_slug text;
  v_project record;
begin
  select owner_id, name, slug into v_owner_id, v_team_name, v_team_slug
  from public.teams
  where id = p_team_id;

  if v_owner_id is null then
    raise exception 'Team not found';
  end if;

  if v_owner_id <> auth.uid() then
    raise exception 'Only the owner can delete this team';
  end if;

  -- Delete storage: team logos and banners
  delete from storage.objects
  where bucket_id = 'team-logos'
    and (name like p_team_id || '/%' or name like 'banners/' || p_team_id || '/%');

  -- For each project in this team, clean up project-level storage and activities
  for v_project in
    select id, name, slug from public.projects where team_id = p_team_id
  loop
    delete from storage.objects
    where bucket_id = 'project-logos'
      and name like v_project.id || '/%';

    delete from storage.objects
    where bucket_id = 'project-updates'
      and name like v_project.id || '/%';

    delete from public.activities
    where metadata->>'project_id' = v_project.id::text;

    insert into public.activities (user_id, type, metadata)
    values (
      auth.uid(),
      'deleted_project',
      jsonb_build_object(
        'project_id', v_project.id,
        'project_name', v_project.name,
        'project_slug', v_project.slug
      )
    );
  end loop;

  -- Delete team-level data
  delete from public.team_open_roles where team_id = p_team_id;
  delete from public.team_members where team_id = p_team_id;

  -- Delete activities referencing this team
  delete from public.activities
  where metadata->>'team_id' = p_team_id::text;

  -- Log the deletion
  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_team',
    jsonb_build_object(
      'team_id', p_team_id,
      'team_name', v_team_name,
      'team_slug', v_team_slug
    )
  );

  -- Delete the team (cascades to projects, project_members, project_updates via FK)
  delete from public.teams where id = p_team_id;
end;
$$;

grant execute on function public.delete_project(uuid) to anon, authenticated, service_role;
grant execute on function public.delete_team(uuid) to anon, authenticated, service_role;
