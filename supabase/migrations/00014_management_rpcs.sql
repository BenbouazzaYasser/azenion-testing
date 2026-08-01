-- Migration: 00014_management_rpcs
--
-- Adds SECURITY DEFINER RPCs for:
--   - delete_project  (owner only)
--   - create_branch   (admin only: Ziy8ed)
--   - update_branch   (admin only)
--   - delete_branch   (admin only, blocks if members exist)

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
    raise exception 'Only the project owner can delete the project';
  end if;

  delete from public.project_members where project_id = p_project_id;

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

-- ── RPC: create_branch ───────────────────────────────────────────────────────

create or replace function public.create_branch(
  p_name text,
  p_slug text,
  p_institution text default null,
  p_city text default null,
  p_description text default null,
  p_logo_url text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_branch_id uuid;
  v_username text;
begin
  select username into v_username
  from public.profiles
  where id = auth.uid();

  if v_username is null or v_username <> 'Ziy8ed' then
    raise exception 'Only the platform administrator can manage branches';
  end if;

  insert into public.branches (slug, name, full_name, description, city, logo_url)
  values (p_slug, p_name, p_institution, p_description, p_city, p_logo_url)
  returning id into v_branch_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'created_branch',
    jsonb_build_object(
      'branch_id', v_branch_id,
      'branch_name', p_name,
      'branch_slug', p_slug
    )
  );

  return v_branch_id;
end;
$$;

-- ── RPC: update_branch ───────────────────────────────────────────────────────

create or replace function public.update_branch(
  p_branch_id uuid,
  p_name text default null,
  p_slug text default null,
  p_institution text default null,
  p_city text default null,
  p_description text default null,
  p_logo_url text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text;
begin
  select username into v_username
  from public.profiles
  where id = auth.uid();

  if v_username is null or v_username <> 'Ziy8ed' then
    raise exception 'Only the platform administrator can manage branches';
  end if;

  update public.branches set
    name        = coalesce(p_name, name),
    slug        = coalesce(p_slug, slug),
    full_name   = coalesce(p_institution, full_name),
    city        = coalesce(p_city, city),
    description = coalesce(p_description, description),
    logo_url    = coalesce(p_logo_url, logo_url)
  where id = p_branch_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'updated_branch',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', p_name
    )
  );
end;
$$;

-- ── RPC: delete_branch ───────────────────────────────────────────────────────

create or replace function public.delete_branch(p_branch_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_username text;
  v_member_count int;
  v_branch_name text;
begin
  select username into v_username
  from public.profiles
  where id = auth.uid();

  if v_username is null or v_username <> 'Ziy8ed' then
    raise exception 'Only the platform administrator can manage branches';
  end if;

  select count(*) into v_member_count
  from public.branch_members
  where branch_id = p_branch_id;

  if v_member_count > 0 then
    raise exception 'This branch still has members';
  end if;

  select name into v_branch_name
  from public.branches
  where id = p_branch_id;

  delete from public.branches where id = p_branch_id;

  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'deleted_branch',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name
    )
  );
end;
$$;

grant execute on function public.delete_project(uuid) to anon, authenticated, service_role;
grant execute on function public.create_branch(text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.update_branch(uuid, text, text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.delete_branch(uuid) to anon, authenticated, service_role;
