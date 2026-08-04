-- Migration: 00053_storage_cleanup_best_effort
--
-- The existing delete_team / delete_project RPCs call `delete from
-- storage.objects` directly. On Supabase, direct SQL writes to the storage
-- schema are blocked at runtime ("Direct deletion from storage tables is not
-- allowed"), which made team/project deletion raise an error and never
-- complete. Storage cleanup is best-effort housekeeping, so we route it through
-- a helper that tolerates the storage restriction while still surfacing any
-- real errors. This unblocks delete_team (and therefore the ownership
-- cooldown) and delete_project.

create or replace function public.delete_storage_prefix(p_bucket text, p_prefix text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  begin
    delete from storage.objects
    where bucket_id = p_bucket
      and name like p_prefix || '%';
  exception
    when others then
      if sqlerrm like '%Direct deletion from storage tables%' then
        return;
      end if;
      raise;
  end;
end;
$$;

grant execute on function public.delete_storage_prefix(text, text)
  to authenticated, service_role;

-- ── delete_project: best-effort storage cleanup ──────────────────────────────

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

  perform public.delete_storage_prefix('project-logos', p_project_id::text || '/');
  perform public.delete_storage_prefix('project-updates', p_project_id::text || '/');

  delete from public.activities
  where metadata->>'project_id' = p_project_id::text;

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

  delete from public.projects where id = p_project_id;
end;
$$;

grant execute on function public.delete_project(uuid) to anon, authenticated, service_role;

-- ── delete_team: best-effort storage cleanup ─────────────────────────────────

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
  v_cooldown_days int;
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

  perform public.delete_storage_prefix('team-logos', p_team_id::text || '/');
  perform public.delete_storage_prefix('team-logos', 'banners/' || p_team_id::text || '/');
  perform public.delete_storage_prefix('team-updates', p_team_id::text || '/');

  for v_project in
    select id, name, slug from public.projects where team_id = p_team_id
  loop
    perform public.delete_storage_prefix('project-logos', v_project.id::text || '/');
    perform public.delete_storage_prefix('project-updates', v_project.id::text || '/');

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

  delete from public.team_open_roles where team_id = p_team_id;
  delete from public.team_members where team_id = p_team_id;

  delete from public.activities
  where metadata->>'team_id' = p_team_id::text;

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

  delete from public.teams where id = p_team_id;

  if public.is_platform_admin() is false then
    select ownership_cooldown_days into v_cooldown_days
    from public.ecosystem_config
    where id = true;

    update public.profiles
    set team_owner_cooldown_until = now() + make_interval(days => v_cooldown_days)
    where id = v_owner_id;
  end if;
end;
$$;

grant execute on function public.delete_team(uuid) to anon, authenticated, service_role;
